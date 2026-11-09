
import "server-only";

import { bloqueoIAEstudio } from "@/lib/investigacion/bloqueo-ia-estudio";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createClient as crearClienteAdmin,
} from "@supabase/supabase-js";

// EVOLUTION CENTER FIT 2.0
// FASE 111.17.3
// Evaluacion IA y registro de compatibilidad.

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

type DetalleRutina = {
  posicion: number;
  rutina_id: number;
  elegible: boolean;
  puntaje_compatibilidad: number | null;
};

type ResumenIA = {
  total_evaluadas: number;
  total_elegibles: number;
  metodo: string | null;
  similitud_aplicada: boolean | null;
  logica_difusa_aplicada: boolean | null;
  detalle_rutinas: DetalleRutina[];
  detalle_truncado: boolean;
};

type DatosAuditoria = {
  entrenadorId: string;
  clienteId: string;
  resultado: "exitosa" | "error_api";
  codigoHttp: number;
  duracionMs: number;
  resumen?: ResumenIA | null;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_RUTINAS_DETALLE = 50;

function esObjeto(
  valor: unknown
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

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

// ============================================
// OBTENER UN RESUMEN SEGURO DEL MOTOR
// ============================================

function resumirEvaluacion(
  valor: unknown
): ResumenIA | null {
  if (
    !esObjeto(valor) ||
    !Array.isArray(valor.resultados)
  ) {
    return null;
  }

  const total = valor.total_evaluadas;
  const elegibles = valor.total_elegibles;

  if (
    typeof total !== "number" ||
    !Number.isSafeInteger(total) ||
    total < 0 ||
    total > 100000 ||
    typeof elegibles !== "number" ||
    !Number.isSafeInteger(elegibles) ||
    elegibles < 0 ||
    elegibles > total ||
    total !== valor.resultados.length
  ) {
    return null;
  }

  const detalle: DetalleRutina[] = [];

  for (
    const [indice, elemento] of valor.resultados
      .slice(0, MAX_RUTINAS_DETALLE)
      .entries()
  ) {
    if (!esObjeto(elemento)) {
      continue;
    }

    const id = elemento.rutina_id;
    const elegible = elemento.elegible;

    if (
      typeof id !== "number" ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof elegible !== "boolean"
    ) {
      continue;
    }

    const puntuacion =
      elemento.puntaje_compatibilidad;

    const puntajeSeguro =
      typeof puntuacion === "number" &&
      Number.isFinite(puntuacion) &&
      puntuacion >= 0 &&
      puntuacion <= 100
        ? Math.round(puntuacion * 10) / 10
        : null;

    detalle.push({
      posicion: indice + 1,
      rutina_id: id,
      elegible,
      puntaje_compatibilidad: puntajeSeguro,
    });
  }

  return {
    total_evaluadas: total,
    total_elegibles: elegibles,

    metodo:
      typeof valor.metodo === "string" &&
      valor.metodo.trim()
        ? valor.metodo.trim().slice(0, 160)
        : null,

    similitud_aplicada:
      typeof valor.similitud_aplicada ===
      "boolean"
        ? valor.similitud_aplicada
        : null,

    logica_difusa_aplicada:
      typeof valor.logica_difusa_aplicada ===
      "boolean"
        ? valor.logica_difusa_aplicada
        : null,

    detalle_rutinas: detalle,

    detalle_truncado:
      valor.resultados.length >
      MAX_RUTINAS_DETALLE,
  };
}

// ============================================
// GUARDAR EVENTO CON RESUMEN OPCIONAL
// ============================================

async function registrarEventoIA({
  entrenadorId,
  clienteId,
  resultado,
  codigoHttp,
  duracionMs,
  resumen,
}: DatosAuditoria): Promise<void> {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    console.error(
      "Auditoria IA: configuracion incompleta."
    );
    return;
  }

  try {
    const admin = crearClienteAdmin(url, clave, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      error,
    } = await admin
      .from("ecf_eventos_evaluacion_ia")
      .insert({
        entrenador_id: entrenadorId,
        cliente_id: clienteId,
        grupo_estudio: "GE",
        resultado,
        codigo_http: codigoHttp,

        duracion_ms: Math.min(
          300000,
          Math.max(0, Math.round(duracionMs))
        ),

        origen: "evaluar",

        ...(resumen
          ? {
              total_evaluadas:
                resumen.total_evaluadas,

              total_elegibles:
                resumen.total_elegibles,

              metodo: resumen.metodo,

              similitud_aplicada:
                resumen.similitud_aplicada,

              logica_difusa_aplicada:
                resumen.logica_difusa_aplicada,

              detalle_rutinas:
                resumen.detalle_rutinas,

              detalle_truncado:
                resumen.detalle_truncado,
            }
          : {}),
      });

    if (error) {
      console.error(
        "Auditoria IA: insercion rechazada",
        error.code
      );
    }
  } catch (error) {
    console.error(
      "Auditoria IA: error inesperado",
      error instanceof Error
        ? error.name
        : "desconocido"
    );
  }
}

// ============================================
// ENDPOINT DE EVALUACION
// ============================================

export async function POST(request: Request) {
  try {
    // 1. Validar cliente.

    const body: unknown = await request
      .json()
      .catch(() => null);

    const clienteId = esObjeto(body)
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

    // 2. Verificar autenticacion.

    const {
      data: auth,
      error: authError,
    } = await supabase.auth.getClaims();

    const entrenadorId = auth?.claims?.sub;

    if (authError || !entrenadorId) {
      return respuestaError(
        "Debes iniciar sesión.",
        401
      );
    }

    // 3. Comprobar rol entrenador.

    const {
      data: acceso,
      error: errorRol,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
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

    // 4. Comprobar asignacion activa.

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

    // 5. Proteger la investigacion GE / GC.

    const bloqueoIA = await bloqueoIAEstudio(
      clienteId
    );

    if (bloqueoIA) {
      return bloqueoIA;
    }

    // 6. Obtener perfil autorizado.

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

    // 7. Obtener rutinas publicadas.

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
    ).map((rutina) => rutina.id);

    const resultadoVacio = {
      total_evaluadas: 0,
      total_elegibles: 0,
      metodo: "reglas_deterministas_v1",
      similitud_aplicada: false,
      logica_difusa_aplicada: false,
      resultados: [],
    };

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

    // 8. Consultar relaciones.

    const {
      data: relaciones,
      error: errorRelaciones,
    } = await supabase
      .from("rutina_ejercicios")
      .select("rutina_id,ejercicio_id,orden")
      .in("rutina_id", idsRutinas);

    if (errorRelaciones) {
      throw new Error(
        "No se pudieron consultar las relaciones."
      );
    }

    const idsEjercicios = [
      ...new Set(
        (relaciones ?? []).map(
          (r) => r.ejercicio_id
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

    // 9. Consultar ejercicios activos.

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
      throw new Error(
        "No se pudieron consultar los ejercicios."
      );
    }

    const ejerciciosPorId = new Map(
      (ejercicios ?? []).map(
        (e) => [e.id, e]
      )
    );

    // 10. Preparar rutinas para el motor.

    const rutinasMotor: RutinaMotor[] = [];

    const rutinasOmitidas: string[] = [];

    for (const rutina of rutinas ?? []) {
      const componentes = (
        relaciones ?? []
      )
        .filter(
          (r) => r.rutina_id === rutina.id
        )
        .sort(
          (a, b) => a.orden - b.orden
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
          rutinas_omitidas: rutinasOmitidas,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 11. Configuracion privada de FastAPI.

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

    // 12. Solicitar evaluacion a FastAPI.

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

    // 13. Comprobar estado HTTP.

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

    // 14. Leer JSON del motor.

    let resultado: unknown;

    try {
      resultado = await respuestaIA.json();
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

    // 15. Validar la estructura.

    if (
      !esObjeto(resultado) ||
      !Array.isArray(resultado.resultados) ||
      typeof resultado.total_evaluadas !==
        "number" ||
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

    // 16. Registrar evaluacion exitosa
    // con sus detalles de compatibilidad.

    await registrarEventoIA({
      entrenadorId,
      clienteId,
      resultado: "exitosa",
      codigoHttp: 200,
      duracionMs:
        Date.now() - inicioMotor,

      resumen:
        resumirEvaluacion(resultado),
    });

    // 17. Conservar la respuesta completa
    // para la pantalla del entrenador.

    return NextResponse.json(
      {
        ...resultado,
        rutinas_omitidas: rutinasOmitidas,
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
