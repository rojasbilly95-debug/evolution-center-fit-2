
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// EVOLUTION CENTER FIT 2.0 - FASE 111.17
// Supervisión de IA y revisiones. Solo lectura.

const RUTA = "/administrador/ia";
const POR_PAGINA = 10;

const DECISIONES = [
  "todas",
  "aprobada",
  "ajustes_solicitados",
  "rechazada",
];

type Props = {
  searchParams: Promise<{
    decision?: string;
    entrenador?: string;
    pagina?: string;
  }>;
};

type Revision = {
  id: number;
  cliente_id: string;
  entrenador_id: string;
  rutina_id: number;
  decision: string;
  observaciones: string | null;
  puntaje_compatibilidad: number | null;
  metodo_motor: string | null;
  revisado_en: string;
};

type Usuario = {
  id: string;
  nombre_completo: string | null;
};

type Rutina = {
  id: number;
  nombre: string;
};

type Participante = {
  cliente_id: string;
  grupo_estudio: string;
};

type Salud = {
  estado:
    | "operativo"
    | "sin_respuesta"
    | "respuesta_invalida"
    | "no_configurado";
  detalle: string;
  version: string | null;
  duracionMs: number | null;
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function objeto(
  valor: unknown
): valor is Record<string, unknown> {
  return (
    valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  );
}

function paginaValida(valor?: string) {
  if (!valor || !/^\d+$/.test(valor)) return 1;

  const n = Number(valor);

  return Number.isSafeInteger(n) && n > 0
    ? Math.min(n, 10000)
    : 1;
}

function fechaLima(valor: string) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return "Fecha no disponible";
  }

  return fecha.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function etiquetaDecision(valor: string) {
  const etiquetas: Record<string, string> = {
    aprobada: "Aprobada",
    rechazada: "Rechazada",
    ajustes_solicitados: "Ajustes solicitados",
  };

  return etiquetas[valor] ?? "Otra decisión";
}

function claseDecision(valor: string) {
  if (valor === "aprobada") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (valor === "rechazada") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }

  return "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

// ============================================
// ESTADO DEL MOTOR EN RENDER
// ============================================

async function consultarSalud(): Promise<Salud> {
  const origen = process.env.IA_SERVICE_URL;

  if (!origen) {
    return {
      estado: "no_configurado",
      detalle:
        "IA_SERVICE_URL no está configurada en Vercel.",
      version: null,
      duracionMs: null,
    };
  }

  let destino: URL;

  try {
    const base = new URL(origen);

    const local =
      base.hostname === "127.0.0.1" ||
      base.hostname === "localhost";

    const protocoloValido =
      base.protocol === "https:" ||
      (
        process.env.NODE_ENV !== "production" &&
        local &&
        base.protocol === "http:"
      );

    if (!protocoloValido) {
      throw new Error("Protocolo no permitido");
    }

    destino = new URL("/health", base);
  } catch {
    return {
      estado: "no_configurado",
      detalle:
        "La dirección del servicio IA no es válida para este entorno.",
      version: null,
      duracionMs: null,
    };
  }

  const inicio = Date.now();

  try {
    const respuesta = await fetch(destino, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: {
        Accept: "application/json",
      },
    });

    const duracionMs = Date.now() - inicio;

    if (!respuesta.ok) {
      return {
        estado: "sin_respuesta",
        detalle:
          `Render respondió con HTTP ${respuesta.status}.`,
        version: null,
        duracionMs,
      };
    }

    const contenido: unknown =
      await respuesta.json().catch(() => null);

    if (
      !objeto(contenido) ||
      contenido.estado !== "activo" ||
      contenido.servicio !== "motor-recomendador"
    ) {
      return {
        estado: "respuesta_invalida",
        detalle:
          "El servicio respondió, pero no devolvió el estado esperado del motor.",
        version: null,
        duracionMs,
      };
    }

    return {
      estado: "operativo",
      detalle:
        "El endpoint /health respondió correctamente.",
      version:
        typeof contenido.version === "string"
          ? contenido.version
          : null,
      duracionMs,
    };
  } catch {
    return {
      estado: "sin_respuesta",
      detalle:
        "Sin respuesta antes de 12 segundos o error de conexión. Render podría estar iniciándose.",
      version: null,
      duracionMs: Date.now() - inicio,
    };
  }
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
    <article className="rounded-2xl border border-white/10 bg-[#14263f] p-5">
      <p className="text-xs text-slate-400">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black tabular-nums">
        {valor}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {detalle}
      </p>
    </article>
  );
}

function Cargando() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] text-cyan-200">
      Cargando supervisión de IA...
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

  const parametros = await searchParams;
  const sesion = await createClient();

  // ==========================================
  // 1. COMPROBAR IDENTIDAD
  // ==========================================

  const {
    data: identidad,
    error: errorIdentidad,
  } = await sesion.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    redirect("/login");
  }

  // ==========================================
  // 2. COMPROBAR ROL ADMINISTRADOR
  // ==========================================

  const {
    data: rol,
    error: errorRol,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorRol ||
    rol?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  // ==========================================
  // 3. CONFIGURACION PRIVADA
  // ==========================================

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <main className="min-h-screen bg-[#080e1b] p-8 text-white">
        Falta configurar la clave privada
        de Supabase en Vercel.
      </main>
    );
  }

  const db = crearAdmin(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // ==========================================
  // 4. FILTROS
  // ==========================================

  const decision = DECISIONES.includes(
    parametros.decision ?? ""
  )
    ? parametros.decision!
    : "todas";

  const entrenador =
    typeof parametros.entrenador === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      parametros.entrenador
    )
      ? parametros.entrenador
      : "todos";

  const pagina = paginaValida(
    parametros.pagina
  );

  // ==========================================
  // 5. CONSULTAR REVISIONES
  // ==========================================

  let consulta = db
    .from("revisiones_rutinas")
    .select(
      "id,cliente_id,entrenador_id,rutina_id,decision,observaciones,puntaje_compatibilidad,metodo_motor,revisado_en",
      { count: "exact" }
    );

  if (decision !== "todas") {
    consulta = consulta.eq(
      "decision",
      decision
    );
  }

  if (entrenador !== "todos") {
    consulta = consulta.eq(
      "entrenador_id",
      entrenador
    );
  }

  const [
    salud,
    historial,
    total,
    aprobadas,
    rechazadas,
    ajustes,
    respuestaRoles,
  ] = await Promise.all([
    consultarSalud(),

    consulta
      .order("id", { ascending: false })
      .range(
        (pagina - 1) * POR_PAGINA,
        pagina * POR_PAGINA - 1
      ),

    db
      .from("revisiones_rutinas")
      .select("id", {
        count: "exact",
        head: true,
      }),

    db
      .from("revisiones_rutinas")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("decision", "aprobada"),

    db
      .from("revisiones_rutinas")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("decision", "rechazada"),

    db
      .from("revisiones_rutinas")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("decision", "ajustes_solicitados"),

    db
      .from("usuario_roles")
      .select("usuario_id", {
        count: "exact",
      })
      .eq("rol", "entrenador")
      .range(0, 199),
  ]);

  if (
    historial.error ||
    total.error ||
    aprobadas.error ||
    rechazadas.error ||
    ajustes.error ||
    respuestaRoles.error
  ) {
    return (
      <main className="min-h-screen bg-[#080e1b] p-8 text-white">
        <Link
          href="/administrador"
          className="text-cyan-300"
        >
          ← Volver
        </Link>

        <p
          role="alert"
          className="mt-6 text-amber-200"
        >
          No se pudieron consultar las
          revisiones. Comprueba los permisos
          y la estructura de Supabase.
        </p>
      </main>
    );
  }

  const revisiones =
    (historial.data ?? []) as Revision[];

  const idsEntrenadores =
    (respuestaRoles.data ?? []).map(
      (x) => x.usuario_id as string
    );

  const listaEntrenadoresParcial =
    (respuestaRoles.count ?? 0) >
    idsEntrenadores.length;

  // ==========================================
  // 6. CONSULTAR NOMBRES Y GRUPOS
  // ==========================================

  const idsUsuarios = [
    ...new Set([
      ...idsEntrenadores,
      ...revisiones.flatMap((x) => [
        x.cliente_id,
        x.entrenador_id,
      ]),
    ]),
  ];

  const idsRutinas = [
    ...new Set(
      revisiones.map((x) => x.rutina_id)
    ),
  ];

  const idsClientes = [
    ...new Set(
      revisiones.map((x) => x.cliente_id)
    ),
  ];

  const [
    rUsuarios,
    rRutinas,
    rGrupos,
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

    idsClientes.length
      ? db
          .from("participantes_estudio")
          .select("cliente_id,grupo_estudio")
          .in("cliente_id", idsClientes)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  const nombresDisponibles = !rUsuarios.error;
  const rutinasDisponibles = !rRutinas.error;
  const gruposDisponibles = !rGrupos.error;

  const nombres = new Map<string, string>(
    ((rUsuarios.data ?? []) as Usuario[]).map(
      (x) => [
        x.id,
        x.nombre_completo ?? "Sin nombre",
      ]
    )
  );

  const nombresRutinas = new Map<number, string>(
    ((rRutinas.data ?? []) as Rutina[]).map(
      (x) => [
        x.id,
        x.nombre,
      ]
    )
  );

  const grupos = new Map<string, string>(
    ((rGrupos.data ?? []) as Participante[]).map(
      (x) => [
        x.cliente_id,
        x.grupo_estudio,
      ]
    )
  );

  const paginas = Math.max(
    1,
    Math.ceil(
      (historial.count ?? 0) / POR_PAGINA
    )
  );

  function enlace(n: number) {
    const query = new URLSearchParams();

    if (decision !== "todas") {
      query.set("decision", decision);
    }

    if (entrenador !== "todos") {
      query.set("entrenador", entrenador);
    }

    query.set("pagina", String(n));

    return `${RUTA}?${query.toString()}`;
  }

  // ==========================================
  // 7. INTERFAZ
  // ==========================================

  return (
    <main className="min-h-screen bg-[#080e1b] text-white">

      {/* CABECERA */}

      <header className="border-b border-white/10 bg-[#101d30]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 p-5">
          <strong>
            EVOLUTION CENTER FIT{" "}
            <span className="text-cyan-300">
              2.0
            </span>
          </strong>

          <Link
            href="/administrador"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            ← Volver al administrador
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-8">

        {/* PRESENTACION */}

        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#17364c] to-[#1a1b36] p-7 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            FASE 111.17 · ADMINISTRACIÓN
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Supervisión del motor IA
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Consulta la disponibilidad del
            servicio en Render y el historial
            real de decisiones de los entrenadores.

            No genera recomendaciones ni
            cambia los grupos del estudio.
          </p>
        </section>

        {/* CONEXION CON RENDER */}

        <section className="rounded-2xl border border-white/10 bg-[#112039] p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Conexión con Render
            </h2>

            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                salud.estado === "operativo"
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                  : "border-amber-400/25 bg-amber-400/10 text-amber-200"
              }`}
            >
              {salud.estado === "operativo"
                ? "Servicio responde"
                : "Requiere revisión"}
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-300">
            {salud.detalle}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            <span>Endpoint: /health</span>

            <span>
              Versión:{" "}
              {salud.version ?? "No disponible"}
            </span>

            <span>
              Respuesta:{" "}
              {salud.duracionMs === null
                ? "—"
                : `${salud.duracionMs} ms`}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Esta comprobación verifica /health;
            no ejecuta /evaluar ni prueba
            la calidad de las recomendaciones.
          </p>
        </section>

        {/* INDICADORES */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador
            titulo="Revisiones registradas"
            valor={total.count ?? "—"}
            detalle="Decisiones almacenadas en Supabase"
          />

          <Indicador
            titulo="Aprobadas"
            valor={aprobadas.count ?? "—"}
            detalle="Aprobaciones de entrenadores"
          />

          <Indicador
            titulo="Ajustes solicitados"
            valor={ajustes.count ?? "—"}
            detalle="Decisiones que solicitan ajustes"
          />

          <Indicador
            titulo="Rechazadas"
            valor={rechazadas.count ?? "—"}
            detalle="Rechazos registrados"
          />
        </section>

        {/* FILTROS */}

        <section className="rounded-2xl border border-white/10 bg-[#112039] p-5 sm:p-7">
          <h2 className="text-xl font-bold">
            Filtros del historial
          </h2>

          <form
            action={RUTA}
            method="get"
            className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <label className="text-xs text-slate-300">
              Decisión

              <select
                name="decision"
                defaultValue={decision}
                className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#081525] p-3 text-sm"
              >
                {DECISIONES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item === "todas"
                      ? "Todas las decisiones"
                      : etiquetaDecision(item)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Entrenador

              <select
                name="entrenador"
                defaultValue={entrenador}
                className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#081525] p-3 text-sm"
              >
                <option value="todos">
                  Todos los entrenadores
                </option>

                {idsEntrenadores.map((id) => (
                  <option
                    key={id}
                    value={id}
                  >
                    {nombres.get(id) ??
                      "Entrenador sin nombre"}
                  </option>
                ))}

                {entrenador !== "todos" &&
                  !idsEntrenadores.includes(
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

          {listaEntrenadoresParcial && (
            <p className="mt-3 text-xs text-amber-200">
              Solo se muestran los primeros
              200 entrenadores para filtrar.
            </p>
          )}
        </section>

        {/* HISTORIAL */}

        <section className="rounded-2xl border border-white/10 bg-[#112039] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Decisiones registradas
            </h2>

            <p className="text-xs text-slate-400">
              {historial.count ?? 0} resultado(s)
              {" · "}Página {pagina} de {paginas}
            </p>
          </div>

          {(
            !nombresDisponibles ||
            !rutinasDisponibles ||
            !gruposDisponibles
          ) && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-amber-400/10 p-4 text-sm text-amber-200"
            >
              Algunos datos complementarios
              no se pudieron verificar.
              Las decisiones mostradas sí
              proceden del historial.
            </p>
          )}

          <div className="mt-5 space-y-3">
            {revisiones.length === 0 && (
              <p className="rounded-xl bg-[#081525] p-5 text-sm text-slate-400">
                No hay revisiones en esta página
                o con estos filtros.
              </p>
            )}

            {revisiones.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-white/10 bg-[#081525] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {nombresRutinas.get(
                        item.rutina_id
                      ) ??
                        `Rutina #${item.rutina_id}`}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      Cliente:{" "}
                      {nombres.get(
                        item.cliente_id
                      ) ?? "Nombre no disponible"}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Entrenador:{" "}
                      {nombres.get(
                        item.entrenador_id
                      ) ?? "Nombre no disponible"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${claseDecision(
                      item.decision
                    )}`}
                  >
                    {etiquetaDecision(item.decision)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>
                    Fecha:{" "}
                    {fechaLima(item.revisado_en)}
                  </span>

                  <span>
                    Puntaje:{" "}
                    {typeof item.puntaje_compatibilidad ===
                    "number"
                      ? `${item.puntaje_compatibilidad.toFixed(1)} / 100`
                      : "No registrado"}
                  </span>

                  <span>
                    Método:{" "}
                    {item.metodo_motor ||
                      "No registrado"}
                  </span>

                  <span>
                    Grupo:{" "}
                    {!gruposDisponibles
                      ? "No verificado"
                      : grupos.get(item.cliente_id) ??
                        "Sin inscripción encontrada"}
                  </span>
                </div>

                {item.observaciones && (
                  <details className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
                      Ver observaciones del entrenador
                    </summary>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                      {item.observaciones}
                    </p>
                  </details>
                )}
              </article>
            ))}
          </div>

          {/* PAGINACION */}

          <div className="mt-5 flex items-center justify-between gap-3">
            {pagina > 1 ? (
              <Link
                href={enlace(pagina - 1)}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}

            {pagina < paginas ? (
              <Link
                href={enlace(pagina + 1)}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm"
              >
                Siguiente →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </section>

        {/* SEGURIDAD */}

        <section className="rounded-2xl border border-cyan-400/15 bg-[#112039] p-6">
          <h2 className="font-bold">
            Alcance de la supervisión
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-300">
            Este módulo consulta el estado de
            /health y las decisiones guardadas
            en revisiones_rutinas.

            No contabiliza todas las evaluaciones
            del motor, porque no se ha confirmado
            una tabla de eventos por cada ejecución.

            Tampoco modifica las decisiones ni
            permite usar IA para clientes del
            grupo control.
          </p>

          <p className="mt-3 text-xs text-amber-200">
            La disponibilidad de /health no
            garantiza que el algoritmo /evaluar
            funcione ni valida sus recomendaciones.

            El motor debe seguir respetando las
            restricciones GE/GC existentes.
          </p>
        </section>
      </div>
    </main>
  );
}

// ============================================
// EXPORTACION PRINCIPAL DE NEXT.JS
// ============================================

export default function AdministradorIAPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}
