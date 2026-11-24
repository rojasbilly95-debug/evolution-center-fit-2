
"use client";

import { useEffect, useState } from "react";

// ============================================
// EVOLUTION CENTER FIT 2.0
// PASO 65.6.1
// REGISTRO DE EJERCICIOS CORREGIDO
// ============================================

type SerieRegistrada = {
  id: number;
  sesion_ejercicio_id: number;
  numero_serie: number;
  repeticiones_realizadas: number | null;
  duracion_real_seg: number | null;
  peso_kg: number | string | null;
  completada: boolean;
  observaciones: string | null;
};

type EjercicioSesion = {
  id: number;
  orden: number;
  ejercicio_id: number;
  series_objetivo: number | null;
  repeticiones_objetivo: number | null;
  duracion_objetivo_min: number | null;
  descanso_objetivo_seg: number;
  estado: string;
  ejercicio: {
    id: number;
    nombre: string;
    grupo_muscular: string;
    tipo: string;
  } | null;
  series: SerieRegistrada[];
};

type Respuesta = {
  error?: string;
  mensaje?: string;
  preparada?: boolean;
  totalEjercicios?: number;
  sesion?: {
    id: number;
    estado: string;
    fecha_programada: string;
  };
  asignacion?: {
    id: number;
    estado: string;
  };
  ejercicios?: EjercicioSesion[];
};

type Props = {
  sesionId: number;
};

type FilaProps = {
  ejercicio: EjercicioSesion;
  numeroSerie: number;
  registro?: SerieRegistrada;
  editable: boolean;
  alGuardar: () => void;
};

// ============================================
// 1. VALIDACIONES NUMERICAS
// ============================================

function numeroOpcional(
  valor: string,
  entero: boolean,
  maximo: number
): number | null {
  if (valor.trim() === "") {
    return null;
  }

  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    numero > maximo
  ) {
    throw new Error(
      "Introduce un valor numérico válido."
    );
  }

  if (
    entero &&
    !Number.isInteger(numero)
  ) {
    throw new Error(
      "Este campo debe contener un número entero."
    );
  }

  return numero;
}

// ============================================
// 2. FORMULARIO DE UNA SERIE
// ============================================


// ============================================
// FASE 117: RESUMEN VISUAL DE SERIES
// ============================================

// Este indicador representa el progreso de registro
// y no sustituye el cálculo oficial de adherencia.

function progresoDeEjercicio(
  ejercicio: EjercicioSesion
) {
  const objetivo = ejercicio.series_objetivo ?? 1;

  const registros = new Map<number, boolean>();

  for (const serie of ejercicio.series) {
    if (
      !Number.isInteger(serie.numero_serie) ||
      serie.numero_serie < 1 ||
      serie.numero_serie > objetivo
    ) {
      continue;
    }

    registros.set(
      serie.numero_serie,
      (registros.get(serie.numero_serie) ?? false) ||
      serie.completada
    );
  }

  return {
    objetivo,
    registradas: registros.size,
    completadas: [...registros.values()].filter(Boolean).length,
  };
}

function ProgresoEjercicio({
  ejercicio,
}: {
  ejercicio: EjercicioSesion;
}) {
  const progreso = progresoDeEjercicio(ejercicio);

  const porcentaje =
    progreso.objetivo > 0
      ? Math.round(
        (progreso.completadas / progreso.objetivo) * 100
      )
      : 0;

  return (
    <div className="mt-3 rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-slate-950/35 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Avance del ejercicio
        </span>

        <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
          {progreso.completadas} / {progreso.objetivo} completadas
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`Progreso de ${ejercicio.ejercicio?.nombre ??
          `ejercicio ${ejercicio.orden}`
          }`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          aria-hidden="true"
          className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
        {progreso.registradas} guardadas ·{" "}
        {progreso.completadas} completadas
      </p>
    </div>
  );
}

// CORRECCION:
// Los estados se inicializan directamente
// desde el registro recibido.
//
// No utilizamos useEffect para sincronizar
// estos estados, evitando el error de ESLint.

function FilaSerie({
  ejercicio,
  numeroSerie,
  registro,
  editable,
  alGuardar,
}: FilaProps) {
  const [
    repeticiones,
    setRepeticiones,
  ] = useState(
    registro?.repeticiones_realizadas
      ?.toString() ?? ""
  );

  const [
    duracion,
    setDuracion,
  ] = useState(
    registro?.duracion_real_seg
      ?.toString() ?? ""
  );

  const [peso, setPeso] = useState(
    registro?.peso_kg?.toString() ?? ""
  );

  const [
    completada,
    setCompletada,
  ] = useState(
    registro?.completada ?? false
  );

  const [
    observaciones,
    setObservaciones,
  ] = useState(
    registro?.observaciones ?? ""
  );

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  // ==========================================
  // FASE 117.6: DETECTAR CAMBIOS SIN GUARDAR
  // ==========================================

  const cambiosSinGuardar =
    repeticiones !==
      (registro?.repeticiones_realizadas?.toString() ?? "") ||
    duracion !==
      (registro?.duracion_real_seg?.toString() ?? "") ||
    peso !==
      (registro?.peso_kg?.toString() ?? "") ||
    completada !== (registro?.completada ?? false) ||
    observaciones !== (registro?.observaciones ?? "");

  // ==========================================
  // 3. GUARDAR UNA SERIE
  // ==========================================

  async function guardar() {
    if (!editable || guardando) {
      return;
    }

    setError("");
    setMensaje("");

    let reps: number | null;
    let segundos: number | null;
    let kilogramos: number | null;

    // ----------------------------------------
    // 3.1. Validar valores
    // ----------------------------------------

    try {
      reps = numeroOpcional(
        repeticiones,
        true,
        32767
      );

      segundos = numeroOpcional(
        duracion,
        true,
        86400
      );

      kilogramos = numeroOpcional(
        peso,
        false,
        99999.99
      );

      if (
        observaciones.length > 1000
      ) {
        throw new Error(
          "Las observaciones no pueden superar 1000 caracteres."
        );
      }

      // --------------------------------------
      // 3.2. Validar serie completada
      // --------------------------------------

      if (completada) {
        if (
          ejercicio.repeticiones_objetivo !==
          null &&
          (!reps || reps <= 0)
        ) {
          throw new Error(
            "Registra las repeticiones realizadas para completar esta serie."
          );
        }

        if (
          ejercicio.duracion_objetivo_min !==
          null &&
          (!segundos || segundos <= 0)
        ) {
          throw new Error(
            "Registra la duración real para completar esta serie."
          );
        }

        if (
          (!reps || reps <= 0) &&
          (!segundos || segundos <= 0)
        ) {
          throw new Error(
            "Una serie completada necesita repeticiones o duración."
          );
        }
      }
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Datos inválidos."
      );

      return;
    }

    // ----------------------------------------
    // 3.3. Enviar resultados a la API
    // ----------------------------------------

    setGuardando(true);

    try {
      const respuesta = await fetch(
        "/api/sesiones/series",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          cache: "no-store",

          body: JSON.stringify({
            sesionEjercicioId:
              ejercicio.id,

            numeroSerie,

            repeticionesRealizadas:
              reps,

            duracionRealSeg:
              segundos,

            pesoKg:
              kilogramos,

            completada,

            observaciones:
              observaciones.trim() ||
              null,
          }),
        }
      );

      const datos: {
        error?: string;
      } = await respuesta
        .json()
        .catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
          "No se pudo guardar la serie."
        );
      }

      setMensaje(
        "Serie guardada correctamente."
      );

      // Actualizar los datos de la sesión
      // después de guardar correctamente.

      alGuardar();
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Error de conexión."
      );
    } finally {
      setGuardando(false);
    }
  }

  // ==========================================
  // 4. INTERFAZ DE LA SERIE
  // ==========================================
  // Vista compacta de solo lectura.
  // No mostramos formularios cuando la sesión
  // no permite registrar o editar series.

  if (!editable) {
    if (!registro) {
      return null;
    }

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Serie {numeroSerie}
          </p>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              registro.completada
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200"
                : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"
            }`}
          >
            {registro.completada
              ? "Completada"
              : "Registro parcial"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-300">
          {registro.repeticiones_realizadas !== null && (
            <p>
              <span className="font-semibold">
                Repeticiones:
              </span>{" "}
              {registro.repeticiones_realizadas}
            </p>
          )}

          {registro.duracion_real_seg !== null && (
            <p>
              <span className="font-semibold">
                Duración:
              </span>{" "}
              {registro.duracion_real_seg} s
            </p>
          )}

          {registro.peso_kg !== null && (
            <p>
              <span className="font-semibold">
                Peso:
              </span>{" "}
              {registro.peso_kg} kg
            </p>
          )}
        </div>

        {registro.observaciones?.trim() && (
          <p className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
            <span className="font-semibold">
              Observaciones:
            </span>{" "}
            {registro.observaciones}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="ecf-series-card rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white dark:bg-[#0d192b] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white">
          Serie {numeroSerie}
        </p>

        <span
          className={`text-xs ${registro?.completada
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-[var(--ecf-muted,#64748b)] dark:text-slate-400"
            }`}
        >
          {registro?.completada
            ? "Completada"
            : registro
              ? "Guardada / pendiente"
              : "Sin registrar"}
        </span>
      </div>



{editable && cambiosSinGuardar && (
  <p
    role="status"
    className="mt-3 rounded-lg border border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200"
  >
    Tienes cambios sin guardar en esta serie.
  </p>
)}

      {/* ====================================
          DATOS DE LA SERIE
      ==================================== */}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-slate-700 dark:text-slate-300">
          Repeticiones reales

          <input
            type="number"
            min="0"
            max="32767"
            step="1"
            value={repeticiones}
            onChange={(e) =>
              setRepeticiones(
                e.target.value
              )
            }
            disabled={
              !editable || guardando
            }
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white disabled:opacity-50"
          />
        </label>

        <label className="text-xs text-slate-700 dark:text-slate-300">
          Duración real (segundos)

          <input
            type="number"
            min="0"
            max="86400"
            step="1"
            value={duracion}
            onChange={(e) =>
              setDuracion(
                e.target.value
              )
            }
            disabled={
              !editable || guardando
            }
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white disabled:opacity-50"
          />
        </label>

        <label className="text-xs text-slate-700 dark:text-slate-300">
          Peso (kg, opcional)

          <input
            type="number"
            min="0"
            max="99999.99"
            step="0.01"
            value={peso}
            onChange={(e) =>
              setPeso(
                e.target.value
              )
            }
            disabled={
              !editable || guardando
            }
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white disabled:opacity-50"
          />
        </label>
      </div>

      {/* ====================================
          SERIE COMPLETADA
      ==================================== */}

      <label className="mt-3 flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
        <input
          type="checkbox"
          checked={completada}
          onChange={(e) =>
            setCompletada(
              e.target.checked
            )
          }
          disabled={
            !editable || guardando
          }
          className="accent-emerald-400"
        />

        Marcar serie como completada
      </label>

      {/* ====================================
          OBSERVACIONES
      ==================================== */}

      <label className="mt-3 block text-xs text-slate-700 dark:text-slate-300">
        Observaciones (opcional)

        <textarea
          rows={2}
          maxLength={1000}
          value={observaciones}
          onChange={(e) =>
            setObservaciones(
              e.target.value
            )
          }
          disabled={
            !editable || guardando
          }
          className="mt-1 w-full resize-y rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-[var(--ecf-text,#102238)] dark:text-white disabled:opacity-50"
        />
      </label>

      {/* ====================================
          MENSAJES
      ==================================== */}

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-rose-800 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {mensaje && (
        <p
          role="status"
          className="mt-2 text-xs text-emerald-700 dark:text-emerald-300"
        >
          {mensaje}
        </p>
      )}

      {/* ====================================
          BOTON GUARDAR
      ==================================== */}

      {editable && (
        <button
          type="button"
          onClick={() =>
            void guardar()
          }
          disabled={guardando}
          className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
        >
          {guardando
            ? "Guardando..."
            : registro
              ? "Actualizar serie"
              : "Guardar serie"}
        </button>
      )}
    </div>
  );
}

// ============================================
// 5. COMPONENTE PRINCIPAL
// ============================================

export default function RegistroEjercicios({
  sesionId,
}: Props) {
  const [datos, setDatos] =
    useState<Respuesta | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [preparando, setPreparando] =
    useState(false);

  const [consulta, setConsulta] =
    useState(0);

  // ==========================================
  // 6. CONSULTAR EJERCICIOS
  // ==========================================

  useEffect(() => {
    const controlador =
      new AbortController();

    async function cargar() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(
          `/api/sesiones/ejercicios?sesionId=${encodeURIComponent(
            String(sesionId)
          )}`,
          {
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        const resultado: Respuesta =
          await respuesta
            .json()
            .catch(() => ({}));

        if (!respuesta.ok) {
          throw new Error(
            resultado.error ??
            "No se pudieron consultar los ejercicios."
          );
        }

        if (
          !resultado.sesion ||
          !Array.isArray(
            resultado.ejercicios
          )
        ) {
          throw new Error(
            "La respuesta del servidor está incompleta."
          );
        }

        if (
          !controlador.signal.aborted
        ) {
          setDatos(resultado);
        }
      } catch (problema) {
        if (
          !controlador.signal.aborted
        ) {
          setError(
            problema instanceof Error
              ? problema.message
              : "Error de conexión."
          );
        }
      } finally {
        if (
          !controlador.signal.aborted
        ) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () =>
      controlador.abort();
  }, [sesionId, consulta]);

  // ==========================================
  // 7. RECARGAR DATOS
  // ==========================================

  function recargar() {
    setConsulta(
      (anterior) => anterior + 1
    );
  }

  // ==========================================
  // 8. PREPARAR EJERCICIOS
  // ==========================================

  async function preparar() {
    if (preparando) {
      return;
    }

    setPreparando(true);
    setError("");

    try {
      const respuesta = await fetch(
        "/api/sesiones/ejercicios",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          cache: "no-store",

          body: JSON.stringify({
            sesionId,
          }),
        }
      );

      const resultado: Respuesta =
        await respuesta
          .json()
          .catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ??
          "No se pudieron preparar los ejercicios."
        );
      }

      recargar();
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Error de conexión."
      );
    } finally {
      setPreparando(false);
    }
  }

  // ==========================================
  // 9. PERMISOS SEGUN ESTADO
  // ==========================================

  const editable =
    datos?.sesion?.estado ===
    "en_curso" &&
    [
      "programada",
      "activa",
    ].includes(
      datos?.asignacion?.estado ?? ""
    );

  const preparable =
    [
      "programada",
      "en_curso",
    ].includes(
      datos?.sesion?.estado ?? ""
    ) &&
    [
      "programada",
      "activa",
    ].includes(
      datos?.asignacion?.estado ?? ""
    );



  // ==========================================
  // FASE 117: PROGRESO GENERAL DE LA SESIÓN
  // ==========================================

  const progresoSesion = (datos?.ejercicios ?? []).reduce(
    (resumen, ejercicio) => {
      const progreso = progresoDeEjercicio(ejercicio);

      resumen.seriesObjetivo += progreso.objetivo;

      resumen.seriesRegistradas += progreso.registradas;

      resumen.seriesCompletadas += progreso.completadas;

      if (
        progreso.objetivo > 0 &&
        progreso.completadas === progreso.objetivo
      ) {
        resumen.ejerciciosCompletados += 1;
      }

      return resumen;
    },
    {
      seriesObjetivo: 0,
      seriesRegistradas: 0,
      seriesCompletadas: 0,
      ejerciciosCompletados: 0,
    }
  );

  const porcentajeSesion =
    progresoSesion.seriesObjetivo > 0
      ? Math.round(
        (progresoSesion.seriesCompletadas /
          progresoSesion.seriesObjetivo) *
        100
      )
      : 0;

  // ==========================================
  // 10. INTERFAZ PRINCIPAL
  // ==========================================

  return (
    <section
      className="ecf-exercises mt-3 w-full min-w-0 rounded-2xl border border-cyan-400/20 bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#0b1729] p-3 sm:p-5"
      aria-label={`Ejercicios de la sesión ${sesionId}`}
    >
      {/* ====================================
          ENCABEZADO
      ==================================== */}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h6 className="text-sm font-bold text-[var(--ecf-text,#102238)] dark:text-white">
            Ejercicios de la sesión
          </h6>

          <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
            Objetivos programados y
            resultados reales.
          </p>
        </div>

        <button
          type="button"
          onClick={recargar}
          disabled={
            cargando || preparando
          }
          className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {/* ====================================
          ESTADO DE CARGA
      ==================================== */}

      {cargando && (
        <p
          role="status"
          className="mt-3 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400"
        >
          Cargando ejercicios...
        </p>
      )}

      {/* ====================================
          ERRORES
      ==================================== */}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-400/20 bg-rose-50 dark:bg-rose-400/10 p-3 text-xs text-rose-800 dark:text-rose-200"
        >
          {error}
        </p>
      )}

      {/* ====================================
          CONTENIDO
      ==================================== */}

      {!cargando &&
        datos &&
        !error && (
          <>
            {!datos.preparada ? (
              // =================================
              // EJERCICIOS NO PREPARADOS
              // =================================

              <div className="mt-3 rounded-lg border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 p-3">
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Esta sesión todavía no
                  tiene ejercicios preparados.
                </p>

                {preparable ? (
                  <button
                    type="button"
                    onClick={() =>
                      void preparar()
                    }
                    disabled={preparando}
                    className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
                  >
                    {preparando
                      ? "Preparando..."
                      : "Preparar ejercicios de esta sesión"}
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
                    El estado actual no
                    permite preparar ejercicios.
                  </p>
                )}
              </div>
            ) : (
              // =================================
              // EJERCICIOS PREPARADOS
              // =================================

              <div className="mt-3 space-y-3">

                <div className="rounded-2xl border border-cyan-400/20 bg-slate-50 dark:bg-slate-950/45 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                        Progreso de la sesión
                      </p>

                      <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                        {datos.totalEjercicios ??
                          datos.ejercicios?.length ??
                          0}{" "}
                        ejercicios preparados
                      </p>
                    </div>

                    <span className="text-sm font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {progresoSesion.seriesCompletadas} /{" "}
                      {progresoSesion.seriesObjetivo} series
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-label="Series completadas de la sesión"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={porcentajeSesion}
                    className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                  >
                    <div
                      aria-hidden="true"
                      className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
                      style={{ width: `${porcentajeSesion}%` }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-100 dark:bg-white/[0.04] p-3">
                      <p className="text-lg font-extrabold tabular-nums text-[var(--ecf-text,#102238)] dark:text-white">
                        {progresoSesion.seriesObjetivo}
                      </p>
                      <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                        Series objetivo
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-100 dark:bg-white/[0.04] p-3">
                      <p className="text-lg font-extrabold tabular-nums text-cyan-800 dark:text-cyan-200">
                        {progresoSesion.seriesRegistradas}
                      </p>
                      <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                        Registradas
                      </p>
                    </div>

                    <div className="col-span-2 rounded-lg bg-slate-100 dark:bg-white/[0.04] p-3 sm:col-span-1">
                      <p className="text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                        {progresoSesion.seriesCompletadas}
                      </p>
                      <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                        Completadas
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                    {progresoSesion.ejerciciosCompletados} ejercicios
                    con todas sus series completas.
                    Este avance es informativo, no el indicador
                    final de adherencia.
                  </p>
                </div>


                {!editable && (
                  <p className="rounded-lg border border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                    Solo se pueden registrar
                    o editar series cuando la
                    sesión está en curso y el
                    plan sigue vigente.
                  </p>
                )}

                {/* ============================
                    LISTADO DE EJERCICIOS
                ============================ */}

                {(datos.ejercicios ?? []).map(
                  (ejercicio) => (
                    <div
                      key={ejercicio.id}
                      className="ecf-exercise-card rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white dark:bg-[#14243a] p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                            {ejercicio.orden}.{" "}
                            {ejercicio.ejercicio
                              ?.nombre ??
                              `Ejercicio #${ejercicio.ejercicio_id}`}
                          </p>

                          <p className="mt-1 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                            {ejercicio.ejercicio
                              ?.grupo_muscular ??
                              "Sin grupo muscular"}

                            {" · "}

                            {ejercicio.ejercicio
                              ?.tipo ??
                              "Sin tipo"}
                          </p>
                        </div>

                        <span className="text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                          {ejercicio.estado}
                        </span>
                      </div>

                      {/* ======================
                          OBJETIVOS
                      ====================== */}

                      <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                        Objetivo:{" "}
                        {ejercicio.series_objetivo ??
                          1}{" "}
                        serie(s)

                        {ejercicio.repeticiones_objetivo !==
                          null
                          ? ` · ${ejercicio.repeticiones_objetivo} repeticiones`
                          : ""}

                        {ejercicio.duracion_objetivo_min !==
                          null
                          ? ` · ${ejercicio.duracion_objetivo_min} min`
                          : ""}

                        {` · descanso ${ejercicio.descanso_objetivo_seg} s`}
                      </p>

<ProgresoEjercicio ejercicio={ejercicio} />

                      {/* ======================
                          SERIES DEL EJERCICIO
                      ====================== */}


                      <div className="mt-3 space-y-2">
                        {Array.from(
                          {
                            length:
                              ejercicio.series_objetivo ??
                              1,
                          },
                          (_, indice) => {
                            const numeroSerie =
                              indice + 1;

                            const registro =
                              ejercicio.series.find(
                                (serie) =>
                                  serie.numero_serie ===
                                  numeroSerie
                              );

                            // ===================
                            // CORRECCION ESLINT
                            // ===================
                            //
                            // La clave incluye los
                            // valores guardados.
                            //
                            // Si cambian, React
                            // recrea el formulario
                            // con los nuevos datos.
                            //
                            // No necesitamos un
                            // useEffect adicional.

                            const claveRegistro =
                              JSON.stringify([
                                ejercicio.id,
                                numeroSerie,

                                registro?.id ??
                                null,

                                registro
                                  ?.repeticiones_realizadas ??
                                null,

                                registro
                                  ?.duracion_real_seg ??
                                null,

                                registro?.peso_kg ??
                                null,

                                registro?.completada ??
                                null,

                                registro
                                  ?.observaciones ??
                                null,
                              ]);

                            return (
                              <FilaSerie
                                key={claveRegistro}
                                ejercicio={
                                  ejercicio
                                }
                                numeroSerie={
                                  numeroSerie
                                }
                                registro={
                                  registro
                                }
                                editable={
                                  editable
                                }
                                alGuardar={
                                  recargar
                                }
                              />
                            );
                          }
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}
    </section>
  );
}
