
import "server-only";

import { bloqueoIAEstudio } from "@/lib/investigacion/bloqueo-ia-estudio";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createClient as crearClienteAdmin,
} from "@supabase/supabase-js";

// ==============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.17.2
// EVALUACION IA CON AUDITORIA EN SUPABASE
// ==============================================

type EjercicioMotor = {
  nombre: string;
  nivel: string;
  lugar: string;
  equipamiento: string;
};

type RutinaMotor = {
  id: number;
  nombre: string;
  objetivo: string;
  nivel: string;
  frecuencia_semanal: number;
  duracion_min: number;
  lugar: string;
  estado: string;
  ejercicios: EjercicioMotor[];
};

type ResultadoAuditoria = "exitosa" | "error_api";

type DatosAuditoria = {
  entrenadorId: string;
  clienteId: string;
  resultado: ResultadoAuditoria;
  codigoHttp: number;
  duracionMs: number;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ==============================================
// RESPUESTAS DE ERROR
// ==============================================

function respuestaError(
  mensaje: string,
  estado: number
) {
  return NextResponse.json(
    { error: mensaje },
    {
      status: estado,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// ==============================================
// REGISTRAR EVENTO DEL MOTOR EN SUPABASE
// ==============================================

async function registrarEventoIA({
  entrenadorId,
  clienteId,
  resultado,
  codigoHttp,
  duracionMs,
}: DatosAuditoria): Promise<void> {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    console.error(
      "Auditoria IA: falta configuracion privada."
    );

    return;
  }

  try {
    // Esta clave solo se utiliza en el servidor.
    const admin = crearClienteAdmin(
      url,
      clave,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const duracionSegura = Math.min(
      300000,
      Math.max(
        0,
        Math.round(duracionMs)
      )
    );

    const {
      error: errorAuditoria,
    } = await admin
      .from("ecf_eventos_evaluacion_ia")
      .insert({
        entrenador_id: entrenadorId,
        cliente_id: clienteId,
        grupo_estudio: "GE",
        resultado,
        codigo_http: codigoHttp,
        duracion_ms: duracionSegura,
        origen: "evaluar",
      });

    if (errorAuditoria) {
      console.error(
        "Auditoria IA: insercion rechazada.",
        errorAuditoria.code,
        errorAuditoria.message
      );
    }
  } catch (error) {
    console.error(
      "Auditoria IA: fallo inesperado.",
      error instanceof Error
        ? error.name
        : "desconocido"
    );
  }
}

// ==============================================
// POST /api/recomendaciones/evaluar
// ==============================================

export async function POST(request: Request) {
  try {
    // ==========================================
    // 1. RECIBIR Y VALIDAR EL CLIENTE
    // ==========================================

    const body: unknown = await request
      .json()
      .catch(() => null);

    const clienteId =
      body !== null &&
      typeof body === "object" &&
      "clienteId" in body
        ? body.clienteId
        : null;

    if (
      typeof clienteId !== "string" ||
      !UUID.test(clienteId)
    ) {
      return respuestaError(
        "Identificador de cliente inválido.",
        400
      );
    }

    const supabase = await createClient();

    // ==========================================
    // 2. VERIFICAR SESION
    // ==========================================

    const {
      data: auth,
      error: authError,
    } = await supabase.auth.getClaims();

    const entrenadorId = auth?.claims?.sub;

    if (
      authError ||
      !entrenadorId
    ) {
      return respuestaError(
        "Debes iniciar sesión.",
        401
      );
    }

    // ==========================================
    // 3. VERIFICAR ROL ENTRENADOR
    // ==========================================

    const {
      data: acceso,
      error: errorRol,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq(
        "usuario_id",
        entrenadorId
      )
      .single();

    if (
      errorRol ||
      acceso?.rol !== "entrenador"
    ) {
      return respuestaError(
        "No tienes autorización.",
        403
      );
    }

    // ==========================================
    // 4. VERIFICAR ASIGNACION ACTIVA
    // ==========================================

    const {
      data: asignacion,
      error: errorAsignacion,
    } = await supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("cliente_id", clienteId)
      .eq("entrenador_id", entrenadorId)
      .eq("activa", true)
      .maybeSingle();

    if (errorAsignacion) {
      throw new Error(
        "No se pudo consultar la asignación."
      );
    }

    if (!asignacion) {
      return respuestaError(
        "El cliente no está asignado a este entrenador.",
        403
      );
    }

    // ==========================================
    // 5. BLOQUEO DE INVESTIGACION GE / GC
    // ==========================================

    // IMPORTANTE:
    // Esta validacion se realiza antes
    // de consultar y evaluar las rutinas.
    //
    // Se conservan las reglas existentes
    // de inscripcion, grupo y fechas.
    //
    // GC NO puede utilizar el motor IA.

    const bloqueoIA = await bloqueoIAEstudio(
      clienteId
    );

    if (bloqueoIA) {
      return bloqueoIA;
    }

    // ==========================================
    // 6. OBTENER PERFIL DEL CLIENTE
    // ==========================================

    const {
      data: perfil,
      error: errorPerfil,
    } = await supabase
      .from("perfiles_clientes")
      .select(
        "objetivo,experiencia,frecuencia_semanal,minutos_por_sesion,lugar,equipamiento"
      )
      .eq("usuario_id", clienteId)
      .maybeSingle();

    if (errorPerfil) {
      throw new Error(
        "No se pudo consultar el perfil."
      );
    }

    if (!perfil) {
      return respuestaError(
        "El cliente todavía no tiene perfil.",
        404
      );
    }

    // ==========================================
    // 7. CONSULTAR RUTINAS PUBLICADAS
    // ==========================================

    const {
      data: rutinas,
      error: errorRutinas,
    } = await supabase
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,frecuencia_semanal,duracion_min,lugar,estado"
      )
      .eq("estado", "publicada");

    if (errorRutinas) {
      throw new Error(
        "No se pudieron consultar las rutinas."
      );
    }

    const idsRutinas = (
      rutinas ?? []
    ).map(
      (rutina) => rutina.id
    );

    const resultadoVacio = {
      total_evaluadas: 0,
      total_elegibles: 0,
      metodo: "reglas_deterministas_v1",
      similitud_aplicada: false,
      logica_difusa_aplicada: false,
      resultados: [],
    };

    // Si no hay rutinas, no se llama a FastAPI.
    // Por tanto, no se registra una evaluacion.

    if (idsRutinas.length === 0) {
      return NextResponse.json(
        resultadoVacio,
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // ==========================================
    // 8. CONSULTAR RELACIONES
    // ==========================================

    const {
      data: relaciones,
      error: errorRelaciones,
    } = await supabase
      .from("rutina_ejercicios")
      .select(
        "rutina_id,ejercicio_id,orden"
      )
      .in(
        "rutina_id",
        idsRutinas
      );

    if (errorRelaciones) {
      throw new Error(
        "No se pudieron consultar las relaciones."
      );
    }

    const idsEjercicios = [
      ...new Set(
        (relaciones ?? []).map(
          (relacion) =>
            relacion.ejercicio_id
        )
      ),
    ];

    if (idsEjercicios.length === 0) {
      return NextResponse.json(
        {
          ...resultadoVacio,
          advertencia:
            "Las rutinas no tienen ejercicios asignados.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // ==========================================
    // 9. CONSULTAR EJERCICIOS ACTIVOS
    // ==========================================

    const {
      data: ejercicios,
      error: errorEjercicios,
    } = await supabase
      .from("ejercicios")
      .select(
        "id,nombre,nivel,lugar,equipamiento,activo"
      )
      .in(
        "id",
        idsEjercicios
      );

    if (errorEjercicios) {
      throw new Error(
        "No se pudieron consultar los ejercicios."
      );
    }

    const ejerciciosPorId = new Map(
      (ejercicios ?? []).map(
        (ejercicio) => [
          ejercicio.id,
          ejercicio,
        ]
      )
    );

    // ==========================================
    // 10. PREPARAR RUTINAS PARA FASTAPI
    // ==========================================

    const rutinasMotor: RutinaMotor[] = [];

    const rutinasOmitidas: string[] = [];

    for (const rutina of rutinas ?? []) {
      const componentes = (
        relaciones ?? []
      )
        .filter(
          (relacion) =>
            relacion.rutina_id ===
            rutina.id
        )
        .sort(
          (a, b) =>
            a.orden - b.orden
        );

      let completa =
        componentes.length > 0;

      const ejerciciosMotor:
        EjercicioMotor[] = [];

      for (const componente of componentes) {
        const ejercicio =
          ejerciciosPorId.get(
            componente.ejercicio_id
          );

        if (
          !ejercicio ||
          !ejercicio.activo
        ) {
          completa = false;
          break;
        }

        ejerciciosMotor.push({
          nombre: ejercicio.nombre,
          nivel: ejercicio.nivel,
          lugar: ejercicio.lugar,
          equipamiento:
            ejercicio.equipamiento,
        });
      }

      if (!completa) {
        rutinasOmitidas.push(
          rutina.nombre
        );

        continue;
      }

      rutinasMotor.push({
        id: rutina.id,
        nombre: rutina.nombre,
        objetivo: rutina.objetivo,
        nivel: rutina.nivel,
        frecuencia_semanal:
          rutina.frecuencia_semanal,
        duracion_min:
          rutina.duracion_min,
        lugar: rutina.lugar,
        estado: rutina.estado,
        ejercicios: ejerciciosMotor,
      });
    }

    if (rutinasMotor.length === 0) {
      return NextResponse.json(
        {
          ...resultadoVacio,
          rutinas_omitidas:
            rutinasOmitidas,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // ==========================================
    // 11. COMPROBAR CONFIGURACION PRIVADA
    // ==========================================

    const servicio =
      process.env.IA_SERVICE_URL;

    const claveInternaIA =
      process.env.IA_INTERNAL_API_KEY;

    if (!claveInternaIA) {
      return respuestaError(
        "Servicio de IA no configurado.",
        503
      );
    }

    if (!servicio) {
      return respuestaError(
        "No se configuró IA_SERVICE_URL.",
        503
      );
    }

    // ==========================================
    // 12. LLAMAR AL MOTOR FASTAPI
    // ==========================================

    // Medimos la llamada a FastAPI.
    // No medimos el tiempo total del endpoint.

    const inicioMotor = Date.now();

    let respuestaIA: Response;

    try {
      respuestaIA = await fetch(
        new URL("/evaluar", servicio),
        {
          method: "POST",

          headers: {
            "X-IA-Service-Key":
              claveInternaIA,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            perfil,
            rutinas: rutinasMotor,
            incluir_similitud: true,
            incluir_logica_difusa: true,
          }),

          cache: "no-store",

          signal:
            AbortSignal.timeout(45000),
        }
      );
    } catch {
      // FastAPI no pudo responder.
      // La llamada SI se intento realizar.

      await registrarEventoIA({
        entrenadorId,
        clienteId,
        resultado: "error_api",
        codigoHttp: 503,
        duracionMs:
          Date.now() - inicioMotor,
      });

      return respuestaError(
        "No se pudo conectar con FastAPI. Comprueba que el servicio esté funcionando.",
        503
      );
    }

    // ==========================================
    // 13. COMPROBAR RESPUESTA HTTP
    // ==========================================

    if (!respuestaIA.ok) {
      console.error(
        "FastAPI devolvió HTTP:",
        respuestaIA.status
      );

      await registrarEventoIA({
        entrenadorId,
        clienteId,
        resultado: "error_api",
        codigoHttp: 502,
        duracionMs:
          Date.now() - inicioMotor,
      });

      return respuestaError(
        "FastAPI no pudo procesar las rutinas.",
        502
      );
    }

    // ==========================================
    // 14. LEER RESPUESTA DEL MOTOR
    // ==========================================

    let resultado: unknown;

    try {
      resultado =
        await respuestaIA.json();
    } catch {
      await registrarEventoIA({
        entrenadorId,
        clienteId,
        resultado: "error_api",
        codigoHttp: 502,
        duracionMs:
          Date.now() - inicioMotor,
      });

      return respuestaError(
        "FastAPI devolvió una respuesta JSON inválida.",
        502
      );
    }

    // ==========================================
    // 15. VALIDAR RESPUESTA DE FASTAPI
    // ==========================================

    if (
      !resultado ||
      typeof resultado !== "object" ||
      Array.isArray(resultado) ||
      !("resultados" in resultado) ||
      !Array.isArray(
        resultado.resultados
      ) ||
      !("total_evaluadas" in resultado) ||
      typeof resultado.total_evaluadas !==
        "number" ||
      !("total_elegibles" in resultado) ||
      typeof resultado.total_elegibles !==
        "number"
    ) {
      await registrarEventoIA({
        entrenadorId,
        clienteId,
        resultado: "error_api",
        codigoHttp: 502,
        duracionMs:
          Date.now() - inicioMotor,
      });

      return respuestaError(
        "El motor devolvió una respuesta inválida.",
        502
      );
    }

    // ==========================================
    // 16. REGISTRAR EVALUACION EXITOSA
    // ==========================================

    const duracionMotor =
      Date.now() - inicioMotor;

    await registrarEventoIA({
      entrenadorId,
      clienteId,
      resultado: "exitosa",
      codigoHttp: 200,
      duracionMs: duracionMotor,
    });

    // ==========================================
    // 17. ENVIAR RESULTADO AL ENTRENADOR
    // ==========================================

    // Se conservan los campos devueltos
    // por FastAPI:
    //
    // - ajuste_difuso
    // - similitud_semantica
    // - desglose_puntaje
    // - ranking
    // - elegibilidad

    return NextResponse.json(
      {
        ...resultado,
        rutinas_omitidas:
          rutinasOmitidas,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error en la integración con IA:",
      error
    );

    return respuestaError(
      "No se pudo completar la evaluación.",
      500
    );
  }
}
