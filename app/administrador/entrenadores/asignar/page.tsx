
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import {
  createClient as createAdmin,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// EVOLUTION CENTER FIT 2.0
// FASE 111.12 - ASIGNACION DE ENTRENADORES

type Props = {
  searchParams: Promise<{
    estado?: string;
  }>;
};

type Rol = {
  usuario_id: string;
  rol: string;
};

type Usuario = {
  id: string;
  nombre_completo: string | null;
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

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ================================================
// CLIENTE PRIVILEGIADO DEL SERVIDOR
// ================================================

function adminPrivado() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;

  return createAdmin(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ================================================
// ACCION DE GUARDADO
// ================================================

async function asignarEntrenador(
  formData: FormData
) {
  "use server";

  const clienteId = String(
    formData.get("clienteId") ?? ""
  );

  const entrenadorId = String(
    formData.get("entrenadorId") ?? ""
  );

  const motivo = String(
    formData.get("motivo") ?? ""
  ).trim();

  const base =
    "/administrador/entrenadores/asignar";

  if (
    !UUID.test(clienteId) ||
    !UUID.test(entrenadorId) ||
    clienteId === entrenadorId ||
    motivo.length < 15 ||
    motivo.length > 500
  ) {
    redirect(`${base}?estado=datos`);
  }

  // Verificar la identidad.

  const sesion = await createClient();

  const {
    data: auth,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (errorAuth || !auth.user) {
    redirect("/login");
  }

  // Verificar permisos administrativos.

  const {
    data: rol,
    error: errorRol,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", auth.user.id)
    .maybeSingle();

  if (
    errorRol ||
    rol?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  const admin = adminPrivado();

  if (!admin) {
    redirect(
      `${base}?estado=configuracion`
    );
  }

  // Ejecutar el cambio atomico en PostgreSQL.

  const { error } = await admin.rpc(
    "admin_reasignar_entrenador",
    {
      p_actor_id: auth.user.id,
      p_cliente_id: clienteId,
      p_entrenador_id: entrenadorId,
      p_motivo: motivo,
    }
  );

  if (error) {
    console.error(
      "Admin: reasignación rechazada",
      {
        code: error.code,
        message: error.message,
      }
    );

    redirect(
      `${base}?estado=rechazado`
    );
  }

  // Actualizar vistas administrativas.

  revalidatePath("/administrador");
  revalidatePath(
    "/administrador/entrenadores"
  );
  revalidatePath(
    "/administrador/usuarios"
  );

  redirect(
    `${base}?estado=correcto`
  );
}

// ================================================
// CARGA
// ================================================

function Cargando() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08101f] text-cyan-200">
      Comprobando asignaciones...
    </main>
  );
}

// ================================================
// PANTALLA PROTEGIDA
// ================================================

async function Contenido({
  searchParams,
}: Props) {
  await connection();

  const { estado } = await searchParams;

  const sesion = await createClient();

  const {
    data: auth,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (errorAuth || !auth.user) {
    redirect("/login");
  }

  const {
    data: rol,
    error: errorRol,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", auth.user.id)
    .maybeSingle();

  if (
    errorRol ||
    rol?.rol !== "administrador"
  ) {
    return (
      <main className="min-h-screen bg-[#08101f] p-10 text-white">
        <p>Acceso restringido al administrador.</p>
        <Link
          className="text-cyan-300"
          href="/administrador"
        >
          Volver
        </Link>
      </main>
    );
  }

  const admin = adminPrivado();

  if (!admin) {
    return (
      <main className="min-h-screen bg-[#08101f] p-10 text-white">
        <p>
          Falta configurar la credencial privada
          del servidor.
        </p>
        <Link
          className="text-cyan-300"
          href="/administrador"
        >
          Volver
        </Link>
      </main>
    );
  }

  // Consultas necesarias para verificar
  // clientes, entrenadores y protecciones.

  const [
    usuariosResp,
    rolesResp,
    relacionesResp,
    participantesResp,
    planesResp,
  ] = await Promise.all([
    admin
      .from("usuarios")
      .select(
        "id,nombre_completo",
        { count: "exact" }
      )
      .limit(1000),

    admin
      .from("usuario_roles")
      .select(
        "usuario_id,rol",
        { count: "exact" }
      )
      .in(
        "rol",
        ["cliente", "entrenador"]
      )
      .limit(1000),

    admin
      .from("asignaciones_entrenadores")
      .select(
        "cliente_id,entrenador_id,activa",
        { count: "exact" }
      )
      .limit(1000),

    admin
      .from("participantes_estudio")
      .select(
        "cliente_id",
        { count: "exact" }
      )
      .limit(1000),

    admin
      .from("asignaciones_rutinas")
      .select(
        "cliente_id",
        { count: "exact" }
      )
      .in(
        "estado",
        ["programada", "activa", "pausada"]
      )
      .limit(1000),
  ]);

  // Si una consulta falla o llega incompleta,
  // no permitir asignaciones.

  const respuestas = [
    usuariosResp,
    rolesResp,
    relacionesResp,
    participantesResp,
    planesResp,
  ];

  const fallo = respuestas.some(
    (resultado) =>
      Boolean(resultado.error) ||
      resultado.count === null ||
      resultado.count >
        (resultado.data?.length ?? 0)
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
      usuario.nombre_completo?.trim() ||
        "Sin nombre",
    ])
  );

  const asignados = new Map(
    relaciones.map((relacion) => [
      relacion.cliente_id,
      relacion,
    ])
  );

  const enEstudio = new Set(
    participantes.map(
      (participante) =>
        participante.cliente_id
    )
  );

  const planVigente = new Set(
    planes.map((plan) => plan.cliente_id)
  );

  const entrenadores = roles
    .filter(
      (registro) =>
        registro.rol === "entrenador" &&
        nombres.has(registro.usuario_id)
    )
    .map((registro) => ({
      id: registro.usuario_id,
      nombre:
        nombres.get(registro.usuario_id)!,
    }))
    .sort((a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es"
      )
    );

  const clientes = roles
    .filter(
      (registro) =>
        registro.rol === "cliente" &&
        nombres.has(registro.usuario_id)
    )
    .map((registro) => {
      const vinculo = asignados.get(
        registro.usuario_id
      );

      const protegido =
        enEstudio.has(registro.usuario_id) ||
        planVigente.has(registro.usuario_id);

      return {
        id: registro.usuario_id,

        nombre: nombres.get(
          registro.usuario_id
        )!,

        protegido,

        motivo: enEstudio.has(
          registro.usuario_id
        )
          ? "Participa en el estudio"
          : planVigente.has(
              registro.usuario_id
            )
            ? "Tiene un plan vigente"
            : "Disponible",

        actual: vinculo
          ? nombres.get(
              vinculo.entrenador_id
            ) ?? "Desconocido"
          : "Sin entrenador",
      };
    })
    .sort((a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es"
      )
    );

  const disponibles = clientes.filter(
    (cliente) => !cliente.protegido
  );

  const permitirFormulario =
    !fallo &&
    disponibles.length > 0 &&
    entrenadores.length > 0;

  const mensajes: Record<string, string> = {
    correcto:
      "Asignación registrada y auditada correctamente.",

    datos:
      "Comprueba el cliente, el entrenador y el motivo (15 a 500 caracteres).",

    configuracion:
      "Falta configurar la credencial privada en el servidor.",

    rechazado:
      "El cambio fue rechazado. Puede existir un plan vigente, una inscripción al estudio o una restricción de la base de datos. Revisa los registros del servidor.",
  };

  // ==============================================
  // INTERFAZ
  // ==============================================

  return (
    <main className="min-h-screen bg-[#08101f] text-white">
      <header className="border-b border-white/10 bg-[#102038] px-5 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <Link
            href="/administrador/entrenadores"
            className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
          >
            ← Volver a entrenadores
          </Link>

          <span className="text-xs font-semibold tracking-wide text-slate-400">
            EVOLUTION CENTER FIT 2.0 · ADMINISTRACIÓN
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        {/* CABECERA */}

        <section className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#173a50] to-[#191e3e] p-7 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
            FASE 111.12
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Asignar un entrenador
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Asigna o cambia el entrenador de un
            cliente que no participa en el estudio
            y que no tiene planes vigentes.

            Cada cambio requiere un motivo y se
            registra en la auditoría.
          </p>
        </section>

        {/* MENSAJES */}

        {estado && mensajes[estado] && (
          <div
            role="status"
            className={`rounded-2xl border p-5 text-sm ${
              estado === "correcto"
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/25 bg-amber-400/10 text-amber-200"
            }`}
          >
            {mensajes[estado]}
          </div>
        )}

        {fallo && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm leading-6 text-rose-200"
          >
            No se pudo verificar completamente la
            información o el número de registros
            supera el límite de consulta.

            Las reasignaciones permanecen
            bloqueadas por seguridad.
          </div>
        )}

        {/* INDICADORES */}

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              titulo: "Clientes consultados",
              valor: clientes.length,
            },
            {
              titulo: "Clientes disponibles",
              valor: disponibles.length,
            },
            {
              titulo: "Entrenadores",
              valor: entrenadores.length,
            },
          ].map((item) => (
            <article
              key={item.titulo}
              className="rounded-2xl border border-white/10 bg-[#15263d] p-5"
            >
              <p className="text-xs text-slate-400">
                {item.titulo}
              </p>

              <p className="mt-3 text-3xl font-black tabular-nums">
                {fallo ? "—" : item.valor}
              </p>
            </article>
          ))}
        </div>

        {/* FORMULARIO */}

        <section className="rounded-3xl border border-white/10 bg-[#13233a] p-6 sm:p-8">
          <h2 className="text-xl font-extrabold">
            Datos de la asignación
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Los clientes protegidos no pueden
            seleccionarse.

            El servidor comprobará nuevamente
            todas las reglas al guardar.
          </p>

          <form
            action={asignarEntrenador}
            className="mt-6 space-y-5"
          >
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
                required
                defaultValue=""
                disabled={!permitirFormulario}
                className="w-full rounded-xl border border-white/15 bg-[#081526] p-3 text-sm text-white disabled:opacity-50"
              >
                <option value="" disabled>
                  Selecciona un cliente
                </option>

                {clientes.map((cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                    disabled={cliente.protegido}
                  >
                    {cliente.nombre} · {cliente.actual}
                    {cliente.protegido
                      ? ` · Bloqueado: ${cliente.motivo}`
                      : ""}
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
                Entrenador responsable
              </label>

              <select
                id="entrenadorId"
                name="entrenadorId"
                required
                defaultValue=""
                disabled={!permitirFormulario}
                className="w-full rounded-xl border border-white/15 bg-[#081526] p-3 text-sm text-white disabled:opacity-50"
              >
                <option value="" disabled>
                  Selecciona un entrenador
                </option>

                {entrenadores.map(
                  (entrenador) => (
                    <option
                      key={entrenador.id}
                      value={entrenador.id}
                    >
                      {entrenador.nombre}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* MOTIVO */}

            <div>
              <label
                htmlFor="motivo"
                className="mb-2 block text-sm font-bold"
              >
                Motivo del cambio
              </label>

              <textarea
                id="motivo"
                name="motivo"
                required
                minLength={15}
                maxLength={500}
                rows={4}
                disabled={!permitirFormulario}
                placeholder="Ejemplo: El cliente solicitó el cambio por disponibilidad de horarios."
                className="w-full rounded-xl border border-white/15 bg-[#081526] p-3 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-slate-400">
                Entre 15 y 500 caracteres.
                El motivo quedará registrado.
              </p>
            </div>

            <button
              type="submit"
              disabled={!permitirFormulario}
              className="min-h-12 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirmar asignación
            </button>
          </form>

          {!permitirFormulario && !fallo && (
            <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
              No hay clientes elegibles o entrenadores
              disponibles. Los clientes del estudio
              se mantienen protegidos.
            </p>
          )}
        </section>

        {/* CLIENTES PROTEGIDOS */}

        <section className="rounded-2xl border border-white/10 bg-[#112039] p-6">
          <h2 className="text-lg font-bold">
            Clientes protegidos
          </h2>

          <div className="mt-4 space-y-2">
            {clientes
              .filter(
                (cliente) => cliente.protegido
              )
              .map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex flex-wrap justify-between gap-3 rounded-xl border border-white/10 bg-[#0b192c] p-3 text-sm"
                >
                  <span className="font-semibold">
                    {cliente.nombre}
                  </span>

                  <span className="text-amber-200">
                    {cliente.motivo}
                  </span>
                </div>
              ))}

            {clientes.every(
              (cliente) => !cliente.protegido
            ) && (
              <p className="text-sm text-slate-400">
                No hay clientes protegidos entre
                los registros consultados.
              </p>
            )}
          </div>
        </section>

        <p className="pb-5 text-xs leading-6 text-slate-400">
          Esta operación no modifica planes,
          sesiones, grupos de investigación ni
          recomendaciones de IA.
        </p>
      </div>
    </main>
  );
}

// ================================================
// PAGINA PRINCIPAL
// ================================================

export default function AsignarEntrenadorPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido
        searchParams={searchParams}
      />
    </Suspense>
  );
}
