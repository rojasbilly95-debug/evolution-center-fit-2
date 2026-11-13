
import type { ReactNode } from "react";

// EVOLUTION CENTER FIT 2.0
// FASE 110.15 - Progreso del cliente
// Presentacion solamente.
// No calcula ni modifica indicadores de Supabase.

type Props = {
  asistenciaPct: number | null;
  cumplimientoPct: number | null;
  semanasConAsistencia: number;
  realizadas: number;
  ausencias: number;
  seriesCompletadas: number;
  seriesObjetivo: number;
  sesionesEvaluadas: number;
};

type IndicadorProps = {
  titulo: string;
  descripcion: string;
  valor: string;
  detalle: string;
  icono: ReactNode;
  color: "cyan" | "violet" | "emerald";
  porcentaje?: number | null;
};

const estilos = {
  cyan: {
    icono: "bg-cyan-400/10 text-cyan-300",
    numero: "text-cyan-200",
    barra: "from-cyan-500 to-cyan-300",
    borde: "hover:border-cyan-400/30",
  },
  violet: {
    icono: "bg-violet-400/10 text-violet-300",
    numero: "text-violet-200",
    barra: "from-violet-500 to-violet-300",
    borde: "hover:border-violet-400/30",
  },
  emerald: {
    icono: "bg-emerald-400/10 text-emerald-300",
    numero: "text-emerald-200",
    barra: "from-emerald-500 to-emerald-300",
    borde: "hover:border-emerald-400/30",
  },
};

function IconoAsistencia() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="m8 15 3 3 5-5" />
    </svg>
  );
}

function IconoCumplimiento() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="m6.5 6.5 11 11M4 9l5-5M15 20l5-5M2 7l5-5M17 22l5-5" />
    </svg>
  );
}

function IconoContinuidad() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 3 2 5-7" />
    </svg>
  );
}

function TarjetaProgreso({
  titulo,
  descripcion,
  valor,
  detalle,
  icono,
  color,
  porcentaje,
}: IndicadorProps) {
  const estilo = estilos[color];

  const tienePorcentaje =
    typeof porcentaje === "number" &&
    Number.isFinite(porcentaje);

  const porcentajeVisual = tienePorcentaje
    ? Math.max(0, Math.min(100, porcentaje))
    : 0;

  return (
    <article
      className={`flex min-w-0 flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#192e47] to-[#0f1c30] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.20)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(0,0,0,0.28)] ${estilo.borde} sm:p-6`}
    >
      {/* ENCABEZADO */}
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${estilo.icono}`}
        >
          {icono}
        </span>

        <span
          className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
            valor === "Sin datos"
              ? "border-white/10 bg-white/5 text-slate-400"
              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          {valor === "Sin datos"
            ? "Pendiente"
            : "Con evidencia"}
        </span>
      </div>

      {/* INDICADOR */}
      <p className="mt-6 text-sm font-bold text-slate-200">
        {titulo}
      </p>

      <p
        className={`mt-2 break-words text-3xl font-black tracking-tight tabular-nums ${estilo.numero} sm:text-4xl`}
      >
        {valor}
      </p>

      <p className="mt-2 text-xs leading-6 text-slate-400">
        {descripcion}
      </p>

      {/* BARRA DE PROGRESO CON VALORES REALES */}
      {porcentaje !== undefined && (
        <div className="mt-5">
          {tienePorcentaje ? (
            <div
              role="progressbar"
              aria-label={titulo}
              aria-valuenow={porcentajeVisual}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2.5 overflow-hidden rounded-full bg-[#071321]"
            >
              <div
                className={`h-full rounded-full bg-gradient-to-r ${estilo.barra} transition-[width] duration-500 motion-reduce:transition-none`}
                style={{
                  width: `${porcentajeVisual}%`,
                }}
              />
            </div>
          ) : (
            <div
              aria-label="Porcentaje aún no disponible"
              className="h-2.5 rounded-full border border-dashed border-white/15 bg-[#071321]"
            />
          )}
        </div>
      )}

      {/* DETALLE */}
      <div className="mt-auto pt-5">
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs leading-6 text-slate-300">
            {detalle}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function ProgresoCliente({
  asistenciaPct,
  cumplimientoPct,
  semanasConAsistencia,
  realizadas,
  ausencias,
  seriesCompletadas,
  seriesObjetivo,
  sesionesEvaluadas,
}: Props) {
  // La continuidad no se expresa como porcentaje.
  // Si no existen sesiones evaluadas,
  // no se presenta un valor medido.
  const continuidadDisponible =
    sesionesEvaluadas > 0;

  return (
    <div className="mt-6 space-y-5">
      {/* TRES DIMENSIONES */}
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
        <TarjetaProgreso
          titulo="Asistencia"
          descripcion="Asistencias sobre sesiones con resultado confirmado."
          valor={
            asistenciaPct === null
              ? "Sin datos"
              : `${asistenciaPct}%`
          }
          detalle={
            asistenciaPct === null
              ? "Aún no hay asistencias o ausencias confirmadas para evaluar este indicador."
              : `${realizadas} sesiones realizadas y ${ausencias} ausencias confirmadas.`
          }
          icono={<IconoAsistencia />}
          color="cyan"
          porcentaje={asistenciaPct}
        />

        <TarjetaProgreso
          titulo="Cumplimiento de series"
          descripcion="Series completadas respecto a los objetivos de sesiones realizadas."
          valor={
            cumplimientoPct === null
              ? "Sin datos"
              : `${cumplimientoPct}%`
          }
          detalle={
            cumplimientoPct === null
              ? "Pendiente de sesiones realizadas con objetivos de series evaluables."
              : `${seriesCompletadas} de ${seriesObjetivo} series completadas.`
          }
          icono={<IconoCumplimiento />}
          color="violet"
          porcentaje={cumplimientoPct}
        />

        <TarjetaProgreso
          titulo="Continuidad"
          descripcion="Semanas activas con al menos una sesión realizada."
          valor={
            continuidadDisponible
              ? `${semanasConAsistencia} ${
                  semanasConAsistencia === 1
                    ? "semana"
                    : "semanas"
                }`
              : "Sin datos"
          }
          detalle={
            continuidadDisponible
              ? "Se cuentan las semanas con asistencia registrada; no se combinan con las otras dimensiones."
              : "La continuidad estará disponible cuando existan resultados de sesiones confirmados."
          }
          icono={<IconoContinuidad />}
          color="emerald"
        />
      </div>

      {/* RESUMEN DE EVIDENCIAS */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#15283f] to-[#101a2c] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.15)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">
              Evidencias del entrenamiento
            </h3>

            <p className="mt-1 text-xs leading-6 text-slate-400">
              Registros considerados para evaluar la
              asistencia.
            </p>
          </div>

          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
            {sesionesEvaluadas} evaluadas
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              nombre: "Sesiones realizadas",
              valor: realizadas,
              color: "text-emerald-300",
            },
            {
              nombre: "Ausencias confirmadas",
              valor: ausencias,
              color: "text-rose-300",
            },
            {
              nombre: "Total evaluadas",
              valor: sesionesEvaluadas,
              color: "text-cyan-300",
            },
          ].map((dato) => (
            <div
              key={dato.nombre}
              className="rounded-xl border border-white/[0.07] bg-[#081525]/80 p-4"
            >
              <p className="text-xs leading-5 text-slate-400">
                {dato.nombre}
              </p>

              <p
                className={`mt-2 text-2xl font-extrabold tabular-nums ${dato.color}`}
              >
                {dato.valor}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-slate-400">
          Las sesiones futuras o pendientes de confirmación
          no se consideran automáticamente ausencias.
          Cada indicador utiliza únicamente los registros
          correspondientes a su dimensión.
        </p>
      </section>
    </div>
  );
}
