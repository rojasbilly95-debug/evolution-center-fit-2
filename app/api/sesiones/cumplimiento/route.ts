
import { NextResponse, connection } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// ============================================
// EVOLUTION CENTER FIT 2.0
// Indicadores de cumplimiento por sesión
// Acceso: cliente propietario o entrenador asignado
// ============================================

type Ejercicio = {
  id: number;
  series_objetivo: number | null;
  repeticiones_objetivo: number | null;
  duracion_objetivo_min: number | null;
};

type Serie = {
  sesion_ejercicio_id: number;
  numero_serie: number;
  repeticiones_realizadas: number | null;
  duracion_real_seg: number | null;
  completada: boolean;
};

function responderError(
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

function porcentaje(
  numerador: number,
  denominador: number
): number | null {
  return denominador > 0
    ? Math.round(
        (numerador / denominador) * 100
      )
    : null;
}

// ============================================
// GET /api/sesiones/cumplimiento?sesionId=2
// ============================================

export async function GET(request: Request) {
  // Impide el prerenderizado de una ruta que
  // depende de parámetros y sesión autenticada.
  await connection();

  try {
    // ========================================
    // 1. VALIDAR IDENTIFICADOR
    // ========================================

    const url = new URL(request.url);

    const textoId =
      url.searchParams.get("sesionId") ?? "";

    const sesionId = Number(textoId);

    if (
      !/^[1-9]\d*$/.test(textoId) ||
      !Number.isSafeInteger(sesionId)
    ) {
      return responderError(
        "El identificador de sesión es inválido.",
        400
      );
    }

    // ========================================
    // 2. VERIFICAR AUTENTICACIÓN
    // ========================================

    const supabase = await createServerClient();

    const {
      data: datosUsuario,
      error: errorUsuario,
    } = await supabase.auth.getUser();

    const usuario = datosUsuario?.user;

    if (errorUsuario || !usuario) {
      return responderError(
        "Tu sesión ha expirado. Inicia sesión nuevamente.",
        401
      );
    }

    // ========================================
    // 3. CREAR CLIENTE ADMINISTRATIVO
    // ========================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clavePrivada =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !clavePrivada) {
      return responderError(
        "El servicio de seguimiento no está configurado.",
        503
      );
    }

    const admin = createAdminClient(
      supabaseUrl,
      clavePrivada,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // ========================================
    // 4. CONSULTAR ROLES AUTORIZADOS
    // ========================================

    const {
      data: roles,
      error: errorRol,
    } = await admin
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", usuario.id)
      .in("rol", ["cliente", "entrenador"]);

    if (errorRol) {
      console.error(
        "Error consultando roles:",
        errorRol.message
      );

      return responderError(
        "No se pudieron verificar tus permisos.",
        500
      );
    }

    const tieneRolCliente =
      (roles ?? []).some(
        (registro) =>
          registro.rol === "cliente"
      );

    const tieneRolEntrenador =
      (roles ?? []).some(
        (registro) =>
          registro.rol === "entrenador"
      );

    if (
      !tieneRolCliente &&
      !tieneRolEntrenador
    ) {
      return responderError(
        "No tienes autorización para consultar estos indicadores.",
        403
      );
    }

    // ========================================
    // 5. CONSULTAR SESIÓN
    // ========================================

    const {
      data: sesion,
      error: errorSesion,
    } = await admin
      .from("sesiones_entrenamiento")
      .select(
        "id,asignacion_id,estado,fecha_programada"
      )
      .eq("id", sesionId)
      .maybeSingle();

    if (errorSesion) {
      console.error(
        "Error consultando sesión:",
        errorSesion.message
      );

      return responderError(
        "No se pudo consultar la sesión.",
        500
      );
    }

    if (!sesion) {
      return responderError(
        "La sesión solicitada no existe.",
        404
      );
    }

    // ========================================
    // 6. CONSULTAR PLAN DE LA SESIÓN
    // ========================================

    const {
      data: plan,
      error: errorPlan,
    } = await admin
      .from("asignaciones_rutinas")
      .select(
        "id,entrenador_id,cliente_id,estado"
      )
      .eq("id", sesion.asignacion_id)
      .maybeSingle();

    if (errorPlan) {
      console.error(
        "Error consultando plan:",
        errorPlan.message
      );

      return responderError(
        "No se pudo consultar el plan.",
        500
      );
    }

    if (!plan) {
      return responderError(
        "No tienes permiso para consultar esta sesión.",
        403
      );
    }

    // ========================================
    // 7. VERIFICAR PROPIEDAD O ASIGNACIÓN
    // ========================================

    const esClientePropietario =
      tieneRolCliente &&
      plan.cliente_id === usuario.id;

    const esEntrenadorAsignado =
      tieneRolEntrenador &&
      plan.entrenador_id === usuario.id;

    if (
      !esClientePropietario &&
      !esEntrenadorAsignado
    ) {
      return responderError(
        "No tienes permiso para consultar esta sesión.",
        403
      );
    }

    // ========================================
    // 8. VERIFICAR RELACIÓN ACTIVA
    // ========================================

    // El entrenador requiere una relación activa.
    // El cliente puede consultar su propio historial
    // aunque su entrenador haya cambiado.

    if (
      esEntrenadorAsignado &&
      !esClientePropietario
    ) {
      const {
        data: vinculos,
        error: errorVinculo,
      } = await admin
        .from("asignaciones_entrenadores")
        .select("cliente_id")
        .eq("entrenador_id", usuario.id)
        .eq("cliente_id", plan.cliente_id)
        .eq("activa", true)
        .limit(1);

      if (errorVinculo) {
        console.error(
          "Error verificando relación activa:",
          errorVinculo.message
        );

        return responderError(
          "No se pudo verificar la asignación del entrenador.",
          500
        );
      }

      if (!vinculos?.length) {
        return responderError(
          "El cliente ya no está asignado a este entrenador.",
          403
        );
      }
    }

    // ========================================
    // 9. CONSULTAR EJERCICIOS PREPARADOS
    // ========================================

    const {
      data: ejercicios,
      error: errorEjercicios,
    } = await admin
      .from("sesion_ejercicios")
      .select(
        "id,series_objetivo,repeticiones_objetivo,duracion_objetivo_min"
      )
      .eq("sesion_id", sesionId);

    if (errorEjercicios) {
      console.error(
        "Error consultando ejercicios:",
        errorEjercicios.message
      );

      return responderError(
        "No se pudieron consultar los ejercicios.",
        500
      );
    }

    const listaEjercicios: Ejercicio[] =
      ejercicios ?? [];

    const idsEjercicios =
      listaEjercicios.map(
        (ejercicio) => ejercicio.id
      );

    // ========================================
    // 10. CONSULTAR SERIES REGISTRADAS
    // ========================================

    let listaSeries: Serie[] = [];

    if (idsEjercicios.length > 0) {
      const {
        data: series,
        error: errorSeries,
      } = await admin
        .from("sesion_series")
        .select(
          "sesion_ejercicio_id,numero_serie,repeticiones_realizadas,duracion_real_seg,completada"
        )
        .in(
          "sesion_ejercicio_id",
          idsEjercicios
        );

      if (errorSeries) {
        console.error(
          "Error consultando series:",
          errorSeries.message
        );

        return responderError(
          "No se pudieron consultar los registros de las series.",
          500
        );
      }

      listaSeries = series ?? [];
    }

    // ========================================
    // 11. AGRUPAR SERIES POR EJERCICIO
    // ========================================

    const seriesPorEjercicio =
      new Map<number, Serie[]>();

    for (const serie of listaSeries) {
      const existentes =
        seriesPorEjercicio.get(
          serie.sesion_ejercicio_id
        ) ?? [];

      existentes.push(serie);

      seriesPorEjercicio.set(
        serie.sesion_ejercicio_id,
        existentes
      );
    }

    // ========================================
    // 12. INICIALIZAR ACUMULADORES
    // ========================================

    let seriesObjetivo = 0;
    let seriesRegistradas = 0;
    let seriesCompletadas = 0;

    let ejerciciosConRegistro = 0;
    let ejerciciosCompletados = 0;

    let repeticionesObjetivo = 0;
    let repeticionesRegistradas = 0;

    let duracionObjetivoSeg = 0;
    let duracionRegistradaSeg = 0;

    // ========================================
    // 13. CALCULAR CUMPLIMIENTO
    // ========================================

    for (const ejercicio of listaEjercicios) {
      const metaSeries =
        ejercicio.series_objetivo ?? 0;

      if (
        !Number.isInteger(metaSeries) ||
        metaSeries <= 0
      ) {
        continue;
      }

      seriesObjetivo += metaSeries;

      const metaReps = Math.max(
        0,
        ejercicio.repeticiones_objetivo ?? 0
      );

      const metaSegundos =
        Math.max(
          0,
          ejercicio.duracion_objetivo_min ?? 0
        ) * 60;

      repeticionesObjetivo +=
        metaReps * metaSeries;

      duracionObjetivoSeg +=
        metaSegundos * metaSeries;

      const registros =
        new Map<number, Serie>();

      for (
        const serie of
        seriesPorEjercicio.get(
          ejercicio.id
        ) ?? []
      ) {
        if (
          Number.isInteger(
            serie.numero_serie
          ) &&
          serie.numero_serie >= 1 &&
          serie.numero_serie <= metaSeries
        ) {
          registros.set(
            serie.numero_serie,
            serie
          );
        }
      }

      seriesRegistradas += registros.size;

      if (registros.size > 0) {
        ejerciciosConRegistro += 1;
      }

      let completadasEnEjercicio = 0;

      for (const registro of registros.values()) {
        if (registro.completada) {
          seriesCompletadas += 1;
          completadasEnEjercicio += 1;
        }

        repeticionesRegistradas += Math.min(
          metaReps,
          Math.max(
            0,
            registro.repeticiones_realizadas ?? 0
          )
        );

        duracionRegistradaSeg += Math.min(
          metaSegundos,
          Math.max(
            0,
            registro.duracion_real_seg ?? 0
          )
        );
      }

      if (
        completadasEnEjercicio === metaSeries
      ) {
        ejerciciosCompletados += 1;
      }
    }

    // ========================================
    // 14. CALCULAR PORCENTAJES
    // ========================================

    const esEntrenamiento =
      sesion.estado === "en_curso" ||
      sesion.estado === "realizada";

    const coberturaPct = esEntrenamiento
      ? porcentaje(
          seriesRegistradas,
          seriesObjetivo
        )
      : null;

    const avancePct = esEntrenamiento
      ? porcentaje(
          seriesCompletadas,
          seriesObjetivo
        )
      : null;

    // El porcentaje final requiere:
    // - Sesión realizada
    // - Objetivos existentes
    // - Todas las series registradas

    const cumplimientoFinalPct =
      sesion.estado === "realizada" &&
      seriesObjetivo > 0 &&
      seriesRegistradas === seriesObjetivo
        ? porcentaje(
            seriesCompletadas,
            seriesObjetivo
          )
        : null;

    // ========================================
    // 15. ESTADO DE LA MEDICIÓN
    // ========================================

    let estadoMedicion: string;

    if (
      sesion.estado === "ausente" ||
      sesion.estado === "cancelada"
    ) {
      estadoMedicion = "no_aplica";
    } else if (
      sesion.estado === "programada"
    ) {
      estadoMedicion = "no_iniciada";
    } else if (
      listaEjercicios.length === 0 ||
      seriesObjetivo === 0
    ) {
      estadoMedicion = "sin_objetivos";
    } else if (
      sesion.estado === "en_curso"
    ) {
      estadoMedicion = "en_curso";
    } else if (
      sesion.estado === "realizada" &&
      seriesRegistradas === 0
    ) {
      estadoMedicion = "sin_evidencia";
    } else if (
      sesion.estado === "realizada" &&
      seriesRegistradas < seriesObjetivo
    ) {
      estadoMedicion = "incompleta";
    } else if (
      sesion.estado === "realizada"
    ) {
      estadoMedicion = "verificada";
    } else {
      estadoMedicion = "no_aplica";
    }

    // ========================================
    // 16. RESPUESTA DEL ENDPOINT
    // ========================================

    return NextResponse.json(
      {
        sesion: {
          id: sesion.id,
          estado: sesion.estado,
          fechaProgramada:
            sesion.fecha_programada,
        },

        resumen: {
          estadoMedicion,

          ejerciciosObjetivo:
            listaEjercicios.length,

          ejerciciosConRegistro,
          ejerciciosCompletados,

          seriesObjetivo,
          seriesRegistradas,
          seriesCompletadas,

          coberturaPct,
          avancePct,
          cumplimientoFinalPct,

          repeticionesObjetivo,
          repeticionesRegistradas,

          repeticionesPct:
            esEntrenamiento &&
            seriesRegistradas > 0
              ? porcentaje(
                  repeticionesRegistradas,
                  repeticionesObjetivo
                )
              : null,

          duracionObjetivoSeg,
          duracionRegistradaSeg,

          duracionPct:
            esEntrenamiento &&
            seriesRegistradas > 0
              ? porcentaje(
                  duracionRegistradaSeg,
                  duracionObjetivoSeg
                )
              : null,
        },
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
      "Error inesperado en indicadores de cumplimiento:",
      error
    );

    return responderError(
      "Ocurrió un error al calcular el cumplimiento.",
      500
    );
  }
}
