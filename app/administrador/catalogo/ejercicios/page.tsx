
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// EVOLUTION CENTER FIT 2.0 — FASE 111.15
// Administracion segura de ejercicios.

const RUTA = "/administrador/catalogo/ejercicios";

const NIVELES = [
  "principiante",
  "intermedio",
  "avanzado",
];

const LUGARES = [
  "gimnasio",
  "casa",
  "mixto",
];

const EQUIPOS = [
  "peso_corporal",
  "mancuernas",
  "maquinas",
  "bandas",
  "barra",
];

type Props = {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    pagina?: string;
    resultado?: string;
  }>;
};

type Ejercicio = {
  id: number;
  nombre: string;
  descripcion: string | null;
  grupo_muscular: string;
  tipo: string;
  nivel: string;
  lugar: string;
  equipamiento: string;
  activo: boolean;
};

function texto(
  campo: FormDataEntryValue | null
) {
  return typeof campo === "string"
    ? campo.trim()
    : "";
}

function etiqueta(valor: string) {
  return valor.replaceAll("_", " ");
}

// ============================================
// VERIFICAR ADMINISTRADOR
// ============================================

async function administrador() {
  const sesion = await createClient();

  const { data, error } =
    await sesion.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const rol = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", data.user.id)
    .maybeSingle();

  if (
    rol.error ||
    rol.data?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return null;
  }

  return {
    actor: data.user.id,

    db: crearAdmin(url, clave, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
  };
}

// ============================================
// ACTIVAR O DESACTIVAR EJERCICIO
// ============================================

async function cambiarEstado(
  formulario: FormData
) {
  "use server";

  const acceso = await administrador();

  if (!acceso) {
    redirect(`${RUTA}?resultado=config`);
  }

  const id = Number(
    formulario.get("id")
  );

  const accion = texto(
    formulario.get("accion")
  );

  const motivo = texto(
    formulario.get("motivo")
  );

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !["activar", "desactivar"].includes(accion) ||
    motivo.length < 15 ||
    motivo.length > 500
  ) {
    redirect(`${RUTA}?resultado=datos`);
  }

  const { error } = await acceso.db.rpc(
    "ecf_admin_cambiar_estado_ejercicio_v1",
    {
      p_actor_id: acceso.actor,
      p_ejercicio_id: id,
      p_activo: accion === "activar",
      p_motivo: motivo,
    }
  );

  if (error) {
    console.error(
      "Cambio de estado rechazado:",
      error.code,
      error.message
    );

    redirect(`${RUTA}?resultado=rechazado`);
  }

  revalidatePath(RUTA);
  revalidatePath("/administrador/catalogo");
  revalidatePath("/catalogo");

  redirect(`${RUTA}?resultado=estado_ok`);
}

// ============================================
// EDITAR EJERCICIO
// ============================================

async function editar(
  formulario: FormData
) {
  "use server";

  const acceso = await administrador();

  if (!acceso) {
    redirect(`${RUTA}?resultado=config`);
  }

  const id = Number(
    formulario.get("id")
  );

  const nombre = texto(
    formulario.get("nombre")
  );

  const descripcion = texto(
    formulario.get("descripcion")
  );

  const grupo = texto(
    formulario.get("grupo_muscular")
  );

  const tipo = texto(
    formulario.get("tipo")
  );

  const nivel = texto(
    formulario.get("nivel")
  );

  const lugar = texto(
    formulario.get("lugar")
  );

  const equipo = texto(
    formulario.get("equipamiento")
  );

  const motivo = texto(
    formulario.get("motivo")
  );

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    nombre.length < 3 ||
    nombre.length > 120 ||
    descripcion.length > 700 ||
    grupo.length < 2 ||
    grupo.length > 80 ||
    tipo.length < 2 ||
    tipo.length > 60 ||
    !NIVELES.includes(nivel) ||
    !LUGARES.includes(lugar) ||
    !EQUIPOS.includes(equipo) ||
    motivo.length < 15 ||
    motivo.length > 500
  ) {
    redirect(`${RUTA}?resultado=datos`);
  }

  const { error } = await acceso.db.rpc(
    "ecf_admin_editar_ejercicio_v1",
    {
      p_actor_id: acceso.actor,
      p_ejercicio_id: id,
      p_nombre: nombre,
      p_descripcion: descripcion,
      p_grupo_muscular: grupo,
      p_tipo: tipo,
      p_nivel: nivel,
      p_lugar: lugar,
      p_equipamiento: equipo,
      p_motivo: motivo,
    }
  );

  if (error) {
    console.error(
      "Edicion rechazada:",
      error.code,
      error.message
    );

    redirect(`${RUTA}?resultado=rechazado`);
  }

  revalidatePath(RUTA);
  revalidatePath("/administrador/catalogo");
  revalidatePath("/catalogo");

  redirect(`${RUTA}?resultado=edicion_ok`);
}

// ============================================
// CARGA
// ============================================

function Cargando() {
  return (
    <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#08101e] p-8 text-cyan-800 dark:text-cyan-200">
      Cargando ejercicios...
    </main>
  );
}

// ============================================
// PANTALLA ADMINISTRATIVA
// ============================================

async function Contenido({
  searchParams,
}: Props) {
  await connection();

  const params = await searchParams;
  const acceso = await administrador();

  if (!acceso) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#08101e] p-8 text-[var(--ecf-text,#102238)] dark:text-white">
        <Link
          href="/administrador/catalogo"
          className="text-cyan-700 dark:text-cyan-300"
        >
          ← Volver
        </Link>

        <p className="mt-6">
          Falta configurar la clave privada
          del servidor.
        </p>
      </main>
    );
  }

  // ==========================================
  // BUSQUEDA Y FILTROS
  // ==========================================

  const q = (
    typeof params.q === "string"
      ? params.q
      : ""
  )
    .replace(/[%_]/g, "")
    .trim()
    .slice(0, 60);

  const estado = [
    "todos",
    "activo",
    "inactivo",
  ].includes(params.estado ?? "")
    ? params.estado!
    : "todos";

  const p = Number(params.pagina);

  const pagina =
    Number.isSafeInteger(p) && p > 0
      ? Math.min(p, 10000)
      : 1;

  const porPagina = 10;

  let consulta = acceso.db
    .from("ejercicios")
    .select(
      "id,nombre,descripcion,grupo_muscular,tipo,nivel,lugar,equipamiento,activo",
      { count: "exact" }
    );

  if (q) {
    consulta = consulta.ilike(
      "nombre",
      `%${q}%`
    );
  }

  if (estado !== "todos") {
    consulta = consulta.eq(
      "activo",
      estado === "activo"
    );
  }

  // ==========================================
  // CONSULTAS REALES
  // ==========================================

  const [
    filas,
    total,
    activos,
  ] = await Promise.all([
    consulta
      .order("id", {
        ascending: false,
      })
      .range(
        (pagina - 1) * porPagina,
        pagina * porPagina - 1
      ),

    acceso.db
      .from("ejercicios")
      .select("id", {
        head: true,
        count: "exact",
      }),

    acceso.db
      .from("ejercicios")
      .select("id", {
        head: true,
        count: "exact",
      })
      .eq("activo", true),
  ]);

  if (
    filas.error ||
    total.error ||
    activos.error
  ) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#08101e] p-8 text-[var(--ecf-text,#102238)] dark:text-white">
        <Link
          href="/administrador/catalogo"
          className="text-cyan-700 dark:text-cyan-300"
        >
          ← Volver
        </Link>

        <p className="mt-6">
          No se pudo consultar la tabla
          de ejercicios. Revisa Supabase.
        </p>
      </main>
    );
  }

  const ejercicios =
    (filas.data ?? []) as Ejercicio[];

  const ids = ejercicios.map(
    (e) => e.id
  );

  // Comprobar ejercicios utilizados en
  // rutinas o sesiones. Si falla la consulta,
  // no permitimos editar ni desactivar.

  const [
    referenciasRutinas,
    referenciasSesiones,
  ] = ids.length > 0
    ? await Promise.all([
        acceso.db
          .from("rutina_ejercicios")
          .select(
            "ejercicio_id",
            { count: "exact" }
          )
          .in("ejercicio_id", ids)
          .limit(1000),

        acceso.db
          .from("sesion_ejercicios")
          .select(
            "ejercicio_id",
            { count: "exact" }
          )
          .in("ejercicio_id", ids)
          .limit(1000),
      ])
    : [null, null];

  const referenciaCompleta = (
    r: typeof referenciasRutinas
  ) =>
    r === null ||
    (
      !r.error &&
      r.count !== null &&
      r.count <= (r.data?.length ?? 0)
    );

  const referenciasCompletas =
    referenciaCompleta(referenciasRutinas) &&
    referenciaCompleta(referenciasSesiones);

  const usados = new Set([
    ...(referenciasRutinas?.data ?? []).map(
      (r) => r.ejercicio_id
    ),

    ...(referenciasSesiones?.data ?? []).map(
      (r) => r.ejercicio_id
    ),
  ]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      (filas.count ?? 0) / porPagina
    )
  );

  // ==========================================
  // MENSAJES
  // ==========================================

  const avisos: Record<string, string> = {
    estado_ok:
      "Estado del ejercicio actualizado y auditado.",

    edicion_ok:
      "Ejercicio actualizado y auditado.",

    datos:
      "Revisa los campos y escribe un motivo de 15 a 500 caracteres.",

    rechazado:
      "Supabase rechazó el cambio. El ejercicio puede estar asociado a una rutina o tener una restricción de integridad.",

    config:
      "No están configuradas las credenciales privadas del servidor.",
  };

  function enlace(n: number) {
    const s = new URLSearchParams();

    if (q) {
      s.set("q", q);
    }

    if (estado !== "todos") {
      s.set("estado", estado);
    }

    s.set("pagina", String(n));

    return `${RUTA}?${s.toString()}`;
  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#08101e] text-[var(--ecf-text,#102238)] dark:text-white">

      {/* CABECERA */}

      <header className="border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#101d30]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 p-5">
          <strong>
            EVOLUTION CENTER FIT{" "}
            <span className="text-cyan-700 dark:text-cyan-300">
              2.0
            </span>
          </strong>

          <Link
            href="/administrador/catalogo"
            className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-4 py-2 text-sm"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">

        {/* PRESENTACION */}

        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-50 dark:from-[#19384e] to-indigo-50 dark:to-[#1b1e39] p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            FASE 111.15 · Administración
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Gestión de ejercicios
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700 dark:text-slate-300">
            Consulta, edita y activa ejercicios.
            Para proteger los entrenamientos,
            no se pueden editar ni desactivar
            ejercicios asociados a ninguna rutina
            o sesión.
          </p>

          <Link
            href="/administrador/catalogo#crear-contenido"
            className="mt-5 inline-block rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#08101e]"
          >
            + Crear ejercicio
          </Link>
        </section>

        {/* MENSAJE DE RESULTADO */}

        {params.resultado &&
          avisos[params.resultado] && (
            <p
              role="status"
              className="rounded-xl border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 p-4 text-sm text-amber-900 dark:text-amber-100"
            >
              {avisos[params.resultado]}
            </p>
          )}

        {/* RESUMEN */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              titulo: "Ejercicios totales",
              cantidad: total.count,
            },
            {
              titulo: "Activos",
              cantidad: activos.count,
            },
            {
              titulo: "Inactivos",
              cantidad:
                total.count !== null &&
                activos.count !== null
                  ? total.count - activos.count
                  : null,
            },
          ].map((item) => (
            <div
              key={item.titulo}
              className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#14263b] p-5"
            >
              <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                {item.titulo}
              </p>

              <p className="mt-2 text-3xl font-black">
                {item.cantidad ?? "—"}
              </p>
            </div>
          ))}
        </div>

        {/* FILTROS */}

        <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-5">
          <form
            action={RUTA}
            method="get"
            className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
          >
            <label
              className="sr-only"
              htmlFor="q"
            >
              Nombre del ejercicio
            </label>

            <input
              id="q"
              name="q"
              defaultValue={q}
              maxLength={60}
              placeholder="Buscar ejercicio..."
              className="min-h-11 rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-slate-50 dark:bg-[#081525] px-4 py-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white"
            />

            <label
              className="sr-only"
              htmlFor="estado"
            >
              Estado
            </label>

            <select
              id="estado"
              name="estado"
              defaultValue={estado}
              className="min-h-11 rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-slate-50 dark:bg-[#081525] px-3 py-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white"
            >
              <option value="todos">
                Todos
              </option>

              <option value="activo">
                Activos
              </option>

              <option value="inactivo">
                Inactivos
              </option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-2 font-bold text-[#08101e]"
            >
              Filtrar
            </button>
          </form>
        </section>

        {!referenciasCompletas && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 p-4 text-sm text-amber-800 dark:text-amber-200"
          >
            No se pudo verificar el uso de todos
            los ejercicios. La edición y
            desactivación están bloqueadas.
          </p>
        )}

        {/* DIRECTORIO DE EJERCICIOS */}

        <section className="space-y-4">
          <div className="flex flex-wrap justify-between gap-2 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
            <span>
              {filas.count ?? 0} resultado(s)
            </span>

            <span>
              Página {pagina} de {totalPaginas}
            </span>
          </div>

          {ejercicios.length === 0 && (
            <p className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              No se encontraron ejercicios.
            </p>
          )}

          {ejercicios.map((e) => {
            const vinculado = usados.has(e.id);

            const modificable =
              referenciasCompletas &&
              !vinculado;

            return (
              <article
                key={e.id}
                className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-5 sm:p-6"
              >
                {/* DATOS DEL EJERCICIO */}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">
                      {e.nombre}
                    </h2>

                    <p className="mt-2 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                      {etiqueta(e.nivel)}
                      {" · "}
                      {etiqueta(e.lugar)}
                      {" · "}
                      {etiqueta(e.equipamiento)}
                    </p>

                    <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                      {e.grupo_muscular}
                      {" · "}
                      {e.tipo}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      e.activo
                        ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-200"
                        : "bg-amber-50 dark:bg-amber-400/10 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    {e.activo
                      ? "Activo"
                      : "Inactivo"}
                  </span>
                </div>

                {e.descripcion && (
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                    {e.descripcion}
                  </p>
                )}

                {vinculado && (
                  <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
                    Este ejercicio se utiliza
                    en rutinas o sesiones.
                    No se puede editar ni
                    desactivar aquí.
                  </p>
                )}

                <div className="mt-5 grid gap-4 lg:grid-cols-2">

                  {/* FORMULARIO DE EDICION */}

                  <details className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-[#081525] p-4">
                    <summary className="cursor-pointer text-sm font-bold">
                      Editar ejercicio
                    </summary>

                    {modificable ? (
                      <form
                        action={editar}
                        className="mt-4 space-y-3"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={e.id}
                        />

                        <label className="block text-xs">
                          Nombre
                          <input
                            name="nombre"
                            required
                            minLength={3}
                            maxLength={120}
                            defaultValue={e.nombre}
                            className="mt-1 w-full rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#14263b] p-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white"
                          />
                        </label>

                        <label className="block text-xs">
                          Descripción
                          <textarea
                            name="descripcion"
                            maxLength={700}
                            rows={2}
                            defaultValue={
                              e.descripcion ?? ""
                            }
                            className="mt-1 w-full rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#14263b] p-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white"
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs">
                            Grupo muscular
                            <input
                              name="grupo_muscular"
                              required
                              minLength={2}
                              maxLength={80}
                              defaultValue={
                                e.grupo_muscular
                              }
                              className="mt-1 w-full rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#14263b] p-2 text-[var(--ecf-text,#102238)] dark:text-white"
                            />
                          </label>

                          <label className="text-xs">
                            Tipo
                            <input
                              name="tipo"
                              required
                              minLength={2}
                              maxLength={60}
                              defaultValue={e.tipo}
                              className="mt-1 w-full rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#14263b] p-2 text-[var(--ecf-text,#102238)] dark:text-white"
                            />
                          </label>
                        </div>

                        {[
                          {
                            campo: "nivel",
                            valores: NIVELES,
                            actual: e.nivel,
                          },
                          {
                            campo: "lugar",
                            valores: LUGARES,
                            actual: e.lugar,
                          },
                          {
                            campo: "equipamiento",
                            valores: EQUIPOS,
                            actual: e.equipamiento,
                          },
                        ].map((campo) => (
                          <label
                            key={campo.campo}
                            className="block text-xs"
                          >
                            {etiqueta(campo.campo)}

                            <select
                              name={campo.campo}
                              defaultValue={
                                campo.actual
                              }
                              className="mt-1 w-full rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#14263b] p-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white"
                            >
                              {campo.valores.map(
                                (v) => (
                                  <option
                                    key={v}
                                    value={v}
                                  >
                                    {etiqueta(v)}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        ))}

                        <label className="block text-xs">
                          Motivo del cambio
                          (obligatorio)
                          <textarea
                            name="motivo"
                            required
                            minLength={15}
                            maxLength={500}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#14263b] p-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white"
                          />
                        </label>

                        <button
                          type="submit"
                          className="min-h-11 w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-[#08101e]"
                        >
                          Guardar cambios
                        </button>
                      </form>
                    ) : (
                      <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                        Edición bloqueada por seguridad.
                      </p>
                    )}
                  </details>

                  {/* ACTIVAR O DESACTIVAR */}

                  <details className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-[#081525] p-4">
                    <summary className="cursor-pointer text-sm font-bold">
                      {e.activo
                        ? "Desactivar ejercicio"
                        : "Activar ejercicio"}
                    </summary>

                    {(!e.activo || modificable) ? (
                      <form
                        action={cambiarEstado}
                        className="mt-4 space-y-3"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={e.id}
                        />

                        <input
                          type="hidden"
                          name="accion"
                          value={
                            e.activo
                              ? "desactivar"
                              : "activar"
                          }
                        />

                        <p className="text-xs leading-5 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                          El cambio quedará registrado
                          en auditoría.
                        </p>

                        <label className="block text-xs">
                          Motivo del cambio
                          <textarea
                            name="motivo"
                            required
                            minLength={15}
                            maxLength={500}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#14263b] p-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white"
                          />
                        </label>

                        <button
                          type="submit"
                          className={`min-h-11 w-full rounded-lg px-4 py-2 text-sm font-bold text-[#08101e] ${
                            e.activo
                              ? "bg-amber-300"
                              : "bg-emerald-300"
                          }`}
                        >
                          Confirmar{" "}
                          {e.activo
                            ? "desactivación"
                            : "activación"}
                        </button>
                      </form>
                    ) : (
                      <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                        La desactivación está
                        bloqueada.
                      </p>
                    )}
                  </details>
                </div>
              </article>
            );
          })}

          {/* PAGINACION */}

          <div className="flex items-center justify-between gap-3">
            {pagina > 1 ? (
              <Link
                href={enlace(pagina - 1)}
                className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-4 py-2"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}

            {pagina < totalPaginas && (
              <Link
                href={enlace(pagina + 1)}
                className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-4 py-2"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

// ============================================
// PAGINA PRINCIPAL
// ============================================

export default function EjerciciosAdminPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}
