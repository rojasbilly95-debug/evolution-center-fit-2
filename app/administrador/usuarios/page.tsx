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
  estado?: string;
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
  correo: string | null;
  rol: string;
  entrenador: string | null;
  asignacionActiva: boolean;
  clientesAsignados: number;
  suspendido: boolean | null;
  archivado: boolean;
};

const LIMITE_CONSULTA = 500;
const POR_PAGINA = 12;

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
    <article className="rounded-2xl border border-[var(--ecf-border)] bg-white p-4 dark:border-white/10 dark:bg-[#14253d]">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 text-2xl font-black tabular-nums">
        {new Intl.NumberFormat("es-PE").format(valor)}
      </p>
    </article>
  );
}

function EtiquetaRol({ rol }: { rol: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${coloresRol(
        rol
      )}`}
    >
      {etiquetaRol(rol)}
    </span>
  );
}

function EtiquetaEstado({
  usuario,
}: {
  usuario: Registro;
}) {
  let texto = "Estado no disponible";

  let colores =
    "border-slate-300 bg-slate-50 text-slate-600 dark:border-white/20 dark:bg-white/10 dark:text-slate-300";

  if (usuario.archivado) {
    texto = "Archivado";

    colores =
      "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-200";
  } else if (usuario.suspendido === true) {
    texto = "Suspendido";

    colores =
      "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200";
  } else if (usuario.suspendido === false) {
    texto = "Activo";

    colores =
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${colores}`}
    >
      {texto}
    </span>
  );
}

function InformacionAsignacion({
  usuario,
}: {
  usuario: Registro;
}) {
  if (usuario.rol === "cliente") {
    return (
      <div className="text-sm">
        <p className="font-semibold">
          {usuario.entrenador ?? "Sin entrenador"}
        </p>

        {usuario.entrenador && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {usuario.asignacionActiva
              ? "Asignación activa"
              : "Asignación inactiva"}
          </p>
        )}
      </div>
    );
  }

  if (usuario.rol === "entrenador") {
    return (
      <p className="text-sm">
        <span className="font-bold">
          {usuario.clientesAsignados}
        </span>{" "}
        cliente(s) asignados
      </p>
    );
  }

  if (usuario.rol === "administrador") {
    return (
      <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
        Cuenta protegida
      </p>
    );
  }

  return (
    <span className="text-sm text-slate-400">
      Sin información
    </span>
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
    <main className="min-h-screen bg-[var(--ecf-bg)] p-6 dark:bg-[#080e1b]">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/administrador"
          className="font-semibold text-cyan-700 dark:text-cyan-300"
        >
          ← Volver al administrador
        </Link>

        <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-slate-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-white">
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

  const estadosPermitidos = [
    "vigentes",
    "activos",
    "suspendidos",
    "archivados",
    "todos",
  ];

  const filtroRol =
    typeof parametros.rol === "string" &&
    rolesPermitidos.includes(parametros.rol)
      ? parametros.rol
      : "todos";

  const filtroEstado =
    typeof parametros.estado === "string" &&
    estadosPermitidos.includes(parametros.estado)
      ? parametros.estado
      : "vigentes";

  const numeroPagina = Number(parametros.pagina);

  const paginaSolicitada =
    Number.isSafeInteger(numeroPagina) &&
    numeroPagina > 0
      ? Math.min(numeroPagina, 1000)
      : 1;

  // SEGURIDAD

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
        descripcion="No tienes autorización para gestionar usuarios."
      />
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <Mensaje
        titulo="Configuración pendiente"
        descripcion="Faltan las credenciales privadas de Supabase."
      />
    );
  }

  const admin = crearAdmin(url, clave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // CONSULTAS

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
      .order("creado_en", { ascending: false })
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
      .order("asignado_en", { ascending: false })
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
        descripcion="Revisa Supabase, las credenciales del servidor y los permisos de consulta."
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

  // RELACIONES

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

  const mapaAuth = new Map(
    authUsuarios.map((cuenta) => [
      cuenta.id,
      cuenta,
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

      const cuenta = mapaAuth.get(usuario.id);

      const suspendido = cuenta
        ? Boolean(
            cuenta.banned_until &&
              new Date(
                cuenta.banned_until
              ).getTime() > Date.now()
          )
        : null;

      return {
        ...usuario,

        correo: cuenta?.email ?? null,

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

        suspendido,

        archivado:
          cuenta?.app_metadata?.ecf_archivado ===
          true,
      };
    }
  );

  // RESUMEN

  const totalRegistrado =
    respuestaUsuarios.count ?? usuarios.length;

  const totalClientes = registros.filter(
    (r) => r.rol === "cliente"
  ).length;

  const totalEntrenadores = registros.filter(
    (r) => r.rol === "entrenador"
  ).length;

  const totalSuspendidos = registros.filter(
    (r) => r.suspendido === true && !r.archivado
  ).length;

  const totalArchivados = registros.filter(
    (r) => r.archivado
  ).length;

  // FILTROS

  const filtrados = registros.filter((registro) => {
    const texto = normalizar(
      `${registro.nombre_completo} ${registro.correo ?? ""}`
    );

    const coincideBusqueda =
      !busqueda ||
      texto.includes(normalizar(busqueda));

    const coincideRol =
      filtroRol === "todos" ||
      registro.rol === filtroRol;

    let coincideEstado = true;

    switch (filtroEstado) {
      case "vigentes":
        coincideEstado = !registro.archivado;
        break;

      case "activos":
        coincideEstado =
          !registro.archivado &&
          registro.suspendido === false;
        break;

      case "suspendidos":
        coincideEstado =
          !registro.archivado &&
          registro.suspendido === true;
        break;

      case "archivados":
        coincideEstado = registro.archivado;
        break;

      default:
        coincideEstado = true;
    }

    return (
      coincideBusqueda &&
      coincideRol &&
      coincideEstado
    );
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

    if (busqueda) params.set("q", busqueda);

    if (filtroRol !== "todos") {
      params.set("rol", filtroRol);
    }

    if (filtroEstado !== "vigentes") {
      params.set("estado", filtroEstado);
    }

    params.set("pagina", String(pagina));

    return `/administrador/usuarios?${params.toString()}`;
  }

  return (
    <main className="ecf-role-admin min-h-screen bg-[var(--ecf-bg)] text-[var(--ecf-text)] dark:bg-[#080e1b] dark:text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* ENCABEZADO */}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
              Administración / Personas
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Gestión de usuarios
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Consulta y administra las cuentas del gimnasio.
            </p>
          </div>

          <Link
            href="/administrador/usuarios/nuevo"
            className="inline-flex min-h-11 items-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
          >
            + Invitar usuario
          </Link>
        </header>

        {/* ESTADÍSTICAS */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
            titulo="Suspendidos"
            valor={totalSuspendidos}
          />

          <Resumen
            titulo="Archivados"
            valor={totalArchivados}
          />
        </section>

        {/* FILTROS */}

        <section className="rounded-2xl border border-[var(--ecf-border)] bg-white p-5 dark:border-white/10 dark:bg-[#112039]">
          <h2 className="font-bold">
            Buscar usuarios
          </h2>

          <form
            action="/administrador/usuarios"
            method="get"
            className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_170px_auto_auto]"
          >
            <div>
              <label
                htmlFor="buscar-usuarios"
                className="mb-2 block text-xs font-semibold"
              >
                Nombre o correo
              </label>

              <input
                id="buscar-usuarios"
                name="q"
                type="search"
                maxLength={60}
                defaultValue={busqueda}
                placeholder="Buscar usuario..."
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#081526]"
              />
            </div>

            <div>
              <label
                htmlFor="rol-usuarios"
                className="mb-2 block text-xs font-semibold"
              >
                Rol
              </label>

              <select
                id="rol-usuarios"
                name="rol"
                defaultValue={filtroRol}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-white/15 dark:bg-[#081526]"
              >
                <option value="todos">Todos</option>
                <option value="cliente">Clientes</option>
                <option value="entrenador">
                  Entrenadores
                </option>
                <option value="administrador">
                  Administradores
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="estado-usuarios"
                className="mb-2 block text-xs font-semibold"
              >
                Estado
              </label>

              <select
                id="estado-usuarios"
                name="estado"
                defaultValue={filtroEstado}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-white/15 dark:bg-[#081526]"
              >
                <option value="vigentes">
                  No archivados
                </option>
                <option value="activos">
                  Activos
                </option>
                <option value="suspendidos">
                  Suspendidos
                </option>
                <option value="archivados">
                  Archivados
                </option>
                <option value="todos">
                  Todos
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="min-h-11 self-end rounded-xl bg-cyan-400 px-4 text-sm font-bold text-[#07121e] hover:bg-cyan-300"
            >
              Filtrar
            </button>

            <Link
              href="/administrador/usuarios"
              className="inline-flex min-h-11 items-center justify-center self-end rounded-xl border border-slate-300 px-4 text-sm font-semibold dark:border-white/15"
            >
              Limpiar
            </Link>
          </form>
        </section>

        {/* TABLA */}

        <section className="rounded-2xl border border-[var(--ecf-border)] bg-white p-4 dark:border-white/10 dark:bg-[#112039] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">
                Directorio de usuarios
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filtrados.length} resultado(s)
              </p>
            </div>

            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              Página {paginaActual} de {totalPaginas}
            </span>
          </div>

          {registrosPagina.length === 0 ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm dark:bg-[#081526]">
              No se encontraron usuarios con esos filtros.
            </div>
          ) : (
            <>
              {/* COMPUTADORAS */}

              <div className="mt-5 hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[950px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-[#081526] dark:text-slate-400">
                      <th className="p-4">Usuario</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Asignación</th>
                      <th className="p-4">Registro</th>
                      <th className="p-4 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {registrosPagina.map((usuario) => (
                      <tr
                        key={usuario.id}
                        className="border-b border-slate-100 transition hover:bg-cyan-50/40 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
                              {usuario.nombre_completo
                                .trim()
                                .charAt(0)
                                .toUpperCase() || "U"}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[230px] break-words text-sm font-bold">
                                {usuario.nombre_completo}
                              </p>

                              <p className="mt-1 max-w-[230px] break-all text-xs text-slate-500 dark:text-slate-400">
                                {usuario.correo ??
                                  "Sin correo disponible"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <EtiquetaRol rol={usuario.rol} />
                        </td>

                        <td className="p-4">
                          <EtiquetaEstado usuario={usuario} />
                        </td>

                        <td className="p-4">
                          <InformacionAsignacion
                            usuario={usuario}
                          />
                        </td>

                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatoFecha(usuario.creado_en)}
                        </td>

                        <td className="p-4 text-right">
                          <AccionesUsuario
                            usuarioId={usuario.id}
                            nombre={usuario.nombre_completo}
                            rol={usuario.rol}
                            suspendido={usuario.suspendido}
                            archivado={usuario.archivado}
                            esMiCuenta={usuario.id === user.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CELULARES Y TABLETAS */}

              <div className="mt-5 grid gap-3 lg:hidden">
                {registrosPagina.map((usuario) => (
                  <article
                    key={usuario.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
                        {usuario.nombre_completo
                          .trim()
                          .charAt(0)
                          .toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words font-bold">
                          {usuario.nombre_completo}
                        </h3>

                        <p className="break-all text-xs text-slate-500 dark:text-slate-400">
                          {usuario.correo ??
                            "Sin correo disponible"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <EtiquetaRol rol={usuario.rol} />

                      <EtiquetaEstado usuario={usuario} />
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-[#081526]">
                      <InformacionAsignacion
                        usuario={usuario}
                      />

                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Registrado:{" "}
                        {formatoFecha(usuario.creado_en)}
                      </p>
                    </div>

                    <div className="mt-3">
                      <AccionesUsuario
                        usuarioId={usuario.id}
                        nombre={usuario.nombre_completo}
                        rol={usuario.rol}
                        suspendido={usuario.suspendido}
                        archivado={usuario.archivado}
                        esMiCuenta={usuario.id === user.id}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* PAGINACIÓN */}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
            {paginaActual > 1 ? (
              <Link
                href={enlacePagina(paginaActual - 1)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-white/15"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="text-sm text-slate-400">
                ← Anterior
              </span>
            )}

            <span className="text-sm font-semibold">
              {paginaActual} / {totalPaginas}
            </span>

            {paginaActual < totalPaginas ? (
              <Link
                href={enlacePagina(paginaActual + 1)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-white/15"
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

        {totalRegistrado > LIMITE_CONSULTA && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
            Hay más de {LIMITE_CONSULTA} usuarios.
            Los filtros y recuentos abarcan únicamente
            los primeros registros consultados.
          </p>
        )}

        <footer className="py-4 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Administración de usuarios
        </footer>
      </div>
    </main>
  );
}

function EstadoCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg)] text-cyan-800 dark:bg-[#080e1b] dark:text-cyan-200">
      Cargando usuarios...
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