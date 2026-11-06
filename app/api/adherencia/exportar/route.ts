import { NextResponse, connection } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// ============================================
// EVOLUTION CENTER FIT 2.0
// PASO 65.10 - EXPORTACION DE ADHERENCIA
// ============================================

type Sesion = {
  id: number;
  numero_sesion: number;
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

type Medicion = {
  sesion: Sesion;
  semana: number;
  ejercicios: number;
  objetivo: number;
  registradas: number;
  completadas: number;
  cobertura: number | null;
  avance: number | null;
  cumplimiento: number | null;
  calidad: string;
};

function fallo(mensaje: string, status: number) {
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

function porcentaje(
  parte: number,
  total: number
): number | null {
  return total > 0
    ? Math.round((parte / total) * 10000) / 100
    : null;
}

function fechaValida(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const fecha = new Date(
    `${valor}T00:00:00.000Z`
  );

  return !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
    ? fecha
    : null;
}

function sumarDias(
  fecha: Date,
  cantidad: number
): string {
  const copia = new Date(fecha);

  copia.setUTCDate(
    copia.getUTCDate() + cantidad
  );

  return copia.toISOString().slice(0, 10);
}

function hoyEnLima(): string {
  const partes = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const obtener = (tipo: string) =>
    partes.find(
      (parte) => parte.type === tipo
    )?.value ?? "";

  return `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
}

function campoCSV(
  valor: string | number | null | undefined
): string {
  let texto =
    valor === null || valor === undefined
      ? ""
      : String(valor);

  // Impedir que texto almacenado se
  // interprete como formula de Excel.
  if (/^\s*[=+\-@]/.test(texto)) {
    texto = `'${texto}`;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

function respuestaCSV(
  nombre: string,
  encabezados: string[],
  filas: Array<
    Array<string | number | null | undefined>
  >
) {
  const contenido =
    "\uFEFF" +
    [
      encabezados.map(campoCSV).join(";"),
      ...filas.map((fila) =>
        fila.map(campoCSV).join(";")
      ),
    ].join("\r\n");

  return new Response(contenido, {
    status: 200,
    headers: {
      "Content-Type":
        "text/csv; charset=utf-8",
      "Content-Disposition":
        `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// ============================================
// GET /api/adherencia/exportar
// ============================================

export async function GET(request: Request) {
  await connection();

  try {
    // 1. VALIDAR SOLICITUD

    const parametros =
      new URL(request.url).searchParams;

    const textoId =
      parametros.get("asignacionId") ?? "";

    const asignacionId = Number(textoId);

    const tipo =
      parametros.get("tipo") ?? "sesiones";

    if (
      !/^\d+$/.test(textoId) ||
      !Number.isSafeInteger(asignacionId) ||
      asignacionId <= 0
    ) {
      return fallo(
        "El identificador del plan es inválido.",
        400
      );
    }

    if (
      tipo !== "sesiones" &&
      tipo !== "semanas"
    ) {
      return fallo(
        "El tipo de exportación no es válido.",
        400
      );
    }

    // 2. AUTENTICACION

    const supabase =
      await createServerClient();

    const {
      data: autenticacion,
      error: errorAuth,
    } = await supabase.auth.getUser();

    if (
      errorAuth ||
      !autenticacion.user
    ) {
      return fallo(
        "Debes iniciar sesión para exportar el reporte.",
        401
      );
    }

    const usuarioId =
      autenticacion.user.id;

    // 3. CLIENTE ADMINISTRATIVO
    // Solo se ejecuta en el servidor.

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clave =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clave) {
      return fallo(
        "El servicio de reportes no está configurado.",
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
      error: errorRoles,
    } = await admin
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", usuarioId)
      .eq("rol", "entrenador")
      .limit(1);

    if (errorRoles) {
      return fallo(
        "No se pudo comprobar tu rol.",
        500
      );
    }

    if (!roles?.length) {
      return fallo(
        "No tienes permiso para exportar este reporte.",
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
        "id,entrenador_id,cliente_id,fecha_inicio,fecha_fin"
      )
      .eq("id", asignacionId)
      .maybeSingle();

    if (errorPlan) {
      return fallo(
        "No se pudo consultar el plan.",
        500
      );
    }

    if (!plan) {
      return fallo(
        "El plan no existe.",
        404
      );
    }

    if (
      plan.entrenador_id !== usuarioId
    ) {
      return fallo(
        "No eres el entrenador responsable de este plan.",
        403
      );
    }

    // 6. VERIFICAR ASIGNACION ACTIVA

    const {
      data: vinculos,
      error: errorVinculos,
    } = await admin
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", usuarioId)
      .eq("cliente_id", plan.cliente_id)
      .eq("activa", true)
      .limit(1);

    if (errorVinculos) {
      return fallo(
        "No se pudo verificar la asignación del cliente.",
        500
      );
    }

    if (!vinculos?.length) {
      return fallo(
        "El cliente no está asignado a este entrenador.",
        403
      );
    }

    // 7. VALIDAR FECHAS DEL PLAN

    const inicioTexto: string =
      plan.fecha_inicio;

    const finTexto: string | null =
      plan.fecha_fin;

    const inicio =
      fechaValida(inicioTexto);

    const fin = finTexto
      ? fechaValida(finTexto)
      : null;

    if (
      !inicio ||
      !fin ||
      !finTexto ||
      fin < inicio
    ) {
      return fallo(
        "El plan no tiene un período válido para exportar.",
        422
      );
    }

    const diasPlan =
      Math.floor(
        (fin.getTime() - inicio.getTime()) /
          86400000
      ) + 1;

    if (diasPlan > 366) {
      return fallo(
        "El período supera el máximo admitido.",
        422
      );
    }

    // 8. CONSULTAR SESIONES

    const {
      data: datosSesiones,
      error: errorSesiones,
    } = await admin
      .from("sesiones_entrenamiento")
      .select(
        "id,numero_sesion,fecha_programada,estado"
      )
      .eq("asignacion_id", asignacionId)
      .order(
        "fecha_programada",
        { ascending: true }
      )
      .order(
        "id",
        { ascending: true }
      )
      .range(0, 999);

    if (errorSesiones) {
      return fallo(
        "No se pudieron consultar las sesiones.",
        500
      );
    }

    if (
      (datosSesiones?.length ?? 0) >= 1000
    ) {
      return fallo(
        "El plan supera el límite de exportación de 999 sesiones.",
        422
      );
    }

    const sesiones: Sesion[] =
      datosSesiones ?? [];

    if (
      sesiones.some(
        (sesion) =>
          sesion.fecha_programada <
            inicioTexto ||
          sesion.fecha_programada >
            finTexto
      )
    ) {
      return fallo(
        "Hay sesiones fuera de las fechas del plan. Revisa el calendario.",
        422
      );
    }

    // 9. CONSULTAR EJERCICIOS
    // Se procesan en bloques.

    const ejercicios: Ejercicio[] = [];

    const idsSesiones =
      sesiones.map((sesion) => sesion.id);

    for (
      let i = 0;
      i < idsSesiones.length;
      i += 80
    ) {
      const {
        data,
        error,
      } = await admin
        .from("sesion_ejercicios")
        .select(
          "id,sesion_id,series_objetivo"
        )
        .in(
          "sesion_id",
          idsSesiones.slice(i, i + 80)
        )
        .order(
          "id",
          { ascending: true }
        )
        .range(0, 999);

      if (error) {
        return fallo(
          "No se pudieron consultar los ejercicios.",
          500
        );
      }

      if ((data?.length ?? 0) >= 1000) {
        return fallo(
          "Demasiados ejercicios en un bloque para exportar.",
          422
        );
      }

      ejercicios.push(...(data ?? []));
    }

    // 10. CONSULTAR SERIES

    const series: Serie[] = [];

    const idsEjercicios =
      ejercicios.map(
        (ejercicio) => ejercicio.id
      );

    for (
      let i = 0;
      i < idsEjercicios.length;
      i += 80
    ) {
      const {
        data,
        error,
      } = await admin
        .from("sesion_series")
        .select(
          "sesion_ejercicio_id,numero_serie,completada"
        )
        .in(
          "sesion_ejercicio_id",
          idsEjercicios.slice(i, i + 80)
        )
        .order(
          "id",
          { ascending: true }
        )
        .range(0, 999);

      if (error) {
        return fallo(
          "No se pudieron consultar las series.",
          500
        );
      }

      if ((data?.length ?? 0) >= 1000) {
        return fallo(
          "Demasiadas series en un bloque para exportar.",
          422
        );
      }

      series.push(...(data ?? []));
    }

    // 11. ORGANIZAR LOS REGISTROS

    const ejerciciosPorSesion =
      new Map<number, Ejercicio[]>();

    for (const ejercicio of ejercicios) {
      const grupo =
        ejerciciosPorSesion.get(
          ejercicio.sesion_id
        ) ?? [];

      grupo.push(ejercicio);

      ejerciciosPorSesion.set(
        ejercicio.sesion_id,
        grupo
      );
    }

    const seriesPorEjercicio =
      new Map<number, Serie[]>();

    for (const serie of series) {
      const grupo =
        seriesPorEjercicio.get(
          serie.sesion_ejercicio_id
        ) ?? [];

      grupo.push(serie);

      seriesPorEjercicio.set(
        serie.sesion_ejercicio_id,
        grupo
      );
    }

    // 12. CALCULAR INDICADORES POR SESION

    const mediciones: Medicion[] =
      sesiones.map((sesion) => {
        const ejerciciosSesion =
          ejerciciosPorSesion.get(
            sesion.id
          ) ?? [];

        let objetivo = 0;
        let registradas = 0;
        let completadas = 0;
        let objetivosInvalidos = false;

        for (
          const ejercicio of
          ejerciciosSesion
        ) {
          const meta =
            ejercicio.series_objetivo;

          if (
            !Number.isInteger(meta) ||
            meta === null ||
            meta <= 0
          ) {
            objetivosInvalidos = true;
            continue;
          }

          objetivo += meta;

          const numeros =
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
              serie.numero_serie <= meta
            ) {
              numeros.set(
                serie.numero_serie,
                serie
              );
            }
          }

          registradas += numeros.size;

          completadas += [
            ...numeros.values(),
          ].filter(
            (serie) => serie.completada
          ).length;
        }

        const evaluable =
          sesion.estado === "en_curso" ||
          sesion.estado === "realizada";

        const completa =
          !objetivosInvalidos &&
          objetivo > 0 &&
          registradas === objetivo;

        let calidad = "no_aplica";

        if (sesion.estado === "programada") {
          calidad = "no_iniciada";
        }

        if (sesion.estado === "en_curso") {
          calidad = "provisional";
        }

        if (sesion.estado === "ausente") {
          calidad = "ausencia";
        }

        if (sesion.estado === "cancelada") {
          calidad = "cancelada";
        }

        if (sesion.estado === "realizada") {
          calidad = objetivosInvalidos
            ? "objetivos_invalidos"
            : objetivo === 0
              ? "sin_objetivos"
              : registradas === 0
                ? "sin_evidencia"
                : completa
                  ? "verificada"
                  : "incompleta";
        }

        const fecha =
          fechaValida(
            sesion.fecha_programada
          );

        const semana = fecha
          ? Math.floor(
              (fecha.getTime() -
                inicio.getTime()) /
                (7 * 86400000)
            ) + 1
          : 0;

        return {
          sesion,
          semana,
          ejercicios:
            ejerciciosSesion.length,
          objetivo,
          registradas,
          completadas,

          cobertura:
            evaluable && objetivo > 0
              ? porcentaje(
                  registradas,
                  objetivo
                )
              : null,

          avance:
            evaluable && objetivo > 0
              ? porcentaje(
                  completadas,
                  objetivo
                )
              : null,

          cumplimiento:
            sesion.estado ===
              "realizada" &&
            completa
              ? porcentaje(
                  completadas,
                  objetivo
                )
              : null,

          calidad,
        };
      });

    // ========================================
    // 13. EXPORTAR SESIONES
    // ========================================

    if (tipo === "sesiones") {
      const encabezados = [
        "asignacion_id",
        "sesion_id",
        "numero_sesion",
        "fecha_programada",
        "semana_plan",
        "estado_sesion",
        "asistencia_codificada",
        "ejercicios_preparados",
        "series_objetivo",
        "series_registradas",
        "series_completadas",
        "cobertura_registros_pct",
        "avance_series_pct",
        "cumplimiento_verificado_pct",
        "calidad_registro",
        "grupo_estudio",
        "fase_medicion",
      ];

      const filas = mediciones.map(
        (m) => [
          asignacionId,
          m.sesion.id,
          m.sesion.numero_sesion,
          m.sesion.fecha_programada,
          m.semana,
          m.sesion.estado,

          m.sesion.estado === "realizada"
            ? 1
            : m.sesion.estado === "ausente"
              ? 0
              : "",

          m.ejercicios || "",
          m.objetivo || "",

          m.sesion.estado === "en_curso" ||
          m.sesion.estado === "realizada"
            ? m.registradas
            : "",

          m.sesion.estado === "en_curso" ||
          m.sesion.estado === "realizada"
            ? m.completadas
            : "",

          m.cobertura,
          m.avance,
          m.cumplimiento,
          m.calidad,
          "",
          "",
        ]
      );

      return respuestaCSV(
        `adherencia-sesiones-plan-${asignacionId}.csv`,
        encabezados,
        filas
      );
    }

    // ========================================
    // 14. EXPORTAR SEMANAS
    // ========================================

    const encabezados = [
      "asignacion_id",
      "semana_plan",
      "inicio_semana",
      "fin_semana",
      "estado_semana",
      "sesiones_programadas",
      "sesiones_realizadas",
      "sesiones_ausentes",
      "sesiones_canceladas",
      "asistencia_semana_pct",
      "continuidad_codificada",
      "series_objetivo_verificadas",
      "series_completadas_verificadas",
      "cumplimiento_semana_pct",
      "grupo_estudio",
      "fase_medicion",
    ];

    const hoy = hoyEnLima();

    const totalSemanas =
      Math.ceil(diasPlan / 7);

    const filas: Array<
      Array<
        string | number | null | undefined
      >
    > = [];

    for (
      let semana = 1;
      semana <= totalSemanas;
      semana += 1
    ) {
      const desde = sumarDias(
        inicio,
        (semana - 1) * 7
      );

      const hasta = sumarDias(
        inicio,
        Math.min(
          diasPlan - 1,
          semana * 7 - 1
        )
      );

      const grupo = mediciones.filter(
        (m) => m.semana === semana
      );

      const activas = grupo.filter(
        (m) =>
          m.sesion.estado !== "cancelada"
      );

      const realizadas = activas.filter(
        (m) =>
          m.sesion.estado === "realizada"
      );

      const ausentes = activas.filter(
        (m) =>
          m.sesion.estado === "ausente"
      );

      const canceladas =
        grupo.length - activas.length;

      let estadoSemana =
        "no_finalizada";

      if (hasta < hoy) {
        if (grupo.length === 0) {
          estadoSemana =
            "sin_programacion";
        } else if (
          activas.length === 0
        ) {
          estadoSemana = "cancelada";
        } else if (
          realizadas.length +
            ausentes.length !==
          activas.length
        ) {
          estadoSemana = "pendiente";
        } else {
          estadoSemana = "verificada";
        }
      }

      const verificable =
        estadoSemana === "verificada";

      const sesionesCompletas =
        realizadas.every(
          (m) =>
            m.calidad === "verificada"
        );

      const metas = realizadas.reduce(
        (suma, m) =>
          suma +
          (m.calidad === "verificada"
            ? m.objetivo
            : 0),
        0
      );

      const hechas = realizadas.reduce(
        (suma, m) =>
          suma +
          (m.calidad === "verificada"
            ? m.completadas
            : 0),
        0
      );

      const cumplimiento =
        verificable &&
        realizadas.length > 0 &&
        sesionesCompletas
          ? porcentaje(hechas, metas)
          : null;

      filas.push([
        asignacionId,
        semana,
        desde,
        hasta,
        estadoSemana,
        grupo.length,
        realizadas.length,
        ausentes.length,
        canceladas,

        verificable
          ? porcentaje(
              realizadas.length,
              realizadas.length +
                ausentes.length
            )
          : null,

        verificable
          ? realizadas.length > 0
            ? 1
            : 0
          : "",

        cumplimiento === null
          ? ""
          : metas,

        cumplimiento === null
          ? ""
          : hechas,

        cumplimiento,
        "",
        "",
      ]);
    }

    return respuestaCSV(
      `adherencia-semanas-plan-${asignacionId}.csv`,
      encabezados,
      filas
    );
  } catch (error) {
    console.error(
      "Error exportando adherencia:",
      error
    );

    return fallo(
      "Ocurrió un error al generar el reporte.",
      500
    );
  }
}
