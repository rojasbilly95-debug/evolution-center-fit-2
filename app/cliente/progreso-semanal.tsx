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

function inicioDeSemana(fecha: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;

  const dia = new Date(`${fecha}T12:00:00.000Z`);

  if (Number.isNaN(dia.getTime())) return null;

  dia.setUTCDate(
    dia.getUTCDate() - ((dia.getUTCDay() + 6) % 7)
  );

  return dia.toISOString().slice(0, 10);
}

function fechaCorta(fecha: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(
    new Date(`${fecha}T12:00:00.000Z`)
  );
}

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
        aria-label={`${etiqueta}: sin medición`}
        className="
          h-2.5 rounded-full border border-dashed
          border-slate-300 bg-slate-100
          dark:border-white/15 dark:bg-white/5
        "
      />
    );
  }

  const porcentaje = Math.min(
    100,
    Math.max(0, valor)
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

export default function ProgresoSemanal({
  sesiones,
  ejercicios,
  series,
  errorSesiones = false,
  errorEjercicios = false,
  errorSeries = false,
}: Props) {
  if (errorSesiones) {
    return (
      <p
        role="alert"
        className="
          mt-6 rounded-xl border border-rose-400/30
          p-5 text-sm text-rose-700
          dark:text-rose-200
        "
      >
        No pudimos consultar la evolución semanal.
        Vuelve a intentarlo más tarde.
      </p>
    );
  }

  // ========================================
  // 1. AGRUPAR SESIONES POR SEMANA
  // ========================================

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

  // ========================================
  // 2. AGRUPAR SERIES POR EJERCICIO
  // ========================================

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

  // ========================================
  // 3. CALCULAR INDICADORES SEMANALES
  // ========================================

  const semanas = [
    ...sesionesPorSemana.entries(),
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([inicio, sesionesSemana]) => {
      const finFecha = new Date(
        `${inicio}T12:00:00.000Z`
      );

      finFecha.setUTCDate(
        finFecha.getUTCDate() + 6
      );

      const fin = finFecha
        .toISOString()
        .slice(0, 10);

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

      const porConfirmar =
        noCanceladas.length - evaluadas;

      // Las pendientes NO se consideran ausencias.

      const asistencia =
        evaluadas > 0
          ? Math.round(
              (realizadas.length / evaluadas) *
                100
            )
          : null;

      // ====================================
      // CUMPLIMIENTO DE SERIES
      // ====================================

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

      // No calcular porcentajes si faltan registros.

      const cumplimiento =
        !errorEjercicios &&
        !errorSeries &&
        objetivos > 0 &&
        registros === objetivos
          ? Math.round(
              (completadas / objetivos) *
                100
            )
          : null;

      // ====================================
      // CONTINUIDAD
      // ====================================

      const verificada =
        noCanceladas.length > 0 &&
        porConfirmar === 0;

      const continuidad =
        noCanceladas.length === 0
          ? "Sin sesiones evaluables"
          : !verificada
            ? "Pendiente de verificar"
            : realizadas.length > 0
              ? "Semana con entrenamiento"
              : "Sin asistencia confirmada";

      return {
        inicio,
        fin,
        asistencia,
        cumplimiento,
        evaluadas,
        porConfirmar,
        continuidad,
        realizadas: realizadas.length,
        objetivos,
        registros,
        verificada,
        sinSesionesEvaluables:
          noCanceladas.length === 0,
      };
    });

  // ========================================
  // 4. INTERFAZ DEL PANEL
  // ========================================

  return (
    <section
      aria-labelledby="titulo-evolucion-semanal"
      className="
        mt-6 rounded-2xl border
        border-cyan-300/40 bg-slate-50 p-5
        dark:border-cyan-400/20
        dark:bg-[#0b192b] sm:p-6
      "
    >
      {/* ENCABEZADO */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            Evolución del entrenamiento
          </p>

          <h3
            id="titulo-evolucion-semanal"
            className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white"
          >
            Tu progreso, semana a semana
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Consulta lo que ya se confirmó y qué
            registros siguen pendientes.
          </p>
        </div>

        <span
          className="
            rounded-full border border-cyan-300/40
            bg-cyan-400/10 px-3 py-1.5 text-xs
            font-semibold text-cyan-800
            dark:text-cyan-200
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

      {/* SIN SESIONES */}

      {semanas.length === 0 ? (
        <div
          className="
            mt-5 rounded-xl border border-dashed
            border-slate-300 p-6 text-sm
            text-slate-600 dark:border-white/15
            dark:text-slate-300
          "
        >
          Todavía no hay sesiones programadas.
          La evolución aparecerá al crear
          el calendario.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {semanas.map((semana) => (
            <article
              key={semana.inicio}
              className="
                rounded-xl border border-slate-200
                bg-white p-4
                dark:border-white/10
                dark:bg-[#13253c]
              "
            >
              {/* FECHAS Y ESTADO */}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  {fechaCorta(semana.inicio)}
                  {" – "}
                  {fechaCorta(semana.fin)}
                </h4>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    semana.verificada
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                  }`}
                >
                  {semana.sinSesionesEvaluables
                    ? "Sin actividad"
                    : semana.verificada
                      ? "Verificada"
                      : "Por verificar"}
                </span>
              </div>

              <div className="mt-5 space-y-5">
                {/* ASISTENCIA */}

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

                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {semana.realizadas} realizadas
                    {" · "}
                    {semana.evaluadas} verificadas
                  </p>
                </div>

                {/* CUMPLIMIENTO */}

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

                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {semana.objetivos > 0
                      ? `${semana.registros} de ${semana.objetivos} series registradas`
                      : "Sin objetivos verificables"}
                  </p>
                </div>

                {/* CONTINUIDAD */}

                <div
                  className="
                    rounded-lg border border-slate-200
                    bg-slate-50 px-3 py-3
                    dark:border-white/10
                    dark:bg-[#0a1729]
                  "
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Continuidad
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {semana.continuidad}
                  </p>

                  {semana.porConfirmar > 0 && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      {semana.porConfirmar}
                      {" "}
                      sesión(es) aún sin verificar
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ACLARACIÓN METODOLÓGICA */}

      <p
        className="
          mt-5 border-t border-slate-200
          pt-4 text-xs leading-5 text-slate-600
          dark:border-white/10 dark:text-slate-400
        "
      >
        Los porcentajes se basan en resultados confirmados.
        Una sesión pendiente no cuenta como ausencia.
        Las series solo muestran porcentaje cuando su
        registro está completo; este dato no equivale
        a haber alcanzado todas las metas de peso,
        repeticiones o duración.
      </p>
    </section>
  );
}