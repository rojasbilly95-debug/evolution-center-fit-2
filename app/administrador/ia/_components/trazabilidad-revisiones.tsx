
import "server-only";

import {
  createClient as crearAdmin,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// EVOLUTION CENTER FIT 2.0
// FASE 111.17.4
// Trazabilidad directa de revisiones GE.

type Registro = {
  revision_id: number;
  cliente_id: string;
  entrenador_id: string;
  rutina_id: number;
  decision: string;
  elegible: boolean;
  puntaje_compatibilidad: number | null;
  metodo_motor: string | null;
  revisado_en: string;
};

type Persona = {
  id: string;
  nombre_completo: string | null;
};

type Rutina = {
  id: number;
  nombre: string;
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
  valor: number | string;
  detalle: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#091728] p-4">
      <p className="text-xs text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {valor}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {detalle}
      </p>
    </div>
  );
}

export default async function TrazabilidadRevisiones() {
  const sesion = await createClient();

  const {
    data: identidad,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (errorAuth || !identidad.user) {
    return null;
  }

  const {
    data: permiso,
    error: errorRol,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorRol ||
    permiso?.rol !== "administrador"
  ) {
    return null;
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return (
      <p className="text-sm text-amber-200">
        Trazabilidad no disponible:
        configuración privada incompleta.
      </p>
    );
  }

  const db = crearAdmin(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [
    totalRevisiones,
    totalVinculadas,
    respuestaRegistros,
  ] = await Promise.all([
    db
      .from("revisiones_rutinas")
      .select("id", {
        count: "exact",
        head: true,
      }),

    db
      .from("ecf_trazabilidad_revisiones_ia")
      .select("revision_id", {
        count: "exact",
        head: true,
      }),

    db
      .from("ecf_trazabilidad_revisiones_ia")
      .select(
        "revision_id,cliente_id,entrenador_id,rutina_id,decision,elegible,puntaje_compatibilidad,metodo_motor,revisado_en"
      )
      .order("registrado_en", {
        ascending: false,
      })
      .limit(10),
  ]);

  if (
    totalRevisiones.error ||
    totalVinculadas.error ||
    respuestaRegistros.error ||
    totalRevisiones.count === null ||
    totalVinculadas.count === null
  ) {
    return (
      <section
        role="alert"
        className="rounded-2xl border border-amber-400/20 bg-[#112039] p-5 text-amber-200"
      >
        No se pudo verificar la trazabilidad
        de revisiones en Supabase.
      </section>
    );
  }

  const registros =
    (respuestaRegistros.data ?? []) as Registro[];

  const idsPersonas = [
    ...new Set(
      registros.flatMap((item) => [
        item.cliente_id,
        item.entrenador_id,
      ])
    ),
  ];

  const idsRutinas = [
    ...new Set(
      registros.map((item) => item.rutina_id)
    ),
  ];

  const [personas, rutinas] = await Promise.all([
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
    ((personas.data ?? []) as Persona[]).map(
      (persona) => [
        persona.id,
        persona.nombre_completo ??
          "Nombre no disponible",
      ]
    )
  );

  const nombresRutinas = new Map<number, string>(
    ((rutinas.data ?? []) as Rutina[]).map(
      (rutina) => [
        rutina.id,
        rutina.nombre,
      ]
    )
  );

  const vinculadas = totalVinculadas.count;

  const sinVinculo = Math.max(
    0,
    totalRevisiones.count - vinculadas
  );

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-cyan-400/20 bg-[#112039] p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
          Fase 111.17.4
        </p>

        <h2 className="mt-2 text-xl font-black">
          Trazabilidad de decisiones IA
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          Revisiones que cuentan con un registro
          explícito de la reevaluación realizada
          por el entrenador.

          Este historial se crea únicamente
          para nuevas revisiones GE.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Indicador
            titulo="Total de revisiones"
            valor={totalRevisiones.count}
            detalle="GE, GC e históricas"
          />

          <Indicador
            titulo="Vínculo directo GE"
            valor={vinculadas}
            detalle="Revisiones auditadas desde esta fase"
          />

          <Indicador
            titulo="Sin vínculo registrado"
            valor={sinVinculo}
            detalle="Incluye históricas y decisiones manuales"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#112039] p-5 sm:p-7">
        <h3 className="text-lg font-bold">
          Últimas revisiones vinculadas
        </h3>

        {registros.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[#081525] p-5 text-sm leading-7 text-slate-400">
            Todavía no se ha registrado una
            nueva reevaluación vinculada.

            Las revisiones históricas no se
            relacionan automáticamente porque
            no disponemos de un identificador
            de evaluación verificable.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {registros.map((item) => (
              <article
                key={item.revision_id}
                className="rounded-xl border border-white/10 bg-[#081525] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">
                      {nombresRutinas.get(
                        item.rutina_id
                      ) ??
                        `Rutina #${item.rutina_id}`}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      Cliente:{" "}
                      {nombres.get(item.cliente_id) ??
                        "No disponible"}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Entrenador:{" "}
                      {nombres.get(
                        item.entrenador_id
                      ) ?? "No disponible"}
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
                    GE · Revisión #{item.revision_id}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-[#14263e] p-3">
                    <p className="text-xs text-slate-400">
                      Elegibilidad
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {item.elegible
                        ? "Elegible"
                        : "No elegible"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#14263e] p-3">
                    <p className="text-xs text-slate-400">
                      Compatibilidad
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {item.puntaje_compatibilidad ===
                      null
                        ? "No registrada"
                        : `${item.puntaje_compatibilidad}/100`}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#14263e] p-3">
                    <p className="text-xs text-slate-400">
                      Decisión
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {item.decision.replaceAll(
                        "_",
                        " "
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-3 break-words text-xs leading-6 text-slate-400">
                  Método:{" "}
                  {item.metodo_motor ||
                    "No registrado"}
                  {" · "}
                  {fechaLima(item.revisado_en)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
