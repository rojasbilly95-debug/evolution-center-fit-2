import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";
import { clientePrivadoSupabase } from "@/lib/perfil/verificacion";

import FotoCliente from "./foto-cliente";

// ======================================================
// EVOLUTION CENTER FIT 2.0
// GESTIÓN DE CLIENTES DEL ENTRENADOR
// ======================================================

type Cliente = {
  id: string;
  nombre: string;
  objetivo: string | null;
  experiencia: string | null;
  frecuencia: number | null;
  minutos: number | null;
  lugar: string | null;
  equipamiento: string[];
  fotoUrl: string | null;
};

type ParametrosPagina = {
  searchParams?: Promise<{
    q?: string;
    filtro?: string;
    orden?: string;
  }>;
};

const navegacion = [
  {
    titulo: "Inicio",
    href: "/entrenador",
  },
  {
    titulo: "Mis clientes",
    href: "/entrenador/clientes",
  },
  {
    titulo: "Investigación",
    href: "/entrenador/investigacion",
  },
  {
    titulo: "Reportes",
    href: "/entrenador/investigacion/reporte",
  },
  {
    titulo: "Catálogo",
    href: "/catalogo",
  },
];

// ======================================================
// UTILIDADES
// ======================================================

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tieneDatosClave(cliente: Cliente) {
  return Boolean(
    cliente.objetivo &&
      cliente.experiencia &&
      cliente.frecuencia != null &&
      cliente.minutos != null &&
      cliente.lugar
  );
}

// ======================================================
// ICONOS
// ======================================================

function Icono({
  nombre,
  className = "h-5 w-5",
}: {
  nombre: "usuarios" | "buscar" | "flecha" | "escudo";
  className?: string;
}) {
  const trazos = {
    usuarios: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
        <path d="M16 5a3 3 0 0 1 0 6" />
        <path d="M18 14a5 5 0 0 1 3 5v1" />
      </>
    ),

    buscar: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),

    flecha: (
      <path d="M5 12h14m-6-6 6 6-6 6" />
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
      {trazos[nombre]}
    </svg>
  );
}

// ======================================================
// CABECERA
// ======================================================

function Cabecera() {
  return (
    <header className="relative z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0c1526]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

        <Link
          href="/entrenador"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-slate-950">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide text-slate-900 dark:text-white sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-700 dark:text-cyan-300">
                2.0
              </span>
            </span>

            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Gestión de clientes
            </span>
          </span>
        </Link>

        {/* NAVEGACIÓN DE ESCRITORIO */}

        <nav
          aria-label="Navegación del entrenador"
          className="hidden items-center gap-1 xl:flex"
        >
          {navegacion.map((enlace) => {
            const activo =
              enlace.href === "/entrenador/clientes";

            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  activo
                    ? "bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {enlace.titulo}
              </Link>
            );
          })}

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="ml-1 min-h-11 rounded-xl border border-red-400/20 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-400/10 dark:text-red-300"
            >
              Cerrar sesión
            </button>
          </form>
        </nav>

        {/* NAVEGACIÓN MÓVIL */}

        <details className="relative shrink-0 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-white [&::-webkit-details-marker]:hidden">
            Menú
            <span className="text-cyan-600">
              ☰
            </span>
          </summary>

          <nav
            aria-label="Navegación móvil"
            className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/15 dark:bg-[#101d31]"
          >
            {navegacion.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={`block rounded-xl px-4 py-3 text-sm font-semibold ${
                  enlace.href === "/entrenador/clientes"
                    ? "bg-cyan-400/10 text-cyan-700 dark:text-cyan-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                }`}
              >
                {enlace.titulo}
              </Link>
            ))}

            <form
              action={cerrarSesion}
              className="border-t border-slate-200 pt-2 dark:border-white/10"
            >
              <button
                type="submit"
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-400/10 dark:text-red-300"
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

// ======================================================
// PANTALLA DE CARGA
// ======================================================

function CargandoClientes() {
  return (
    <main
      role="status"
      className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-[#080d1a] dark:text-white"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111d31]">
        <span className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-cyan-400 motion-safe:animate-spin dark:border-white/20 dark:border-t-cyan-300" />

        <span>
          Consultando clientes asignados...
        </span>
      </div>
    </main>
  );
}

// ======================================================
// TARJETA COMPACTA DEL CLIENTE
// FOTO + NOMBRE + ABRIR SEGUIMIENTO
// ======================================================

function TarjetaCliente({
  cliente,
}: {
  cliente: Cliente;
}) {
  return (
    <article className="group flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:border-cyan-400/40 hover:shadow-xl dark:border-white/10 dark:bg-[#14243b] dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between sm:p-6">

      {/* IDENTIDAD DEL CLIENTE */}

      <div className="flex min-w-0 items-center gap-4">

        {/* FOTO REAL O AVATAR DE RESPALDO */}

        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-cyan-400/30 bg-cyan-400/10 sm:h-20 sm:w-20">
          <FotoCliente
            nombre={cliente.nombre}
            fotoUrl={cliente.fotoUrl}
          />
        </div>

        {/* NOMBRE */}

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            Cliente asignado
          </p>

          <h3 className="mt-1 break-words text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {cliente.nombre}
          </h3>
        </div>
      </div>

      {/* SEGUIMIENTO EN VENTANA MODAL */}

      <Link
        href={`/entrenador/clientes/${cliente.id}/seguimiento`}
        scroll={false}
        aria-label={`Abrir seguimiento de ${cliente.nombre}`}
        className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-900/10 transition-all duration-200 hover:bg-cyan-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:w-auto"
      >
        Abrir seguimiento

        <Icono
          nombre="flecha"
          className="h-4 w-4"
        />
      </Link>

    </article>
  );
}

// ======================================================
// CONSULTAR CLIENTES Y FOTOGRAFÍAS
// ======================================================

async function ContenidoClientes({
  searchParams,
}: ParametrosPagina) {
  await connection();

  const supabase = await createClient();

  // 1. AUTENTICACIÓN

  const {
    data: auth,
    error: authError,
  } = await supabase.auth.getClaims();

  const entrenadorId = auth?.claims?.sub;

  if (authError || !entrenadorId) {
    redirect("/login");
  }

  // 2. COMPROBAR ROL DEL ENTRENADOR

  const {
    data: roles,
    error: errorRoles,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", entrenadorId)
    .eq("rol", "entrenador")
    .limit(1);

  if (errorRoles || !roles?.length) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50 px-6 text-center text-slate-900 dark:bg-[#080d1a] dark:text-white">

        <Icono
          nombre="escudo"
          className="h-10 w-10 text-red-500"
        />

        <h1 className="text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="max-w-md text-slate-500 dark:text-slate-400">
          Esta sección es exclusiva para entrenadores autorizados.
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

  // 3. FILTROS

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

  // 4. CLIENTES ASIGNADOS AL ENTRENADOR

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

    // 5. OBTENER USUARIOS Y PERFILES

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
            nombres.get(id) ??
            "Nombre no disponible",

          objetivo:
            perfil?.objetivo ?? null,

          experiencia:
            perfil?.experiencia ?? null,

          frecuencia:
            perfil?.frecuencia_semanal ?? null,

          minutos:
            perfil?.minutos_por_sesion ?? null,

          lugar:
            perfil?.lugar ?? null,

          equipamiento:
            perfil?.equipamiento ?? [],

          fotoUrl: null,
        };
      });
    }
  }

  // ====================================================
  // 6. FOTOGRAFÍAS PRIVADAS
  // ====================================================
  //
  // Solo se solicitan fotografías de clientes que
  // ya tienen relación activa con este entrenador.
  //
  // La clave privada permanece en el servidor.
  // Las URLs firmadas caducan a los 180 segundos.
  //
  // Si una foto no existe, se muestra el avatar.
  // ====================================================

  if (!errorDatos && clientes.length > 0) {
    try {
      const admin = clientePrivadoSupabase();

      const rutas = clientes.map(
        (cliente) => `${cliente.id}/perfil.webp`
      );

      const {
        data: fotografias,
        error: errorFotografias,
      } = await admin.storage
        .from("fotos-perfil")
        .createSignedUrls(rutas, 180);

      if (errorFotografias) {
        console.error(
          "No se pudieron consultar las fotografías:",
          errorFotografias
        );
      } else if (fotografias) {
        clientes = clientes.map((cliente, indice) => ({
          ...cliente,
          fotoUrl:
            fotografias[indice]?.signedUrl ?? null,
        }));
      }
    } catch (error) {
      console.error(
        "Error obteniendo las fotografías de clientes:",
        error
      );
    }
  }

  // ====================================================
  // 7. RESUMEN
  // ====================================================

  const completos = clientes.filter(
    tieneDatosClave
  ).length;

  const incompletos = clientes.length - completos;

  // ====================================================
  // 8. BÚSQUEDA Y ORDENAMIENTO
  // ====================================================

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
          ? tieneDatosClave(cliente)
          : !tieneDatosClave(cliente));

      return coincideTexto && coincidePerfil;
    })
    .sort((a, b) => {
      if (orden === "frecuencia") {
        return (
          (b.frecuencia ?? -1) -
            (a.frecuencia ?? -1) ||
          a.nombre.localeCompare(b.nombre, "es")
        );
      }

      return a.nombre.localeCompare(b.nombre, "es");
    });

  // ====================================================
  // 9. INTERFAZ DEL ENTRENADOR
  // ====================================================

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080d1a] dark:text-white">

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-cyan-500/[0.055] to-transparent"
      />

      <Cabecera />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-7 sm:px-6 lg:px-8">

        {/* ENCABEZADO */}

        <section className="overflow-hidden rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-[#e7f7fe] via-[#f8fbff] to-[#eef0ff] p-5 shadow-xl dark:from-[#122a42] dark:via-[#121e33] dark:to-[#1b1838] sm:p-8 lg:p-10">

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
                Consulta a tus clientes asignados y abre
                su seguimiento sin abandonar esta página.
                Los datos del perfil y las recomendaciones
                continúan sujetos a las verificaciones
                correspondientes.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <Link
                href="/entrenador"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white/60 px-5 py-3 text-sm font-semibold dark:border-white/20 dark:bg-white/5"
              >
                Volver al panel
              </Link>

              <Link
                href="/entrenador/investigacion"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
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
              color:
                "text-cyan-700 dark:text-cyan-300",
            },
            {
              nombre: "Con datos clave",
              valor: errorDatos
                ? "—"
                : String(completos),
              color:
                "text-emerald-700 dark:text-emerald-300",
            },
            {
              nombre: "Por completar",
              valor: errorDatos
                ? "—"
                : String(incompletos),
              color:
                "text-amber-700 dark:text-amber-300",
            },
          ].map((dato) => (
            <div
              key={dato.nombre}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 dark:border-white/10 dark:bg-[#111d31] sm:p-6"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {dato.nombre}
              </p>

              <p className={`mt-2 text-3xl font-extrabold tabular-nums ${dato.color}`}>
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
              Clientes y seguimiento
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Cada tarjeta muestra únicamente el
              nombre y la fotografía del cliente.
              Abre su seguimiento para consultar
              información adicional.
            </p>

          </div>

          {/* BUSCADOR Y FILTROS */}

          <form
            action="/entrenador/clientes"
            method="GET"
            role="search"
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-[#101a2d] sm:p-5 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto] lg:items-end"
          >

            {/* BÚSQUEDA */}

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
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="busqueda-clientes"
                  name="q"
                  type="search"
                  maxLength={80}
                  defaultValue={busqueda}
                  placeholder="Nombre, objetivo o nivel..."
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-white/15 dark:bg-[#0b1526] dark:text-white"
                />

              </div>
            </div>

            {/* FILTRO */}

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
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0b1526] dark:text-white"
              >
                <option value="todos">
                  Todos
                </option>

                <option value="completos">
                  Con datos clave
                </option>

                <option value="incompletos">
                  Por completar
                </option>
              </select>

            </div>

            {/* ORDEN */}

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
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0b1526] dark:text-white"
              >
                <option value="nombre">
                  Nombre (A-Z)
                </option>

                <option value="frecuencia">
                  Mayor frecuencia
                </option>
              </select>

            </div>

            {/* APLICAR */}

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
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
              role="status"
              className="text-sm text-slate-500 dark:text-slate-400"
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
                className="rounded-lg px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-400/10 dark:text-cyan-300"
              >
                Limpiar filtros
              </Link>
            )}

          </div>

          {/* LISTADO DE CLIENTES */}

          <div className="mt-5 space-y-5">

            {errorDatos ? (

              <div
                role="alert"
                className="rounded-2xl border border-red-400/25 bg-red-400/10 p-6 text-sm leading-6 text-red-700 dark:text-red-200"
              >
                {errorDatos}
              </div>

            ) : clientes.length === 0 ? (

              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-9 text-center dark:border-white/15 dark:bg-[#111d31]">

                <Icono
                  nombre="usuarios"
                  className="mx-auto h-10 w-10 text-slate-400"
                />

                <h3 className="mt-4 text-xl font-bold">
                  Todavía no hay clientes asignados
                </h3>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Cuando tengas relaciones activas,
                  sus perfiles aparecerán aquí.
                </p>

              </div>

            ) : visibles.length === 0 ? (

              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-9 text-center dark:border-white/15 dark:bg-[#111d31]">

                <Icono
                  nombre="buscar"
                  className="mx-auto h-10 w-10 text-slate-400"
                />

                <h3 className="mt-4 text-xl font-bold">
                  Sin coincidencias
                </h3>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Prueba otra búsqueda o elimina los filtros.
                </p>

                <Link
                  href="/entrenador/clientes"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-cyan-700 dark:border-white/15 dark:text-cyan-300"
                >
                  Mostrar todos
                </Link>

              </div>

            ) : (

              visibles.map((cliente) => (
                <TarjetaCliente
                  key={cliente.id}
                  cliente={cliente}
                />
              ))

            )}

          </div>

        </section>

      </div>

      <footer className="relative border-t border-slate-200 px-4 py-7 text-center text-xs text-slate-500 dark:border-white/10">
        Evolution Center Fit 2.0 · Gestión del entrenador
      </footer>

    </main>
  );
}

// ======================================================
// PÁGINA PRINCIPAL
// ======================================================

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