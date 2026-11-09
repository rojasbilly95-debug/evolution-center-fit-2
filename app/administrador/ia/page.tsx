
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import HistorialEvaluaciones from "./_components/historial-evaluaciones";

// ==================================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.17.1
// CENTRO PROFESIONAL DE SUPERVISION IA
// SOLO LECTURA - PROTECCION GE / GC
// ==================================================

const RUTA = "/administrador/ia";
const POR_PAGINA = 10;

const VISTAS = [
  "resumen",
  "evaluaciones",
  "revisiones",
  "monitor",
] as const;

const DECISIONES = [
  "todas",
  "aprobada",
  "ajustes_solicitados",
  "rechazada",
];

type Vista = (typeof VISTAS)[number];

type Props = {
  searchParams: Promise<{
    vista?: string;
    decision?: string;
    grupo?: string;
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
  estado: "responde" | "error" | "configuracion";
  descripcion: string;
  version: string | null;
  ms: number | null;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ==================================================
// UTILIDADES
// ==================================================

function esObjeto(
  valor: unknown
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function numeroPagina(valor?: string) {
  if (!valor || !/^\d+$/.test(valor)) {
    return 1;
  }

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

function decisionTexto(valor: string) {
  const nombres: Record<string, string> = {
    aprobada: "Aprobada",
    rechazada: "Rechazada",
    ajustes_solicitados: "Ajustes solicitados",
  };

  return nombres[valor] ?? "Otra decisión";
}

function decisionClase(valor: string) {
  switch (valor) {
    case "aprobada":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";

    case "rechazada":
      return "border-rose-400/25 bg-rose-400/10 text-rose-200";

    default:
      return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }
}

// ==================================================
// COMPROBAR RENDER
// ==================================================

async function comprobarMotor(): Promise<Salud> {
  const origen = process.env.IA_SERVICE_URL;

  if (!origen) {
    return {
      estado: "configuracion",
      descripcion:
        "IA_SERVICE_URL no esta configurada en Vercel.",
      version: null,
      ms: null,
    };
  }

  let url: URL;

  try {
    const base = new URL(origen);

    const entornoLocal =
      base.hostname === "localhost" ||
      base.hostname === "127.0.0.1";

    const permitido =
      base.protocol === "https:" ||
      (
        process.env.NODE_ENV !== "production" &&
        entornoLocal &&
        base.protocol === "http:"
      );

    if (!permitido) {
      throw new Error("URL no permitida");
    }

    url = new URL("/health", base);
  } catch {
    return {
      estado: "configuracion",
      descripcion:
        "La URL del motor IA no es valida.",
      version: null,
      ms: null,
    };
  }

  const inicio = Date.now();

  try {
    const respuesta = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
      },
    });

    const ms = Date.now() - inicio;

    if (!respuesta.ok) {
      return {
        estado: "error",
        descripcion:
          `Render respondio con HTTP ${respuesta.status}.`,
        version: null,
        ms,
      };
    }

    const datos: unknown =
      await respuesta.json().catch(() => null);

    if (
      !esObjeto(datos) ||
      datos.estado !== "activo" ||
      datos.servicio !== "motor-recomendador"
    ) {
      return {
        estado: "error",
        descripcion:
          "Render respondio, pero el estado no coincide con el esperado.",
        version: null,
        ms,
      };
    }

    return {
      estado: "responde",
      descripcion:
        "El endpoint /health respondio correctamente.",
      version:
        typeof datos.version === "string"
          ? datos.version
          : null,
      ms,
    };
  } catch {
    return {
      estado: "error",
      descripcion:
        "No hubo respuesta dentro de 15 segundos o se produjo un error de conexion.",
      version: null,
      ms: Date.now() - inicio,
    };
  }
}

// ==================================================
// COMPONENTES VISUALES
// ==================================================

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
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a304a] to-[#111e33] p-5">
      <p className="text-sm font-medium text-slate-300">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black tabular-nums text-white">
        {valor}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {detalle}
      </p>
    </article>
  );
}

function EstadoCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] text-cyan-200">
      Cargando supervision del motor IA...
    </main>
  );
}

function Aviso({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
      <h3 className="font-bold text-amber-200">
        {titulo}
      </h3>

      <div className="mt-2 text-sm leading-7 text-slate-300">
        {children}
      </div>
    </section>
  );
}

// ==================================================
// CONTENIDO ADMINISTRATIVO
// ==================================================

async function Contenido({
  searchParams,
}: Props) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  // ================================================
  // 1. IDENTIDAD
  // ================================================

  const {
    data: identidad,
    error: errorIdentidad,
  } = await supabase.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    redirect("/login");
  }

  // ================================================
  // 2. ROL ADMINISTRADOR
  // ================================================

  const {
    data: acceso,
    error: errorAcceso,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorAcceso ||
    acceso?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  // ================================================
  // 3. CLIENTE PRIVADO DE SERVIDOR
  // ================================================

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <main className="min-h-screen bg-[#080e1b] p-8 text-white">
        <h1 className="text-xl font-bold">
          Configuracion incompleta
        </h1>

        <p className="mt-3 text-amber-200">
          Faltan credenciales privadas de Supabase
          en el servidor de Vercel.
        </p>
      </main>
    );
  }

  const db = crearAdmin(url, clave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // ================================================
  // 4. PESTANA SELECCIONADA
  // ================================================

  const vista: Vista = VISTAS.includes(
    params.vista as Vista
  )
    ? (params.vista as Vista)
    : "resumen";

  const decision = DECISIONES.includes(
    params.decision ?? ""
  )
    ? params.decision!
    : "todas";

  const grupo =
    params.grupo === "GE" ||
    params.grupo === "GC"
      ? params.grupo
      : "todos";

  const entrenador =
    typeof params.entrenador === "string" &&
    UUID.test(params.entrenador)
      ? params.entrenador
      : "todos";

  const pagina = numeroPagina(
    params.pagina
  );

  // Comprobar Render solo al abrir Resumen o Monitor.
  // Así las otras pestañas no dependen de su latencia.

  const promesaSalud =
    vista === "resumen" || vista === "monitor"
      ? comprobarMotor()
      : Promise.resolve(null);

  // ================================================
  // 5. INDICADORES DE REVISIONES
  // ================================================

  const [
    rTotal,
    rAprobadas,
    rRechazadas,
    rAjustes,
    rParticipantes,
    rEntrenadores,
  ] = await Promise.all([
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
      .from("participantes_estudio")
      .select("cliente_id,grupo_estudio", {
        count: "exact",
      })
      .range(0, 999),

    db
      .from("usuario_roles")
      .select("usuario_id", {
        count: "exact",
      })
      .eq("rol", "entrenador")
      .range(0, 199),
  ]);

  const errorGeneral =
    rTotal.error ||
    rAprobadas.error ||
    rRechazadas.error ||
    rAjustes.error;

  if (errorGeneral) {
    return (
      <main className="min-h-screen bg-[#080e1b] p-8 text-white">
        <h1 className="text-xl font-bold">
          Error consultando revisiones
        </h1>

        <p className="mt-3 text-amber-200">
          No se pudieron leer los indicadores
          de revisiones_rutinas desde Supabase.
        </p>
      </main>
    );
  }

  // ================================================
  // 6. PARTICIPANTES GE / GC
  // ================================================

  const gruposVerificados =
    !rParticipantes.error &&
    rParticipantes.count !== null &&
    rParticipantes.count ===
      (rParticipantes.data?.length ?? 0);

  const participantes =
    gruposVerificados
      ? (rParticipantes.data ?? []) as Participante[]
      : [];

  const mapaGrupos = new Map(
    participantes.map((item) => [
      item.cliente_id,
      item.grupo_estudio,
    ])
  );

  const idsGE = participantes
    .filter((p) => p.grupo_estudio === "GE")
    .map((p) => p.cliente_id);

  const idsGC = participantes
    .filter((p) => p.grupo_estudio === "GC")
    .map((p) => p.cliente_id);

  async function contarGrupo(ids: string[]) {
    if (!gruposVerificados) {
      return null;
    }

    if (ids.length === 0) {
      return 0;
    }

    const resultado = await db
      .from("revisiones_rutinas")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("cliente_id", ids);

    return resultado.error
      ? null
      : resultado.count;
  }

  const [totalGE, totalGC] =
    vista === "resumen"
      ? await Promise.all([
          contarGrupo(idsGE),
          contarGrupo(idsGC),
        ])
      : [null, null];

  // ================================================
  // 7. HISTORIAL REAL
  // ================================================

  let revisiones: Revision[] = [];
  let totalFiltrado = 0;
  let errorHistorial = false;

  const mostrarHistorial =
    vista === "resumen" ||
    vista === "revisiones";

  if (mostrarHistorial) {
    const grupoElegido =
      vista === "revisiones" &&
      grupo !== "todos" &&
      gruposVerificados;

    const idsGrupo =
      grupo === "GE" ? idsGE : idsGC;

    if (grupoElegido && idsGrupo.length === 0) {
      revisiones = [];
      totalFiltrado = 0;
    } else {
      let consulta = db
        .from("revisiones_rutinas")
        .select(
          "id,cliente_id,entrenador_id,rutina_id,decision,observaciones,puntaje_compatibilidad,metodo_motor,revisado_en",
          { count: "exact" }
        );

      if (vista === "revisiones") {
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

        if (grupoElegido) {
          consulta = consulta.in(
            "cliente_id",
            idsGrupo
          );
        }
      }

      const resultado = await consulta
        .order("revisado_en", {
          ascending: false,
        })
        .range(
          vista === "resumen"
            ? 0
            : (pagina - 1) * POR_PAGINA,

          vista === "resumen"
            ? 3
            : pagina * POR_PAGINA - 1
        );

      if (resultado.error) {
        errorHistorial = true;
      } else {
        revisiones =
          (resultado.data ?? []) as Revision[];

        totalFiltrado =
          resultado.count ?? revisiones.length;
      }
    }
  }

  // ================================================
  // 8. NOMBRES Y RUTINAS
  // ================================================

  const idsEntrenadores =
    (rEntrenadores.data ?? []).map(
      (item) => item.usuario_id as string
    );

  const idsUsuarios = [
    ...new Set([
      ...idsEntrenadores,
      ...revisiones.flatMap((item) => [
        item.cliente_id,
        item.entrenador_id,
      ]),
    ]),
  ];

  const idsRutinas = [
    ...new Set(
      revisiones.map((item) => item.rutina_id)
    ),
  ];

  const [respuestaUsuarios, respuestaRutinas] =
    await Promise.all([
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

  const nombres = new Map<string, string>(
    (
      (respuestaUsuarios.data ?? []) as Usuario[]
    ).map((usuario) => [
      usuario.id,
      usuario.nombre_completo ??
        "Usuario sin nombre",
    ])
  );

  const nombresRutinas = new Map<number, string>(
    (
      (respuestaRutinas.data ?? []) as Rutina[]
    ).map((rutina) => [
      rutina.id,
      rutina.nombre,
    ])
  );

  const salud = await promesaSalud;

  const totalPaginas = Math.max(
    1,
    Math.ceil(totalFiltrado / POR_PAGINA)
  );

  function enlacePagina(n: number) {
    const query = new URLSearchParams();

    query.set("vista", "revisiones");

    if (decision !== "todas") {
      query.set("decision", decision);
    }

    if (grupo !== "todos") {
      query.set("grupo", grupo);
    }

    if (entrenador !== "todos") {
      query.set("entrenador", entrenador);
    }

    query.set("pagina", String(n));

    return `${RUTA}?${query.toString()}`;
  }

  function tarjetaRevision(item: Revision) {
    const grupoRegistro = gruposVerificados
      ? mapaGrupos.get(item.cliente_id) ??
        "Sin inscripción"
      : "No verificado";

    const tieneDatosIA =
      item.puntaje_compatibilidad !== null ||
      Boolean(item.metodo_motor);

    const conflictoGC =
      grupoRegistro === "GC" &&
      tieneDatosIA;

    return (
      <article
        key={item.id}
        className="rounded-2xl border border-white/10 bg-[#091728] p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-base font-bold text-white">
              {nombresRutinas.get(item.rutina_id) ??
                `Rutina #${item.rutina_id}`}
            </h3>

            <p className="mt-2 text-sm text-slate-300">
              Cliente:{" "}
              {nombres.get(item.cliente_id) ??
                "Nombre no disponible"}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Entrenador:{" "}
              {nombres.get(item.entrenador_id) ??
                "Nombre no disponible"}
            </p>
          </div>

          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${decisionClase(
              item.decision
            )}`}
          >
            {decisionTexto(item.decision)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
            Grupo: {grupoRegistro}
          </span>

          <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            {fechaLima(item.revisado_en)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#13263e] p-4">
            <p className="text-xs text-slate-400">
              Compatibilidad registrada
            </p>

            <p className="mt-1 text-lg font-bold">
              {typeof item.puntaje_compatibilidad ===
              "number"
                ? `${item.puntaje_compatibilidad.toFixed(1)} / 100`
                : "No registrada"}
            </p>
          </div>

          <div className="rounded-xl bg-[#13263e] p-4">
            <p className="text-xs text-slate-400">
              Método registrado
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-white">
              {item.metodo_motor ??
                "No registrado"}
            </p>
          </div>
        </div>

        {grupoRegistro === "GC" && (
          <p
            className={`mt-4 rounded-xl border p-3 text-xs leading-6 ${
              conflictoGC
                ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {conflictoGC
              ? "Atención: hay metadatos de compatibilidad en un registro GC. Verificar su origen antes de atribuirlo a IA."
              : "Revisión de grupo control: no hay metadatos de IA en esta decisión. Su origen manual debe verificarse en el flujo correspondiente."}
          </p>
        )}

        {grupoRegistro === "GE" && (
          <p className="mt-4 text-xs leading-6 text-cyan-200">
            Grupo experimental. El puntaje y el
            método, cuando están registrados,
            corresponden a información de
            compatibilidad y no a adherencia.
          </p>
        )}

        {item.observaciones && (
          <details className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <summary className="cursor-pointer text-sm font-bold text-cyan-200">
              Ver observaciones del entrenador
            </summary>

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
              {item.observaciones}
            </p>
          </details>
        )}
      </article>
    );
  }

  // ================================================
  // 9. INTERFAZ
  // ================================================

  return (
    <main className="min-h-screen bg-[#080e1b] px-4 py-7 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* CABECERA */}

        <section className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#17394f] via-[#14263d] to-[#211d3d] p-6 shadow-xl shadow-black/10 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-300">
                Evolution Center Fit 2.0
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Centro de supervisión IA
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Supervisa el servicio recomendador,
                las revisiones de entrenadores y
                las diferencias entre los grupos
                experimental y control.
              </p>
            </div>

            <Link
              href="/administrador"
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Volver al panel
            </Link>
          </div>
        </section>

        {/* PESTANAS */}

        <nav
          aria-label="Secciones de supervisión IA"
          className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#112039] p-2"
        >
          {[
            {
              id: "resumen",
              nombre: "Resumen",
            },
            {
              id: "evaluaciones",
              nombre: "Evaluaciones",
            },
            {
              id: "revisiones",
              nombre: "Revisiones",
            },
            {
              id: "monitor",
              nombre: "Monitor",
            },
          ].map((item) => (
            <Link
              key={item.id}
              href={`${RUTA}?vista=${item.id}`}
              aria-current={
                vista === item.id
                  ? "page"
                  : undefined
              }
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                vista === item.id
                  ? "bg-cyan-400 text-[#07121e]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.nombre}
            </Link>
          ))}
        </nav>

        {/* ======================================
            RESUMEN
        ====================================== */}

        {vista === "resumen" && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador
                titulo="Revisiones registradas"
                valor={rTotal.count ?? "—"}
                detalle="Decisiones almacenadas"
              />

              <Indicador
                titulo="Aprobadas"
                valor={rAprobadas.count ?? "—"}
                detalle="Decisiones de aprobación"
              />

              <Indicador
                titulo="Ajustes solicitados"
                valor={rAjustes.count ?? "—"}
                detalle="Revisiones que piden cambios"
              />

              <Indicador
                titulo="Rechazadas"
                valor={rRechazadas.count ?? "—"}
                detalle="Decisiones de rechazo"
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-[#112039] p-6">
                <h2 className="text-lg font-bold">
                  Estado de Render
                </h2>

                <span
                  className={`mt-4 inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${
                    salud?.estado === "responde"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                      : "border-amber-400/20 bg-amber-400/10 text-amber-200"
                  }`}
                >
                  {salud?.estado === "responde"
                    ? "Endpoint responde"
                    : "Requiere revisión"}
                </span>

                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {salud?.descripcion}
                </p>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>
                    Versión:{" "}
                    {salud?.version ?? "—"}
                  </span>

                  <span>
                    /health:{" "}
                    {salud?.ms === null ||
                    salud?.ms === undefined
                      ? "—"
                      : `${salud.ms} ms`}
                  </span>
                </div>

                <Link
                  href={`${RUTA}?vista=monitor`}
                  className="mt-5 inline-block text-sm font-bold text-cyan-300 hover:underline"
                >
                  Ver diagnóstico técnico
                </Link>
              </article>

              <article className="rounded-2xl border border-white/10 bg-[#112039] p-6">
                <h2 className="text-lg font-bold">
                  Revisiones por grupo
                </h2>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-cyan-400/15 bg-[#081728] p-4">
                    <p className="text-sm text-cyan-200">
                      Experimental · GE
                    </p>

                    <p className="mt-2 text-3xl font-black">
                      {totalGE ?? "—"}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      Revisiones registradas
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#081728] p-4">
                    <p className="text-sm text-slate-200">
                      Control · GC
                    </p>

                    <p className="mt-2 text-3xl font-black">
                      {totalGC ?? "—"}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      Revisiones registradas
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-6 text-slate-400">
                  Una revisión del grupo control
                  no constituye evidencia de
                  que se ejecutó la IA.
                </p>
              </article>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#112039] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  Actividad reciente
                </h2>

                <Link
                  href={`${RUTA}?vista=revisiones`}
                  className="text-sm font-bold text-cyan-300 hover:underline"
                >
                  Ver todas las revisiones
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {errorHistorial ? (
                  <p className="text-sm text-amber-200">
                    No se pudo consultar el historial.
                  </p>
                ) : revisiones.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Todavía no hay revisiones
                    registradas.
                  </p>
                ) : (
                  revisiones.map(tarjetaRevision)
                )}
              </div>
            </section>
          </>
        )}

        {/* ======================================
            EVALUACIONES
        ====================================== */}

        {vista === "evaluaciones" && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-[#112039] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Motor recomendador
              </p>

              <h2 className="mt-3 text-2xl font-black">
                Evaluaciones reales de inteligencia artificial
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                Historial de llamadas registradas
                desde el endpoint del entrenador.
                Los eventos empiezan a almacenarse
                cuando se activa la auditoria.
              </p>
            </section>

            <HistorialEvaluaciones />

            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-cyan-400/20 bg-[#112039] p-5">
                <h3 className="font-bold text-cyan-200">
                  Grupo experimental (GE)
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Las evaluaciones estan sujetas
                  a los permisos y fechas del estudio.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-[#112039] p-5">
                <h3 className="font-bold text-white">
                  Grupo control (GC)
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Mantiene el procedimiento manual.
                  No se registran evaluaciones IA
                  atribuidas a este grupo.
                </p>
              </article>
            </section>
          </div>
        )}

        {/* ======================================
            REVISIONES
        ====================================== */}

        {vista === "revisiones" && (
          <>
            <section className="rounded-2xl border border-white/10 bg-[#112039] p-5 sm:p-7">
              <h2 className="text-xl font-bold">
                Buscar decisiones
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Filtra por decisión, grupo
                de investigación y entrenador.
              </p>

              <form
                action={RUTA}
                method="get"
                className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
              >
                <input
                  type="hidden"
                  name="vista"
                  value="revisiones"
                />

                <label className="text-xs text-slate-300">
                  Decisión

                  <select
                    name="decision"
                    defaultValue={decision}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#081728] px-3 text-sm"
                  >
                    <option value="todas">
                      Todas
                    </option>

                    <option value="aprobada">
                      Aprobadas
                    </option>

                    <option value="ajustes_solicitados">
                      Ajustes solicitados
                    </option>

                    <option value="rechazada">
                      Rechazadas
                    </option>
                  </select>
                </label>

                <label className="text-xs text-slate-300">
                  Grupo

                  <select
                    name="grupo"
                    defaultValue={grupo}
                    disabled={!gruposVerificados}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#081728] px-3 text-sm disabled:opacity-50"
                  >
                    <option value="todos">
                      Todos
                    </option>

                    <option value="GE">
                      Experimental · GE
                    </option>

                    <option value="GC">
                      Control · GC
                    </option>
                  </select>
                </label>

                <label className="text-xs text-slate-300">
                  Entrenador

                  <select
                    name="entrenador"
                    defaultValue={entrenador}
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#081728] px-3 text-sm"
                  >
                    <option value="todos">
                      Todos
                    </option>

                    {idsEntrenadores.map((id) => (
                      <option key={id} value={id}>
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
                  className="min-h-12 self-end rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
                >
                  Aplicar filtros
                </button>
              </form>

              {!gruposVerificados && (
                <p className="mt-4 text-xs text-amber-200">
                  No se pudo consultar completamente
                  la inscripción GE/GC. El filtro
                  por grupo está deshabilitado.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#112039] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  Historial de revisiones
                </h2>

                <span className="text-xs text-slate-400">
                  {totalFiltrado} registros · Página{" "}
                  {pagina} de {totalPaginas}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {errorHistorial ? (
                  <p className="text-amber-200">
                    No se pudieron consultar
                    las revisiones.
                  </p>
                ) : revisiones.length === 0 ? (
                  <p className="rounded-xl bg-[#081728] p-5 text-sm text-slate-400">
                    No hay resultados con
                    estos filtros.
                  </p>
                ) : (
                  revisiones.map(tarjetaRevision)
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
                {pagina > 1 ? (
                  <Link
                    href={enlacePagina(pagina - 1)}
                    className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span />
                )}

                {pagina < totalPaginas ? (
                  <Link
                    href={enlacePagina(pagina + 1)}
                    className="rounded-xl border border-white/20 px-4 py-2 text-sm"
                  >
                    Siguiente →
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            </section>
          </>
        )}

        {/* ======================================
            MONITOR
        ====================================== */}

        {vista === "monitor" && (
          <>
            <section className="rounded-2xl border border-white/10 bg-[#112039] p-6 sm:p-8">
              <h2 className="text-2xl font-black">
                Diagnóstico técnico
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                Comprobaciones puntuales de
                disponibilidad y lectura de datos.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Indicador
                  titulo="Endpoint /health"
                  valor={
                    salud?.estado === "responde"
                      ? "Responde"
                      : "Revisar"
                  }
                  detalle={
                    salud?.descripcion ??
                    "No consultado"
                  }
                />

                <Indicador
                  titulo="Latencia /health"
                  valor={
                    salud?.ms === null ||
                    salud?.ms === undefined
                      ? "—"
                      : `${salud.ms} ms`
                  }
                  detalle="Tiempo de esta comprobación, no de /evaluar"
                />

                <Indicador
                  titulo="Versión FastAPI"
                  valor={salud?.version ?? "—"}
                  detalle="Reportada por el servicio"
                />

                <Indicador
                  titulo="Revisiones en Supabase"
                  valor={rTotal.count ?? "—"}
                  detalle="Registros persistentes consultados"
                />
              </div>
            </section>

            <Aviso titulo="Monitoreo de evaluaciones pendiente">
              Todavía no contamos con datos
              históricos verificados de latencia,
              errores, solicitudes y respuestas
              de cada ejecución del motor.

              La conexión exitosa de /health no
              garantiza que /evaluar esté
              funcionando correctamente.
            </Aviso>

            <section className="rounded-2xl border border-white/10 bg-[#112039] p-6">
              <h3 className="text-lg font-bold">
                Controles de investigación
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                El registro de evaluaciones
                deberá respetar la inscripción
                en el estudio y los permisos
                existentes. No debemos ejecutar
                recomendaciones sobre el grupo
                control ni exponer claves privadas
                en el navegador.
              </p>
            </section>
          </>
        )}

        {/* PIE */}

        <footer className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Supervisión IA
          · Consulta administrativa de solo lectura
        </footer>
      </div>
    </main>
  );
}

// ==================================================
// PAGINA PRINCIPAL
// ==================================================

export default function AdministradorIAPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<EstadoCarga />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}
