
"use client";

import { useEffect, useState } from "react";

// ============================================
// EVOLUTION CENTER FIT 2.0
// FASE 118.6 - RESUMEN INTEGRAL DE ADHERENCIA
// ============================================

type Indicador = {
  porcentajeProvisional: number | null;
  porcentajeFinal: number | null;
};

type Semana = {
  numero: number;
  inicio: string;
  fin: string;
  estado: string;
  programadas: number;
  realizadas: number;
  ausentes: number;
  canceladas: number;
};

type Respuesta = {
  error?: string;

  plan?: {
    id: number;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    finalizadoPorFecha: boolean;
  };

  asistencia?: Indicador & {
    sesionesProgramadas: number;
    realizadas: number;
    ausentes: number;
    canceladas: number;
    enCurso: number;
    pendientesVencidas: number;
    programadasFuturas: number;
    sesionesCerradasVerificadas: number;
  };

  cumplimiento?: Indicador & {
    sesionesRealizadas: number;
    sesionesVerificables: number;
    sesionesSinObjetivos: number;
    sesionesSinEvidencia: number;
    sesionesIncompletas: number;
    seriesObjetivoVerificadas: number;
    seriesCompletadasVerificadas: number;
    coberturaPct: number | null;
  };

  continuidad?: Indicador & {
    totalSemanas: number;
    semanasVerificadas: number;
    semanasConAsistencia: number;
    semanasPendientes: number;
    semanasSinProgramacion: number;
    semanasCanceladas: number;
    semanas: Semana[];
  };

  nota?: string;
};

type Props = {
  asignacionId: number;
  revision?: number;
};

// ============================================
// 1. MOSTRAR PORCENTAJE
// ============================================

function Valor({
  valor,
}: {
  valor: number | null;
}) {
  return (
    <>
      {valor === null
        ? "Sin datos"
        : `${valor}%`}
    </>
  );
}

// ============================================
// 2. TARJETA DE INDICADOR
// ============================================

function Tarjeta({
  titulo,
  valor,
  detalle,
  definitivo,
}: {
  titulo: string;
  valor: number | null;
  detalle: string;
  definitivo: boolean;
}) {
  return (
    <div className="ecf-adherence-metric rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white dark:bg-slate-900/70 p-3">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {titulo}
      </p>

      <p className="mt-2 text-2xl font-bold text-cyan-800 dark:text-cyan-200">
        <Valor valor={valor} />
      </p>

      <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
        {valor === null
          ? "Sin evidencia suficiente"
          : definitivo
            ? "Resultado final"
            : "Resultado provisional"}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400"
          style={{
            width: `${
              Math.min(
                100,
                Math.max(0, valor ?? 0)
              )
            }%`,
          }}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
        {detalle}
      </p>
    </div>
  );
}

// ============================================
// 3. ESTADOS DE CONTINUIDAD
// ============================================

function nombreEstado(
  estado: string
): string {
  switch (estado) {
    case "verificada":
      return "Verificada";

    case "pendiente":
      return "Pendiente de verificar";

    case "sin_programacion":
      return "Sin programación";

    case "cancelada":
      return "Cancelada";

    default:
      return "Aún no finalizada";
  }
}

// ============================================
// FASE 118.6: EVOLUCIÓN SEMANAL CORREGIDA
// ============================================

function EvolucionSemanal({
  semanas,
}: {
  semanas: Semana[];
}) {
  const ordenadas = [...semanas].sort(
    (a, b) => a.numero - b.numero
  );

  return (
    <div className="rounded-2xl border border-cyan-200 dark:border-cyan-400/20 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5">
      <h6 className="text-sm font-bold text-[var(--ecf-text,#102238)] dark:text-white">
        Evolución semanal de asistencia
      </h6>

      <p className="mt-1 text-xs leading-5 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
        Relación descriptiva entre sesiones realizadas
        y programadas no canceladas. Solo se muestra
        el porcentaje cuando la semana está verificada.
        Este gráfico no sustituye el indicador oficial
        de asistencia.
      </p>

      {ordenadas.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
          Aún no existen semanas para este plan.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ordenadas.map((semana) => {

            // ====================================
            // EXCLUIR SESIONES CANCELADAS
            // ====================================

            const sesionesNoCanceladas = Math.max(
              0,
              semana.programadas - semana.canceladas
            );

            // ====================================
            // VERIFICAR SI LA SEMANA ES EVALUABLE
            // ====================================

            const evaluable =
              semana.estado === "verificada" &&
              sesionesNoCanceladas > 0;

            // ====================================
            // CALCULAR PORCENTAJE VISUAL
            // ====================================

            const porcentaje = evaluable
              ? Math.min(
                  100,
                  Math.max(
                    0,
                    Math.round(
                      (
                        semana.realizadas /
                        sesionesNoCanceladas
                      ) * 100
                    )
                  )
                )
              : null;

            return (
              <div
                key={semana.numero}
                className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Semana {semana.numero}
                  </span>

                  <span className="text-xs font-bold tabular-nums text-cyan-800 dark:text-cyan-200">
                    {porcentaje === null
                      ? "Sin medición"
                      : `${porcentaje}%`}
                  </span>
                </div>

                {/* BARRA DE PROGRESO */}

                <div
                  role="progressbar"
                  aria-label={`Sesiones realizadas en semana ${semana.numero}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    porcentaje ?? undefined
                  }
                  aria-valuetext={
                    porcentaje === null
                      ? "Sin porcentaje verificable"
                      : `${porcentaje}% de sesiones no canceladas realizadas`
                  }
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                >
                  <div
                    aria-hidden="true"
                    className="h-full rounded-full bg-cyan-400 transition-[width] duration-300"
                    style={{
                      width: `${porcentaje ?? 0}%`,
                    }}
                  />
                </div>

                {/* SESIONES EFECTIVAS */}

                <p className="mt-2 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  {semana.realizadas} realizadas de{" "}
                  {sesionesNoCanceladas} no canceladas
                </p>

                {/* SESIONES CANCELADAS */}

                {semana.canceladas > 0 && (
                  <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">
                    {semana.canceladas} sesiones canceladas
                  </p>
                )}

                {/* ESTADO DE LA SEMANA */}

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                  {nombreEstado(semana.estado)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// 4. COMPONENTE PRINCIPAL
// ============================================

export default function ResumenAdherencia({
  asignacionId,
  revision = 0,
}: Props) {
  const [recarga, setRecarga] = useState(0);

  const [estado, setEstado] = useState<{
    cargando: boolean;
    error: string;
    datos: Respuesta | null;
  }>({
    cargando: true,
    error: "",
    datos: null,
  });

  // ==========================================
  // 5. CONSULTAR INDICADORES
  // ==========================================

  useEffect(() => {
    const controlador = new AbortController();

    async function consultar() {
      try {
        const respuesta = await fetch(
          `/api/adherencia/plan?asignacionId=${encodeURIComponent(
            String(asignacionId)
          )}`,
          {
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        const datos: Respuesta = await respuesta
          .json()
          .catch(() => ({}));

        if (!respuesta.ok) {
          throw new Error(
            datos.error ??
              "No se pudo consultar la adherencia."
          );
        }

        if (
          !datos.plan ||
          !datos.asistencia ||
          !datos.cumplimiento ||
          !datos.continuidad
        ) {
          throw new Error(
            "El servidor devolvió información incompleta."
          );
        }

        if (!controlador.signal.aborted) {
          setEstado({
            cargando: false,
            error: "",
            datos,
          });
        }
      } catch (error) {
        if (!controlador.signal.aborted) {
          setEstado({
            cargando: false,
            error:
              error instanceof Error
                ? error.message
                : "Error de conexión.",
            datos: null,
          });
        }
      }
    }

    void consultar();

    return () => controlador.abort();
  }, [asignacionId, revision, recarga]);

  const datos = estado.datos;

  const asistencia = datos?.asistencia;
  const cumplimiento = datos?.cumplimiento;
  const continuidad = datos?.continuidad;

  // ==========================================
  // 6. INTERFAZ PRINCIPAL
  // ==========================================

  return (
    <section
      className="ecf-adherence mt-4 rounded-xl border border-cyan-200 dark:border-cyan-400/20 bg-[var(--ecf-surface,#ffffff)] dark:bg-slate-950/70 p-4"
      aria-label="Adherencia del plan"
    >
      {/* ENCABEZADO */}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
            Seguimiento integral
          </p>

          <h6 className="mt-1 text-base font-bold text-[var(--ecf-text,#102238)] dark:text-white">
            Adherencia al plan de entrenamiento
          </h6>

          <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
            Asistencia, cumplimiento y continuidad
            del cliente.
          </p>
        </div>

        <button
          type="button"
          disabled={estado.cargando}
          onClick={() => {
            setEstado({
              cargando: true,
              error: "",
              datos: null,
            });

            setRecarga(
              (anterior) => anterior + 1
            );
          }}
          className="rounded-lg border border-cyan-300 dark:border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-400/10 disabled:opacity-50"
        >
          Actualizar resumen
        </button>
      </div>

      {/* ESTADO DE CARGA */}

      {estado.cargando && (
        <p
          role="status"
          className="mt-4 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400"
        >
          Calculando adherencia...
        </p>
      )}

      {/* ERRORES */}

      {estado.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-400/10 p-3 text-sm text-rose-800 dark:text-rose-200"
        >
          {estado.error}
        </p>
      )}

      {/* RESULTADOS */}

      {!estado.cargando &&
        asistencia &&
        cumplimiento &&
        continuidad && (
          <div className="mt-4 space-y-4">

            {/* ==================================
                TRES DIMENSIONES
            ================================== */}

            <div className="ecf-adherence-grid grid gap-3 md:grid-cols-3">
              <Tarjeta
                titulo="Asistencia"
                valor={
                  asistencia.porcentajeFinal ??
                  asistencia.porcentajeProvisional
                }
                definitivo={
                  asistencia.porcentajeFinal !== null
                }
                detalle={`${asistencia.realizadas} realizadas · ${asistencia.ausentes} ausencias · ${asistencia.pendientesVencidas} pendientes vencidas`}
              />

              <Tarjeta
                titulo="Cumplimiento de series"
                valor={
                  cumplimiento.porcentajeFinal ??
                  cumplimiento.porcentajeProvisional
                }
                definitivo={
                  cumplimiento.porcentajeFinal !== null
                }
                detalle={`${cumplimiento.seriesCompletadasVerificadas} de ${cumplimiento.seriesObjetivoVerificadas} series en sesiones verificables`}
              />

              <Tarjeta
                titulo="Continuidad semanal"
                valor={
                  continuidad.porcentajeFinal ??
                  continuidad.porcentajeProvisional
                }
                definitivo={
                  continuidad.porcentajeFinal !== null
                }
                detalle={`${continuidad.semanasConAsistencia} de ${continuidad.semanasVerificadas} semanas verificadas con asistencia`}
              />
            </div>

            {/* ==================================
                ESTADO DEL CALENDARIO
            ================================== */}

            <div className="grid gap-3 rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white">
                  Estado del calendario
                </p>

                <p className="mt-2 text-xs leading-6 text-slate-700 dark:text-slate-300">
                  {asistencia.sesionesProgramadas} sesiones programadas
                  {" · "}
                  {asistencia.enCurso} en curso
                  {" · "}
                  {asistencia.programadasFuturas} futuras
                  {" · "}
                  {asistencia.canceladas} canceladas
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white">
                  Calidad del registro
                </p>

                <p className="mt-2 text-xs leading-6 text-slate-700 dark:text-slate-300">
                  {cumplimiento.sesionesVerificables} de{" "}
                  {cumplimiento.sesionesRealizadas} sesiones
                  realizadas verificables.
                  {" "}
                  {cumplimiento.sesionesSinEvidencia} sin evidencia,
                  {" "}
                  {cumplimiento.sesionesIncompletas} incompletas y
                  {" "}
                  {cumplimiento.sesionesSinObjetivos} sin objetivos preparados.
                </p>
              </div>
            </div>

            {/* ==================================
                FASE 118.2: ALERTAS DE REGISTROS
            ================================== */}

            {(asistencia.pendientesVencidas > 0 ||
              cumplimiento.sesionesSinEvidencia > 0 ||
              cumplimiento.sesionesIncompletas > 0) && (
              <div
                role="status"
                className="rounded-xl border border-amber-200 dark:border-amber-400/25 bg-amber-50 dark:bg-amber-400/[0.06] p-4"
              >
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Registros pendientes de revisión
                </p>

                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {asistencia.pendientesVencidas > 0 && (
                    <li>
                      {asistencia.pendientesVencidas} sesiones
                      vencidas pendientes de resolver.
                    </li>
                  )}

                  {cumplimiento.sesionesSinEvidencia > 0 && (
                    <li>
                      {cumplimiento.sesionesSinEvidencia} sesiones
                      finalizadas sin evidencia de series.
                    </li>
                  )}

                  {cumplimiento.sesionesIncompletas > 0 && (
                    <li>
                      {cumplimiento.sesionesIncompletas} sesiones
                      con registros incompletos.
                    </li>
                  )}
                </ul>

                <p className="mt-2 text-xs text-amber-900/90 dark:text-amber-100/80">
                  Los registros pendientes no se convierten
                  automáticamente en ausencias ni incumplimientos.
                </p>
              </div>
            )}

            {/* ==================================
                FASE 118.6: EVOLUCIÓN SEMANAL
            ================================== */}

            <EvolucionSemanal
              semanas={continuidad.semanas}
            />

            {/* ==================================
                CONTINUIDAD POR SEMANA
            ================================== */}

            <div>
              <p className="text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white">
                Continuidad por semana
              </p>

              <div className="ecf-week-grid mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {continuidad.semanas.map(
                  (semana) => (
                    <div
                      key={semana.numero}
                      className="ecf-week-card rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 p-3"
                    >
                      <p className="text-xs font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                        Semana {semana.numero}
                      </p>

                      <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                        {semana.inicio} al{" "}
                        {semana.fin}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                        {nombreEstado(
                          semana.estado
                        )}
                      </p>

                      <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                        {semana.realizadas} asistencias
                        {" · "}
                        {semana.ausentes} ausencias
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* ==================================
                EXPORTACIÓN CSV
            ================================== */}

            <div className="ecf-export-panel rounded-xl border border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900/60 p-4">
              <p className="text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white">
                Exportar registros para análisis estadístico
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                Archivos CSV separados por punto y coma.
                No contienen nombres ni correos.
                Los campos grupo_estudio y fase_medicion
                quedan vacíos hasta su clasificación real.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/api/adherencia/exportar?asignacionId=${encodeURIComponent(
                    String(asignacionId)
                  )}&tipo=sesiones`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-cyan-300 dark:border-cyan-400/40 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-400/20"
                >
                  Exportar sesiones (CSV)
                </a>

                <a
                  href={`/api/adherencia/exportar?asignacionId=${encodeURIComponent(
                    String(asignacionId)
                  )}&tipo=semanas`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-emerald-300 dark:border-emerald-400/40 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-400/20"
                >
                  Exportar semanas (CSV)
                </a>
              </div>
            </div>

            {/* ==================================
                NOTA METODOLÓGICA
            ================================== */}

            <p className="text-xs leading-5 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              {datos?.nota ??
                "Los registros incompletos no se contabilizan automáticamente como incumplimiento."}
            </p>
          </div>
        )}
    </section>
  );
}
