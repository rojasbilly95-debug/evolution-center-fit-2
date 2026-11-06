
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";

// ============================================
// EVOLUTION CENTER FIT 2.0
// PANEL PROFESIONAL DEL ENTRENADOR
// ============================================

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
  | "sparkles";

const iconos: Record<IconName, ReactNode> = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  brain: (
    <>
      <path d="M12 18V5a3 3 0 0 0-5.7-1.3A4 4 0 0 0 4 10a4 4 0 0 0 1 7.8A3.5 3.5 0 0 0 12 18Z" />
      <path d="M12 18V5a3 3 0 0 1 5.7-1.3A4 4 0 0 1 20 10a4 4 0 0 1-1 7.8A3.5 3.5 0 0 1 12 18Z" />
      <path d="M8 9c2 0 4 2 4 4" />
      <path d="M16 9c-2 0-4 2-4 4" />
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
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 3 2 5-7" />
      <path d="M17 6h2v2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  dumbbell: (
    <>
      <path d="m6.5 6.5 11 11" />
      <path d="m4 9 5-5M15 20l5-5" />
      <path d="m2 7 5-5M17 22l5-5" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
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

const modulos: {
  titulo: string;
  descripcion: string;
  icono: IconName;
  etiqueta: string;
  accion: string;
  color: string;
}[] = [
  {
    titulo: "Mis clientes",
    descripcion:
      "Consulta perfiles, objetivos y clientes asignados a tu cuenta.",
    icono: "users",
    etiqueta: "GESTIÓN",
    accion: "Gestionar clientes",
    color: "text-cyan-300 bg-cyan-400/10",
  },
  {
    titulo: "Recomendaciones inteligentes",
    descripcion:
      "Evalúa la compatibilidad de rutinas con el perfil de cada cliente.",
    icono: "brain",
    etiqueta: "MOTOR IA",
    accion: "Abrir evaluador",
    color: "text-violet-300 bg-violet-400/10",
  },
  {
    titulo: "Aprobación de rutinas",
    descripcion:
      "Revisa las propuestas antes de asignarlas al plan de entrenamiento.",
    icono: "clipboard",
    etiqueta: "SUPERVISIÓN",
    accion: "Revisar propuestas",
    color: "text-emerald-300 bg-emerald-400/10",
  },
  {
    titulo: "Seguimiento y adherencia",
    descripcion:
      "Supervisa asistencia, cumplimiento, continuidad y sesiones.",
    icono: "activity",
    etiqueta: "ANÁLISIS",
    accion: "Ver seguimiento",
    color: "text-amber-300 bg-amber-400/10",
  },
];

function CargandoPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080d1a] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400 text-2xl font-black text-slate-950">
          E
        </div>

        <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-[3px] border-slate-700 border-t-cyan-400" />

        <h1 className="text-xl font-bold">
          Evolution Center Fit 2.0
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Preparando tu panel de entrenamiento...
        </p>
      </div>
    </main>
  );
}

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
    <article className="rounded-2xl border border-white/[0.08] bg-[#111b2e] p-5 transition duration-200 hover:border-cyan-400/25 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          <Icon name={icono} className="h-5 w-5" />
        </div>

        <span className="h-2 w-2 rounded-full bg-cyan-400/70" />
      </div>

      <p className="text-3xl font-bold tracking-tight text-white">
        {valor}
      </p>

      <h3 className="mt-2 text-sm font-semibold text-slate-200">
        {titulo}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {descripcion}
      </p>
    </article>
  );
}

async function ContenidoEntrenador() {
  // Mantener renderización por solicitud en Next.js 16.
  await connection();

  const supabase = await createClient();

  // ============================================
  // 1. AUTENTICACIÓN
  // ============================================

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  // ============================================
  // 2. VERIFICAR ROL DE ENTRENADOR
  // ============================================

  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .eq("rol", "entrenador")
      .maybeSingle();

  if (accesoError || !acceso) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#080d1a] px-6 text-white">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10 text-red-300">
          <Icon name="shield" className="h-8 w-8" />
        </div>

        <h1 className="text-center text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="mt-4 max-w-md text-center leading-7 text-slate-400">
          Tu cuenta no tiene autorización para utilizar
          el panel del entrenador.
        </p>

        <Link
          href="/login"
          className="mt-7 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Volver al inicio de sesión
        </Link>
      </main>
    );
  }

  // ============================================
  // 3. OBTENER DATOS REALES DE SUPABASE
  // ============================================

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

  // ============================================
  // 4. CONSULTAR SESIONES DE SUS PLANES
  // ============================================

  let sesionesProgramadas = "0";
  let sesionesRealizadas = "0";

  if (resultadoPlanes.error) {
    sesionesProgramadas = "—";
    sesionesRealizadas = "—";
  } else {
    const idsPlanes = planes.map(
      (plan) => plan.id
    );

    if (idsPlanes.length > 0) {
      const [
        resultadoProgramadas,
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

      sesionesProgramadas = resultadoProgramadas.error
        ? "—"
        : String(resultadoProgramadas.count ?? 0);

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
      titulo: "Sesiones programadas",
      valor: sesionesProgramadas,
      descripcion: "Entrenamientos pendientes",
      icono: "calendar",
    },
    {
      titulo: "Sesiones realizadas",
      valor: sesionesRealizadas,
      descripcion: "Entrenamientos finalizados",
      icono: "check",
    },
  ];

  // ============================================
  // 5. INTERFAZ PROFESIONAL
  // ============================================

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d1a] text-white">
      {/* Decoración de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-200px] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.07] blur-[110px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-250px] top-[450px] h-[450px] w-[450px] rounded-full bg-violet-500/[0.05] blur-[100px]"
      />

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/[0.07] bg-[#0d1526]/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/entrenador"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-[#07121e] shadow-lg shadow-cyan-500/10">
              E
            </div>

            <div>
              <p className="text-sm font-black tracking-tight sm:text-base">
                EVOLUTION CENTER FIT
                <span className="ml-1.5 text-cyan-400">
                  2.0
                </span>
              </p>

              <p className="text-[11px] text-slate-400">
                Centro de control del entrenador
              </p>
            </div>
          </Link>

          <nav
            aria-label="Navegación del entrenador"
            className="flex flex-wrap items-center gap-2 sm:gap-3"
          >
            <Link
              href="/entrenador/clientes"
              className="rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white sm:text-sm"
            >
              Mis clientes
            </Link>

            <Link
              href="/catalogo"
              className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20 sm:px-4 sm:text-sm"
            >
              Catálogo
            </Link>

            <form action={cerrarSesion}>
              <button
                type="submit"
                className="rounded-xl border border-red-400/20 px-3 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-400/10 sm:px-4 sm:text-sm"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        {/* BIENVENIDA */}
        <section className="relative overflow-hidden rounded-[28px] border border-cyan-400/10 bg-gradient-to-br from-[#12243b] via-[#101a2d] to-[#15152d] p-6 sm:p-9">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.09] blur-3xl"
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                <Icon
                  name="sparkles"
                  className="h-3.5 w-3.5"
                />
                Panel del entrenador
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-[42px] lg:leading-tight">
                ¡Bienvenido,
                <span className="block text-cyan-300">
                  {nombre}!
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Supervisa tus clientes, evalúa rutinas
                inteligentes y realiza el seguimiento
                de cada plan de entrenamiento desde
                un mismo espacio.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/entrenador/clientes"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#07121e] shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:bg-cyan-300"
                >
                  Gestionar clientes
                  <Icon
                    name="arrow"
                    className="h-4 w-4"
                  />
                </Link>

                <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-xs font-medium text-emerald-300">
                  <Icon
                    name="shield"
                    className="h-4 w-4"
                  />
                  Rol verificado
                </span>
              </div>
            </div>

            {/* Tarjeta lateral */}
            <div className="w-full rounded-2xl border border-white/10 bg-[#091323]/70 p-5 lg:max-w-[290px]">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                  <Icon
                    name="brain"
                    className="h-6 w-6"
                  />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Motor inteligente
                  </p>

                  <p className="text-xs text-slate-400">
                    Recomendación supervisada
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  "Evaluar perfil del cliente",
                  "Analizar compatibilidad",
                  "Revisar y aprobar rutina",
                ].map((paso, index) => (
                  <div
                    key={paso}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-cyan-300">
                      {index + 1}
                    </span>

                    <span className="text-xs leading-5 text-slate-300">
                      {paso}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* INDICADORES */}
        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-cyan-400">
                Resumen general
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Indicadores de entrenamiento
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Información registrada en Supabase
                para tus clientes y planes.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400">
              Datos del sistema
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            {indicadores.map((indicador) => (
              <TarjetaIndicador
                key={indicador.titulo}
                {...indicador}
              />
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            El símbolo — indica que no fue posible
            consultar un indicador. Los valores
            se obtienen de la base de datos.
          </p>
        </section>

        {/* MÓDULOS */}
        <section className="mt-12">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-cyan-400">
              Espacio de trabajo
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Herramientas del entrenador
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Accede a la gestión de clientes, las
              recomendaciones inteligentes, la
              aprobación de rutinas y los indicadores
              de adherencia.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {modulos.map((modulo) => (
              <article
                key={modulo.titulo}
                className="group flex flex-col rounded-2xl border border-white/[0.08] bg-[#111b2e] p-6 transition duration-200 hover:-translate-y-1 hover:border-cyan-400/25 hover:bg-[#152239]"
              >
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div
                    className={`flex h-13 w-13 items-center justify-center rounded-2xl ${modulo.color}`}
                  >
                    <Icon
                      name={modulo.icono}
                      className="h-6 w-6"
                    />
                  </div>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400">
                    {modulo.etiqueta}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">
                  {modulo.titulo}
                </h3>

                <p className="mt-3 flex-1 text-sm leading-7 text-slate-400">
                  {modulo.descripcion}
                </p>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <Link
                    href="/entrenador/clientes"
                    className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:gap-3 hover:text-cyan-200"
                  >
                    {modulo.accion}
                    <Icon
                      name="arrow"
                      className="h-4 w-4"
                    />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Actualmente, estas herramientas están
            integradas en el espacio de gestión
            de clientes.
          </p>
        </section>

        {/* INFORMACIÓN FINAL */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-cyan-400/10 bg-gradient-to-r from-cyan-500/[0.08] to-violet-500/[0.08] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              <Icon
                name="dumbbell"
                className="h-7 w-7"
              />
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-bold">
                Entrenamiento personalizado
                con supervisión humana
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                Evolution Center Fit 2.0 combina
                recomendaciones inteligentes con
                la revisión del entrenador y el
                seguimiento de asistencia,
                cumplimiento y continuidad.
              </p>
            </div>

            <Link
              href="/catalogo"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/20"
            >
              Ver rutinas
              <Icon
                name="arrow"
                className="h-4 w-4"
              />
            </Link>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.07] px-5 py-7 text-center text-xs text-slate-500">
        Evolution Center Fit 2.0 ·
        Sistema inteligente de entrenamiento
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
