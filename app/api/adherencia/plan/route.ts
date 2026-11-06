
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { connection } from "next/server";

// ============================================
// EVOLUTION CENTER FIT 2.0
// PASO 65.9 - ADHERENCIA CONSOLIDADA
// ============================================

type Sesion = {
  id: number;
  fecha_programada: string;
  estado: string;
};

type Ejercicio = {
  id: number;
  sesion_id: number;
  series_objetivo: number | null;
};

type Serie = {
  sesion_ejercicio_id: number;
  numero_serie: number;
  completada: boolean;
};

function errorJson(mensaje: string, status: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function porcentaje(
  parte: number,
  total: number
): number | null {
  return total > 0
    ? Math.round((parte / total) * 100)
    : null;
}

function fechaLima(): string {
  const partes = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find(
      (parte) => parte.type === tipo
    )?.value ?? "";

  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function fechaUTC(fecha: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return null;
  }

  const valor = new Date(
    `${fecha}T00:00:00.000Z`
  );

  return !Number.isNaN(valor.getTime()) &&
    valor.toISOString().slice(0, 10) === fecha
    ? valor
    : null;
}

function sumarDias(
  fecha: Date,
  dias: number
): string {
  const resultado = new Date(fecha);

  resultado.setUTCDate(
    resultado.getUTCDate() + dias
  );

  return resultado.toISOString().slice(0, 10);
}

// ============================================
// GET /api/adherencia/plan
// ============================================

export async function GET(request: Request) {
  await connection();

  try {
    // 1. VALIDAR IDENTIFICADOR

    const textoId =
      new URL(request.url).searchParams.get(
        "asignacionId"
      ) ?? "";

    const asignacionId = Number(textoId);

    if (
      !/^\d+$/.test(textoId) ||
      !Number.isSafeInteger(asignacionId) ||
      asignacionId <= 0
    ) {
      return errorJson(
        "El identificador del plan es inválido.",
        400
      );
    }

    // 2. AUTENTICAR

    const supabase =
      await createServerClient();

    const {
      data: datosUsuario,
      error: errorUsuario,
    } = await supabase.auth.getUser();

    const usuario = datosUsuario?.user;

    if (errorUsuario || !usuario) {
      return errorJson(
        "Tu sesión ha expirado. Inicia sesión nuevamente.",
        401
      );
    }

    // 3. CLIENTE PRIVADO

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clave =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clave) {
      return errorJson(
        "El servicio de adherencia no está configurado.",
        503
      );
    }

    const admin = createAdminClient(
      url,
      clave,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // 4. VERIFICAR ROL

    const {
      data: roles,
      error: errorRol,
    } = await admin
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", usuario.id)
      .eq("rol", "entrenador")
      .limit(1);

    if (errorRol) {
      return errorJson(
        "No se pudo verificar el rol.",
        500
      );
    }

    if (!roles?.length) {
      return errorJson(
        "Acceso exclusivo para entrenadores.",
        403
      );
    }

    // 5. CONSULTAR PLAN

    const {
      data: plan,
      error: errorPlan,
    } = await admin
      .from("asignaciones_rutinas")
      .select(
        "id,entrenador_id,cliente_id,estado,fecha_inicio,fecha_fin"
      )
      .eq("id", asignacionId)
      .maybeSingle();

    if (errorPlan) {
      return errorJson(
        "No se pudo consultar el plan.",
        500
      );
    }

    if (!plan) {
      return errorJson(
        "El plan no existe.",
        404
      );
    }

    if (plan.entrenador_id !== usuario.id) {
      return errorJson(
        "No tienes permiso para consultar este plan.",
        403
      );
    }

    // 6. VERIFICAR VINCULO ACTIVO

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
      return errorJson(
        "No se pudo verificar la asignación del cliente.",
        500
      );
    }

    if (!vinculos?.length) {
      return errorJson(
        "El cliente no está asignado a este entrenador.",
        403
      );
    }

    // 7. VALIDAR PERIODO

    const inicio = fechaUTC(
      plan.fecha_inicio
    );

    const fin = plan.fecha_fin
      ? fechaUTC(plan.fecha_fin)
      : null;

    if (!inicio || !fin || fin < inicio) {
      return errorJson(
        "El plan necesita fechas de inicio y fin válidas.",
        422
      );
    }

    const diasPlan =
      Math.floor(
        (fin.getTime() - inicio.getTime()) /
          86400000
      ) + 1;

    if (diasPlan > 366) {
      return errorJson(
        "El período del plan supera el máximo admitido.",
        422
      );
    }

    const hoy = fechaLima();

    // 8. CONSULTAR SESIONES

    const {
      data: datosSesiones,
      error: errorSesiones,
    } = await admin
      .from("sesiones_entrenamiento")
      .select(
        "id,fecha_programada,estado"
      )
      .eq("asignacion_id", asignacionId)
      .order(
        "fecha_programada",
        { ascending: true }
      )
      .limit(1000);

    if (errorSesiones) {
      return errorJson(
        "No se pudieron consultar las sesiones.",
        500
      );
    }

    if (
      (datosSesiones?.length ?? 0) === 1000
    ) {
      return errorJson(
        "El plan tiene demasiadas sesiones para este resumen.",
        422
      );
    }

    const sesiones: Sesion[] =
      datosSesiones ?? [];

    // ========================================
    // DIMENSION 1: ASISTENCIA
    // ========================================

    const realizadas = sesiones.filter(
      (s) => s.estado === "realizada"
    );

    const ausentes = sesiones.filter(
      (s) => s.estado === "ausente"
    ).length;

    const canceladas = sesiones.filter(
      (s) => s.estado === "cancelada"
    ).length;

    const enCurso = sesiones.filter(
      (s) => s.estado === "en_curso"
    ).length;

    const pendientesVencidas =
      sesiones.filter(
        (s) =>
          s.estado === "programada" &&
          s.fecha_programada < hoy
      ).length;

    const programadasFuturas =
      sesiones.filter(
        (s) =>
          s.estado === "programada" &&
          s.fecha_programada >= hoy
      ).length;

    const cerradasVerificadas =
      realizadas.length + ausentes;

    const asistenciaPct = porcentaje(
      realizadas.length,
      cerradasVerificadas
    );

    // ========================================
    // DIMENSION 2: CONTINUIDAD
    // ========================================

    const totalSemanas =
      Math.ceil(diasPlan / 7);

    const semanas = [];

    let semanasVerificadas = 0;
    let semanasConAsistencia = 0;
    let semanasPendientes = 0;
    let semanasSinProgramacion = 0;
    let semanasCanceladas = 0;

    for (
      let i = 0;
      i < totalSemanas;
      i += 1
    ) {
      const desde = sumarDias(
        inicio,
        i * 7
      );

      const hasta = sumarDias(
        inicio,
        Math.min(
          diasPlan - 1,
          i * 7 + 6
        )
      );

      const grupo = sesiones.filter(
        (s) =>
          s.fecha_programada >= desde &&
          s.fecha_programada <= hasta
      );

      const validas = grupo.filter(
        (s) => s.estado !== "cancelada"
      );

      const realizadasSemana =
        validas.filter(
          (s) => s.estado === "realizada"
        ).length;

      const ausentesSemana =
        validas.filter(
          (s) => s.estado === "ausente"
        ).length;

      let estadoSemana = "futura";

      // No se evalúa una semana hasta
      // que haya terminado por completo.

      if (hasta < hoy) {
        if (grupo.length === 0) {
          estadoSemana =
            "sin_programacion";

          semanasSinProgramacion += 1;
        } else if (
          validas.length === 0
        ) {
          estadoSemana = "cancelada";
          semanasCanceladas += 1;
        } else if (
          realizadasSemana +
            ausentesSemana !==
          validas.length
        ) {
          estadoSemana = "pendiente";
          semanasPendientes += 1;
        } else {
          estadoSemana = "verificada";
          semanasVerificadas += 1;

          if (realizadasSemana > 0) {
            semanasConAsistencia += 1;
          }
        }
      }

      semanas.push({
        numero: i + 1,
        inicio: desde,
        fin: hasta,
        estado: estadoSemana,
        programadas: grupo.length,
        realizadas: realizadasSemana,
        ausentes: ausentesSemana,
        canceladas:
          grupo.length - validas.length,
      });
    }

    // ========================================
    // DIMENSION 3: CUMPLIMIENTO
    // ========================================

    let sesionesVerificables = 0;
    let sesionesSinObjetivos = 0;
    let sesionesSinEvidencia = 0;
    let sesionesIncompletas = 0;

    let seriesObjetivoVerificadas = 0;
    let seriesCompletadasVerificadas = 0;

    if (realizadas.length > 0) {
      const idsSesiones =
        realizadas.map((s) => s.id);

      const {
        data: datosEjercicios,
        error: errorEjercicios,
      } = await admin
        .from("sesion_ejercicios")
        .select(
          "id,sesion_id,series_objetivo"
        )
        .in("sesion_id", idsSesiones)
        .limit(1000);

      if (errorEjercicios) {
        return errorJson(
          "No se pudieron consultar los ejercicios.",
          500
        );
      }

      if (
        (datosEjercicios?.length ?? 0) ===
        1000
      ) {
        return errorJson(
          "Demasiados ejercicios para calcular el resumen.",
          422
        );
      }

      const ejercicios: Ejercicio[] =
        datosEjercicios ?? [];

      const idsEjercicios =
        ejercicios.map((e) => e.id);

      let series: Serie[] = [];

      if (idsEjercicios.length > 0) {
        const {
          data: datosSeries,
          error: errorSeries,
        } = await admin
          .from("sesion_series")
          .select(
            "sesion_ejercicio_id,numero_serie,completada"
          )
          .in(
            "sesion_ejercicio_id",
            idsEjercicios
          )
          .limit(1000);

        if (errorSeries) {
          return errorJson(
            "No se pudieron consultar las series.",
            500
          );
        }

        if (
          (datosSeries?.length ?? 0) ===
          1000
        ) {
          return errorJson(
            "Demasiadas series para calcular el resumen.",
            422
          );
        }

        series = datosSeries ?? [];
      }

      const porEjercicio =
        new Map<number, Serie[]>();

      for (const serie of series) {
        const anteriores =
          porEjercicio.get(
            serie.sesion_ejercicio_id
          ) ?? [];

        anteriores.push(serie);

        porEjercicio.set(
          serie.sesion_ejercicio_id,
          anteriores
        );
      }

      // Revisar cada sesión realizada.

      for (const sesion of realizadas) {
        const ejerciciosSesion =
          ejercicios.filter(
            (e) =>
              e.sesion_id === sesion.id
          );

        let previstas = 0;
        let registradas = 0;
        let completadas = 0;

        for (
          const ejercicio of
          ejerciciosSesion
        ) {
          const meta =
            ejercicio.series_objetivo ?? 0;

          if (
            !Number.isInteger(meta) ||
            meta <= 0
          ) {
            continue;
          }

          previstas += meta;

          const validas =
            new Map<number, Serie>();

          for (
            const serie of
            porEjercicio.get(
              ejercicio.id
            ) ?? []
          ) {
            if (
              Number.isInteger(
                serie.numero_serie
              ) &&
              serie.numero_serie >= 1 &&
              serie.numero_serie <= meta
            ) {
              validas.set(
                serie.numero_serie,
                serie
              );
            }
          }

          registradas += validas.size;

          completadas += [
            ...validas.values(),
          ].filter(
            (s) => s.completada
          ).length;
        }

        if (previstas === 0) {
          sesionesSinObjetivos += 1;
        } else if (
          registradas === 0
        ) {
          sesionesSinEvidencia += 1;
        } else if (
          registradas < previstas
        ) {
          sesionesIncompletas += 1;
        } else {
          sesionesVerificables += 1;

          seriesObjetivoVerificadas +=
            previstas;

          seriesCompletadasVerificadas +=
            completadas;
        }
      }
    }

    // ========================================
    // CALCULAR INDICADORES
    // ========================================

    const cumplimientoPct = porcentaje(
      seriesCompletadasVerificadas,
      seriesObjetivoVerificadas
    );

    const coberturaCumplimientoPct =
      porcentaje(
        sesionesVerificables,
        realizadas.length
      );

    const continuidadPct = porcentaje(
      semanasConAsistencia,
      semanasVerificadas
    );

    const planFinalizado =
      fin.toISOString().slice(0, 10) < hoy;

    const asistenciaFinalPct =
      planFinalizado &&
      pendientesVencidas === 0 &&
      enCurso === 0
        ? asistenciaPct
        : null;

    const cumplimientoFinalPct =
      planFinalizado &&
      pendientesVencidas === 0 &&
      enCurso === 0 &&
      sesionesVerificables ===
        realizadas.length
        ? cumplimientoPct
        : null;

    const continuidadFinalPct =
      planFinalizado &&
      semanasPendientes === 0 &&
      semanasSinProgramacion === 0 &&
      semanasCanceladas === 0 &&
      semanasVerificadas === totalSemanas
        ? continuidadPct
        : null;

    // ========================================
    // RESPUESTA
    // ========================================

    return NextResponse.json(
      {
        plan: {
          id: plan.id,
          estado: plan.estado,
          fechaInicio: plan.fecha_inicio,
          fechaFin: plan.fecha_fin,
          finalizadoPorFecha:
            planFinalizado,
        },

        asistencia: {
          sesionesProgramadas:
            sesiones.length,

          realizadas:
            realizadas.length,

          ausentes,
          canceladas,
          enCurso,
          pendientesVencidas,
          programadasFuturas,

          sesionesCerradasVerificadas:
            cerradasVerificadas,

          porcentajeProvisional:
            asistenciaPct,

          porcentajeFinal:
            asistenciaFinalPct,
        },

        cumplimiento: {
          sesionesRealizadas:
            realizadas.length,

          sesionesVerificables,
          sesionesSinObjetivos,
          sesionesSinEvidencia,
          sesionesIncompletas,

          seriesObjetivoVerificadas,
          seriesCompletadasVerificadas,

          coberturaPct:
            coberturaCumplimientoPct,

          porcentajeProvisional:
            cumplimientoPct,

          porcentajeFinal:
            cumplimientoFinalPct,
        },

        continuidad: {
          totalSemanas,
          semanasVerificadas,
          semanasConAsistencia,
          semanasPendientes,
          semanasSinProgramacion,
          semanasCanceladas,

          porcentajeProvisional:
            continuidadPct,

          porcentajeFinal:
            continuidadFinalPct,

          semanas,
        },

        nota:
          "Los porcentajes provisionales utilizan solo datos verificables. " +
          "Los registros pendientes no se consideran automáticamente incumplimientos. " +
          "No se combinan las tres dimensiones en un índice global.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error en resumen de adherencia:",
      error
    );

    return errorJson(
      "Ocurrió un error al calcular la adherencia.",
      500
    );
  }
}
