
"use client";

import { useState } from "react";

// ==========================================
// EVOLUTION CENTER FIT 2.0
// INTERFAZ DE RECOMENDACIONES
// Diseño profesional - UI 2.0
// ==========================================

type ResultadoRutina = {
  rutina_id: number;
  nombre: string;
  elegible: boolean;
  motivos: string[];
  puntaje_compatibilidad?: number;
  desglose_puntaje?: Record<string, number>;
};

type RespuestaMotor = {
  total_evaluadas: number;
  total_elegibles: number;
  metodo: string;
  resultados: ResultadoRutina[];
  rutinas_omitidas?: string[];
  advertencia?: string;
  error?: string;
};

const CRITERIOS = [
  { id: "estado", nombre: "Publicación", max: 5 },
  { id: "objetivo", nombre: "Objetivo", max: 30 },
  { id: "nivel", nombre: "Experiencia", max: 20 },
  { id: "frecuencia", nombre: "Frecuencia", max: 10 },
  { id: "duracion", nombre: "Duración", max: 15 },
  { id: "lugar", nombre: "Lugar", max: 10 },
  { id: "equipamiento", nombre: "Equipamiento", max: 10 },
];

function numero(valor: number) {
  return valor.toLocaleString("es-PE", {
    maximumFractionDigits: 1,
  });
}

// Icono decorativo sin dependencias externas
function IconoAnalisis() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5L12 3Z" />
      <path d="M19 2v4M17 4h4" />
    </svg>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function BotonRecomendar({
  clienteId,
}: {
  clienteId: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] =
    useState<RespuestaMotor | null>(null);

  // ----------------------------------------
  // Consultar Next.js -> Supabase -> FastAPI
  // ----------------------------------------

  async function evaluarRutinas() {
    setCargando(true);
    setError("");
    setResultado(null);

    try {
      const respuesta = await fetch(
        "/api/recomendaciones/evaluar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clienteId }),
          cache: "no-store",
        }
      );

      const datos =
        (await respuesta.json()) as RespuestaMotor;

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudo completar la evaluación."
        );
      }

      if (
        !Array.isArray(datos.resultados) ||
        typeof datos.total_evaluadas !== "number" ||
        typeof datos.total_elegibles !== "number"
      ) {
        throw new Error(
          "El motor devolvió una respuesta inesperada."
        );
      }

      setResultado(datos);
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Ocurrió un error de conexión."
      );
    } finally {
      setCargando(false);
    }
  }

  // ========================================
  // INTERFAZ VISUAL
  // ========================================

  return (
    <section
      className="space-y-6 text-slate-100"
      aria-busy={cargando}
    >
      {/* ENCABEZADO */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-300">
            <IconoAnalisis />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
              Motor de recomendaciones
            </p>

            <h3 className="mt-1 text-xl font-bold tracking-tight text-white">
              Análisis de compatibilidad
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Descubre qué rutinas se ajustan al perfil,
              la experiencia y la disponibilidad
              del cliente.
            </p>
          </div>
        </div>

        {/* BOTON */}
        <button
          type="button"
          onClick={evaluarRutinas}
          disabled={cargando}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition-all duration-300 hover:from-cyan-300 hover:to-teal-300 hover:shadow-cyan-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none sm:w-auto"
        >
          {cargando ? (
            <svg
              aria-hidden="true"
              className="h-5 w-5 motion-safe:animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="3"
                opacity="0.25"
              />
              <path
                d="M12 3a9 9 0 0 1 9 9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <IconoAnalisis />
          )}

          {cargando
            ? "Analizando rutinas..."
            : "Analizar rutinas"}
        </button>
      </div>

      {/* ESTADO DE CARGA */}
      {cargando && (
        <div
          role="status"
          className="ecf-entrada rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-5 py-4 text-sm leading-6 text-cyan-200"
        >
          Consultando el catálogo y calculando
          la compatibilidad de las rutinas...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm leading-6 text-red-200"
        >
          {error}
        </div>
      )}

      {/* RESULTADOS */}
      {resultado && (
        <div className="space-y-5">
          {/* RESUMEN */}
          <div className="ecf-entrada grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-800/70 p-5">
              <p className="text-sm font-medium text-slate-400">
                Rutinas analizadas
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                {resultado.total_evaluadas}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/10 bg-slate-800/70 p-5">
              <p className="text-sm font-medium text-slate-400">
                Rutinas elegibles
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-300">
                {resultado.total_elegibles}
              </p>
            </div>
          </div>

          {/* DESCRIPCION DEL RANKING */}
          {resultado.resultados.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h4 className="text-base font-semibold text-white">
                Resultados del análisis
              </h4>

              <p className="text-xs text-slate-500">
                Elegibilidad y mayor afinidad primero
              </p>
            </div>
          )}

          {/* SIN RESULTADOS */}
          {resultado.resultados.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-6 text-sm text-slate-300">
              No hay rutinas completas disponibles
              para evaluar.
            </div>
          )}

          {/* TARJETAS */}
          <ol className="space-y-4">
            {resultado.resultados.map(
              (rutina, indice) => {
                const valor =
                  rutina.puntaje_compatibilidad;

                const puntaje =
                  typeof valor === "number" &&
                  Number.isFinite(valor)
                    ? Math.max(
                        0,
                        Math.min(100, valor)
                      )
                    : null;

                return (
                  <li
                    key={rutina.rutina_id}
                    className="ecf-entrada overflow-hidden rounded-2xl border border-white/10 bg-slate-800/60 p-5 shadow-lg shadow-black/10 transition-all duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-white/20 sm:p-6"
                    style={{
                      animationDelay: `${Math.min(indice, 5) * 90}ms`,
                    }}
                  >
                    {/* TITULO Y ESTADO */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                          Opción {String(indice + 1).padStart(2, "0")}
                        </p>

                        <h5 className="mt-2 text-base font-bold leading-6 text-white sm:text-lg">
                          {rutina.nombre}
                        </h5>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          rutina.elegible
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {rutina.elegible
                          ? "Elegible"
                          : "No elegible"}
                      </span>
                    </div>

                    {/* PUNTUACION */}
                    {puntaje !== null && (
                      <div className="mt-6">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-300">
                              Afinidad según reglas
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Puntuación orientativa
                            </p>
                          </div>

                          <div className="whitespace-nowrap">
                            <span className="text-2xl font-bold tabular-nums text-white">
                              {numero(puntaje)}
                            </span>

                            <span className="ml-1 text-sm text-slate-400">
                              /100
                            </span>
                          </div>
                        </div>

                        {/* BARRA ANIMADA */}
                        <div
                          role="progressbar"
                          aria-label={`Afinidad de ${rutina.nombre}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={puntaje}
                          className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-700/80"
                        >
                          <div
                            className={`ecf-barra h-full rounded-full ${
                              rutina.elegible
                                ? "bg-gradient-to-r from-cyan-400 to-teal-400"
                                : "bg-gradient-to-r from-amber-400 to-orange-400"
                            }`}
                            style={{
                              width: `${puntaje}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* MENSAJE PRINCIPAL */}
                    <div
                      className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm leading-6 ${
                        rutina.elegible
                          ? "bg-emerald-400/5 text-emerald-200"
                          : "bg-amber-400/5 text-amber-200"
                      }`}
                    >
                      <span aria-hidden="true">
                        {rutina.elegible ? "✓" : "!"}
                      </span>

                      <p>
                        {rutina.elegible
                          ? "Cumple las reglas iniciales de elegibilidad. Pendiente de revisión profesional."
                          : rutina.motivos[0] ??
                            "No cumple los criterios obligatorios."}
                      </p>
                    </div>

                    {/* DETALLES DESPLEGABLES */}
                    <details className="group mt-5 rounded-xl border border-white/10 bg-slate-950/30">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-400 [&::-webkit-details-marker]:hidden">
                        <span>
                          Ver explicación y criterios
                        </span>

                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </summary>

                      <div className="space-y-5 border-t border-white/10 px-4 py-5">
                        {/* MOTIVOS */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Explicación del motor
                          </p>

                          <ul className="mt-3 space-y-2">
                            {rutina.motivos.map(
                              (motivo, indiceMotivo) => (
                                <li
                                  key={indiceMotivo}
                                  className="flex items-start gap-2 text-sm leading-6 text-slate-300"
                                >
                                  <span
                                    aria-hidden="true"
                                    className={
                                      rutina.elegible
                                        ? "text-emerald-400"
                                        : "text-amber-400"
                                    }
                                  >
                                    {rutina.elegible
                                      ? "✓"
                                      : "•"}
                                  </span>

                                  {motivo}
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        {/* CRITERIOS */}
                        {rutina.desglose_puntaje && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Desglose de puntuación
                            </p>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {CRITERIOS.map((criterio) => {
                                const puntos =
                                  rutina.desglose_puntaje?.[
                                    criterio.id
                                  ];

                                if (
                                  typeof puntos !== "number"
                                ) {
                                  return null;
                                }

                                return (
                                  <div
                                    key={criterio.id}
                                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/80 px-3 py-3"
                                  >
                                    <span className="text-xs text-slate-300">
                                      {criterio.nombre}
                                    </span>

                                    <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-cyan-300">
                                      {numero(puntos)}/{criterio.max}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                );
              }
            )}
          </ol>

          {/* ADVERTENCIAS */}
          {resultado.advertencia && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200">
              {resultado.advertencia}
            </div>
          )}

          {(resultado.rutinas_omitidas?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-sm font-semibold text-amber-200">
                Rutinas omitidas
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {resultado.rutinas_omitidas?.join(", ")}
              </p>
            </div>
          )}

          {/* NOTA PROFESIONAL */}
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-cyan-300" aria-hidden="true">
                ⓘ
              </span>

              <div>
                <p className="text-sm font-semibold text-cyan-200">
                  Evaluación preliminar
                </p>

                <p className="mt-2 text-xs leading-6 text-slate-400">
                  Las puntuaciones reflejan coincidencias
                  entre el perfil y las rutinas del
                  catálogo. No representan una probabilidad
                  de éxito ni garantizan resultados.
                  Las propuestas requieren revisión
                  y aprobación del entrenador.
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Método: {resultado.metodo}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
