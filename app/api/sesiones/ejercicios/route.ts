
import { NextResponse } from "next/server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  createClient as createServerClient,
} from "@/lib/supabase/server";


// ============================================
// EVOLUTION CENTER FIT 2.0
// PASO 65.3 - API DE EJERCICIOS POR SESION
// VERSION CORREGIDA PARA TYPESCRIPT
// ============================================

// ============================================
// 1. TIPOS
// ============================================

type Sesion = {
  id: number;
  asignacion_id: number;
  numero_sesion: number;
  fecha_programada: string;
  estado: string;
};

type Asignacion = {
  id: number;
  cliente_id: string;
  entrenador_id: string;
  rutina_id: number;
  estado: string;
};

type Rol = "cliente" | "entrenador";

// ============================================
// 2. CLIENTE ADMINISTRATIVO
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

// IMPORTANTE:
// El tipo se obtiene de nuestra funcion
// concreta, no directamente de la funcion
// generica createAdminClient.

type ClienteAdmin = NonNullable<
  ReturnType<typeof crearClienteAdmin>
>;

type AccesoPermitido = {
  ok: true;
  admin: ClienteAdmin;
  sesion: Sesion;
  asignacion: Asignacion;
  usuarioId: string;
  rol: Rol;
};

type AccesoRechazado = {
  ok: false;
  respuesta: NextResponse;
};

type ResultadoAcceso =
  | AccesoPermitido
  | AccesoRechazado;

// ============================================
// 3. RESPUESTAS HTTP
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
    {
      error: mensaje,
    },
    status
  );
}

// ============================================
// 4. VALIDAR IDENTIFICADORES
// ============================================

function obtenerId(
  valor: unknown
): number | null {
  let numero: number;

  if (
    typeof valor === "string" &&
    /^\d+$/.test(valor)
  ) {
    numero = Number(valor);
  } else if (
    typeof valor === "number"
  ) {
    numero = valor;
  } else {
    return null;
  }

  if (
    !Number.isSafeInteger(numero) ||
    numero <= 0
  ) {
    return null;
  }

  return numero;
}

// ============================================
// 5. VALIDAR ACCESO A UNA SESION
// ============================================

async function validarAcceso(
  sesionId: number,
  soloEntrenador: boolean
): Promise<ResultadoAcceso> {
  // ----------------------------------------
  // 5.1. Verificar usuario autenticado
  // ----------------------------------------

  const supabase =
    await createServerClient();

  const {
    data: auth,
    error: authError,
  } = await supabase.auth.getUser();

  const usuarioId = auth.user?.id;

  if (authError || !usuarioId) {
    return {
      ok: false,
      respuesta: errorJson(
        "Debes iniciar sesión.",
        401
      ),
    };
  }

  // ----------------------------------------
  // 5.2. Crear cliente administrativo
  // ----------------------------------------

  const admin = crearClienteAdmin();

  if (!admin) {
    return {
      ok: false,
      respuesta: errorJson(
        "Falta configurar Supabase en el servidor.",
        503
      ),
    };
  }

  // ----------------------------------------
  // 5.3. Consultar rol del usuario
  // ----------------------------------------

  const {
    data: roles,
    error: errorRoles,
  } = await admin
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", usuarioId);

  if (errorRoles) {
    console.error(
      "Error verificando roles:",
      errorRoles
    );

    return {
      ok: false,
      respuesta: errorJson(
        "No se pudo verificar el rol del usuario.",
        500
      ),
    };
  }

  const tieneRolEntrenador =
    (roles ?? []).some(
      (registro) =>
        registro.rol === "entrenador"
    );

  const tieneRolCliente =
    (roles ?? []).some(
      (registro) =>
        registro.rol === "cliente"
    );

  if (
    !tieneRolEntrenador &&
    !tieneRolCliente
  ) {
    return {
      ok: false,
      respuesta: errorJson(
        "No tienes un rol autorizado.",
        403
      ),
    };
  }

  if (
    soloEntrenador &&
    !tieneRolEntrenador
  ) {
    return {
      ok: false,
      respuesta: errorJson(
        "Solo un entrenador puede preparar ejercicios.",
        403
      ),
    };
  }

  // ----------------------------------------
  // 5.4. Consultar sesión
  // ----------------------------------------

  const {
    data: sesion,
    error: errorSesion,
  } = await admin
    .from("sesiones_entrenamiento")
    .select(
      "id,asignacion_id,numero_sesion,fecha_programada,estado"
    )
    .eq("id", sesionId)
    .maybeSingle();

  if (errorSesion) {
    console.error(
      "Error consultando sesión:",
      errorSesion
    );

    return {
      ok: false,
      respuesta: errorJson(
        "No se pudo consultar la sesión.",
        500
      ),
    };
  }

  if (!sesion) {
    return {
      ok: false,
      respuesta: errorJson(
        "La sesión no existe.",
        404
      ),
    };
  }

  // ----------------------------------------
  // 5.5. Consultar asignación
  // ----------------------------------------

  const {
    data: asignacion,
    error: errorAsignacion,
  } = await admin
    .from("asignaciones_rutinas")
    .select(
      "id,cliente_id,entrenador_id,rutina_id,estado"
    )
    .eq("id", sesion.asignacion_id)
    .maybeSingle();

  if (errorAsignacion) {
    console.error(
      "Error consultando asignación:",
      errorAsignacion
    );

    return {
      ok: false,
      respuesta: errorJson(
        "No se pudo consultar el plan.",
        500
      ),
    };
  }

  if (!asignacion) {
    return {
      ok: false,
      respuesta: errorJson(
        "El plan no existe.",
        404
      ),
    };
  }

  // ----------------------------------------
  // 5.6. Comprobar pertenencia al plan
  // ----------------------------------------

  const esCliente =
    tieneRolCliente &&
    asignacion.cliente_id === usuarioId;

  const esEntrenador =
    tieneRolEntrenador &&
    asignacion.entrenador_id === usuarioId;

  if (!esCliente && !esEntrenador) {
    return {
      ok: false,
      respuesta: errorJson(
        "No tienes autorización sobre esta sesión.",
        403
      ),
    };
  }

  if (
    soloEntrenador &&
    !esEntrenador
  ) {
    return {
      ok: false,
      respuesta: errorJson(
        "Solo el entrenador asignado puede realizar esta operación.",
        403
      ),
    };
  }

  // ----------------------------------------
  // 5.7. Verificar relación entrenador-cliente
  // ----------------------------------------

  if (esEntrenador) {
    const {
      data: relacion,
      error: errorRelacion,
    } = await admin
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq(
        "cliente_id",
        asignacion.cliente_id
      )
      .eq(
        "entrenador_id",
        usuarioId
      )
      .eq("activa", true)
      .maybeSingle();

    if (errorRelacion) {
      console.error(
        "Error consultando relación:",
        errorRelacion
      );

      return {
        ok: false,
        respuesta: errorJson(
          "No se pudo verificar la relación entrenador-cliente.",
          500
        ),
      };
    }

    if (!relacion) {
      return {
        ok: false,
        respuesta: errorJson(
          "La relación con el cliente no está activa.",
          403
        ),
      };
    }
  }

  return {
    ok: true,
    admin,
    sesion,
    asignacion,
    usuarioId,
    rol: esEntrenador
      ? "entrenador"
      : "cliente",
  };
}

// ============================================
// 6. GET - CONSULTAR EJERCICIOS
// ============================================

export async function GET(
  request: Request
) {
  try {
    const url = new URL(request.url);

    const sesionId = obtenerId(
      url.searchParams.get("sesionId")
    );

    if (!sesionId) {
      return errorJson(
        "Debes indicar un sesionId válido.",
        400
      );
    }

    // ----------------------------------------
    // 6.1. Validar autorización
    // ----------------------------------------

    const acceso = await validarAcceso(
      sesionId,
      false
    );

    if (!acceso.ok) {
      return acceso.respuesta;
    }

    const {
      admin,
      sesion,
      asignacion,
    } = acceso;

    // ----------------------------------------
    // 6.2. Consultar ejercicios preparados
    // ----------------------------------------

    // IMPORTANTE:
    // Utilizar un string literal en select().
    // No construirlo mediante join().

    const {
      data: registros,
      error: errorRegistros,
    } = await admin
      .from("sesion_ejercicios")
      .select(
        "id,sesion_id,ejercicio_id,orden,series_objetivo,repeticiones_objetivo,duracion_objetivo_min,descanso_objetivo_seg,estado,duracion_real_seg,observaciones,creado_en,actualizado_en"
      )
      .eq("sesion_id", sesionId)
      .order("orden", {
        ascending: true,
      });

    if (errorRegistros) {
      console.error(
        "Error consultando ejercicios:",
        errorRegistros
      );

      return errorJson(
        "No se pudieron consultar los ejercicios de la sesión.",
        500
      );
    }

    const ejerciciosPreparados =
      registros ?? [];

    // ----------------------------------------
    // 6.3. Sesión sin ejercicios preparados
    // ----------------------------------------

    if (
      ejerciciosPreparados.length === 0
    ) {
      return responder({
        sesion,

        asignacion: {
          id: asignacion.id,
          rutinaId:
            asignacion.rutina_id,
          estado:
            asignacion.estado,
        },

        preparada: false,
        totalEjercicios: 0,
        ejercicios: [],
      });
    }

    // ----------------------------------------
    // 6.4. Consultar catálogo
    // ----------------------------------------

    const idsEjercicios = [
      ...new Set(
        ejerciciosPreparados.map(
          (registro) =>
            registro.ejercicio_id
        )
      ),
    ];

    const {
      data: catalogo,
      error: errorCatalogo,
    } = await admin
      .from("ejercicios")
      .select(
        "id,nombre,grupo_muscular,tipo"
      )
      .in(
        "id",
        idsEjercicios
      );

    if (errorCatalogo) {
      console.error(
        "Error consultando catálogo:",
        errorCatalogo
      );

      return errorJson(
        "No se pudo consultar el catálogo.",
        500
      );
    }

    const catalogoPorId = new Map(
      (catalogo ?? []).map(
        (ejercicio) => [
          ejercicio.id,
          ejercicio,
        ]
      )
    );

    // ----------------------------------------
    // 6.5. Consultar series realizadas
    // ----------------------------------------

    const idsRegistros =
      ejerciciosPreparados.map(
        (registro) => registro.id
      );

    const {
      data: series,
      error: errorSeries,
    } = await admin
      .from("sesion_series")
      .select(
        "id,sesion_ejercicio_id,numero_serie,repeticiones_realizadas,duracion_real_seg,peso_kg,completada,observaciones,registrado_por,creado_en,actualizado_en"
      )
      .in(
        "sesion_ejercicio_id",
        idsRegistros
      )
      .order("numero_serie", {
        ascending: true,
      });

    if (errorSeries) {
      console.error(
        "Error consultando series:",
        errorSeries
      );

      return errorJson(
        "No se pudieron consultar las series.",
        500
      );
    }

    // ----------------------------------------
    // 6.6. Organizar respuesta
    // ----------------------------------------

    const ejercicios =
      ejerciciosPreparados.map(
        (registro) => ({
          ...registro,

          ejercicio:
            catalogoPorId.get(
              registro.ejercicio_id
            ) ?? null,

          series: (series ?? []).filter(
            (serie) =>
              serie.sesion_ejercicio_id ===
              registro.id
          ),
        })
      );

    return responder({
      sesion,

      asignacion: {
        id: asignacion.id,
        rutinaId:
          asignacion.rutina_id,
        estado:
          asignacion.estado,
      },

      preparada: true,
      totalEjercicios:
        ejercicios.length,
      ejercicios,
    });
  } catch (error) {
    console.error(
      "Error GET ejercicios:",
      error
    );

    return errorJson(
      "Ocurrió un error al consultar los ejercicios.",
      500
    );
  }
}

// ============================================
// 7. POST - PREPARAR EJERCICIOS
// ============================================

export async function POST(
  request: Request
) {
  try {
        // ========================================
    // SEGURIDAD: VALIDAR ORIGEN DE SOLICITUD
    // ========================================

    const origenSolicitud =
      request.headers.get("origin");

    const origenAplicacion =
      new URL(request.url).origin;

    if (
      !origenSolicitud ||
      origenSolicitud !== origenAplicacion
    ) {
      return errorJson(
        "Origen de solicitud no autorizado.",
        403
      );
    }

    // ========================================
    // VALIDAR TIPO DE CONTENIDO
    // ========================================

    const tipoContenido =
      request.headers.get("content-type") ?? "";

    if (
      !/^application\/json(?:\s*;|$)/i.test(
        tipoContenido
      )
    ) {
      return errorJson(
        "La solicitud debe contener JSON.",
        415
      );
    }
    // ----------------------------------------
    // 7.1. Validar JSON
    // ----------------------------------------

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
        "Debes enviar un JSON válido.",
        400
      );
    }

    const datos = body as Record<
      string,
      unknown
    >;

    const sesionId = obtenerId(
      datos.sesionId
    );

    if (!sesionId) {
      return errorJson(
        "El identificador de sesión es inválido.",
        400
      );
    }

    // ----------------------------------------
    // 7.2. Validar entrenador
    // ----------------------------------------

    const acceso = await validarAcceso(
      sesionId,
      true
    );

    if (!acceso.ok) {
      return acceso.respuesta;
    }

    const {
      admin,
      sesion,
      asignacion,
    } = acceso;

    // ----------------------------------------
    // 7.3. Validar estado del plan
    // ----------------------------------------

    const planHabilitado = [
      "programada",
      "activa",
    ].includes(asignacion.estado);

    if (!planHabilitado) {
      return errorJson(
        "El plan no permite preparar ejercicios.",
        409
      );
    }

    // ----------------------------------------
    // 7.4. Validar estado de sesión
    // ----------------------------------------

    const sesionHabilitada = [
      "programada",
      "en_curso",
    ].includes(sesion.estado);

    if (!sesionHabilitada) {
      return errorJson(
        "La sesión no permite preparar ejercicios.",
        409
      );
    }

    // ----------------------------------------
    // 7.5. Ejecutar función PostgreSQL
    // ----------------------------------------

    const {
      data: total,
      error: errorRpc,
    } = await admin.rpc(
      "preparar_ejercicios_sesion",
      {
        p_sesion_id: sesionId,
      }
    );

    if (errorRpc) {
      console.error(
        "Error preparando ejercicios:",
        {
          codigo: errorRpc.code,
          mensaje: errorRpc.message,
          detalle: errorRpc.details,
        }
      );

      return errorJson(
        "No se pudieron preparar los ejercicios. Revisa el estado de la sesión y la configuración de la rutina.",
        409
      );
    }

    // ----------------------------------------
    // 7.6. Validar resultado
    // ----------------------------------------

    if (
      typeof total !== "number" ||
      !Number.isInteger(total) ||
      total <= 0
    ) {
      return errorJson(
        "No se pudo confirmar la preparación de los ejercicios.",
        500
      );
    }

    // ----------------------------------------
    // 7.7. Respuesta correcta
    // ----------------------------------------

    return responder({
      mensaje:
        "Los ejercicios de la sesión fueron preparados correctamente.",

      sesionId,
      totalEjercicios: total,
    });
  } catch (error) {
    console.error(
      "Error POST ejercicios:",
      error
    );

    return errorJson(
      "Ocurrió un error al preparar los ejercicios.",
      500
    );
  }
}
