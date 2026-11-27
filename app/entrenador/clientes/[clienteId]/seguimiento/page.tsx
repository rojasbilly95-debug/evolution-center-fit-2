
export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";
import ProgramarSesiones from "../../programar-sesiones";
import CierrePlanEstudio from "../../cierre-plan-estudio";

// EVOLUTION CENTER FIT 2.0
// FASE 110.8 - Seguimiento responsive del entrenador.
// Conserva consultas, permisos y componentes funcionales.

type Props = {
  params: Promise<{ clienteId: string }>;
};

type Plan = {
  id: number;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

type IconName =
  | "users"
  | "calendar"
  | "clock"
  | "shield"
  | "arrow"
  | "menu"
  | "history"
  | "activity";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const shapes: Record<IconName, ReactNode> = {
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    arrow: (
      <path d="M5 12h14m-6-6 6 6-6 6" />
    ),
    menu: (
      <path d="M4 7h16M4 12h16M4 17h16" />
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    activity: (
      <>
        <path d="M3 3v18h18M7 16l4-5 3 2 5-7" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {shapes[name]}
    </svg>
  );
}

// NAVEGACION DEL ENTRENADOR
const enlaces = [
  { texto: "Inicio", href: "/entrenador" },
  { texto: "Mis clientes", href: "/entrenador/clientes" },
  {
    texto: "Investigación",
    href: "/entrenador/investigacion",
  },
  {
    texto: "Reportes",
    href: "/entrenador/investigacion/reporte",
  },
  { texto: "Catálogo", href: "/catalogo" },
];

function Cabecera() {
  return (
    <header className="relative z-40 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white/95 dark:bg-[#0c1526]/95 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/entrenador"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-[#07121e]">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-700 dark:text-cyan-300">
                2.0
              </span>
            </span>

            <span className="block text-[11px] text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Seguimiento de clientes
            </span>
          </span>
        </Link>

        {/* NAVEGACION PARA PC */}
        <nav
          aria-label="Navegación del entrenador"
          className="hidden items-center gap-1 xl:flex"
        >
          {enlaces.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                item.href === "/entrenador/clientes"
                  ? "page"
                  : undefined
              }
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                item.href === "/entrenador/clientes"
                  ? "bg-cyan-400/10 text-cyan-700 dark:text-cyan-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              {item.texto}
            </Link>
          ))}

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="ml-1 min-h-11 rounded-xl border border-red-400/20 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300 transition-colors hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-red-300"
            >
              Cerrar sesión
            </button>
          </form>
        </nav>

        {/* MENU PARA CELULAR Y TABLET */}
        <details className="relative shrink-0 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
            <Icon name="menu" />
            Menú
          </summary>

          <nav
            aria-label="Navegación móvil"
            className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#101d31] p-2 shadow-2xl shadow-black/50"
          >
            {enlaces.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  item.href === "/entrenador/clientes"
                    ? "page"
                    : undefined
                }
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                {item.texto}
              </Link>
            ))}

            <form
              action={cerrarSesion}
              className="mt-2 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-2"
            >
              <button
                type="submit"
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-400/10"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </details>
      </div>
    </header>
  );
}

// FORMATO DE FECHAS SIN CAMBIAR ZONA HORARIA
function mostrarFecha(fecha: string | null): string {
  if (!fecha) return "Sin fecha definida";

  const partes =
    /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);

  return partes
    ? `${partes[3]}/${partes[2]}/${partes[1]}`
    : fecha;
}

function nombreEstado(estado: string): string {
  const estados: Record<string, string> = {
    programada: "Programado",
    activa: "Activo",
    pausada: "Pausado",
    finalizada: "Finalizado",
    cancelada: "Cancelado",
  };

  return estados[estado] ?? estado;
}

// INDICADOR DEL PLAN
function PanelInfo({
  icono,
  titulo,
  valor,
}: {
  icono: IconName;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#172a43] to-slate-50 dark:to-[#101a2d] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition-[border-color,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:border-cyan-400/30 sm:p-5">
      <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
        <Icon
          name={icono}
          className="h-4 w-4"
        />

        <span className="text-xs font-semibold tracking-wide">
          {titulo}
        </span>
      </div>

      <p className="mt-3 break-words text-base font-bold text-[var(--ecf-text,#102238)] dark:text-white sm:text-lg">
        {valor}
      </p>
    </div>
  );
}

// MENSAJE DE ACCESO NO AUTORIZADO
function MensajeRestringido({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] px-5 py-10 text-[var(--ecf-text,#102238)] dark:text-white">
      <div className="w-full max-w-lg rounded-3xl border border-red-400/20 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-7 text-center shadow-[0_24px_65px_rgba(0,0,0,0.3)]">
        <Icon
          name="shield"
          className="mx-auto h-10 w-10 text-red-700 dark:text-red-300"
        />

        <h1 className="mt-4 text-2xl font-bold">
          {titulo}
        </h1>

        <p className="mt-3 text-sm leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
          {descripcion}
        </p>

        <Link
          href="/entrenador/clientes"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          Volver a mis clientes
        </Link>
      </div>
    </main>
  );
}

// PAGINA PRINCIPAL DE SEGUIMIENTO
export default async function SeguimientoClientePage({
  params,
}: Props) {
  await connection();

  const { clienteId } = await params;
  const supabase = await createClient();

  // 1. AUTENTICACION
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const entrenadorId = auth?.claims?.sub;

  if (authError || !entrenadorId) {
    redirect("/login");
  }

  // 2. VERIFICAR ROL
  const { data: acceso, error: errorAcceso } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .single();

  if (errorAcceso || acceso?.rol !== "entrenador") {
    return (
      <MensajeRestringido
        titulo="Acceso restringido"
        descripcion="Esta página es exclusiva para entrenadores autorizados."
      />
    );
  }

  // 3. VERIFICAR RELACION ACTIVA
  const { data: relacion, error: errorRelacion } =
    await supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", entrenadorId)
      .eq("cliente_id", clienteId)
      .eq("activa", true)
      .maybeSingle();

  if (errorRelacion || !relacion) {
    return (
      <MensajeRestringido
        titulo="Cliente no disponible"
        descripcion="No tienes una asignación activa con este cliente."
      />
    );
  }

  // 4. CONSULTAR CLIENTE Y PLANES
  const [
    { data: usuario },
    { data: planes, error: errorPlanes },
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre_completo")
      .eq("id", clienteId)
      .maybeSingle(),

    supabase
      .from("asignaciones_rutinas")
      .select("id,estado,fecha_inicio,fecha_fin")
      .eq("cliente_id", clienteId)
      .order("id", { ascending: false })
      .limit(30),
  ]);

  // 5. IDENTIFICAR PLAN VIGENTE
  const estadosVigentes = [
    "programada",
    "activa",
    "pausada",
  ];

  const planVigente: Plan | null =
    planes?.find((plan) =>
      estadosVigentes.includes(plan.estado)
    ) ?? null;

  const planesHistoricos: Plan[] =
    planes?.filter((plan) =>
      ["finalizada", "cancelada"].includes(
        plan.estado
      )
    ) ?? [];

  const nombreCliente =
    usuario?.nombre_completo?.trim() ||
    "Cliente asignado";

  // 6. INTERFAZ
  return (
    <main className="relative min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] text-[var(--ecf-text,#102238)] dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-cyan-500/[0.065] via-violet-500/[0.025] to-transparent"
      />

      <Cabecera />

      <div className="relative mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        {/* ENCABEZADO PRINCIPAL */}
        <section className="overflow-hidden rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-cyan-50 dark:from-[#122b40] via-white dark:via-[#111d32] to-indigo-50 dark:to-[#1a1735] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-200">
            <Icon
              name="activity"
              className="h-4 w-4"
            />
            Seguimiento del entrenador
          </p>

          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="min-w-0 max-w-3xl">
              <h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Seguimiento de{" "}
                <span className="text-cyan-700 dark:text-cyan-300">
                  entrenamiento
                </span>
              </h1>

              <p className="mt-3 break-words text-base text-slate-700 dark:text-slate-300">
                {nombreCliente}
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                Consulta el plan actual, programa o
                revisa sesiones, registra evidencias
                y accede al historial del cliente.
              </p>
            </div>

            <Link
              href="/entrenador/clientes"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 px-5 py-3 text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 lg:self-auto"
            >
              <Icon
                name="arrow"
                className="h-4 w-4 rotate-180"
              />
              Mis clientes
            </Link>
          </div>
        </section>

        {/* NAVEGACION ENTRE SECCIONES */}
        {!errorPlanes && (
          <nav
            aria-label="Secciones de seguimiento"
            className="flex flex-wrap gap-2 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white dark:bg-[#101b2f] p-2 shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
          >
            {planVigente && (
              <>
                <a
                  href="#plan-actual"
                  className="inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-semibold text-cyan-800 dark:text-cyan-200 transition-colors hover:bg-cyan-400/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  Plan y sesiones
                </a>

                <a
                  href="#cierre-supervisado"
                  className="inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  Cierre supervisado
                </a>
              </>
            )}

            <a
              href="#historial-planes"
              className="inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              Historial
            </a>
          </nav>
        )}

        {/* PLANES */}
        {errorPlanes ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/25 bg-red-400/10 p-6 text-sm leading-6 text-red-800 dark:text-red-200"
          >
            No se pudieron consultar las rutinas del
            cliente. Revisa los permisos de acceso.
          </div>
        ) : !planVigente ? (
          <section className="rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-7 text-center shadow-[0_18px_48px_rgba(0,0,0,0.15)] sm:p-10">
            <Icon
              name="calendar"
              className="mx-auto h-10 w-10 text-[var(--ecf-muted,#64748b)] dark:text-slate-400"
            />

            <h2 className="mt-4 text-xl font-bold">
              Sin plan vigente
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              {planesHistoricos.length > 0
                ? "El cliente no tiene un plan vigente. Sus planes anteriores permanecen registrados en el historial."
                : "Este cliente todavía no tiene una rutina asignada."}
            </p>

            <Link
              href="/entrenador/clientes"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#07121e] hover:bg-cyan-300"
            >
              Volver a clientes
            </Link>
          </section>
        ) : (
          <>
            {/* DATOS DEL PLAN */}
            <section
              aria-label="Resumen del plan vigente"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              <PanelInfo
                icono="activity"
                titulo="Plan actual"
                valor={`#${planVigente.id}`}
              />

              <PanelInfo
                icono="shield"
                titulo="Estado"
                valor={nombreEstado(
                  planVigente.estado
                )}
              />

              <PanelInfo
                icono="calendar"
                titulo="Fecha de inicio"
                valor={mostrarFecha(
                  planVigente.fecha_inicio
                )}
              />

              <PanelInfo
                icono="clock"
                titulo="Fin previsto"
                valor={mostrarFecha(
                  planVigente.fecha_fin
                )}
              />
            </section>

            {/* SESIONES, ASISTENCIA Y ADHERENCIA */}
            <section
              id="plan-actual"
              aria-labelledby="titulo-plan-actual"
              className="scroll-mt-6"
            >
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                  Seguimiento del plan
                </p>

                <h2
                  id="titulo-plan-actual"
                  className="mt-2 text-2xl font-extrabold sm:text-3xl"
                >
                  Gestión de sesiones
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  Programa, registra y consulta
                  las sesiones del plan según
                  los permisos y estados establecidos.
                </p>
              </div>

              <ProgramarSesiones
                key={planVigente.id}
                asignacionId={planVigente.id}
              />
            </section>

            {/* CIERRE SUPERVISADO */}
            <section
              id="cierre-supervisado"
              aria-label="Cierre supervisado del plan"
              className="scroll-mt-6"
            >
              <CierrePlanEstudio
                key={`cierre-${planVigente.id}`}
                asignacionId={planVigente.id}
              />
            </section>
          </>
        )}

        {/* HISTORIAL */}
        {!errorPlanes && (
          <section
            id="historial-planes"
            aria-labelledby="historial-titulo"
            className="scroll-mt-6 rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#14243a] to-slate-50 dark:to-[#101a2c] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                  Consulta histórica
                </p>

                <h2
                  id="historial-titulo"
                  className="mt-2 text-2xl font-extrabold sm:text-3xl"
                >
                  Historial de entrenamiento
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  Planes finalizados o cancelados,
                  separados del plan vigente.
                  Se consultan hasta las 30
                  asignaciones más recientes.
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Icon
                  name="history"
                  className="h-4 w-4"
                />
                {planesHistoricos.length} planes históricos
              </span>
            </div>

            {planesHistoricos.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0b1628] p-7 text-center sm:p-10">
                <Icon
                  name="history"
                  className="mx-auto h-9 w-9 text-slate-600 dark:text-slate-500"
                />

                <h3 className="mt-4 font-bold">
                  Sin planes históricos
                </h3>

                <p className="mt-2 text-sm leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  Todavía no hay planes finalizados
                  ni cancelados entre las últimas
                  asignaciones consultadas.
                </p>
              </div>
            ) : (
              <ul className="mt-6 grid gap-4 lg:grid-cols-2">
                {planesHistoricos.map((plan) => (
                  <li
                    key={plan.id}
                    className="min-w-0 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-[#0b1628] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.12)] transition-[transform,border-color] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/25 sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold">
                          Plan #{plan.id}
                        </p>

                        <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                          Asignación histórica
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                          plan.estado === "finalizada"
                            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-800 dark:text-emerald-200"
                            : "border-amber-400/25 bg-amber-400/10 text-amber-900 dark:text-amber-200"
                        }`}
                      >
                        {nombreEstado(plan.estado)}
                      </span>
                    </div>

                    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.04] p-3">
                        <dt className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                          Inicio
                        </dt>

                        <dd className="mt-1 font-semibold">
                          {mostrarFecha(
                            plan.fecha_inicio
                          )}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.04] p-3">
                        <dt className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                          Fin previsto
                        </dt>

                        <dd className="mt-1 font-semibold">
                          {mostrarFecha(
                            plan.fecha_fin
                          )}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-4 text-xs text-emerald-700 dark:text-emerald-300">
                      Registro histórico de solo consulta.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="pt-2 text-center text-xs text-slate-600 dark:text-slate-500">
          Evolution Center Fit 2.0 · Seguimiento del
          entrenador. Las mediciones faltantes no
          representan ausencias.
        </footer>
      </div>
    </main>
  );
}
