
"use client";

import { useEffect, useState } from "react";
import AsignarRutina from "./asignar-rutina";

// ======================================
// TIPOS
// ======================================

type Decision =
  | "aprobada"
  | "ajustes_solicitados"
  | "rechazada";

type Revision = {
  id: number;
  decision: Decision;
  observaciones: string | null;
  revisado_en: string;
  puntaje_compatibilidad?: number | null;
  metodo_motor?: string | null;
};

type PlanVigente = {
  id: number;
  rutina_id: number;
  estado: string;
};

type RespuestaHistorial = {
  error?: string;
  revisiones?: Revision[];
};

type RespuestaRevision = {
  error?: string;
  revision?: Revision;
};

type RespuestaAsignacion = {
  error?: string;
  planVigente?: PlanVigente | null;
};

type Props = {
  clienteId: string;
  rutinaId: number;
  rutinaNombre: string;
  elegible: boolean;
};

type EstadoHistorial = {
  clave: string;
  estado: "cargando" | "listo" | "error";
  revisiones: Revision[];
  error: string;
};

type EstadoAsignacion = {
  clave: string;
  estado: "cargando" | "listo" | "error";
  planVigente: PlanVigente | null;
  error: string;
};

// ======================================
// CONSTANTES
// ======================================

const ETIQUETAS: Record<Decision, string> = {
  aprobada: "Aprobada por el entrenador",
  ajustes_solicitados: "Ajustes solicitados",
  rechazada: "Rechazada",
};

const TITULOS: Record<Decision, string> = {
  aprobada: "Confirmar aprobación",
  ajustes_solicitados: "Solicitar ajustes",
  rechazada: "Rechazar rutina",
};

const COLORES: Record<Decision, string> = {
  aprobada:
    "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  ajustes_solicitados:
    "border-amber-400/25 bg-amber-400/10 text-amber-200",
  rechazada:
    "border-rose-400/25 bg-rose-400/10 text-rose-200",
};

// ======================================
// FORMATEAR FECHA
// ======================================

function fechaLegible(valor: string): string {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return "Fecha no disponible";
  }

  return fecha.toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ======================================
// COMPONENTE PRINCIPAL
// ======================================

export default function RevisionRutina({
  clienteId,
  rutinaId,
  rutinaNombre,
  elegible,
}: Props) {
  const claveActual = `${clienteId}:${rutinaId}`;

  // ======================================
  // 1. ESTADOS DEL HISTORIAL
  // ======================================

  const [historial, setHistorial] =
    useState<EstadoHistorial>({
      clave: claveActual,
      estado: "cargando",
      revisiones: [],
      error: "",
    });

  const [numeroConsulta, setNumeroConsulta] =
    useState(0);

  // ======================================
  // 2. ESTADOS DE ASIGNACIÓN
  // ======================================

  const [
    estadoAsignacion,
    setEstadoAsignacion,
  ] = useState<EstadoAsignacion>({
    clave: claveActual,
    estado: "cargando",
    planVigente: null,
    error: "",
  });

  const [
    numeroConsultaAsignacion,
    setNumeroConsultaAsignacion,
  ] = useState(0);

  // ======================================
  // 3. ESTADOS DE DECISIÓN
  // ======================================

  const [
    decisionPendiente,
    setDecisionPendiente,
  ] = useState<{
    clave: string;
    valor: Decision;
  } | null>(null);

  const [
    observaciones,
    setObservaciones,
  ] = useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [
    errorGuardar,
    setErrorGuardar,
  ] = useState("");

  const [
    ultimaGuardada,
    setUltimaGuardada,
  ] = useState<{
    clave: string;
    revision: Revision;
  } | null>(null);

  // ======================================
  // 4. DATOS CALCULADOS DEL HISTORIAL
  // ======================================

  const historialActual =
    historial.clave === claveActual;

  const historialDisponible =
    historialActual &&
    historial.estado === "listo";

  const cargandoHistorial =
    !historialActual ||
    historial.estado === "cargando";

  const errorHistorial =
    historialActual &&
    historial.estado === "error"
      ? historial.error
      : "";

  const revisiones = historialActual
    ? historial.revisiones
    : [];

  const ultima = historialDisponible
    ? (revisiones[0] ?? null)
    : null;

  // ======================================
  // 5. DATOS CALCULADOS DE ASIGNACIÓN
  // ======================================

  const asignacionActual =
    estadoAsignacion.clave === claveActual;

  const asignacionLista =
    asignacionActual &&
    estadoAsignacion.estado === "listo";

  const planVigente = asignacionLista
    ? estadoAsignacion.planVigente
    : null;

  const planVigenteDeEstaRutina =
    planVigente?.rutina_id === rutinaId;

  // Si no podemos consultar el estado,
  // bloqueamos las decisiones por seguridad.

  const bloqueoRevision =
    !asignacionLista ||
    planVigenteDeEstaRutina;

  // ======================================
  // 6. DATOS CALCULADOS DE DECISIÓN
  // ======================================

  const decision =
    decisionPendiente?.clave === claveActual
      ? decisionPendiente.valor
      : null;

  const necesitaMotivo =
    decision !== null &&
    decision !== "aprobada";

  const motivoValido =
    !necesitaMotivo ||
    observaciones.trim().length >= 10;

  const guardada =
    ultimaGuardada?.clave === claveActual
      ? ultimaGuardada.revision
      : null;

  // ======================================
  // 7. CONSULTAR HISTORIAL PERSISTENTE
  // ======================================

  useEffect(() => {
    const controlador = new AbortController();

    const parametros = new URLSearchParams({
      clienteId,
      rutinaId: String(rutinaId),
    });

    void fetch(
      `/api/recomendaciones/historial?${parametros.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        signal: controlador.signal,
      }
    )
      .then(async (respuesta) => {
        const datos: RespuestaHistorial =
          await respuesta
            .json()
            .catch(() => ({}));

        if (
          !respuesta.ok ||
          !Array.isArray(datos.revisiones)
        ) {
          throw new Error(
            datos.error ??
              "No se pudo consultar el historial."
          );
        }

        return datos.revisiones;
      })
      .then((nuevasRevisiones) => {
        if (controlador.signal.aborted) {
          return;
        }

        setHistorial({
          clave: claveActual,
          estado: "listo",
          revisiones: nuevasRevisiones,
          error: "",
        });
      })
      .catch((problema: unknown) => {
        if (controlador.signal.aborted) {
          return;
        }

        setHistorial({
          clave: claveActual,
          estado: "error",
          revisiones: [],
          error:
            problema instanceof Error
              ? problema.message
              : "No se pudo consultar el historial.",
        });
      });

    return () => controlador.abort();
  }, [
    clienteId,
    rutinaId,
    claveActual,
    numeroConsulta,
  ]);

  // ======================================
  // 8. CONSULTAR PLAN VIGENTE
  // ======================================

  useEffect(() => {
    const controlador = new AbortController();

    const parametros = new URLSearchParams({
      clienteId,
      rutinaId: String(rutinaId),
    });

    void fetch(
      `/api/asignaciones/rutinas/estado?${parametros.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        signal: controlador.signal,
      }
    )
      .then(async (respuesta) => {
        const datos: RespuestaAsignacion =
          await respuesta
            .json()
            .catch(() => ({}));

        if (!respuesta.ok) {
          throw new Error(
            datos.error ??
              "No se pudo consultar el plan."
          );
        }

        return datos;
      })
      .then((datos) => {
        if (controlador.signal.aborted) {
          return;
        }

        setEstadoAsignacion({
          clave: claveActual,
          estado: "listo",
          planVigente:
            datos.planVigente ?? null,
          error: "",
        });
      })
      .catch((problema: unknown) => {
        if (controlador.signal.aborted) {
          return;
        }

        setEstadoAsignacion({
          clave: claveActual,
          estado: "error",
          planVigente: null,
          error:
            problema instanceof Error
              ? problema.message
              : "No se pudo consultar el plan.",
        });
      });

    return () => controlador.abort();
  }, [
    clienteId,
    rutinaId,
    claveActual,
    numeroConsultaAsignacion,
  ]);

  // ======================================
  // 9. ACTUALIZAR ESTADO DE ASIGNACIÓN
  // ======================================

  function actualizarEstadoAsignacion() {
    setEstadoAsignacion({
      clave: claveActual,
      estado: "cargando",
      planVigente: null,
      error: "",
    });

    setNumeroConsultaAsignacion(
      (anterior) => anterior + 1
    );
  }

  // ======================================
  // 10. ACTUALIZAR HISTORIAL
  // ======================================

  function actualizarHistorial() {
    if (guardando) {
      return;
    }

    setHistorial((anterior) => ({
      clave: claveActual,
      estado: "cargando",
      revisiones:
        anterior.clave === claveActual
          ? anterior.revisiones
          : [],
      error: "",
    }));

    setNumeroConsulta(
      (anterior) => anterior + 1
    );

    // También actualizar la asignación.
    actualizarEstadoAsignacion();
  }

  // ======================================
  // 11. SELECCIONAR DECISIÓN
  // ======================================

  function seleccionar(
    nuevaDecision: Decision
  ) {
    if (
      !historialDisponible ||
      bloqueoRevision ||
      guardando
    ) {
      return;
    }

    if (
      nuevaDecision === "aprobada" &&
      !elegible
    ) {
      return;
    }

    if (
      ultima?.decision === nuevaDecision
    ) {
      return;
    }

    setDecisionPendiente({
      clave: claveActual,
      valor: nuevaDecision,
    });

    setObservaciones("");
    setErrorGuardar("");
    setUltimaGuardada(null);
  }

  // ======================================
  // 12. CANCELAR DECISIÓN
  // ======================================

  function cancelar() {
    if (guardando) {
      return;
    }

    setDecisionPendiente(null);
    setObservaciones("");
    setErrorGuardar("");
  }

  // ======================================
  // 13. REGISTRAR DECISIÓN
  // ======================================

  async function registrar() {
    if (
      !decision ||
      guardando ||
      !historialDisponible ||
      bloqueoRevision ||
      !motivoValido ||
      (
        decision === "aprobada" &&
        !elegible
      ) ||
      ultima?.decision === decision
    ) {
      return;
    }

    setGuardando(true);
    setErrorGuardar("");

    try {
      const respuesta = await fetch(
        "/api/recomendaciones/revisar",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            clienteId,
            rutinaId,
            decision,
            observaciones:
              observaciones.trim(),
          }),
          cache: "no-store",
        }
      );

      const datos: RespuestaRevision =
        await respuesta
          .json()
          .catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudo guardar la revisión."
        );
      }

      if (
        !datos.revision ||
        datos.revision.decision !== decision
      ) {
        throw new Error(
          "El servidor devolvió una confirmación inesperada."
        );
      }

      const nuevaRevision =
        datos.revision;

      // Actualizar historial sin recargar.

      setHistorial((anterior) => ({
        clave: claveActual,
        estado: "listo",
        error: "",
        revisiones: [
          nuevaRevision,
          ...(
            anterior.clave === claveActual
              ? anterior.revisiones
              : []
          ).filter(
            (item) =>
              item.id !== nuevaRevision.id
          ),
        ].slice(0, 50),
      }));

      setUltimaGuardada({
        clave: claveActual,
        revision: nuevaRevision,
      });

      setDecisionPendiente(null);
      setObservaciones("");

      actualizarEstadoAsignacion();
    } catch (problema) {
      setErrorGuardar(
        problema instanceof Error
          ? problema.message
          : "No se pudo conectar con el servidor."
      );

      // Recuperar el estado real si hubo
      // un conflicto con una asignación.

      actualizarEstadoAsignacion();
    } finally {
      setGuardando(false);
    }
  }

  // ======================================
  // 14. INTERFAZ DEL ENTRENADOR
  // ======================================

  return (
    <section
      aria-label={`Revisión profesional de ${rutinaNombre}`}
      className="mt-5 rounded-xl border border-cyan-400/15 bg-slate-950/30 p-4 sm:p-5"
    >
      {/* ENCABEZADO */}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Validación profesional
          </p>

          <h6 className="mt-1 text-sm font-semibold text-white">
            Decisión del entrenador
          </h6>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            La aprobación no asigna automáticamente
            la rutina al cliente.
          </p>
        </div>

        {historialDisponible && ultima && (
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${COLORES[ultima.decision]}`}
          >
            {ETIQUETAS[ultima.decision]}
          </span>
        )}
      </div>

      {/* CARGANDO HISTORIAL */}

      {cargandoHistorial && (
        <p
          role="status"
          className="mt-4 text-sm text-slate-400"
        >
          Consultando revisiones anteriores...
        </p>
      )}

      {/* ERROR DEL HISTORIAL */}

      {errorHistorial && (
        <div className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3">
          <p
            role="alert"
            className="text-sm text-rose-200"
          >
            {errorHistorial}
          </p>

          <button
            type="button"
            onClick={actualizarHistorial}
            className="mt-2 text-xs font-semibold text-cyan-300 underline underline-offset-4"
          >
            Reintentar consulta
          </button>
        </div>
      )}

      {/* ACTUALIZAR DATOS */}

      {historialDisponible && (
        <div className="mt-3 flex flex-wrap justify-end gap-4">
          <button
            type="button"
            onClick={actualizarEstadoAsignacion}
            disabled={
              guardando ||
              !asignacionActual ||
              estadoAsignacion.estado ===
                "cargando"
            }
            className="text-xs font-medium text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
          >
            Actualizar estado del plan
          </button>

          <button
            type="button"
            onClick={actualizarHistorial}
            disabled={guardando}
            className="text-xs font-medium text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
          >
            Actualizar historial
          </button>
        </div>
      )}

      {/* ÚLTIMA DECISIÓN */}

      {historialDisponible && ultima && (
        <div className="mt-3 rounded-lg border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Última decisión registrada
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${COLORES[ultima.decision]}`}
            >
              {ETIQUETAS[ultima.decision]}
            </span>

            <span className="text-xs text-slate-400">
              Registro #{ultima.id} ·{" "}
              {fechaLegible(
                ultima.revisado_en
              )}
            </span>
          </div>

          {ultima.observaciones && (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {ultima.observaciones}
            </p>
          )}

          {ultima.puntaje_compatibilidad !=
            null && (
            <p className="mt-2 text-xs text-slate-400">
              Compatibilidad al revisar:{" "}
              {ultima.puntaje_compatibilidad}
              /100
            </p>
          )}
        </div>
      )}

      {/* CONFIRMACIÓN DE GUARDADO */}

      {guardada && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-medium text-emerald-200"
        >
          Decisión registrada correctamente.
          Registro #{guardada.id}.
        </p>
      )}

      {/* HISTORIAL DE DECISIONES */}

      {historialDisponible &&
        revisiones.length > 0 && (
          <details className="mt-3 rounded-lg border border-white/10 bg-slate-900/40 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
              Ver historial de decisiones (
              {revisiones.length})
            </summary>

            <ol className="mt-3 space-y-3 border-l border-white/10 pl-4">
              {revisiones.map(
                (revision) => (
                  <li
                    key={revision.id}
                    className="text-xs text-slate-300"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 font-semibold ${COLORES[revision.decision]}`}
                      >
                        {
                          ETIQUETAS[
                            revision.decision
                          ]
                        }
                      </span>

                      <span className="text-slate-400">
                        #{revision.id} ·{" "}
                        {fechaLegible(
                          revision.revisado_en
                        )}
                      </span>
                    </div>

                    {revision.observaciones && (
                      <p className="mt-2 whitespace-pre-wrap leading-5">
                        {
                          revision.observaciones
                        }
                      </p>
                    )}

                    {revision.puntaje_compatibilidad !=
                      null && (
                      <p className="mt-1 text-slate-400">
                        Compatibilidad:{" "}
                        {
                          revision.puntaje_compatibilidad
                        }
                        /100
                      </p>
                    )}

                    {revision.metodo_motor && (
                      <p className="mt-1 break-words text-slate-500">
                        Motor:{" "}
                        {
                          revision.metodo_motor
                        }
                      </p>
                    )}
                  </li>
                )
              )}
            </ol>

            {revisiones.length === 50 && (
              <p className="mt-3 text-xs text-slate-500">
                Se muestran como máximo las
                50 revisiones más recientes.
              </p>
            )}
          </details>
        )}

      {/* ASIGNACIÓN DE RUTINA APROBADA */}

      {historialDisponible &&
        ultima?.decision === "aprobada" && (
          <AsignarRutina
            key={`${clienteId}-${rutinaId}-${ultima.id}`}
            clienteId={clienteId}
            rutinaId={rutinaId}
            rutinaNombre={rutinaNombre}
            revisionId={ultima.id}
          />
        )}

      {/* SIN REVISIONES */}

      {historialDisponible && !ultima && (
        <p className="mt-4 text-xs text-slate-400">
          Esta rutina aún no tiene
          revisiones registradas.
        </p>
      )}

      {/* PLAN VIGENTE: BLOQUEO */}

      {planVigenteDeEstaRutina &&
        planVigente && (
          <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
            <p className="text-sm font-semibold text-emerald-200">
              Plan de entrenamiento vigente
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-300">
              Esta rutina ya está asignada al
              cliente (asignación #
              {planVigente.id}).
              No se pueden registrar nuevas
              decisiones mientras el plan esté
              programado, activo o pausado.
            </p>
          </div>
        )}

      {/* CONSULTA PENDIENTE O ERROR */}

      {!asignacionLista && (
        <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
          <p
            role="status"
            className="text-xs text-amber-200"
          >
            {asignacionActual &&
            estadoAsignacion.estado === "error"
              ? estadoAsignacion.error
              : "Verificando el estado del plan antes de habilitar decisiones."}
          </p>

          {asignacionActual &&
            estadoAsignacion.estado ===
              "error" && (
              <button
                type="button"
                onClick={actualizarEstadoAsignacion}
                className="mt-2 text-xs font-semibold text-cyan-300 underline"
              >
                Reintentar consulta
              </button>
            )}
        </div>
      )}

      {/* ERROR AL REGISTRAR DECISIÓN */}

      {errorGuardar && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"
        >
          {errorGuardar}
        </p>
      )}

      {/* BOTONES DE DECISIÓN */}

      {!decision && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              seleccionar("aprobada")
            }
            disabled={
              !historialDisponible ||
              bloqueoRevision ||
              !elegible ||
              guardando ||
              ultima?.decision === "aprobada"
            }
            className="min-h-11 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ultima?.decision === "aprobada"
              ? "Ya aprobada"
              : "Aprobar"}
          </button>

          <button
            type="button"
            onClick={() =>
              seleccionar(
                "ajustes_solicitados"
              )
            }
            disabled={
              !historialDisponible ||
              bloqueoRevision ||
              guardando ||
              ultima?.decision ===
                "ajustes_solicitados"
            }
            className="min-h-11 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Solicitar ajustes
          </button>

          <button
            type="button"
            onClick={() =>
              seleccionar("rechazada")
            }
            disabled={
              !historialDisponible ||
              bloqueoRevision ||
              guardando ||
              ultima?.decision === "rechazada"
            }
            className="min-h-11 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Rechazar
          </button>
        </div>
      )}

      {/* FORMULARIO DE DECISIÓN */}

      {decision && !bloqueoRevision && (
        <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-slate-900/80 p-4">
          <div>
            <p className="text-sm font-semibold text-white">
              {TITULOS[decision]}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              {decision === "aprobada"
                ? "El servidor comprobará nuevamente la elegibilidad antes de aprobar."
                : "Explica qué debe corregirse o por qué no se recomienda esta rutina."}
            </p>

            {ultima && (
              <p className="mt-2 text-xs text-amber-200">
                Esta decisión quedará registrada
                en el historial como la más
                reciente.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={`observaciones-${clienteId}-${rutinaId}`}
              className="block text-xs font-medium text-slate-300"
            >
              Observaciones{" "}
              {necesitaMotivo
                ? "(obligatorias, mínimo 10 caracteres)"
                : "(opcionales)"}
            </label>

            <textarea
              id={`observaciones-${clienteId}-${rutinaId}`}
              value={observaciones}
              onChange={(evento) =>
                setObservaciones(
                  evento.target.value
                )
              }
              disabled={guardando}
              maxLength={1000}
              rows={3}
              placeholder="Escribe la justificación de tu decisión..."
              className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-60"
            />

            <p className="mt-1 text-right text-xs text-slate-500">
              {observaciones.length}
              /1000 caracteres
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void registrar()
              }
              disabled={
                guardando ||
                bloqueoRevision ||
                !motivoValido
              }
              className="min-h-11 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {guardando
                ? "Guardando..."
                : "Confirmar decisión"}
            </button>

            <button
              type="button"
              onClick={cancelar}
              disabled={guardando}
              className="min-h-11 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
