
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// EVOLUTION CENTER FIT 2.0
// FASE 111.16 - SUPERVISION DE ENTRENAMIENTOS
// Solo lectura. No modifica datos del estudio.

const RUTA = "/administrador/entrenamientos";
const POR_PAGINA = 10;
const LIMITE_DETALLE = 999;

const ESTADOS = [
  "todos",
  "programada",
  "activa",
  "pausada",
  "completada",
  "finalizada",
  "cancelada",
];

type Props = {
  searchParams: Promise<{
    estado?: string;
    entrenador?: string;
    pagina?: string;
    plan?: string;
  }>;
};

type Plan = {
  id: number;
  cliente_id: string;
  entrenador_id: string;
  rutina_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
};

type Sesion = {
  id: number;
  asignacion_id: number;
  numero_sesion: number;
  fecha_programada: string;
  estado: string;
  duracion_real_min: number | null;
};

type EjercicioSesion = {
  id: number;
  sesion_id: number;
  series_objetivo: number | null;
};

type Serie = {
  sesion_ejercicio_id: number;
  numero_serie: number;
  completada: boolean;
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function enteroPositivo(valor?: string) {
  if (!valor || !/^\d+$/.test(valor)) return null;

  const numero = Number(valor);

  return Number.isSafeInteger(numero) && numero > 0
    ? numero
    : null;
}

function fechaLima(valor?: string | null) {
  if (!valor) return "Sin fecha";

  const esFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor);

  const fecha = new Date(
    esFecha ? `${valor}T12:00:00Z` : valor
  );

  if (Number.isNaN(fecha.getTime())) {
    return "Fecha no válida";
  }

  return fecha.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: esFecha ? "UTC" : "America/Lima",
  });
}

function diaUTC(valor: string) {
  const fecha =
    /^\d{4}-\d{2}-\d{2}/.exec(valor)?.[0];

  if (!fecha) return null;

  const marca = Date.parse(`${fecha}T00:00:00Z`);

  return Number.isFinite(marca) ? marca : null;
}

function porcentaje(
  numerador: number,
  denominador: number
) {
  return denominador > 0
    ? Math.round((numerador / denominador) * 100)
    : null;
}

// ============================================
// INDICADORES
// ============================================

function Indicador({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string | number;
  detalle: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#14253d] p-5">
      <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black tabular-nums text-[var(--ecf-text,#102238)] dark:text-white">
        {valor}
      </p>

      <p className="mt-2 text-xs leading-5 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
        {detalle}
      </p>
    </article>
  );
}

function Cargando() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] text-cyan-800 dark:text-cyan-200">
      Cargando supervisión de entrenamientos...
    </main>
  );
}

// ============================================
// CONTENIDO PROTEGIDO
// ============================================

async function Contenido({
  searchParams,
}: Props) {
  await connection();

  const params = await searchParams;
  const sesion = await createClient();

  // Verificar identidad antes de usar
  // la clave privada del servidor.

  const {
    data: auth,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (errorAuth || !auth.user) {
    redirect("/login");
  }

  const {
    data: acceso,
    error: errorAcceso,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", auth.user.id)
    .maybeSingle();

  if (
    errorAcceso ||
    acceso?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] p-8 text-amber-800 dark:text-amber-200">
        Falta configurar Supabase en el servidor.
      </main>
    );
  }

  const db = crearAdmin(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // ==========================================
  // PARAMETROS Y FILTROS
  // ==========================================

  const estado =
    typeof params.estado === "string" &&
    ESTADOS.includes(params.estado)
      ? params.estado
      : "todos";

  const entrenador =
    typeof params.entrenador === "string" &&
    /^[0-9a-f-]{36}$/i.test(params.entrenador)
      ? params.entrenador
      : "todos";

  const pagina = Math.min(
    enteroPositivo(params.pagina) ?? 1,
    100000
  );

  const planId = enteroPositivo(params.plan);

  // ==========================================
  // LISTADO PAGINADO Y TOTALES
  // ==========================================

  let consulta = db
    .from("asignaciones_rutinas")
    .select(
      "id,cliente_id,entrenador_id,rutina_id,fecha_inicio,fecha_fin,estado",
      { count: "exact" }
    );

  if (estado !== "todos") {
    consulta = consulta.eq("estado", estado);
  }

  if (entrenador !== "todos") {
    consulta = consulta.eq(
      "entrenador_id",
      entrenador
    );
  }

  const [
    respuestaPlanes,
    totalPlanes,
    vigentes,
    totalSesiones,
    totalRealizadas,
    totalAusentes,
    respuestaEntrenadores,
  ] = await Promise.all([
    consulta
      .order("id", { ascending: false })
      .range(
        (pagina - 1) * POR_PAGINA,
        pagina * POR_PAGINA - 1
      ),

    db
      .from("asignaciones_rutinas")
      .select("id", {
        head: true,
        count: "exact",
      }),

    db
      .from("asignaciones_rutinas")
      .select("id", {
        head: true,
        count: "exact",
      })
      .in("estado", [
        "programada",
        "activa",
        "pausada",
      ]),

    db
      .from("sesiones_entrenamiento")
      .select("id", {
        head: true,
        count: "exact",
      }),

    db
      .from("sesiones_entrenamiento")
      .select("id", {
        head: true,
        count: "exact",
      })
      .eq("estado", "realizada"),

    db
      .from("sesiones_entrenamiento")
      .select("id", {
        head: true,
        count: "exact",
      })
      .eq("estado", "ausente"),

    db
      .from("usuario_roles")
      .select("usuario_id", {
        count: "exact",
      })
      .eq("rol", "entrenador")
      .range(0, 499),
  ]);

  if (
    respuestaPlanes.error ||
    totalPlanes.error ||
    vigentes.error ||
    totalSesiones.error ||
    totalRealizadas.error ||
    totalAusentes.error ||
    respuestaEntrenadores.error
  ) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] p-8 text-[var(--ecf-text,#102238)] dark:text-white">
        <Link
          href="/administrador"
          className="text-cyan-800 dark:text-cyan-300"
        >
          ← Volver
        </Link>

        <p
          role="alert"
          className="mt-6 text-amber-800 dark:text-amber-200"
        >
          No se pudieron consultar los planes
          o las sesiones. Revisa las tablas
          y los permisos de Supabase.
        </p>
      </main>
    );
  }

  const planes =
    (respuestaPlanes.data ?? []) as Plan[];

  const totalFiltrado =
    respuestaPlanes.count ?? 0;

  const paginas = Math.max(
    1,
    Math.ceil(totalFiltrado / POR_PAGINA)
  );

  const entrenadoresIds =
    (respuestaEntrenadores.data ?? []).map(
      (registro) => registro.usuario_id as string
    );

  const entrenadoresParciales =
    (respuestaEntrenadores.count ?? 0) >
    entrenadoresIds.length;

  // ==========================================
  // OBTENER DETALLE DE UN PLAN
  // ==========================================

  let planSeleccionado: Plan | null = null;
  let errorDetalle = false;

  if (planId) {
    const resultado = await db
      .from("asignaciones_rutinas")
      .select(
        "id,cliente_id,entrenador_id,rutina_id,fecha_inicio,fecha_fin,estado"
      )
      .eq("id", planId)
      .maybeSingle();

    if (resultado.error) {
      errorDetalle = true;
    } else {
      planSeleccionado =
        resultado.data as Plan | null;
    }
  }

  // ==========================================
  // NOMBRES DE USUARIOS Y RUTINAS
  // ==========================================

  const todosPlanes = planSeleccionado
    ? [...planes, planSeleccionado]
    : planes;

  const idsUsuarios = [
    ...new Set([
      ...entrenadoresIds,
      ...todosPlanes.flatMap((plan) => [
        plan.cliente_id,
        plan.entrenador_id,
      ]),
    ]),
  ];

  const idsRutinas = [
    ...new Set(
      todosPlanes.map((plan) => plan.rutina_id)
    ),
  ];

  const [
    respuestaUsuarios,
    respuestaRutinas,
  ] = await Promise.all([
    idsUsuarios.length
      ? db
          .from("usuarios")
          .select("id,nombre_completo")
          .in("id", idsUsuarios)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    idsRutinas.length
      ? db
          .from("rutinas")
          .select("id,nombre")
          .in("id", idsRutinas)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (
    respuestaUsuarios.error ||
    respuestaRutinas.error
  ) {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] p-8 text-amber-800 dark:text-amber-200">
        No se pudieron consultar los nombres
        de usuarios y rutinas.
      </main>
    );
  }

  const nombres = new Map<string, string>(
    (respuestaUsuarios.data ?? []).map(
      (usuario) => [
        usuario.id as string,
        (usuario.nombre_completo as string | null) ||
          "Sin nombre",
      ]
    )
  );

  const rutinas = new Map<number, string>(
    (respuestaRutinas.data ?? []).map(
      (rutina) => [
        rutina.id as number,
        rutina.nombre as string,
      ]
    )
  );

  // ==========================================
  // METRICAS DE UN PLAN
  // ==========================================

  let sesiones: Sesion[] = [];
  let sesionesCompletas = false;
  let errorMetricas = false;

  let asistencia: number | null = null;
  let continuidad: number | null = null;
  let cumplimiento: number | null = null;

  let objetivoSeries = 0;
  let seriesConEvidencia = 0;
  let completadas = 0;

  if (planSeleccionado) {
    const respuesta = await db
      .from("sesiones_entrenamiento")
      .select(
        "id,asignacion_id,numero_sesion,fecha_programada,estado,duracion_real_min",
        { count: "exact" }
      )
      .eq("asignacion_id", planSeleccionado.id)
      .order("numero_sesion", {
        ascending: true,
      })
      .range(0, LIMITE_DETALLE - 1);

    sesionesCompletas =
      !respuesta.error &&
      respuesta.count !== null &&
      respuesta.count ===
        (respuesta.data?.length ?? 0);

    if (sesionesCompletas) {
      sesiones =
        (respuesta.data ?? []) as Sesion[];

      const realizadas = sesiones.filter(
        (item) => item.estado === "realizada"
      );

      const ausentes = sesiones.filter(
        (item) => item.estado === "ausente"
      );

      // ASISTENCIA:
      // Solo sesiones con resultado confirmado.

      asistencia = porcentaje(
        realizadas.length,
        realizadas.length + ausentes.length
      );

      // CONTINUIDAD:
      // Semanas del plan con asistencia registrada.

      const inicio = diaUTC(
        planSeleccionado.fecha_inicio
      );

      const semanas = new Set<number>();

      if (inicio !== null) {
        for (const sesion of realizadas) {
          const fecha = diaUTC(
            sesion.fecha_programada
          );

          if (
            fecha !== null &&
            fecha >= inicio
          ) {
            semanas.add(
              Math.floor(
                (fecha - inicio) / 604800000
              ) + 1
            );
          }
        }

        continuidad = semanas.size;
      }

      // CUMPLIMIENTO:
      // Series previstas y completadas
      // en sesiones realizadas.

      if (realizadas.length > 0) {
        const respuestaEjercicios = await db
          .from("sesion_ejercicios")
          .select(
            "id,sesion_id,series_objetivo",
            { count: "exact" }
          )
          .in(
            "sesion_id",
            realizadas.map((item) => item.id)
          )
          .range(0, LIMITE_DETALLE - 1);

        const ejerciciosCompletos =
          !respuestaEjercicios.error &&
          respuestaEjercicios.count !== null &&
          respuestaEjercicios.count ===
            (respuestaEjercicios.data?.length ?? 0);

        const ejercicios =
          (respuestaEjercicios.data ??
            []) as EjercicioSesion[];

        if (!ejerciciosCompletos) {
          errorMetricas = true;
        } else if (
          ejercicios.length > 0 &&
          ejercicios.every(
            (ejercicio) =>
              Number.isInteger(
                ejercicio.series_objetivo
              ) &&
              (ejercicio.series_objetivo ?? 0) > 0
          )
        ) {
          const respuestaSeries = await db
            .from("sesion_series")
            .select(
              "sesion_ejercicio_id,numero_serie,completada",
              { count: "exact" }
            )
            .in(
              "sesion_ejercicio_id",
              ejercicios.map((item) => item.id)
            )
            .range(0, LIMITE_DETALLE - 1);

          const seriesCompletas =
            !respuestaSeries.error &&
            respuestaSeries.count !== null &&
            respuestaSeries.count ===
              (respuestaSeries.data?.length ?? 0);

          if (!seriesCompletas) {
            errorMetricas = true;
          } else {
            const metas = new Map(
              ejercicios.map((ejercicio) => [
                ejercicio.id,
                ejercicio.series_objetivo!,
              ])
            );

            const unicas = new Set<string>();
            let registrosValidos = true;

            for (
              const serie of
              (respuestaSeries.data ?? []) as Serie[]
            ) {
              const meta = metas.get(
                serie.sesion_ejercicio_id
              );

              const claveSerie =
                `${serie.sesion_ejercicio_id}:${serie.numero_serie}`;

              if (
                !meta ||
                !Number.isInteger(
                  serie.numero_serie
                ) ||
                serie.numero_serie < 1 ||
                serie.numero_serie > meta ||
                unicas.has(claveSerie)
              ) {
                registrosValidos = false;
                break;
              }

              unicas.add(claveSerie);

              if (serie.completada === true) {
                completadas++;
              }
            }

            objetivoSeries = ejercicios.reduce(
              (suma, ejercicio) =>
                suma + ejercicio.series_objetivo!,
              0
            );

            seriesConEvidencia = unicas.size;

            if (
              registrosValidos &&
              seriesConEvidencia === objetivoSeries
            ) {
              cumplimiento = porcentaje(
                completadas,
                objetivoSeries
              );
            }
          }
        }
      }
    } else {
      errorMetricas = true;
    }
  }

  // ==========================================
  // ENLACES CON FILTROS CONSERVADOS
  // ==========================================

  function enlacePagina(numero: number) {
    const query = new URLSearchParams();

    if (estado !== "todos") {
      query.set("estado", estado);
    }

    if (entrenador !== "todos") {
      query.set("entrenador", entrenador);
    }

    query.set("pagina", String(numero));

    return `${RUTA}?${query}`;
  }

  function enlacePlan(id: number) {
    const query = new URLSearchParams();

    if (estado !== "todos") {
      query.set("estado", estado);
    }

    if (entrenador !== "todos") {
      query.set("entrenador", entrenador);
    }

    query.set("pagina", String(pagina));
    query.set("plan", String(id));

    return `${RUTA}?${query}`;
  }

  // ==========================================
  // INTERFAZ ADMINISTRATIVA
  // ==========================================

  return (
    <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] text-[var(--ecf-text,#102238)] dark:text-white">

      {/* CABECERA */}

      <header className="border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#101d30]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 p-5">
          <strong>
            EVOLUTION CENTER FIT{" "}
            <span className="text-cyan-800 dark:text-cyan-300">
              2.0
            </span>
          </strong>

          <Link
            href="/administrador"
            className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-4 py-2 text-sm"
          >
            ← Volver al administrador
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-8">

        {/* PRESENTACION */}

        <section className="rounded-3xl border border-cyan-200 dark:border-cyan-400/20 bg-gradient-to-br from-[#e8f9ff] to-[#ecf1ff] dark:from-[#17364c] dark:to-[#1a1b36] p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
            FASE 111.16 · ADMINISTRACIÓN
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Supervisión de entrenamientos
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 dark:text-slate-300">
            Supervisa planes asignados, sesiones,
            asistencia, cumplimiento de series
            y continuidad.

            Todos los datos provienen de Supabase.
            Esta pantalla no modifica el estudio
            ni los entrenamientos.
          </p>
        </section>

        {/* INDICADORES GENERALES */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador
            titulo="Planes registrados"
            valor={totalPlanes.count ?? "—"}
            detalle="Total de asignaciones de rutinas"
          />

          <Indicador
            titulo="Planes vigentes"
            valor={vigentes.count ?? "—"}
            detalle="Programados, activos o pausados"
          />

          <Indicador
            titulo="Sesiones registradas"
            valor={totalSesiones.count ?? "—"}
            detalle="Todas las sesiones"
          />

          <Indicador
            titulo="Sesiones realizadas"
            valor={totalRealizadas.count ?? "—"}
            detalle={`${totalAusentes.count ?? "—"} ausencias confirmadas`}
          />
        </section>

        {/* FILTROS */}

        <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-5 sm:p-7">
          <h2 className="text-xl font-bold">
            Buscar planes
          </h2>

          <form
            action={RUTA}
            method="get"
            className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <label className="text-xs text-slate-700 dark:text-slate-300">
              Estado del plan

              <select
                name="estado"
                defaultValue={estado}
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-[var(--ecf-surface-soft,#f1f5f9)] dark:bg-[#081525] p-3 text-sm text-[var(--ecf-text,#102238)] dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                {ESTADOS.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item === "todos"
                      ? "Todos los estados"
                      : item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-700 dark:text-slate-300">
              Entrenador

              <select
                name="entrenador"
                defaultValue={entrenador}
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-[var(--ecf-surface-soft,#f1f5f9)] dark:bg-[#081525] p-3 text-sm text-[var(--ecf-text,#102238)] dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                <option value="todos">
                  Todos los entrenadores
                </option>

                {entrenadoresIds.map((id) => (
                  <option
                    key={id}
                    value={id}
                  >
                    {nombres.get(id) ??
                      "Entrenador sin perfil"}
                  </option>
                ))}

                {entrenador !== "todos" &&
                  !entrenadoresIds.includes(
                    entrenador
                  ) && (
                    <option value={entrenador}>
                      Entrenador seleccionado
                    </option>
                  )}
              </select>
            </label>

            <button
              type="submit"
              className="min-h-12 self-end rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-[#08101e]"
            >
              Filtrar
            </button>
          </form>

          {entrenadoresParciales && (
            <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
              La lista de entrenadores es parcial.
              Hay más registros que los mostrados.
            </p>
          )}
        </section>

        {/* LISTADO DE PLANES */}

        <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Planes de entrenamiento
            </h2>

            <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              {totalFiltrado} resultado(s) ·
              Página {pagina} de {paginas}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {planes.length === 0 && (
              <p className="rounded-xl bg-[var(--ecf-surface-soft,#f1f5f9)] dark:bg-[#081525] p-5 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                No hay planes en esta página
                o con los filtros seleccionados.
              </p>
            )}

            {planes.map((plan) => (
              <article
                key={plan.id}
                className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface-soft,#f1f5f9)] dark:bg-[#081525] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-bold">
                      Plan #{plan.id} ·{" "}
                      {rutinas.get(plan.rutina_id) ??
                        `Rutina #${plan.rutina_id}`}
                    </p>

                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Cliente:{" "}
                      {nombres.get(plan.cliente_id) ??
                        "Sin perfil"}
                    </p>

                    <p className="text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                      Entrenador:{" "}
                      {nombres.get(
                        plan.entrenador_id
                      ) ?? "Sin perfil"}
                    </p>

                    <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                      {fechaLima(plan.fecha_inicio)}
                      {" — "}
                      {fechaLima(plan.fecha_fin)}
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-200 dark:border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-200">
                    {plan.estado}
                  </span>
                </div>

                <Link
                  href={enlacePlan(plan.id)}
                  className="mt-4 inline-flex rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-4 py-2 text-sm font-semibold text-cyan-800 dark:text-cyan-300 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Ver seguimiento
                </Link>
              </article>
            ))}
          </div>

          {/* PAGINACION */}

          <div className="mt-5 flex items-center justify-between">
            {pagina > 1 ? (
              <Link
                href={enlacePagina(pagina - 1)}
                className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-4 py-2 text-sm"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}

            {pagina < paginas ? (
              <Link
                href={enlacePagina(pagina + 1)}
                className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-4 py-2 text-sm"
              >
                Siguiente →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </section>

        {/* DETALLE DE UN PLAN */}

        {planId && (
          <section
            id="detalle"
            className="scroll-mt-6 rounded-2xl border border-cyan-200 dark:border-cyan-400/20 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#12243a] p-5 sm:p-7"
          >
            {errorDetalle || !planSeleccionado ? (
              <p
                role="alert"
                className="text-amber-800 dark:text-amber-200"
              >
                No se encontró el plan seleccionado
                o no se pudo consultar.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-cyan-800 dark:text-cyan-300">
                      Seguimiento de un plan
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      Plan #{planSeleccionado.id} ·{" "}
                      {rutinas.get(
                        planSeleccionado.rutina_id
                      ) ?? "Rutina"}
                    </h2>

                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      {nombres.get(
                        planSeleccionado.cliente_id
                      ) ?? "Cliente"}
                      {" · "}
                      {nombres.get(
                        planSeleccionado.entrenador_id
                      ) ?? "Entrenador"}
                    </p>
                  </div>

                  <Link
                    href={enlacePagina(pagina)}
                    className="rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-4 py-2 text-sm"
                  >
                    Cerrar detalle
                  </Link>
                </div>

                {!sesionesCompletas && (
                  <p
                    role="alert"
                    className="mt-5 text-sm text-amber-800 dark:text-amber-200"
                  >
                    No se pudo leer todo el calendario
                    del plan. Las métricas están
                    bloqueadas para evitar cifras parciales.
                  </p>
                )}

                {sesionesCompletas && (
                  <>
                    {/* ASISTENCIA, CUMPLIMIENTO,
                        CONTINUIDAD */}

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <Indicador
                        titulo="Asistencia confirmada"
                        valor={
                          asistencia === null
                            ? "—"
                            : `${asistencia}%`
                        }
                        detalle="Realizadas / (realizadas + ausentes). Excluye pendientes y canceladas."
                      />

                      <Indicador
                        titulo="Cumplimiento verificado"
                        valor={
                          cumplimiento === null
                            ? "—"
                            : `${cumplimiento}%`
                        }
                        detalle={
                          cumplimiento === null
                            ? "Sin todas las evidencias de series necesarias"
                            : `${completadas} de ${objetivoSeries} series completadas`
                        }
                      />

                      <Indicador
                        titulo="Continuidad"
                        valor={
                          continuidad === null
                            ? "—"
                            : `${continuidad} semanas`
                        }
                        detalle="Semanas del plan con sesiones realizadas"
                      />
                    </div>

                    {cumplimiento === null &&
                      objetivoSeries > 0 && (
                        <p className="mt-4 text-xs text-amber-800 dark:text-amber-200">
                          Evidencias:{" "}
                          {seriesConEvidencia} de{" "}
                          {objetivoSeries} series previstas.
                          No se calcula un porcentaje
                          definitivo sin cobertura completa.
                        </p>
                      )}

                    {errorMetricas && (
                      <p className="mt-4 text-sm text-amber-800 dark:text-amber-200">
                        No se pudo verificar toda la
                        información del cumplimiento.
                        No se muestran porcentajes
                        incompletos.
                      </p>
                    )}

                    {/* CALENDARIO DE SESIONES */}

                    <h3 className="mt-7 text-lg font-bold">
                      Sesiones programadas (
                      {sesiones.length})
                    </h3>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {sesiones.length === 0 && (
                        <p className="text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                          Aún no hay sesiones
                          para este plan.
                        </p>
                      )}

                      {sesiones.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface-soft,#f1f5f9)] dark:bg-[#081525] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-sm">
                              Sesión {item.numero_sesion}
                            </strong>

                            <span className="text-xs text-cyan-800 dark:text-cyan-300">
                              {item.estado.replaceAll(
                                "_",
                                " "
                              )}
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                            {fechaLima(
                              item.fecha_programada
                            )}
                          </p>

                          <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                            Duración real:{" "}
                            {item.duracion_real_min ??
                              "Sin registrar"}
                            {item.duracion_real_min === null
                              ? ""
                              : " min"}
                          </p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {/* NOTAS DE CONTROL */}

        <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-6 text-sm leading-7 text-slate-700 dark:text-slate-300">
          <h2 className="font-bold text-[var(--ecf-text,#102238)] dark:text-white">
            Criterios de supervisión
          </h2>

          <p className="mt-2">
            Las sesiones pendientes no cuentan
            como ausencias. El cumplimiento solo
            aparece como verificado cuando están
            registradas todas las series previstas
            de las sesiones realizadas.
          </p>

          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
            Estos datos operativos no sustituyen
            los indicadores pretest y postest ni
            el análisis estadístico GE/GC
            de la investigación.
          </p>
        </section>
      </div>
    </main>
  );
}

// ============================================
// PAGINA PRINCIPAL
// ============================================

export default function EntrenamientosAdminPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}