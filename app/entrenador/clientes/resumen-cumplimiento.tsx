
"use client";

import {
  useEffect,
  useState,
} from "react";

// ============================================
// EVOLUTION CENTER FIT 2.0
// PASO 65.8
// RESUMEN VISUAL DE CUMPLIMIENTO
// ============================================

type Resumen = {
  estadoMedicion: string;

  ejerciciosObjetivo: number;
  ejerciciosConRegistro: number;
  ejerciciosCompletados: number;

  seriesObjetivo: number;
  seriesRegistradas: number;
  seriesCompletadas: number;

  coberturaPct: number | null;
  avancePct: number | null;
  cumplimientoFinalPct: number | null;

  repeticionesObjetivo: number;
  repeticionesRegistradas: number;
  repeticionesPct: number | null;

  duracionObjetivoSeg: number;
  duracionRegistradaSeg: number;
  duracionPct: number | null;
};

type Respuesta = {
  error?: string;

  sesion?: {
    id: number;
    estado: string;
    fechaProgramada: string;
  };

  resumen?: Resumen;
};

type Props = {
  sesionId: number;
};

type Estado = {
  cargando: boolean;
  error: string;
  datos: Respuesta | null;
};

// ============================================
// 1. BARRA DE PROGRESO
// ============================================

function Barra({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: number | null;
}) {
  const porcentaje =
    valor === null
      ? 0
      : Math.min(
          100,
          Math.max(0, valor)
        );

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-300">
          {etiqueta}
        </span>

        <span className="font-semibold text-cyan-200">
          {valor === null
            ? "No disponible"
            : `${valor}%`}
        </span>
      </div>

      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all"
          style={{
            width: `${porcentaje}%`,
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// 2. COMPONENTE PRINCIPAL
// ============================================

export default function ResumenCumplimiento({
  sesionId,
}: Props) {
  const [
    consulta,
    setConsulta,
  ] = useState(0);

  const [
    estado,
    setEstado,
  ] = useState<Estado>({
    cargando: true,
    error: "",
    datos: null,
  });

  // ==========================================
  // 3. CONSULTAR INDICADORES
  // ==========================================

  useEffect(() => {
    const controlador =
      new AbortController();

    async function cargar() {
      try {
        const respuesta = await fetch(
          `/api/sesiones/cumplimiento?sesionId=${encodeURIComponent(
            String(sesionId)
          )}`,
          {
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        const datos: Respuesta =
          await respuesta
            .json()
            .catch(() => ({}));

        if (!respuesta.ok) {
          throw new Error(
            datos.error ??
              "No se pudo consultar el cumplimiento."
          );
        }

        if (
          !datos.sesion ||
          !datos.resumen
        ) {
          throw new Error(
            "La respuesta de cumplimiento está incompleta."
          );
        }

        if (!controlador.signal.aborted) {
          setEstado({
            cargando: false,
            error: "",
            datos,
          });
        }
      } catch (problema) {
        if (!controlador.signal.aborted) {
          setEstado({
            cargando: false,

            error:
              problema instanceof Error
                ? problema.message
                : "Error de conexión.",

            datos: null,
          });
        }
      }
    }

    void cargar();

    return () =>
      controlador.abort();
  }, [sesionId, consulta]);

  // ==========================================
  // 4. DATOS Y ESTADO
  // ==========================================

  const resumen =
    estado.datos?.resumen;

  const medicion =
    resumen?.estadoMedicion;

  const mensaje =
    medicion === "no_iniciada"
      ? "La sesión todavía no comienza. No se calcula cumplimiento anticipado."
      : medicion === "no_aplica"
        ? "La sesión fue cancelada o registrada como ausencia. Se analiza en asistencia, no como cumplimiento de ejercicios."
        : medicion === "sin_objetivos"
          ? "No hay ejercicios preparados con objetivos válidos para medir el cumplimiento."
          : medicion === "sin_evidencia"
            ? "La sesión terminó sin series registradas. El cumplimiento final no es verificable."
            : medicion === "incompleta"
              ? "La sesión terminó con registros incompletos. El porcentaje final permanece pendiente de verificación."
              : medicion === "en_curso"
                ? "Avance provisional. Los valores pueden cambiar hasta finalizar el entrenamiento."
                : medicion === "verificada"
                  ? "Sesión finalizada con todas las series registradas. El cumplimiento es verificable."
                  : "";

  // ==========================================
  // 5. INTERFAZ
  // ==========================================

  return (
    <section
      className="ecf-compliance mt-3 rounded-xl border border-cyan-400/20 bg-slate-950/70 p-3 sm:p-4"
      aria-label={`Cumplimiento de la sesión ${sesionId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Seguimiento de adherencia
          </p>

          <h6 className="mt-1 text-sm font-semibold text-white">
            Cumplimiento de la sesión
          </h6>
        </div>

        <button
          type="button"
          onClick={() => {
            setEstado({
              cargando: true,
              error: "",
              datos: null,
            });

            setConsulta(
              (anterior) => anterior + 1
            );
          }}
          disabled={estado.cargando}
          className="text-xs font-semibold text-cyan-300 disabled:opacity-50"
        >
          Actualizar indicadores
        </button>
      </div>

      {/* CARGANDO */}

      {estado.cargando && (
        <p
          role="status"
          className="mt-3 text-xs text-slate-400"
        >
          Calculando indicadores...
        </p>
      )}

      {/* ERROR */}

      {estado.error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-xs text-rose-200"
        >
          {estado.error}
        </p>
      )}

      {/* RESULTADOS */}

      {!estado.cargando &&
        resumen && (
          <div className="mt-3 space-y-3">
            <p className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-xs leading-5 text-slate-300">
              {mensaje}
            </p>

            {/* INDICADORES PRINCIPALES */}

            <div className="ecf-compliance-grid grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  nombre: "Ejercicios",
                  valor:
                    resumen.ejerciciosObjetivo,
                },
                {
                  nombre: "Series previstas",
                  valor:
                    resumen.seriesObjetivo,
                },
                {
                  nombre: "Series registradas",
                  valor:
                    resumen.seriesRegistradas,
                },
                {
                  nombre: "Series completadas",
                  valor:
                    resumen.seriesCompletadas,
                },
              ].map((dato) => (
                <div
                  key={dato.nombre}
                  className="ecf-compliance-stat rounded-lg border border-white/10 bg-slate-900/60 p-3 text-center"
                >
                  <p className="text-lg font-bold text-white">
                    {dato.valor}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {dato.nombre}
                  </p>
                </div>
              ))}
            </div>

            {/* BARRAS DE PROGRESO */}

            {(
              medicion === "en_curso" ||
              medicion === "incompleta" ||
              medicion === "sin_evidencia" ||
              medicion === "verificada"
            ) && (
              <div className="ecf-compliance-bars space-y-3 rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <Barra
                  etiqueta="Cobertura de registros"
                  valor={
                    resumen.coberturaPct
                  }
                />

                <Barra
                  etiqueta="Series completadas respecto a las previstas"
                  valor={
                    resumen.avancePct
                  }
                />

                {resumen.repeticionesPct !==
                  null && (
                  <Barra
                    etiqueta="Repeticiones registradas respecto al objetivo"
                    valor={
                      resumen.repeticionesPct
                    }
                  />
                )}

                {resumen.duracionPct !==
                  null && (
                  <Barra
                    etiqueta="Duración registrada respecto al objetivo"
                    valor={
                      resumen.duracionPct
                    }
                  />
                )}
              </div>
            )}

            {/* CUMPLIMIENTO FINAL */}

            {resumen.cumplimientoFinalPct !==
              null && (
              <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-200">
                Cumplimiento final de series:{" "}
                {
                  resumen.cumplimientoFinalPct
                }
                %
              </p>
            )}

            {/* NOTA METODOLOGICA */}

            <p className="text-xs leading-5 text-slate-500">
              Ejercicios completos:{" "}
              {
                resumen.ejerciciosCompletados
              }{" "}
              de{" "}
              {
                resumen.ejerciciosObjetivo
              }.
              Las series sin registro no se
              consideran automáticamente
              incumplidas; se muestran como
              evidencia pendiente.
            </p>
          </div>
        )}
    </section>
  );
}
