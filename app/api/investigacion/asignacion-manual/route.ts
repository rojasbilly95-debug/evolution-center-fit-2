import "server-only";

import { connection, NextResponse } from "next/server";

import {
  createClient as crearAdmin,
} from "@supabase/supabase-js";

import {
  createClient as crearServidor,
} from "@/lib/supabase/server";

import {
  ESTUDIO,
  faseEstudioOficial,
} from "@/lib/investigacion/calendario-estudio";

import {
  CAMPOS_PERFIL_VERIFICABLE,
  estadoVerificacionPerfil,
} from "@/lib/perfil/verificacion";

// ==========================================
// EVOLUTION CENTER FIT 2.0
// ASIGNACIÓN MANUAL DE RUTINAS
// INVESTIGACIÓN GE / GC
// ==========================================

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Lugar = "casa" | "gimnasio";

type ErrorCompatibilidad = {
  mensaje: string;
  status: number;
};

const NIVELES: Record<string, number> = {
  principiante: 1,
  intermedio: 2,
  avanzado: 3,
};

// ==========================================
// RESPUESTAS
// ==========================================

function errorJson(
  mensaje: string,
  status: number
) {
  return NextResponse.json(
    {
      error: mensaje,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// ==========================================
// VALIDAR FECHAS
// ==========================================

function fechaValida(
  valor: unknown
): valor is string {
  if (
    typeof valor !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const fecha = new Date(
    `${valor}T00:00:00.000Z`
  );

  return (
    Number.isFinite(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

// ==========================================
// AUTENTICACIÓN Y AUTORIZACIÓN
// ==========================================

async function verificarEntrenador() {
  const servidor = await crearServidor();

  const {
    data,
    error,
  } = await servidor.auth.getUser();

  if (error || !data.user) {
    return {
      respuesta: errorJson(
        "Debes iniciar sesión.",
        401
      ),
      admin: null,
      entrenadorId: null,
    };
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    return {
      respuesta: errorJson(
        "Supabase no está configurado.",
        503
      ),
      admin: null,
      entrenadorId: null,
    };
  }

  // Este cliente privado solo se utiliza
  // dentro de la ruta del servidor.

  const admin = crearAdmin(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: roles,
    error: errorRol,
  } = await admin
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", data.user.id)
    .eq("rol", "entrenador")
    .limit(1);

  if (errorRol) {
    return {
      respuesta: errorJson(
        "No se pudo verificar el rol.",
        503
      ),
      admin: null,
      entrenadorId: null,
    };
  }

  if (!roles?.length) {
    return {
      respuesta: errorJson(
        "Acceso exclusivo para entrenadores.",
        403
      ),
      admin: null,
      entrenadorId: null,
    };
  }

  return {
    respuesta: null,
    admin,
    entrenadorId: data.user.id,
  };
}

// ==========================================
// COMPATIBILIDAD MANUAL
// NO UTILIZA INTELIGENCIA ARTIFICIAL
// ==========================================

type ClienteSupabaseAdmin = NonNullable<
  Awaited<ReturnType<typeof verificarEntrenador>>["admin"]
>;

async function validarCompatibilidadManual(
  admin: ClienteSupabaseAdmin,
  clienteId: string,
  rutinaId: number,
  notas: string | null
): Promise<ErrorCompatibilidad | null> {

  // ========================================
  // 1. CONSULTAR DATOS NECESARIOS
  // ========================================

  const [
    consultaPerfil,
    consultaRutina,
    consultaRelaciones,
  ] = await Promise.all([

    admin
      .from("perfiles_clientes")
      .select(CAMPOS_PERFIL_VERIFICABLE)
      .eq("usuario_id", clienteId)
      .maybeSingle(),

    admin
      .from("rutinas")
      .select(
        "id,objetivo,nivel,frecuencia_semanal,duracion_min,lugar,estado"
      )
      .eq("id", rutinaId)
      .maybeSingle(),

    admin
      .from("rutina_ejercicios")
      .select("ejercicio_id")
      .eq("rutina_id", rutinaId),
  ]);

  if (
    consultaPerfil.error ||
    consultaRutina.error ||
    consultaRelaciones.error
  ) {
    return {
      mensaje:
        "No se pudo consultar la información necesaria para validar la rutina.",
      status: 503,
    };
  }

  const perfil = consultaPerfil.data;
  const rutina = consultaRutina.data;

  const relaciones =
    consultaRelaciones.data ?? [];

  // ========================================
  // 2. PERFIL EXISTENTE
  // ========================================

  if (!perfil) {
    return {
      mensaje:
        "El cliente debe completar su perfil antes de recibir una rutina.",
      status: 409,
    };
  }

  // ========================================
  // 3. VERIFICACIÓN PROFESIONAL
  // ========================================

  const verificacion =
    await estadoVerificacionPerfil(
      clienteId,
      perfil
    );

  if (
    verificacion.estado !== "verificado"
  ) {
    return {
      mensaje:
        "El perfil debe tener una verificación profesional vigente antes de asignar una rutina manual.",
      status: 409,
    };
  }

  // ========================================
  // 4. RUTINA PUBLICADA
  // ========================================

  if (
    !rutina ||
    rutina.estado !== "publicada"
  ) {
    return {
      mensaje:
        "La rutina seleccionada no está publicada.",
      status: 409,
    };
  }

  // ========================================
  // 5. OBJETIVO
  // ========================================

  if (
    !perfil.objetivo ||
    perfil.objetivo !== rutina.objetivo
  ) {
    return {
      mensaje:
        "El objetivo de la rutina no coincide con el objetivo del cliente.",
      status: 409,
    };
  }

  // ========================================
  // 6. EXPERIENCIA
  // ========================================

  const nivelCliente =
    NIVELES[
      String(perfil.experiencia ?? "")
    ] ?? 0;

  const nivelRutina =
    NIVELES[
      String(rutina.nivel ?? "")
    ] ?? 0;

  if (
    nivelCliente === 0 ||
    nivelRutina === 0 ||
    nivelRutina > nivelCliente
  ) {
    return {
      mensaje:
        "La dificultad de la rutina supera el nivel de experiencia del cliente.",
      status: 409,
    };
  }

  // ========================================
  // 7. FRECUENCIA SEMANAL
  // ========================================

  if (
    !perfil.frecuencia_semanal ||
    !rutina.frecuencia_semanal ||
    rutina.frecuencia_semanal >
      perfil.frecuencia_semanal
  ) {
    return {
      mensaje:
        "La rutina requiere más días de entrenamiento de los que tiene disponibles el cliente.",
      status: 409,
    };
  }

  // ========================================
  // 8. DURACIÓN
  // ========================================

  if (
    !perfil.minutos_por_sesion ||
    !rutina.duracion_min ||
    rutina.duracion_min >
      perfil.minutos_por_sesion
  ) {
    return {
      mensaje:
        "La duración de la rutina supera el tiempo disponible por sesión.",
      status: 409,
    };
  }

  // ========================================
  // 9. CONSIDERACIONES DEL CLIENTE
  // ========================================

  if (
    typeof perfil.restricciones ===
      "string" &&
    perfil.restricciones.trim().length >
      0 &&
    (
      !notas ||
      notas.trim().length < 10
    )
  ) {
    return {
      mensaje:
        "El cliente declaró restricciones o consideraciones adicionales. El entrenador debe documentar su revisión en las notas (mínimo 10 caracteres).",
      status: 409,
    };
  }

  // ========================================
  // 10. CLASIFICACIÓN DE EQUIPAMIENTO
  // ========================================

  if (
    perfil.lugar === "casa" &&
    !Array.isArray(
      perfil.equipamiento_casa
    )
  ) {
    return {
      mensaje:
        "El cliente debe clasificar su equipamiento disponible en casa.",
      status: 409,
    };
  }

  if (
    perfil.lugar === "gimnasio" &&
    !Array.isArray(
      perfil.equipamiento_gimnasio
    )
  ) {
    return {
      mensaje:
        "El cliente debe clasificar su equipamiento disponible en el gimnasio.",
      status: 409,
    };
  }

  if (
    perfil.lugar === "mixto" &&
    (
      !Array.isArray(
        perfil.equipamiento_casa
      ) ||
      !Array.isArray(
        perfil.equipamiento_gimnasio
      )
    )
  ) {
    return {
      mensaje:
        "El perfil mixto debe clasificar el equipamiento de casa y del gimnasio.",
      status: 409,
    };
  }

  // ========================================
  // 11. EXIGIR EJERCICIOS
  // ========================================

  if (relaciones.length === 0) {
    return {
      mensaje:
        "La rutina no contiene ejercicios.",
      status: 409,
    };
  }

  // ========================================
  // 12. CONSULTAR EJERCICIOS
  // ========================================

  const idsEjercicios = [
    ...new Set(
      relaciones.map(
        (relacion) =>
          relacion.ejercicio_id
      )
    ),
  ];

  const {
    data: ejercicios,
    error: errorEjercicios,
  } = await admin
    .from("ejercicios")
    .select(
      "id,nivel,lugar,equipamiento,activo"
    )
    .in(
      "id",
      idsEjercicios
    );

  if (errorEjercicios || !ejercicios) {
    return {
      mensaje:
        "No se pudieron verificar los ejercicios de la rutina.",
      status: 503,
    };
  }

  const ejerciciosPorId = new Map(
    ejercicios.map((ejercicio) => [
      ejercicio.id,
      ejercicio,
    ])
  );

  // ========================================
  // 13. LUGARES DECLARADOS
  // ========================================

  const lugares: Lugar[] =
    perfil.lugar === "mixto"
      ? ["casa", "gimnasio"]
      : perfil.lugar === "casa"
        ? ["casa"]
        : perfil.lugar === "gimnasio"
          ? ["gimnasio"]
          : [];

  if (lugares.length === 0) {
    return {
      mensaje:
        "El cliente no tiene un lugar de entrenamiento válido.",
      status: 409,
    };
  }

  // ========================================
  // 14. COMPROBAR CADA UBICACIÓN
  // ========================================

  for (const lugar of lugares) {

    // La rutina debe admitir el lugar.

    if (
      rutina.lugar !== "mixto" &&
      rutina.lugar !== lugar
    ) {
      continue;
    }

    // Seleccionar únicamente el equipo
    // declarado en esa ubicación.

    const declarados =
      lugar === "casa"
        ? perfil.equipamiento_casa
        : perfil.equipamiento_gimnasio;

    if (!Array.isArray(declarados)) {
      continue;
    }

    // El peso corporal está disponible
    // sin equipamiento adicional.

    const equipos = new Set<string>([
      ...declarados,
      "peso_corporal",
    ]);

    // Todos los ejercicios deben poder
    // ejecutarse en la misma ubicación.

    const todosCompatibles =
      relaciones.every((relacion) => {

        const ejercicio =
          ejerciciosPorId.get(
            relacion.ejercicio_id
          );

        if (
          !ejercicio ||
          ejercicio.activo !== true
        ) {
          return false;
        }

        // Verificar nivel del ejercicio.

        const nivelEjercicio =
          NIVELES[
            String(
              ejercicio.nivel ?? ""
            )
          ] ?? 0;

        if (
          nivelEjercicio === 0 ||
          nivelEjercicio > nivelCliente
        ) {
          return false;
        }

        // Verificar lugar del ejercicio.

        if (
          ejercicio.lugar !== "mixto" &&
          ejercicio.lugar !== lugar
        ) {
          return false;
        }

        // Verificar equipamiento real
        // declarado para esa ubicación.

        return equipos.has(
          String(
            ejercicio.equipamiento
          )
        );
      });

    if (todosCompatibles) {
      return null;
    }
  }

  // ========================================
  // 15. RUTINA INCOMPATIBLE
  // ========================================

  return {
    mensaje:
      "La rutina completa no es compatible con el nivel, lugar o equipamiento declarado por el cliente. Selecciona otra rutina o solicita que actualice su perfil.",
    status: 409,
  };
}

// ==========================================
// GET: CONSULTAR RUTINAS PUBLICADAS
// ==========================================

export async function GET() {
  await connection();

  try {
    const acceso =
      await verificarEntrenador();

    if (acceso.respuesta) {
      return acceso.respuesta;
    }

    if (!acceso.admin) {
      return errorJson(
        "Acceso inválido.",
        403
      );
    }

    const {
      data,
      error,
    } = await acceso.admin
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,duracion_min"
      )
      .eq("estado", "publicada")
      .order("nombre")
      .limit(500);

    if (error) {
      return errorJson(
        "No se pudieron consultar las rutinas.",
        500
      );
    }

    return NextResponse.json(
      {
        rutinas: data ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error consultando rutinas:",
      error
    );

    return errorJson(
      "Error inesperado.",
      500
    );
  }
}

// ==========================================
// POST: ASIGNACIÓN MANUAL
// ==========================================

export async function POST(
  request: Request
) {
  await connection();

  try {
    // ======================================
    // 1. AUTENTICAR ENTRENADOR
    // ======================================

    const acceso =
      await verificarEntrenador();

    if (acceso.respuesta) {
      return acceso.respuesta;
    }

    if (
      !acceso.admin ||
      !acceso.entrenadorId
    ) {
      return errorJson(
        "Acceso inválido.",
        403
      );
    }

    const admin = acceso.admin;
    const entrenadorId =
      acceso.entrenadorId;

    // ======================================
    // 2. LEER SOLICITUD
    // ======================================

    const body: unknown =
      await request
        .json()
        .catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorJson(
        "Solicitud inválida.",
        400
      );
    }

    const datos = body as Record<
      string,
      unknown
    >;

    const {
      clienteId,
      rutinaId,
      fechaInicio,
      fechaFin,
      notas,
    } = datos;

    // ======================================
    // 3. VALIDAR IDENTIFICADORES
    // ======================================

    if (
      typeof clienteId !== "string" ||
      !UUID.test(clienteId)
    ) {
      return errorJson(
        "Cliente inválido.",
        400
      );
    }

    if (
      typeof rutinaId !== "number" ||
      !Number.isSafeInteger(rutinaId) ||
      rutinaId <= 0
    ) {
      return errorJson(
        "Rutina inválida.",
        400
      );
    }

    // ======================================
    // 4. VALIDAR FECHAS
    // ======================================

    if (!fechaValida(fechaInicio)) {
      return errorJson(
        "Fecha de inicio inválida.",
        400
      );
    }

    if (
      fechaFin != null &&
      !fechaValida(fechaFin)
    ) {
      return errorJson(
        "Fecha de fin inválida.",
        400
      );
    }

    // ======================================
    // 5. VALIDAR NOTAS
    // ======================================

    if (
      notas != null &&
      (
        typeof notas !== "string" ||
        notas.length > 1000
      )
    ) {
      return errorJson(
        "Las observaciones deben tener como máximo 1000 caracteres.",
        400
      );
    }

    const notasLimpias =
      typeof notas === "string"
        ? notas.trim()
        : null;

    // ======================================
    // 6. RELACIÓN ENTRENADOR-CLIENTE
    // ======================================

    const {
      data: vinculos,
      error: errorVinculo,
    } = await admin
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq(
        "entrenador_id",
        entrenadorId
      )
      .eq(
        "cliente_id",
        clienteId
      )
      .eq("activa", true)
      .limit(1);

    if (errorVinculo) {
      return errorJson(
        "No se pudo verificar la asignación del cliente.",
        503
      );
    }

    if (!vinculos?.length) {
      return errorJson(
        "Cliente no asignado al entrenador.",
        403
      );
    }

    // ======================================
    // 7. PARTICIPANTE DEL ESTUDIO
    // ======================================

    const {
      data: participante,
      error: errorParticipante,
    } = await admin
      .from("participantes_estudio")
      .select(
        "grupo_estudio,fecha_inicio_estudio,fecha_fin_estudio"
      )
      .eq(
        "cliente_id",
        clienteId
      )
      .maybeSingle();

    if (errorParticipante) {
      return errorJson(
        "No se pudo consultar la inscripción del estudio.",
        503
      );
    }

    if (!participante) {
      return errorJson(
        "Cliente no inscrito en el estudio.",
        409
      );
    }

    // ======================================
    // 8. CALENDARIO OFICIAL
    // ======================================

    if (
      participante.fecha_inicio_estudio !==
        ESTUDIO.inicio ||
      participante.fecha_fin_estudio !==
        ESTUDIO.fin
    ) {
      return errorJson(
        "Las fechas del participante no coinciden con el calendario oficial de la investigación.",
        409
      );
    }

    // ======================================
    // 9. GRUPO DEL ESTUDIO
    // ======================================

    const grupo =
      participante.grupo_estudio;

    if (
      grupo !== "GE" &&
      grupo !== "GC"
    ) {
      return errorJson(
        "Grupo de estudio inválido.",
        409
      );
    }

    // ======================================
    // 10. IDENTIFICAR FASE
    // ======================================

    const faseInicio =
      faseEstudioOficial(
        fechaInicio
      );

    const limite =
      grupo === "GE" &&
      faseInicio === "pretest"
        ? ESTUDIO.finPretest
        : ESTUDIO.fin;

    const finReal =
      typeof fechaFin === "string"
        ? fechaFin
        : limite;

    const faseFin =
      faseEstudioOficial(
        finReal
      );

    if (
      !faseInicio ||
      !faseFin ||
      finReal < fechaInicio ||
      finReal > limite
    ) {
      return errorJson(
        "Las fechas están fuera del calendario oficial de investigación.",
        409
      );
    }

    // ======================================
    // 11. CONTROL GE / GC
    // ======================================

    // GE:
    // - Manual en pretest.
    // - IA durante intervención.
    // - Manual en postest.
    //
    // GC:
    // - Asignación manual durante
    //   las doce semanas.
    // - Sin utilizar el motor de IA.

    if (
      grupo === "GE" &&
      (
        faseInicio === "intervencion" ||
        faseInicio !== faseFin
      )
    ) {
      return errorJson(
        "En GE, la asignación manual debe permanecer íntegramente en pretest o postest.",
        409
      );
    }

    // ======================================
    // 12. COMPATIBILIDAD MANUAL
    // ======================================

    const incompatibilidad =
      await validarCompatibilidadManual(
        admin,
        clienteId,
        rutinaId,
        notasLimpias
      );

    if (incompatibilidad) {
      return errorJson(
        incompatibilidad.mensaje,
        incompatibilidad.status
      );
    }

    // ======================================
    // 13. ASIGNACIÓN TRANSACCIONAL
    // ======================================

    const {
      data: asignacion,
      error: errorRpc,
    } = await admin.rpc(
      "asignar_rutina_manual_estudio",
      {
        p_entrenador_id:
          entrenadorId,

        p_cliente_id:
          clienteId,

        p_rutina_id:
          rutinaId,

        p_fecha_inicio:
          fechaInicio,

        p_fecha_fin:
          finReal,

        p_notas:
          notasLimpias,
      }
    );

    // ======================================
    // 14. CONTROLAR ERRORES SQL
    // ======================================

    if (errorRpc) {
      console.error(
        "Error de asignación manual:",
        errorRpc
      );

      return errorJson(
        "No se pudo asignar la rutina. Comprueba que no exista un plan vigente y que la asignación cumpla las reglas del estudio.",
        409
      );
    }

    // ======================================
    // 15. RESPUESTA CORRECTA
    // ======================================

    return NextResponse.json(
      {
        mensaje:
          "Rutina asignada manualmente después de comprobar la compatibilidad del perfil.",

        asignacion,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {

    console.error(
      "Error inesperado de asignación manual:",
      error
    );

    return errorJson(
      "Ocurrió un error al procesar la asignación manual.",
      500
    );
  }
}