"use client";

import { useEffect, useState } from "react";

type GrupoId = "GE" | "GC";

type Clave =
  | "asistencia"
  | "cumplimiento"
  | "continuidad";

type Medicion = {
  pre: number | null;
  post: number | null;
  delta: number | null;
  nPre: number;
  nPost: number;
  nPares: number;
};

type Grupo = {
  id: GrupoId;
  participantes: number;
  mediciones: Record<Clave, Medicion>;
};

const indicadores = [
  {
    id: "asistencia",
    titulo: "Asistencia",
    unidad: "%",
    deltaUnidad: " pp",
    maximo: 100,
  },
  {
    id: "cumplimiento",
    titulo: "Cumplimiento de ejercicios",
    unidad: "%",
    deltaUnidad: " pp",
    maximo: 100,
  },
  {
    id: "continuidad",
    titulo: "Continuidad semanal",
    unidad: " sem.",
    deltaUnidad: " sem.",
    maximo: 4,
  },
] as const;

function decimal(texto: string): number | null {
  if (
    texto === "" ||
    !/^-?\d+(?:\.\d+)?$/.test(texto)
  ) {
    return null;
  }

  const numero = Number(texto);

  return Number.isFinite(numero)
    ? numero
    : null;
}

function entero(texto: string): number {
  if (!/^\d+$/.test(texto)) {
    throw new Error(
      "Conteo inválido en el resumen."
    );
  }

  const numero = Number(texto);

  if (!Number.isSafeInteger(numero)) {
    throw new Error(
      "Conteo fuera de rango."
    );
  }

  return numero;
}

function leerResumenCSV(contenido: string): Grupo[] {
  // CSV generado por la API protegida:
  // solo etiquetas GE/GC y valores numéricos.
  const filas = contenido
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((linea) =>
      linea.split(";").map((celda) => {
        const valor = celda.trim();

        return (
          valor.startsWith('"') &&
          valor.endsWith('"')
        )
          ? valor
              .slice(1, -1)
              .replace(/""/g, '"')
          : valor;
      })
    );

  if (!filas.length) {
    throw new Error(
      "El resumen está vacío."
    );
  }

  const encabezados = filas[0];

  const indices = new Map(
    encabezados.map((nombre, indice) => [
      nombre,
      indice,
    ])
  );

  function celda(
    fila: string[],
    nombre: string
  ): string {
    const indice = indices.get(nombre);

    if (indice === undefined) {
      throw new Error(
        "Falta la columna: " + nombre
      );
    }

    return fila[indice] ?? "";
  }

  const vistos = new Set<string>();

  const grupos = filas
    .slice(1)
    .map((fila): Grupo => {
      const id = celda(
        fila,
        "grupo_estudio"
      );

      if (
        (id !== "GE" && id !== "GC") ||
        vistos.has(id)
      ) {
        throw new Error(
          "La clasificación de grupos es inválida o está duplicada."
        );
      }

      vistos.add(id);

      const mediciones = {} as Record<
        Clave,
        Medicion
      >;

      for (const indicador of indicadores) {
        const clave = indicador.id;

        const unidad =
          clave === "continuidad"
            ? "sem"
            : "pct";

        const unidadDelta =
          clave === "continuidad"
            ? "sem"
            : "pp";

        const base = (campo: string) =>
          celda(
            fila,
            clave + "_" + campo
          );

        mediciones[clave] = {
          pre: decimal(
            base("pre_media_" + unidad)
          ),

          post: decimal(
            base("post_media_" + unidad)
          ),

          delta: decimal(
            base("delta_media_" + unidadDelta)
          ),

          nPre: entero(base("pre_n")),

          nPost: entero(base("post_n")),

          nPares: entero(base("pares_n")),
        };
      }

      return {
        id,
        participantes: entero(
          celda(fila, "participantes")
        ),
        mediciones,
      };
    });

  return grupos.sort((a, b) =>
    a.id === "GE"
      ? -1
      : b.id === "GE"
        ? 1
        : 0
  );
}

function numero(
  valor: number | null,
  unidad: string
): string {
  if (valor === null) {
    return "Sin medición";
  }

  return (
    valor.toLocaleString("es-PE", {
      maximumFractionDigits: 2,
    }) + unidad
  );
}

function Barra({
  valor,
  maximo,
  color,
}: {
  valor: number | null;
  maximo: number;
  color: string;
}) {
  const ancho =
    valor === null
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            (valor / maximo) * 100
          )
        );

  return (
    <div
      aria-hidden="true"
      className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
    >
      {valor !== null && (
        <div
          className={
            "h-full rounded-full " + color
          }
          style={{
            width: ancho + "%",
          }}
        />
      )}
    </div>
  );
}

export default function ComparativaGrupos() {
  const [grupos, setGrupos] =
    useState<Grupo[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [actualizacion, setActualizacion] =
    useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    setCargando(true);
    setError("");

    async function cargar() {
      try {
        const respuesta = await fetch(
          "/api/investigacion/exportar?tipo=grupos",
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controlador.signal,
          }
        );

        if (!respuesta.ok) {
          const datos = (
            await respuesta
              .json()
              .catch(() => ({}))
          ) as {
            error?: string;
          };

          throw new Error(
            datos.error ??
              "No se pudo consultar la comparación."
          );
        }

        const tipo =
          respuesta.headers.get(
            "content-type"
          ) ?? "";

        if (!tipo.includes("text/csv")) {
          throw new Error(
            "La respuesta no contiene el resumen esperado."
          );
        }

        const texto =
          await respuesta.text();

        const datos =
          leerResumenCSV(texto);

        if (!controlador.signal.aborted) {
          setGrupos(datos);
        }
      } catch (problema) {
        if (!controlador.signal.aborted) {
          setError(
            problema instanceof Error
              ? problema.message
              : "Error al consultar el reporte."
          );

          setGrupos([]);
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => controlador.abort();
  }, [actualizacion]);

  const experimental = grupos.find(
    (grupo) => grupo.id === "GE"
  );

  const control = grupos.find(
    (grupo) => grupo.id === "GC"
  );

  return (
    <section
      id="comparacion-grupos"
      aria-labelledby="titulo-comparacion-grupos"
      className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-xl shadow-slate-900/10 dark:border-cyan-400/20 dark:bg-[#102036] sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
            Resultados del estudio
          </p>

          <h2
            id="titulo-comparacion-grupos"
            className="mt-2 text-2xl font-extrabold"
          >
            Comparación GE frente a GC
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Promedios reales del pretest y postest.
            Los cambios se calculan únicamente
            entre mediciones pareadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setActualizacion(
              (actual) => actual + 1
            )
          }
          disabled={cargando}
          className="rounded-xl border border-cyan-500/40 px-4 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-50 disabled:opacity-50 dark:text-cyan-200 dark:hover:bg-cyan-400/10"
        >
          {cargando
            ? "Consultando…"
            : "Actualizar datos"}
        </button>
      </div>

      <div aria-live="polite">
        {cargando && (
          <div className="mt-6 rounded-xl border border-slate-200 p-5 text-sm dark:border-white/10">
            Consultando mediciones confirmadas…
          </div>
        )}

        {!cargando && error && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-amber-300/60 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
          >
            {error} No se muestran porcentajes
            sin registros confirmados.
          </div>
        )}

        {!cargando &&
          !error &&
          grupos.length === 0 && (
            <div className="mt-6 rounded-xl border border-slate-200 p-5 text-sm dark:border-white/10">
              Aún no hay grupos con
              mediciones disponibles.
            </div>
          )}
      </div>

      {!cargando &&
        !error &&
        grupos.length > 0 && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {grupos.map((grupo) => (
                <div
                  key={grupo.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-[#0b172a]"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                    {grupo.id === "GE"
                      ? "Grupo experimental (GE)"
                      : "Grupo control (GC)"}
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {grupo.participantes}
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Participantes clasificados
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5">
              {indicadores.map((indicador) => {
                const cambioGE =
                  experimental?.mediciones[
                    indicador.id
                  ].delta ?? null;

                const cambioGC =
                  control?.mediciones[
                    indicador.id
                  ].delta ?? null;

                const brecha =
                  cambioGE !== null &&
                  cambioGC !== null
                    ? cambioGE - cambioGC
                    : null;

                return (
                  <article
                    key={indicador.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0c192d] sm:p-5"
                  >
                    <h3 className="text-lg font-bold">
                      {indicador.titulo}
                    </h3>

                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {indicador.id === "continuidad"
                        ? "Referencia visual: 0 a 4 semanas por fase."
                        : "Referencia visual: 0 a 100 %."}
                    </p>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {grupos.map((grupo) => {
                        const medida =
                          grupo.mediciones[
                            indicador.id
                          ];

                        return (
                          <div
                            key={grupo.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101f35]"
                          >
                            <p className="font-bold text-cyan-800 dark:text-cyan-300">
                              {grupo.id === "GE"
                                ? "Experimental · GE"
                                : "Control · GC"}
                            </p>

                            <div className="mt-4">
                              <div className="flex justify-between gap-2 text-sm">
                                <span>
                                  Pretest (n=
                                  {medida.nPre})
                                </span>

                                <strong>
                                  {numero(
                                    medida.pre,
                                    indicador.unidad
                                  )}
                                </strong>
                              </div>

                              <Barra
                                valor={medida.pre}
                                maximo={
                                  indicador.maximo
                                }
                                color="bg-cyan-500"
                              />
                            </div>

                            <div className="mt-4">
                              <div className="flex justify-between gap-2 text-sm">
                                <span>
                                  Postest (n=
                                  {medida.nPost})
                                </span>

                                <strong>
                                  {numero(
                                    medida.post,
                                    indicador.unidad
                                  )}
                                </strong>
                              </div>

                              <Barra
                                valor={medida.post}
                                maximo={
                                  indicador.maximo
                                }
                                color="bg-violet-500"
                              />
                            </div>

                            <div className="mt-4 border-t border-slate-200 pt-3 text-sm dark:border-white/10">
                              <span className="text-slate-600 dark:text-slate-400">
                                Cambio promedio (n=
                                {medida.nPares} pares):{" "}
                              </span>

                              <strong>
                                {numero(
                                  medida.delta,
                                  indicador.deltaUnidad
                                )}
                              </strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm dark:border-cyan-400/20 dark:bg-cyan-400/10">
                      <span className="font-semibold">
                        Diferencia descriptiva
                        de cambios (GE − GC):{" "}
                      </span>

                      <strong>
                        {numero(
                          brecha,
                          indicador.deltaUnidad
                        )}
                      </strong>

                      {brecha === null && (
                        <span className="ml-1 text-xs">
                          (requiere pares completos
                          en ambos grupos)
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-600 dark:text-slate-400">
              Las medias pretest y postest pueden
              tener distintos tamaños de muestra.
              La diferencia de cambios usa solo
              pares completos y es descriptiva:
              no equivale a una prueba de
              significación estadística.
              Las sesiones sin confirmar
              no son ausencias.
            </p>
          </>
        )}
    </section>
  );
}
