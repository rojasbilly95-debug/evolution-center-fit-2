
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";

// ============================================
// EVOLUTION CENTER FIT 2.0
// FASE 110.14 - MI RUTINA RESPONSIVE
// Mantiene autenticacion, rol y consultas.
// ============================================

type IconName =
  | "dumbbell"
  | "layers"
  | "target"
  | "clock"
  | "menu"
  | "chevron"
  | "arrow"
  | "shield"
  | "check";

const iconos: Record<IconName, ReactNode> = {
  dumbbell: (
    <path d="m6.5 6.5 11 11M4 9l5-5M15 20l5-5M2 7l5-5M17 22l5-5" />
  ),
  layers: (
    <path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
};

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
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
      {iconos[name]}
    </svg>
  );
}

// NAVEGACION DEL CLIENTE
const enlaces = [
  { texto: "Inicio", href: "/cliente" },
  {
    texto: "Mi rutina",
    href: "/cliente/mi-rutina",
  },
  {
    texto: "Calendario",
    href: "/cliente#mi-calendario",
  },
  {
    texto: "Mi progreso",
    href: "/cliente#mi-progreso",
  },
  {
    texto: "Mi perfil",
    href: "/cliente/perfil",
  },
];

function Cabecera() {
  return (
    <header className="relative z-40 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white/95 dark:bg-[#0c1526]/95 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/cliente"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-[#07121e]">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-800 dark:text-cyan-300">
                2.0
              </span>
            </span>

            <span className="block text-[11px] text-slate-600 dark:text-slate-400">
              Mi espacio de entrenamiento
            </span>
          </span>
        </Link>

        {/* MENU PC */}
        <nav
          aria-label="Navegación del cliente"
          className="hidden items-center gap-1 lg:flex"
        >
          {enlaces.map((enlace) => {
            const activo =
              enlace.href ===
              "/cliente/mi-rutina";

            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={
                  activo ? "page" : undefined
                }
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${activo
                    ? "bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white"
                  }`}
              >
                {enlace.texto}
              </Link>
            );
          })}

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="ml-1 min-h-11 rounded-xl border border-rose-200 dark:border-rose-400/20 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-rose-300"
            >
              Cerrar sesión
            </button>
          </form>
        </nav>

        {/* MENU MOVIL */}
        <details className="relative shrink-0 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
            <Icon name="menu" />
            Menú
          </summary>

          <nav
            aria-label="Navegación móvil del cliente"
            className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#101d31] p-2 shadow-2xl shadow-black/50"
          >
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={
                  enlace.href ===
                    "/cliente/mi-rutina"
                    ? "page"
                    : undefined
                }
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${enlace.href ===
                    "/cliente/mi-rutina"
                    ? "bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                  }`}
              >
                {enlace.texto}
              </Link>
            ))}

            <form
              action={cerrarSesion}
              className="mt-2 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-2"
            >
              <button
                type="submit"
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-400/10"
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

// ESTADOS DE CARGA
function PanelCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] px-5 text-[var(--ecf-text,#102238)] dark:text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] px-6 py-5 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200 dark:border-cyan-300/20 border-t-cyan-300" />
        <p className="text-sm text-cyan-800 dark:text-cyan-200">
          Cargando tu rutina personalizada...
        </p>
      </div>
    </main>
  );
}

// MENSAJES Y ESTADOS VACIOS
function Mensaje({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <section className="rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#172a43] to-slate-50 dark:to-[#101a2d] p-7 text-center shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300">
        <Icon
          name="dumbbell"
          className="h-7 w-7"
        />
      </span>

      <h2 className="mt-5 text-xl font-bold text-[var(--ecf-text,#102238)] dark:text-white">
        {titulo}
      </h2>

      <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-400">
        {descripcion}
      </p>

      <Link
        href="/cliente"
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        Volver al portal
      </Link>
    </section>
  );
}

// TARJETAS NUMERICAS
function Indicador({
  icono,
  titulo,
  valor,
}: {
  icono: IconName;
  titulo: string;
  valor: number;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#172a43] to-slate-50 dark:to-[#101a2d] p-5 shadow-[0_12px_34px_rgba(0,0,0,0.18)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_18px_42px_rgba(0,0,0,0.26)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300">
        <Icon name={icono} />
      </span>

      <p className="mt-4 text-3xl font-extrabold tabular-nums text-[var(--ecf-text,#102238)] dark:text-white sm:text-4xl">
        {valor}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {titulo}
      </p>
    </article>
  );
}

// CUADRO DE OBJETIVO
function DatoObjetivo({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string | number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#091628] p-3 sm:p-4">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 break-words text-base font-extrabold text-[var(--ecf-text,#102238)] dark:text-white">
        {valor}
      </p>
    </div>
  );
}

// CONTENIDO CONECTADO A SUPABASE
async function ContenidoMiRutina() {
  await connection();

  const supabase = await createClient();

  // 1. AUTENTICACION ORIGINAL
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. COMPROBACION DEL ROL
  const { data: rol, error: rolError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", user.id)
      .maybeSingle();

  if (rolError || rol?.rol !== "cliente") {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] px-4 py-12 text-[var(--ecf-text,#102238)] dark:text-white">
        <div className="mx-auto max-w-xl">
          <Mensaje
            titulo="Acceso restringido"
            descripcion="Esta sección está disponible únicamente para clientes autorizados."
          />
        </div>
      </main>
    );
  }

  // 3. ASIGNACION VIGENTE ORIGINAL
  const {
    data: asignacion,
    error: asignacionError,
  } = await supabase
    .from("asignaciones_rutinas")
    .select("id, rutina_id, estado")
    .eq("cliente_id", user.id)
    .in("estado", ["programada", "activa"])
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. OBJETIVOS DE LA RUTINA
  let nombreRutina = "";

  let filasRutina: {
    ejercicio_id: number;
    orden: number;
    series: number | null;
    repeticiones: number | null;
    duracion_min: number | null;
    descanso_seg: number | null;
  }[] = [];

  let catalogoPorId = new Map<
    number,
    {
      id: number;
      nombre: string;
      descripcion: string | null;
      grupo_muscular: string | null;
      tipo: string | null;
    }
  >();

  let errorDatos = false;

  // CONSULTAS ORIGINALES CONSERVADAS
  if (asignacion && !asignacionError) {
    const {
      data: rutina,
      error: rutinaError,
    } = await supabase
      .from("rutinas")
      .select("id, nombre")
      .eq("id", asignacion.rutina_id)
      .maybeSingle();

    if (rutinaError || !rutina) {
      errorDatos = true;
    } else {
      nombreRutina = rutina.nombre;

      const {
        data: plantilla,
        error: plantillaError,
      } = await supabase
        .from("rutina_ejercicios")
        .select(
          "ejercicio_id, orden, series, repeticiones, duracion_min, descanso_seg"
        )
        .eq("rutina_id", asignacion.rutina_id)
        .order("orden", { ascending: true });

      if (plantillaError) {
        errorDatos = true;
      } else {
        filasRutina = plantilla ?? [];

        const ids = [
          ...new Set(
            filasRutina.map(
              (fila) => fila.ejercicio_id
            )
          ),
        ];

        if (ids.length > 0) {
          const {
            data: catalogo,
            error: catalogoError,
          } = await supabase
            .from("ejercicios")
            .select(
              "id, nombre, descripcion, grupo_muscular, tipo"
            )
            .in("id", ids);

          if (catalogoError) {
            errorDatos = true;
          } else {
            catalogoPorId = new Map(
              (catalogo ?? []).map(
                (ejercicio) => [
                  ejercicio.id,
                  ejercicio,
                ]
              )
            );
          }
        }
      }
    }
  }

  // RESUMEN REAL DE LA PLANTILLA
  const totalSeries = filasRutina.reduce(
    (total, fila) =>
      total + (fila.series ?? 0),
    0
  );

  // 5. INTERFAZ
  return (
    <main className="relative min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] text-[var(--ecf-text,#102238)] dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-cyan-500/[0.06] to-transparent"
      />

      <Cabecera />

      <div className="relative mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        {/* ENCABEZADO PRINCIPAL */}
        <section className="overflow-hidden rounded-[28px] border border-cyan-200 dark:border-cyan-400/15 bg-gradient-to-br from-[#eef9fd] dark:from-[#122b40] via-white dark:via-[#111d32] to-[#f6f3ff] dark:to-[#1a1735] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-300/20 bg-cyan-50 dark:bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-200">
                <Icon
                  name="dumbbell"
                  className="h-4 w-4"
                />
                Mi entrenamiento
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Mi rutina{" "}
                <span className="text-cyan-800 dark:text-cyan-300">
                  personalizada
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
                Descubre los ejercicios preparados
                para ti, consulta tus objetivos y
                revisa las indicaciones de cada
                movimiento.
              </p>
            </div>

            <Link
              href="/cliente"
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 px-5 py-3 text-sm font-semibold transition hover:bg-slate-200 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 lg:self-auto"
            >
              Volver a mi panel
              <Icon
                name="arrow"
                className="h-4 w-4"
              />
            </Link>
          </div>
        </section>

        {/* ESTADOS DE CONSULTA */}
        {asignacionError ? (
          <Mensaje
            titulo="No se pudo consultar tu plan"
            descripcion="Comprueba tu conexión e inténtalo nuevamente."
          />
        ) : !asignacion ? (
          <Mensaje
            titulo="Todavía no tienes una rutina vigente"
            descripcion="Cuando tu entrenador te asigne una rutina, podrás consultar aquí sus ejercicios."
          />
        ) : errorDatos ? (
          <Mensaje
            titulo="No se pudieron cargar los ejercicios"
            descripcion="No fue posible consultar todos los datos de tu rutina. Revisa los permisos de lectura y vuelve a intentarlo."
          />
        ) : (
          <>
            {/* PLAN ASIGNADO */}
            <section className="rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#15283f] to-slate-50 dark:to-[#101a2d] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
                    Plan asignado
                  </p>

                  <h2 className="mt-3 break-words text-xl font-extrabold sm:text-2xl">
                    {nombreRutina}
                  </h2>

                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Asignación #{asignacion.id}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${asignacion.estado === "activa"
                      ? "border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-200"
                      : "border-cyan-400/30 bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-200"
                    }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${asignacion.estado === "activa"
                        ? "bg-emerald-400"
                        : "bg-cyan-400"
                      }`}
                  />
                  {asignacion.estado === "activa"
                    ? "Activa"
                    : "Programada"}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Indicador
                  icono="dumbbell"
                  titulo="Ejercicios por rutina"
                  valor={filasRutina.length}
                />

                <Indicador
                  icono="layers"
                  titulo="Series objetivo por sesión"
                  valor={totalSeries}
                />
              </div>
            </section>

            {/* LISTA DE EJERCICIOS */}
            <section
              aria-labelledby="titulo-ejercicios"
              className="space-y-5"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
                  Preparación
                </p>

                <h2
                  id="titulo-ejercicios"
                  className="mt-2 text-2xl font-extrabold sm:text-3xl"
                >
                  Ejercicios de mi rutina
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Selecciona cada ejercicio para
                  consultar las series, repeticiones,
                  duración y descanso establecidos
                  por tu entrenador.
                </p>
              </div>

              {filasRutina.length === 0 ? (
                <Mensaje
                  titulo="No hay ejercicios disponibles"
                  descripcion="La rutina no tiene ejercicios visibles para tu cuenta. El entrenador debe verificar su configuración y los permisos."
                />
              ) : (
                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
                  {filasRutina.map((fila) => {
                    const ejercicio =
                      catalogoPorId.get(
                        fila.ejercicio_id
                      );

                    return (
                      <details
                        key={`${fila.orden}-${fila.ejercicio_id}`}
                        className="group min-w-0 overflow-hidden rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#162840] to-slate-50 dark:to-[#101a2d] shadow-[0_16px_42px_rgba(0,0,0,0.20)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-[0_22px_50px_rgba(0,0,0,0.28)] open:border-cyan-400/35"
                      >
                        {/* CABECERA DESPLEGABLE */}
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300 sm:p-6 [&::-webkit-details-marker]:hidden">
                          <div className="flex min-w-0 items-start gap-4">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-400/10 text-sm font-black text-cyan-800 dark:text-cyan-300">
                              {fila.orden}
                            </span>

                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
                                Ejercicio {fila.orden}
                              </p>

                              <h3 className="mt-2 break-words text-lg font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                                {ejercicio?.nombre ??
                                  `Ejercicio #${fila.ejercicio_id}`}
                              </h3>

                              {ejercicio?.grupo_muscular && (
                                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                                  {ejercicio.grupo_muscular}
                                  {ejercicio.tipo
                                    ? ` · ${ejercicio.tipo}`
                                    : ""}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap gap-2">
                                {fila.series != null && (
                                  <span className="rounded-full border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {fila.series} series
                                  </span>
                                )}

                                {fila.repeticiones != null && (
                                  <span className="rounded-full border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {fila.repeticiones} rep.
                                  </span>
                                )}

                                {fila.duracion_min != null && (
                                  <span className="rounded-full border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {fila.duracion_min} min
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-cyan-800 dark:text-cyan-200 transition-transform duration-200 group-open:rotate-180">
                            <Icon
                              name="chevron"
                              className="h-4 w-4"
                            />
                          </span>
                        </summary>

                        {/* INFORMACION DETALLADA */}
                        <div className="border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50/80 dark:bg-[#0b1628]/60 p-5 sm:p-6">
                          {ejercicio?.descripcion ? (
                            <div className="rounded-xl border border-cyan-200 dark:border-cyan-400/15 bg-cyan-50 dark:bg-cyan-400/[0.04] p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
                                Descripción del ejercicio
                              </p>

                              <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
                                {ejercicio.descripcion}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              No hay indicaciones
                              adicionales registradas
                              para este ejercicio.
                            </p>
                          )}

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <DatoObjetivo
                              titulo="Series objetivo"
                              valor={
                                fila.series ?? "—"
                              }
                            />

                            <DatoObjetivo
                              titulo={
                                fila.repeticiones != null
                                  ? "Repeticiones"
                                  : "Duración"
                              }
                              valor={
                                fila.repeticiones != null
                                  ? fila.repeticiones
                                  : fila.duracion_min != null
                                    ? `${fila.duracion_min} min`
                                    : "—"
                              }
                            />

                            <div className="col-span-2">
                              <DatoObjetivo
                                titulo="Descanso entre series"
                                valor={
                                  fila.descanso_seg != null
                                    ? `${fila.descanso_seg} segundos`
                                    : "No especificado"
                                }
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-3">
                            <Icon
                              name="shield"
                              className="mt-0.5 h-5 w-5 shrink-0 text-cyan-800 dark:text-cyan-300"
                            />

                            <p className="text-xs leading-6 text-slate-600 dark:text-slate-400">
                              Estos son los objetivos
                              preparados para tu sesión.
                              El registro del cumplimiento
                              corresponde al proceso
                              supervisado de entrenamiento.
                            </p>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>

            {/* MENSAJE METODOLOGICO */}
            <section className="rounded-2xl border border-cyan-200 dark:border-cyan-400/20 bg-gradient-to-r from-cyan-50 dark:from-cyan-400/[0.08] to-violet-50 dark:to-violet-400/[0.06] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.13)] sm:p-6">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-cyan-50 dark:bg-cyan-400/10 p-3 text-cyan-800 dark:text-cyan-300">
                  <Icon name="shield" />
                </span>

                <div>
                  <h2 className="font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                    Tu entrenamiento está supervisado
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
                    Esta página muestra los objetivos
                    de tu rutina. Los resultados reales
                    de cada entrenamiento se registran
                    durante las sesiones supervisadas
                    por tu entrenador.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="pt-2 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 ·
          Mi rutina personalizada
        </footer>
      </div>
    </main>
  );
}

export default function MiRutinaPage() {
  return (
    <Suspense fallback={<PanelCarga />}>
      <ContenidoMiRutina />
    </Suspense>
  );
}
