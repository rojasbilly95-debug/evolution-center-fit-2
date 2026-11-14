
import Link from "next/link";

// FASE 127.2 - Centro de entrenamiento del día.
// Solo lectura: utiliza los datos existentes del cliente.

type SesionDia = {
  id: number;
  numero_sesion: number;
  fecha_programada: string;
  hora_programada: string | null;
  estado: string;
};

type EjercicioDia = {
  sesion_id: number;
  ejercicio_id: number;
  orden: number;
  series_objetivo: number;
  repeticiones_objetivo: number | null;
  duracion_objetivo_min: number | null;
  descanso_objetivo_seg: number | null;
  nombre: string;
};

type Props = {
  hoy: string;
  nombreRutina: string;
  estadoPlan: string;
  sesiones: SesionDia[];
  ejercicios: EjercicioDia[];
  errorSesiones: boolean;
  errorEjercicios: boolean;
  asistenciaPct: number | null;
  cumplimientoPct: number | null;
  continuidadTexto: string;
};

function fechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);

  if (!anio || !mes || !dia) return fecha;

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia, 12)));
}

function horaBonita(hora: string | null): string {
  if (!hora) return "Horario por definir";

  const coincidencia = /^(\d{2}):(\d{2})/.exec(hora);

  return coincidencia
    ? `${coincidencia[1]}:${coincidencia[2]} h`
    : "Horario por definir";
}

function nombreEstado(estado: string): string {
  const nombres: Record<string, string> = {
    programada: "Programada",
    en_curso: "En curso",
    realizada: "Realizada",
    ausente: "Ausente",
    cancelada: "Cancelada",
    anulada: "Anulada",
  };

  return nombres[estado] ?? estado;
}

function ordenarSesiones(
  a: SesionDia,
  b: SesionDia
): number {
  const fecha = a.fecha_programada.localeCompare(
    b.fecha_programada
  );

  if (fecha !== 0) return fecha;

  const hora = (a.hora_programada ?? "99:99")
    .localeCompare(b.hora_programada ?? "99:99");

  return hora || a.numero_sesion - b.numero_sesion;
}

function objetivos(ejercicio: EjercicioDia): string {
  const partes = [
    `${ejercicio.series_objetivo} series`,
  ];

  if (ejercicio.repeticiones_objetivo !== null) {
    partes.push(
      `${ejercicio.repeticiones_objetivo} repeticiones`
    );
  }

  if (ejercicio.duracion_objetivo_min !== null) {
    partes.push(
      `${ejercicio.duracion_objetivo_min} min`
    );
  }

  if (ejercicio.descanso_objetivo_seg !== null) {
    partes.push(
      `${ejercicio.descanso_objetivo_seg} s descanso`
    );
  }

  return partes.join(" · ");
}

const estilosEstado: Record<string, string> = {
  programada:
    "border-cyan-300 bg-cyan-50 text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300",
  en_curso:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
  realizada:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  ausente:
    "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
  cancelada:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-300",
  anulada:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-300",
};

export default function CentroEntrenamientoDia({
  hoy,
  nombreRutina,
  estadoPlan,
  sesiones,
  ejercicios,
  errorSesiones,
  errorEjercicios,
  asistenciaPct,
  cumplimientoPct,
  continuidadTexto,
}: Props) {
  const planVigente =
    estadoPlan === "activa" ||
    estadoPlan === "programada";

  const sesionesHoy = sesiones
    .filter(
      (sesion) => sesion.fecha_programada === hoy
    )
    .sort(ordenarSesiones);

  const sesionPrincipal =
    sesionesHoy.find(
      (sesion) => sesion.estado === "en_curso"
    ) ??
    sesionesHoy.find(
      (sesion) => sesion.estado === "programada"
    ) ??
    sesionesHoy.find(
      (sesion) => sesion.estado === "realizada"
    ) ??
    sesionesHoy[0] ??
    null;

  const proximaSesion =
    sesiones
      .filter(
        (sesion) =>
          sesion.estado === "programada" &&
          sesion.fecha_programada > hoy
      )
      .sort(ordenarSesiones)[0] ?? null;

  const ejerciciosHoy = sesionPrincipal
    ? ejercicios
        .filter(
          (ejercicio) =>
            ejercicio.sesion_id === sesionPrincipal.id
        )
        .sort((a, b) => a.orden - b.orden)
    : [];

  const seriesObjetivo = ejerciciosHoy.reduce(
    (total, ejercicio) =>
      total + ejercicio.series_objetivo,
    0
  );

  const sesionesRealizadasHoy = sesionesHoy.filter(
    (sesion) => sesion.estado === "realizada"
  ).length;

  const titulo = errorSesiones
    ? "No pudimos consultar tus sesiones"
    : !planVigente
      ? "Tu plan no está activo"
      : sesionPrincipal?.estado === "en_curso"
        ? "Tu entrenamiento está en curso"
        : sesionPrincipal?.estado === "realizada"
          ? "¡Entrenamiento registrado!"
          : sesionPrincipal?.estado === "programada"
            ? "Tu sesión de hoy"
            : sesionesHoy.length > 0
              ? "Resumen de tu jornada"
              : "Hoy no tienes sesiones programadas";

  return (
    <section
      id="centro-hoy"
      aria-labelledby="centro-hoy-titulo"
      className="ecf-client-section scroll-mt-24 space-y-4"
    >
      {/* TITULO */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
            Mi entrenamiento · Hoy
          </p>

          <h2
            id="centro-hoy-titulo"
            className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl"
          >
            Centro de entrenamiento del día
          </h2>
        </div>

        <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold capitalize text-slate-600 dark:border-white/10 dark:bg-[#111c30] dark:text-slate-300">
          {fechaLarga(hoy)} · Lima
        </span>
      </div>

      {/* TARJETA PRINCIPAL */}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <article className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-indigo-50 p-6 dark:border-cyan-400/20 dark:from-[#152d40] dark:via-[#112039] dark:to-[#1b1e3b] sm:p-8">

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl"
          />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-bold uppercase text-cyan-800 dark:text-cyan-300">
                Agenda personal
              </span>

              {sesionPrincipal && !errorSesiones && (
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    estilosEstado[sesionPrincipal.estado] ??
                    estilosEstado.programada
                  }`}
                >
                  {nombreEstado(
                    sesionPrincipal.estado
                  )}
                </span>
              )}
            </div>

            <h3 className="mt-5 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              {titulo}
            </h3>

            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-700 dark:text-slate-300">
              {errorSesiones
                ? "No se muestran datos hasta recuperar la consulta."
                : !planVigente
                  ? "Consulta con tu entrenador para confirmar tu siguiente plan."
                  : sesionPrincipal
                    ? nombreRutina
                    : "Consulta tu próximo entrenamiento y los objetivos de tu plan."}
            </p>

            {/* INFORMACION DE LA SESION */}

            {!errorSesiones &&
              planVigente &&
              sesionPrincipal && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-[#071626]/60">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sesión
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                      #{sesionPrincipal.numero_sesion}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-[#071626]/60">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Hora programada
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                      {horaBonita(
                        sesionPrincipal.hora_programada
                      )}
                    </p>
                  </div>
                </div>
              )}

            {/* PROXIMA SESION */}

            {!errorSesiones &&
              planVigente &&
              !sesionPrincipal && (
                <div className="mt-5 rounded-2xl border border-cyan-200 bg-white/80 p-4 dark:border-cyan-400/20 dark:bg-[#071626]/60">

                  <p className="text-xs font-bold text-cyan-800 dark:text-cyan-300">
                    Próxima sesión programada
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {proximaSesion
                      ? `Sesión #${proximaSesion.numero_sesion} · ${fechaLarga(proximaSesion.fecha_programada)} · ${horaBonita(proximaSesion.hora_programada)}`
                      : "Sin una nueva sesión programada todavía"}
                  </p>
                </div>
              )}

            {/* ACCESOS */}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/cliente/mi-rutina"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Consultar mi rutina
              </Link>

              <Link
                href="#mi-calendario"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                Ver calendario
              </Link>
            </div>
          </div>
        </article>

        {/* INDICADORES */}

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111c30] sm:p-7">
          <p className="text-xs font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
            Tu jornada en cifras
          </p>

          <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">
            Objetivos y seguimiento
          </h3>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              {
                titulo: "Sesiones de hoy",
                valor: errorSesiones
                  ? "—"
                  : String(sesionesHoy.length),
              },
              {
                titulo: "Realizadas hoy",
                valor: errorSesiones
                  ? "—"
                  : String(sesionesRealizadasHoy),
              },
              {
                titulo: "Ejercicios previstos",
                valor:
                  errorSesiones ||
                  errorEjercicios ||
                  !sesionPrincipal
                    ? "—"
                    : String(ejerciciosHoy.length),
              },
              {
                titulo: "Series objetivo",
                valor:
                  errorSesiones ||
                  errorEjercicios ||
                  !sesionPrincipal
                    ? "—"
                    : String(seriesObjetivo),
              },
            ].map((dato) => (
              <div
                key={dato.titulo}
                className="rounded-2xl bg-slate-50 p-4 dark:bg-[#091527]"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dato.titulo}
                </p>

                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {dato.valor}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
            <p className="mb-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              Indicadores acumulados del plan
            </p>

            {[
              {
                etiqueta: "Asistencia",
                valor:
                  asistenciaPct === null
                    ? "Sin datos"
                    : `${asistenciaPct}%`,
              },
              {
                etiqueta: "Cumplimiento",
                valor:
                  cumplimientoPct === null
                    ? "Sin datos"
                    : `${cumplimientoPct}%`,
              },
              {
                etiqueta: "Continuidad",
                valor: continuidadTexto,
              },
            ].map((indicador) => (
              <div
                key={indicador.etiqueta}
                className="flex items-center justify-between gap-2 py-1.5 text-sm"
              >
                <span className="text-slate-600 dark:text-slate-300">
                  {indicador.etiqueta}
                </span>

                <span className="font-bold text-slate-900 dark:text-white">
                  {indicador.valor}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* EJERCICIOS DE HOY */}

      {!errorSesiones && sesionPrincipal && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111c30] sm:p-7">

          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Ejercicios de la sesión #
                {sesionPrincipal.numero_sesion}
              </h3>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Objetivos definidos por tu entrenador.
              </p>
            </div>

            <span className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-300">
              Solo lectura
            </span>
          </div>

          {errorEjercicios ? (
            <p
              role="status"
              className="mt-4 text-sm text-amber-800 dark:text-amber-300"
            >
              No se pudieron consultar los ejercicios.
            </p>
          ) : ejerciciosHoy.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-[#091527] dark:text-slate-300">
              Aún no aparecen ejercicios preparados
              para esta sesión.
            </p>
          ) : (
            <ol className="mt-5 grid gap-3 md:grid-cols-2">
              {ejerciciosHoy.map((ejercicio, indice) => (
                <li
                  key={`${ejercicio.sesion_id}-${ejercicio.ejercicio_id}-${ejercicio.orden}`}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#091527]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-sm font-black text-cyan-800 dark:text-cyan-300">
                    {indice + 1}
                  </span>

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {ejercicio.nombre}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      {objetivos(ejercicio)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <p className="px-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        Los datos provienen de los registros del
        sistema. El entrenador confirma asistencia,
        ejercicios y series. Las sesiones futuras no
        cuentan como ausencias.
      </p>
    </section>
  );
}
