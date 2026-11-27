"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  SesionResumen,
} from "./control-asistencia";

type Lugar =
  | "casa"
  | "gimnasio";

type EstadoEvidencia =
  | "pendiente"
  | "declarada"
  | "verificada";

type Evidencia = {
  lugar: Lugar;
  estado_verificacion: EstadoEvidencia;
  fuente_verificacion: string | null;
  observaciones: string | null;
};

type Props = {
  sesion: SesionResumen;
};

export default function UbicacionSesion({
  sesion,
}: Props) {
  const [abierto, setAbierto] =
    useState(false);

  const [evidencia, setEvidencia] =
    useState<Evidencia | null>(null);

  const [lugar, setLugar] =
    useState<Lugar>("gimnasio");

  const [estado, setEstado] =
    useState<EstadoEvidencia>("pendiente");

  const [fuente, setFuente] =
    useState("registro_cliente");

  const [
    observaciones,
    setObservaciones,
  ] = useState("");

  const [cargando, setCargando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  // =====================================
  // CONSULTAR EVIDENCIA EXISTENTE
  // =====================================

  useEffect(() => {
    let activo = true;

    fetch(
      `/api/sesiones/ubicacion?sesionId=${sesion.id}`,
      {
        cache: "no-store",
      }
    )
      .then(async (respuesta) => {
        const datos =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error ??
              "No se pudo consultar la ubicación."
          );
        }

        if (
          activo &&
          datos.evidencia
        ) {
          const item =
            datos.evidencia as Evidencia;

          setEvidencia(item);
          setLugar(item.lugar);
          setEstado(
            item.estado_verificacion
          );

          setFuente(
            item.fuente_verificacion ??
              "registro_cliente"
          );

          setObservaciones(
            item.observaciones ?? ""
          );
        }
      })
      .catch((fallo) => {
        if (activo) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo consultar la evidencia."
          );
        }
      });

    return () => {
      activo = false;
    };
  }, [sesion.id]);

  // =====================================
  // GUARDAR INFORMACIÓN
  // =====================================

  async function guardar() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(
        "/api/sesiones/ubicacion",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            sesionId: sesion.id,
            lugar,
            estado_verificacion: estado,

            fuente_verificacion:
              estado === "pendiente"
                ? null
                : fuente,

            observaciones,
          }),
        }
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudo guardar la evidencia."
        );
      }

      setMensaje(
        datos.mensaje ??
          "Información registrada."
      );

      setEvidencia({
        lugar,
        estado_verificacion: estado,

        fuente_verificacion:
          estado === "pendiente"
            ? null
            : fuente,

        observaciones,
      });
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo guardar."
      );
    } finally {
      setCargando(false);
    }
  }

  // =====================================
  // RESTRICCIONES DE LA INTERFAZ
  // =====================================

  const bloqueado =
    evidencia?.estado_verificacion ===
    "verificada";

  const puedeVerificar =
    sesion.estado === "realizada";

  const fuenteValida =
    estado !== "verificada" ||
    fuente === "presencial" ||
    fuente === "videollamada_consentida";

  const observacionesValidas =
    estado === "pendiente" ||
    observaciones.trim().length >= 10;

  const puedeGuardar =
    !cargando &&
    !bloqueado &&
    fuenteValida &&
    observacionesValidas;

  // =====================================
  // INTERFAZ
  // =====================================

  return (
    <section className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 text-left text-xs font-bold text-cyan-800 dark:text-cyan-200"
      >
        <span>
          Ubicación y evidencia de la sesión
        </span>

        <span>
          {evidencia
            ? `${evidencia.lugar} · ${evidencia.estado_verificacion}`
            : "Sin declarar"}

          {abierto ? " −" : " +"}
        </span>
      </button>

      {abierto && (
        <div className="mt-3 space-y-3 border-t border-cyan-400/10 pt-3 text-xs text-slate-700 dark:text-slate-200">
          <p className="leading-5">
            La ubicación debe permitir realizar
            todos los ejercicios con el
            equipamiento declarado.
            Registrar un lugar no equivale
            a verificar la asistencia.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* LUGAR */}

            <label className="grid gap-1">
              <span className="font-semibold">
                Lugar de entrenamiento
              </span>

              <select
                value={lugar}
                disabled={
                  bloqueado ||
                  (
                    evidencia !== null &&
                    sesion.estado !== "programada"
                  )
                }
                onChange={(evento) => {
                  setLugar(
                    evento.target.value as Lugar
                  );
                }}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-white/15 dark:bg-[#0b1729] dark:text-white"
              >
                <option value="gimnasio">
                  Gimnasio
                </option>

                <option value="casa">
                  Casa
                </option>
              </select>
            </label>

            {/* ESTADO */}

            <label className="grid gap-1">
              <span className="font-semibold">
                Estado de evidencia
              </span>

              <select
                value={estado}
                disabled={bloqueado}
                onChange={(evento) => {
                  const nuevoEstado =
                    evento.target.value as EstadoEvidencia;

                  setEstado(nuevoEstado);

                  if (
                    nuevoEstado === "verificada" &&
                    fuente !== "presencial" &&
                    fuente !== "videollamada_consentida"
                  ) {
                    setFuente("presencial");
                  }
                }}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-white/15 dark:bg-[#0b1729] dark:text-white"
              >
                <option value="pendiente">
                  Pendiente
                </option>

                <option value="declarada">
                  Declarada (sin comprobar)
                </option>

                <option
                  value="verificada"
                  disabled={!puedeVerificar}
                >
                  Verificada
                </option>
              </select>
            </label>
          </div>

          {/* FUENTE */}

          {estado !== "pendiente" && (
            <label className="grid gap-1">
              <span className="font-semibold">
                Fuente de información
              </span>

              <select
                value={fuente}
                disabled={bloqueado}
                onChange={(evento) => {
                  setFuente(
                    evento.target.value
                  );
                }}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-white/15 dark:bg-[#0b1729] dark:text-white"
              >
                <option value="registro_cliente">
                  Declaración del cliente
                </option>

                <option value="entrevista">
                  Entrevista
                </option>

                <option value="presencial">
                  Observación presencial
                </option>

                <option value="videollamada_consentida">
                  Videollamada consentida
                </option>
              </select>
            </label>
          )}

          {/* OBSERVACIONES */}

          <label className="grid gap-1">
            <span className="font-semibold">
              Observaciones del entrenador
            </span>

            <textarea
              rows={3}
              maxLength={1000}
              disabled={bloqueado}
              value={observaciones}
              onChange={(evento) => {
                setObservaciones(
                  evento.target.value
                );
              }}
              placeholder="Describe qué ocurrió y cómo se comprobó, sin registrar información sensible innecesaria."
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-white/15 dark:bg-[#0b1729] dark:text-white"
            />

            <span className="text-right text-[11px] text-slate-500">
              {observaciones.length}/1000
            </span>
          </label>

          {/* ADVERTENCIAS */}

          {estado === "verificada" && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-800 dark:text-amber-200">
              Solo una sesión finalizada como
              realizada puede verificarse.

              Se requiere observación presencial
              o videollamada consentida y una
              descripción de la comprobación.
            </p>
          )}

          {estado === "declarada" && (
            <p className="rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sky-800 dark:text-sky-200">
              Esta información quedará registrada
              como declaración, no como
              evidencia verificada.
            </p>
          )}

          {/* GUARDAR */}

          {!bloqueado && (
            <button
              type="button"
              disabled={!puedeGuardar}
              onClick={guardar}
              className="rounded-lg bg-cyan-400 px-4 py-2 font-bold text-[#07121e] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando
                ? "Guardando..."
                : "Guardar lugar y evidencia"}
            </button>
          )}

          {/* EVIDENCIA BLOQUEADA */}

          {bloqueado && (
            <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-800 dark:text-emerald-200">
              La evidencia verificada queda
              protegida para conservar el
              historial de la investigación.
            </p>
          )}

          {/* MENSAJES */}

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-rose-500/10 p-3 text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          )}

          {mensaje && (
            <p
              role="status"
              className="rounded-lg bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-200"
            >
              {mensaje}
            </p>
          )}
        </div>
      )}
    </section>
  );
}