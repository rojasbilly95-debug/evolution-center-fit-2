
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// =====================================
// TIPOS
// =====================================

type ResultadoProgramacion = {
  asignacionId: number;
  creadas: number;
  total: number;
  yaProgramadas: boolean;
  mensaje: string;
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

function esDiasValidos(
  valor: unknown
): valor is number[] {
  return (
    Array.isArray(valor) &&
    valor.length >= 1 &&
    valor.length <= 7 &&
    valor.every(
      (dia) =>
        typeof dia === "number" &&
        Number.isInteger(dia) &&
        dia >= 1 &&
        dia <= 7
    ) &&
    new Set(valor).size === valor.length
  );
}

function esResultadoProgramacion(
  valor: unknown
): valor is ResultadoProgramacion {
  return (
    esObjeto(valor) &&
    typeof valor.asignacionId === "number" &&
    Number.isSafeInteger(valor.asignacionId) &&
    typeof valor.creadas === "number" &&
    Number.isSafeInteger(valor.creadas) &&
    valor.creadas >= 0 &&
    typeof valor.total === "number" &&
    Number.isSafeInteger(valor.total) &&
    valor.total >= 0 &&
    typeof valor.yaProgramadas === "boolean" &&
    typeof valor.mensaje === "string"
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
// POST /api/sesiones/programar
// =====================================

export async function POST(request: Request) {
  try {
    // =====================================
    // 1. VALIDAR DATOS RECIBIDOS
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
      asignacionId,
      diasSemana,
    } = body;

    if (
      typeof asignacionId !== "number" ||
      !Number.isSafeInteger(asignacionId) ||
      asignacionId <= 0
    ) {
      return errorJson(
        "El identificador del plan es inválido.",
        400
      );
    }

    if (!esDiasValidos(diasSemana)) {
      return errorJson(
        "Selecciona entre 1 y 7 días diferentes, usando 1 para lunes y 7 para domingo.",
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
    // 3. VERIFICAR ROL
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
        "Solo un entrenador puede programar sesiones.",
        403
      );
    }

    // =====================================
    // 4. VERIFICAR ASIGNACIÓN DEL PLAN
    // =====================================

    const {
      data: plan,
      error: errorPlan,
    } = await supabase
      .from("asignaciones_rutinas")
      .select(
        "id,cliente_id,entrenador_id,rutina_id,estado"
      )
      .eq("id", asignacionId)
      .eq("entrenador_id", entrenadorId)
      .maybeSingle();

    if (errorPlan) {
      return errorJson(
        "No se pudo consultar la asignación de rutina.",
        500
      );
    }

    if (!plan) {
      return errorJson(
        "No se encontró un plan autorizado para tu cuenta.",
        404
      );
    }

    // =====================================
    // 4.1. VALIDAR ESTADO DEL PLAN
    // =====================================

    if (
      plan.estado !== "programada" &&
      plan.estado !== "activa"
    ) {
      return errorJson(
        "Este plan no permite programar nuevas sesiones en su estado actual.",
        409
      );
    }

    // =====================================
    // 5. VERIFICAR CLIENTE ASIGNADO
    // =====================================

    const {
      data: relacion,
      error: errorRelacion,
    } = await supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("cliente_id", plan.cliente_id)
      .eq("entrenador_id", entrenadorId)
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
        "El cliente ya no está asignado a este entrenador.",
        403
      );
    }

    // =====================================
    // 6. VALIDAR FRECUENCIA SEMANAL
    // =====================================

    const {
      data: rutina,
      error: errorRutina,
    } = await supabase
      .from("rutinas")
      .select("frecuencia_semanal")
      .eq("id", plan.rutina_id)
      .maybeSingle();

    if (errorRutina || !rutina) {
      return errorJson(
        "No se pudo consultar la frecuencia de la rutina.",
        500
      );
    }

    if (
      diasSemana.length !==
      rutina.frecuencia_semanal
    ) {
      return errorJson(
        `Esta rutina requiere exactamente ${rutina.frecuencia_semanal} días de entrenamiento por semana.`,
        400
      );
    }

    // =====================================
    // 7. CONFIGURAR CLIENTE PRIVADO
    // =====================================

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clavePrivada =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clavePrivada) {
      return errorJson(
        "Falta configurar la conexión privada de Supabase.",
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
    // 8. PROGRAMAR SESIONES EN POSTGRESQL
    // =====================================

    // La función SQL controla:
    // - Identidad del entrenador
    // - Relación activa con el cliente
    // - Estado del plan
    // - Frecuencia semanal
    // - Fechas permitidas
    // - Duplicados
    // - Programación atómica

    const {
      data,
      error: errorRpc,
    } = await admin.rpc(
      "programar_sesiones_rutina",
      {
        p_asignacion_id: asignacionId,
        p_entrenador_id: entrenadorId,
        p_dias_semana: diasSemana,
      }
    );

    // =====================================
    // 9. CONTROLAR ERRORES DE POSTGRESQL
    // =====================================

    if (errorRpc) {
      console.error(
        "ERROR AL PROGRAMAR SESIONES:",
        {
          codigo: errorRpc.code,
          mensaje: errorRpc.message,
          detalle: errorRpc.details,
        }
      );

      // Usuario sin permisos.
      if (errorRpc.code === "42501") {
        return errorJson(
          "No tienes permiso para programar este plan.",
          403
        );
      }

      // Parámetros incorrectos.
      if (errorRpc.code === "22023") {
        return errorJson(
          "Los días de entrenamiento no son válidos.",
          400
        );
      }

      // Restricciones del plan o duplicados.
      if (
        errorRpc.code === "23514" ||
        errorRpc.code === "23505"
      ) {
        return errorJson(
          "No se pueden programar las sesiones. Comprueba el estado del plan, sus fechas y los días seleccionados.",
          409
        );
      }

      // Plan inexistente.
      if (errorRpc.code === "P0002") {
        return errorJson(
          "La asignación de rutina ya no existe.",
          404
        );
      }

      // Función no disponible en la API.
      if (errorRpc.code === "PGRST202") {
        return errorJson(
          "La función de programación no está disponible en Supabase.",
          503
        );
      }

      return errorJson(
        "No se pudieron programar las sesiones.",
        500
      );
    }

    // =====================================
    // 10. VALIDAR RESPUESTA DE LA FUNCIÓN
    // =====================================

    if (
      !esResultadoProgramacion(data) ||
      data.asignacionId !== asignacionId
    ) {
      console.error(
        "Respuesta inesperada de programar_sesiones_rutina"
      );

      return errorJson(
        "No se pudo confirmar el resultado de la programación.",
        502
      );
    }

    // =====================================
    // 11. RESPUESTA EXITOSA
    // =====================================

    return NextResponse.json(
      {
        mensaje: data.mensaje,
        asignacionId: data.asignacionId,
        creadas: data.creadas,
        total: data.total,
        yaProgramadas: data.yaProgramadas,
      },
      {
        status: data.yaProgramadas
          ? 200
          : 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    // =====================================
    // 12. ERROR INESPERADO
    // =====================================

    console.error(
      "Error inesperado al programar sesiones:",
      error
    );

    return errorJson(
      "Ocurrió un error al programar las sesiones.",
      500
    );
  }
}


// =====================================
// GET /api/sesiones/programar
// =====================================

export async function GET(request: Request) {
  try {
    // =====================================
    // 1. VALIDAR IDENTIFICADOR
    // =====================================

    const valor = new URL(
      request.url
    ).searchParams.get(
      "asignacionId"
    );

    if (
      !valor ||
      !/^[1-9]\d*$/.test(valor)
    ) {
      return errorJson(
        "Identificador de asignación inválido.",
        400
      );
    }

    const asignacionId =
      Number(valor);

    if (
      !Number.isSafeInteger(
        asignacionId
      )
    ) {
      return errorJson(
        "Identificador de asignación inválido.",
        400
      );
    }

    // =====================================
    // 2. AUTENTICAR ENTRENADOR
    // =====================================

    const supabase =
      await createServerClient();

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
        "Debes iniciar sesión.",
        401
      );
    }

    // =====================================
    // 3. VERIFICAR ROL
    // =====================================

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

    if (errorRol) {
      return errorJson(
        "No se pudo verificar tu rol.",
        500
      );
    }

    if (
      rol?.rol !== "entrenador"
    ) {
      return errorJson(
        "Solo el entrenador puede consultar esta programación.",
        403
      );
    }

    // =====================================
    // 4. CONSULTAR PLAN AUTORIZADO
    // =====================================

    const {
      data: plan,
      error: errorPlan,
    } = await supabase
      .from("asignaciones_rutinas")
      .select(
        "id,cliente_id,entrenador_id,rutina_id,fecha_inicio,fecha_fin,estado"
      )
      .eq("id", asignacionId)
      .eq(
        "entrenador_id",
        entrenadorId
      )
      .maybeSingle();

    if (errorPlan) {
      return errorJson(
        "No se pudo consultar el plan.",
        500
      );
    }

    if (!plan) {
      return errorJson(
        "No se encontró un plan autorizado para tu cuenta.",
        404
      );
    }

    // =====================================
    // 5. COMPROBAR RELACIÓN ACTIVA
    // =====================================

    const {
      data: relacion,
      error: errorRelacion,
    } = await supabase
      .from(
        "asignaciones_entrenadores"
      )
      .select("cliente_id")
      .eq(
        "cliente_id",
        plan.cliente_id
      )
      .eq(
        "entrenador_id",
        entrenadorId
      )
      .eq("activa", true)
      .maybeSingle();

    if (errorRelacion) {
      return errorJson(
        "No se pudo comprobar la relación con el cliente.",
        500
      );
    }

    if (!relacion) {
      return errorJson(
        "El cliente ya no está asignado a este entrenador.",
        403
      );
    }

    // =====================================
    // 6. CONSULTAR RUTINA Y SESIONES
    // =====================================

    const [
      consultaRutina,
      consultaSesiones,
    ] = await Promise.all([
      supabase
        .from("rutinas")
        .select(
          "nombre,frecuencia_semanal"
        )
        .eq(
          "id",
          plan.rutina_id
        )
        .maybeSingle(),

      supabase
        .from(
          "sesiones_entrenamiento"
        )
        .select(
          "id,numero_sesion,fecha_programada,estado,duracion_real_min"
        )
        .eq(
          "asignacion_id",
          asignacionId
        )
        .order(
          "numero_sesion",
          {
            ascending: true,
          }
        ),
    ]);

    // =====================================
    // 7. VALIDAR CONSULTAS
    // =====================================

    if (
      consultaRutina.error ||
      !consultaRutina.data
    ) {
      return errorJson(
        "No se pudo consultar la rutina del plan.",
        500
      );
    }

    if (
      consultaSesiones.error
    ) {
      console.error(
        "Error al consultar sesiones:",
        consultaSesiones.error
      );

      return errorJson(
        "No se pudieron consultar las sesiones.",
        500
      );
    }

    // =====================================
    // 8. RESPUESTA FINAL
    // =====================================

    return NextResponse.json(
      {
        plan: {
          id: plan.id,
          estado:
            plan.estado,
          fechaInicio:
            plan.fecha_inicio,
          fechaFin:
            plan.fecha_fin,
          frecuenciaSemanal:
            consultaRutina.data
              .frecuencia_semanal,
          nombreRutina:
            consultaRutina.data
              .nombre,
        },

        sesiones: (
          consultaSesiones.data ??
          []
        ).map(
          (sesion) => ({
            id: sesion.id,
            numeroSesion:
              sesion.numero_sesion,
            fechaProgramada:
              sesion.fecha_programada,
            estado:
              sesion.estado,
            duracionRealMin:
              sesion.duracion_real_min,
          })
        ),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error inesperado al consultar sesiones:",
      error
    );

    return errorJson(
      "Ocurrió un error al consultar las sesiones.",
      500
    );
  }
}
