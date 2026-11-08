
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";
import ProgresoCliente from "./progreso-cliente";
import CalendarioCliente from "./calendario-cliente";


type Asignacion = {
  id: number;
  rutina_id: number;
  estado: string;
};

type Sesion = {
  id: number;
  numero_sesion: number;
  fecha_programada: string;
  estado: string;
};

type EjercicioPreparado = {
  id: number;
  sesion_id: number;
  ejercicio_id: number;
  orden: number;
  series_objetivo: number;
  repeticiones_objetivo: number | null;
  duracion_objetivo_min: number | null;
  descanso_objetivo_seg: number | null;
};

type SerieRegistrada = {
  sesion_ejercicio_id: number;
  completada: boolean;
};

type IconName =
  | "user"
  | "dumbbell"
  | "calendar"
  | "check"
  | "chart"
  | "clock"
  | "arrow"
  | "shield"
  | "activity"
  | "clipboard";

const iconos: Record<IconName, ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  dumbbell: (
    <>
      <path d="m6.5 6.5 11 11M4 9l5-5M15 20l5-5M2 7l5-5M17 22l5-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18M7 16l4-5 3 2 5-7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
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

function fechaBonita(fecha: string) {
  const [anio, mes, dia] = fecha.split("-");
  return anio && mes && dia
    ? `${dia}/${mes}/${anio}`
    : fecha;
}

function fechaHoyLima() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const parte = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

function nombreEstado(estado: string) {
  const nombres: Record<string, string> = {
    programada: "Programada",
    activa: "Activa",
    pausada: "Pausada",
    realizada: "Realizada",
    en_curso: "En curso",
    ausente: "Ausente",
    cancelada: "Cancelada",
    completada: "Completada",
    finalizada: "Finalizada",
    anulada: "Anulada",
  };

  return nombres[estado] ?? estado;
}

function colorEstado(estado: string) {
  if (
    ["realizada", "completada", "activa"].includes(estado)
  ) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  if (estado === "en_curso") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  }

  if (
    ["ausente", "cancelada", "anulada"].includes(estado)
  ) {
    return "border-rose-400/25 bg-rose-400/10 text-rose-300";
  }

  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-300";
}

function numeroSemana(fecha: string, inicio: string) {
  const actual = Date.parse(`${fecha}T00:00:00Z`);
  const primera = Date.parse(`${inicio}T00:00:00Z`);

  return Math.floor(
    (actual - primera) / (7 * 24 * 60 * 60 * 1000)
  );
}

function Estado({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${colorEstado(
        estado
      )}`}
    >
      {nombreEstado(estado)}
    </span>
  );
}

function TarjetaIndicador({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  icono: IconName;
}) {
  return (
    <article className="ecf-client-stat rounded-2xl border border-white/10 bg-[#111c30] p-5 transition-colors hover:border-cyan-400/25">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
        <Icon name={icono} />
      </div>

      <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
        {valor}
      </p>

      <h3 className="mt-2 text-sm font-semibold text-slate-200">
        {titulo}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-400">
        {detalle}
      </p>
    </article>
  );
}

function EncabezadoSeccion({
  etiqueta,
  titulo,
  descripcion,
}: {
  etiqueta: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
        {etiqueta}
      </p>

      <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
        {titulo}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {descripcion}
      </p>
    </div>
  );
}

function CargandoPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-xl font-black text-slate-950">
          E
        </div>

        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-[3px] border-slate-700 border-t-cyan-400" />

        <h1 className="text-lg font-bold">
          Evolution Center Fit 2.0
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Cargando tu espacio de entrenamiento...
        </p>
      </div>
    </main>
  );
}

async function ContenidoCliente() {
  await connection();

  const supabase = await createClient();

  // ============================================
  // 1. AUTENTICACIÓN Y CONTROL DE ACCESO
  // ============================================

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .maybeSingle();

  if (accesoError || acceso?.rol !== "cliente") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080e1b] px-6 text-white">
        <div className="rounded-2xl bg-rose-400/10 p-4 text-rose-300">
          <Icon
            name="shield"
            className="h-9 w-9"
          />
        </div>

        <h1 className="text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="max-w-md text-center text-slate-400">
          Tu cuenta no tiene autorización para
          acceder al portal del cliente.
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"
        >
          Volver al inicio de sesión
        </Link>
      </main>
    );
  }

  // ============================================
  // 2. PERFIL Y PLAN ASIGNADO
  // ============================================

  const [
    resultadoPerfil,
    resultadoAsignacion,
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre_completo")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("asignaciones_rutinas")
      .select("id, rutina_id, estado")
      .eq("cliente_id", userId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const nombre =
    resultadoPerfil.data?.nombre_completo?.trim() ||
    "Cliente";

  const asignacion =
    (resultadoAsignacion.data as Asignacion | null) ??
    null;

  const errorAsignacion = Boolean(
    resultadoAsignacion.error
  );

  let nombreRutina = "Rutina personalizada";
  let sesiones: Sesion[] = [];
  let ejerciciosPreparados: EjercicioPreparado[] = [];
  let seriesRegistradas: SerieRegistrada[] = [];

  const nombresEjercicios = new Map<number, string>();

  let errorSesiones = false;
  let errorEjercicios = false;
  let errorSeries = false;

  // ============================================
  // 3. CONSULTAS DE ENTRENAMIENTO
  // ============================================

  if (asignacion) {
    const [
      resultadoRutina,
      resultadoSesiones,
    ] = await Promise.all([
      supabase
        .from("rutinas")
        .select("id, nombre")
        .eq("id", asignacion.rutina_id)
        .maybeSingle(),

      supabase
        .from("sesiones_entrenamiento")
        .select(
          "id, numero_sesion, fecha_programada, estado"
        )
        .eq("asignacion_id", asignacion.id)
        .order("numero_sesion", {
          ascending: true,
        }),
    ]);

    if (resultadoRutina.data?.nombre) {
      nombreRutina = resultadoRutina.data.nombre;
    }

    errorSesiones = Boolean(
      resultadoSesiones.error
    );

    sesiones =
      (resultadoSesiones.data ?? []) as Sesion[];

    const idsSesiones = sesiones.map(
      (sesion) => sesion.id
    );

    if (idsSesiones.length > 0) {
      const resultadoEjercicios = await supabase
        .from("sesion_ejercicios")
        .select(
          "id, sesion_id, ejercicio_id, orden, series_objetivo, repeticiones_objetivo, duracion_objetivo_min, descanso_objetivo_seg"
        )
        .in("sesion_id", idsSesiones);

      errorEjercicios = Boolean(
        resultadoEjercicios.error
      );

      ejerciciosPreparados =
        (resultadoEjercicios.data ??
          []) as EjercicioPreparado[];
    }

    // Obtener nombres de ejercicios.
    const idsEjercicios = [
      ...new Set(
        ejerciciosPreparados.map(
          (ejercicio) => ejercicio.ejercicio_id
        )
      ),
    ];

    if (idsEjercicios.length > 0) {
      const catalogo = await supabase
        .from("ejercicios")
        .select("id, nombre")
        .in("id", idsEjercicios);

      if (catalogo.error) {
        errorEjercicios = true;
      }

      for (const ejercicio of catalogo.data ?? []) {
        nombresEjercicios.set(
          ejercicio.id,
          ejercicio.nombre
        );
      }
    }

    // Consultar series de sesiones realizadas.
    const idsRealizadas = new Set(
      sesiones
        .filter(
          (sesion) =>
            sesion.estado === "realizada"
        )
        .map((sesion) => sesion.id)
    );

    const idsEjerciciosRealizados =
      ejerciciosPreparados
        .filter((ejercicio) =>
          idsRealizadas.has(ejercicio.sesion_id)
        )
        .map((ejercicio) => ejercicio.id);

    if (idsEjerciciosRealizados.length > 0) {
      const resultadoSeries = await supabase
        .from("sesion_series")
        .select(
          "sesion_ejercicio_id, completada"
        )
        .in(
          "sesion_ejercicio_id",
          idsEjerciciosRealizados
        );

      errorSeries = Boolean(
        resultadoSeries.error
      );

      seriesRegistradas =
        (resultadoSeries.data ??
          []) as SerieRegistrada[];
    }
  }

  // ============================================
  // 4. INDICADORES DE ADHERENCIA
  // ============================================

  const hoy = fechaHoyLima();

  const realizadas = sesiones.filter(
    (sesion) => sesion.estado === "realizada"
  ).length;

  const ausencias = sesiones.filter(
    (sesion) => sesion.estado === "ausente"
  ).length;

  const enCurso = sesiones.filter(
    (sesion) => sesion.estado === "en_curso"
  ).length;

  const pendientes = sesiones.filter(
    (sesion) => sesion.estado === "programada"
  ).length;

  const pendientesVencidas = sesiones.filter(
    (sesion) =>
      sesion.estado === "programada" &&
      sesion.fecha_programada < hoy
  ).length;

  const evaluadas = realizadas + ausencias;

  const asistenciaPct =
    !errorSesiones && evaluadas > 0
      ? Math.round(
        (realizadas / evaluadas) * 100
      )
      : null;

  const primeraFecha =
    sesiones[0]?.fecha_programada;

  const semanasConAsistencia = primeraFecha
    ? new Set(
      sesiones
        .filter(
          (sesion) =>
            sesion.estado === "realizada"
        )
        .map((sesion) =>
          numeroSemana(
            sesion.fecha_programada,
            primeraFecha
          )
        )
    ).size
    : 0;

  const continuidadTexto =
    errorSesiones || evaluadas === 0
      ? "Sin datos"
      : `${semanasConAsistencia} sem.`;

  const idsRealizadas = new Set(
    sesiones
      .filter(
        (sesion) =>
          sesion.estado === "realizada"
      )
      .map((sesion) => sesion.id)
  );

  const ejerciciosRealizados =
    ejerciciosPreparados.filter((ejercicio) =>
      idsRealizadas.has(ejercicio.sesion_id)
    );

  const seriesObjetivo =
    ejerciciosRealizados.reduce(
      (total, ejercicio) =>
        total + ejercicio.series_objetivo,
      0
    );

  const seriesCompletadas =
    seriesRegistradas.filter(
      (serie) => serie.completada
    ).length;

  const cumplimientoPct =
    !errorEjercicios &&
      !errorSeries &&
      seriesObjetivo > 0
      ? Math.round(
        (seriesCompletadas / seriesObjetivo) *
        100
      )
      : null;

  // ============================================
  // 5. CALENDARIO, HISTORIAL Y EJERCICIOS
  // ============================================

  const proximasSesiones = sesiones
    .filter(
      (sesion) =>
        sesion.estado === "programada" &&
        sesion.fecha_programada >= hoy
    )
    .sort((a, b) =>
      a.fecha_programada.localeCompare(
        b.fecha_programada
      )
    )
    .slice(0, 4);

  const sesionDestacada =
    sesiones.find(
      (sesion) => sesion.estado === "en_curso"
    ) ?? proximasSesiones[0];

  const historial = sesiones
    .filter(
      (sesion) =>
        sesion.estado === "realizada" ||
        sesion.estado === "ausente"
    )
    .sort((a, b) =>
      b.fecha_programada.localeCompare(
        a.fecha_programada
      )
    )
    .slice(0, 6);

  const sesionConEjercicios = sesiones.find(
    (sesion) =>
      ejerciciosPreparados.some(
        (ejercicio) =>
          ejercicio.sesion_id === sesion.id
      )
  );

  const vistaEjercicios = ejerciciosPreparados
    .filter(
      (ejercicio) =>
        ejercicio.sesion_id ===
        sesionConEjercicios?.id
    )
    .sort((a, b) => a.orden - b.orden);

  // ============================================
  // 6. INTERFAZ PROFESIONAL
  // ============================================

  return (
    <main className="ecf-client relative min-h-screen overflow-hidden bg-[#080e1b] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-cyan-500/[0.06] blur-3xl"
      />

      {/* ENCABEZADO */}
      <header className="ecf-client-header relative z-50 border-b border-white/10 bg-[#0d1729]/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/cliente"
            className="flex min-w-0 items-center gap-3"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-slate-950">
              E
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-black tracking-tight sm:text-base">
                EVOLUTION CENTER FIT{" "}
                <span className="text-cyan-400">
                  2.0
                </span>
              </span>

              <span className="block text-xs text-slate-400">
                Portal personal de entrenamiento
              </span>
            </span>
          </Link>


          {/* NAVEGACION PARA COMPUTADORAS */}
          <nav
            aria-label="Navegación principal del cliente"
            className="hidden items-center gap-1 lg:flex"
          >
            {[
              { href: "/cliente", texto: "Inicio" },
              { href: "/cliente/mi-rutina", texto: "Mi rutina" },
              { href: "#mi-calendario", texto: "Calendario" },
              { href: "#mi-progreso", texto: "Mi progreso" },
              { href: "/cliente/perfil", texto: "Mi perfil" },
            ].map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={
                  enlace.href === "/cliente"
                    ? "page"
                    : undefined
                }
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${enlace.href === "/cliente"
                  ? "bg-cyan-400/10 text-cyan-300"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {enlace.texto}
              </Link>
            ))}

            <form action={cerrarSesion}>
              <button
                type="submit"
                className="ml-1 min-h-11 rounded-xl border border-rose-400/20 px-3 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-rose-300"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>

          {/* NAVEGACION PARA CELULAR Y TABLET */}
          <details className="group relative shrink-0 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              Menú
            </summary>

            <nav
              aria-label="Navegación móvil del cliente"
              className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-[#101d31] p-2 shadow-2xl shadow-black/50"
            >
              {[
                { href: "/cliente", texto: "Inicio" },
                { href: "/cliente/mi-rutina", texto: "Mi rutina" },
                { href: "#mi-calendario", texto: "Calendario" },
                { href: "#mis-ejercicios", texto: "Mis ejercicios" },
                { href: "#mi-progreso", texto: "Mi progreso" },
                { href: "#mi-historial", texto: "Historial" },
                { href: "/cliente/perfil", texto: "Mi perfil" },
              ].map((enlace) => (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-cyan-400/10 hover:text-cyan-300"
                >
                  {enlace.texto}
                </Link>
              ))}

              <form
                action={cerrarSesion}
                className="mt-2 border-t border-white/10 pt-2"
              >
                <button
                  type="submit"
                  className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-300 hover:bg-rose-400/10"
                >
                  Cerrar sesión
                </button>
              </form>
            </nav>
          </details>

        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl space-y-9 px-5 py-8 sm:px-8 sm:py-10">
        {/* BIENVENIDA */}
        <section className="ecf-client-hero relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#14253d] via-[#111d31] to-[#17172f] p-6 sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_300px] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
                <Icon
                  name="activity"
                  className="h-4 w-4"
                />
                Mi espacio de entrenamiento
              </p>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                ¡Bienvenido,{" "}
                <span className="text-cyan-300">
                  {nombre}!
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Consulta tu rutina personalizada,
                organiza tus próximas sesiones y
                sigue tu progreso de entrenamiento.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/cliente/mi-rutina"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  Ver mi rutina
                  <Icon
                    name="arrow"
                    className="h-4 w-4"
                  />
                </Link>

                <Link
                  href="#mi-calendario"
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Ver calendario
                </Link>
              </div>
            </div>

            {/* PRÓXIMO ENTRENAMIENTO */}
            <div className="rounded-2xl border border-white/10 bg-[#091527]/75 p-5">
              <div className="flex items-center gap-3 text-cyan-300">
                <Icon name="calendar" />
                <span className="text-sm font-semibold">
                  Próximo entrenamiento
                </span>
              </div>

              {sesionDestacada ? (
                <>
                  <p className="mt-5 text-2xl font-black">
                    {fechaBonita(
                      sesionDestacada.fecha_programada
                    )}
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    Sesión #
                    {sesionDestacada.numero_sesion}
                  </p>

                  <div className="mt-4">
                    <Estado
                      estado={sesionDestacada.estado}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-400">
                  {errorSesiones
                    ? "No se pudo consultar el calendario."
                    : "No hay próximas sesiones programadas."}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* NAVEGACIÓN INTERNA */}
        <nav
          aria-label="Secciones del portal"
          className="flex flex-wrap gap-2"
        >
          {[
            ["Mi plan", "#mi-rutina"],
            ["Calendario", "#mi-calendario"],
            ["Ejercicios", "#mis-ejercicios"],
            ["Progreso", "#mi-progreso"],
            ["Historial", "#mi-historial"],
          ].map(([texto, destino]) => (
            <Link
              key={destino}
              href={destino}
              className="rounded-xl border border-white/10 bg-[#111c30] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/30 hover:text-cyan-300 sm:text-sm"
            >
              {texto}
            </Link>
          ))}
        </nav>

        {/* ESTADO DE ASIGNACIÓN */}
        {errorAsignacion ? (
          <section className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-6 text-sm text-rose-200">
            No fue posible consultar tu plan.
            Intenta nuevamente o contacta al
            administrador.
          </section>
        ) : !asignacion ? (
          <section className="rounded-2xl border border-amber-400/20 bg-[#111c30] p-7">
            <h2 className="text-xl font-bold">
              Todavía no tienes un plan asignado
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Cuando tu entrenador apruebe y asigne
              una rutina, aquí aparecerán tus sesiones,
              ejercicios e indicadores.
            </p>

            <Link
              href="/cliente/perfil"
              className="mt-5 inline-flex rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950"
            >
              Revisar mi perfil
            </Link>
          </section>
        ) : (
          <>
            {/* INDICADORES */}
            <section aria-label="Resumen de entrenamiento">
              <EncabezadoSeccion
                etiqueta="Resumen general"
                titulo="Tu entrenamiento de un vistazo"
                descripcion="Indicadores obtenidos de tus sesiones y registros confirmados."
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:gap-5">
                <TarjetaIndicador
                  titulo="Sesiones del plan"
                  valor={
                    errorSesiones
                      ? "—"
                      : String(sesiones.length)
                  }
                  detalle="Entrenamientos incluidos en el calendario"
                  icono="calendar"
                />

                <TarjetaIndicador
                  titulo="Realizadas"
                  valor={
                    errorSesiones
                      ? "—"
                      : String(realizadas)
                  }
                  detalle="Sesiones con asistencia confirmada"
                  icono="check"
                />

                <TarjetaIndicador
                  titulo="Asistencia"
                  valor={
                    asistenciaPct === null
                      ? "Sin datos"
                      : `${asistenciaPct}%`
                  }
                  detalle="Solo asistencias y ausencias confirmadas"
                  icono="activity"
                />

                <TarjetaIndicador
                  titulo="Continuidad"
                  valor={continuidadTexto}
                  detalle="Semanas con al menos una asistencia"
                  icono="chart"
                />
              </div>
            </section>

            {/* PLAN DE ENTRENAMIENTO */}
            <section
              id="mi-rutina"
              className="ecf-client-section scroll-mt-8 rounded-3xl border border-white/10 bg-[#111c30] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                    Mi plan de entrenamiento
                  </p>

                  <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                    {nombreRutina}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Asignación #{asignacion.id}
                  </p>
                </div>

                <Estado estado={asignacion.estado} />
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    titulo: "Primera sesión",
                    valor: errorSesiones
                      ? "—"
                      : sesiones[0]
                        ? fechaBonita(
                          sesiones[0].fecha_programada
                        )
                        : "Pendiente",
                  },
                  {
                    titulo: "Última sesión",
                    valor: errorSesiones
                      ? "—"
                      : sesiones.length
                        ? fechaBonita(
                          sesiones[
                            sesiones.length - 1
                          ].fecha_programada
                        )
                        : "Pendiente",
                  },
                  {
                    titulo: "Pendientes",
                    valor: errorSesiones
                      ? "—"
                      : String(pendientes),
                  },
                ].map((dato) => (
                  <div
                    key={dato.titulo}
                    className="rounded-xl border border-white/5 bg-[#091527] p-4"
                  >
                    <p className="text-xs text-slate-400">
                      {dato.titulo}
                    </p>

                    <p className="mt-2 text-lg font-bold text-white">
                      {dato.valor}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href="/cliente/mi-rutina"
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-cyan-200"
              >
                Ver detalles de mi rutina
                <Icon
                  name="arrow"
                  className="h-4 w-4"
                />
              </Link>
            </section>

            {/* CALENDARIO INTERACTIVO DEL CLIENTE */}
            <section
              id="mi-calendario"
              className="ecf-client-section scroll-mt-8 rounded-3xl border border-white/10 bg-[#111c30] p-5 sm:p-8"
            >
              <EncabezadoSeccion
                etiqueta="Organización"
                titulo="Mi calendario de entrenamiento"
                descripcion="Consulta tus sesiones programadas, cambia de mes y filtra por estado. Los registros son establecidos por tu entrenador."
              />

              {errorSesiones ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-5 text-sm text-rose-200"
                >
                  No se pudo consultar el calendario.
                  Revisa los permisos de lectura.
                </div>
              ) : sesiones.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-[#0b1729] p-7 text-center">
                  <Icon
                    name="calendar"
                    className="mx-auto h-10 w-10 text-slate-400"
                  />

                  <h3 className="mt-4 text-lg font-bold">
                    Sin sesiones programadas
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    Cuando tu entrenador programe los
                    entrenamientos, aparecerán aquí.
                  </p>
                </div>
              ) : (
                <CalendarioCliente
                  sesiones={sesiones}
                  hoy={hoy}
                />
              )}

              {proximasSesiones.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3">
                  <Icon
                    name="calendar"
                    className="h-5 w-5 text-cyan-300"
                  />

                  <p className="text-sm text-slate-200">
                    <span className="font-bold text-cyan-300">
                      Próxima sesión:
                    </span>{" "}
                    #{proximasSesiones[0].numero_sesion}
                    {" · "}
                    {fechaBonita(
                      proximasSesiones[0].fecha_programada
                    )}
                  </p>
                </div>
              )}
            </section>

            {/* EJERCICIOS */}
            <section
              id="mis-ejercicios"
              className="ecf-client-section scroll-mt-8 rounded-3xl border border-white/10 bg-[#111c30] p-6 sm:p-8"
            >
              <EncabezadoSeccion
                etiqueta="Preparación"
                titulo="Mis ejercicios"
                descripcion="Vista previa de los objetivos preparados para una sesión de tu plan."
              />

              {errorEjercicios && (
                <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
                  No fue posible cargar todos los
                  ejercicios.
                </p>
              )}

              {vistaEjercicios.length === 0 ? (
                <p className="rounded-xl bg-[#091527] p-5 text-sm text-slate-400">
                  Todavía no hay ejercicios preparados
                  visibles. Puedes consultar tu rutina
                  asignada desde el botón inferior.
                </p>
              ) : (
                <>
                  <p className="mb-4 text-sm font-semibold text-cyan-300">
                    Sesión #
                    {sesionConEjercicios?.numero_sesion}
                    {" · "}
                    {vistaEjercicios.length} ejercicios
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    {vistaEjercicios.map(
                      (ejercicio, indice) => (
                        <article
                          key={ejercicio.id}
                          className="rounded-xl border border-white/10 bg-[#091527] p-5"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-sm font-black text-cyan-300">
                              {indice + 1}
                            </span>

                            <div className="min-w-0">
                              <h3 className="font-bold">
                                {nombresEjercicios.get(
                                  ejercicio.ejercicio_id
                                ) ??
                                  `Ejercicio #${ejercicio.ejercicio_id}`}
                              </h3>

                              <p className="mt-2 text-sm text-slate-300">
                                {ejercicio.series_objetivo}{" "}
                                serie(s)
                              </p>

                              {ejercicio.repeticiones_objetivo !==
                                null && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {
                                      ejercicio.repeticiones_objetivo
                                    }{" "}
                                    repeticiones por serie
                                  </p>
                                )}

                              {ejercicio.duracion_objetivo_min !==
                                null && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    Duración objetivo:{" "}
                                    {
                                      ejercicio.duracion_objetivo_min
                                    }{" "}
                                    min
                                  </p>
                                )}

                              {ejercicio.descanso_objetivo_seg !==
                                null && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    Descanso:{" "}
                                    {
                                      ejercicio.descanso_objetivo_seg
                                    }{" "}
                                    segundos
                                  </p>
                                )}
                            </div>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                <p className="text-xs text-slate-500">
                  El registro de resultados corresponde
                  al entrenador autorizado.
                </p>

                <Link
                  href="/cliente/mi-rutina"
                  className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300"
                >
                  Ver rutina completa
                  <Icon
                    name="arrow"
                    className="h-4 w-4"
                  />
                </Link>
              </div>
            </section>


            {/* ============================================
    FASE 110.15 - MI PROGRESO PROFESIONAL
    ============================================ */}

            <section
              id="mi-progreso"
              className="ecf-client-section scroll-mt-8 rounded-3xl border border-white/10 bg-[#111c30] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.22)] sm:p-8"
            >
              <EncabezadoSeccion
                etiqueta="Seguimiento personalizado"
                titulo="Mi progreso"
                descripcion="Consulta tu asistencia, cumplimiento y continuidad mediante registros confirmados, sin considerar automáticamente las sesiones futuras como ausencias."
              />

              {/* TRES DIMENSIONES DE ADHERENCIA */}
              <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">

                {/* ASISTENCIA Y CUMPLIMIENTO */}
                {[
                  {
                    titulo: "Asistencia",
                    subtitulo: "Sesiones con resultado confirmado",
                    valor: asistenciaPct,
                    detalle: `${realizadas} realizadas · ${ausencias} ausencias confirmadas`,
                    color: "cyan" as const,
                    icono: (
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
                    ),
                  },
                  {
                    titulo: "Cumplimiento de series",
                    subtitulo: "Objetivos completados durante las sesiones",
                    valor: cumplimientoPct,
                    detalle:
                      cumplimientoPct === null
                        ? "Pendiente de sesiones realizadas con objetivos registrados."
                        : `${seriesCompletadas} de ${seriesObjetivo} series completadas`,
                    color: "violet" as const,
                    icono: (
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
                    ),
                  },
                ].map((indicador) => {
                  const esCyan = indicador.color === "cyan";

                  const colorTexto = esCyan
                    ? "text-cyan-300"
                    : "text-violet-300";

                  const colorIcono = esCyan
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "bg-violet-400/10 text-violet-300";

                  const colorBarra = esCyan
                    ? "from-cyan-500 to-cyan-300"
                    : "from-violet-500 to-violet-300";

                  const porcentaje =
                    indicador.valor === null
                      ? null
                      : Math.max(
                        0,
                        Math.min(100, indicador.valor)
                      );

                  return (
                    <article
                      key={indicador.titulo}
                      className="group flex min-w-0 flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#192d45] to-[#0c192d] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.20)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_20px_45px_rgba(0,0,0,0.28)] sm:p-6"
                    >
                      {/* ICONO Y ESTADO */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorIcono}`}
                        >
                          {indicador.icono}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${porcentaje === null
                              ? "border-white/10 bg-white/5 text-slate-400"
                              : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                            }`}
                        >
                          {porcentaje === null
                            ? "Pendiente"
                            : "Con evidencia"}
                        </span>
                      </div>

                      {/* TITULO */}
                      <h3 className="mt-5 text-base font-bold text-white">
                        {indicador.titulo}
                      </h3>

                      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-400">
                        {indicador.subtitulo}
                      </p>

                      {/* VALOR */}
                      <p
                        className={`mt-4 text-3xl font-black tracking-tight tabular-nums sm:text-4xl ${colorTexto}`}
                      >
                        {porcentaje === null
                          ? "Sin datos"
                          : `${indicador.valor}%`}
                      </p>

                      {/* BARRA DE PROGRESO */}
                      <div className="mt-5">
                        {porcentaje !== null ? (
                          <div
                            role="progressbar"
                            aria-label={indicador.titulo}
                            aria-valuenow={porcentaje}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="h-2.5 overflow-hidden rounded-full bg-[#071321]"
                          >
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${colorBarra} transition-[width] duration-500 motion-reduce:transition-none`}
                              style={{
                                width: `${porcentaje}%`,
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            aria-label="Todavía no hay datos para calcular este indicador"
                            className="h-2.5 rounded-full border border-dashed border-white/15 bg-[#071321]"
                          />
                        )}
                      </div>

                      {/* DESCRIPCION */}
                      <div className="mt-auto pt-5">
                        <p className="border-t border-white/10 pt-4 text-xs leading-6 text-slate-300">
                          {indicador.detalle}
                        </p>
                      </div>
                    </article>
                  );
                })}

                {/* CONTINUIDAD */}
                <article className="group flex min-w-0 flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#192d45] to-[#0c192d] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.20)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:border-emerald-400/25 hover:shadow-[0_20px_45px_rgba(0,0,0,0.28)] sm:p-6">

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
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
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${continuidadTexto === "Sin datos"
                          ? "border-white/10 bg-white/5 text-slate-400"
                          : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                        }`}
                    >
                      {continuidadTexto === "Sin datos"
                        ? "Pendiente"
                        : "Con evidencia"}
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-white">
                    Continuidad
                  </h3>

                  <p className="mt-1 min-h-10 text-xs leading-5 text-slate-400">
                    Regularidad semanal de tus entrenamientos
                  </p>

                  <p className="mt-4 break-words text-3xl font-black tracking-tight text-emerald-300 sm:text-4xl">
                    {continuidadTexto}
                  </p>

                  {/* LA CONTINUIDAD NO SE CONVIERTE
          ARTIFICIALMENTE A PORCENTAJE */}
                  <div className="mt-5 flex h-2.5 items-center gap-1">
                    {Array.from({ length: 12 }).map((_, indice) => (
                      <span
                        key={indice}
                        className={`h-2.5 min-w-0 flex-1 rounded-full ${continuidadTexto !== "Sin datos" &&
                            indice < semanasConAsistencia
                            ? "bg-emerald-400"
                            : "bg-white/10"
                          }`}
                      />
                    ))}
                  </div>

                  <div className="mt-auto pt-5">
                    <p className="border-t border-white/10 pt-4 text-xs leading-6 text-slate-300">
                      {continuidadTexto === "Sin datos"
                        ? "La continuidad se mostrará cuando existan sesiones con resultados confirmados."
                        : "Semanas con al menos una sesión realizada."}
                    </p>
                  </div>
                </article>
              </div>

              {/* EVIDENCIAS DEL ENTRENAMIENTO */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-r from-[#14273e] to-[#101a2e] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.15)] sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Evidencias del entrenamiento
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-slate-400">
                      Registros utilizados para evaluar tu asistencia.
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                    {realizadas + ausencias} evaluadas
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      titulo: "Sesiones realizadas",
                      valor: realizadas,
                      color: "text-emerald-300",
                    },
                    {
                      titulo: "Ausencias confirmadas",
                      valor: ausencias,
                      color: "text-rose-300",
                    },
                    {
                      titulo: "Sesiones evaluadas",
                      valor: realizadas + ausencias,
                      color: "text-cyan-300",
                    },
                  ].map((dato) => (
                    <div
                      key={dato.titulo}
                      className="rounded-xl border border-white/[0.07] bg-[#081525]/80 p-4"
                    >
                      <p className="text-xs leading-5 text-slate-400">
                        {dato.titulo}
                      </p>

                      <p
                        className={`mt-2 text-2xl font-extrabold tabular-nums ${dato.color}`}
                      >
                        {dato.valor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SESIONES PENDIENTES DE CONFIRMACION */}
              {pendientesVencidas > 0 && (
                <div
                  role="status"
                  className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4 text-sm leading-6 text-amber-200"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-5 w-5 shrink-0"
                  >
                    <path d="M12 3 2 21h20L12 3Z" />
                    <path d="M12 9v5M12 18h.01" />
                  </svg>

                  <p>
                    Hay <strong>{pendientesVencidas}</strong>{" "}
                    sesiones con fecha pasada que todavía
                    requieren confirmación del entrenador.
                    No se consideran ausencias automáticamente.
                  </p>
                </div>
              )}

              {/* SESIONES EN CURSO */}
              {enCurso > 0 && (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-4 text-sm leading-6 text-cyan-200"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-5 w-5 shrink-0"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>

                  <p>
                    Tienes <strong>{enCurso}</strong>{" "}
                    sesión(es) en curso.
                  </p>
                </div>
              )}

              {/* NOTA METODOLOGICA */}
              <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-6 text-slate-400">
                Los indicadores se calculan utilizando los
                registros confirmados del entrenamiento.
                Las sesiones futuras no se consideran ausencias.
                La asistencia, el cumplimiento y la continuidad
                se presentan por separado.
              </p>
            </section>


            {/* HISTORIAL */}
            <section
              id="mi-historial"
              className="ecf-client-section scroll-mt-8 rounded-3xl border border-white/10 bg-[#111c30] p-6 sm:p-8"
            >
              <EncabezadoSeccion
                etiqueta="Registro"
                titulo="Historial de entrenamiento"
                descripcion="Últimas sesiones con asistencia o ausencia confirmada."
              />

              {historial.length === 0 ? (

                <div className="rounded-2xl border border-dashed border-white/15 bg-[#0b1729] px-6 py-9 text-center shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                    <Icon
                      name="clock"
                      className="h-7 w-7"
                    />
                  </span>

                  <h3 className="mt-4 text-lg font-bold text-white">
                    Tu historial está por comenzar
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Todavía no tienes entrenamientos
                    finalizados ni ausencias confirmadas.
                    Los registros aparecerán aquí cuando
                    tu entrenador los actualice.
                  </p>
                </div>

              ) : (
                <div className="space-y-3">
                  {historial.map((sesion) => (
                    <div
                      key={sesion.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#091527] p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          Sesión #
                          {sesion.numero_sesion}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {fechaBonita(
                            sesion.fecha_programada
                          )}
                        </p>
                      </div>

                      <Estado estado={sesion.estado} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="border-t border-white/10 pt-6 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Portal del cliente
        </footer>
      </div>
    </main>
  );
}

export default function ClientePage() {
  return (
    <Suspense fallback={<CargandoPanel />}>
      <ContenidoCliente />
    </Suspense>
  );
}
