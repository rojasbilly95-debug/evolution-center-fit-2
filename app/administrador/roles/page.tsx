
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  createClient as crearClientePrivilegiado,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// =============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.19.2.5
// GESTION DE ROLES - CONSULTA SEGURA
// =============================================

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
};

type Participante = {
  cliente_id: string;
  grupo_estudio: string;
};

type Parametros = {
  q?: string;
};

const LIMITE = 500;

function nombreRol(rol: string) {
  switch (rol) {
    case "administrador":
      return "Administrador";
    case "entrenador":
      return "Entrenador";
    case "cliente":
      return "Cliente";
    default:
      return "Sin rol";
  }
}

function estiloRol(rol: string) {
  switch (rol) {
    case "administrador":
      return "border-violet-400/30 bg-violet-400/10 text-violet-200";
    case "entrenador":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
    case "cliente":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    default:
      return "border-white/20 bg-white/5 text-slate-300";
  }
}

function Tarjeta({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#14243b] p-5">
      <p className="text-sm text-slate-400">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black">
        {valor}
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
    <main className="min-h-screen bg-[#080e1b] p-6 text-white">
      <section className="mx-auto max-w-xl rounded-2xl border border-amber-400/20 bg-[#14243b] p-8">
        <h1 className="text-xl font-bold">
          {titulo}
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          {descripcion}
        </p>

        <Link
          href="/administrador"
          className="mt-6 inline-block font-semibold text-cyan-300"
        >
          Volver al administrador
        </Link>
      </section>
    </main>
  );
}

async function ContenidoRoles({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  await connection();

  // 1. Verificar identidad.

  const supabase = await createClient();

  const {
    data: identidad,
    error: errorIdentidad,
  } = await supabase.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    redirect("/login");
  }

  // 2. Verificar rol en el servidor.

  const {
    data: permiso,
    error: errorRol,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorRol ||
    permiso?.rol !== "administrador"
  ) {
    redirect("/");
  }

  // 3. Cliente privilegiado solo en servidor.

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <Mensaje
        titulo="Configuración incompleta"
        descripcion="No se pudo inicializar la consulta administrativa."
      />
    );
  }

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

  // 4. Consultar tablas sin modificar registros.

  const [
    resultadoUsuarios,
    resultadoRoles,
    resultadoAsignaciones,
    resultadoEstudio,
  ] = await Promise.all([
    admin
      .from("usuarios")
      .select("id,nombre_completo,creado_en")
      .order("creado_en", {
        ascending: false,
      })
      .limit(LIMITE),

    admin
      .from("usuario_roles")
      .select("usuario_id,rol")
      .limit(LIMITE),

    admin
      .from("asignaciones_entrenadores")
      .select("cliente_id,entrenador_id,activa")
      .limit(LIMITE),

    admin
      .from("participantes_estudio")
      .select("cliente_id,grupo_estudio")
      .limit(LIMITE),
  ]);

  if (
    resultadoUsuarios.error ||
    resultadoRoles.error ||
    resultadoAsignaciones.error ||
    resultadoEstudio.error
  ) {
    console.error(
      "Roles: consulta administrativa fallida",
      {
        usuarios: resultadoUsuarios.error?.code,
        roles: resultadoRoles.error?.code,
        asignaciones: resultadoAsignaciones.error?.code,
        estudio: resultadoEstudio.error?.code,
      }
    );

    return (
      <Mensaje
        titulo="No se pudieron consultar los roles"
        descripcion="Revisa los permisos de lectura de las tablas y los registros del servidor."
      />
    );
  }

  const usuarios =
    (resultadoUsuarios.data ?? []) as Usuario[];

  const roles =
    (resultadoRoles.data ?? []) as UsuarioRol[];

  const asignaciones =
    (resultadoAsignaciones.data ?? []) as Asignacion[];

  const participantes =
    (resultadoEstudio.data ?? []) as Participante[];

  // 5. Preparar indicadores.

  const mapaRoles = new Map(
    roles.map((registro) => [
      registro.usuario_id,
      registro.rol,
    ])
  );

  const clientesConEntrenador = new Set(
    asignaciones
      .filter((item) => item.activa)
      .map((item) => item.cliente_id)
  );

  const entrenadoresConClientes = new Set(
    asignaciones
      .filter((item) => item.activa)
      .map((item) => item.entrenador_id)
  );

  const mapaEstudio = new Map(
    participantes.map((item) => [
      item.cliente_id,
      item.grupo_estudio,
    ])
  );

  const contarRol = (rol: string) =>
    roles.filter((item) => item.rol === rol)
      .length;

  // 6. Búsqueda.

  const parametros = await searchParams;

  const busqueda =
    typeof parametros.q === "string"
      ? parametros.q.trim().slice(0, 60)
      : "";

  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const usuariosFiltrados = usuarios.filter(
    (usuario) =>
      normalizar(usuario.nombre_completo).includes(
        normalizar(busqueda)
      )
  );

  return (
    <main className="min-h-screen bg-[#080e1b] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/administrador"
          className="text-sm font-semibold text-cyan-300 hover:underline"
        >
          ← Volver al administrador
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Administración · Seguridad
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Gestión de roles y permisos
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Consulta de roles y relaciones activas.
              Los cambios de permisos permanecen
              deshabilitados hasta implementar
              la auditoría y las validaciones.
            </p>
          </div>

          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200">
            Modo solo lectura
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tarjeta
            titulo="Perfiles consultados"
            valor={usuarios.length}
          />

          <Tarjeta
            titulo="Administradores"
            valor={contarRol("administrador")}
          />

          <Tarjeta
            titulo="Entrenadores"
            valor={contarRol("entrenador")}
          />

          <Tarjeta
            titulo="Clientes"
            valor={contarRol("cliente")}
          />
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#101d31] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold">
              Usuarios y permisos actuales
            </h2>

            <form method="get" className="flex gap-2">
              <input
                name="q"
                type="search"
                defaultValue={busqueda}
                placeholder="Buscar por nombre"
                className="min-w-0 rounded-xl border border-white/15 bg-[#080e1b] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />

              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-[#081525]"
              >
                Buscar
              </button>
            </form>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-4">
                    Usuario
                  </th>
                  <th className="px-3 py-4">
                    Rol actual
                  </th>
                  <th className="px-3 py-4">
                    Relaciones
                  </th>
                  <th className="px-3 py-4">
                    Investigación
                  </th>
                  <th className="px-3 py-4">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.map((usuario) => {
                  const rol =
                    mapaRoles.get(usuario.id) ?? "";

                  const tieneClientes =
                    entrenadoresConClientes.has(usuario.id);

                  const tieneEntrenador =
                    clientesConEntrenador.has(usuario.id);

                  const grupo =
                    mapaEstudio.get(usuario.id);

                  const relacion = tieneClientes
                    ? "Tiene clientes asignados"
                    : tieneEntrenador
                      ? "Tiene entrenador asignado"
                      : "Sin relación activa";

                  return (
                    <tr
                      key={usuario.id}
                      className="border-b border-white/5"
                    >
                      <td className="px-3 py-4 font-semibold">
                        {usuario.nombre_completo}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${estiloRol(rol)}`}
                        >
                          {nombreRol(rol)}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {relacion}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {grupo
                          ? `Grupo ${grupo}`
                          : "No inscrito"}
                      </td>

                      <td className="px-3 py-4">
                        <span className="text-xs text-slate-500">
                          Cambio bloqueado
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {usuariosFiltrados.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No se encontraron usuarios.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-5 text-sm leading-7 text-slate-300">
          <h2 className="font-bold text-cyan-200">
            Controles de seguridad pendientes
          </h2>

          <p className="mt-2">
            Antes de habilitar cambios de roles,
            se implementará una operación
            transaccional y auditada que proteja
            al último administrador, a los
            entrenadores con asignaciones activas
            y a los participantes de la investigación.
          </p>

          <p className="mt-3 text-xs text-slate-400">
            Esta pantalla consulta hasta 500 registros
            por tabla. No modifica información.
          </p>
        </section>
      </div>
    </main>
  );
}

function CargandoRoles() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] text-cyan-200">
      Consultando roles y permisos...
    </main>
  );
}

export default function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  return (
    <Suspense fallback={<CargandoRoles />}>
      <ContenidoRoles searchParams={searchParams} />
    </Suspense>
  );
}
