
import "server-only";

import {
  createClient as crearAdmin,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// EVOLUTION CENTER FIT 2.0
// FASE 111.17.3
// Detalles de compatibilidad en el historial IA.

type DetalleRutina = {
  posicion: number;
  rutina_id: number;
  elegible: boolean;
  puntaje_compatibilidad: number | null;
};

type Evento = {
  id: string;
  cliente_id: string;
  entrenador_id: string;
  resultado: "exitosa" | "error_api";
  codigo_http: number;
  duracion_ms: number;
  creado_en: string;

  total_evaluadas: number | null;
  total_elegibles: number | null;
  metodo: string | null;
  similitud_aplicada: boolean | null;
  logica_difusa_aplicada: boolean | null;
  detalle_rutinas: unknown;
  detalle_truncado: boolean | null;
};

function esObjeto(
  valor: unknown
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function leerDetalles(
  valor: unknown
): DetalleRutina[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap(
    (item): DetalleRutina[] => {
      if (
        !esObjeto(item) ||
        typeof item.rutina_id !== "number" ||
        !Number.isSafeInteger(item.rutina_id) ||
        typeof item.posicion !== "number" ||
        !Number.isSafeInteger(item.posicion) ||
        typeof item.elegible !== "boolean"
      ) {
        return [];
      }

      return [{
        posicion: item.posicion,
        rutina_id: item.rutina_id,
        elegible: item.elegible,

        puntaje_compatibilidad:
          typeof item.puntaje_compatibilidad ===
            "number" &&
          Number.isFinite(
            item.puntaje_compatibilidad
          )
            ? item.puntaje_compatibilidad
            : null,
      }];
    }
  );
}

function fechaLima(valor: string) {
  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? "Fecha no disponible"
    : fecha.toLocaleString("es-PE", {
        timeZone: "America/Lima",
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function Indicador({
  titulo,
  valor,
  nota,
}: {
  titulo: string;
  valor: string | number;
  nota: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0a192b] p-5">
      <p className="text-sm text-slate-300">
        {titulo}
      </p>

      <p className="mt-2 text-3xl font-black text-white">
        {valor}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {nota}
      </p>
    </article>
  );
}

export default async function HistorialEvaluaciones() {
  const sesion = await createClient();

  const {
    data: auth,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (errorAuth || !auth.user) {
    return (
      <p className="text-amber-200">
        Sesión no disponible.
      </p>
    );
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
      <p className="text-amber-200">
        Acceso restringido.
      </p>
    );
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <p className="text-amber-200">
        Falta la configuración privada.
      </p>
    );
  }

  const db = crearAdmin(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Consultas reales de Supabase.

  const [
    total,
    exitosas,
    errores,
    historial,
  ] = await Promise.all([
    db
      .from("ecf_eventos_evaluacion_ia")
      .select("id", {
        head: true,
        count: "exact",
      }),

    db
      .from("ecf_eventos_evaluacion_ia")
      .select("id", {
        head: true,
        count: "exact",
      })
      .eq("resultado", "exitosa"),

    db
      .from("ecf_eventos_evaluacion_ia")
      .select("id", {
        head: true,
        count: "exact",
      })
      .eq("resultado", "error_api"),

    db
      .from("ecf_eventos_evaluacion_ia")
      .select(
        "id,cliente_id,entrenador_id,resultado,codigo_http,duracion_ms,creado_en,total_evaluadas,total_elegibles,metodo,similitud_aplicada,logica_difusa_aplicada,detalle_rutinas,detalle_truncado"
      )
      .order("creado_en", {
        ascending: false,
      })
      .limit(25),
  ]);

  if (
    total.error ||
    exitosas.error ||
    errores.error ||
    historial.error ||
    total.count === null ||
    exitosas.count === null ||
    errores.count === null
  ) {
    console.error(
      "Historial IA: error de consulta",
      historial.error?.code ||
        total.error?.code
    );

    return (
      <p
        role="alert"
        className="rounded-xl border border-amber-400/20 p-5 text-amber-200"
      >
        No se pudo consultar el historial.
        Comprueba Supabase y los logs de Vercel.
      </p>
    );
  }

  const eventos =
    (historial.data ?? []) as Evento[];

  const idsPersonas = [
    ...new Set(
      eventos.flatMap((evento) => [
        evento.cliente_id,
        evento.entrenador_id,
      ])
    ),
  ];

  const idsRutinas = [
    ...new Set(
      eventos.flatMap((evento) =>
        leerDetalles(
          evento.detalle_rutinas
        ).map((r) => r.rutina_id)
      )
    ),
  ].slice(0, 100);

  const [
    personas,
    rutinas,
  ] = await Promise.all([
    idsPersonas.length
      ? db
          .from("usuarios")
          .select("id,nombre_completo")
          .in("id", idsPersonas)
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
    (personas.data ?? []).map(
      (persona): [string, string] => [
        persona.id as string,
        (persona.nombre_completo as string | null) ||
          "Sin nombre",
      ]
    )
  );

  const nombresRutinas = new Map<number, string>(
    (rutinas.data ?? []).map(
      (rutina): [number, string] => [
        rutina.id as number,
        rutina.nombre as string,
      ]
    )
  );

  const tasa =
    total.count > 0
      ? `${Math.round(
          (exitosas.count / total.count) * 100
        )}%`
      : "—";

  return (
    <section className="space-y-5">

      {/* INDICADORES */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          titulo="Eventos registrados"
          valor={total.count}
          nota="Desde la activación del historial"
        />

        <Indicador
          titulo="Respuestas exitosas"
          valor={exitosas.count}
          nota="Respuestas HTTP 2xx"
        />

        <Indicador
          titulo="Errores de API"
          valor={errores.count}
          nota="Respuestas HTTP 5xx"
        />

        <Indicador
          titulo="Éxito HTTP"
          valor={tasa}
          nota="No mide precisión ni adherencia"
        />
      </div>

      {/* HISTORIAL */}

      <div className="rounded-2xl border border-white/10 bg-[#112039] p-5 sm:p-7">
        <h2 className="text-xl font-bold">
          Historial de evaluaciones GE
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Últimos 25 eventos. Los detalles de
          compatibilidad se guardan desde
          esta fase.
        </p>

        {eventos.length === 0 ? (
          <p className="mt-5 rounded-xl bg-[#081525] p-5 text-sm text-slate-300">
            Todavía no hay evaluaciones registradas.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {eventos.map((evento) => {
              const detalles = leerDetalles(
                evento.detalle_rutinas
              );

              const tieneResumen =
                evento.total_evaluadas !== null &&
                evento.total_elegibles !== null;

              return (
                <article
                  key={evento.id}
                  className="rounded-2xl border border-white/10 bg-[#081525] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">
                        {nombres.get(
                          evento.cliente_id
                        ) ?? "Cliente sin nombre"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        Entrenador:{" "}
                        {nombres.get(
                          evento.entrenador_id
                        ) ?? "No disponible"}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {fechaLima(evento.creado_en)}
                        {" · "}
                        HTTP {evento.codigo_http}
                        {" · "}
                        {evento.duracion_ms} ms
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        evento.resultado === "exitosa"
                          ? "bg-emerald-400/10 text-emerald-200"
                          : "bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      {evento.resultado === "exitosa"
                        ? "Respuesta exitosa"
                        : "Error de API"}
                    </span>
                  </div>

                  {tieneResumen ? (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[#13263e] p-4">
                          <p className="text-xs text-slate-400">
                            Rutinas evaluadas
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {evento.total_evaluadas}
                          </p>
                        </div>

                        <div className="rounded-xl bg-[#13263e] p-4">
                          <p className="text-xs text-slate-400">
                            Rutinas elegibles
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {evento.total_elegibles}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 break-words text-xs leading-6 text-slate-400">
                        Método:{" "}
                        {evento.metodo ||
                          "No registrado"}
                        {" · "}
                        Similitud:{" "}
                        {evento.similitud_aplicada === null
                          ? "No consta"
                          : evento.similitud_aplicada
                            ? "Sí"
                            : "No"}
                        {" · "}
                        Lógica difusa:{" "}
                        {evento.logica_difusa_aplicada ===
                        null
                          ? "No consta"
                          : evento.logica_difusa_aplicada
                            ? "Sí"
                            : "No"}
                      </p>

                      <details className="mt-4 rounded-xl border border-white/10 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
                          Ver compatibilidad por rutina
                          {" "}({detalles.length})
                        </summary>

                        <div className="mt-4 space-y-2">
                          {detalles.length === 0 && (
                            <p className="text-sm text-slate-400">
                              No hay detalles disponibles.
                            </p>
                          )}

                          {detalles.map((rutina) => (
                            <div
                              key={`${rutina.posicion}-${rutina.rutina_id}`}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#13263e] p-3 text-sm"
                            >
                              <div>
                                <p className="font-semibold">
                                  {rutina.posicion}.{" "}
                                  {nombresRutinas.get(
                                    rutina.rutina_id
                                  ) ??
                                    `Rutina #${rutina.rutina_id}`}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {rutina.elegible
                                    ? "Elegible"
                                    : "No elegible"}
                                </p>
                              </div>

                              <span className="font-bold text-cyan-200">
                                {rutina.puntaje_compatibilidad ===
                                null
                                  ? "Sin puntaje"
                                  : `${rutina.puntaje_compatibilidad}/100`}
                              </span>
                            </div>
                          ))}

                          {evento.detalle_truncado && (
                            <p className="text-xs text-amber-200">
                              Se guardaron solamente
                              las primeras 50 rutinas.
                            </p>
                          )}
                        </div>
                      </details>
                    </>
                  ) : (
                    <p className="mt-4 text-xs text-slate-400">
                      Evento anterior o sin detalle.
                      No se reconstruye información
                      que no fue almacenada.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs leading-6 text-slate-400">
        Los puntajes representan compatibilidad
        del motor, no adherencia. El registro
        almacena información resumida y no
        perfiles completos de los clientes.
      </p>
    </section>
  );
}
