
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  createClient as crearClientePrivilegiado,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// ================================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.9 - GESTION DE USUARIOS
// Consulta segura, filtros y asignaciones.
// ================================================

type Parametros = {
  q?: string;
  rol?: string;
  pagina?: string;
};

type Props = {
  searchParams: Promise<Parametros>;
};

type Usuario = {
  id: string;
  nombre_completo: string;
  creado_en: string;
};

type UsuarioRol = {
  usuario_id: string;
  rol: string;
};

type Asignacion = {
  cliente_id: string;
  entrenador_id: string;
  activa: boolean;
  asignado_en: string;
};

type Registro = Usuario & {
  rol: string;
  entrenador: string | null;
  asignacionActiva: boolean;
  clientesAsignados: number;
};

const LIMITE_CONSULTA = 500;
const POR_PAGINA = 10;

// ================================================
// FUNCIONES AUXILIARES
// ================================================

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function etiquetaRol(rol: string) {
  const etiquetas: Record<string, string> = {
    cliente: "Cliente",
    entrenador: "Entrenador",
    administrador: "Administrador",
  };

  return etiquetas[rol] || "Sin rol";
}

function formatoFecha(fecha: string) {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "No disponible";
  }

  return valor.toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function coloresRol(rol: string) {
  switch (rol) {
    case "administrador":
      return "border-violet-200 dark:border-violet-400/25 bg-violet-50 dark:bg-violet-400/10 text-violet-700 dark:text-violet-200";
    case "entrenador":
      return "border-cyan-200 dark:border-cyan-400/25 bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-200";
    case "cliente":
      return "border-emerald-200 dark:border-emerald-400/25 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-200";
    default:
      return "border-[var(--ecf-border)] dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300";
  }
}

function Resumen({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <article className="rounded-2xl border border-[var(--ecf-border)] dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-[#1a304b] dark:to-[#101d31] p-5 shadow-lg shadow-slate-200/70 dark:shadow-black/10">
      <p className="text-xs font-semibold text-[var(--ecf-muted)] dark:text-slate-400">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black tabular-nums text-[var(--ecf-text)] dark:text-white">
        {new Intl.NumberFormat("es-PE").format(valor)}
      </p>
    </article>
  );
}

function EstadoCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg)] dark:bg-[#080e1b] text-cyan-800 dark:text-cyan-200">
      Cargando gestión de usuarios...
    </main>
  );
}

// ================================================
// CONTENIDO PROTEGIDO
// ================================================

async function ContenidoUsuarios({
  searchParams,
}: Props) {
  // Datos dinamicos dentro de Suspense.
  await connection();

  const parametros = await searchParams;

  const busqueda = (
    typeof parametros.q === "string"
      ? parametros.q
      : ""
  ).trim().slice(0, 60);

  const rolesPermitidos = [
    "todos",
    "cliente",
    "entrenador",
    "administrador",
  ];

  const rolSolicitado =
    typeof parametros.rol === "string"
      ? parametros.rol
      : "todos";

  const filtroRol = rolesPermitidos.includes(
    rolSolicitado
  )
    ? rolSolicitado
    : "todos";

  const numeroPagina = Number(parametros.pagina);

  const paginaSolicitada =
    Number.isSafeInteger(numeroPagina) &&
    numeroPagina > 0
      ? Math.min(numeroPagina, 1000)
      : 1;

  // ==============================================
  // 1. VERIFICAR SESION
  // ==============================================

  const supabase = await createClient();

  const { data: identidad, error: errorIdentidad } =
    await supabase.auth.getClaims();

  const usuarioId = identidad?.claims?.sub;

  if (errorIdentidad || !usuarioId) {
    redirect("/login");
  }

  // ==============================================
  // 2. VERIFICAR ROL ADMINISTRADOR
  // ==============================================

  const { data: rolActual, error: errorRol } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

  if (
    errorRol ||
    rolActual?.rol !== "administrador"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg)] dark:bg-[#080e1b] p-6 text-[var(--ecf-text)] dark:text-white">
        <section className="max-w-md rounded-2xl border border-rose-200 dark:border-rose-400/20 bg-rose-50 dark:bg-rose-400/10 p-8 text-center">
          <h1 className="text-2xl font-bold">
            Acceso restringido
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            No tienes autorización para consultar
            las cuentas del gimnasio.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-block font-semibold text-cyan-700 dark:text-cyan-300"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  // ==============================================
  // 3. CONFIGURACION PRIVADA DEL SERVIDOR
  // ==============================================

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg)] dark:bg-[#080e1b] p-6 text-[var(--ecf-text)] dark:text-white">
        <Link
          href="/administrador"
          className="text-sm font-bold text-cyan-700 dark:text-cyan-300"
        >
          ← Volver al administrador
        </Link>

        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 p-6">
          <h1 className="text-xl font-bold">
            Configuración pendiente
          </h1>

          <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
            No están disponibles las credenciales
            privadas de consulta en el servidor.
            No se mostrarán datos ficticios.
          </p>
        </div>
      </main>
    );
  }

  // Nunca se utiliza este cliente en el navegador.
  // La autorizacion se verifico previamente.
  const admin = crearClientePrivilegiado(
    url,
    clave,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // ==============================================
  // 4. CONSULTAS REALES
  // ==============================================

  const [
    respuestaUsuarios,
    respuestaRoles,
    respuestaAsignaciones,
  ] = await Promise.all([
    admin
      .from("usuarios")
      .select(
        "id,nombre_completo,creado_en",
        { count: "exact" }
      )
      .order("creado_en", {
        ascending: false,
      })
      .limit(LIMITE_CONSULTA),

    admin
      .from("usuario_roles")
      .select("usuario_id,rol")
      .limit(LIMITE_CONSULTA),

    admin
      .from("asignaciones_entrenadores")
      .select(
        "cliente_id,entrenador_id,activa,asignado_en"
      )
      .limit(LIMITE_CONSULTA),
  ]);

  const errorConsulta = Boolean(
    respuestaUsuarios.error ||
    respuestaRoles.error ||
    respuestaAsignaciones.error
  );

  if (errorConsulta) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg)] dark:bg-[#080e1b] p-6 text-[var(--ecf-text)] dark:text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/administrador"
            className="text-sm font-bold text-cyan-700 dark:text-cyan-300"
          >
            ← Volver al administrador
          </Link>

          <div
            role="alert"
            className="mt-8 rounded-2xl border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 p-6"
          >
            <h1 className="text-xl font-bold">
              No se pudieron cargar los usuarios
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Revisa la conexión y los permisos
              del servidor de Supabase.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const usuarios =
    (respuestaUsuarios.data ?? []) as Usuario[];

  const roles =
    (respuestaRoles.data ?? []) as UsuarioRol[];

  const asignaciones =
    (respuestaAsignaciones.data ?? []) as Asignacion[];

  // ==============================================
  // 5. RELACIONAR USUARIOS Y ROLES
  // ==============================================

  const nombres = new Map(
    usuarios.map((usuario) => [
      usuario.id,
      usuario.nombre_completo,
    ])
  );

  const mapaRoles = new Map(
    roles.map((registro) => [
      registro.usuario_id,
      registro.rol,
    ])
  );

  const asignacionesPorCliente = new Map(
    asignaciones.map((asignacion) => [
      asignacion.cliente_id,
      asignacion,
    ])
  );

  const clientesPorEntrenador =
    new Map<string, number>();

  for (const asignacion of asignaciones) {
    if (!asignacion.activa) continue;

    const anterior =
      clientesPorEntrenador.get(
        asignacion.entrenador_id
      ) ?? 0;

    clientesPorEntrenador.set(
      asignacion.entrenador_id,
      anterior + 1
    );
  }

  const registros: Registro[] =
    usuarios.map((usuario) => {
      const rol =
        mapaRoles.get(usuario.id) ??
        "sin_rol";

      const relacion =
        asignacionesPorCliente.get(usuario.id);

      const entrenador =
        relacion
          ? nombres.get(
              relacion.entrenador_id
            ) ?? "Entrenador no disponible"
          : null;

      return {
        ...usuario,
        rol,
        entrenador,
        asignacionActiva:
          relacion?.activa ?? false,
        clientesAsignados:
          clientesPorEntrenador.get(
            usuario.id
          ) ?? 0,
      };
    });

  // ==============================================
  // 6. RESUMEN DE USUARIOS
  // ==============================================

  const totalRegistrado =
    respuestaUsuarios.count ?? usuarios.length;

  const totalClientes = registros.filter(
    (usuario) => usuario.rol === "cliente"
  ).length;

  const totalEntrenadores = registros.filter(
    (usuario) => usuario.rol === "entrenador"
  ).length;

  const totalAdministradores = registros.filter(
    (usuario) => usuario.rol === "administrador"
  ).length;

  // ==============================================
  // 7. BUSQUEDA Y FILTROS
  // ==============================================

  const registrosFiltrados =
    registros.filter((usuario) => {
      const coincideNombre =
        !busqueda ||
        normalizar(
          usuario.nombre_completo
        ).includes(normalizar(busqueda));

      const coincideRol =
        filtroRol === "todos" ||
        usuario.rol === filtroRol;

      return coincideNombre && coincideRol;
    });

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      registrosFiltrados.length / POR_PAGINA
    )
  );

  const paginaActual = Math.min(
    paginaSolicitada,
    totalPaginas
  );

  const inicio =
    (paginaActual - 1) * POR_PAGINA;

  const registrosPagina =
    registrosFiltrados.slice(
      inicio,
      inicio + POR_PAGINA
    );

  function enlacePagina(pagina: number) {
    const params = new URLSearchParams();

    if (busqueda) {
      params.set("q", busqueda);
    }

    if (filtroRol !== "todos") {
      params.set("rol", filtroRol);
    }

    params.set("pagina", String(pagina));

    return (
      "/administrador/usuarios?" +
      params.toString()
    );
  }

  const vistaParcial =
    totalRegistrado > LIMITE_CONSULTA;

  // ==============================================
  // 8. INTERFAZ
  // ==============================================

  return (
    <main className="ecf-role-admin min-h-screen bg-[var(--ecf-bg)] dark:bg-[#080e1b] text-[var(--ecf-text)] dark:text-white">
      {/* CABECERA */}
      <header className="border-b border-[var(--ecf-border)] dark:border-white/10 bg-[var(--ecf-surface)] dark:bg-[#101d31]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link
            href="/administrador"
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-[#07121e]">
              E
            </span>

            <span>
              <span className="block text-sm font-black">
                EVOLUTION CENTER FIT{" "}
                <span className="text-cyan-700 dark:text-cyan-300">
                  2.0
                </span>
              </span>

              <span className="text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                Administración de usuarios
              </span>
            </span>
          </Link>

          <Link
            href="/administrador"
            className="rounded-xl border border-[var(--ecf-border)] dark:border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-white/10"
          >
            ← Volver al panel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {/* PRESENTACION */}
        <section className="rounded-3xl border border-cyan-200 dark:border-cyan-400/15 bg-gradient-to-br from-[#e4f7fb] via-[#f8fbff] to-[#f0ecff] dark:from-[#17344a] dark:via-[#14263d] dark:to-[#201b3d] p-6 shadow-xl shadow-slate-200/70 dark:shadow-black/20 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            Gestión administrativa
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Gestión de usuarios
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Consulta las cuentas del gimnasio,
            identifica sus roles y revisa las
            relaciones con los entrenadores.
          </p>

          <span className="mt-5 inline-flex rounded-full border border-cyan-200 dark:border-cyan-400/25 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-800 dark:text-cyan-200">
            Consulta autorizada · Solo lectura
          </span>
          <Link
            href="/administrador/usuarios/nuevo"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] transition hover:bg-cyan-300"
          >
            + Invitar nuevo usuario
          </Link>
        </section>

        {/* ESTADISTICAS */}
        <section>
          <h2 className="text-xl font-extrabold">
            Resumen de cuentas
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Resumen
              titulo="Usuarios registrados"
              valor={totalRegistrado}
            />

            <Resumen
              titulo="Clientes consultados"
              valor={totalClientes}
            />

            <Resumen
              titulo="Entrenadores consultados"
              valor={totalEntrenadores}
            />

            <Resumen
              titulo="Administradores consultados"
              valor={totalAdministradores}
            />
          </div>

          {vistaParcial && (
            <p className="mt-3 rounded-xl border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 p-4 text-xs text-amber-800 dark:text-amber-200">
              Hay más de {LIMITE_CONSULTA} usuarios.
              Los filtros y recuentos por rol solo
              incluyen los primeros registros consultados.
              Se requiere paginación de base de datos
              para mostrar todos.
            </p>
          )}
        </section>

        {/* BUSQUEDA Y FILTROS */}
        <section className="rounded-3xl border border-[var(--ecf-border)] dark:border-white/10 bg-[var(--ecf-surface)] dark:bg-[#112039] p-5 sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
              Directorio
            </p>

            <h2 className="mt-2 text-2xl font-extrabold">
              Buscar y filtrar usuarios
            </h2>

            <p className="mt-2 text-sm text-[var(--ecf-muted)] dark:text-slate-400">
              Encuentra las cuentas registradas
              y revisa sus funciones.
            </p>
          </div>

          <form
            action="/administrador/usuarios"
            method="get"
            className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]"
          >
            <div>
              <label
                htmlFor="buscar-usuarios"
                className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Nombre del usuario
              </label>

              <input
                id="buscar-usuarios"
                name="q"
                type="search"
                maxLength={60}
                defaultValue={busqueda}
                placeholder="Escribe un nombre..."
                className="min-h-12 w-full rounded-xl border border-[var(--ecf-border)] dark:border-white/15 bg-slate-50 dark:bg-[#081526] px-4 py-3 text-sm text-[var(--ecf-text)] dark:text-white outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="rol-usuarios"
                className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Filtrar por rol
              </label>

              <select
                id="rol-usuarios"
                name="rol"
                defaultValue={filtroRol}
                className="min-h-12 w-full rounded-xl border border-[var(--ecf-border)] dark:border-white/15 bg-slate-50 dark:bg-[#081526] px-4 py-3 text-sm text-[var(--ecf-text)] dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
              >
                <option value="todos">
                  Todos los roles
                </option>

                <option value="cliente">
                  Clientes
                </option>

                <option value="entrenador">
                  Entrenadores
                </option>

                <option value="administrador">
                  Administradores
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="min-h-12 self-end rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] transition hover:bg-cyan-300"
            >
              Aplicar filtros
            </button>

            <Link
              href="/administrador/usuarios"
              className="inline-flex min-h-12 items-center justify-center self-end rounded-xl border border-[var(--ecf-border)] dark:border-white/15 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Limpiar
            </Link>
          </form>
        </section>

        {/* RESULTADOS */}
        <section className="rounded-3xl border border-[var(--ecf-border)] dark:border-white/10 bg-[var(--ecf-surface)] dark:bg-[#112039] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">
                Cuentas encontradas
              </h2>

              <p className="mt-2 text-sm text-[var(--ecf-muted)] dark:text-slate-400">
                {registrosFiltrados.length} resultado(s)
                dentro de los registros consultados.
              </p>
            </div>

            <span className="rounded-full border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-800 dark:text-cyan-200">
              Página {paginaActual} de {totalPaginas}
            </span>
          </div>

          {registrosPagina.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[var(--ecf-border)] dark:border-white/10 bg-slate-50 dark:bg-[#091729] p-8 text-center text-sm text-[var(--ecf-muted)] dark:text-slate-400">
              No se encontraron usuarios con
              los filtros seleccionados.
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {registrosPagina.map((usuario) => (
                <article
                  key={usuario.id}
                  className="rounded-2xl border border-[var(--ecf-border)] dark:border-white/10 bg-white dark:bg-gradient-to-r dark:from-[#152a44] dark:to-[#0a192b] p-5 transition-[border-color,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:border-cyan-400/25"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-400/10 text-lg font-black text-cyan-700 dark:text-cyan-300">
                        {usuario.nombre_completo
                          .trim()
                          .charAt(0)
                          .toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-base font-bold text-[var(--ecf-text)] dark:text-white">
                          {usuario.nombre_completo}
                        </h3>

                        <p className="mt-1 text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                          Registrado el{" "}
                          {formatoFecha(
                            usuario.creado_en
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${coloresRol(
                        usuario.rol
                      )}`}
                    >
                      {etiquetaRol(usuario.rol)}
                    </span>
                  </div>

                  {usuario.rol === "cliente" && (
                    <div className="mt-5 rounded-xl border border-[var(--ecf-border)] dark:border-white/10 bg-slate-50 dark:bg-[#081526] p-4">
                      <p className="text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                        Entrenador asignado
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[var(--ecf-text)] dark:text-white">
                        {usuario.entrenador ??
                          "Sin entrenador asignado"}
                      </p>

                      {usuario.entrenador && (
                        <p
                          className={`mt-2 text-xs font-semibold ${
                            usuario.asignacionActiva
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-300"
                          }`}
                        >
                          {usuario.asignacionActiva
                            ? "● Asignación activa"
                            : "● Asignación inactiva"}
                        </p>
                      )}
                    </div>
                  )}

                  {usuario.rol === "entrenador" && (
                    <div className="mt-5 rounded-xl border border-[var(--ecf-border)] dark:border-white/10 bg-slate-50 dark:bg-[#081526] p-4">
                      <p className="text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                        Clientes asignados actualmente
                      </p>

                      <p className="mt-1 text-lg font-bold text-cyan-700 dark:text-cyan-300">
                        {usuario.clientesAsignados}
                      </p>
                    </div>
                  )}

                  {usuario.rol === "administrador" && (
                    <div className="mt-5 rounded-xl border border-violet-200 dark:border-violet-400/15 bg-violet-50 dark:bg-violet-400/5 p-4">
                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-200">
                        Cuenta administrativa
                      </p>

                      <p className="mt-1 text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                        Acceso sujeto a verificación
                        de identidad y permisos.
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* PAGINACION */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ecf-border)] dark:border-white/10 pt-5">
            {paginaActual > 1 ? (
              <Link
                href={enlacePagina(
                  paginaActual - 1
                )}
                className="rounded-xl border border-[var(--ecf-border)] dark:border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="rounded-xl border border-[var(--ecf-border)] dark:border-white/10 px-4 py-2.5 text-sm text-slate-400 dark:text-slate-600">
                ← Anterior
              </span>
            )}

            <p className="text-xs text-[var(--ecf-muted)] dark:text-slate-400">
              {paginaActual} / {totalPaginas}
            </p>

            {paginaActual < totalPaginas ? (
              <Link
                href={enlacePagina(
                  paginaActual + 1
                )}
                className="rounded-xl border border-[var(--ecf-border)] dark:border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="rounded-xl border border-[var(--ecf-border)] dark:border-white/10 px-4 py-2.5 text-sm text-slate-400 dark:text-slate-600">
                Siguiente →
              </span>
            )}
          </div>
        </section>

        {/* SEGURIDAD */}
        <section className="rounded-2xl border border-cyan-200 dark:border-cyan-400/15 bg-gradient-to-r from-[#e8f8fb] to-[#f0ebff] dark:from-[#0f2a3c] dark:to-[#1b1c39] p-6">
          <h2 className="font-bold text-[var(--ecf-text)] dark:text-white">
            Seguridad de las cuentas
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Esta herramienta solo permite consultar
            usuarios, roles y asignaciones.
            No modifica contraseñas, permisos ni
            información de los participantes.
          </p>

          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
            La creación, edición y desactivación
            de cuentas requiere operaciones
            protegidas y auditoría.
          </p>
        </section>

        <footer className="border-t border-[var(--ecf-border)] dark:border-white/10 py-6 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Gestión de usuarios
        </footer>
      </div>
    </main>
  );
}

// ================================================
// PAGINA PRINCIPAL
// ================================================

export default function UsuariosPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<EstadoCarga />}>
      <ContenidoUsuarios
        searchParams={searchParams}
      />
    </Suspense>
  );
}
