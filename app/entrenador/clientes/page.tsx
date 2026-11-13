
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";
import BotonRecomendarProtegido from "./boton-recomendar-protegido";

// EVOLUTION CENTER FIT 2.0
// FASE 110.5 - Gestión profesional de clientes.
// Diseño responsive, búsqueda, filtros y seguimiento.

type Cliente = {
  id: string;
  nombre: string;
  objetivo: string | null;
  experiencia: string | null;
  frecuencia: number | null;
  minutos: number | null;
  lugar: string | null;
  equipamiento: string[];
};

type ParametrosPagina = {
  searchParams?: Promise<{
    q?: string;
    filtro?: string;
    orden?: string;
  }>;
};

const navegacion = [
  { titulo: "Inicio", href: "/entrenador" },
  { titulo: "Clientes", href: "/entrenador/clientes" },
  {
    titulo: "Investigación",
    href: "/entrenador/investigacion",
  },
  {
    titulo: "Reportes",
    href: "/entrenador/investigacion/reporte",
  },
  { titulo: "Catálogo", href: "/catalogo" },
];

function formatear(valor: string | null | undefined) {
  if (!valor) return "No registrado";

  return valor
    .replaceAll("_", " ")
    .replace(/^./, (letra) => letra.toUpperCase());
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function perfilCompleto(cliente: Cliente) {
  return Boolean(
    cliente.objetivo &&
      cliente.experiencia &&
      cliente.frecuencia != null &&
      cliente.minutos != null &&
      cliente.lugar
  );
}

function Icono({
  nombre,
  className = "h-5 w-5",
}: {
  nombre:
    | "usuarios"
    | "buscar"
    | "flecha"
    | "check"
    | "alerta"
    | "escudo";
  className?: string;
}) {
  const trazo = {
    usuarios: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" />
      </>
    ),
    buscar: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    flecha: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    alerta: (
      <>
        <path d="M12 3 2 21h20L12 3Z" />
        <path d="M12 9v5m0 4h.01" />
      </>
    ),
    escudo: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
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
      {trazo[nombre]}
    </svg>
  );
}

// NAVEGACIÓN RESPONSIVE
function Cabecera() {
  return (
    <header className="relative z-40 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white/95 dark:bg-[#0c1526]/95 shadow-lg shadow-slate-300/30 dark:shadow-black/10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/entrenador"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-slate-950">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide text-[var(--ecf-text,#102238)] dark:text-white sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-700 dark:text-cyan-300">2.0</span>
            </span>

            <span className="block text-[11px] text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Gestión de clientes
            </span>
          </span>
        </Link>

        {/* NAVEGACIÓN PC */}
        <nav
          aria-label="Navegación del entrenador"
          className="hidden items-center gap-1 xl:flex"
        >
          {navegacion.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={
                enlace.href === "/entrenador/clientes"
                  ? "page"
                  : undefined
              }
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                enlace.href === "/entrenador/clientes"
                  ? "bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {enlace.titulo}
            </Link>
          ))}

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="ml-1 min-h-11 rounded-xl border border-red-400/20 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300 transition hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-red-300"
            >
              Cerrar sesión
            </button>
          </form>
        </nav>

        {/* NAVEGACIÓN CELULAR Y TABLET */}
        <details className="relative shrink-0 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
            Menú
            <span className="text-cyan-700 dark:text-cyan-300">☰</span>
          </summary>

          <nav
            aria-label="Navegación móvil del entrenador"
            className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-slate-200 dark:border-white/15 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#101d31] p-2 shadow-2xl shadow-slate-300/40 dark:shadow-black/50"
          >
            {navegacion.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={
                  enlace.href === "/entrenador/clientes"
                    ? "page"
                    : undefined
                }
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                  enlace.href === "/entrenador/clientes"
                    ? "bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                {enlace.titulo}
              </Link>
            ))}

            <form
              action={cerrarSesion}
              className="border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-2"
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

// PANTALLA DE CARGA
function CargandoClientes() {
  return (
    <main
      role="status"
      className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] p-6 text-[var(--ecf-text,#102238)] dark:text-white"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-6">
        <span className="h-6 w-6 rounded-full border-2 border-slate-300 dark:border-white/20 border-t-cyan-300 motion-safe:animate-spin" />
        <span>Consultando clientes asignados...</span>
      </div>
    </main>
  );
}

// DATO DE PERFIL
function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.035] p-3.5 sm:p-4">
      <dt className="text-xs font-medium text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
        {etiqueta}
      </dt>

      <dd className="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
        {valor}
      </dd>
    </div>
  );
}

// TARJETA PROFESIONAL DEL CLIENTE
function TarjetaCliente({
  cliente,
  numero,
}: {
  cliente: Cliente;
  numero: number;
}) {
  const completo = perfilCompleto(cliente);

  const iniciales =
    cliente.nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0] ?? "")
      .join("")
      .toUpperCase() || "CL";

  return (
    <article className="group min-w-0 rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-[#ffffff] dark:from-[#14253d] to-[#f1f7fd] dark:to-[#101a2d] p-4 shadow-[0_16px_38px_rgba(15,23,42,0.07)] dark:shadow-[0_18px_44px_rgba(0,0,0,0.19)] transition duration-300 motion-safe:hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_20px_46px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_24px_54px_rgba(0,0,0,0.28)] sm:p-6 lg:p-7">
      {/* IDENTIFICACIÓN */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-base font-black text-cyan-800 dark:text-cyan-200 sm:h-14 sm:w-14"
          >
            {iniciales}
          </span>

          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
              Cliente asignado ·{" "}
              {String(numero).padStart(2, "0")}
            </p>

            <h3 className="mt-1 break-words text-xl font-extrabold text-[var(--ecf-text,#102238)] dark:text-white sm:text-2xl">
              {cliente.nombre}
            </h3>

            <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Relación activa con el entrenador
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            completo
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-800 dark:text-emerald-200"
              : "border-amber-400/20 bg-amber-400/10 text-amber-900 dark:text-amber-200"
          }`}
        >
          <Icono
            nombre={completo ? "check" : "alerta"}
            className="h-4 w-4"
          />

          {completo
            ? "Perfil con datos clave"
            : "Perfil por completar"}
        </span>
      </div>

      {/* INFORMACIÓN DEL PERFIL */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Dato
          etiqueta="Objetivo"
          valor={formatear(cliente.objetivo)}
        />

        <Dato
          etiqueta="Experiencia"
          valor={formatear(cliente.experiencia)}
        />

        <Dato
          etiqueta="Frecuencia"
          valor={
            cliente.frecuencia == null
              ? "No registrada"
              : `${cliente.frecuencia} días/semana`
          }
        />

        <Dato
          etiqueta="Tiempo por sesión"
          valor={
            cliente.minutos == null
              ? "No registrado"
              : `${cliente.minutos} minutos`
          }
        />

        <Dato
          etiqueta="Lugar"
          valor={formatear(cliente.lugar)}
        />

        <Dato
          etiqueta="Equipamiento"
          valor={
            cliente.equipamiento.length
              ? cliente.equipamiento
                  .map((e) => formatear(e))
                  .join(", ")
              : "Sin equipamiento registrado"
          }
        />
      </div>

      {!completo && (
        <p className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
          Faltan datos importantes en este perfil.
          La compatibilidad de rutinas puede
          requerir completar la información.
        </p>
      )}

      {/* SEGUIMIENTO */}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-5">
        <Link
          href={`/entrenador/clientes/${cliente.id}/seguimiento`}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_8px_26px_rgba(6,182,212,0.18)] transition duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_12px_32px_rgba(6,182,212,0.25)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 sm:w-auto"
        >
          Ver seguimiento

          <Icono
            nombre="flecha"
            className="h-4 w-4"
          />
        </Link>
      </div>

      {/* MOTOR INTELIGENTE PROTEGIDO */}
      <details className="group/ia mt-5 rounded-2xl border border-violet-400/15 bg-violet-50/80 dark:bg-[#0a1425]/65 open:border-violet-400/30">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-violet-800 dark:text-violet-200 transition hover:bg-violet-400/[0.06] focus-visible:outline-2 focus-visible:outline-violet-300 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span>
            Recomendaciones inteligentes y compatibilidad
          </span>

          <span
            aria-hidden="true"
            className="text-lg transition-transform duration-200 group-open/ia:rotate-45"
          >
            +
          </span>
        </summary>

        <div className="min-w-0 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 p-3 sm:p-5">
          <p className="mb-4 text-xs leading-5 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
            El sistema verificará si la IA está habilitada
            para este participante y esta fase del estudio.
          </p>

          <BotonRecomendarProtegido
            clienteId={cliente.id}
          />
        </div>
      </details>
    </article>
  );
}

// CONSULTAS A SUPABASE Y FILTROS
async function ContenidoClientes({
  searchParams,
}: ParametrosPagina) {
  await connection();

  const supabase = await createClient();

  // 1. VERIFICAR AUTENTICACIÓN
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const entrenadorId = auth?.claims?.sub;

  if (authError || !entrenadorId) {
    redirect("/login");
  }

  // 2. VERIFICAR ROL
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .single();

  if (accesoError || acceso?.rol !== "entrenador") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] px-6 text-center text-[var(--ecf-text,#102238)] dark:text-white">
        <Icono
          nombre="escudo"
          className="h-10 w-10 text-red-700 dark:text-red-300"
        />

        <h1 className="text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="max-w-md text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
          Esta sección es exclusiva para
          entrenadores autorizados.
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950"
        >
          Volver al inicio de sesión
        </Link>
      </main>
    );
  }

  // 3. LEER FILTROS
  const parametros = await searchParams;

  const busqueda =
    typeof parametros?.q === "string"
      ? parametros.q.trim().slice(0, 80)
      : "";

  const filtro =
    parametros?.filtro === "completos" ||
    parametros?.filtro === "incompletos"
      ? parametros.filtro
      : "todos";

  const orden =
    parametros?.orden === "frecuencia"
      ? "frecuencia"
      : "nombre";

  // 4. CONSULTAR CLIENTES ACTIVOS
  const {
    data: asignaciones,
    error: errorAsignaciones,
  } = await supabase
    .from("asignaciones_entrenadores")
    .select("cliente_id")
    .eq("entrenador_id", entrenadorId)
    .eq("activa", true);

  const ids = [
    ...new Set(
      (asignaciones ?? []).map(
        (asignacion) => asignacion.cliente_id
      )
    ),
  ];

  let clientes: Cliente[] = [];
  let errorDatos = "";

  if (errorAsignaciones) {
    errorDatos =
      "No se pudieron consultar los clientes asignados.";
  } else if (ids.length > 0) {
    const [usuarios, perfiles] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id,nombre_completo")
        .in("id", ids),

      supabase
        .from("perfiles_clientes")
        .select(
          "usuario_id,objetivo,experiencia,frecuencia_semanal,minutos_por_sesion,lugar,equipamiento"
        )
        .in("usuario_id", ids),
    ]);

    if (usuarios.error || perfiles.error) {
      errorDatos =
        "No se pudieron consultar los perfiles. Revisa los permisos de lectura en Supabase.";
    } else {
      const nombres = new Map(
        (usuarios.data ?? []).map((usuario) => [
          usuario.id,
          usuario.nombre_completo,
        ])
      );

      const perfilesPorId = new Map(
        (perfiles.data ?? []).map((perfil) => [
          perfil.usuario_id,
          perfil,
        ])
      );

      clientes = ids.map((id) => {
        const perfil = perfilesPorId.get(id);

        return {
          id,
          nombre:
            nombres.get(id) ?? "Nombre no disponible",
          objetivo: perfil?.objetivo ?? null,
          experiencia: perfil?.experiencia ?? null,
          frecuencia:
            perfil?.frecuencia_semanal ?? null,
          minutos: perfil?.minutos_por_sesion ?? null,
          lugar: perfil?.lugar ?? null,
          equipamiento: perfil?.equipamiento ?? [],
        };
      });
    }
  }

  // 5. CALCULAR RESUMEN
  const completos =
    clientes.filter(perfilCompleto).length;

  const incompletos =
    clientes.length - completos;

  // 6. FILTRAR Y ORDENAR
  const termino = normalizar(busqueda);

  const visibles = clientes
    .filter((cliente) => {
      const coincideTexto =
        !termino ||
        normalizar(
          [
            cliente.nombre,
            cliente.objetivo ?? "",
            cliente.experiencia ?? "",
          ].join(" ")
        ).includes(termino);

      const coincidePerfil =
        filtro === "todos" ||
        (filtro === "completos"
          ? perfilCompleto(cliente)
          : !perfilCompleto(cliente));

      return coincideTexto && coincidePerfil;
    })
    .sort((a, b) =>
      orden === "frecuencia"
        ? (b.frecuencia ?? -1) -
            (a.frecuencia ?? -1) ||
          a.nombre.localeCompare(b.nombre, "es")
        : a.nombre.localeCompare(b.nombre, "es")
    );

  // 7. INTERFAZ
  return (
    <main className="relative min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] text-[var(--ecf-text,#102238)] dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-cyan-500/[0.055] to-transparent"
      />

      <Cabecera />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        {/* ENCABEZADO */}
        <section className="overflow-hidden rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-[#e7f7fe] dark:from-[#122a42] via-[#f8fbff] dark:via-[#121e33] to-[#eef0ff] dark:to-[#1b1838] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-200">
                <Icono
                  nombre="usuarios"
                  className="h-4 w-4"
                />
                Gestión del entrenador
              </p>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Mis clientes{" "}
                <span className="text-cyan-700 dark:text-cyan-300">
                  asignados
                </span>
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
                Consulta los perfiles, accede a su
                seguimiento y utiliza recomendaciones
                inteligentes cuando las reglas del
                estudio lo permitan.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/entrenador"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 px-5 py-3 text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white transition hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                Volver al panel
              </Link>

              <Link
                href="/entrenador/investigacion"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                Ver investigación
              </Link>
            </div>
          </div>
        </section>

        {/* INDICADORES */}
        <section
          aria-label="Resumen de clientes"
          className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {[
            {
              nombre: "Clientes activos",
              valor: errorDatos
                ? "—"
                : String(clientes.length),
              color: "text-cyan-700 dark:text-cyan-300",
            },
            {
              nombre: "Con datos clave",
              valor: errorDatos
                ? "—"
                : String(completos),
              color: "text-emerald-700 dark:text-emerald-300",
            },
            {
              nombre: "Por completar",
              valor: errorDatos
                ? "—"
                : String(incompletos),
              color: "text-amber-800 dark:text-amber-300",
            },
          ].map((dato) => (
            <div
              key={dato.nombre}
              className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.16)] sm:p-6"
            >
              <p className="text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                {dato.nombre}
              </p>

              <p
                className={`mt-2 text-3xl font-extrabold tabular-nums ${dato.color}`}
              >
                {dato.valor}
              </p>
            </div>
          ))}
        </section>

        {/* DIRECTORIO */}
        <section
          className="mt-10"
          aria-labelledby="titulo-listado"
        >
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
              Directorio
            </p>

            <h2
              id="titulo-listado"
              className="mt-2 text-2xl font-bold sm:text-3xl"
            >
              Perfiles y seguimiento
            </h2>

            <p className="mt-2 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Busca por nombre, objetivo o experiencia.
              Los filtros no modifican los datos.
            </p>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <form
            action="/entrenador/clientes"
            method="GET"
            role="search"
            className="grid gap-3 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#101a2d] p-4 shadow-xl shadow-slate-300/30 dark:shadow-black/10 sm:p-5 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto] lg:items-end"
          >
            <div className="min-w-0">
              <label
                htmlFor="busqueda-clientes"
                className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Buscar cliente
              </label>

              <div className="relative">
                <Icono
                  nombre="buscar"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ecf-muted,#64748b)] dark:text-slate-400"
                />

                <input
                  id="busqueda-clientes"
                  name="q"
                  type="search"
                  maxLength={80}
                  defaultValue={busqueda}
                  placeholder="Nombre, objetivo o nivel..."
                  className="min-h-12 w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0b1526] py-3 pl-11 pr-3 text-sm text-[var(--ecf-text,#102238)] dark:text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="filtro-clientes"
                className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Estado del perfil
              </label>

              <select
                id="filtro-clientes"
                name="filtro"
                defaultValue={filtro}
                className="min-h-12 w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0b1526] px-3 text-sm text-[var(--ecf-text,#102238)] dark:text-white focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
              >
                <option value="todos">Todos</option>
                <option value="completos">
                  Con datos clave
                </option>
                <option value="incompletos">
                  Por completar
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="orden-clientes"
                className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Ordenar por
              </label>

              <select
                id="orden-clientes"
                name="orden"
                defaultValue={orden}
                className="min-h-12 w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0b1526] px-3 text-sm text-[var(--ecf-text,#102238)] dark:text-white focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
              >
                <option value="nombre">
                  Nombre (A-Z)
                </option>
                <option value="frecuencia">
                  Mayor frecuencia
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-cyan-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              <Icono
                nombre="buscar"
                className="h-4 w-4"
              />
              Aplicar
            </button>
          </form>

          {/* CANTIDAD VISIBLE */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p
              className="text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400"
              role="status"
            >
              {errorDatos
                ? "Consulta no disponible"
                : `${visibles.length} de ${clientes.length} clientes visibles`}
            </p>

            {(busqueda ||
              filtro !== "todos" ||
              orden !== "nombre") && (
              <Link
                href="/entrenador/clientes"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-400/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                Limpiar filtros
              </Link>
            )}
          </div>

          {/* LISTADO */}
          <div className="mt-5 space-y-5">
            {errorDatos ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-400/25 bg-red-400/10 p-6 text-sm leading-6 text-red-800 dark:text-red-200"
              >
                {errorDatos}
              </div>
            ) : clientes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/15 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-9 text-center">
                <Icono
                  nombre="usuarios"
                  className="mx-auto h-10 w-10 text-slate-600 dark:text-slate-500"
                />

                <h3 className="mt-4 text-xl font-bold">
                  Todavía no hay clientes asignados
                </h3>

                <p className="mt-2 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  Cuando tengas relaciones activas
                  aparecerán aquí sus perfiles.
                </p>
              </div>
            ) : visibles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/15 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-9 text-center">
                <Icono
                  nombre="buscar"
                  className="mx-auto h-10 w-10 text-slate-600 dark:text-slate-500"
                />

                <h3 className="mt-4 text-xl font-bold">
                  Sin coincidencias
                </h3>

                <p className="mt-2 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  Prueba otra búsqueda o elimina
                  los filtros.
                </p>

                <Link
                  href="/entrenador/clientes"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-slate-200 dark:border-white/15 px-5 text-sm font-semibold text-cyan-700 dark:text-cyan-300"
                >
                  Mostrar todos
                </Link>
              </div>
            ) : (
              visibles.map((cliente, i) => (
                <TarjetaCliente
                  key={cliente.id}
                  cliente={cliente}
                  numero={i + 1}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <footer className="relative border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 px-4 py-7 text-center text-xs text-slate-600 dark:text-slate-500">
        Evolution Center Fit 2.0 ·
        Gestión del entrenador
      </footer>
    </main>
  );
}

export default function ClientesEntrenadorPage({
  searchParams,
}: ParametrosPagina) {
  return (
    <Suspense fallback={<CargandoClientes />}>
      <ContenidoClientes
        searchParams={searchParams}
      />
    </Suspense>
  );
}
