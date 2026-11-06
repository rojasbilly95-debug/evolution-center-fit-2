import { bloqueoIAEstudio } from "@/lib/investigacion/bloqueo-ia-estudio";

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// =====================================
// TIPOS
// =====================================

type Decision =
  | "aprobada"
  | "rechazada"
  | "ajustes_solicitados";

type EjercicioMotor = {
  nombre: string;
  nivel: string;
  lugar: string;
  equipamiento: string;
};

// =====================================
// FUNCIONES AUXILIARES
// =====================================

function esObjeto(
  valor: unknown
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function esDecision(
  valor: unknown
): valor is Decision {
  return (
    valor === "aprobada" ||
    valor === "rechazada" ||
    valor === "ajustes_solicitados"
  );
}

function errorJson(
  mensaje: string,
  status: number
) {
  return NextResponse.json(
    { error: mensaje },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// =====================================
// POST /api/recomendaciones/revisar
// =====================================

export async function POST(request: Request) {
  try {
    // =====================================
    // 1. VALIDAR LOS DATOS RECIBIDOS
    // =====================================

    const body: unknown = await request
      .json()
      .catch(() => null);

    if (!esObjeto(body)) {
      return errorJson(
        "Debes enviar una solicitud JSON válida.",
        400
      );
    }

    const {
      clienteId,
      rutinaId,
      decision,
    } = body;

    const observaciones =
      typeof body.observaciones === "string"
        ? body.observaciones.trim()
        : "";

    const uuidValido =
      typeof clienteId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        clienteId
      );

    if (!uuidValido) {
      return errorJson(
        "Identificador del cliente inválido.",
        400
      );
    }

    if (
      typeof rutinaId !== "number" ||
      !Number.isSafeInteger(rutinaId) ||
      rutinaId <= 0
    ) {
      return errorJson(
        "Identificador de rutina inválido.",
        400
      );
    }

    if (!esDecision(decision)) {
      return errorJson(
        "La decisión indicada no es válida.",
        400
      );
    }

    if (observaciones.length > 1000) {
      return errorJson(
        "Las observaciones no pueden superar 1000 caracteres.",
        400
      );
    }

    if (
      decision !== "aprobada" &&
      observaciones.length < 10
    ) {
      return errorJson(
        "Indica al menos 10 caracteres para explicar el rechazo o los ajustes.",
        400
      );
    }

    // =====================================
    // 2. AUTENTICAR AL ENTRENADOR
    // =====================================

    const supabase =
      await createServerClient();

    const {
      data: auth,
      error: authError,
    } = await supabase.auth.getClaims();

    const entrenadorId =
      auth?.claims?.sub;

    if (authError || !entrenadorId) {
      return errorJson(
        "Debes iniciar sesión.",
        401
      );
    }

    // =====================================
    // 3. COMPROBAR SU ROL
    // =====================================

    const {
      data: rol,
      error: errorRol,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .maybeSingle();

    if (errorRol) {
      return errorJson(
        "No se pudo verificar tu rol.",
        500
      );
    }

    if (rol?.rol !== "entrenador") {
      return errorJson(
        "Solo un entrenador puede revisar rutinas.",
        403
      );
    }

    // =====================================
    // 4. VERIFICAR ASIGNACIÓN DEL CLIENTE
    // =====================================

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
      return errorJson(
        "No se pudo verificar la asignación.",
        500
      );
    }

    if (!asignacion) {
      return errorJson(
        "Este cliente no está asignado a tu cuenta.",
        403
      );
    }

    // =====================================
    // 5. CONSULTAR PERFIL DEL CLIENTE
    // =====================================

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
      return errorJson(
        "No se pudo consultar el perfil del cliente.",
        500
      );
    }

    if (!perfil) {
      return errorJson(
        "El cliente no tiene un perfil de entrenamiento.",
        404
      );
    }

    // =====================================
    // 6. CONSULTAR RUTINA PUBLICADA
    // =====================================

    const {
      data: rutina,
      error: errorRutina,
    } = await supabase
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,frecuencia_semanal,duracion_min,lugar,estado"
      )
      .eq("id", rutinaId)
      .eq("estado", "publicada")
      .maybeSingle();

    if (errorRutina) {
      return errorJson(
        "No se pudo consultar la rutina.",
        500
      );
    }

    if (!rutina) {
      return errorJson(
        "La rutina no existe o no está publicada.",
        404
      );
    }

    // =====================================
    // 7. CONSULTAR EJERCICIOS
    // =====================================

    const {
      data: relaciones,
      error: errorRelaciones,
    } = await supabase
      .from("rutina_ejercicios")
      .select("ejercicio_id,orden")
      .eq("rutina_id", rutinaId)
      .order("orden", {
        ascending: true,
      });

    if (errorRelaciones) {
      return errorJson(
        "No se pudieron consultar los ejercicios de la rutina.",
        500
      );
    }

    if (!relaciones?.length) {
      return errorJson(
        "La rutina no tiene ejercicios configurados.",
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
        "No se pudieron consultar los ejercicios.",
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

    for (const relacion of relaciones) {
      const ejercicio = porId.get(
        relacion.ejercicio_id
      );

      if (
        !ejercicio ||
        !ejercicio.activo
      ) {
        return errorJson(
          "La rutina contiene ejercicios inexistentes o inactivos.",
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

    // =====================================
    // 8. REEVALUAR CON EL MOTOR DE IA
    // =====================================

    // PASO 80.10: bloqueo de IA por estudio
    const bloqueoIA = await bloqueoIAEstudio(String(clienteId));
    if (bloqueoIA) return bloqueoIA;

    const servicioIA =
      process.env.IA_SERVICE_URL;

    const claveInternaIA = process.env.IA_INTERNAL_API_KEY;
    if (!claveInternaIA) {
      return NextResponse.json(
        { error: "Servicio de IA no configurado." },
        { status: 503 }
      );
    }


    if (!servicioIA) {
      return errorJson(
        "Falta configurar IA_SERVICE_URL.",
        503
      );
    }

    let respuestaIA: Response;

    try {
      respuestaIA = await fetch(
        new URL("/evaluar", servicioIA),
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
    } catch {
      return errorJson(
        "No se pudo conectar con el motor de IA.",
        503
      );
    }

    if (!respuestaIA.ok) {
      console.error(
        "Error del motor IA al revisar:",
        respuestaIA.status
      );

      return errorJson(
        "El motor de IA no pudo evaluar la rutina.",
        502
      );
    }

    const motor: unknown =
      await respuestaIA
        .json()
        .catch(() => null);

    if (
      !esObjeto(motor) ||
      !Array.isArray(motor.resultados)
    ) {
      return errorJson(
        "El motor de IA devolvió datos inválidos.",
        502
      );
    }

    const evaluacion =
      motor.resultados.find(
        (item: unknown) =>
          esObjeto(item) &&
          item.rutina_id === rutinaId
      );

    if (
      !esObjeto(evaluacion) ||
      typeof evaluacion.elegible !==
        "boolean"
    ) {
      return errorJson(
        "No se encontró la evaluación de la rutina.",
        502
      );
    }

    // =====================================
    // 8.1. VALIDAR ELEGIBILIDAD
    // =====================================

    // Una rutina incompatible nunca
    // puede ser aprobada.

    if (
      decision === "aprobada" &&
      !evaluacion.elegible
    ) {
      return errorJson(
        "No puedes aprobar esta rutina: no cumple las reglas de elegibilidad.",
        409
      );
    }

    // =====================================
    // 8.2. OBTENER RESULTADOS DEL MOTOR
    // =====================================

    // Estos datos son calculados en el
    // servidor y no se reciben del navegador.

    const puntaje =
      typeof evaluacion.puntaje_compatibilidad ===
        "number" &&
      Number.isFinite(
        evaluacion.puntaje_compatibilidad
      ) &&
      evaluacion.puntaje_compatibilidad >=
        0 &&
      evaluacion.puntaje_compatibilidad <=
        100
        ? evaluacion.puntaje_compatibilidad
        : null;

    const metodo =
      typeof motor.metodo === "string"
        ? motor.metodo
        : null;

    // =====================================
    // 9. CONFIGURAR CLIENTE PRIVADO
    // =====================================

    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const clavePrivada =
      process.env.SUPABASE_SECRET_KEY ??
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clavePrivada) {
      return errorJson(
        "Falta configurar la clave privada del servidor.",
        503
      );
    }

    const admin = createAdminClient(
      url,
      clavePrivada,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // =====================================
    // 10. GUARDAR LA DECISIÓN
    // =====================================

    const {
      data: revision,
      error: errorInsertar,
    } = await admin
      .from("revisiones_rutinas")
      .insert({
        cliente_id: clienteId,
        entrenador_id: entrenadorId,
        rutina_id: rutinaId,
        decision,
        observaciones:
          observaciones || null,
        puntaje_compatibilidad:
          puntaje,
        metodo_motor: metodo,
      })
      .select(
        "id,cliente_id,entrenador_id,rutina_id,decision,observaciones,puntaje_compatibilidad,metodo_motor,revisado_en"
      )
      .single();

    // =====================================
    // 10.1. CONTROLAR PLAN VIGENTE
    // =====================================

    if (errorInsertar) {
      // El trigger de PostgreSQL:
      //
      // bloquear_revision_con_plan_vigente
      //
      // impide nuevas decisiones cuando
      // existe un plan programado, activo
      // o pausado para esta rutina.
      //
      // Código PostgreSQL: 23514

      const planYaAsignado =
        errorInsertar.code ===
          "23514" &&
        errorInsertar.message.includes(
          "La rutina ya tiene una asignación vigente"
        );

      if (planYaAsignado) {
        return errorJson(
          "Esta rutina ya está asignada al cliente. " +
            "No puedes aprobarla, rechazarla ni " +
            "solicitar ajustes mientras el plan " +
            "esté programado, activo o pausado.",
          409
        );
      }

      // =====================================
      // 10.2. OTROS ERRORES DE SUPABASE
      // =====================================

      console.error(
        "ERROR AL GUARDAR REVISION EN SUPABASE:",
        {
          codigo:
            errorInsertar.code,
          mensaje:
            errorInsertar.message,
          detalle:
            errorInsertar.details,
          sugerencia:
            errorInsertar.hint,
        }
      );

      return errorJson(
        "No se pudo registrar la decisión del entrenador.",
        500
      );
    }

    // =====================================
    // 10.3. VERIFICAR RESPUESTA
    // =====================================

    if (!revision) {
      console.error(
        "SUPABASE NO DEVOLVIÓ LA REVISIÓN REGISTRADA."
      );

      return errorJson(
        "No se pudo confirmar el registro de la decisión.",
        500
      );
    }

    // =====================================
    // 11. RESPUESTA FINAL
    // =====================================

    return NextResponse.json(
      {
        mensaje:
          "Decisión registrada correctamente.",
        revision,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    // =====================================
    // 12. ERROR INESPERADO
    // =====================================

    console.error(
      "Error inesperado al registrar la revisión:",
      error
    );

    return errorJson(
      "Ocurrió un error al registrar la revisión.",
      500
    );
  }
}
