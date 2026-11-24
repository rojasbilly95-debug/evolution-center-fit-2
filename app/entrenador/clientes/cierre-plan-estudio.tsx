"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Sesion = {
  id: number;
  numeroSesion?: number;
  fechaProgramada?: string | null;
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

const ESTADOS_FINALES = new Set([
  "realizada",
  "ausente",
  "cancelada",
]);

function fechaLima(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function mostrarFecha(fecha: string | null): string {
  if (!fecha) return "Sin fecha definida";

  const partes = fecha.split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estaEnCurso(sesion: Sesion): boolean {
  return (
    sesion.estado === "en_curso" ||
    (sesion.inicioReal != null && sesion.finReal == null)
  );
}

function necesitaResultado(sesion: Sesion): boolean {
  return (
    !ESTADOS_FINALES.has(sesion.estado) ||
    estaEnCurso(sesion)
  );
}

export default function CierrePlanEstudio({
  asignacionId,
}: {
  asignacionId: number;
}) {
  const router = useRouter();

  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [motivo, setMotivo] = useState("");

  const [confirmarFaltantes, setConfirmarFaltantes] =
    useState(false);

  const [cierreCompletado, setCierreCompletado] =
    useState(false);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargar() {
      setCargando(true);
      setDatos(null);
      setError("");
      setMensaje("");
      setCierreCompletado(false);
      setConfirmarFaltantes(false);
      setMotivo("");

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
            resultado.error ??
              "No se pudo consultar el plan."
          );
        }

        if (!controlador.signal.aborted) {
          setDatos(resultado);
        }
      } catch (problema) {
        if (!controlador.signal.aborted) {
          setError(
            problema instanceof Error
              ? problema.message
              : "No se pudo consultar el plan."
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

  const hoy = fechaLima();

  // Todas las sesiones que todavía requieren
  // un resultado definitivo.
  const sesionesSinResolver =
    sesiones.filter(necesitaResultado);

  const sinResolver = sesionesSinResolver.length;

  // Las sesiones iniciadas se muestran por separado.
  const enCurso = sesiones.filter(estaEnCurso).length;

  const pendientesNoIniciadas =
    sesionesSinResolver.filter(
      (sesion) => !estaEnCurso(sesion)
    );

  // Sesiones pasadas que requieren atención.
  const vencidasPendientes =
    pendientesNoIniciadas.filter(
      (sesion) =>
        Boolean(sesion.fechaProgramada) &&
        sesion.fechaProgramada! < hoy
    ).length;

  // Sesiones que corresponden al día actual.
  const sesionesHoy =
    pendientesNoIniciadas.filter(
      (sesion) => sesion.fechaProgramada === hoy
    ).length;

  // Sesiones futuras.
  const sesionesFuturas =
    pendientesNoIniciadas.filter(
      (sesion) =>
        Boolean(sesion.fechaProgramada) &&
        sesion.fechaProgramada! > hoy
    ).length;

  // Registros que no cuentan con fecha válida.
  const sinFecha =
    pendientesNoIniciadas.filter(
      (sesion) => !sesion.fechaProgramada
    ).length;

  const resultadosDefinitivos =
    sesiones.length - sinResolver;

  const vencido = Boolean(
    plan?.fechaFin && plan.fechaFin < hoy
  );

  const estadoPermitido = Boolean(
    plan &&
      ["programada", "activa", "pausada"].includes(
        plan.estado
      )
  );

  const motivoValido =
    motivo.trim().length >= 20 &&
    motivo.trim().length <= 1000;

  const puedeCerrar =
    !cargando &&
    !error &&
    !guardando &&
    !cierreCompletado &&
    vencido &&
    estadoPermitido &&
    sesiones.length > 0 &&
    enCurso === 0 &&
    motivoValido &&
    (sinResolver === 0 || confirmarFaltantes);

  async function cerrarPlan() {
    if (!puedeCerrar) return;

    const textoConfirmacion =
      sinResolver > 0
        ? `Hay ${sinResolver} sesiones sin resultado definitivo. ` +
          "El plan se cerrará sin convertirlas en ausencias. " +
          "No podrás registrar nuevas evidencias en este plan. " +
          "¿Confirmas que revisaste los registros?"
        : "¿Confirmas que deseas finalizar este plan?";

    const aceptado = window.confirm(textoConfirmacion);

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
          resultado.error ??
            "No se pudo cerrar el plan."
        );
      }

      setCierreCompletado(true);

      setMensaje(
        "El plan se cerró correctamente. El cierre quedó registrado."
      );

      router.refresh();
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No se pudo finalizar el plan."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section
      className="
        mt-8 rounded-2xl border
        border-amber-300/60
        bg-[var(--ecf-surface,#ffffff)]
        p-5 text-[var(--ecf-text,#102238)]
        dark:border-amber-400/20
        dark:bg-slate-900 dark:text-white
        sm:p-6
      "
      aria-labelledby="titulo-cierre-plan"
    >
      {/* ENCABEZADO */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">
            Investigación · Cierre supervisado
          </p>

          <h2
            id="titulo-cierre-plan"
            className="mt-2 text-xl font-black sm:text-2xl"
          >
            Revisión y cierre del plan
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Consulta los resultados pendientes antes de
            finalizar el entrenamiento. Los registros
            faltantes nunca se convierten automáticamente
            en ausencias.
          </p>
        </div>

        <span
          className="
            rounded-full border border-cyan-400/25
            bg-cyan-400/10 px-3 py-1.5
            text-xs font-semibold text-cyan-800
            dark:text-cyan-200
          "
        >
          {cargando
            ? "Consultando..."
            : cierreCompletado
              ? "Cierre completado"
              : vencido
                ? "Periodo vencido"
                : "Plan vigente"}
        </span>
      </div>

      {cargando ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-slate-200 p-5 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300"
        >
          Consultando el estado de las sesiones...
        </div>
      ) : plan ? (
        <div className="mt-6 space-y-5">
          {/* INDICADORES */}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sesiones del plan
              </p>

              <p className="mt-2 text-3xl font-black">
                {sesiones.length}
              </p>
            </div>

            <div className="rounded-xl border border-amber-300/40 bg-amber-50 p-4 dark:bg-amber-400/10">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Vencidas pendientes
              </p>

              <p className="mt-2 text-3xl font-black text-amber-800 dark:text-amber-300">
                {vencidasPendientes}
              </p>

              <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                Requieren revisión
              </p>
            </div>

            <div className="rounded-xl border border-cyan-300/40 bg-cyan-50 p-4 dark:bg-cyan-400/10">
              <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-200">
                Programadas hoy
              </p>

              <p className="mt-2 text-3xl font-black text-cyan-800 dark:text-cyan-300">
                {sesionesHoy}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Próximas
              </p>

              <p className="mt-2 text-3xl font-black">
                {sesionesFuturas}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Todavía no vencidas
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                En curso
              </p>

              <p className="mt-2 text-3xl font-black">
                {enCurso}
              </p>
            </div>
          </div>

          {/* ESTADO GENERAL */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">
                  Estado de los registros
                </h3>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Resultados confirmados y pendientes del plan.
                </p>
              </div>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                {sinResolver} sin resultado definitivo
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <p>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {resultadosDefinitivos}
                </span>{" "}
                con resultado definitivo
              </p>

              <p>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  {sinResolver}
                </span>{" "}
                por resolver
              </p>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              El total sin resolver incluye sesiones vencidas,
              actuales, futuras y en curso. Solo las vencidas
              requieren revisión por fecha.
            </p>

            {sinFecha > 0 && (
              <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                Atención: {sinFecha} sesión(es) sin fecha
                programada requieren revisión.
              </p>
            )}
          </div>

          {/* ACCIÓN PRIORITARIA */}

          {vencidasPendientes > 0 && !cierreCompletado && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-4 dark:bg-amber-400/10">
              <h3 className="font-bold text-amber-900 dark:text-amber-200">
                Tienes sesiones vencidas por revisar
              </h3>

              <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100">
                Comprueba qué ocurrió en cada sesión.
                Registra una ausencia únicamente cuando
                esté confirmada. Si falta evidencia,
                conserva el registro pendiente.
              </p>

              <a
                href="#listado-sesiones"
                className="
                  mt-3 inline-flex rounded-lg
                  border border-amber-500/40
                  bg-white px-4 py-2.5
                  text-sm font-bold text-amber-900
                  hover:bg-amber-100
                  focus-visible:outline-2
                  focus-visible:outline-offset-2
                  focus-visible:outline-amber-500
                  dark:bg-slate-900 dark:text-amber-200
                "
              >
                Revisar sesiones del entrenamiento
              </a>
            </div>
          )}

          {/* ESTADO DEL CIERRE */}

          {cierreCompletado ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-400/40 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-200"
            >
              El plan ha sido finalizado.
            </div>
          ) : !vencido ? (
            <div className="rounded-xl border border-cyan-300/60 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
              <h3 className="font-bold text-cyan-900 dark:text-cyan-200">
                Este plan todavía está vigente
              </h3>

              <p className="mt-2 text-sm leading-6 text-cyan-800 dark:text-cyan-200">
                El cierre supervisado estará disponible
                después del{" "}
                <strong>
                  {mostrarFecha(plan.fechaFin)}
                </strong>
                .
              </p>
            </div>
          ) : !estadoPermitido ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-slate-950">
              Este plan no permite un nuevo cierre en
              su estado actual.
            </div>
          ) : (
            <div className="space-y-5 rounded-xl border border-slate-200 p-4 dark:border-white/10 sm:p-5">
              <div>
                <h3 className="text-lg font-black">
                  Confirmar cierre supervisado
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Antes de finalizar, revisa los resultados
                  y escribe una justificación. Esta acción
                  quedará registrada.
                </p>
              </div>

              {enCurso > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"
                >
                  Hay {enCurso} sesión(es) en curso.
                  Deben finalizarse antes de cerrar el plan.
                </div>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-semibold">
                  Justificación del cierre
                </span>

                <textarea
                  value={motivo}
                  onChange={(evento) =>
                    setMotivo(evento.target.value)
                  }
                  maxLength={1000}
                  rows={4}
                  placeholder="Describe qué registros revisaste y por qué corresponde cerrar el plan."
                  className="
                    w-full rounded-lg border
                    border-slate-300 bg-white p-3
                    text-sm text-slate-900
                    placeholder:text-slate-500
                    focus:border-cyan-500
                    focus:outline-none
                    focus:ring-2 focus:ring-cyan-500/20
                    dark:border-white/20
                    dark:bg-slate-950
                    dark:text-white
                  "
                />

                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {motivo.trim().length} / 1000 caracteres.
                  Mínimo requerido: 20.
                </span>
              </label>

              {sinResolver > 0 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-50 p-4 dark:bg-amber-400/10">
                  <input
                    type="checkbox"
                    checked={confirmarFaltantes}
                    onChange={(evento) =>
                      setConfirmarFaltantes(
                        evento.target.checked
                      )
                    }
                    className="mt-1 accent-amber-500"
                  />

                  <span className="text-sm leading-6 text-slate-800 dark:text-slate-200">
                    Confirmo que revisé las{" "}
                    <strong>
                      {sinResolver} sesiones sin resultado
                      definitivo
                    </strong>
                    . Acepto que permanezcan como datos
                    faltantes, sin registrarlas
                    automáticamente como ausencias.
                  </span>
                </label>
              )}

              <button
                type="button"
                disabled={!puedeCerrar}
                onClick={() => void cerrarPlan()}
                className="
                  w-full rounded-lg bg-amber-400
                  px-4 py-3 text-sm font-black
                  text-slate-950 transition-colors
                  hover:bg-amber-300
                  focus-visible:outline-2
                  focus-visible:outline-offset-2
                  focus-visible:outline-amber-500
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                {guardando
                  ? "Finalizando plan..."
                  : "Finalizar plan supervisado"}
              </button>

              {!puedeCerrar && enCurso === 0 && (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Completa la justificación y confirma
                  los registros faltantes para habilitar
                  el cierre.
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-400/40 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-400/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {mensaje && (
        <p
          role="status"
          className="mt-5 rounded-lg border border-emerald-400/40 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
        >
          {mensaje}
        </p>
      )}
    </section>
  );
}