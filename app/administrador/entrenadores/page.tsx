
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
// FASE 111.11 - GESTION DE ENTRENADORES
// Consultas reales y protegidas en el servidor.
// ================================================

type Props = {
  searchParams: Promise<{
    q?: string;
    estado?: string;
  }>;
};

type Usuario = {
  id: string;
  nombre_completo: string | null;
};

type Rol = {
  usuario_id: string;
  rol: string;
};

type Asignacion = {
  cliente_id: string;
  entrenador_id: string;
  activa: boolean;
  asignado_en: string | null;
};

type ClienteVista = {
  id: string;
  nombre: string;
  entrenador: string | null;
  estado: "activa" | "inactiva" | "sin_asignar";
  fecha: string | null;
};

type EntrenadorVista = {
  id: string;
  nombre: string;
  clientes: ClienteVista[];
};

const LIMITE = 1000;

// ================================================
// FUNCIONES AUXILIARES
// ================================================

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fechaLima(valor: string | null) {
  if (!valor) return "Sin fecha";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return "Fecha no disponible";
  }

  return fecha.toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function TarjetaIndicador({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: number;
  detalle: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b324d] to-[#101d30] p-5 shadow-lg shadow-black/10">
      <p className="text-xs font-semibold text-slate-400">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black tabular-nums text-white">
        {new Intl.NumberFormat("es-PE").format(valor)}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {detalle}
      </p>
    </article>
  );
}

function EstadoAsignacion({
  estado,
}: {
  estado: ClienteVista["estado"];
}) {
  const estilos = {
    activa:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    inactiva:
      "border-amber-400/20 bg-amber-400/10 text-amber-200",
    sin_asignar:
      "border-slate-400/20 bg-white/5 text-slate-300",
  };

  const etiquetas = {
    activa: "Activa",
    inactiva: "Inactiva",
    sin_asignar: "Sin entrenador",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${estilos[estado]}`}
    >
      {etiquetas[estado]}
    </span>
  );
}

function PantallaCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] p-6 text-sm text-cyan-200">
      Cargando entrenadores y asignaciones...
    </main>
  );
}

function PantallaError({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] p-6 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-amber-400/20 bg-[#182337] p-8 text-center">
        <h1 className="text-2xl font-bold">
          {titulo}
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          {descripcion}
        </p>

        <Link
          href="/administrador"
          className="mt-6 inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200"
        >
          Volver al administrador
        </Link>
      </section>
    </main>
  );
}

// ================================================
// COMPONENTE PROTEGIDO
// ================================================

async function ContenidoEntrenadores({
  searchParams,
}: Props) {
  // Evita el prerenderizado de los datos privados.
  // Se ejecuta dentro de Suspense.
  await connection();

  const parametros = await searchParams;

  const busqueda =
    typeof parametros.q === "string"
      ? parametros.q.trim().slice(0, 60)
      : "";

  const estadosPermitidos = [
    "todos",
    "activa",
    "inactiva",
    "sin_asignar",
  ];

  const estadoSolicitado =
    typeof parametros.estado === "string"
      ? parametros.estado
      : "todos";

  const filtroEstado = estadosPermitidos.includes(
    estadoSolicitado
  )
    ? estadoSolicitado
    : "todos";

  // ==============================================
  // 1. COMPROBAR LA IDENTIDAD
  // ==============================================

  const supabase = await createClient();

  const {
    data: identidad,
    error: errorIdentidad,
  } = await supabase.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    redirect("/login");
  }

  // ==============================================
  // 2. COMPROBAR ROL ADMINISTRADOR
  // ==============================================

  const { data: acceso, error: errorAcceso } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", identidad.user.id)
      .maybeSingle();

  if (
    errorAcceso ||
    acceso?.rol !== "administrador"
  ) {
    return (
      <PantallaError
        titulo="Acceso restringido"
        descripcion="Tu cuenta no tiene autorización para consultar las asignaciones del gimnasio."
      />
    );
  }

  // ==============================================
  // 3. CREAR CLIENTE DE CONSULTA EN SERVIDOR
  // ==============================================

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <PantallaError
        titulo="Configuración pendiente"
        descripcion="No están disponibles las credenciales privadas necesarias para consultar los registros."
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

  // ==============================================
  // 4. CONSULTAR TABLAS REALES
  // ==============================================

  const [
    resultadoUsuarios,
    resultadoRoles,
    resultadoAsignaciones,
  ] = await Promise.all([
    admin
      .from("usuarios")
      .select("id,nombre_completo", {
        count: "exact",
      })
      .limit(LIMITE),

    admin
      .from("usuario_roles")
      .select("usuario_id,rol", {
        count: "exact",
      })
      .in("rol", ["cliente", "entrenador"])
      .limit(LIMITE),

    admin
      .from("asignaciones_entrenadores")
      .select(
        "cliente_id,entrenador_id,activa,asignado_en",
        { count: "exact" }
      )
      .limit(LIMITE),
  ]);

  if (
    resultadoUsuarios.error ||
    resultadoRoles.error ||
    resultadoAsignaciones.error
  ) {
    return (
      <PantallaError
        titulo="Error consultando los registros"
        descripcion="No se pudieron cargar las tablas de usuarios, roles o asignaciones. Comprueba la conexión y los permisos de Supabase."
      />
    );
  }

  const usuarios =
    (resultadoUsuarios.data ?? []) as Usuario[];

  const roles =
    (resultadoRoles.data ?? []) as Rol[];

  const asignaciones =
    (resultadoAsignaciones.data ??
      []) as Asignacion[];

  const datosParciales =
    (resultadoUsuarios.count ?? 0) > usuarios.length ||
    (resultadoRoles.count ?? 0) > roles.length ||
    (resultadoAsignaciones.count ?? 0) >
      asignaciones.length;

  // ==============================================
  // 5. RELACIONAR NOMBRES Y ROLES
  // ==============================================

  const mapaNombres = new Map(
    usuarios.map((usuario) => [
      usuario.id,
      usuario.nombre_completo?.trim() ||
        "Sin nombre registrado",
    ])
  );

  const mapaRoles = new Map(
    roles.map((registro) => [
      registro.usuario_id,
      registro.rol,
    ])
  );

  const rolesClientes = roles.filter(
    (registro) => registro.rol === "cliente"
  );

  const rolesEntrenadores = roles.filter(
    (registro) => registro.rol === "entrenador"
  );

  // La tabla tiene una fila por cliente.
  const mapaAsignaciones = new Map(
    asignaciones.map((asignacion) => [
      asignacion.cliente_id,
      asignacion,
    ])
  );

  // ==============================================
  // 6. PREPARAR VISTA DE CLIENTES
  // ==============================================

  const clientes: ClienteVista[] =
    rolesClientes.map((registro) => {
      const asignacion =
        mapaAsignaciones.get(registro.usuario_id);

      const estado: ClienteVista["estado"] =
        !asignacion
          ? "sin_asignar"
          : asignacion.activa
            ? "activa"
            : "inactiva";

      return {
        id: registro.usuario_id,
        nombre:
          mapaNombres.get(registro.usuario_id) ??
          "Cliente sin perfil",

        entrenador: asignacion
          ? mapaNombres.get(
              asignacion.entrenador_id
            ) ?? "Entrenador no encontrado"
          : null,

        estado,

        fecha:
          asignacion?.asignado_en ?? null,
      };
    });

  clientes.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );

  // ==============================================
  // 7. AGRUPAR POR ENTRENADOR
  // ==============================================

  const entrenadores: EntrenadorVista[] =
    rolesEntrenadores.map((registro) => {
      const clientesAsignados = asignaciones
        .filter(
          (asignacion) =>
            asignacion.entrenador_id ===
              registro.usuario_id &&
            asignacion.activa &&
            mapaRoles.get(
              asignacion.cliente_id
            ) === "cliente"
        )
        .map((asignacion) => ({
          id: asignacion.cliente_id,
          nombre:
            mapaNombres.get(
              asignacion.cliente_id
            ) ?? "Cliente sin perfil",

          entrenador:
            mapaNombres.get(
              registro.usuario_id
            ) ?? "Sin nombre",

          estado: "activa" as const,
          fecha: asignacion.asignado_en,
        }));

      return {
        id: registro.usuario_id,
        nombre:
          mapaNombres.get(registro.usuario_id) ??
          "Entrenador sin perfil",

        clientes: clientesAsignados.sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre,
              "es"
            )
        ),
      };
    });

  entrenadores.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );

  // ==============================================
  // 8. COMPROBAR RELACIONES
  // ==============================================

  const relacionesInvalidas =
    asignaciones.filter(
      (asignacion) =>
        mapaRoles.get(
          asignacion.cliente_id
        ) !== "cliente" ||
        mapaRoles.get(
          asignacion.entrenador_id
        ) !== "entrenador" ||
        asignacion.cliente_id ===
          asignacion.entrenador_id ||
        !mapaNombres.has(
          asignacion.cliente_id
        ) ||
        !mapaNombres.has(
          asignacion.entrenador_id
        )
    ).length;

  const clientesActivos =
    clientes.filter(
      (cliente) => cliente.estado === "activa"
    ).length;

  const sinEntrenador =
    clientes.filter(
      (cliente) =>
        cliente.estado !== "activa"
    ).length;

  // ==============================================
  // 9. BUSCAR Y FILTRAR
  // ==============================================

  const clientesFiltrados =
    clientes.filter((cliente) => {
      const texto =
        `${cliente.nombre} ${cliente.entrenador ?? ""}`;

      const coincideBusqueda =
        !busqueda ||
        normalizar(texto).includes(
          normalizar(busqueda)
        );

      const coincideEstado =
        filtroEstado === "todos" ||
        cliente.estado === filtroEstado;

      return (
        coincideBusqueda &&
        coincideEstado
      );
    });

  // ==============================================
  // 10. INTERFAZ ADMINISTRATIVA
  // ==============================================

  return (
    <main className="min-h-screen bg-[#080e1b] text-white">
      {/* CABECERA */}

      <header className="border-b border-white/10 bg-[#101d31]">
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
                <span className="text-cyan-300">
                  2.0
                </span>
              </span>

              <span className="text-xs text-slate-400">
                Administración de entrenadores
              </span>
            </span>
          </Link>

          <Link
            href="/administrador"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            ← Volver al panel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {/* PRESENTACION */}

        <section className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#17344a] via-[#14263d] to-[#201b3d] p-6 shadow-xl shadow-black/20 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Gestión administrativa
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Entrenadores y clientes
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Supervisa los clientes asignados a
            cada entrenador, consulta las
            relaciones activas e identifica
            situaciones que requieren atención.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/administrador/usuarios"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              Ver usuarios
            </Link>

            <Link
              href="/administrador/usuarios/nuevo"
              className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20"
            >
              + Invitar usuario
            </Link>
          </div>
        </section>

        {/* INDICADORES */}

        <section>
          <h2 className="text-xl font-extrabold">
            Resumen de asignaciones
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <TarjetaIndicador
              titulo="Entrenadores"
              valor={entrenadores.length}
              detalle="Cuentas con rol entrenador"
            />

            <TarjetaIndicador
              titulo="Clientes"
              valor={clientes.length}
              detalle="Cuentas con rol cliente"
            />

            <TarjetaIndicador
              titulo="Clientes asignados"
              valor={clientesActivos}
              detalle="Relaciones marcadas como activas"
            />

            <TarjetaIndicador
              titulo="Sin asignación activa"
              valor={sinEntrenador}
              detalle="Clientes sin relación o con relación inactiva"
            />
          </div>

          {datosParciales && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200"
            >
              Hay más registros que los consultados.
              Los indicadores son parciales.
              Se necesita paginación de base de datos.
            </p>
          )}
        </section>

        {/* ENTRENADORES */}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Supervisión
              </p>

              <h2 className="mt-2 text-2xl font-extrabold">
                Entrenadores registrados
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Clientes actualmente asociados
                a cada entrenador.
              </p>
            </div>
          </div>

          {entrenadores.length === 0 ? (
            <p className="mt-5 rounded-xl border border-white/10 bg-[#112039] p-6 text-sm text-slate-400">
              No hay entrenadores registrados.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {entrenadores.map((entrenador) => (
                <article
                  key={entrenador.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#162d47] to-[#0c192c] p-5 shadow-lg shadow-black/10 transition-[border-color,transform] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/30 sm:p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-lg font-black text-cyan-300">
                      {entrenador.nombre[0]?.toUpperCase() ??
                        "E"}
                    </span>

                    <div className="min-w-0">
                      <h3 className="break-words font-bold">
                        {entrenador.nombre}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        Entrenador del gimnasio
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-cyan-400/15 bg-[#081a2c] p-4">
                    <p className="text-xs text-slate-400">
                      Clientes con relación activa
                    </p>

                    <p className="mt-1 text-3xl font-black text-cyan-300">
                      {entrenador.clientes.length}
                    </p>
                  </div>

                  <details className="group mt-4 rounded-xl border border-white/10 bg-[#0b1b2e]">
                    <summary className="cursor-pointer list-none p-4 text-sm font-bold text-slate-200">
                      <span className="flex items-center justify-between">
                        Ver clientes asignados
                        <span className="text-cyan-300 transition-transform group-open:rotate-180">
                          ↓
                        </span>
                      </span>
                    </summary>

                    <div className="space-y-2 border-t border-white/10 p-4">
                      {entrenador.clientes.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          Sin clientes asignados.
                        </p>
                      ) : (
                        entrenador.clientes.map(
                          (cliente) => (
                            <div
                              key={cliente.id}
                              className="rounded-lg bg-[#132a40] p-3"
                            >
                              <p className="text-sm font-semibold">
                                {cliente.nombre}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Desde{" "}
                                {fechaLima(
                                  cliente.fecha
                                )}
                              </p>
                            </div>
                          )
                        )
                      )}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* DIRECTORIO DE RELACIONES */}

        <section className="rounded-3xl border border-white/10 bg-[#112039] p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Control administrativo
          </p>

          <h2 className="mt-2 text-2xl font-extrabold">
            Directorio de asignaciones
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Consulta el estado de cada cliente
            y su entrenador responsable.
          </p>

          <form
            action="/administrador/entrenadores"
            method="get"
            className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]"
          >
            <div>
              <label
                htmlFor="buscar-asignacion"
                className="mb-2 block text-xs font-semibold text-slate-300"
              >
                Buscar cliente o entrenador
              </label>

              <input
                id="buscar-asignacion"
                name="q"
                type="search"
                maxLength={60}
                defaultValue={busqueda}
                placeholder="Buscar por nombre..."
                className="min-h-12 w-full rounded-xl border border-white/15 bg-[#081526] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="filtrar-estado"
                className="mb-2 block text-xs font-semibold text-slate-300"
              >
                Estado de asignación
              </label>

              <select
                id="filtrar-estado"
                name="estado"
                defaultValue={filtroEstado}
                className="min-h-12 w-full rounded-xl border border-white/15 bg-[#081526] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                <option value="todos">
                  Todas
                </option>

                <option value="activa">
                  Activas
                </option>

                <option value="inactiva">
                  Inactivas
                </option>

                <option value="sin_asignar">
                  Sin entrenador
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="min-h-12 self-end rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              Filtrar
            </button>

            <Link
              href="/administrador/entrenadores"
              className="inline-flex min-h-12 items-center justify-center self-end rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Limpiar
            </Link>
          </form>

          <p className="mt-5 text-xs text-slate-400">
            {clientesFiltrados.length} cliente(s)
            encontrados en los registros consultados.
          </p>

          <div className="mt-4 space-y-3">
            {clientesFiltrados.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#081526] p-6 text-sm text-slate-400">
                No se encontraron relaciones con
                esos filtros.
              </p>
            ) : (
              clientesFiltrados.map((cliente) => (
                <article
                  key={cliente.id}
                  className="rounded-2xl border border-white/10 bg-[#0b192c] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">
                        Cliente
                      </p>

                      <h3 className="mt-1 break-words text-base font-bold">
                        {cliente.nombre}
                      </h3>

                      <p className="mt-3 text-xs text-slate-400">
                        Entrenador responsable
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-slate-200">
                        {cliente.entrenador ??
                          "No asignado"}
                      </p>
                    </div>

                    <EstadoAsignacion
                      estado={cliente.estado}
                    />
                  </div>

                  {cliente.fecha && (
                    <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
                      Fecha de asignación:{" "}
                      {fechaLima(cliente.fecha)}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        {/* ALERTAS */}

        <section className="rounded-2xl border border-cyan-400/15 bg-gradient-to-r from-[#0e293b] to-[#1b1c39] p-6">
          <h2 className="text-lg font-bold">
            Verificación de relaciones
          </h2>

          {relacionesInvalidas === 0 &&
          !datosParciales ? (
            <p className="mt-3 text-sm leading-7 text-emerald-200">
              No se detectaron inconsistencias
              entre los roles y las asignaciones
              consultadas.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-7 text-amber-200">
              {relacionesInvalidas} relación(es)
              requieren revisión.
              {datosParciales
                ? " La consulta es parcial y no permite una validación completa."
                : ""}
            </p>
          )}

          <p className="mt-4 text-xs leading-6 text-slate-400">
            Este módulo es de solo lectura.
            Las reasignaciones deben validar los
            planes activos y los participantes
            del estudio antes de cambiar datos.
          </p>
        </section>

        <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Administración de entrenadores
        </footer>
      </div>
    </main>
  );
}

// ================================================
// PAGINA PRINCIPAL
// ================================================

export default function EntrenadoresPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <ContenidoEntrenadores
        searchParams={searchParams}
      />
    </Suspense>
  );
}
