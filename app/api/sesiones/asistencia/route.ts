
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";


// ============================================
// 1. TIPOS
// ============================================

type AccionSesion =
  | "iniciar"
  | "finalizar"
  | "marcar_ausente"
  | "cancelar";

type ResultadoAsistencia = {
  id: number;
  asignacionId: number;
  numeroSesion: number;
  fechaProgramada: string;
  estado: string;
  inicioReal: string | null;
  finReal: string | null;
  duracionRealMin: number | null;
  observaciones: string | null;
  mensaje: string;
};

const ESTADO_POR_ACCION: Record<
  AccionSesion,
  string
> = {
  iniciar: "en_curso",
  finalizar: "realizada",
  marcar_ausente: "ausente",
  cancelar: "cancelada",
};

// ============================================
// 2. VALIDACIONES
// ============================================

function esObjeto(
  valor: unknown
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function esIdValido(
  valor: unknown
): valor is number {
  return (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
    valor > 0
  );
}

function esAccionValida(
  valor: unknown
): valor is AccionSesion {
  return (
    valor === "iniciar" ||
    valor === "finalizar" ||
    valor === "marcar_ausente" ||
    valor === "cancelar"
  );
}

function esResultadoAsistencia(
  valor: unknown
): valor is ResultadoAsistencia {
  if (!esObjeto(valor)) {
    return false;
  }

  return (
    esIdValido(valor.id) &&
    esIdValido(valor.asignacionId) &&
    esIdValido(valor.numeroSesion) &&
    typeof valor.fechaProgramada ===
    "string" &&
    typeof valor.estado === "string" &&
    typeof valor.mensaje === "string" &&
    (
      valor.inicioReal === null ||
      typeof valor.inicioReal === "string"
    ) &&
    (
      valor.finReal === null ||
      typeof valor.finReal === "string"
    ) &&
    (
      valor.observaciones === null ||
      typeof valor.observaciones ===
      "string"
    ) &&
    (
      valor.duracionRealMin === null ||
      (
        typeof valor.duracionRealMin ===
        "number" &&
        Number.isFinite(
          valor.duracionRealMin
        ) &&
        valor.duracionRealMin >= 0
      )
    )
  );
}

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

// ============================================
// 3. API POST
// ============================================

export async function POST(
  request: Request
) {
  try {
    // ========================================
    // 4. VALIDAR SOLICITUD
    // ========================================

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
      sesionId,
      accion,
      observaciones,
    } = body;

    if (!esIdValido(sesionId)) {
      return errorJson(
        "El identificador de la sesión es inválido.",
        400
      );
    }

    if (!esAccionValida(accion)) {
      return errorJson(
        "La acción solicitada no es válida.",
        400
      );
    }

    if (
      observaciones !== undefined &&
      observaciones !== null &&
      typeof observaciones !== "string"
    ) {
      return errorJson(
        "Las observaciones deben ser texto.",
        400
      );
    }

    const textoObservaciones =
      typeof observaciones === "string"
        ? observaciones.trim()
        : "";

    if (
      textoObservaciones.length > 1000
    ) {
      return errorJson(
        "Las observaciones no pueden superar los 1000 caracteres.",
        400
      );
    }

    if (
      accion === "cancelar" &&
      textoObservaciones.length < 10
    ) {
      return errorJson(
        "Para cancelar debes indicar un motivo de al menos 10 caracteres.",
        400
      );
    }

    // ========================================
    // 5. AUTENTICAR ENTRENADOR
    // ========================================

    const supabase =
      await createServerClient();

    const {
      data: datosUsuario,
      error: errorUsuario,
    } = await supabase.auth.getUser();

    const usuario = datosUsuario?.user;

    if (
      errorUsuario ||
      !usuario
    ) {
      return errorJson(
        "Tu sesión ha expirado. Inicia sesión nuevamente.",
        401
      );
    }

    // ========================================
    // 6. VERIFICAR ROL
    // ========================================

    const {
      data: roles,
      error: errorRoles,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq(
        "usuario_id",
        usuario.id
      )
      .eq(
        "rol",
        "entrenador"
      )
      .limit(1);

    if (errorRoles) {
      console.error(
        "Error al verificar rol:",
        errorRoles.message
      );

      return errorJson(
        "No se pudo verificar tu rol de usuario.",
        500
      );
    }

    if (!roles?.length) {
      return errorJson(
        "Solo los entrenadores pueden registrar asistencia.",
        403
      );
    }

    // ========================================
    // 7. SUPABASE PRIVADO
    // ========================================

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env
        .SUPABASE_SECRET_KEY ??
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      console.error(
        "Falta configurar la conexión privada de Supabase."
      );

      return errorJson(
        "El servicio de asistencia no está configurado correctamente.",
        503
      );
    }

    const admin = createAdminClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // ========================================
    // 8. ACTUALIZAR ESTADO DE SESION
    // ========================================

    // Esta RPC valida en PostgreSQL:
    // - Entrenador autorizado
    // - Asignación activa
    // - Estado del plan
    // - Fecha programada
    // - Transición permitida

    const {
      data: resultado,
      error: errorRpc,
    } = await admin.rpc(
      "registrar_estado_sesion",
      {
        p_sesion_id: sesionId,
        p_entrenador_id:
          usuario.id,
        p_accion: accion,
        p_observaciones:
          textoObservaciones || null,
      }
    );

    // ========================================
    // 9. CONTROL DE ERRORES SQL
    // ========================================

    if (errorRpc) {
      console.error(
        "Error al registrar asistencia:",
        {
          codigo: errorRpc.code,
          mensaje: errorRpc.message,
          detalle: errorRpc.details,
          accion,
          sesionId,
        }
      );

      if (
        errorRpc.code === "42501"
      ) {
        return errorJson(
          "No tienes permiso para modificar esta sesión.",
          403
        );
      }

      if (
        errorRpc.code === "22023"
      ) {
        return errorJson(
          "Los datos enviados no son válidos.",
          400
        );
      }

      if (
        errorRpc.code === "P0002"
      ) {
        return errorJson(
          "La sesión de entrenamiento no existe.",
          404
        );
      }

      if (
        errorRpc.code === "23514"
      ) {
        const mensajes: Record<
          AccionSesion,
          string
        > = {
          iniciar:
            "No se puede iniciar la sesión. Debe estar programada para hoy y haber llegado su hora de inicio.",

          finalizar:
            "No se puede finalizar: debe estar en curso y haber transcurrido al menos un minuto.",

          marcar_ausente:
            "No se puede registrar la ausencia antes de la fecha permitida.",

          cancelar:
            "No se puede cancelar esta sesión en su estado o fecha actual.",
        };

        return errorJson(
          mensajes[accion],
          409
        );
      }

      if (
        errorRpc.code === "PGRST202"
      ) {
        return errorJson(
          "La función de asistencia no está disponible en Supabase.",
          503
        );
      }

      return errorJson(
        "No se pudo actualizar el estado de la sesión.",
        500
      );
    }

    // ========================================
    // 10. VALIDAR RESULTADO
    // ========================================

    if (
      !esResultadoAsistencia(
        resultado
      )
    ) {
      console.error(
        "Respuesta inesperada de registrar_estado_sesion:",
        resultado
      );

      return errorJson(
        "No se pudo confirmar el resultado. Actualiza el calendario antes de reintentar.",
        502
      );
    }

    if (
      resultado.id !== sesionId ||
      resultado.estado !==
      ESTADO_POR_ACCION[accion]
    ) {
      console.error(
        "La respuesta SQL no coincide con la acción solicitada.",
        {
          sesionId,
          accion,
          resultado,
        }
      );

      return errorJson(
        "El servidor devolvió un estado inesperado. Actualiza el calendario.",
        502
      );
    }

    // ========================================
    // 11. NUEVO:
    // PREPARAR EJERCICIOS AL INICIAR
    // ========================================

    let mensaje = resultado.mensaje;

    let preparacion: {
      preparada: boolean;
      total: number | null;
    } | null = null;

    if (accion === "iniciar") {
      const {
        error: errorPreparar,
      } = await admin.rpc(
        "preparar_ejercicios_sesion",
        {
          p_sesion_id: sesionId,
        }
      );

      // Si la preparación falla, la sesión
      // permanece iniciada.
      //
      // No intentamos revertir artificialmente
      // el estado de asistencia.

      if (errorPreparar) {
        console.error(
          "No se pudieron preparar ejercicios:",
          {
            sesionId,
            codigo:
              errorPreparar.code,
            mensaje:
              errorPreparar.message,
          }
        );

        preparacion = {
          preparada: false,
          total: null,
        };

        mensaje +=
          " La sesión está en curso, pero falló la preparación automática. " +
          'Abre "Ver ejercicios" y pulsa "Preparar ejercicios" para reintentar.';
      } else {
        // ====================================
        // 12. CONFIRMAR EJERCICIOS PREPARADOS
        // ====================================

        const {
          count,
          error: errorConteo,
        } = await admin
          .from("sesion_ejercicios")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "sesion_id",
            sesionId
          );

        if (
          errorConteo ||
          count === null
        ) {
          console.error(
            "No se pudo verificar la preparación:",
            errorConteo?.message
          );

          preparacion = {
            preparada: false,
            total: null,
          };

          mensaje +=
            ' Revisa los ejercicios desde "Ver ejercicios".';
        } else if (count === 0) {
          preparacion = {
            preparada: false,
            total: 0,
          };

          mensaje +=
            " La sesión está en curso, pero no se encontraron ejercicios. " +
            "Comprueba que la rutina tenga ejercicios asignados.";
        } else {
          preparacion = {
            preparada: true,
            total: count,
          };

          mensaje +=
            ` ${count} ejercicios listos para registrar.`;
        }
      }
    }

    // ========================================
    // 13. RESPUESTA AL NAVEGADOR
    // ========================================

    return NextResponse.json(
      {
        mensaje,

        preparacion,

        sesion: {
          id: resultado.id,

          asignacionId:
            resultado.asignacionId,

          numeroSesion:
            resultado.numeroSesion,

          fechaProgramada:
            resultado.fechaProgramada,

          estado:
            resultado.estado,

          inicioReal:
            resultado.inicioReal,

          finReal:
            resultado.finReal,

          duracionRealMin:
            resultado.duracionRealMin,

          observaciones:
            resultado.observaciones,
        },
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
      "Error inesperado en la API de asistencia:",
      error
    );

    return errorJson(
      "Ocurrió un error inesperado al registrar la asistencia.",
      500
    );
  }
}
