
import { NextResponse } from "next/server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  createClient as createServerClient,
} from "@/lib/supabase/server";

// =====================================================
// EVOLUTION CENTER FIT 2.0
// FASE 114.2.5
//
// POST /api/sesiones/horario
//
// Asignar o reprogramar la hora de una sesión.
//
// SEGURIDAD:
// - Sesión autenticada obligatoria.
// - Solo entrenadores.
// - Identidad obtenida del usuario autenticado.
// - Clave privada utilizada exclusivamente en servidor.
// - Validaciones finales dentro de PostgreSQL.
// - Sin desactivar RLS.
// - Sin modificar fechas, asistencia o cumplimiento.
// =====================================================

type SolicitudHorario = {
  sesionId: number;
  horaProgramada: string;
};

type ResultadoHorario = {
  sesionId: number;
  fechaProgramada: string;
  horaProgramada: string;
  duracionMin: number;
  actualizada: boolean;
  mensaje: string;
};

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function esObjeto(
  valor: unknown
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function validarHora(hora: unknown): hora is string {
  return (
    typeof hora === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora)
  );
}

function validarSolicitud(
  valor: unknown
): valor is SolicitudHorario {
  if (!esObjeto(valor)) {
    return false;
  }

  return (
    typeof valor.sesionId === "number" &&
    Number.isSafeInteger(valor.sesionId) &&
    valor.sesionId > 0 &&
    validarHora(valor.horaProgramada)
  );
}

function validarResultado(
  valor: unknown
): valor is ResultadoHorario {
  if (!esObjeto(valor)) {
    return false;
  }

  return (
    typeof valor.sesionId === "number" &&
    Number.isSafeInteger(valor.sesionId) &&
    typeof valor.fechaProgramada === "string" &&
    typeof valor.horaProgramada === "string" &&
    typeof valor.duracionMin === "number" &&
    Number.isFinite(valor.duracionMin) &&
    valor.actualizada === true &&
    typeof valor.mensaje === "string"
  );
}

function responderError(
  mensaje: string,
  status: number
) {
  return NextResponse.json(
    { error: mensaje },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

// =====================================================
// POST /api/sesiones/horario
// =====================================================

export async function POST(request: Request) {
  try {
    // ================================================
    // 1. VALIDAR ORIGEN DE LA SOLICITUD
    // ================================================

    const origen = request.headers.get("origin");

    if (
      origen &&
      origen !== new URL(request.url).origin
    ) {
      return responderError(
        "Origen de solicitud no autorizado.",
        403
      );
    }

    // ================================================
    // 2. VALIDAR DATOS RECIBIDOS
    // ================================================

    const body: unknown = await request
      .json()
      .catch(() => null);

    if (!validarSolicitud(body)) {
      return responderError(
        "Debes enviar un identificador de sesión válido y una hora en formato HH:mm.",
        400
      );
    }

    const {
      sesionId,
      horaProgramada,
    } = body;

    // ================================================
    // 3. AUTENTICAR USUARIO
    // ================================================

    const supabase = await createServerClient();

    const {
      data: auth,
      error: errorAuth,
    } = await supabase.auth.getClaims();

    const entrenadorId = auth?.claims?.sub;

    if (errorAuth || !entrenadorId) {
      return responderError(
        "Debes iniciar sesión para modificar horarios.",
        401
      );
    }

    // ================================================
    // 4. VALIDAR ROL ENTRENADOR
    // ================================================

    const {
      data: rol,
      error: errorRol,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .eq("rol", "entrenador")
      .maybeSingle();

    if (errorRol) {
      console.error(
        "Error verificando rol para horarios:",
        errorRol
      );

      return responderError(
        "No se pudo verificar tu autorización.",
        500
      );
    }

    if (!rol) {
      return responderError(
        "Solo un entrenador puede administrar horarios.",
        403
      );
    }

    // ================================================
    // 5. CONFIGURAR CONEXIÓN PRIVADA
    // ================================================

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clavePrivada =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clavePrivada) {
      console.error(
        "Falta configuración privada de Supabase."
      );

      return responderError(
        "El servicio de programación no está disponible.",
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

    // ================================================
    // 6. EJECUTAR OPERACIÓN SEGURA EN POSTGRESQL
    // ================================================

    // El entrenadorId no se recibe del navegador.
    // Procede de la sesión autenticada.
    //
    // PostgreSQL vuelve a validar:
    // - Rol del entrenador.
    // - Propiedad del plan.
    // - Relación activa con el cliente.
    // - Estado del plan y de la sesión.
    // - Periodo y duración.
    // - Horas anteriores al momento actual.
    // - Conflictos de horario.
    //
    // La función SQL modifica únicamente
    // hora_programada y actualizada_en.

    const {
      data,
      error: errorRpc,
    } = await admin.rpc(
      "actualizar_horario_sesion_entrenamiento",
      {
        p_sesion_id: sesionId,
        p_entrenador_id: entrenadorId,
        p_hora_programada:
          `${horaProgramada}:00`,
      }
    );

    // ================================================
    // 7. CONTROLAR ERRORES DE POSTGRESQL
    // ================================================

    if (errorRpc) {
      console.error(
        "Error al actualizar horario:",
        {
          codigo: errorRpc.code,
          mensaje: errorRpc.message,
          detalle: errorRpc.details,
        }
      );

      // Acceso no autorizado.
      if (errorRpc.code === "42501") {
        return responderError(
          "No tienes permiso para modificar esta sesión.",
          403
        );
      }

      // Sesión no encontrada.
      if (errorRpc.code === "P0002") {
        return responderError(
          "La sesión ya no existe.",
          404
        );
      }

      // Parámetros incorrectos.
      if (
        errorRpc.code === "22023" ||
        errorRpc.code === "22P02"
      ) {
        return responderError(
          "La hora solicitada no es válida para esta sesión.",
          400
        );
      }

      // Conflicto con otra sesión.
      if (errorRpc.code === "23P01") {
        return responderError(
          "Existe un conflicto de horario con otro entrenamiento del entrenador o del cliente.",
          409
        );
      }

      // Restricción del estado, fecha o plan.
      if (
        errorRpc.code === "23514" ||
        errorRpc.code === "23505"
      ) {
        return responderError(
          "No se puede modificar este horario. Comprueba que la sesión esté programada, que no tenga actividad registrada y que la hora no haya pasado.",
          409
        );
      }

      // Función SQL no disponible.
      if (errorRpc.code === "PGRST202") {
        return responderError(
          "La función de horarios no está disponible en Supabase.",
          503
        );
      }

      // Otros errores.
      return responderError(
        "No se pudo actualizar el horario.",
        500
      );
    }

    // ================================================
    // 8. VALIDAR RESULTADO
    // ================================================

    if (
      !validarResultado(data) ||
      data.sesionId !== sesionId ||
      data.horaProgramada !== horaProgramada
    ) {
      console.error(
        "Respuesta inesperada de la función de horarios:",
        data
      );

      return responderError(
        "No se pudo confirmar la actualización del horario.",
        502
      );
    }

    // ================================================
    // 9. RESPUESTA EXITOSA
    // ================================================

    return NextResponse.json(
      {
        mensaje: data.mensaje,

        sesionId: data.sesionId,

        fechaProgramada: data.fechaProgramada,

        horaProgramada: data.horaProgramada,

        duracionMin: data.duracionMin,

        actualizada: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );

  } catch (error) {
    console.error(
      "Error inesperado al administrar horario:",
      error
    );

    return responderError(
      "Ocurrió un error al actualizar el horario.",
      500
    );
  }
}
