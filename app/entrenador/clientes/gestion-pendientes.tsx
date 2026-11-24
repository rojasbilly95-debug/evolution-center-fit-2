"use client";

import type { SesionResumen } from "./control-asistencia";

type Props = {
  sesiones: SesionResumen[];
  onVerPendientes: () => void;
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

  return [valor("year"), valor("month"), valor("day")].join("-");
}

function mostrarFecha(valor: string): string {
  const partes = valor.split("-");

  return partes.length === 3
    ? [partes[2], partes[1], partes[0]].join("/")
    : valor;
}

export default function GestionPendientes({
  sesiones,
  onVerPendientes,
}: Props) {
  if (sesiones.length === 0) return null;

  const hoy = fechaHoyLima();

  const vencidas = sesiones
    .filter(
      (sesion) =>
        sesion.estado === "programada" &&
        sesion.fechaProgramada < hoy
    )
    .sort((a, b) =>
      a.fechaProgramada.localeCompare(b.fechaProgramada) ||
      a.numeroSesion - b.numeroSesion
    );

  const programadasHoy = sesiones.filter(
    (sesion) =>
      sesion.estado === "programada" &&
      sesion.fechaProgramada === hoy
  ).length;

  return (
    <section
      aria-labelledby="titulo-gestion-pendientes"
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#13243a] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
            Gestión diaria
          </p>

          <h3
            id="titulo-gestion-pendientes"
            className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white"
          >
            Sesiones que requieren atención
          </h3>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Revisa primero los registros vencidos. Una sesión sin
            información no equivale a una ausencia.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
            {vencidas.length} vencidas pendientes
          </span>

          <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-900 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200">
            {programadasHoy} programadas para hoy
          </span>
        </div>
      </div>

      {vencidas.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-400/25 dark:bg-amber-400/[0.05]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Prioridad: comprobar qué ocurrió
            </p>

            <button
              type="button"
              onClick={onVerPendientes}
              className="min-h-11 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
            >
              Revisar sesiones vencidas
            </button>
          </div>

          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {vencidas.slice(0, 4).map((sesion) => (
              <li
                key={sesion.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white/80 px-3 py-2.5 text-sm dark:border-amber-400/15 dark:bg-slate-950/40"
              >
                <span className="font-semibold text-slate-900 dark:text-white">
                  Sesión #{sesion.numeroSesion}
                </span>

                <span className="text-slate-700 dark:text-slate-300">
                  {mostrarFecha(sesion.fechaProgramada)}
                </span>
              </li>
            ))}
          </ol>

          {vencidas.length > 4 && (
            <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
              Y {vencidas.length - 4} sesiones más por revisar.
            </p>
          )}

          <p className="mt-3 text-xs leading-5 text-slate-700 dark:text-slate-300">
            Registra una ausencia solo si se confirmó que el cliente
            no asistió. Si hubo entrenamiento sin registro oportuno,
            conserva el estado pendiente hasta su revisión autorizada.
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
          No hay sesiones vencidas pendientes de verificación.
        </p>
      )}
    </section>
  );
}
