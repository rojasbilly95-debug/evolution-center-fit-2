
"use client";

import { useMemo, useState } from "react";

// EVOLUTION CENTER FIT 2.0 - FASE 115.4
// Calendario del cliente de solo lectura.
// Las fechas y horas proceden del plan consultado por el servidor.

type Sesion = {
  id: number;
  numero_sesion: number;
  fecha_programada: string;
  hora_programada: string | null;
  estado: string;
};

type Filtro =
  | "todas"
  | "proximas"
  | "programada"
  | "en_curso"
  | "realizada"
  | "ausente"
  | "cancelada";

type Vista = "calendario" | "lista";

const filtros: { valor: Filtro; texto: string }[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "proximas", texto: "Próximas" },
  { valor: "programada", texto: "Programadas" },
  { valor: "en_curso", texto: "En curso" },
  { valor: "realizada", texto: "Realizadas" },
  { valor: "ausente", texto: "Ausentes" },
  { valor: "cancelada", texto: "Canceladas" },
];

const diasSemana = [
  { corto: "L", completo: "Lunes" },
  { corto: "M", completo: "Martes" },
  { corto: "M", completo: "Miércoles" },
  { corto: "J", completo: "Jueves" },
  { corto: "V", completo: "Viernes" },
  { corto: "S", completo: "Sábado" },
  { corto: "D", completo: "Domingo" },
];

function fechaCorta(fecha: string) {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}

// PostgreSQL almacena 'hora_programada' como hora local,
// por eso no se aplica conversión UTC al mostrarla.
function horaBonita(hora: string | null) {
  if (!hora) return "Horario por definir";

  const partes = /^([01]\d|2[0-3]):([0-5]\d)/.exec(hora);
  if (!partes) return "Horario por definir";

  const horas = Number(partes[1]);
  const hora12 = horas % 12 || 12;
  const periodo = horas >= 12 ? "p. m." : "a. m.";
  return `${hora12}:${partes[2]} ${periodo}`;
}

function compararSesiones(a: Sesion, b: Sesion) {
  return (
    a.fecha_programada.localeCompare(b.fecha_programada) ||
    (a.hora_programada?.slice(0, 5) ?? "99:99").localeCompare(
      b.hora_programada?.slice(0, 5) ?? "99:99"
    ) ||
    a.numero_sesion - b.numero_sesion
  );
}

function nombreEstado(estado: string) {
  const nombres: Record<string, string> = {
    programada: "Programada",
    en_curso: "En curso",
    realizada: "Realizada",
    ausente: "Ausente",
    cancelada: "Cancelada",
    anulada: "Anulada",
  };
  return nombres[estado] ?? estado.replaceAll("_", " ");
}

function claseEstado(estado: string) {
  if (estado === "realizada")
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-800 dark:text-emerald-200";
  if (estado === "en_curso")
    return "border-amber-400/25 bg-amber-400/10 text-amber-800 dark:text-amber-200";
  if (["ausente", "cancelada", "anulada"].includes(estado))
    return "border-rose-400/25 bg-rose-400/10 text-rose-800 dark:text-rose-200";
  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-800 dark:text-cyan-200";
}

function clasePunto(estado: string) {
  if (estado === "realizada") return "bg-emerald-400";
  if (estado === "en_curso") return "bg-amber-400";
  if (["ausente", "cancelada", "anulada"].includes(estado))
    return "bg-rose-400";
  return "bg-cyan-400";
}

function coincide(sesion: Sesion, filtro: Filtro, hoy: string) {
  if (filtro === "todas") return true;
  if (filtro === "proximas") {
    return (
      sesion.estado === "en_curso" ||
      (sesion.estado === "programada" &&
        sesion.fecha_programada.slice(0, 10) >= hoy)
    );
  }
  if (filtro === "cancelada")
    return ["cancelada", "anulada"].includes(sesion.estado);
  return sesion.estado === filtro;
}

function EtiquetaHorario({ hora }: { hora: string | null }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-2.5">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
        {horaBonita(hora)}
      </span>
    </div>
  );
}

export default function CalendarioCliente({
  sesiones,
  hoy,
}: {
  sesiones: Sesion[];
  hoy: string;
}) {
  // Elegir el mes del próximo entrenamiento, si existe.
  const primerEvento =
    [...sesiones]
      .filter((sesion) => coincide(sesion, "proximas", hoy))
      .sort(compararSesiones)[0]?.fecha_programada ??
    [...sesiones].sort(compararSesiones)[0]?.fecha_programada ??
    hoy;

  const [anioInicial, mesInicial] = primerEvento
    .slice(0, 7)
    .split("-")
    .map(Number);

  const [mes, setMes] = useState({
    anio: anioInicial,
    indice: mesInicial - 1,
  });
  const [vista, setVista] = useState<Vista>("calendario");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    primerEvento.slice(0, 10)
  );

  const filtradas = useMemo(
    () =>
      sesiones
        .filter((sesion) => coincide(sesion, filtro, hoy))
        .sort(compararSesiones),
    [sesiones, filtro, hoy]
  );

  const mesClave = `${mes.anio}-${String(mes.indice + 1).padStart(2, "0")}`;
  const sesionesMes = filtradas.filter((sesion) =>
    sesion.fecha_programada.startsWith(mesClave)
  );

  const porDia = new Map<string, Sesion[]>();
  for (const sesion of sesionesMes) {
    const fecha = sesion.fecha_programada.slice(0, 10);
    const actuales = porDia.get(fecha) ?? [];
    actuales.push(sesion);
    porDia.set(fecha, actuales);
  }

  const elegidas = porDia.get(fechaSeleccionada) ?? [];

  // UTC se usa solo para construir los días del mes.
  // Nunca se convierte la fecha guardada de una sesión.
  const etiquetaMes = new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(mes.anio, mes.indice, 1)));

  const primerDia = new Date(Date.UTC(mes.anio, mes.indice, 1));
  const espaciosIniciales = (primerDia.getUTCDay() + 6) % 7;
  const diasMes = new Date(
    Date.UTC(mes.anio, mes.indice + 1, 0)
  ).getUTCDate();
  const celdas = Math.ceil((espaciosIniciales + diasMes) / 7) * 7;

  const programadas = sesiones.filter(
    (sesion) => sesion.estado === "programada"
  ).length;
  const realizadas = sesiones.filter(
    (sesion) => sesion.estado === "realizada"
  ).length;

  function cambiarMes(direccion: number) {
    const nuevo = new Date(Date.UTC(mes.anio, mes.indice + direccion, 1));
    setMes({ anio: nuevo.getUTCFullYear(), indice: nuevo.getUTCMonth() });
    setFechaSeleccionada("");
  }

  return (
    <div className="space-y-5 text-[var(--ecf-text,#102238)] dark:text-white">
      {/* RESUMEN DEL PLAN */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { titulo: "Sesiones del plan", valor: sesiones.length },
          { titulo: "Programadas", valor: programadas },
          { titulo: "Realizadas", valor: realizadas },
        ].map((dato) => (
          <div
            key={dato.titulo}
            className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#0b1729] p-4 shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
          >
            <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">{dato.titulo}</p>
            <p className="mt-2 text-2xl font-black tabular-nums text-cyan-800 dark:text-cyan-200">
              {dato.valor}
            </p>
          </div>
        ))}
      </div>

      {/* CONTROLES Y FILTROS */}
      <div className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#0b1729] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.14)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Explora tus entrenamientos
          </p>
          <div className="flex rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-[#091221] p-1">
            {(
              [
                { id: "calendario", nombre: "Calendario" },
                { id: "lista", nombre: "Lista" },
              ] as const
            ).map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                aria-pressed={vista === opcion.id}
                onClick={() => setVista(opcion.id)}
                className={`min-h-10 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 sm:text-sm ${
                  vista === opcion.id
                    ? "bg-cyan-400 text-[#07121e]"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10"
                }`}
              >
                {opcion.nombre}
              </button>
            ))}
          </div>
        </div>
        <div
          role="group"
          aria-label="Filtrar sesiones"
          className="mt-4 flex flex-wrap gap-2"
        >
          {filtros.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={filtro === opcion.valor}
              onClick={() => {
                setFiltro(opcion.valor);
                setFechaSeleccionada("");
              }}
              className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                filtro === opcion.valor
                  ? "border-cyan-400 bg-cyan-400/15 text-cyan-800 dark:text-cyan-200"
                  : "border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/25 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {opcion.texto}
            </button>
          ))}
        </div>
      </div>

      {vista === "calendario" ? (
        /* CALENDARIO MENSUAL */
        <div className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#0b1729] p-3 shadow-[0_16px_38px_rgba(0,0,0,0.17)] sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-xl text-slate-800 dark:text-slate-200 transition hover:bg-slate-200/80 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              ‹
            </button>
            <div className="text-center">
              <h3 className="text-base font-bold capitalize sm:text-lg">
                {etiquetaMes}
              </h3>
              <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                {sesionesMes.length} sesión(es) visibles este mes
              </p>
            </div>
            <button
              type="button"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-xl text-slate-800 dark:text-slate-200 transition hover:bg-slate-200/80 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {diasSemana.map((dia, indice) => (
              <div
                key={indice}
                title={dia.completo}
                className="py-2 text-center text-xs font-bold text-[var(--ecf-muted,#64748b)] dark:text-slate-400"
              >
                {dia.corto}
              </div>
            ))}

            {Array.from({ length: celdas }, (_, indice) => {
              const dia = indice - espaciosIniciales + 1;
              if (dia < 1 || dia > diasMes) {
                return <div key={`vacio-${indice}`} aria-hidden="true" />;
              }

              const fecha = `${mesClave}-${String(dia).padStart(2, "0")}`;
              const delDia = porDia.get(fecha) ?? [];
              const disponible = delDia.length > 0;
              const seleccionado = fechaSeleccionada === fecha && disponible;

              return (
                <button
                  key={fecha}
                  type="button"
                  disabled={!disponible}
                  onClick={() => setFechaSeleccionada(fecha)}
                  aria-pressed={disponible ? seleccionado : undefined}
                  aria-label={`${dia} de ${etiquetaMes}: ${delDia.length} sesión(es)`}
                  className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-sm transition-[border-color,background-color,transform] focus-visible:outline-2 focus-visible:outline-cyan-300 sm:min-h-20 ${
                    seleccionado
                      ? "border-cyan-300 bg-cyan-400/20 text-cyan-900 dark:text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                      : disponible
                        ? "border-cyan-400/25 bg-cyan-400/[0.07] text-[var(--ecf-text,#102238)] dark:text-white hover:border-cyan-300/60 hover:bg-cyan-400/15"
                        : fecha === hoy
                          ? "border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/[0.07] text-slate-800 dark:text-slate-200"
                          : "border-slate-200 dark:border-white/[0.04] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-500"
                  } ${!disponible ? "cursor-default" : ""}`}
                >
                  <span className="font-bold tabular-nums">{dia}</span>
                  {disponible && (
                    <span className="flex items-center justify-center gap-1">
                      {delDia.slice(0, 3).map((sesion) => (
                        <span
                          key={sesion.id}
                          className={`h-1.5 w-1.5 rounded-full ${clasePunto(
                            sesion.estado
                          )}`}
                        />
                      ))}
                    </span>
                  )}
                  {disponible && (
                    <span className="hidden text-[10px] text-cyan-800 dark:text-cyan-200 sm:block">
                      {delDia.length} ses.
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* LEYENDA */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-4 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
            {[
              { estado: "programada", texto: "Programada" },
              { estado: "realizada", texto: "Realizada" },
              { estado: "en_curso", texto: "En curso" },
              { estado: "cancelada", texto: "Ausente / cancelada" },
            ].map((item) => (
              <span key={item.estado} className="inline-flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${clasePunto(item.estado)}`}
                />
                {item.texto}
              </span>
            ))}
          </div>

          {/* DETALLE DEL DÍA */}
          <div
            aria-live="polite"
            className="mt-5 rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#101e33] p-4"
          >
            {elegidas.length > 0 ? (
              <>
                <h4 className="text-sm font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                  {fechaCorta(fechaSeleccionada)} · {elegidas.length} sesión(es)
                </h4>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {elegidas.map((sesion) => (
                    <div
                      key={sesion.id}
                      className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-[#0a1526] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold">
                          Sesión #{sesion.numero_sesion}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${claseEstado(
                            sesion.estado
                          )}`}
                        >
                          {nombreEstado(sesion.estado)}
                        </span>
                      </div>
                      <EtiquetaHorario hora={sesion.hora_programada} />
                      {sesion.estado === "programada" &&
                        sesion.fecha_programada.slice(0, 10) < hoy && (
                          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
                            Fecha pasada; pendiente de confirmación del entrenador.
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                Selecciona un día resaltado para consultar sus sesiones.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* VISTA LISTA */
        <div className="space-y-3">
          <p role="status" className="text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
            {filtradas.length} de {sesiones.length} sesiones visibles en el plan
          </p>
          {filtradas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#0b1729] p-8 text-center text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              No hay sesiones que coincidan con el filtro seleccionado.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtradas.map((sesion) => (
                <article
                  key={sesion.id}
                  className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#0b1729] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition-[border-color,transform] motion-safe:hover:-translate-y-0.5 hover:border-cyan-400/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                        Sesión #{sesion.numero_sesion}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                        {fechaCorta(sesion.fecha_programada)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${claseEstado(
                        sesion.estado
                      )}`}
                    >
                      {nombreEstado(sesion.estado)}
                    </span>
                  </div>
                  <EtiquetaHorario hora={sesion.hora_programada} />
                  {sesion.estado === "programada" &&
                    sesion.fecha_programada.slice(0, 10) < hoy && (
                      <p className="mt-3 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-3 text-xs text-amber-800 dark:text-amber-200">
                        Fecha pasada, pendiente de confirmación.
                      </p>
                    )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
