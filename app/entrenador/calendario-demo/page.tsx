
"use client";

import { useEffect, useMemo, useState } from "react";

type Sesion = {
  sesion_id: number;
  cliente_id: string;
  cliente_nombre: string | null;
  entrenador_id: string;
  entrenador_nombre: string | null;
  rutina_id: number;
  numero_sesion: number;
  semana: number;
  fecha_programada: string;
  duracion_programada_min: number;
  estado: string;
  es_simulacion: boolean;
};

type CalendarioAPI = {
  modo: string;
  entrenador_id: string;
  total_clientes: number;
  total_sesiones: number;
  sesiones: Sesion[];
  error?: string;
};

const dias = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
];

function obtenerFecha(semana: number, dia: number) {
  const fecha = new Date(
    Date.UTC(2026, 10, 16 + (semana - 1) * 7 + dia)
  );

  return fecha.toISOString().slice(0, 10);
}

function mostrarFecha(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export default function CalendarioDemoPage() {
  const [datos, setDatos] = useState<CalendarioAPI | null>(
    null
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [semana, setSemana] = useState(1);
  const [clienteId, setClienteId] = useState("todos");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function cargarCalendario() {
      try {
        const response = await fetch(
          "/api/demo/calendario",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const resultado =
          (await response.json()) as CalendarioAPI;

        if (!response.ok) {
          throw new Error(
            resultado.error || "No se pudo cargar el calendario."
          );
        }

        if (!Array.isArray(resultado.sesiones)) {
          throw new Error(
            "La API devolvió un formato inesperado."
          );
        }

        if (!controller.signal.aborted) {
          setDatos(resultado);
          setError("");
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Error desconocido."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargarCalendario();

    return () => controller.abort();
  }, [recarga]);

  const registros = useMemo(
    () =>
      (datos?.sesiones ?? []).filter(
        (sesion) => sesion.es_simulacion === true
      ),
    [datos]
  );

  const clientes = useMemo(() => {
    const mapa = new Map<string, string>();

    registros.forEach((sesion) => {
      mapa.set(
        sesion.cliente_id,
        sesion.cliente_nombre || "Cliente sin nombre"
      );
    });

    return Array.from(mapa, ([id, nombre]) => ({
      id,
      nombre,
    })).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );
  }, [registros]);

  const agenda = useMemo(
    () =>
      registros.filter(
        (sesion) =>
          sesion.semana === semana &&
          (clienteId === "todos" ||
            sesion.cliente_id === clienteId)
      ),
    [registros, semana, clienteId]
  );

  function actualizar() {
    setCargando(true);
    setRecarga((valor) => valor + 1);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* Encabezado */}
        <header className="space-y-4">
          <a
            href="/entrenador"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Volver al panel del entrenador
          </a>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                MODO DEMOSTRACIÓN
              </span>

              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                Calendario de entrenamiento
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Evolution Center Fit 2.0
              </p>
              <p className="text-sm text-slate-400">
                Del 16 de noviembre al 11 de diciembre de 2026
              </p>
            </div>

            <button
              type="button"
              onClick={actualizar}
              disabled={cargando}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold transition hover:bg-slate-700 disabled:opacity-50"
            >
              {cargando ? "Cargando..." : "↻ Actualizar"}
            </button>
          </div>
        </header>

        {/* Indicadores */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              titulo: "Clientes asignados",
              valor: clientes.length,
            },
            {
              titulo: "Sesiones del periodo",
              valor: registros.length,
            },
            {
              titulo: "Semana seleccionada",
              valor: semana,
            },
            {
              titulo: "Sesiones visibles",
              valor: agenda.length,
            },
          ].map((indicador) => (
            <div
              key={indicador.titulo}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-xs text-slate-400">
                {indicador.titulo}
              </p>
              <p className="mt-3 text-3xl font-bold">
                {indicador.valor}
              </p>
            </div>
          ))}
        </section>

        {/* Errores */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-200"
          >
            <p className="font-semibold">
              No se pudo cargar el calendario
            </p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {/* Filtros */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-3 text-sm font-semibold">
                Seleccionar semana
              </p>

              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((numero) => (
                  <button
                    key={numero}
                    type="button"
                    onClick={() => setSemana(numero)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      semana === numero
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Semana {numero}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full sm:w-72">
              <label
                htmlFor="filtro-cliente"
                className="mb-2 block text-sm font-semibold"
              >
                Filtrar por cliente
              </label>

              <select
                id="filtro-cliente"
                value={clienteId}
                onChange={(event) =>
                  setClienteId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white"
              >
                <option value="todos">
                  Todos los clientes
                </option>

                {clientes.map((cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Calendario */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Agenda — Semana {semana}
            </h2>

            <span className="text-sm text-slate-400">
              {agenda.length} sesiones
            </span>
          </div>

          {cargando && !datos ? (
            <div className="py-16 text-center text-slate-400">
              Consultando sesiones de entrenamiento...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-slate-400">
              No hay información disponible.
            </div>
          ) : registros.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg font-semibold">
                Sin sesiones de demostración
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Esta cuenta no tiene sesiones de demostración
                asignadas actualmente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[850px] grid-cols-5 gap-3">
                {dias.map((dia, indice) => {
                  const fecha = obtenerFecha(
                    semana,
                    indice
                  );

                  const sesionesDia = agenda.filter(
                    (sesion) =>
                      sesion.fecha_programada === fecha
                  );

                  return (
                    <div
                      key={fecha}
                      className="min-h-[320px] rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                    >
                      <div className="mb-4 border-b border-slate-800 pb-3">
                        <p className="text-sm font-bold">
                          {dia}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {mostrarFecha(fecha)}
                        </p>
                        <p className="mt-2 text-xs text-blue-300">
                          {sesionesDia.length} sesiones
                        </p>
                      </div>

                      <div className="space-y-3">
                        {sesionesDia.length === 0 && (
                          <p className="py-5 text-center text-xs text-slate-500">
                            Sin sesiones
                          </p>
                        )}

                        {sesionesDia.map((sesion) => (
                          <article
                            key={sesion.sesion_id}
                            className="rounded-xl border border-blue-800/40 bg-blue-950/40 p-3"
                          >
                            <p className="text-xs font-semibold text-blue-300">
                              Sesión {sesion.numero_sesion}
                            </p>

                            <p className="mt-2 break-words text-sm font-semibold">
                              {sesion.cliente_nombre ||
                                "Cliente sin nombre"}
                            </p>

                            <p className="mt-2 text-xs text-slate-300">
                              {sesion.duracion_programada_min} minutos
                            </p>

                            <span className="mt-3 inline-block rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                              {sesion.estado}
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Aviso */}
        <footer className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-200">
          Este calendario contiene exclusivamente datos de
          demostración. No registra asistencias, ejercicios
          realizados ni resultados de la investigación.
        </footer>
      </div>
    </main>
  );
}
