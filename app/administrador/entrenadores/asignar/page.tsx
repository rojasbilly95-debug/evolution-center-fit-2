import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import { createClient as createAdmin } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// EVOLUTION CENTER FIT 2.0
// Gestión administrativa de asignaciones.

const RUTA = "/administrador/entrenadores/asignar";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Modo = "asignar" | "cambiar";

type Props = {
  searchParams: Promise<{
    estado?: string;
    modo?: string;
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

type Relacion = {
  cliente_id: string;
  entrenador_id: string;
  activa: boolean;
};

type Participante = {
  cliente_id: string;
};

type Plan = {
  cliente_id: string;
};

type Cliente = {
  id: string;
  nombre: string;
  entrenadorActualId: string | null;
  entrenadorActual: string;
  protegido: boolean;
  motivoProteccion: string;
};

function obtenerModo(valor: unknown): Modo {
  return valor === "cambiar" ? "cambiar" : "asignar";
}

function rutaConEstado(modo: Modo, estado: string) {
  return `${RUTA}?modo=${modo}&estado=${estado}`;
}

// ============================================
// CLIENTE PRIVILEGIADO DEL SERVIDOR
// ============================================

function adminPrivado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return null;
  }

  return createAdmin(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ============================================
// ACCIÓN ADMINISTRATIVA
// ============================================

async function guardarAsignacion(formData: FormData) {
  "use server";

  const modo = obtenerModo(formData.get("modo"));

  const clienteId = String(
    formData.get("clienteId") ?? ""
  );

  const entrenadorId = String(
    formData.get("entrenadorId") ?? ""
  );

  const motivo = String(
    formData.get("motivo") ?? ""
  )
    .trim()
    .replace(/\s+/g, " ");

  if (
    !UUID.test(clienteId) ||
    !UUID.test(entrenadorId) ||
    clienteId === entrenadorId ||
    motivo.length < 15 ||
    motivo.length > 500
  ) {
    redirect(rutaConEstado(modo, "datos"));
  }

  // Comprobar la identidad autenticada.

  const sesion = await createClient();

  const {
    data: autenticacion,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (errorAuth || !autenticacion.user) {
    redirect("/login");
  }

  const responsableId = autenticacion.user.id;

  // Comprobar el rol administrativo.

  const {
    data: rol,
    error: errorRol,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", responsableId)
    .maybeSingle();

  if (
    errorRol ||
    rol?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  const admin = adminPrivado();

  if (!admin) {
    redirect(rutaConEstado(modo, "configuracion"));
  }

  // Consultar el vínculo actual.
  // Esta verificación mejora los mensajes del
  // formulario. PostgreSQL vuelve a comprobar
  // las reglas durante la operación definitiva.

  const {
    data: relacion,
    error: errorRelacion,
  } = await admin
    .from("asignaciones_entrenadores")
    .select("entrenador_id,activa")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (errorRelacion) {
    console.error(
      "Admin: error consultando asignación",
      errorRelacion.code
    );

    redirect(rutaConEstado(modo, "rechazado"));
  }

  const tieneEntrenador =
    relacion?.activa === true;

  // Evitar utilizar la primera asignación
  // sobre clientes que ya tienen entrenador.

  if (modo === "asignar" && tieneEntrenador) {
    redirect(rutaConEstado(modo, "ya_asignado"));
  }

  // Evitar utilizar la reasignación sobre
  // clientes que no tienen entrenador activo.

  if (modo === "cambiar" && !tieneEntrenador) {
    redirect(rutaConEstado(modo, "sin_entrenador"));
  }

  // No permitir seleccionar el mismo
  // entrenador cuando ya está asignado.

  if (
    tieneEntrenador &&
    relacion?.entrenador_id === entrenadorId
  ) {
    redirect(rutaConEstado(modo, "mismo_entrenador"));
  }

  // La función PostgreSQL realiza la operación,
  // comprueba restricciones y registra auditoría.

  const { error } = await admin.rpc(
    "admin_reasignar_entrenador",
    {
      p_actor_id: responsableId,
      p_cliente_id: clienteId,
      p_entrenador_id: entrenadorId,
      p_motivo: motivo,
    }
  );

  if (error) {
    console.error(
      "Admin: asignación rechazada",
      {
        code: error.code,
        message: error.message,
      }
    );

    redirect(rutaConEstado(modo, "rechazado"));
  }

  revalidatePath("/administrador");
  revalidatePath("/administrador/entrenadores");
  revalidatePath("/administrador/usuarios");
  revalidatePath(RUTA);

  redirect(rutaConEstado(modo, "correcto"));
}

// ============================================
// COMPONENTES VISUALES
// ============================================

function Cargando() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg)] p-8 text-cyan-800 dark:bg-[#08101f] dark:text-cyan-200">
      Consultando asignaciones...
    </main>
  );
}

function Indicador({
  titulo,
  valor,
  descripcion,
}: {
  titulo: string;
  valor: number | string;
  descripcion: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--ecf-border)] bg-[var(--ecf-surface)] p-5 shadow-sm dark:border-white/10 dark:bg-[#15263d]">
      <p className="text-xs font-semibold text-[var(--ecf-muted)] dark:text-slate-400">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black tabular-nums">
        {valor}
      </p>

      <p className="mt-2 text-xs leading-5 text-[var(--ecf-muted)] dark:text-slate-400">
        {descripcion}
      </p>
    </article>
  );
}

// ============================================
// CONTENIDO PROTEGIDO
// ============================================

async function Contenido({ searchParams }: Props) {
  await connection();

  const parametros = await searchParams;

  const modo = obtenerModo(parametros.modo);
  const estado = parametros.estado;

  const sesion = await createClient();

  const {
    data: autenticacion,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (errorAuth || !autenticacion.user) {
    redirect("/login");
  }

  const {
    data: rol,
    error: errorRol,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", autenticacion.user.id)
    .maybeSingle();

  if (
    errorRol ||
    rol?.rol !== "administrador"
  ) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg)] p-10 text-[var(--ecf-text)] dark:bg-[#08101f] dark:text-white">
        <h1 className="text-2xl font-bold">
          Acceso restringido
        </h1>

        <p className="mt-3">
          Esta sección es exclusiva del administrador.
        </p>

        <Link
          href="/administrador"
          className="mt-5 inline-block font-bold text-cyan-700 dark:text-cyan-300"
        >
          Volver al panel
        </Link>
      </main>
    );
  }

  const admin = adminPrivado();

  if (!admin) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg)] p-10 text-[var(--ecf-text)] dark:bg-[#08101f] dark:text-white">
        <h1 className="text-2xl font-bold">
          Configuración pendiente
        </h1>

        <p className="mt-3">
          No se pudo inicializar el cliente
          administrativo de Supabase.
        </p>
      </main>
    );
  }

  // ==========================================
  // CONSULTAR INFORMACIÓN
  // ==========================================

  const [
    usuariosResp,
    rolesResp,
    relacionesResp,
    participantesResp,
    planesResp,
  ] = await Promise.all([
    admin
      .from("usuarios")
      .select("id,nombre_completo", {
        count: "exact",
      })
      .limit(1000),

    admin
      .from("usuario_roles")
      .select("usuario_id,rol", {
        count: "exact",
      })
      .in("rol", ["cliente", "entrenador"])
      .limit(1000),

    admin
      .from("asignaciones_entrenadores")
      .select("cliente_id,entrenador_id,activa", {
        count: "exact",
      })
      .limit(1000),

    admin
      .from("participantes_estudio")
      .select("cliente_id", {
        count: "exact",
      })
      .limit(1000),

    admin
      .from("asignaciones_rutinas")
      .select("cliente_id", {
        count: "exact",
      })
      .in("estado", [
        "programada",
        "activa",
        "pausada",
      ])
      .limit(1000),
  ]);

  const respuestas = [
    usuariosResp,
    rolesResp,
    relacionesResp,
    participantesResp,
    planesResp,
  ];

  const fallo = respuestas.some(
    (respuesta) =>
      Boolean(respuesta.error) ||
      respuesta.count === null ||
      respuesta.count >
        (respuesta.data?.length ?? 0)
  );

  const usuarios =
    (usuariosResp.data ?? []) as Usuario[];

  const roles =
    (rolesResp.data ?? []) as Rol[];

  const relaciones =
    (relacionesResp.data ?? []) as Relacion[];

  const participantes =
    (participantesResp.data ?? []) as Participante[];

  const planes =
    (planesResp.data ?? []) as Plan[];

  const nombres = new Map(
    usuarios.map((usuario) => [
      usuario.id,
      usuario.nombre_completo?.trim() || "Sin nombre",
    ])
  );

  // Solo las relaciones activas determinan
  // quién es el entrenador actual.

  const relacionesActivas = relaciones.filter(
    (relacion) => relacion.activa === true
  );

  const asignacionesActuales = new Map(
    relacionesActivas.map((relacion) => [
      relacion.cliente_id,
      relacion,
    ])
  );

  const enEstudio = new Set(
    participantes.map(
      (participante) => participante.cliente_id
    )
  );

  const conPlanVigente = new Set(
    planes.map((plan) => plan.cliente_id)
  );

  // ==========================================
  // ENTRENADORES
  // ==========================================

  const entrenadores = roles
    .filter(
      (registro) =>
        registro.rol === "entrenador" &&
        nombres.has(registro.usuario_id)
    )
    .map((registro) => ({
      id: registro.usuario_id,
      nombre:
        nombres.get(registro.usuario_id) ?? "Sin nombre",
    }))
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );

  // ==========================================
  // CLIENTES Y RESTRICCIONES
  // ==========================================

  const clientes: Cliente[] = roles
    .filter(
      (registro) =>
        registro.rol === "cliente" &&
        nombres.has(registro.usuario_id)
    )
    .map((registro) => {
      const actual = asignacionesActuales.get(
        registro.usuario_id
      );

      const participaEstudio = enEstudio.has(
        registro.usuario_id
      );

      const tienePlan = conPlanVigente.has(
        registro.usuario_id
      );

      const motivos: string[] = [];

      if (participaEstudio) {
        motivos.push("Participa en el estudio");
      }

      if (tienePlan) {
        motivos.push("Tiene un plan vigente");
      }

      return {
        id: registro.usuario_id,

        nombre:
          nombres.get(registro.usuario_id) ??
          "Sin nombre",

        entrenadorActualId:
          actual?.entrenador_id ?? null,

        entrenadorActual: actual
          ? nombres.get(actual.entrenador_id) ??
            "Entrenador no disponible"
          : "Sin entrenador",

        protegido: motivos.length > 0,

        motivoProteccion:
          motivos.join(" · "),
      };
    })
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );

  // Primera asignación:
  // clientes sin entrenador y sin bloqueos.

  const clientesPorAsignar = clientes.filter(
    (cliente) =>
      !cliente.protegido &&
      cliente.entrenadorActualId === null
  );

  // Reasignación:
  // clientes que ya tienen entrenador,
  // siempre que no estén protegidos.

  const clientesParaCambio = clientes.filter(
    (cliente) =>
      !cliente.protegido &&
      cliente.entrenadorActualId !== null
  );

  const clientesProtegidos = clientes.filter(
    (cliente) => cliente.protegido
  );

  const clientesConEntrenador = clientes.filter(
    (cliente) =>
      cliente.entrenadorActualId !== null
  );

  const clientesSinEntrenador = clientes.filter(
    (cliente) =>
      cliente.entrenadorActualId === null
  );

  const clientesDelModo =
    modo === "asignar"
      ? clientesPorAsignar
      : clientesParaCambio;

  const permitirFormulario =
    !fallo &&
    clientesDelModo.length > 0 &&
    entrenadores.length > 0;

  // ==========================================
  // MENSAJES
  // ==========================================

  const mensajes: Record<string, string> = {
    correcto:
      "La operación se registró correctamente y quedó auditada.",

    datos:
      "Comprueba el cliente, el entrenador y el motivo. Este último debe tener entre 15 y 500 caracteres.",

    configuracion:
      "No se pudo inicializar la conexión administrativa.",

    ya_asignado:
      "Este cliente ya tiene un entrenador activo. Utiliza la sección Cambiar entrenador.",

    sin_entrenador:
      "Este cliente no tiene un entrenador activo. Utiliza la sección Primera asignación.",

    mismo_entrenador:
      "El entrenador seleccionado ya es el responsable actual del cliente.",

    rechazado:
      "La operación fue rechazada por una validación del servidor o de la base de datos. Revisa los registros de Vercel.",
  };

  const claseCampo =
    "min-h-12 w-full rounded-xl border border-[var(--ecf-border)] bg-[var(--ecf-surface)] px-4 py-3 text-sm text-[var(--ecf-text)] outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-[#081526] dark:text-white";

  const claseTarjeta =
    "rounded-2xl border border-[var(--ecf-border)] bg-[var(--ecf-surface)] shadow-sm dark:border-white/10 dark:bg-[#13233a]";

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <main className="min-h-screen bg-[var(--ecf-bg)] text-[var(--ecf-text)] dark:bg-[#08101f] dark:text-white">
      <header className="border-b border-[var(--ecf-border)] bg-[var(--ecf-surface)] px-5 py-5 dark:border-white/10 dark:bg-[#102038]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/administrador/entrenadores"
            className="text-sm font-bold text-cyan-700 hover:underline dark:text-cyan-300"
          >
            ← Volver a entrenadores
          </Link>

          <span className="text-xs font-semibold text-[var(--ecf-muted)] dark:text-slate-400">
            EVOLUTION CENTER FIT 2.0 · ADMINISTRACIÓN
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        {/* ENCABEZADO */}

        <section className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-indigo-50 p-7 dark:border-cyan-400/15 dark:from-[#173a50] dark:to-[#191e3e] sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            Gestión administrativa
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Asignaciones de entrenadores
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Vincula clientes con entrenadores, consulta
            sus responsables actuales y gestiona cambios
            autorizados sin alterar los registros de
            entrenamiento.
          </p>
        </section>

        {/* AVISOS */}

        {estado && mensajes[estado] && (
          <div
            role="status"
            className={`rounded-2xl border p-5 text-sm font-medium ${
              estado === "correcto"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200"
                : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
            }`}
          >
            {mensajes[estado]}
          </div>
        )}

        {fallo && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200"
          >
            No se pudo consultar toda la información
            necesaria o se alcanzó el límite de registros.

            Las operaciones permanecen bloqueadas
            para evitar cambios incorrectos.
          </div>
        )}

        {/* INDICADORES */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador
            titulo="Clientes sin entrenador"
            valor={
              fallo
                ? "—"
                : clientesSinEntrenador.length
            }
            descripcion="Relaciones activas pendientes"
          />

          <Indicador
            titulo="Clientes con entrenador"
            valor={
              fallo
                ? "—"
                : clientesConEntrenador.length
            }
            descripcion="Clientes vinculados actualmente"
          />

          <Indicador
            titulo="Clientes protegidos"
            valor={
              fallo
                ? "—"
                : clientesProtegidos.length
            }
            descripcion="Con restricciones de asignación"
          />

          <Indicador
            titulo="Entrenadores registrados"
            valor={
              fallo
                ? "—"
                : entrenadores.length
            }
            descripcion="Cuentas con rol entrenador"
          />
        </section>

        {/* SELECTOR DE OPERACIÓN */}

        <section className={claseTarjeta + " p-5 sm:p-7"}>
          <h2 className="text-lg font-extrabold">
            ¿Qué deseas realizar?
          </h2>

          <p className="mt-2 text-sm text-[var(--ecf-muted)] dark:text-slate-400">
            Selecciona el tipo de operación administrativa.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href={`${RUTA}?modo=asignar`}
              aria-current={
                modo === "asignar" ? "page" : undefined
              }
              className={`rounded-2xl border p-5 transition ${
                modo === "asignar"
                  ? "border-cyan-400 bg-cyan-50 text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-200"
                  : "border-[var(--ecf-border)] hover:border-cyan-400 dark:border-white/15"
              }`}
            >
              <p className="font-black">
                1. Primera asignación
              </p>

              <p className="mt-2 text-sm opacity-80">
                Asignar entrenador a un cliente que
                todavía no tiene uno activo.
              </p>

              <p className="mt-3 text-xs font-bold">
                {fallo
                  ? "—"
                  : clientesPorAsignar.length}{" "}
                clientes elegibles
              </p>
            </Link>

            <Link
              href={`${RUTA}?modo=cambiar`}
              aria-current={
                modo === "cambiar" ? "page" : undefined
              }
              className={`rounded-2xl border p-5 transition ${
                modo === "cambiar"
                  ? "border-cyan-400 bg-cyan-50 text-cyan-900 dark:bg-cyan-400/10 dark:text-cyan-200"
                  : "border-[var(--ecf-border)] hover:border-cyan-400 dark:border-white/15"
              }`}
            >
              <p className="font-black">
                2. Cambiar entrenador
              </p>

              <p className="mt-2 text-sm opacity-80">
                Reasignar un cliente que ya cuenta
                con un entrenador responsable.
              </p>

              <p className="mt-3 text-xs font-bold">
                {fallo
                  ? "—"
                  : clientesParaCambio.length}{" "}
                clientes elegibles
              </p>
            </Link>
          </div>
        </section>

        {/* FORMULARIO */}

        <section className={claseTarjeta + " p-6 sm:p-8"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                {modo === "asignar"
                  ? "Nueva relación"
                  : "Reasignación supervisada"}
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {modo === "asignar"
                  ? "Asignar entrenador"
                  : "Cambiar entrenador responsable"}
              </h2>
            </div>

            <span className="rounded-full border border-cyan-300 px-3 py-1 text-xs font-bold text-cyan-800 dark:border-cyan-400/30 dark:text-cyan-200">
              {fallo
                ? "—"
                : clientesDelModo.length}{" "}
              disponibles
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-[var(--ecf-muted)] dark:text-slate-400">
            {modo === "asignar"
              ? "Selecciona un cliente sin entrenador activo y establece su responsable."
              : "Selecciona un cliente con entrenador activo y registra el motivo del cambio."}
          </p>

          <form
            key={modo}
            action={guardarAsignacion}
            className="mt-6 space-y-5"
          >
            <input
              type="hidden"
              name="modo"
              value={modo}
            />

            {/* CLIENTE */}

            <div>
              <label
                htmlFor="clienteId"
                className="mb-2 block text-sm font-bold"
              >
                Cliente
              </label>

              <select
                id="clienteId"
                name="clienteId"
                defaultValue=""
                required
                disabled={!permitirFormulario}
                className={claseCampo}
              >
                <option value="" disabled>
                  Selecciona un cliente
                </option>

                {clientesDelModo.map((cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {modo === "cambiar"
                      ? `${cliente.nombre} · Actual: ${cliente.entrenadorActual}`
                      : cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* ENTRENADOR */}

            <div>
              <label
                htmlFor="entrenadorId"
                className="mb-2 block text-sm font-bold"
              >
                {modo === "asignar"
                  ? "Entrenador responsable"
                  : "Nuevo entrenador responsable"}
              </label>

              <select
                id="entrenadorId"
                name="entrenadorId"
                defaultValue=""
                required
                disabled={!permitirFormulario}
                className={claseCampo}
              >
                <option value="" disabled>
                  Selecciona un entrenador
                </option>

                {entrenadores.map((entrenador) => (
                  <option
                    key={entrenador.id}
                    value={entrenador.id}
                  >
                    {entrenador.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* JUSTIFICACIÓN */}

            <div>
              <label
                htmlFor="motivo"
                className="mb-2 block text-sm font-bold"
              >
                {modo === "asignar"
                  ? "Motivo de la asignación"
                  : "Justificación del cambio"}
              </label>

              <textarea
                id="motivo"
                name="motivo"
                required
                minLength={15}
                maxLength={500}
                rows={4}
                disabled={!permitirFormulario}
                placeholder={
                  modo === "asignar"
                    ? "Ejemplo: Se designa al entrenador responsable del seguimiento inicial del cliente."
                    : "Ejemplo: El cliente solicita un cambio de entrenador por disponibilidad de horarios."
                }
                className={claseCampo}
              />

              <p className="mt-2 text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                Entre 15 y 500 caracteres.
                La justificación se conservará
                en la auditoría.
              </p>
            </div>

            <button
              type="submit"
              disabled={!permitirFormulario}
              className="min-h-12 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {modo === "asignar"
                ? "Confirmar asignación"
                : "Confirmar cambio de entrenador"}
            </button>
          </form>

          {!permitirFormulario && !fallo && (
            <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              No hay clientes elegibles para esta
              operación o no existen entrenadores
              disponibles.
            </p>
          )}
        </section>

        {/* ASIGNACIONES ACTUALES */}

        <section className={claseTarjeta + " p-6"}>
          <details>
            <summary className="cursor-pointer text-lg font-extrabold">
              Consultar asignaciones actuales
            </summary>

            <p className="mt-3 text-sm text-[var(--ecf-muted)] dark:text-slate-400">
              Relaciones activas registradas en
              el sistema.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--ecf-border)] dark:border-white/10">
                    <th className="px-3 py-3">
                      Cliente
                    </th>

                    <th className="px-3 py-3">
                      Entrenador
                    </th>

                    <th className="px-3 py-3">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {clientesConEntrenador.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="border-b border-[var(--ecf-border)] dark:border-white/10"
                    >
                      <td className="px-3 py-3 font-semibold">
                        {cliente.nombre}
                      </td>

                      <td className="px-3 py-3">
                        {cliente.entrenadorActual}
                      </td>

                      <td className="px-3 py-3">
                        {cliente.protegido
                          ? "Protegido"
                          : "Activa"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {clientesConEntrenador.length === 0 && (
                <p className="py-5 text-sm text-[var(--ecf-muted)]">
                  No hay asignaciones activas.
                </p>
              )}
            </div>
          </details>
        </section>

        {/* CLIENTES PROTEGIDOS */}

        <section className={claseTarjeta + " p-6"}>
          <details>
            <summary className="cursor-pointer text-lg font-extrabold">
              Clientes con restricciones
              {!fallo &&
                ` (${clientesProtegidos.length})`}
            </summary>

            <p className="mt-3 text-sm leading-6 text-[var(--ecf-muted)] dark:text-slate-400">
              Estos clientes no pueden cambiar
              de entrenador desde esta pantalla,
              debido a las reglas actuales del
              estudio o de sus planes vigentes.
            </p>

            <div className="mt-5 space-y-3">
              {clientesProtegidos.map((cliente) => (
                <article
                  key={cliente.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-400/20 dark:bg-amber-400/10"
                >
                  <div>
                    <p className="font-bold">
                      {cliente.nombre}
                    </p>

                    <p className="mt-1 text-xs text-[var(--ecf-muted)] dark:text-slate-400">
                      {cliente.entrenadorActual}
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    {cliente.motivoProteccion}
                  </span>
                </article>
              ))}

              {clientesProtegidos.length === 0 && (
                <p className="text-sm text-[var(--ecf-muted)]">
                  No existen clientes protegidos
                  entre los registros consultados.
                </p>
              )}
            </div>
          </details>
        </section>

        {/* INFORMACIÓN */}

        <p className="pb-5 text-xs leading-6 text-[var(--ecf-muted)] dark:text-slate-400">
          Las operaciones de asignación se validan
          nuevamente en PostgreSQL y se registran
          mediante auditoría.

          Esta pantalla no modifica directamente
          planes, sesiones, grupos de investigación
          ni recomendaciones inteligentes.
        </p>
      </div>
    </main>
  );
}

// ============================================
// PÁGINA
// ============================================

export default function AsignarEntrenadorPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}