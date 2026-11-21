import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient as crearAdmin } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import AccionesUsuario from "./acciones-usuario";

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
  suspendido: boolean | null;
};

const LIMITE_CONSULTA = 500;
const POR_PAGINA = 10;

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

  return etiquetas[rol] ?? "Sin rol";
}

function coloresRol(rol: string) {
  switch (rol) {
    case "administrador":
      return "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-200";

    case "entrenador":
      return "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200";

    case "cliente":
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200";

    default:
      return "border-slate-300 bg-slate-100 text-slate-600 dark:border-white/20 dark:bg-white/10 dark:text-slate-300";
  }
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

function Resumen({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <article className="rounded-2xl border border-[var(--ecf-border)] bg-white p-5 shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-[#14253d] dark:shadow-black/10">
      <p className="text-xs font-semibold text-[var(--ecf-muted)] dark:text-slate-400">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black tabular-nums">
        {new Intl.NumberFormat("es-PE").format(valor)}
      </p>
    </article>
  );
}

function Mensaje({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--ecf-bg)] p-6 text-[var(--ecf-text)] dark:bg-[#080e1b] dark:text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/administrador"
          className="font-semibold text-cyan-700 dark:text-cyan-300"
        >
          ← Volver al administrador
        </Link>

        <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-400/30 dark:bg-amber-400/10">
          <h1 className="text-xl font-bold">
            {titulo}
          </h1>

          <p className="mt-3 text-sm leading-7">
            {descripcion}
          </p>
        </section>
      </div>
    </main>
  );
}

async function ContenidoUsuarios({
  searchParams,
}: Props) {
  await connection();

  const parametros = await searchParams;

  const busqueda =
    typeof parametros.q === "string"
      ? parametros.q.trim().slice(0, 60)
      : "";

  const rolesPermitidos = [
    "todos",
    "cliente",
    "entrenador",
    "administrador",
  ];

  const filtroRol =
    typeof parametros.rol === "string" &&
    rolesPermitidos.includes(parametros.rol)
      ? parametros.rol
      : "todos";

  const numeroPagina = Number(parametros.pagina);

  const paginaSolicitada =
    Number.isSafeInteger(numeroPagina) &&
    numeroPagina > 0
      ? Math.min(numeroPagina, 1000)
      : 1;

  // =====================================
  // SEGURIDAD
  // =====================================

  const supabase = await createClient();

  const {
    data: { user },
    error: errorSesion,
  } = await supabase.auth.getUser();

  if (errorSesion || !user) {
    redirect("/login");
  }

  const { data: rolActual, error: errorRol } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", user.id)
      .maybeSingle();

  if (errorRol || rolActual?.rol !== "administrador") {
    return (
      <Mensaje
        titulo="Acceso restringido"
        descripcion="No tienes autorización para gestionar las cuentas del gimnasio."
      />
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <Mensaje
        titulo="Configuración pendiente"
        descripcion="Faltan las credenciales privadas de Supabase en el servidor."
      />
    );
  }

  const admin = crearAdmin(url, clave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // =====================================
  // CONSULTAS
  // =====================================

  const [
    respuestaUsuarios,
    respuestaRoles,
    respuestaAsignaciones,
    respuestaAuth,
  ] = await Promise.all([
    admin
      .from("usuarios")
      .select("id,nombre_completo,creado_en", {
        count: "exact",
      })
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
      .order("asignado_en", {
        ascending: false,
      })
      .limit(LIMITE_CONSULTA),

    admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),
  ]);

  if (
    respuestaUsuarios.error ||
    respuestaRoles.error ||
    respuestaAsignaciones.error ||
    respuestaAuth.error
  ) {
    return (
      <Mensaje
        titulo="No se pudieron cargar los usuarios"
        descripcion="Revisa la conexión con Supabase, las credenciales del servidor y los permisos de lectura."
      />
    );
  }

  const usuarios =
    (respuestaUsuarios.data ?? []) as Usuario[];

  const roles =
    (respuestaRoles.data ?? []) as UsuarioRol[];

  const asignaciones =
    (respuestaAsignaciones.data ?? []) as Asignacion[];

  const authUsuarios =
    respuestaAuth.data?.users ?? [];

  // =====================================
  // RELACIONES
  // =====================================

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

  const estadosAuth = new Map(
    authUsuarios.map((cuenta) => [
      cuenta.id,
      Boolean(
        cuenta.banned_until &&
        new Date(cuenta.banned_until).getTime() >
          Date.now()
      ),
    ])
  );

  const asignacionesPorCliente =
    new Map<string, Asignacion>();

  const clientesPorEntrenador =
    new Map<string, number>();

  for (const asignacion of asignaciones) {
    if (
      !asignacionesPorCliente.has(
        asignacion.cliente_id
      )
    ) {
      asignacionesPorCliente.set(
        asignacion.cliente_id,
        asignacion
      );
    }

    if (asignacion.activa) {
      const total =
        clientesPorEntrenador.get(
          asignacion.entrenador_id
        ) ?? 0;

      clientesPorEntrenador.set(
        asignacion.entrenador_id,
        total + 1
      );
    }
  }

  const registros: Registro[] = usuarios.map(
    (usuario) => {
      const relacion =
        asignacionesPorCliente.get(usuario.id);

      return {
        ...usuario,

        rol:
          mapaRoles.get(usuario.id) ??
          "sin_rol",

        entrenador: relacion
          ? nombres.get(relacion.entrenador_id) ??
            "Entrenador no disponible"
          : null,

        asignacionActiva:
          relacion?.activa ?? false,

        clientesAsignados:
          clientesPorEntrenador.get(usuario.id) ??
          0,

        suspendido: estadosAuth.has(usuario.id)
          ? estadosAuth.get(usuario.id) ?? false
          : null,
      };
    }
  );

  // =====================================
  // ESTADÍSTICAS
  // =====================================

  const totalRegistrado =
    respuestaUsuarios.count ?? usuarios.length;

  const totalClientes = registros.filter(
    (registro) => registro.rol === "cliente"
  ).length;

  const totalEntrenadores = registros.filter(
    (registro) => registro.rol === "entrenador"
  ).length;

  const totalAdministradores = registros.filter(
    (registro) =>
      registro.rol === "administrador"
  ).length;

  const totalSuspendidos = registros.filter(
    (registro) => registro.suspendido === true
  ).length;

  // =====================================
  // FILTROS Y PAGINACIÓN
  // =====================================

  const filtrados = registros.filter((registro) => {
    const coincideNombre =
      !busqueda ||
      normalizar(registro.nombre_completo).includes(
        normalizar(busqueda)
      );

    const coincideRol =
      filtroRol === "todos" ||
      registro.rol === filtroRol;

    return coincideNombre && coincideRol;
  });

  const totalPaginas = Math.max(
    1,
    Math.ceil(filtrados.length / POR_PAGINA)
  );

  const paginaActual = Math.min(
    paginaSolicitada,
    totalPaginas
  );

  const inicio =
    (paginaActual - 1) * POR_PAGINA;

  const registrosPagina = filtrados.slice(
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

  // =====================================
  // INTERFAZ
  // =====================================

  return (
    <main className="ecf-role-admin min-h-screen bg-[var(--ecf-bg)] text-[var(--ecf-text)] dark:bg-[#080e1b] dark:text-white">
      <header className="border-b border-[var(--ecf-border)] bg-[var(--ecf-surface)] dark:border-white/10 dark:bg-[#101d31]">
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
            className="rounded-xl border border-[var(--ecf-border)] px-4 py-2.5 text-sm font-semibold dark:border-white/15"
          >
            ← Volver al panel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-[#e4f7fb] via-[#f8fbff] to-[#f0ecff] p-6 shadow-xl shadow-slate-200/50 dark:border-cyan-400/15 dark:from-[#17344a] dark:via-[#14263d] dark:to-[#201b3d] dark:shadow-black/20 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            Gestión administrativa
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Gestión de usuarios
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Administra las cuentas del gimnasio.
            Consulta los roles, actualiza nombres,
            revisa asignaciones y suspende o reactiva
            accesos cuando sea necesario.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/administrador/usuarios/nuevo"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              + Invitar nuevo usuario
            </Link>

            <Link
              href="/administrador/roles"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-300 px-5 py-3 text-sm font-bold text-cyan-900 hover:bg-white/50 dark:border-cyan-400/30 dark:text-cyan-200"
            >
              Gestionar roles
            </Link>

            <Link
              href="/administrador/roles/historial"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-white/50 dark:border-white/20 dark:text-slate-200"
            >
              Historial de roles
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">
            Resumen de cuentas
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
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

            <Resumen
              titulo="Suspendidos consultados"
              valor={totalSuspendidos}
            />
          </div>

          {totalRegistrado > LIMITE_CONSULTA && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              Hay más de {LIMITE_CONSULTA} usuarios.
              Los filtros y recuentos por rol solo
              incluyen los primeros registros consultados.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-[var(--ecf-border)] bg-[var(--ecf-surface)] p-5 dark:border-white/10 dark:bg-[#112039] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            Directorio
          </p>

          <h2 className="mt-2 text-2xl font-extrabold">
            Buscar y filtrar usuarios
          </h2>

          <form
            action="/administrador/usuarios"
            method="get"
            className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]"
          >
            <div>
              <label
                htmlFor="buscar-usuarios"
                className="mb-2 block text-xs font-semibold"
              >
                Nombre del usuario
              </label>

              <input
                id="buscar-usuarios"
                name="q"
                type="search"
                maxLength={60}
                defaultValue={busqueda}
                placeholder="Buscar por nombre..."
                className="min-h-12 w-full rounded-xl border border-[var(--ecf-border)] bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#081526]"
              />
            </div>

            <div>
              <label
                htmlFor="rol-usuarios"
                className="mb-2 block text-xs font-semibold"
              >
                Filtrar por rol
              </label>

              <select
                id="rol-usuarios"
                name="rol"
                defaultValue={filtroRol}
                className="min-h-12 w-full rounded-xl border border-[var(--ecf-border)] bg-slate-50 px-4 py-3 text-sm outline-none dark:border-white/15 dark:bg-[#081526]"
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
              className="min-h-12 self-end rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              Aplicar filtros
            </button>

            <Link
              href="/administrador/usuarios"
              className="inline-flex min-h-12 items-center justify-center self-end rounded-xl border border-[var(--ecf-border)] px-5 py-3 text-sm font-semibold dark:border-white/15"
            >
              Limpiar
            </Link>
          </form>
        </section>

        <section className="rounded-3xl border border-[var(--ecf-border)] bg-[var(--ecf-surface)] p-5 dark:border-white/10 dark:bg-[#112039] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">
                Cuentas encontradas
              </h2>

              <p className="mt-2 text-sm text-[var(--ecf-muted)] dark:text-slate-400">
                {filtrados.length} resultado(s)
                dentro de los registros consultados.
              </p>
            </div>

            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              Página {paginaActual} de {totalPaginas}
            </span>
          </div>

          {registrosPagina.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[var(--ecf-border)] bg-slate-50 p-8 text-center text-sm dark:border-white/10 dark:bg-[#091729]">
              No se encontraron usuarios.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {registrosPagina.map((usuario) => (
                <article
                  key={usuario.id}
                  className="rounded-2xl border border-[var(--ecf-border)] bg-white p-5 transition hover:border-cyan-300 dark:border-white/10 dark:bg-gradient-to-r dark:from-[#152a44] dark:to-[#0a192b]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-lg font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
                        {usuario.nombre_completo
                          .trim()
                          .charAt(0)
                          .toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-base font-bold">
                          {usuario.nombre_completo}
                        </h3>

                        <p className="mt-1 text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                          Registrado el{" "}
                          {formatoFecha(usuario.creado_en)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${coloresRol(
                          usuario.rol
                        )}`}
                      >
                        {etiquetaRol(usuario.rol)}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                          usuario.suspendido === true
                            ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
                            : usuario.suspendido === false
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                              : "border-slate-300 bg-slate-50 text-slate-600 dark:border-white/20 dark:bg-white/10 dark:text-slate-300"
                        }`}
                      >
                        {usuario.suspendido === true
                          ? "Cuenta suspendida"
                          : usuario.suspendido === false
                            ? "Sin suspensión"
                            : "Estado no disponible"}
                      </span>
                    </div>
                  </div>

                  {usuario.rol === "cliente" && (
                    <div className="mt-4 rounded-xl border border-[var(--ecf-border)] bg-slate-50 p-4 dark:border-white/10 dark:bg-[#081526]">
                      <p className="text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                        Entrenador asignado
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {usuario.entrenador ??
                          "Sin entrenador asignado"}
                      </p>

                      {usuario.entrenador && (
                        <p className="mt-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                          {usuario.asignacionActiva
                            ? "● Asignación activa"
                            : "● Asignación inactiva"}
                        </p>
                      )}
                    </div>
                  )}

                  {usuario.rol === "entrenador" && (
                    <div className="mt-4 rounded-xl border border-[var(--ecf-border)] bg-slate-50 p-4 dark:border-white/10 dark:bg-[#081526]">
                      <p className="text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                        Clientes asignados actualmente
                      </p>

                      <p className="mt-1 text-lg font-bold text-cyan-700 dark:text-cyan-300">
                        {usuario.clientesAsignados}
                      </p>
                    </div>
                  )}

                  {usuario.rol === "administrador" && (
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-400/15 dark:bg-violet-400/5">
                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-200">
                        Cuenta administrativa protegida
                      </p>
                    </div>
                  )}

                  <AccionesUsuario
                    usuarioId={usuario.id}
                    nombre={usuario.nombre_completo}
                    rol={usuario.rol}
                    suspendido={usuario.suspendido}
                    esMiCuenta={usuario.id === user.id}
                  />
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--ecf-border)] pt-5 dark:border-white/10">
            {paginaActual > 1 ? (
              <Link
                href={enlacePagina(paginaActual - 1)}
                className="rounded-xl border border-[var(--ecf-border)] px-4 py-2.5 text-sm font-semibold dark:border-white/15"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="text-sm text-slate-400">
                ← Anterior
              </span>
            )}

            <span className="text-sm">
              {paginaActual} / {totalPaginas}
            </span>

            {paginaActual < totalPaginas ? (
              <Link
                href={enlacePagina(paginaActual + 1)}
                className="rounded-xl border border-[var(--ecf-border)] px-4 py-2.5 text-sm font-semibold dark:border-white/15"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="text-sm text-slate-400">
                Siguiente →
              </span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-[#e8f8fb] to-[#f0ebff] p-6 dark:border-cyan-400/15 dark:from-[#0f2a3c] dark:to-[#1b1c39]">
          <h2 className="font-bold">
            Seguridad e historial
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Las modificaciones de nombres y los
            cambios de suspensión se registran
            en la auditoría administrativa.
            Suspender una cuenta no elimina
            rutinas, sesiones ni historiales
            de investigación.
          </p>

          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
            Importante: los tokens de sesión ya
            emitidos pueden seguir vigentes hasta
            su expiración. Deben revisarse las
            protecciones de acceso del sistema.
          </p>
        </section>

        <footer className="border-t border-[var(--ecf-border)] py-6 text-center text-xs text-slate-500 dark:border-white/10">
          Evolution Center Fit 2.0 · Gestión de usuarios
        </footer>
      </div>
    </main>
  );
}

function EstadoCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg)] text-cyan-800 dark:bg-[#080e1b] dark:text-cyan-200">
      Cargando gestión de usuarios...
    </main>
  );
}

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