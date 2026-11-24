import { connection, NextResponse } from "next/server";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient as crearServidor } from "@/lib/supabase/server";

function jsonError(mensaje: string, status: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function idPositivo(valor: unknown): valor is number {
  return (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
    valor > 0
  );
}

function fechaValida(valor: unknown): valor is string {
  if (
    typeof valor !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const fecha = new Date(`${valor}T12:00:00.000Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function horaValida(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(valor)
  );
}

async function autorizarSesion(
  sesionId: number,
  soloEntrenador: boolean
) {
  const servidor = await crearServidor();

  const {
    data: autenticacion,
    error: errorAuth,
  } = await servidor.auth.getUser();

  const usuarioId = autenticacion.user?.id;

  if (errorAuth || !usuarioId) {
    return {
      ok: false as const,
      respuesta: jsonError("Debes iniciar sesión.", 401),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "Servicio no configurado.",
        503
      ),
    };
  }

  // Este cliente administrativo se crea exclusivamente
  // en el servidor. Nunca debe enviarse al navegador.
  const admin = crearAdmin(url, clave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: roles,
    error: errorRoles,
  } = await admin
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", usuarioId);

  if (errorRoles) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "No se pudieron verificar tus permisos.",
        500
      ),
    };
  }

  const entrenador = (roles ?? []).some(
    (item) => item.rol === "entrenador"
  );

  const cliente = (roles ?? []).some(
    (item) => item.rol === "cliente"
  );

  if (!entrenador && !cliente) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "Acceso no autorizado.",
        403
      ),
    };
  }

  if (soloEntrenador && !entrenador) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "Solo el entrenador puede reprogramar.",
        403
      ),
    };
  }

  // Consultar la sesión.
  const {
    data: sesion,
    error: errorSesion,
  } = await admin
    .from("sesiones_entrenamiento")
    .select("id,asignacion_id,estado")
    .eq("id", sesionId)
    .maybeSingle();

  if (errorSesion) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "No se pudo consultar la sesión.",
        500
      ),
    };
  }

  if (!sesion) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "Sesión no encontrada.",
        404
      ),
    };
  }

  // Consultar el plan al que pertenece.
  const {
    data: plan,
    error: errorPlan,
  } = await admin
    .from("asignaciones_rutinas")
    .select("id,cliente_id,entrenador_id")
    .eq("id", sesion.asignacion_id)
    .maybeSingle();

  if (errorPlan) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "No se pudo consultar el plan.",
        500
      ),
    };
  }

  if (!plan) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "Plan no encontrado.",
        404
      ),
    };
  }

  const esEntrenador =
    entrenador &&
    plan.entrenador_id === usuarioId;

  const esCliente =
    cliente &&
    plan.cliente_id === usuarioId;

  if (!esEntrenador && !esCliente) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "No tienes acceso a esta sesión.",
        403
      ),
    };
  }

  if (soloEntrenador && !esEntrenador) {
    return {
      ok: false as const,
      respuesta: jsonError(
        "No eres responsable de este plan.",
        403
      ),
    };
  }

  // Confirmar que el entrenador sigue asignado al cliente.
  if (esEntrenador) {
    const {
      data: vinculo,
      error: errorVinculo,
    } = await admin
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", usuarioId)
      .eq("cliente_id", plan.cliente_id)
      .eq("activa", true)
      .limit(1);

    if (errorVinculo) {
      return {
        ok: false as const,
        respuesta: jsonError(
          "No se pudo comprobar la asignación.",
          500
        ),
      };
    }

    if (!vinculo?.length) {
      return {
        ok: false as const,
        respuesta: jsonError(
          "La relación entrenador-cliente no está activa.",
          403
        ),
      };
    }
  }

  return {
    ok: true as const,
    admin,
    usuarioId,
    sesion,
    plan,
  };
}

// =====================================================
// GET: CONSULTAR HISTORIAL DE REPROGRAMACIONES
// =====================================================

export async function GET(request: Request) {
  await connection();

  try {
    const textoId =
      new URL(request.url).searchParams.get("sesionId") ??
      "";

    const sesionId = Number(textoId);

    if (
      !/^[1-9]\d*$/.test(textoId) ||
      !idPositivo(sesionId)
    ) {
      return jsonError(
        "Identificador de sesión inválido.",
        400
      );
    }

    const acceso = await autorizarSesion(
      sesionId,
      false
    );

    if (!acceso.ok) {
      return acceso.respuesta;
    }

    const {
      data: registros,
      error,
    } = await acceso.admin
      .from("historial_reprogramaciones_sesiones")
      .select(
        "id,fecha_anterior,hora_anterior,fecha_nueva,hora_nueva,motivo,creado_en"
      )
      .eq("sesion_id", sesionId)
      .order("creado_en", { ascending: false })
      .limit(30);

    if (error) {
      return jsonError(
        "No se pudo consultar el historial.",
        500
      );
    }

    return NextResponse.json(
      {
        historial: (registros ?? []).map(
          (registro) => ({
            id: registro.id,
            fechaAnterior: registro.fecha_anterior,
            horaAnterior: registro.hora_anterior,
            fechaNueva: registro.fecha_nueva,
            horaNueva: registro.hora_nueva,
            motivo: registro.motivo,
            creadoEn: registro.creado_en,
          })
        ),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error consultando reprogramaciones:",
      error
    );

    return jsonError(
      "Error inesperado al consultar el historial.",
      500
    );
  }
}

// =====================================================
// POST: REPROGRAMAR CON AUTORIZACIÓN Y AUDITORÍA
// =====================================================

export async function POST(request: Request) {
  await connection();

  try {
    // Verificar origen.
    const origen = request.headers.get("origin");

    if (
      !origen ||
      origen !== new URL(request.url).origin
    ) {
      return jsonError(
        "Origen no autorizado.",
        403
      );
    }

    // Exigir JSON.
    const tipo =
      request.headers.get("content-type") ?? "";

    if (!/^application\/json(?:\s*;|$)/i.test(tipo)) {
      return jsonError(
        "Se requiere JSON.",
        415
      );
    }

    const texto = await request.text();

    if (!texto || texto.length > 4096) {
      return jsonError(
        "Solicitud inválida.",
        400
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(texto);
    } catch {
      return jsonError(
        "JSON inválido.",
        400
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return jsonError(
        "Datos inválidos.",
        400
      );
    }

    const datos = body as Record<string, unknown>;

    const sesionId = datos.sesionId;
    const fechaNueva = datos.fechaNueva;
    const horaNueva = datos.horaNueva;

    const motivo =
      typeof datos.motivo === "string"
        ? datos.motivo.trim()
        : "";

    if (!idPositivo(sesionId)) {
      return jsonError(
        "Identificador inválido.",
        400
      );
    }

    if (!fechaValida(fechaNueva)) {
      return jsonError(
        "Fecha inválida.",
        400
      );
    }

    if (!horaValida(horaNueva)) {
      return jsonError(
        "Hora inválida.",
        400
      );
    }

    if (
      motivo.length < 15 ||
      motivo.length > 500
    ) {
      return jsonError(
        "El motivo debe tener entre 15 y 500 caracteres.",
        400
      );
    }

    // Verificar autorización real.
    const acceso = await autorizarSesion(
      sesionId,
      true
    );

    if (!acceso.ok) {
      return acceso.respuesta;
    }

    // PostgreSQL ejecuta el cambio y registra
    // la auditoría en una única transacción.
    const {
      data: resultado,
      error: errorRpc,
    } = await acceso.admin.rpc(
      "reprogramar_sesion_auditada",
      {
        p_sesion_id: sesionId,
        p_entrenador_id: acceso.usuarioId,
        p_fecha_nueva: fechaNueva,
        p_hora_nueva: `${horaNueva}:00`,
        p_motivo: motivo,
      }
    );

    if (errorRpc) {
      const codigo = errorRpc.code ?? "";

      console.error(
        "No se pudo reprogramar:",
        {
          codigo,
          mensaje: errorRpc.message,
        }
      );

      if (codigo === "42501") {
        return jsonError(
          "No tienes permiso para reprogramar esta sesión.",
          403
        );
      }

      if (codigo === "22023") {
        return jsonError(
          errorRpc.message,
          400
        );
      }

      if (
        ["P0001", "23505", "23P01", "23514"].includes(
          codigo
        )
      ) {
        return jsonError(
          codigo === "P0001"
            ? errorRpc.message
            : "El nuevo horario entra en conflicto con otra sesión.",
          409
        );
      }

      return jsonError(
        "No se pudo reprogramar la sesión.",
        500
      );
    }

    return NextResponse.json(
      {
        mensaje:
          "Sesión reprogramada correctamente.",
        resultado,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error inesperado reprogramando:",
      error
    );

    return jsonError(
      "Error inesperado al reprogramar la sesión.",
      500
    );
  }
}