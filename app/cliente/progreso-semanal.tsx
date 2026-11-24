type Sesion = {
  id: number;
  fecha_programada: string;
  estado: string;
};

type Ejercicio = {
  id: number;
  sesion_id: number;
  series_objetivo: number;
};

type Serie = {
  sesion_ejercicio_id: number;
  completada: boolean;
};

type Props = {
  sesiones: Sesion[];
  ejercicios: Ejercicio[];
  series: Serie[];
  errorSesiones?: boolean;
  errorEjercicios?: boolean;
  errorSeries?: boolean;
};

// ============================================
// 1. FECHAS Y ZONA HORARIA
// ============================================

function fechaHoyLima(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const obtener = (tipo: string) =>
    partes.find(
      (parte) => parte.type === tipo
    )?.value ?? "";

  return `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
}

function inicioDeSemana(
  fecha: string
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return null;
  }

  const dia = new Date(
    `${fecha}T12:00:00.000Z`
  );

  if (Number.isNaN(dia.getTime())) {
    return null;
  }

  if (
    dia.toISOString().slice(0, 10) !== fecha
  ) {
    return null;
  }

  dia.setUTCDate(
    dia.getUTCDate() -
      ((dia.getUTCDay() + 6) % 7)
  );

  return dia.toISOString().slice(0, 10);
}

function fechaCorta(fecha: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(
    new Date(`${fecha}T12:00:00.000Z`)
  );
}

// ============================================
// 2. BARRA DE PROGRESO
// ============================================

function Barra({
  valor,
  etiqueta,
  color,
}: {
  valor: number | null;
  etiqueta: string;
  color: string;
}) {
  if (valor === null) {
    return (
      <div
        role="img"
        aria-label={`${etiqueta}: sin medición`}
        className="
          h-2.5 rounded-full
          border border-dashed border-slate-300
          bg-slate-100
          dark:border-white/15
          dark:bg-white/5
        "
      />
    );
  }

  const porcentaje = Math.max(
    0,
    Math.min(100, valor)
  );

  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      className="
        h-2.5 overflow-hidden rounded-full
        bg-slate-200 dark:bg-white/10
      "
    >
      <div
        className={`h-full rounded-full ${color}`}
        style={{
          width: `${porcentaje}%`,
        }}
      />
    </div>
  );
}

// ============================================
// 3. PANEL DE PROGRESO SEMANAL
// ============================================

export default function ProgresoSemanal({
  sesiones,
  ejercicios,
  series,
  errorSesiones = false,
  errorEjercicios = false,
  errorSeries = false,
}: Props) {
  // ==========================================
  // 3.1. CONTROL DE ERRORES
  // ==========================================

  if (errorSesiones) {
    return (
      <p
        role="alert"
        className="
          mt-6 rounded-xl
          border border-rose-400/30
          p-5 text-sm
          text-rose-700 dark:text-rose-200
        "
      >
        No pudimos consultar la evolución semanal.
        Intenta nuevamente más tarde.
      </p>
    );
  }

  const hoy = fechaHoyLima();

  // ==========================================
  // 3.2. AGRUPAR SESIONES POR SEMANA
  // ==========================================

  const sesionesPorSemana = new Map<
    string,
    Sesion[]
  >();

  for (const sesion of sesiones) {
    const inicio = inicioDeSemana(
      sesion.fecha_programada
    );

    if (!inicio) continue;

    const grupo =
      sesionesPorSemana.get(inicio) ?? [];

    grupo.push(sesion);

    sesionesPorSemana.set(inicio, grupo);
  }

  // ==========================================
  // 3.3. AGRUPAR SERIES POR EJERCICIO
  // ==========================================

  const seriesPorEjercicio = new Map<
    number,
    Serie[]
  >();

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

  // ==========================================
  // 4. CALCULAR INDICADORES SEMANALES
  // ==========================================

  const semanas = [
    ...sesionesPorSemana.entries(),
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([inicio, sesionesSemana]) => {
      // ======================================
      // 4.1. FECHAS DE LA SEMANA
      // ======================================

      const fechaFin = new Date(
        `${inicio}T12:00:00.000Z`
      );

      fechaFin.setUTCDate(
        fechaFin.getUTCDate() + 6
      );

      const fin = fechaFin
        .toISOString()
        .slice(0, 10);

      // ======================================
      // 4.2. SESIONES CON RESULTADO
      // ======================================

      const realizadas =
        sesionesSemana.filter(
          (sesion) =>
            sesion.estado === "realizada"
        );

      const ausentes =
        sesionesSemana.filter(
          (sesion) =>
            sesion.estado === "ausente"
        ).length;

      const noCanceladas =
        sesionesSemana.filter(
          (sesion) =>
            sesion.estado !== "cancelada"
        );

      const evaluadas =
        realizadas.length + ausentes;

      const sinResolver =
        noCanceladas.length - evaluadas;

      // ======================================
      // 4.3. SESIONES VENCIDAS
      // ======================================

      const vencidasPendientes =
        noCanceladas.filter(
          (sesion) =>
            sesion.fecha_programada < hoy &&
            !["realizada", "ausente"].includes(
              sesion.estado
            )
        ).length;

      // ======================================
      // 4.4. SESIONES DE HOY
      // ======================================

      const programadasHoy =
        noCanceladas.filter(
          (sesion) =>
            sesion.fecha_programada === hoy &&
            !["realizada", "ausente"].includes(
              sesion.estado
            )
        ).length;

      // ======================================
      // 4.5. SESIONES FUTURAS
      // ======================================

      const futuras =
        noCanceladas.filter(
          (sesion) =>
            sesion.fecha_programada > hoy &&
            !["realizada", "ausente"].includes(
              sesion.estado
            )
        ).length;

      const soloFuturas =
        noCanceladas.length > 0 &&
        noCanceladas.every(
          (sesion) =>
            sesion.fecha_programada > hoy &&
            !["realizada", "ausente"].includes(
              sesion.estado
            )
        );

      // ======================================
      // 4.6. ASISTENCIA CONFIRMADA
      // ======================================

      // No se consideran ausencias:
      // - Sesiones futuras.
      // - Sesiones pendientes.
      // - Sesiones sin resultado confirmado.

      const asistencia =
        evaluadas > 0
          ? Math.round(
              (realizadas.length / evaluadas) *
                100
            )
          : null;

      // ======================================
      // 4.7. CUMPLIMIENTO DE SERIES
      // ======================================

      const idsRealizadas = new Set(
        realizadas.map(
          (sesion) => sesion.id
        )
      );

      const ejerciciosRealizados =
        ejercicios.filter(
          (ejercicio) =>
            idsRealizadas.has(
              ejercicio.sesion_id
            )
        );

      const objetivos =
        ejerciciosRealizados.reduce(
          (total, ejercicio) =>
            total +
            Math.max(
              0,
              ejercicio.series_objetivo
            ),
          0
        );

      let registros = 0;
      let completadas = 0;

      for (const ejercicio of ejerciciosRealizados) {
        const valores =
          seriesPorEjercicio.get(
            ejercicio.id
          ) ?? [];

        registros += valores.length;

        completadas += valores.filter(
          (serie) => serie.completada
        ).length;
      }

      // Solo calcular cuando todas las
      // series objetivo tengan registro.

      const cumplimiento =
        !errorEjercicios &&
        !errorSeries &&
        objetivos > 0 &&
        registros === objetivos
          ? Math.round(
              (completadas / objetivos) * 100
            )
          : null;

      // ======================================
      // 4.8. CONTINUIDAD
      // ======================================

      const verificada =
        noCanceladas.length > 0 &&
        sinResolver === 0;

      const continuidad =
        noCanceladas.length === 0
          ? "Sin sesiones evaluables"
          : soloFuturas
            ? "Semana por iniciar"
            : vencidasPendientes > 0
              ? "Pendiente de revisión"
              : !verificada
                ? "Semana en desarrollo"
                : realizadas.length > 0
                  ? "Semana con entrenamiento"
                  : "Sin asistencia confirmada";

      // ======================================
      // 4.9. ESTADO VISUAL DE LA SEMANA
      // ======================================

      const estadoSemana =
        noCanceladas.length === 0
          ? "Sin actividad"
          : soloFuturas
            ? "Próxima"
            : vencidasPendientes > 0
              ? "Revisar"
              : verificada
                ? "Verificada"
                : "En desarrollo";

      return {
        inicio,
        fin,
        asistencia,
        cumplimiento,
        evaluadas,
        realizadas: realizadas.length,
        sinResolver,
        vencidasPendientes,
        programadasHoy,
        futuras,
        objetivos,
        registros,
        continuidad,
        estadoSemana,
        verificada,
        soloFuturas,
      };
    });

  // ============================================
  // 5. INTERFAZ DEL PANEL
  // ============================================

  return (
    <section
      aria-labelledby="titulo-evolucion-semanal"
      className="
        mt-6 rounded-2xl
        border border-cyan-300/40
        bg-slate-50 p-5
        dark:border-cyan-400/20
        dark:bg-[#0b192b]
        sm:p-6
      "
    >
      {/* ====================================
          ENCABEZADO
      ==================================== */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="
              text-xs font-bold uppercase
              tracking-widest
              text-cyan-700 dark:text-cyan-300
            "
          >
            Evolución del entrenamiento
          </p>

          <h3
            id="titulo-evolucion-semanal"
            className="
              mt-2 text-xl font-extrabold
              text-slate-900 dark:text-white
            "
          >
            Tu progreso, semana a semana
          </h3>

          <p
            className="
              mt-2 max-w-2xl text-sm leading-6
              text-slate-600 dark:text-slate-300
            "
          >
            Resultados confirmados, registros
            pendientes y próximas sesiones.
          </p>
        </div>

        <span
          className="
            rounded-full border
            border-cyan-300/40
            bg-cyan-400/10
            px-3 py-1.5
            text-xs font-semibold
            text-cyan-800 dark:text-cyan-200
          "
        >
          {semanas.length === 0
            ? "Sin calendario"
            : `Últimas ${semanas.length} ${
                semanas.length === 1
                  ? "semana"
                  : "semanas"
              }`}
        </span>
      </div>

      {/* ====================================
          SIN SESIONES
      ==================================== */}

      {semanas.length === 0 ? (
        <p
          className="
            mt-5 rounded-xl border
            border-dashed border-slate-300
            p-6 text-sm text-slate-600
            dark:border-white/15
            dark:text-slate-300
          "
        >
          Todavía no hay sesiones programadas.
          La evolución aparecerá cuando tu
          entrenador prepare el calendario.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {semanas.map((semana) => {
            // ==================================
            // COLOR DEL ESTADO
            // ==================================

            const colorEstado =
              semana.verificada
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200"
                : semana.vencidasPendientes > 0
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-800 dark:text-amber-200"
                  : semana.soloFuturas
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-800 dark:text-cyan-200"
                    : "border-slate-300 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-300";

            return (
              <article
                key={semana.inicio}
                className="
                  rounded-xl border border-slate-200
                  bg-white p-4
                  dark:border-white/10
                  dark:bg-[#13253c]
                  sm:p-5
                "
              >
                {/* ==========================
                    FECHAS Y ESTADO
                ========================== */}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4
                    className="
                      text-base font-bold
                      text-slate-900 dark:text-white
                    "
                  >
                    {fechaCorta(semana.inicio)}
                    {" – "}
                    {fechaCorta(semana.fin)}
                  </h4>

                  <span
                    className={`
                      rounded-full border
                      px-2.5 py-1
                      text-xs font-bold
                      ${colorEstado}
                    `}
                  >
                    {semana.estadoSemana}
                  </span>
                </div>

                <div className="mt-5 space-y-5">
                  {/* ========================
                      ASISTENCIA
                  ======================== */}

                  <div>
                    <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Asistencia
                      </span>

                      <strong className="text-slate-900 dark:text-white">
                        {semana.asistencia === null
                          ? "Sin medición"
                          : `${semana.asistencia}%`}
                      </strong>
                    </div>

                    <Barra
                      etiqueta={`Asistencia del ${fechaCorta(
                        semana.inicio
                      )}`}
                      valor={semana.asistencia}
                      color="bg-cyan-400"
                    />

                    <p
                      className="
                        mt-2 text-xs
                        text-slate-500 dark:text-slate-400
                      "
                    >
                      {semana.realizadas} realizadas
                      {" · "}
                      {semana.evaluadas} resultados confirmados
                    </p>

                    {semana.asistencia !== null &&
                      semana.sinResolver > 0 && (
                        <p
                          className="
                            mt-1 text-xs font-medium
                            text-amber-700
                            dark:text-amber-300
                          "
                        >
                          Resultado provisional: aún hay
                          sesiones sin resolver.
                        </p>
                      )}
                  </div>

                  {/* ========================
                      CUMPLIMIENTO
                  ======================== */}

                  <div>
                    <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Series completadas
                      </span>

                      <strong className="text-slate-900 dark:text-white">
                        {semana.cumplimiento === null
                          ? "Sin medición"
                          : `${semana.cumplimiento}%`}
                      </strong>
                    </div>

                    <Barra
                      etiqueta={`Series completadas del ${fechaCorta(
                        semana.inicio
                      )}`}
                      valor={semana.cumplimiento}
                      color="bg-violet-400"
                    />

                    <p
                      className="
                        mt-2 text-xs
                        text-slate-500 dark:text-slate-400
                      "
                    >
                      {errorEjercicios || errorSeries
                        ? "No se pudo consultar la evidencia de series."
                        : semana.objetivos > 0
                          ? `${semana.registros} de ${semana.objetivos} series registradas`
                          : "Sin objetivos verificables"}
                    </p>
                  </div>

                  {/* ========================
                      CONTINUIDAD
                  ======================== */}

                  <div
                    className="
                      rounded-lg border border-slate-200
                      bg-slate-50 px-4 py-3
                      dark:border-white/10
                      dark:bg-[#0a1729]
                    "
                  >
                    <p
                      className="
                        text-xs font-bold uppercase
                        tracking-wide text-slate-500
                        dark:text-slate-400
                      "
                    >
                      Continuidad semanal
                    </p>

                    <p
                      className="
                        mt-1 text-sm font-semibold
                        text-slate-800
                        dark:text-slate-100
                      "
                    >
                      {semana.continuidad}
                    </p>

                    {/* SESIONES VENCIDAS */}

                    {semana.vencidasPendientes > 0 && (
                      <p
                        className="
                          mt-2 text-xs font-semibold
                          text-amber-700
                          dark:text-amber-300
                        "
                      >
                        {semana.vencidasPendientes}
                        {" "}
                        sesión(es) vencidas por revisar
                      </p>
                    )}

                    {/* SESIONES DE HOY */}

                    {semana.programadasHoy > 0 && (
                      <p
                        className="
                          mt-2 text-xs
                          text-cyan-700 dark:text-cyan-300
                        "
                      >
                        {semana.programadasHoy}
                        {" "}
                        sesión(es) de hoy sin resultado final
                      </p>
                    )}

                    {/* SESIONES FUTURAS */}

                    {semana.futuras > 0 && (
                      <p
                        className="
                          mt-2 text-xs
                          text-slate-600 dark:text-slate-300
                        "
                      >
                        {semana.futuras}
                        {" "}
                        sesión(es) próximas, todavía no vencidas
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ====================================
          NOTA METODOLÓGICA
      ==================================== */}

      <p
        className="
          mt-5 border-t border-slate-200
          pt-4 text-xs leading-6
          text-slate-600
          dark:border-white/10
          dark:text-slate-400
        "
      >
        Una sesión futura no es una sesión vencida.
        Un registro pendiente no se convierte
        automáticamente en ausencia.
        La asistencia solo utiliza resultados confirmados.
        El porcentaje de series refleja registros
        completados, no necesariamente el logro
        de todas las metas de peso, repeticiones
        o duración.
      </p>
    </section>
  );
}