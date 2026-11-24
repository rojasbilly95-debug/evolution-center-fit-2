"use client";

import type { SesionResumen } from "./control-asistencia";

type Props = {
  sesiones: SesionResumen[];
  onVerHoy: () => void;
  onVerPendientes: () => void;
  onVerProximas: () => void;
};

export function fechaHoyLima(): string {
  const partes = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return [
    valor("year"),
    valor("month"),
    valor("day")
  ].join("-");
}

export default function GestionPendientes({
  sesiones,
  onVerHoy,
  onVerPendientes,
  onVerProximas,
}: Props) {
  if (sesiones.length === 0) {
    return null;
  }

  const hoy = fechaHoyLima();

  const programada = (
    sesion: SesionResumen
  ) => sesion.estado === "programada";

  const vencidas = sesiones.filter(
    (sesion) =>
      programada(sesion) &&
      sesion.fechaProgramada < hoy
  ).length;

  const sesionesDeHoy = sesiones.filter(
    (sesion) =>
      sesion.fechaProgramada === hoy &&
      sesion.estado !== "cancelada"
  ).length;

  const proximas = sesiones.filter(
    (sesion) =>
      programada(sesion) &&
      sesion.fechaProgramada > hoy
  ).length;

  const botonBase =
    "group flex min-h-28 flex-col items-start justify-between rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 active:translate-y-0";

  return (
    <section
      aria-labelledby="titulo-gestion-diaria"
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#13243a] sm:p-5"
    >
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
          Centro de trabajo
        </p>

        <h3
          id="titulo-gestion-diaria"
          className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white"
        >
          ¿Qué necesita atención?
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Selecciona una categoría para ir directamente a sus sesiones.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onVerHoy}
          className={
            botonBase +
            " border-cyan-200 bg-cyan-50 text-cyan-950 hover:border-cyan-400 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-100"
          }
          aria-label="Consultar sesiones de hoy"
        >
          <span className="text-xs font-extrabold uppercase tracking-wider">
            Hoy
          </span>

          <span className="flex w-full items-end justify-between">
            <span className="text-3xl font-black tabular-nums">
              {sesionesDeHoy}
            </span>

            <span className="text-sm font-bold">
              Ver sesiones →
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onVerPendientes}
          className={
            botonBase +
            " border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-500 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
          }
          aria-label="Consultar sesiones vencidas pendientes de verificación"
        >
          <span className="text-xs font-extrabold uppercase tracking-wider">
            Vencidas pendientes
          </span>

          <span className="flex w-full items-end justify-between">
            <span className="text-3xl font-black tabular-nums">
              {vencidas}
            </span>

            <span className="text-sm font-bold">
              Revisar →
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onVerProximas}
          className={
            botonBase +
            " border-slate-200 bg-slate-50 text-slate-900 hover:border-cyan-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          }
          aria-label="Consultar próximas sesiones programadas"
        >
          <span className="text-xs font-extrabold uppercase tracking-wider">
            Próximas
          </span>

          <span className="flex w-full items-end justify-between">
            <span className="text-3xl font-black tabular-nums">
              {proximas}
            </span>

            <span className="text-sm font-bold">
              Consultar →
            </span>
          </span>
        </button>
      </div>

      {vencidas > 0 ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/[0.06] dark:text-amber-200">
          <strong>Acción prioritaria:</strong> confirma qué ocurrió en las sesiones vencidas.
          La ausencia solo puede registrarse cuando se haya verificado.
          La falta de datos no es una ausencia.
        </p>
      ) : (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
          No hay sesiones vencidas pendientes de revisión.
        </p>
      )}
    </section>
  );
}
