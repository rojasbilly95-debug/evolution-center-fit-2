
"use client";

import { useEffect, useState } from "react";
import ProgramarSesiones from "./programar-sesiones";

type PlanAsignado = {
  id: number;
  rutina_id: number;
  revision_id: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
  asignada_en: string;
};

type RespuestaEstado = {
  error?: string;
  planVigente?: PlanAsignado | null;
  ultimaAsignacion?: PlanAsignado | null;
};

type RespuestaGuardar = {
  error?: string;
  mensaje?: string;
  asignacion?: PlanAsignado;
};

type Props = {
  clienteId: string;
  rutinaId: number;
  rutinaNombre: string;
  revisionId: number;
};

type EstadoConsulta = {
  cargando: boolean;
  error: string;
  planVigente: PlanAsignado | null;
  ultimaAsignacion: PlanAsignado | null;
};

function mostrarFecha(
  valor: string | null
) {
  if (!valor) {
    return "Sin fecha definida";
  }

  const partes = valor.split("-");

  if (partes.length !== 3) {
    return valor;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// =====================================
// COMPONENTE PRINCIPAL
// =====================================

export default function AsignarRutina({
  clienteId,
  rutinaId,
  rutinaNombre,
  revisionId,
}: Props) {
  // =====================================
  // 1. ESTADO DE LA ASIGNACIÓN
  // =====================================

  const [estado, setEstado] =
    useState<EstadoConsulta>({
      cargando: true,
      error: "",
      planVigente: null,
      ultimaAsignacion: null,
    });

  const [
    numeroConsulta,
    setNumeroConsulta,
  ] = useState(0);

  // =====================================
  // 2. FORMULARIO
  // =====================================

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    fechaInicio,
    setFechaInicio,
  ] = useState("");

  const [
    fechaFin,
    setFechaFin,
  ] = useState("");

  const [notas, setNotas] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [
    errorGuardar,
    setErrorGuardar,
  ] = useState("");

  const [exito, setExito] =
    useState("");

  // =====================================
  // 3. CONSULTAR ASIGNACIÓN
  // =====================================

  useEffect(() => {
    const controlador =
      new AbortController();

    const parametros =
      new URLSearchParams({
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
        const datos: RespuestaEstado =
          await respuesta
            .json()
            .catch(() => ({}));

        if (!respuesta.ok) {
          throw new Error(
            datos.error ??
              "No se pudo consultar la asignación."
          );
        }

        return datos;
      })
      .then((datos) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setEstado({
          cargando: false,
          error: "",
          planVigente:
            datos.planVigente ?? null,
          ultimaAsignacion:
            datos.ultimaAsignacion ??
            null,
        });
      })
      .catch((problema: unknown) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setEstado({
          cargando: false,
          error:
            problema instanceof Error
              ? problema.message
              : "No se pudo consultar la asignación.",
          planVigente: null,
          ultimaAsignacion: null,
        });
      });

    return () =>
      controlador.abort();
  }, [
    clienteId,
    rutinaId,
    revisionId,
    numeroConsulta,
  ]);

  // =====================================
  // 4. ACTUALIZAR ESTADO
  // =====================================

  function actualizar() {
    if (guardando) {
      return;
    }

    setEstado((anterior) => ({
      ...anterior,
      cargando: true,
      error: "",
    }));

    setNumeroConsulta(
      (anterior) => anterior + 1
    );
  }

  // =====================================
  // 5. COMPROBACIONES
  // =====================================

  const planVigente =
    estado.planVigente;

  const rutinaYaAsignada =
    planVigente?.rutina_id ===
    rutinaId;

  const otroPlanVigente =
    planVigente !== null &&
    planVigente.rutina_id !==
      rutinaId;

  const aprobacionUtilizada =
    estado.ultimaAsignacion
      ?.revision_id === revisionId;

  const puedeAsignar =
    !estado.cargando &&
    !estado.error &&
    !planVigente &&
    !aprobacionUtilizada &&
    !guardando;

  const fechasValidas =
    fechaInicio.length === 10 &&
    (
      !fechaFin ||
      (
        fechaFin.length === 10 &&
        fechaFin >= fechaInicio
      )
    );

  // =====================================
  // 6. REGISTRAR ASIGNACIÓN
  // =====================================

  async function registrar() {
    if (
      !puedeAsignar ||
      !fechasValidas
    ) {
      return;
    }

    setGuardando(true);
    setErrorGuardar("");
    setExito("");

    try {
      const respuesta = await fetch(
        "/api/asignaciones/rutinas",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            clienteId,
            rutinaId,
            fechaInicio,
            fechaFin:
              fechaFin || null,
            notas: notas.trim(),
          }),
          cache: "no-store",
        }
      );

      const datos: RespuestaGuardar =
        await respuesta
          .json()
          .catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudo asignar la rutina."
        );
      }

      if (!datos.asignacion) {
        throw new Error(
          "El servidor no confirmó la asignación."
        );
      }

      const asignacion =
        datos.asignacion;

      setEstado({
        cargando: false,
        error: "",
        planVigente: asignacion,
        ultimaAsignacion:
          asignacion,
      });

      setExito(
        datos.mensaje ??
          "Rutina asignada correctamente."
      );

      setMostrarFormulario(false);
      setFechaInicio("");
      setFechaFin("");
      setNotas("");
    } catch (problema) {
      setErrorGuardar(
        problema instanceof Error
          ? problema.message
          : "No se pudo conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  }

  // =====================================
  // 7. INTERFAZ
  // =====================================

  return (
    <section
      aria-label={`Asignación de ${rutinaNombre}`}
      className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-950/10 p-4"
    >
      {/* ENCABEZADO */}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Gestión del plan
          </p>

          <h6 className="mt-1 text-sm font-semibold text-white">
            Asignación al cliente
          </h6>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Rutina aprobada por
            el entrenador.
            Registro de revisión #
            {revisionId}.
          </p>
        </div>

        {!estado.cargando &&
          !estado.error && (
          <button
            type="button"
            onClick={actualizar}
            disabled={guardando}
            className="text-xs font-medium text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
          >
            Actualizar estado
          </button>
        )}
      </div>

      {/* CARGANDO */}

      {estado.cargando && (
        <p
          role="status"
          className="mt-3 text-sm text-slate-400"
        >
          Comprobando asignaciones
          del cliente...
        </p>
      )}

      {/* ERROR */}

      {estado.error && (
        <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3">
          <p
            role="alert"
            className="text-sm text-rose-200"
          >
            {estado.error}
          </p>

          <button
            type="button"
            onClick={actualizar}
            className="mt-2 text-xs font-semibold text-cyan-300 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ASIGNACIÓN EXITOSA */}

      {exito && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-medium text-emerald-200"
        >
          {exito}
        </p>
      )}

      {/* PLAN VIGENTE DE ESTA RUTINA */}

      {!estado.cargando &&
        !estado.error &&
        rutinaYaAsignada &&
        planVigente && (
          <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
            <p className="text-sm font-semibold text-emerald-200">
              Rutina asignada al cliente
            </p>

            <p className="mt-2 text-xs text-slate-300">
              Asignación #
              {planVigente.id}
            </p>

            <p className="mt-1 text-xs text-slate-300">
              Estado:{" "}
              {planVigente.estado}
            </p>

            <p className="mt-1 text-xs text-slate-300">
              Inicio:{" "}
              {mostrarFecha(
                planVigente.fecha_inicio
              )}
            </p>

            <p className="mt-1 text-xs text-slate-300">
              Fin:{" "}
              {mostrarFecha(
                planVigente.fecha_fin
              )}
            </p>
          </div>
        )}

      {/* PROGRAMAR SESIONES */}

      {!estado.cargando &&
        !estado.error &&
        rutinaYaAsignada &&
        planVigente && (
          <ProgramarSesiones
            key={planVigente.id}
            asignacionId={
              planVigente.id
            }
          />
        )}

      {/* OTRO PLAN VIGENTE */}

      {!estado.cargando &&
        !estado.error &&
        otroPlanVigente && (
          <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
            <p className="text-sm font-semibold text-amber-200">
              El cliente ya tiene
              otro plan vigente.
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-300">
              Debes finalizar o
              cancelar el plan actual
              antes de asignar
              uno nuevo.
            </p>
          </div>
        )}

      {/* APROBACIÓN YA UTILIZADA */}

      {!estado.cargando &&
        !estado.error &&
        !planVigente &&
        aprobacionUtilizada && (
          <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
            <p className="text-sm font-semibold text-amber-200">
              Esta aprobación ya
              fue utilizada.
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-300">
              Para crear otra
              asignación será necesaria
              una nueva revisión y
              aprobación del entrenador.
            </p>
          </div>
        )}

      {/* BOTÓN DE ASIGNACIÓN */}

      {puedeAsignar &&
        !mostrarFormulario && (
          <button
            type="button"
            onClick={() => {
              setMostrarFormulario(
                true
              );
              setErrorGuardar("");
            }}
            className="mt-4 w-full rounded-lg border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/25"
          >
            Asignar rutina al cliente
          </button>
        )}

      {/* FORMULARIO DE ASIGNACIÓN */}

      {puedeAsignar &&
        mostrarFormulario && (
          <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-slate-900/80 p-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Programar entrenamiento
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Selecciona las fechas
                y confirma la asignación
                de la rutina.
              </p>
            </div>

            {/* FECHAS */}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`inicio-${clienteId}-${rutinaId}`}
                  className="block text-xs font-medium text-slate-300"
                >
                  Fecha de inicio *
                </label>

                <input
                  id={`inicio-${clienteId}-${rutinaId}`}
                  type="date"
                  value={fechaInicio}
                  onChange={(evento) =>
                    setFechaInicio(
                      evento.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`fin-${clienteId}-${rutinaId}`}
                  className="block text-xs font-medium text-slate-300"
                >
                  Fecha de fin
                  (opcional)
                </label>

                <input
                  id={`fin-${clienteId}-${rutinaId}`}
                  type="date"
                  value={fechaFin}
                  min={
                    fechaInicio ||
                    undefined
                  }
                  onChange={(evento) =>
                    setFechaFin(
                      evento.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* NOTAS */}

            <div>
              <label
                htmlFor={`notas-plan-${clienteId}-${rutinaId}`}
                className="block text-xs font-medium text-slate-300"
              >
                Indicaciones
                del entrenador
              </label>

              <textarea
                id={`notas-plan-${clienteId}-${rutinaId}`}
                value={notas}
                onChange={(evento) =>
                  setNotas(
                    evento.target.value
                  )
                }
                maxLength={1000}
                rows={3}
                placeholder="Ej.: Supervisar la técnica durante las primeras sesiones."
                className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />

              <p className="mt-1 text-right text-xs text-slate-500">
                {notas.length}/1000
                caracteres
              </p>
            </div>

            {/* ERROR AL GUARDAR */}

            {errorGuardar && (
              <p
                role="alert"
                className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"
              >
                {errorGuardar}
              </p>
            )}

            {/* ACCIONES */}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void registrar()
                }
                disabled={
                  guardando ||
                  !fechasValidas
                }
                className="min-h-11 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando
                  ? "Asignando..."
                  : "Confirmar asignación"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(
                    false
                  );
                  setErrorGuardar("");
                }}
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
