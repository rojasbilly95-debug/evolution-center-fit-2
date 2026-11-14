
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// ============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.14 - EDITOR ADMINISTRATIVO
// Composicion y publicacion de rutinas
// ============================================

const RUTA = "/administrador/catalogo/componer";

type Props = {
  searchParams: Promise<{
    rutina?: string;
    estado?: string;
  }>;
};

type Rutina = {
  id: number;
  nombre: string;
  objetivo: string;
  nivel: string;
  lugar: string;
  frecuencia_semanal: number;
  duracion_min: number;
  estado: string;
};

type Ejercicio = {
  id: number;
  nombre: string;
  nivel: string;
  lugar: string;
  equipamiento: string;
  activo: boolean;
};

type Componente = {
  ejercicio_id: number;
  orden: number;
  series: number;
  repeticiones: number | null;
  duracion_min: number | null;
  descanso_seg: number;
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function leerEntero(valor: FormDataEntryValue | null) {
  if (typeof valor !== "string") return NaN;

  const limpio = valor.trim();

  if (!/^\d+$/.test(limpio)) return NaN;

  return Number(limpio);
}

function leerOpcional(valor: FormDataEntryValue | null) {
  if (
    typeof valor !== "string" ||
    valor.trim() === ""
  ) {
    return null;
  }

  return leerEntero(valor);
}

function etiqueta(valor: string) {
  return valor.replaceAll("_", " ");
}

function compatible(
  rutina: Rutina,
  ejercicio: Ejercicio
) {
  const niveles: Record<string, number> = {
    principiante: 1,
    intermedio: 2,
    avanzado: 3,
  };

  const nivelCorrecto =
    (niveles[ejercicio.nivel] ?? 99) <=
    (niveles[rutina.nivel] ?? 0);

  const lugarCorrecto =
    rutina.lugar === "mixto" ||
    ejercicio.lugar === "mixto" ||
    ejercicio.lugar === rutina.lugar;

  return (
    ejercicio.activo &&
    nivelCorrecto &&
    lugarCorrecto
  );
}

// ============================================
// VALIDAR ADMINISTRADOR
// ============================================

async function verificarAdministrador() {
  const supabase = await createClient();

  const {
    data: identidad,
    error: errorIdentidad,
  } = await supabase.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    redirect("/login");
  }

  const {
    data: permiso,
    error: errorPermiso,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorPermiso ||
    permiso?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return null;
  }

  const admin = crearAdmin(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return {
    admin,
    actorId: identidad.user.id,
  };
}

// ============================================
// ACCION: AGREGAR EJERCICIO
// ============================================

async function agregarEjercicio(formData: FormData) {
  "use server";

  const acceso = await verificarAdministrador();

  if (!acceso) {
    redirect(`${RUTA}?estado=configuracion`);
  }

  const rutinaId = leerEntero(
    formData.get("rutinaId")
  );

  const ejercicioId = leerEntero(
    formData.get("ejercicioId")
  );

  const series = leerEntero(
    formData.get("series")
  );

  const repeticiones = leerOpcional(
    formData.get("repeticiones")
  );

  const duracion = leerOpcional(
    formData.get("duracionMin")
  );

  const descanso = leerEntero(
    formData.get("descansoSeg")
  );

  if (
    !Number.isSafeInteger(rutinaId) ||
    rutinaId <= 0 ||
    !Number.isSafeInteger(ejercicioId) ||
    ejercicioId <= 0 ||
    !Number.isInteger(series) ||
    series < 1 ||
    series > 10 ||
    !Number.isInteger(descanso) ||
    descanso < 0 ||
    descanso > 600 ||
    (repeticiones === null) ===
      (duracion === null) ||
    (
      repeticiones !== null &&
      (
        !Number.isInteger(repeticiones) ||
        repeticiones < 1 ||
        repeticiones > 100
      )
    ) ||
    (
      duracion !== null &&
      (
        !Number.isInteger(duracion) ||
        duracion < 1 ||
        duracion > 240
      )
    )
  ) {
    redirect(`${RUTA}?estado=datos`);
  }

  const { error } = await acceso.admin.rpc(
    "ecf_admin_agregar_ejercicio_borrador_v1",
    {
      p_actor_id: acceso.actorId,
      p_rutina_id: rutinaId,
      p_ejercicio_id: ejercicioId,
      p_series: series,
      p_repeticiones: repeticiones,
      p_duracion_min: duracion,
      p_descanso_seg: descanso,
    }
  );

  if (error) {
    console.error(
      "Error agregando ejercicio:",
      error.code,
      error.message
    );

    redirect(
      `${RUTA}?rutina=${rutinaId}&estado=error`
    );
  }

  revalidatePath(RUTA);
  revalidatePath("/administrador/catalogo");

  redirect(
    `${RUTA}?rutina=${rutinaId}&estado=agregado`
  );
}

// ============================================
// ACCION: PUBLICAR RUTINA
// ============================================

async function publicarRutina(formData: FormData) {
  "use server";

  const acceso = await verificarAdministrador();

  if (!acceso) {
    redirect(`${RUTA}?estado=configuracion`);
  }

  const rutinaId = leerEntero(
    formData.get("rutinaId")
  );

  const confirmar = formData.get("confirmar");

  if (
    !Number.isSafeInteger(rutinaId) ||
    rutinaId <= 0 ||
    confirmar !== "si"
  ) {
    redirect(`${RUTA}?estado=datos`);
  }

  const { error } = await acceso.admin.rpc(
    "ecf_admin_publicar_rutina_v1",
    {
      p_actor_id: acceso.actorId,
      p_rutina_id: rutinaId,
    }
  );

  if (error) {
    console.error(
      "Error publicando rutina:",
      error.code,
      error.message
    );

    redirect(
      `${RUTA}?rutina=${rutinaId}&estado=error_publicar`
    );
  }

  revalidatePath(RUTA);
  revalidatePath("/administrador/catalogo");
  revalidatePath("/catalogo");

  redirect(
    `${RUTA}?rutina=${rutinaId}&estado=publicada`
  );
}

// ============================================
// PANTALLA DE CARGA
// ============================================

function Cargando() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] text-cyan-800 dark:text-cyan-200">
      Cargando editor de rutinas...
    </main>
  );
}

// ============================================
// CONTENIDO ADMINISTRATIVO
// ============================================

async function Contenido({
  searchParams,
}: Props) {
  await connection();

  const parametros = await searchParams;

  const acceso = await verificarAdministrador();

  if (!acceso) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] p-8 text-[var(--ecf-text,#102238)] dark:text-white">
        <h1 className="text-xl font-bold">
          Configuración pendiente
        </h1>

        <p className="mt-3 text-sm">
          Falta configurar las credenciales
          privadas del servidor.
        </p>

        <Link
          href="/administrador"
          className="mt-5 inline-block text-cyan-700 dark:text-cyan-300"
        >
          Volver al administrador
        </Link>
      </main>
    );
  }

  const admin = acceso.admin;

  // ==========================================
  // CONSULTAR RUTINAS Y EJERCICIOS
  // ==========================================

  const [
    respuestaRutinas,
    respuestaEjercicios,
  ] = await Promise.all([
    admin
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,lugar,frecuencia_semanal,duracion_min,estado",
        { count: "exact" }
      )
      .order("id", { ascending: false })
      .limit(250),

    admin
      .from("ejercicios")
      .select(
        "id,nombre,nivel,lugar,equipamiento,activo",
        { count: "exact" }
      )
      .eq("activo", true)
      .order("nombre", { ascending: true })
      .limit(500),
  ]);

  if (
    respuestaRutinas.error ||
    respuestaEjercicios.error
  ) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] p-8 text-[var(--ecf-text,#102238)] dark:text-white">
        <h1 className="text-xl font-bold">
          No se pudo consultar el catálogo
        </h1>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Revisa la conexión con Supabase.
        </p>

        <Link
          href="/administrador/catalogo"
          className="mt-5 inline-block text-cyan-700 dark:text-cyan-300"
        >
          Volver al catálogo
        </Link>
      </main>
    );
  }

  const rutinas =
    (respuestaRutinas.data ?? []) as Rutina[];

  const ejercicios =
    (respuestaEjercicios.data ?? []) as Ejercicio[];

  const idSeleccionado =
    typeof parametros.rutina === "string" &&
    /^\d+$/.test(parametros.rutina)
      ? Number(parametros.rutina)
      : 0;

  let rutina: Rutina | null =
    rutinas.find(
      (item) => item.id === idSeleccionado
    ) ?? null;

  if (
    idSeleccionado > 0 &&
    Number.isSafeInteger(idSeleccionado) &&
    !rutina
  ) {
    const resultado = await admin
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,lugar,frecuencia_semanal,duracion_min,estado"
      )
      .eq("id", idSeleccionado)
      .maybeSingle();

    if (!resultado.error && resultado.data) {
      rutina = resultado.data as Rutina;
    }
  }

  // ==========================================
  // CONSULTAR COMPOSICION DE LA RUTINA
  // ==========================================

  let componentes: Componente[] = [];
  let errorComposicion = false;

  if (rutina) {
    const respuesta = await admin
      .from("rutina_ejercicios")
      .select(
        "ejercicio_id,orden,series,repeticiones,duracion_min,descanso_seg",
        { count: "exact" }
      )
      .eq("rutina_id", rutina.id)
      .order("orden", { ascending: true })
      .limit(300);

    if (
      respuesta.error ||
      respuesta.count === null ||
      respuesta.count >
        (respuesta.data?.length ?? 0)
    ) {
      errorComposicion = true;
    } else {
      componentes =
        (respuesta.data ?? []) as Componente[];
    }
  }

  const mapaEjercicios = new Map(
    ejercicios.map((ejercicio) => [
      ejercicio.id,
      ejercicio,
    ])
  );

  const idsUtilizados = new Set(
    componentes.map(
      (item) => item.ejercicio_id
    )
  );

  const disponibles = rutina
    ? ejercicios.filter(
        (ejercicio) =>
          !idsUtilizados.has(ejercicio.id) &&
          compatible(rutina, ejercicio)
      )
    : [];

  const composicionValida =
    rutina !== null &&
    !errorComposicion &&
    componentes.length > 0 &&
    componentes.every((item) => {
      const ejercicio = mapaEjercicios.get(
        item.ejercicio_id
      );

      const ejecucionValida =
        (
          item.repeticiones !== null &&
          item.duracion_min === null &&
          item.repeticiones >= 1 &&
          item.repeticiones <= 100
        ) ||
        (
          item.duracion_min !== null &&
          item.repeticiones === null &&
          item.duracion_min >= 1 &&
          item.duracion_min <= 240
        );

      return (
        !!ejercicio &&
        compatible(rutina, ejercicio) &&
        item.series >= 1 &&
        item.series <= 10 &&
        item.descanso_seg >= 0 &&
        item.descanso_seg <= 600 &&
        ejecucionValida
      );
    });

  const borradores = rutinas.filter(
    (item) => item.estado === "borrador"
  );

  const consultaParcial =
    (respuestaRutinas.count ?? 0) >
      rutinas.length ||
    (respuestaEjercicios.count ?? 0) >
      ejercicios.length;

  const mensajes: Record<string, string> = {
    agregado:
      "Ejercicio agregado correctamente a la rutina.",
    publicada:
      "La rutina fue publicada correctamente.",
    datos:
      "Revisa los valores ingresados. Usa repeticiones o duración, pero no ambos.",
    error:
      "No se pudo agregar el ejercicio. Revisa los registros del servidor.",
    error_publicar:
      "No se pudo publicar. La rutina debe tener ejercicios completos y válidos.",
    configuracion:
      "Falta configurar las credenciales privadas.",
  };

  const mensaje =
    typeof parametros.estado === "string"
      ? mensajes[parametros.estado]
      : undefined;

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] text-[var(--ecf-text,#102238)] dark:text-white">

      {/* CABECERA */}

      <header className="border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#101d30]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-black">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-700 dark:text-cyan-300">
                2.0
              </span>
            </p>

            <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Administración de rutinas
            </p>
          </div>

          <Link
            href="/administrador/catalogo"
            className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-white/10"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 p-5 sm:py-8">

        {/* BIENVENIDA */}

        <section className="rounded-3xl border border-cyan-200 dark:border-cyan-400/20 bg-gradient-to-br from-[#e6f8fc] dark:from-[#19384e] to-[#eef1ff] dark:to-[#1b1e39] p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            FASE 111.14
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Editor de rutinas
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Selecciona una rutina en borrador,
            agrega ejercicios activos y configura
            su ejecución.

            Cuando todos los ejercicios sean
            compatibles, podrás publicar la rutina.
          </p>
        </section>

        {/* MENSAJES */}

        {mensaje && (
          <div
            role="status"
            className="rounded-xl border border-cyan-200 dark:border-cyan-400/25 bg-cyan-50 dark:bg-cyan-400/10 p-4 text-sm text-cyan-900 dark:text-cyan-100"
          >
            {mensaje}
          </div>
        )}

        {consultaParcial && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 dark:border-amber-400/25 bg-amber-50 dark:bg-amber-400/10 p-4 text-sm text-amber-800 dark:text-amber-200"
          >
            El catálogo supera el límite de
            consulta. Algunas opciones podrían
            no mostrarse.
          </div>
        )}

        {/* PASO 1: ELEGIR RUTINA */}

        <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-6">
          <h2 className="text-xl font-bold">
            1. Seleccionar rutina
          </h2>

          <p className="mt-2 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
            Hay {borradores.length} borrador(es)
            en los registros consultados.
          </p>

          <form
            action={RUTA}
            method="get"
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <select
              name="rutina"
              aria-label="Rutina"
              defaultValue={rutina?.id ?? ""}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#081525] px-4 py-3 text-sm text-[var(--ecf-text,#102238)] dark:text-white"
            >
              <option value="">
                Selecciona una rutina
              </option>

              {borradores.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.nombre} (#{item.id})
                </option>
              ))}

              {rutina &&
                rutina.estado !== "borrador" && (
                  <option value={rutina.id}>
                    {rutina.nombre} - Solo lectura
                  </option>
                )}
            </select>

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              Abrir rutina
            </button>
          </form>

          {borradores.length === 0 && (
            <p className="mt-4 text-sm text-amber-800 dark:text-amber-200">
              No hay borradores disponibles.
              Primero crea una rutina desde
              el catálogo administrativo.
            </p>
          )}
        </section>

        {/* DETALLE DE RUTINA */}

        {rutina && (
          <>
            <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">
                    {rutina.nombre}
                  </h2>

                  <p className="mt-3 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                    {etiqueta(rutina.objetivo)}
                    {" · "}
                    {etiqueta(rutina.nivel)}
                    {" · "}
                    {etiqueta(rutina.lugar)}
                  </p>

                  <p className="mt-2 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                    {rutina.frecuencia_semanal} días
                    por semana · {rutina.duracion_min} minutos
                  </p>
                </div>

                <span className="rounded-full border border-cyan-200 dark:border-cyan-400/25 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-800 dark:text-cyan-200">
                  {rutina.estado}
                </span>
              </div>

              <h3 className="mt-7 text-lg font-bold">
                Ejercicios de la rutina
              </h3>

              {errorComposicion && (
                <p className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-400/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                  No se pudo verificar completamente
                  la composición. La publicación
                  está bloqueada.
                </p>
              )}

              <div className="mt-4 space-y-3">
                {componentes.length === 0 && (
                  <p className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white dark:bg-[#081525] p-5 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                    Esta rutina todavía no
                    tiene ejercicios.
                  </p>
                )}

                {componentes.map((item) => {
                  const ejercicio =
                    mapaEjercicios.get(
                      item.ejercicio_id
                    );

                  return (
                    <article
                      key={`${item.orden}-${item.ejercicio_id}`}
                      className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white dark:bg-[#081525] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="font-bold">
                          {item.orden}.{" "}
                          {ejercicio?.nombre ??
                            `Ejercicio #${item.ejercicio_id}`}
                        </h4>

                        <span
                          className={`text-xs font-bold ${
                            ejercicio &&
                            compatible(
                              rutina,
                              ejercicio
                            )
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {ejercicio &&
                          compatible(rutina, ejercicio)
                            ? "Compatible"
                            : "Revisar"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                        {item.series} series ·{" "}
                        {item.repeticiones !== null
                          ? `${item.repeticiones} repeticiones`
                          : `${item.duracion_min ?? 0} minutos`}
                        {" · "}
                        {item.descanso_seg} segundos
                        de descanso
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            {rutina.estado === "borrador" && (
              <div className="grid items-start gap-5 lg:grid-cols-2">

                {/* PASO 2: AGREGAR EJERCICIO */}

                <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-6">
                  <h2 className="text-xl font-bold">
                    2. Agregar ejercicio
                  </h2>

                  <p className="mt-2 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                    Solo se muestran ejercicios
                    activos y compatibles.
                  </p>

                  <form
                    action={agregarEjercicio}
                    className="mt-6 space-y-4"
                  >
                    <input
                      type="hidden"
                      name="rutinaId"
                      value={rutina.id}
                    />

                    <div>
                      <label
                        htmlFor="ejercicioId"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Ejercicio
                      </label>

                      <select
                        id="ejercicioId"
                        name="ejercicioId"
                        required
                        defaultValue=""
                        className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#081525] text-[var(--ecf-text,#102238)] dark:text-white px-3 py-3 text-sm"
                      >
                        <option value="" disabled>
                          Selecciona un ejercicio
                        </option>

                        {disponibles.map((ejercicio) => (
                          <option
                            key={ejercicio.id}
                            value={ejercicio.id}
                          >
                            {ejercicio.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="series"
                          className="mb-2 block text-sm"
                        >
                          Series
                        </label>

                        <input
                          id="series"
                          name="series"
                          type="number"
                          min={1}
                          max={10}
                          defaultValue={3}
                          required
                          className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#081525] text-[var(--ecf-text,#102238)] dark:text-white p-3"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="descansoSeg"
                          className="mb-2 block text-sm"
                        >
                          Descanso (segundos)
                        </label>

                        <input
                          id="descansoSeg"
                          name="descansoSeg"
                          type="number"
                          min={0}
                          max={600}
                          defaultValue={60}
                          required
                          className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#081525] text-[var(--ecf-text,#102238)] dark:text-white p-3"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="repeticiones"
                          className="mb-2 block text-sm"
                        >
                          Repeticiones
                        </label>

                        <input
                          id="repeticiones"
                          name="repeticiones"
                          type="number"
                          min={1}
                          max={100}
                          placeholder="Ejemplo: 12"
                          className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#081525] text-[var(--ecf-text,#102238)] dark:text-white p-3"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="duracionMin"
                          className="mb-2 block text-sm"
                        >
                          Duración (minutos)
                        </label>

                        <input
                          id="duracionMin"
                          name="duracionMin"
                          type="number"
                          min={1}
                          max={240}
                          placeholder="Ejemplo: 10"
                          className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#081525] text-[var(--ecf-text,#102238)] dark:text-white p-3"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Completa repeticiones
                      o duración, no ambos.
                    </p>

                    <button
                      type="submit"
                      disabled={
                        disponibles.length === 0 ||
                        errorComposicion
                      }
                      className="min-h-12 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + Guardar ejercicio
                    </button>
                  </form>
                </section>

                {/* PASO 3: PUBLICAR */}

                <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-6">
                  <h2 className="text-xl font-bold">
                    3. Publicar rutina
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    Antes de publicar, comprueba
                    que la rutina tenga ejercicios,
                    que sean compatibles con
                    el nivel y lugar, y que sus
                    parámetros estén completos.
                  </p>

                  <div
                    className={`mt-5 rounded-xl border p-4 text-sm ${
                      composicionValida
                        ? "border-emerald-200 dark:border-emerald-400/25 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-200"
                        : "border-amber-200 dark:border-amber-400/25 bg-amber-50 dark:bg-amber-400/10 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    {composicionValida
                      ? "La composición supera las verificaciones iniciales."
                      : "La rutina todavía no cumple las condiciones para publicarse."}
                  </div>

                  <form
                    action={publicarRutina}
                    className="mt-5 space-y-5"
                  >
                    <input
                      type="hidden"
                      name="rutinaId"
                      value={rutina.id}
                    />

                    <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        name="confirmar"
                        value="si"
                        required
                        className="mt-1"
                      />

                      Confirmo que revisé
                      la composición y el objetivo
                      de esta rutina.
                    </label>

                    <button
                      type="submit"
                      disabled={!composicionValida}
                      className="min-h-12 w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-[#07121e] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Publicar rutina
                    </button>
                  </form>
                </section>
              </div>
            )}
          </>
        )}

        {/* SEGURIDAD */}

        <section className="rounded-2xl border border-cyan-200 dark:border-cyan-400/15 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-6">
          <h2 className="font-bold">
            Seguridad administrativa
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            El acceso requiere una cuenta
            administradora autenticada.

            La base de datos verifica
            nuevamente las reglas antes
            de agregar ejercicios o publicar.

            Las operaciones utilizan las
            funciones restringidas que
            configuramos en Supabase.
          </p>
        </section>

        <footer className="border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 py-5 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Editor de rutinas
        </footer>

      </div>
    </main>
  );
}

// ============================================
// EXPORTACION OBLIGATORIA DE NEXT.JS
// ============================================

export default function ComponerRutinaPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}
