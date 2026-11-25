import { bloqueoIAEstudio } from "@/lib/investigacion/bloqueo-ia-estudio";
import { ESTUDIO } from "@/lib/investigacion/calendario-estudio";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ========================================
// TIPOS DEL MOTOR INTELIGENTE
// ========================================

type EjercicioMotor = {
  nombre: string;
  nivel: string;
  lugar: string;
  equipamiento: string;
};

type ResultadoMotor = {
  rutina_id: number;
  elegible: boolean;
};

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function errorJson(
  mensaje: string,
  status: number
) {
  return NextResponse.json(
    { error: mensaje },
    { status }
  );
}

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
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function resultadoMotorValido(
  valor: unknown
): valor is {
  resultados: ResultadoMotor[];
} {
  if (
    !valor ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    return false;
  }

  const resultados = (
    valor as { resultados?: unknown }
  ).resultados;

  if (
    !Array.isArray(resultados) ||
    resultados.length !== 1
  ) {
    return false;
  }

  const resultado: unknown = resultados[0];

  return (
    !!resultado &&
    typeof resultado === "object" &&
    !Array.isArray(resultado) &&
    typeof (
      resultado as ResultadoMotor
    ).rutina_id === "number" &&
    typeof (
      resultado as ResultadoMotor
    ).elegible === "boolean"
  );
}

// ========================================
// POST /api/asignaciones/rutinas
// ========================================

export async function POST(
  request: Request
) {
  try {
    // ====================================
    // 1. VALIDAR DATOS RECIBIDOS
    // ====================================

    const body: unknown = await request
      .json()
      .catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorJson(
        "Envía los datos de la asignación.",
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
    } = datos;

    const fechaFin =
      datos.fechaFin ?? null;

    const notas =
      datos.notas ?? "";

    if (
      typeof clienteId !== "string" ||
      !UUID.test(clienteId)
    ) {
      return errorJson(
        "El identificador del cliente no es válido.",
        400
      );
    }

    if (
      typeof rutinaId !== "number" ||
      !Number.isSafeInteger(rutinaId) ||
      rutinaId <= 0
    ) {
      return errorJson(
        "El identificador de la rutina no es válido.",
        400
      );
    }

    if (!fechaValida(fechaInicio)) {
      return errorJson(
        "La fecha de inicio debe tener el formato AAAA-MM-DD.",
        400
      );
    }

    if (
      fechaFin !== null &&
      !fechaValida(fechaFin)
    ) {
      return errorJson(
        "La fecha de fin no es válida.",
        400
      );
    }

    if (
      fechaFin !== null &&
      fechaFin < fechaInicio
    ) {
      return errorJson(
        "La fecha de fin no puede ser anterior al inicio.",
        400
      );
    }

    if (
      typeof notas !== "string" ||
      notas.trim().length > 1000
    ) {
      return errorJson(
        "Las notas deben tener como máximo 1000 caracteres.",
        400
      );
    }

    // ====================================
    // La recomendación debe iniciar durante intervención.
    // El plan asignado puede mantenerse hasta finalizar postest.
    if (
      fechaInicio < ESTUDIO.inicioIntervencion ||
      fechaInicio > ESTUDIO.finIntervencion ||
      (fechaFin !== null && fechaFin > ESTUDIO.fin)
    ) {
      return errorJson(
        "La asignación de IA debe comenzar durante la intervención y finalizar, como máximo, el 31/01/2027.",
        409
      );
    }

    // 2. AUTENTICAR ENTRENADOR
    // ====================================

    const supabase =
      await createClient();

    const {
      data: auth,
      error: errorAuth,
    } = await supabase.auth.getClaims();

    const entrenadorId =
      auth?.claims?.sub;

    if (
      errorAuth ||
      !entrenadorId
    ) {
      return errorJson(
        "Debes iniciar sesión como entrenador.",
        401
      );
    }

    // ====================================
    // 3. VERIFICAR ROL
    // ====================================

    const {
      data: rol,
      error: errorRol,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq(
        "usuario_id",
        entrenadorId
      )
      .maybeSingle();

    if (
      errorRol ||
      rol?.rol !== "entrenador"
    ) {
      return errorJson(
        "No tienes permisos para asignar rutinas.",
        403
      );
    }

    // ====================================
    // 4. VERIFICAR CLIENTE ASIGNADO
    // ====================================

    const {
      data: relacion,
      error: errorRelacion,
    } = await supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("cliente_id", clienteId)
      .eq(
        "entrenador_id",
        entrenadorId
      )
      .eq("activa", true)
      .maybeSingle();

    if (errorRelacion) {
      return errorJson(
        "No se pudo verificar la relación con el cliente.",
        500
      );
    }

    if (!relacion) {
      return errorJson(
        "Este cliente no está asignado a tu cuenta de entrenador.",
        403
      );
    }

    // ====================================
    // 5. CONSULTAR PERFIL ACTUAL
    // ====================================

    const {
      data: perfil,
      error: errorPerfil,
    } = await supabase
      .from("perfiles_clientes")
      .select(
        "objetivo,experiencia,frecuencia_semanal,minutos_por_sesion,lugar,equipamiento"
      )
      .eq(
        "usuario_id",
        clienteId
      )
      .maybeSingle();

    if (errorPerfil) {
      return errorJson(
        "No se pudo consultar el perfil del cliente.",
        500
      );
    }

    if (!perfil) {
      return errorJson(
        "El cliente aún no tiene perfil de entrenamiento.",
        409
      );
    }

    // ====================================
    // 6. CONSULTAR RUTINA PUBLICADA
    // ====================================

    const {
      data: rutina,
      error: errorRutina,
    } = await supabase
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,frecuencia_semanal,duracion_min,lugar,estado"
      )
      .eq("id", rutinaId)
      .maybeSingle();

    if (errorRutina) {
      return errorJson(
        "No se pudo consultar la rutina.",
        500
      );
    }

    if (
      !rutina ||
      rutina.estado !== "publicada"
    ) {
      return errorJson(
        "La rutina no existe o dejó de estar publicada.",
        409
      );
    }

    // ====================================
    // 7. CONSULTAR EJERCICIOS
    // ====================================

    const {
      data: relaciones,
      error: errorRelaciones,
    } = await supabase
      .from("rutina_ejercicios")
      .select("ejercicio_id,orden")
      .eq("rutina_id", rutinaId)
      .order(
        "orden",
        { ascending: true }
      );

    if (errorRelaciones) {
      return errorJson(
        "No se pudieron consultar los ejercicios de la rutina.",
        500
      );
    }

    if (!relaciones?.length) {
      return errorJson(
        "La rutina no tiene ejercicios asignados.",
        409
      );
    }

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
    } = await supabase
      .from("ejercicios")
      .select(
        "id,nombre,nivel,lugar,equipamiento,activo"
      )
      .in("id", idsEjercicios);

    if (errorEjercicios) {
      return errorJson(
        "No se pudo consultar el catálogo de ejercicios.",
        500
      );
    }

    const porId = new Map(
      (ejercicios ?? []).map(
        (ejercicio) => [
          ejercicio.id,
          ejercicio,
        ]
      )
    );

    const ejerciciosMotor:
      EjercicioMotor[] = [];

    for (
      const relacionEjercicio
      of relaciones
    ) {
      const ejercicio = porId.get(
        relacionEjercicio.ejercicio_id
      );

      if (
        !ejercicio ||
        !ejercicio.activo
      ) {
        return errorJson(
          "La rutina contiene ejercicios inactivos o inexistentes.",
          409
        );
      }

      ejerciciosMotor.push({
        nombre: ejercicio.nombre,
        nivel: ejercicio.nivel,
        lugar: ejercicio.lugar,
        equipamiento:
          ejercicio.equipamiento,
      });
    }

    // ====================================
    // 8. REVALIDAR CON MOTOR INTELIGENTE
    // ====================================

    // PASO 80.10: bloqueo de IA por estudio
    const bloqueoIA = await bloqueoIAEstudio(String(clienteId));
    if (bloqueoIA) return bloqueoIA;

    const servicio =
      process.env.IA_SERVICE_URL;

    if (!servicio) {
      return errorJson(
        "No se configuró el servicio de recomendaciones.",
        503
      );
    }

    const claveInternaIA = process.env.IA_INTERNAL_API_KEY;
    if (!claveInternaIA || claveInternaIA.length < 32) {
      return errorJson("Servicio de IA no configurado.", 503);
    }

    let respuestaIA: Response;

    try {
      respuestaIA = await fetch(
        new URL(
          "/evaluar",
          servicio
        ),
        {
          method: "POST",
          headers: {
            "X-IA-Service-Key": claveInternaIA,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            perfil,
            rutinas: [
              {
                ...rutina,
                ejercicios:
                  ejerciciosMotor,
              },
            ],
            incluir_similitud: true,
            incluir_logica_difusa: true,
          }),
          cache: "no-store",
          signal:
            AbortSignal.timeout(45000),
        }
      );
    } catch (problema) {
      console.error(
        "Servicio IA no disponible:",
        problema
      );

      return errorJson(
        "El motor inteligente no está disponible. No se asignó la rutina.",
        503
      );
    }

    if (!respuestaIA.ok) {
      console.error(
        "FastAPI respondió:",
        respuestaIA.status
      );

      return errorJson(
        "El motor inteligente no pudo evaluar la rutina.",
        502
      );
    }

    const evaluacion: unknown =
      await respuestaIA
        .json()
        .catch(() => null);

    if (
      !resultadoMotorValido(
        evaluacion
      ) ||
      evaluacion.resultados[0]
        .rutina_id !== rutinaId
    ) {
      return errorJson(
        "El motor devolvió una evaluación inválida.",
        502
      );
    }

    if (
      !evaluacion.resultados[0]
        .elegible
    ) {
      return errorJson(
        "La rutina ya no cumple las reglas de elegibilidad del cliente.",
        409
      );
    }

    // ====================================
    // 9. CONFIGURAR CLIENTE PRIVADO
    // ====================================

    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const clave =
      process.env.SUPABASE_SECRET_KEY ??
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clave) {
      console.error(
        "Falta la clave privada de Supabase."
      );

      return errorJson(
        "Falta la configuración privada del servidor.",
        503
      );
    }

    const admin = createAdminClient(
      url,
      clave,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ====================================
    // 10. EJECUTAR FUNCIÓN TRANSACCIONAL
    // ====================================

    const {
      data: asignacion,
      error: errorRpc,
    } = await admin.rpc(
      "asignar_rutina_aprobada",
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
          fechaFin,
        p_notas:
          notas.trim() || null,
      }
    );

    if (errorRpc) {
      // Conflicto por índice único.
      if (
        errorRpc.code === "23505"
      ) {
        return errorJson(
          "El cliente ya tiene un plan vigente o esta aprobación ya fue utilizada.",
          409
        );
      }

      // Errores conocidos de la función.
      const mensajesControlados = [
        "El cliente ya tiene un plan vigente",
        "La última revisión no es una aprobación válida",
        "La rutina no tiene revisión profesional",
        "La rutina no está publicada",
        "El entrenador no tiene asignado al cliente",
        "El usuario no tiene rol de entrenador",
        "El cliente no existe",
      ];

      const mensajeConocido =
        mensajesControlados.find(
          (mensaje) =>
            errorRpc.message.includes(
              mensaje
            )
        );

      if (mensajeConocido) {
        return errorJson(
          mensajeConocido + ".",
          409
        );
      }

      console.error(
        "Error en RPC de asignación:",
        errorRpc
      );

      return errorJson(
        "No se pudo guardar la asignación.",
        500
      );
    }

    // ====================================
    // 11. VALIDAR RESULTADO
    // ====================================

    const fila = Array.isArray(
      asignacion
    )
      ? asignacion[0]
      : asignacion;

    if (
      !fila ||
      typeof fila !== "object" ||
      typeof fila.id !== "number"
    ) {
      console.error(
        "Respuesta inesperada de RPC de asignación."
      );

      return errorJson(
        "No se pudo confirmar el registro de la asignación.",
        500
      );
    }

    // ====================================
    // 12. CONFIRMAR ASIGNACIÓN
    // ====================================

    return NextResponse.json(
      {
        mensaje:
          "Rutina asignada correctamente.",
        asignacion: fila,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (problema) {
    console.error(
      "Error inesperado al asignar rutina:",
      problema
    );

    return errorJson(
      "No se pudo completar la asignación.",
      500
    );
  }
}
