
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";

// EVOLUTION CENTER FIT 2.0
// FASE 110.3 - Dashboard responsive del entrenador.
// Conserva autenticacion, permisos y consultas a Supabase.

type IconName =
  | "users"
  | "brain"
  | "clipboard"
  | "activity"
  | "calendar"
  | "check"
  | "arrow"
  | "shield"
  | "dumbbell"
  | "sparkles"
  | "file"
  | "menu";

const iconos: Record<IconName, ReactNode> = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  brain: (
    <>
      <path d="M12 18V5a3 3 0 0 0-5.7-1.3A4 4 0 0 0 4 10a4 4 0 0 0 1 7.8A3.5 3.5 0 0 0 12 18Z" />
      <path d="M12 18V5a3 3 0 0 1 5.7-1.3A4 4 0 0 1 20 10a4 4 0 0 1-1 7.8A3.5 3.5 0 0 1 12 18Z" />
      <path d="M8 9c2 0 4 2 4 4M16 9c-2 0-4 2-4 4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  activity: (
    <>
      <path d="M3 3v18h18M7 16l4-5 3 2 5-7M17 6h2v2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  dumbbell: (
    <>
      <path d="m6.5 6.5 11 11M4 9l5-5M15 20l5-5M2 7l5-5M17 22l5-5" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h8" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
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
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {iconos[name]}
    </svg>
  );
}

// ENLACES REALES DE NAVEGACION
const navegacion = [
  { titulo: "Inicio", href: "/entrenador" },
  { titulo: "Mis clientes", href: "/entrenador/clientes" },
  { titulo: "Investigación", href: "/entrenador/investigacion" },
  {
    titulo: "Reportes",
    href: "/entrenador/investigacion/reporte",
  },
  { titulo: "Catálogo", href: "/catalogo" },
];

type Modulo = {
  titulo: string;
  descripcion: string;
  icono: IconName;
  etiqueta: string;
  accion: string;
  href: string;
  color: string;
};

// MODULOS DEL ENTRENADOR
const modulos: Modulo[] = [
  {
    titulo: "Mis clientes",
    descripcion:
      "Consulta los perfiles y los clientes que tienes asignados.",
    icono: "users",
    etiqueta: "GESTIÓN",
    accion: "Gestionar clientes",
    href: "/entrenador/clientes",
    color: "bg-cyan-400/10 text-cyan-300",
  },
  {
    titulo: "Recomendaciones inteligentes",
    descripcion:
      "Evalúa rutinas compatibles desde la gestión de clientes, cuando la fase del estudio lo permita.",
    icono: "brain",
    etiqueta: "MOTOR IA",
    accion: "Ir a recomendaciones",
    href: "/entrenador/clientes",
    color: "bg-violet-400/10 text-violet-300",
  },
  {
    titulo: "Revisión y aprobación",
    descripcion:
      "Revisa propuestas y aprueba o rechaza rutinas antes de asignarlas.",
    icono: "clipboard",
    etiqueta: "SUPERVISIÓN",
    accion: "Revisar propuestas",
    href: "/entrenador/clientes",
    color: "bg-emerald-400/10 text-emerald-300",
  },
  {
    titulo: "Seguimiento y adherencia",
    descripcion:
      "Consulta sesiones, asistencia, cumplimiento, continuidad e historial de tus clientes.",
    icono: "activity",
    etiqueta: "SEGUIMIENTO",
    accion: "Abrir seguimiento",
    href: "/entrenador/clientes",
    color: "bg-amber-400/10 text-amber-300",
  },
  {
    titulo: "Participantes GE y GC",
    descripcion:
      "Consulta los grupos del estudio y accede al procedimiento de asignación manual.",
    icono: "shield",
    etiqueta: "INVESTIGACIÓN",
    accion: "Abrir investigación",
    href: "/entrenador/investigacion",
    color: "bg-teal-400/10 text-teal-300",
  },
  {
    titulo: "Reportes para Jamovi",
    descripcion:
      "Consulta el reporte pretest/postest y descarga los datos disponibles en CSV.",
    icono: "file",
    etiqueta: "ANÁLISIS",
    accion: "Ver reportes",
    href: "/entrenador/investigacion/reporte",
    color: "bg-sky-400/10 text-sky-300",
  },
];

// PANTALLA DE CARGA
function CargandoPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080d1a] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400 text-2xl font-black text-[#08111d]">
          E
        </div>

        <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-[3px] border-slate-700 border-t-cyan-400" />

        <h1 className="text-xl font-bold">
          Evolution Center Fit 2.0
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Preparando tu panel...
        </p>
      </div>
    </main>
  );
}

// CABECERA RESPONSIVE
function CabeceraEntrenador() {
  return (
    <header className="relative z-40 border-b border-white/10 bg-[#0c1526]/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/entrenador"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-[#07121e]">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide text-white sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-300">2.0</span>
            </span>

            <span className="block truncate text-[11px] text-slate-400">
              Panel del entrenador
            </span>
          </span>
        </Link>

        {/* MENU DE COMPUTADORA */}
        <nav
          aria-label="Navegación del entrenador"
          className="hidden items-center gap-1 xl:flex"
        >
          {navegacion.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                item.href === "/entrenador"
                  ? "page"
                  : undefined
              }
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                item.href === "/entrenador"
                  ? "bg-cyan-400/10 text-cyan-300"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.titulo}
            </Link>
          ))}

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="ml-1 rounded-xl border border-red-400/20 px-3 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-red-400"
            >
              Cerrar sesión
            </button>
          </form>
        </nav>

        {/* MENU DE CELULAR Y TABLET */}
        <details className="relative shrink-0 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-cyan-400 [&::-webkit-details-marker]:hidden">
            <Icon name="menu" className="h-5 w-5" />
            <span>Menú</span>
          </summary>

          <nav
            aria-label="Navegación móvil del entrenador"
            className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-[#101d31] p-2 shadow-2xl"
          >
            {navegacion.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  item.href === "/entrenador"
                    ? "page"
                    : undefined
                }
                className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-cyan-400/10 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {item.titulo}
              </Link>
            ))}

            <form
              action={cerrarSesion}
              className="mt-2 border-t border-white/10 pt-2"
            >
              <button
                type="submit"
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-300 hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-red-400"
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

// TARJETA DE INDICADOR
function TarjetaIndicador({
  titulo,
  valor,
  descripcion,
  icono,
}: {
  titulo: string;
  valor: string;
  descripcion: string;
  icono: IconName;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-[#111d31] p-5 transition hover:border-cyan-400/25 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          <Icon name={icono} />
        </span>

        <span className="h-2 w-2 rounded-full bg-cyan-400/70" />
      </div>

      <p className="text-3xl font-extrabold tabular-nums tracking-tight text-white">
        {valor}
      </p>

      <h3 className="mt-2 text-sm font-semibold text-slate-100">
        {titulo}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-400">
        {descripcion}
      </p>
    </article>
  );
}

// TARJETA DE MODULO
function TarjetaModulo({
  modulo,
}: {
  modulo: Modulo;
}) {
  return (
    <Link
      href={modulo.href}
      className="group flex min-w-0 flex-col rounded-2xl border border-white/10 bg-[#111d31] p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-[#15253c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${modulo.color}`}
        >
          <Icon
            name={modulo.icono}
            className="h-6 w-6"
          />
        </span>

        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400">
          {modulo.etiqueta}
        </span>
      </div>

      <h3 className="mt-6 text-lg font-bold text-white">
        {modulo.titulo}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">
        {modulo.descripcion}
      </p>

      <span className="mt-6 inline-flex items-center gap-2 border-t border-white/10 pt-4 text-sm font-bold text-cyan-300 group-hover:text-cyan-200">
        {modulo.accion}

        <Icon
          name="arrow"
          className="h-4 w-4 transition group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

// CONTENIDO Y CONSULTAS DEL ENTRENADOR
async function ContenidoEntrenador() {
  // Mantener lectura por solicitud en Next.js 16.
  await connection();

  const supabase = await createClient();

  // 1. AUTENTICACION
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  // 2. VERIFICAR ROL
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .eq("rol", "entrenador")
      .maybeSingle();

  if (accesoError || !acceso) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#080d1a] px-5 text-center text-white">
        <span className="mb-5 rounded-2xl bg-red-400/10 p-4 text-red-300">
          <Icon
            name="shield"
            className="h-8 w-8"
          />
        </span>

        <h1 className="text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="mt-4 max-w-md leading-7 text-slate-400">
          Tu cuenta no tiene autorización para utilizar
          el panel del entrenador.
        </p>

        <Link
          href="/login"
          className="mt-7 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-[#07121e] hover:bg-cyan-300"
        >
          Volver al inicio de sesión
        </Link>
      </main>
    );
  }

  // 3. CONSULTAR INDICADORES REALES
  const [
    resultadoPerfil,
    resultadoClientes,
    resultadoPlanes,
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre_completo")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id", {
        count: "exact",
        head: true,
      })
      .eq("entrenador_id", userId)
      .eq("activa", true),

    supabase
      .from("asignaciones_rutinas")
      .select("id,estado")
      .eq("entrenador_id", userId),
  ]);

  const nombre =
    resultadoPerfil.data?.nombre_completo?.trim() ||
    "Entrenador";

  const totalClientes = resultadoClientes.error
    ? "—"
    : String(resultadoClientes.count ?? 0);

  const planes = resultadoPlanes.data ?? [];

  const totalPlanes = resultadoPlanes.error
    ? "—"
    : String(
        planes.filter(
          (plan) =>
            plan.estado === "programada" ||
            plan.estado === "activa"
        ).length
      );

  // 4. CONTAR SESIONES POR ESTADO
  let sesionesPendientes = "0";
  let sesionesRealizadas = "0";

  if (resultadoPlanes.error) {
    sesionesPendientes = "—";
    sesionesRealizadas = "—";
  } else {
    const idsPlanes = planes.map(
      (plan) => plan.id
    );

    if (idsPlanes.length > 0) {
      const [
        resultadoPendientes,
        resultadoRealizadas,
      ] = await Promise.all([
        supabase
          .from("sesiones_entrenamiento")
          .select("id", {
            count: "exact",
            head: true,
          })
          .in("asignacion_id", idsPlanes)
          .eq("estado", "programada"),

        supabase
          .from("sesiones_entrenamiento")
          .select("id", {
            count: "exact",
            head: true,
          })
          .in("asignacion_id", idsPlanes)
          .eq("estado", "realizada"),
      ]);

      sesionesPendientes = resultadoPendientes.error
        ? "—"
        : String(resultadoPendientes.count ?? 0);

      sesionesRealizadas = resultadoRealizadas.error
        ? "—"
        : String(resultadoRealizadas.count ?? 0);
    }
  }

  const indicadores: {
    titulo: string;
    valor: string;
    descripcion: string;
    icono: IconName;
  }[] = [
    {
      titulo: "Clientes asignados",
      valor: totalClientes,
      descripcion: "Relaciones activas con clientes",
      icono: "users",
    },
    {
      titulo: "Planes en seguimiento",
      valor: totalPlanes,
      descripcion: "Planes programados o activos",
      icono: "clipboard",
    },
    {
      titulo: "Sesiones pendientes",
      valor: sesionesPendientes,
      descripcion: "Sesiones todavía programadas",
      icono: "calendar",
    },
    {
      titulo: "Sesiones realizadas",
      valor: sesionesRealizadas,
      descripcion: "Entrenamientos finalizados",
      icono: "check",
    },
  ];

  // 5. INTERFAZ DEL ENTRENADOR
  return (
    <main className="relative min-h-screen bg-[#080d1a] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[450px] bg-gradient-to-b from-cyan-500/[0.06] to-transparent"
      />

      <CabeceraEntrenador />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-9 lg:px-8">
        {/* BIENVENIDA */}
        <section className="overflow-hidden rounded-[26px] border border-cyan-400/15 bg-gradient-to-br from-[#122b40] via-[#111d32] to-[#1a1735] p-5 shadow-xl shadow-black/10 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-200">
                <Icon
                  name="sparkles"
                  className="h-4 w-4"
                />

                Panel del entrenador
              </span>

              <h1 className="mt-5 break-words text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                ¡Bienvenido,
                <span className="mt-1 block text-cyan-300">
                  {nombre}!
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Gestiona clientes, revisa rutinas y
                supervisa sesiones e indicadores de
                adherencia desde un mismo espacio.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/entrenador/clientes"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#07121e] transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Gestionar clientes

                  <Icon
                    name="arrow"
                    className="h-4 w-4"
                  />
                </Link>

                <Link
                  href="/entrenador/investigacion"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  Ver investigación
                </Link>
              </div>
            </div>

            {/* MOTOR INTELIGENTE */}
            <aside className="rounded-2xl border border-white/10 bg-[#071423]/70 p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-violet-400/10 p-3 text-violet-300">
                  <Icon
                    name="brain"
                    className="h-6 w-6"
                  />
                </span>

                <div>
                  <p className="text-sm font-bold">
                    Motor inteligente
                  </p>

                  <p className="text-xs text-slate-400">
                    Recomendación supervisada
                  </p>
                </div>
              </div>

              <ol className="mt-5 space-y-3">
                {[
                  "Evaluar perfil y compatibilidad",
                  "Revisar propuestas",
                  "Aprobar antes de asignar",
                ].map((paso, i) => (
                  <li
                    key={paso}
                    className="flex items-start gap-3 text-xs leading-5 text-slate-300"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 font-bold text-cyan-300">
                      {i + 1}
                    </span>

                    <span>{paso}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                <Icon
                  name="shield"
                  className="mr-1 inline-block h-4 w-4 align-middle"
                />

                Rol de entrenador verificado
              </p>
            </aside>
          </div>
        </section>

        {/* INDICADORES */}
        <section
          className="mt-10"
          aria-labelledby="titulo-indicadores"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Resumen general
              </p>

              <h2
                id="titulo-indicadores"
                className="mt-2 text-2xl font-bold sm:text-3xl"
              >
                Indicadores de entrenamiento
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Información consultada desde Supabase.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400">
              Datos del sistema
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
            {indicadores.map((indicador) => (
              <TarjetaIndicador
                key={indicador.titulo}
                {...indicador}
              />
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            El símbolo «—» indica que un indicador
            no pudo consultarse. Las sesiones
            pendientes corresponden al estado
            «programada», no al total histórico.
          </p>
        </section>

        {/* HERRAMIENTAS */}
        <section
          className="mt-12"
          aria-labelledby="titulo-modulos"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Espacio de trabajo
          </p>

          <h2
            id="titulo-modulos"
            className="mt-2 text-2xl font-bold sm:text-3xl"
          >
            Herramientas del entrenador
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Accede a las operaciones existentes sin
            perder el contexto de tus clientes.
            Las recomendaciones, aprobaciones y el
            seguimiento están integrados en la
            gestión de clientes.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modulos.map((modulo) => (
              <TarjetaModulo
                key={modulo.titulo}
                modulo={modulo}
              />
            ))}
          </div>
        </section>

        {/* INFORMACION FINAL */}
        <section className="mt-10 flex flex-col gap-5 rounded-2xl border border-cyan-400/15 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 p-5 sm:flex-row sm:items-center sm:p-7">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <Icon
              name="dumbbell"
              className="h-7 w-7"
            />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">
              Entrenamiento con supervisión humana
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Las recomendaciones inteligentes
              apoyan al entrenador; no sustituyen
              su revisión ni las reglas de los
              grupos GE y GC.
            </p>
          </div>

          <Link
            href="/catalogo"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 hover:bg-cyan-400/20"
          >
            Ver catálogo

            <Icon
              name="arrow"
              className="h-4 w-4"
            />
          </Link>
        </section>
      </div>

      {/* PIE DE PAGINA */}
      <footer className="relative border-t border-white/10 px-4 py-7 text-center text-xs text-slate-500">
        Evolution Center Fit 2.0 ·
        Panel del entrenador
      </footer>
    </main>
  );
}

export default function EntrenadorPage() {
  return (
    <Suspense fallback={<CargandoPanel />}>
      <ContenidoEntrenador />
    </Suspense>
  );
}
