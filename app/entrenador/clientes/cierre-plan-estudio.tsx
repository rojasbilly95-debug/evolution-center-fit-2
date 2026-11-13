"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Sesion = {
  id: number;
  estado: string;
  inicioReal?: string | null;
  finReal?: string | null;
};

type Plan = {
  estado: string;
  fechaFin: string | null;
};

type Respuesta = {
  plan?: Plan;
  sesiones?: Sesion[];
  error?: string;
};

function fechaLima() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export default function CierrePlanEstudio({
  asignacionId,
}: {
  asignacionId: number;
}) {
  const router = useRouter();

  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [motivo, setMotivo] = useState("");
  const [confirmarFaltantes, setConfirmarFaltantes] =
    useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const controlador = new AbortController();

    async function cargar() {
      try {
        const respuesta = await fetch(
          `/api/sesiones/programar?asignacionId=${asignacionId}`,
          {
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        const resultado: Respuesta = await respuesta.json();

        if (!respuesta.ok || !resultado.plan) {
          throw new Error(
            resultado.error ?? "No se pudo consultar el plan."
          );
        }

        if (!controlador.signal.aborted) {
          setDatos(resultado);
          setError("");
        }
      } catch (problema) {
        if (!controlador.signal.aborted) {
          setError(
            problema instanceof Error
              ? problema.message
              : "Error de consulta."
          );
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => controlador.abort();
  }, [asignacionId]);

  const plan = datos?.plan;
  const sesiones = datos?.sesiones ?? [];

  const estadosFinales = [
    "realizada",
    "ausente",
    "cancelada",
  ];

  const sinResolver = sesiones.filter(
    (sesion) =>
      !estadosFinales.includes(sesion.estado) ||
      (sesion.inicioReal != null &&
        sesion.finReal == null)
  ).length;

  const enCurso = sesiones.filter(
    (sesion) =>
      sesion.estado === "en_curso" ||
      (sesion.inicioReal != null &&
        sesion.finReal == null)
  ).length;

const vencido = Boolean(
  plan?.fechaFin && plan.fechaFin < fechaLima()
);

  const estadoPermitido = Boolean(
    plan &&
      ["programada", "activa", "pausada"].includes(
        plan.estado
      )
  );

  const puedeCerrar =
    !cargando &&
    !error &&
    !guardando &&
    vencido &&
    estadoPermitido &&
    sesiones.length > 0 &&
    enCurso === 0 &&
    motivo.trim().length >= 20 &&
    motivo.trim().length <= 1000 &&
    (sinResolver === 0 || confirmarFaltantes);

  async function cerrarPlan() {
    if (!puedeCerrar) return;

    const aceptado = window.confirm(
      sinResolver > 0
        ? `Hay ${sinResolver} sesiones sin resolver. ` +
          "El plan se cerrará sin convertirlas en ausencias. " +
          "No podrás registrar nuevas evidencias en este plan. " +
          "¿Confirmas que revisaste los registros?"
        : "¿Confirmas que deseas finalizar este plan?"
    );

    if (!aceptado) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(
        "/api/investigacion/cerrar-plan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            asignacionId,
            motivo: motivo.trim(),
            confirmarFaltantes,
          }),
        }
      );

      const resultado = (await respuesta.json()) as {
        error?: string;
        mensaje?: string;
      };

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ?? "No se pudo cerrar el plan."
        );
      }

      setMensaje("Plan finalizado y cierre registrado.");
      router.refresh();
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Error al cerrar el plan."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-amber-300/60 bg-[var(--ecf-surface,#ffffff)] p-6 text-[var(--ecf-text,#102238)] dark:border-amber-400/20 dark:bg-slate-900 dark:text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">
        Investigación · Cierre supervisado
      </p>

      <h2 className="mt-2 text-xl font-black">
        Revisión y cierre del plan
      </h2>

      <p className="mt-2 text-sm leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
        Revisa el estado de las sesiones antes de finalizar
        un plan vencido. Los registros faltantes no se
        convertirán automáticamente en ausencias.
      </p>

      {cargando ? (
        <p className="mt-5 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
          Consultando sesiones...
        </p>
      ) : plan ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--ecf-border,#dce5ee)] bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
              <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                Sesiones totales
              </p>
              <p className="mt-1 text-2xl font-bold">
                {sesiones.length}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--ecf-border,#dce5ee)] bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
              <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                Sin resolver
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">
                {sinResolver}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--ecf-border,#dce5ee)] bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
              <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                En curso
              </p>
              <p className="mt-1 text-2xl font-bold">
                {enCurso}
              </p>
            </div>
          </div>

          {!vencido ? (
            <p className="rounded-lg border border-cyan-300/60 bg-cyan-50 p-4 text-sm text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
              Este plan todavía no ha vencido.
              El cierre se habilitará después del{" "}
              {plan.fechaFin ?? "fin del periodo"}.
            </p>
          ) : !estadoPermitido ? (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Este plan ya está cerrado.
            </p>
          ) : (
            <>
              {enCurso > 0 && (
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  Hay sesiones iniciadas que deben resolverse
                  antes de cerrar este plan.
                </p>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-semibold">
                  Justificación del cierre
                </span>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  className="w-full rounded-lg border border-[var(--ecf-border,#dce5ee)] bg-white p-3 text-sm text-[var(--ecf-text,#102238)] placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-white/20 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="Describe las evidencias revisadas y el motivo del cierre (mínimo 20 caracteres)."
                />
              </label>

              {sinResolver > 0 && (
                <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={confirmarFaltantes}
                    onChange={(e) =>
                      setConfirmarFaltantes(e.target.checked)
                    }
                    className="mt-1 accent-amber-500"
                  />
                  Confirmo que revisé las sesiones pendientes
                  y acepto que permanecerán como datos
                  faltantes, sin registrarlas como ausencias.
                </label>
              )}

              <button
                type="button"
                disabled={!puedeCerrar}
                onClick={() => void cerrarPlan()}
                className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando
                  ? "Cerrando plan..."
                  : "Finalizar plan supervisado"}
              </button>
            </>
          )}
        </div>
      ) : null}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {mensaje && (
        <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">
          {mensaje}
        </p>
      )}
    </section>
  );
}
