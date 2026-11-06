
import { NextResponse } from "next/server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  createClient as createServerClient,
} from "@/lib/supabase/server";



// ============================================
// EVOLUTION CENTER FIT 2.0
// PASO 65.5
// API - REGISTRO DE SERIES REALIZADAS
// ============================================

// ============================================
// 1. CLIENTE ADMINISTRATIVO
// ============================================

function crearClienteAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    return null;
  }

  return createAdminClient(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ============================================
// 2. RESPUESTAS
// ============================================

function responder(
  datos: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(datos, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function errorJson(
  mensaje: string,
  status: number
) {
  return responder(
    { error: mensaje },
    status
  );
}

// ============================================
// 3. VALIDACIONES DE DATOS
// ============================================

function esEnteroPositivo(
  valor: unknown,
  maximo: number
): valor is number {
  return (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
    valor > 0 &&
    valor <= maximo
  );
}

function esEnteroOpcional(
  valor: unknown,
  maximo: number
): valor is number | null | undefined {
  return (
    valor === null ||
    valor === undefined ||
    (
      typeof valor === "number" &&
      Number.isSafeInteger(valor) &&
      valor >= 0 &&
      valor <= maximo
    )
  );
}

function esPesoValido(
  valor: unknown
): valor is number | null | undefined {
  return (
    valor === null ||
    valor === undefined ||
    (
      typeof valor === "number" &&
      Number.isFinite(valor) &&
      valor >= 0 &&
      valor <= 99999.99
    )
  );
}

function esObservacionValida(
  valor: unknown
): valor is string | null | undefined {
  return (
    valor === null ||
    valor === undefined ||
    (
      typeof valor === "string" &&
      valor.length <= 1000
    )
  );
}

// ============================================
// 4. POST - REGISTRAR UNA SERIE
// ============================================

export async function POST(
  request: Request
) {
  try {
    // ----------------------------------------
    // 4.1. Verificar origen de la petición
    // ----------------------------------------

    const origen = request.headers.get(
      "origin"
    );

    const origenEsperado = new URL(
      request.url
    ).origin;

    if (
      origen &&
      origen !== origenEsperado
    ) {
      return errorJson(
        "Origen de solicitud no permitido.",
        403
      );
    }

    // ----------------------------------------
    // 4.2. Verificar tipo de contenido
    // ----------------------------------------

    const tipoContenido =
      request.headers.get("content-type");

    if (
      !tipoContenido
        ?.toLowerCase()
        .includes("application/json")
    ) {
      return errorJson(
        "Debes enviar información en formato JSON.",
        415
      );
    }

    // ----------------------------------------
    // 4.3. Leer y validar el cuerpo
    // ----------------------------------------

    const texto = await request.text();

    if (
      texto.length === 0 ||
      texto.length > 10000
    ) {
      return errorJson(
        "El contenido de la solicitud es inválido.",
        400
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(texto);
    } catch {
      return errorJson(
        "El JSON enviado no es válido.",
        400
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorJson(
        "Debes enviar un objeto JSON.",
        400
      );
    }

    const datos = body as Record<
      string,
      unknown
    >;

    // ----------------------------------------
    // 4.4. Validar identificadores
    // ----------------------------------------

    if (
      !esEnteroPositivo(
        datos.sesionEjercicioId,
        Number.MAX_SAFE_INTEGER
      )
    ) {
      return errorJson(
        "El identificador del ejercicio es inválido.",
        400
      );
    }

    if (
      !esEnteroPositivo(
        datos.numeroSerie,
        32767
      )
    ) {
      return errorJson(
        "El número de serie es inválido.",
        400
      );
    }

    const sesionEjercicioId =
      datos.sesionEjercicioId;

    const numeroSerie =
      datos.numeroSerie;

    // ----------------------------------------
    // 4.5. Validar resultados
    // ----------------------------------------

    if (
      !esEnteroOpcional(
        datos.repeticionesRealizadas,
        32767
      )
    ) {
      return errorJson(
        "Las repeticiones deben ser un número entero no negativo.",
        400
      );
    }

    if (
      !esEnteroOpcional(
        datos.duracionRealSeg,
        86400
      )
    ) {
      return errorJson(
        "La duración debe estar entre 0 y 86400 segundos.",
        400
      );
    }

    if (
      !esPesoValido(
        datos.pesoKg
      )
    ) {
      return errorJson(
        "El peso registrado no es válido.",
        400
      );
    }

    if (
      typeof datos.completada !==
      "boolean"
    ) {
      return errorJson(
        "Debes indicar si la serie fue completada.",
        400
      );
    }

    if (
      !esObservacionValida(
        datos.observaciones
      )
    ) {
      return errorJson(
        "Las observaciones no pueden superar los 1000 caracteres.",
        400
      );
    }

    const repeticionesRealizadas =
      datos.repeticionesRealizadas ?? null;

    const duracionRealSeg =
      datos.duracionRealSeg ?? null;

    const pesoKg =
      datos.pesoKg ?? null;

    const completada =
      datos.completada;

    const observaciones =
      typeof datos.observaciones ===
      "string"
        ? datos.observaciones.trim() ||
          null
        : null;

    // ----------------------------------------
    // 4.6. Comprobar datos de serie completada
    // ----------------------------------------

    if (
      completada &&
      !(
        (
          typeof repeticionesRealizadas ===
            "number" &&
          repeticionesRealizadas > 0
        ) ||
        (
          typeof duracionRealSeg ===
            "number" &&
          duracionRealSeg > 0
        )
      )
    ) {
      return errorJson(
        "Una serie completada debe tener repeticiones o duración real.",
        400
      );
    }

    // ----------------------------------------
    // 4.7. Verificar autenticación
    // ----------------------------------------

    const supabase =
      await createServerClient();

    const {
      data: autenticacion,
      error: errorAuth,
    } = await supabase.auth.getUser();

    const usuario =
      autenticacion.user;

    if (
      errorAuth ||
      !usuario
    ) {
      return errorJson(
        "Debes iniciar sesión.",
        401
      );
    }

    // ----------------------------------------
    // 4.8. Crear cliente del servidor
    // ----------------------------------------

    const admin =
      crearClienteAdmin();

    if (!admin) {
      return errorJson(
        "Falta configurar Supabase en el servidor.",
        503
      );
    }

    // ----------------------------------------
    // 4.9. Verificar rol entrenador
    // ----------------------------------------

    const {
      data: roles,
      error: errorRoles,
    } = await admin
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", usuario.id)
      .eq("rol", "entrenador")
      .limit(1);

    if (errorRoles) {
      console.error(
        "Error verificando rol:",
        errorRoles
      );

      return errorJson(
        "No se pudo verificar tu rol.",
        500
      );
    }

    if (!roles || roles.length === 0) {
      return errorJson(
        "Solo los entrenadores pueden registrar series.",
        403
      );
    }

    // ----------------------------------------
    // 4.10. Consultar ejercicio de sesión
    // ----------------------------------------

    const {
      data: ejercicioSesion,
      error: errorEjercicio,
    } = await admin
      .from("sesion_ejercicios")
      .select(
        "id,sesion_id,estado,series_objetivo,repeticiones_objetivo,duracion_objetivo_min"
      )
      .eq(
        "id",
        sesionEjercicioId
      )
      .maybeSingle();

    if (errorEjercicio) {
      console.error(
        "Error consultando ejercicio:",
        errorEjercicio
      );

      return errorJson(
        "No se pudo consultar el ejercicio.",
        500
      );
    }

    if (!ejercicioSesion) {
      return errorJson(
        "El ejercicio no existe en ninguna sesión preparada.",
        404
      );
    }

    // ----------------------------------------
    // 4.11. Consultar sesión
    // ----------------------------------------

    const {
      data: sesion,
      error: errorSesion,
    } = await admin
      .from("sesiones_entrenamiento")
      .select(
        "id,asignacion_id,estado,fecha_programada"
      )
      .eq(
        "id",
        ejercicioSesion.sesion_id
      )
      .maybeSingle();

    if (errorSesion) {
      console.error(
        "Error consultando sesión:",
        errorSesion
      );

      return errorJson(
        "No se pudo consultar la sesión.",
        500
      );
    }

    if (!sesion) {
      return errorJson(
        "La sesión asociada no existe.",
        404
      );
    }

    // ----------------------------------------
    // 4.12. Consultar asignación
    // ----------------------------------------

    const {
      data: asignacion,
      error: errorAsignacion,
    } = await admin
      .from("asignaciones_rutinas")
      .select(
        "id,cliente_id,entrenador_id,estado"
      )
      .eq(
        "id",
        sesion.asignacion_id
      )
      .maybeSingle();

    if (errorAsignacion) {
      console.error(
        "Error consultando plan:",
        errorAsignacion
      );

      return errorJson(
        "No se pudo consultar el plan de entrenamiento.",
        500
      );
    }

    if (!asignacion) {
      return errorJson(
        "El plan asociado no existe.",
        404
      );
    }

    // ----------------------------------------
    // 4.13. Verificar entrenador asignado
    // ----------------------------------------

    if (
      asignacion.entrenador_id !==
      usuario.id
    ) {
      return errorJson(
        "No eres el entrenador asignado a este cliente.",
        403
      );
    }

    // ----------------------------------------
    // 4.14. Verificar relación activa
    // ----------------------------------------

    const {
      data: relacion,
      error: errorRelacion,
    } = await admin
      .from(
        "asignaciones_entrenadores"
      )
      .select("cliente_id")
      .eq(
        "cliente_id",
        asignacion.cliente_id
      )
      .eq(
        "entrenador_id",
        usuario.id
      )
      .eq("activa", true)
      .maybeSingle();

    if (errorRelacion) {
      console.error(
        "Error verificando relación:",
        errorRelacion
      );

      return errorJson(
        "No se pudo verificar la relación entrenador-cliente.",
        500
      );
    }

    if (!relacion) {
      return errorJson(
        "La relación con este cliente no está activa.",
        403
      );
    }

    // ----------------------------------------
    // 4.15. Validar estado del plan
    // ----------------------------------------

    if (
      ![
        "programada",
        "activa",
      ].includes(asignacion.estado)
    ) {
      return errorJson(
        "El plan no permite registrar ejercicios.",
        409
      );
    }

    // ----------------------------------------
    // 4.16. Validar estado de sesión
    // ----------------------------------------

    if (
      sesion.estado !== "en_curso"
    ) {
      return errorJson(
        "Solo puedes registrar series cuando la sesión está en curso.",
        409
      );
    }

    // ----------------------------------------
    // 4.17. Validar ejercicio
    // ----------------------------------------

    if (
      ejercicioSesion.estado ===
      "omitido"
    ) {
      return errorJson(
        "No puedes registrar series en un ejercicio omitido.",
        409
      );
    }

    const seriesObjetivo =
      ejercicioSesion.series_objetivo ??
      1;

    if (
      numeroSerie >
      seriesObjetivo
    ) {
      return errorJson(
        "El número de serie supera las series programadas.",
        400
      );
    }

    // ----------------------------------------
    // 4.18. Validar objetivos del ejercicio
    // ----------------------------------------

    if (completada) {
      if (
        ejercicioSesion
          .repeticiones_objetivo !==
          null &&
        ejercicioSesion
          .repeticiones_objetivo !==
          undefined &&
        (
          typeof repeticionesRealizadas !==
            "number" ||
          repeticionesRealizadas <= 0
        )
      ) {
        return errorJson(
          "Debes registrar las repeticiones realizadas.",
          400
        );
      }

      if (
        ejercicioSesion
          .duracion_objetivo_min !==
          null &&
        ejercicioSesion
          .duracion_objetivo_min !==
          undefined &&
        (
          typeof duracionRealSeg !==
            "number" ||
          duracionRealSeg <= 0
        )
      ) {
        return errorJson(
          "Debes registrar la duración real del ejercicio.",
          400
        );
      }
    }

    // ----------------------------------------
    // 4.19. Registrar mediante PostgreSQL
    // ----------------------------------------

    // El usuario que registra la serie se
    // obtiene de Supabase Auth.
    // No se acepta desde el navegador.

    const {
      data: resultado,
      error: errorRpc,
    } = await admin.rpc(
      "registrar_serie_ejercicio",
      {
        p_sesion_ejercicio_id:
          sesionEjercicioId,

        p_numero_serie:
          numeroSerie,

        p_registrado_por:
          usuario.id,

        p_repeticiones_realizadas:
          repeticionesRealizadas,

        p_duracion_real_seg:
          duracionRealSeg,

        p_peso_kg:
          pesoKg,

        p_completada:
          completada,

        p_observaciones:
          observaciones,
      }
    );

    if (errorRpc) {
      console.error(
        "Error registrando serie:",
        {
          codigo: errorRpc.code,
          mensaje: errorRpc.message,
          detalle: errorRpc.details,
        }
      );

      const errorValidacion = [
        "P0001",
        "23514",
        "23503",
        "22003",
      ].includes(
        errorRpc.code ?? ""
      );

      return errorJson(
        errorValidacion
          ? "No se pudo registrar la serie. Revisa los valores, el estado de la sesión y los permisos del entrenador."
          : "Ocurrió un error del servidor al guardar la serie.",
        errorValidacion ? 409 : 500
      );
    }

    if (
      resultado === null ||
      resultado === undefined
    ) {
      return errorJson(
        "No se pudo confirmar el registro de la serie.",
        500
      );
    }

    // ----------------------------------------
    // 4.20. Respuesta correcta
    // ----------------------------------------

    return responder({
      mensaje:
        "Serie registrada correctamente.",

      sesionEjercicioId,
      numeroSerie,

      resultado,
    });
  } catch (error) {
    console.error(
      "Error inesperado POST series:",
      error
    );

    return errorJson(
      "Ocurrió un error inesperado al registrar la serie.",
      500
    );
  }
}
