
import "server-only";

import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// EVOLUTION CENTER FIT 2.0
// FASE 111.17.2 - HISTORIAL REAL DE IA
// Componente exclusivo del administrador.

type Evento = {
  id: string;
  cliente_id: string;
  entrenador_id: string;
  grupo_estudio: string;
  resultado: "exitosa" | "error_api";
  codigo_http: number;
  duracion_ms: number;
  creado_en: string;
};

type Persona = {
  id: string;
  nombre_completo: string | null;
};

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
  detalle,
}: {
  titulo: string;
  valor: string | number;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#091728] p-5">
      <p className="text-sm text-slate-300">
        {titulo}
      </p>

      <p className="mt-2 text-3xl font-black tabular-nums text-white">
        {valor}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {detalle}
      </p>
    </div>
  );
}

export default async function HistorialEvaluaciones() {
  // Verificar identidad y rol ANTES de
  // utilizar las credenciales privadas.

  const sesion = await createClient();

  const {
    data: identidad,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (errorAuth || !identidad.user) {
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
    .eq("usuario_id", identidad.user.id)
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
        Falta la configuración privada del servidor.
      </p>
    );
  }

  const db = crearAdmin(url, clave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Consultas reales a la tabla de auditoría.

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
        "id,cliente_id,entrenador_id,grupo_estudio,resultado,codigo_http,duracion_ms,creado_en"
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
      "Historial IA: fallo de consulta",
      {
        total: total.error?.code,
        exitosas: exitosas.error?.code,
        errores: errores.error?.code,
        historial: historial.error?.code,
      }
    );

    return (
      <p
        role="alert"
        className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-200"
      >
        No se pudo consultar el historial.
        Comprueba la tabla, los permisos
        del servidor y los registros de Vercel.
      </p>
    );
  }

  const eventos =
    (historial.data ?? []) as Evento[];

  // Obtener los nombres sin modificar registros.

  const ids = [
    ...new Set(
      eventos.flatMap((evento) => [
        evento.cliente_id,
        evento.entrenador_id,
      ])
    ),
  ];

  const consultaPersonas = ids.length
    ? await db
        .from("usuarios")
        .select("id,nombre_completo")
        .in("id", ids)
    : null;

  const nombres = new Map<string, string>(
    ((consultaPersonas?.data ?? []) as Persona[]).map(
      (persona) => [
        persona.id,
        persona.nombre_completo?.trim() ||
          "Nombre no disponible",
      ]
    )
  );

  const datos = {
    total: total.count,
    exitosas: exitosas.count,
    errores: errores.count,
  };

  const tasa =
    datos.total > 0
      ? `${Math.round(
          (datos.exitosas / datos.total) * 100
        )}%`
      : "—";

  const promedioUltimos = eventos.length
    ? `${Math.round(
        eventos.reduce(
          (suma, evento) =>
            suma + evento.duracion_ms,
          0
        ) / eventos.length
      )} ms`
    : "—";

  return (
    <div className="space-y-5">

      {/* INDICADORES */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          titulo="Eventos registrados"
          valor={datos.total}
          detalle="Desde que se activó la auditoría"
        />

        <Indicador
          titulo="Respuestas exitosas"
          valor={datos.exitosas}
          detalle="Respuestas HTTP 2xx"
        />

        <Indicador
          titulo="Errores de API"
          valor={datos.errores}
          detalle="Fallos HTTP 5xx registrados"
        />

        <Indicador
          titulo="Éxito HTTP registrado"
          valor={tasa}
          detalle="No mide la precisión de la IA"
        />
      </div>

      {/* HISTORIAL */}

      <section className="rounded-2xl border border-white/10 bg-[#112039] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white">
              Historial de evaluaciones
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Últimos 25 eventos registrados
              desde el endpoint del entrenador.
            </p>
          </div>

          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-200">
            GE exclusivamente
          </span>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Duración media de los eventos visibles:{" "}
          {promedioUltimos}. Mide la llamada a
          FastAPI, no todo el procesamiento
          de Next.js.
        </p>

        {eventos.length === 0 ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-[#081525] p-5">
            <p className="font-semibold text-white">
              Todavía no hay evaluaciones registradas
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Los registros comenzarán después de
              desplegar la nueva versión y realizar
              una evaluación autorizada de un
              participante GE.

              Las dos revisiones anteriores no se
              convierten en eventos IA.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {eventos.map((evento) => (
              <article
                key={evento.id}
                className="rounded-xl border border-white/10 bg-[#081525] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {nombres.get(
                        evento.cliente_id
                      ) ?? "Cliente sin perfil"}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Entrenador:{" "}
                      {nombres.get(
                        evento.entrenador_id
                      ) ?? "Sin perfil"}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {fechaLima(evento.creado_en)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      evento.resultado === "exitosa"
                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                        : "border-amber-400/25 bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {evento.resultado === "exitosa"
                      ? "HTTP exitoso"
                      : "Error de API"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-lg bg-white/5 px-3 py-2">
                    Grupo: {evento.grupo_estudio}
                  </span>

                  <span className="rounded-lg bg-white/5 px-3 py-2">
                    HTTP {evento.codigo_http}
                  </span>

                  <span className="rounded-lg bg-white/5 px-3 py-2">
                    {evento.duracion_ms} ms
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-6 text-slate-400">
        Se guardan las llamadas registradas
        al motor, no perfiles ni respuestas completas.

        El registro es de mejor esfuerzo:
        si falla la inserción, puede haber
        evaluaciones no contabilizadas.

        Un error HTTP no demuestra necesariamente
        un fallo del algoritmo.
      </p>
    </div>
  );
}
