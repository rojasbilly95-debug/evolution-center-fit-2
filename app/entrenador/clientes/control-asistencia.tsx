
"use client";

import { useState } from "react";

// ============================================
// EVOLUTION CENTER FIT 2.0
// PASO 64.3
// CONTROL DE ASISTENCIA POR SESIÓN
// ============================================

export type SesionResumen = {
  id: number;
  numeroSesion: number;
  fechaProgramada: string;
  horaProgramada?: string | null;
  estado: string;
  duracionRealMin: number | null;
};

type Accion =
  | "iniciar"
  | "finalizar"
  | "marcar_ausente"
  | "cancelar";

type AccionConfirmable = Exclude<
  Accion,
  "iniciar"
>;

type Props = {
  sesion: SesionResumen;
  estadoPlan: string;
  onActualizada: (mensaje: string) => void;
};

type RespuestaApi = {
  error?: string;
  mensaje?: string;
  sesion?: {
    id: number;
    estado: string;
  };
};

// ============================================
// 1. ESTADOS VISUALES
// ============================================

const ESTADOS: Record<
  string,
  {
    nombre: string;
    clases: string;
  }
> = {
  programada: {
    nombre: "Programada",
    clases:
      "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  },

  en_curso: {
    nombre: "En curso",
    clases:
      "border-amber-400/30 bg-amber-400/10 text-amber-200",
  },

  realizada: {
    nombre: "Realizada",
    clases:
      "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  },

  ausente: {
    nombre: "Ausente",
    clases:
      "border-rose-400/30 bg-rose-400/10 text-rose-200",
  },

  cancelada: {
    nombre: "Cancelada",
    clases:
      "border-slate-400/30 bg-slate-400/10 text-slate-300",
  },
};

const ESTADO_FINAL: Record<
  Accion,
  string
> = {
  iniciar: "en_curso",
  finalizar: "realizada",
  marcar_ausente: "ausente",
  cancelar: "cancelada",
};

// ============================================
// 2. FECHA LOCAL DEL GIMNASIO
// ============================================

function fechaEnLima(): string {
  const partes = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find(
      (parte) => parte.type === tipo
    )?.value ?? "";

  return [
    valor("year"),
    valor("month"),
    valor("day"),
  ].join("-");
}

function mostrarFecha(
  fecha: string
)
  : string {
  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function mostrarHora(
  hora?: string | null
): string {
  if (!hora) {
    return "Horario por definir";
  }

  const partes = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(hora);

  if (!partes) {
    return "Horario por definir";
  }

  const horas = Number(partes[1]);
  const minutos = partes[2];

  const periodo =
    horas >= 12 ? "p. m." : "a. m.";

  const hora12 =
    horas % 12 || 12;

  return `${hora12}:${minutos} ${periodo}`;
}
// ============================================
// 3. COMPONENTE PRINCIPAL
// ============================================

export default function ControlAsistencia({
  sesion,
  estadoPlan,
  onActualizada,
}: Props) {
  const [confirmacion, setConfirmacion] =
    useState<AccionConfirmable | null>(
      null
    );

  const [observaciones, setObservaciones] =
    useState("");

  const [procesando, setProcesando] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==========================================
  // 4. COMPROBACIONES
  // ==========================================

  const hoy = fechaEnLima();

  const planHabilitado =
    estadoPlan === "programada" ||
    estadoPlan === "activa";

  const esHoy =
    sesion.fechaProgramada === hoy;

  const esPasada =
    sesion.fechaProgramada < hoy;

  const esHoyOFutura =
    sesion.fechaProgramada >= hoy;

  const programada =
    sesion.estado === "programada";

  const enCurso =
    sesion.estado === "en_curso";

  const estadoVisual =
    ESTADOS[sesion.estado] ?? {
      nombre: sesion.estado,
      clases:
        "border-white/15 bg-white/5 text-slate-200",
    };

  // ==========================================
  // 5. ABRIR CONFIRMACIÓN
  // ==========================================

  function abrirConfirmacion(
    accion: AccionConfirmable
  ) {
    setConfirmacion(accion);
    setObservaciones("");
    setError("");
  }

  // ==========================================
  // 6. EJECUTAR ACCIÓN EN LA API
  // ==========================================

  async function ejecutar(
    accion: Accion
  ) {
    if (
      procesando ||
      !planHabilitado
    ) {
      return;
    }

    if (
      accion === "cancelar" &&
      observaciones.trim().length < 10
    ) {
      setError(
        "Indica un motivo de cancelación de al menos 10 caracteres."
      );
      return;
    }

    setProcesando(true);
    setError("");

    try {
      const respuesta = await fetch(
        "/api/sesiones/asistencia",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            sesionId: sesion.id,
            accion,
            observaciones:
              observaciones.trim() || null,
          }),
          cache: "no-store",
        }
      );

      const datos: RespuestaApi =
        await respuesta
          .json()
          .catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
          "No se pudo actualizar la sesión."
        );
      }

      if (
        datos.sesion?.id !== sesion.id ||
        datos.sesion.estado !==
        ESTADO_FINAL[accion]
      ) {
        throw new Error(
          "El resultado no se pudo confirmar. Actualiza el calendario antes de reintentar."
        );
      }

      setConfirmacion(null);
      setObservaciones("");

      onActualizada(
        datos.mensaje ??
        "La sesión se actualizó correctamente."
      );
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Ocurrió un error al registrar la asistencia."
      );
    } finally {
      setProcesando(false);
    }
  }

  // ==========================================
  // 7. INTERFAZ
  // ==========================================

  return (
    <article className="min-w-0 rounded-xl bg-white/[0.035] p-4 sm:p-5">
      {/* ENCABEZADO */}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-extrabold tracking-tight text-white sm:text-lg">
            Sesión #{sesion.numeroSesion}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {mostrarFecha(sesion.fechaProgramada)}
            {" · "}
            {mostrarHora(sesion.horaProgramada)}
            {esHoy ? " · Hoy" : ""}
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${estadoVisual.clases}`}
        >
          {estadoVisual.nombre}
        </span>
      </div>

      {/* DURACIÓN REGISTRADA */}

      {sesion.estado === "realizada" &&
        sesion.duracionRealMin !== null && (
          <p className="mt-2 text-xs text-emerald-200">
            Duración registrada:{" "}
            {sesion.duracionRealMin} min
          </p>
        )}

      {/* PLAN NO HABILITADO */}

      {!planHabilitado &&
        (programada || enCurso) && (
          <p className="mt-3 text-xs text-amber-200">
            El estado actual del plan
            no permite registrar asistencia.
          </p>
        )}

      {/* SESIÓN PASADA */}

      {planHabilitado &&
        programada &&
        esPasada && (
          <p className="mt-3 text-xs text-slate-400">
            La fecha ya pasó. Puedes
            registrar la ausencia si
            el cliente no asistió.
          </p>
        )}

      {/* SESIÓN FUTURA */}

      {planHabilitado &&
        programada &&
        !esHoy &&
        !esPasada && (
          <p className="mt-3 text-xs text-slate-400">
            Esta sesión podrá iniciarse
            el día programado.
          </p>
        )}

      {/* BOTONES DE ACCIÓN */}

      {planHabilitado && (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* INICIAR */}

          {programada && esHoy && (
            <button
              type="button"
              disabled={procesando}
              onClick={() =>
                void ejecutar("iniciar")
              }
              className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
            >
              Iniciar sesión
            </button>
          )}

          {/* FINALIZAR */}

          {enCurso && (
            <button
              type="button"
              disabled={procesando}
              onClick={() =>
                abrirConfirmacion(
                  "finalizar"
                )
              }
              className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              Finalizar sesión
            </button>
          )}

          {/* AUSENCIA */}

          {programada && esPasada && (
            <button
              type="button"
              disabled={procesando}
              onClick={() =>
                abrirConfirmacion(
                  "marcar_ausente"
                )
              }
              className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/20 disabled:opacity-50"
            >
              Marcar ausencia
            </button>
          )}

          {/* CANCELACIÓN */}

          {programada &&
            esHoyOFutura && (
              <button
                type="button"
                disabled={procesando}
                onClick={() =>
                  abrirConfirmacion(
                    "cancelar"
                  )
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/[0.04] px-4 py-2.5 text-xs font-bold text-rose-200 transition-[background-color,border-color,transform] duration-200 hover:border-rose-400/40 hover:bg-rose-400/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar sesión
              </button>
            )}
        </div>
      )}

      {/* CONFIRMACIÓN */}

      {confirmacion && (
        <div className="mt-3 space-y-3 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3">
          <p className="text-sm font-semibold text-amber-100">
            {confirmacion === "finalizar"
              ? "¿Confirmas que el entrenamiento terminó?"
              : confirmacion ===
                "marcar_ausente"
                ? "¿Confirmas que el cliente no asistió?"
                : "¿Confirmas la cancelación de esta sesión?"}
          </p>

          {/* OBSERVACIONES */}

          <div>
            <label
              htmlFor={`observaciones-${sesion.id}`}
              className="block text-xs text-slate-300"
            >
              {confirmacion === "cancelar"
                ? "Motivo obligatorio (mínimo 10 caracteres)"
                : "Observaciones (opcional)"}
            </label>

            <textarea
              id={`observaciones-${sesion.id}`}
              rows={2}
              maxLength={1000}
              value={observaciones}
              onChange={(evento) =>
                setObservaciones(
                  evento.target.value
                )
              }
              placeholder={
                confirmacion === "cancelar"
                  ? "Explica por qué se cancela la sesión"
                  : "Observaciones del entrenador"
              }
              className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* CONFIRMAR O VOLVER */}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                procesando ||
                (
                  confirmacion ===
                  "cancelar" &&
                  observaciones.trim()
                    .length < 10
                )
              }
              onClick={() =>
                void ejecutar(
                  confirmacion
                )
              }
              className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {procesando
                ? "Guardando..."
                : "Confirmar acción"}
            </button>

            <button
              type="button"
              disabled={procesando}
              onClick={() => {
                setConfirmacion(null);
                setObservaciones("");
                setError("");
              }}
              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {/* ERRORES */}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 p-2.5 text-xs text-rose-200"
        >
          {error}
        </p>
      )}
    </article>
  );
}
