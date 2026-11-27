"use client";

import {
  useEffect,
  useState,
} from "react";

type Estado =
  | "pendiente"
  | "incompleto"
  | "desactualizado"
  | "verificado"
  | "requiere_correccion";

const ETIQUETAS: Record<Estado, string> = {
  pendiente:
    "Pendiente de verificación",

  incompleto:
    "Perfil incompleto: debe corregirlo el cliente",

  desactualizado:
    "El cliente cambió su perfil: verificar de nuevo",

  verificado:
    "Perfil verificado por entrenador",

  requiere_correccion:
    "Corrección solicitada al cliente",
};

export default function VerificarPerfil({
  clienteId,
}: {
  clienteId: string;
}) {
  const [estado, setEstado] =
    useState<Estado | null>(null);

  const [
    observaciones,
    setObservaciones,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [ocupado, setOcupado] =
    useState(false);

  // =====================================
  // CONSULTAR ESTADO ACTUAL
  // =====================================

  useEffect(() => {
    let activo = true;

    fetch(
      `/api/entrenador/verificar-perfil?clienteId=${encodeURIComponent(
        clienteId
      )}`,
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
              "No se pudo consultar la verificación."
          );
        }

        if (activo) {
          setEstado(
            datos.estado as Estado
          );

          setObservaciones(
            datos.observaciones ?? ""
          );
        }
      })
      .catch((fallo) => {
        if (activo) {
          setError(
            String(fallo.message)
          );
        }
      });

    return () => {
      activo = false;
    };
  }, [clienteId]);

  // =====================================
  // GUARDAR REVISIÓN
  // =====================================

  async function registrar(
    decision:
      | "verificado"
      | "requiere_correccion"
  ) {
    setError("");
    setOcupado(true);

    try {
      const respuesta = await fetch(
        "/api/entrenador/verificar-perfil",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            clienteId,
            estado: decision,
            observaciones,
          }),
        }
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudo registrar la revisión."
        );
      }

      setEstado(decision);
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "Error de revisión."
      );
    } finally {
      setOcupado(false);
    }
  }

  const puedeRegistrar =
    !ocupado &&
    observaciones.trim().length >= 10;

  // =====================================
  // INTERFAZ
  // =====================================

  return (
    <section className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
        Verificación profesional del perfil
      </h4>

      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
        {estado
          ? ETIQUETAS[estado]
          : "Consultando revisión..."}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
        Confirma con el cliente el lugar real
        de entrenamiento, la disponibilidad
        del equipamiento y las consideraciones.
        Esta revisión se invalida si cambia
        su perfil.
      </p>

      {estado !== null &&
        estado !== "incompleto" && (
          <>
            <label
              htmlFor={`verificacion-${clienteId}`}
              className="mt-3 block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Evidencia de la revisión
              (mínimo 10 caracteres)
            </label>

            <textarea
              id={`verificacion-${clienteId}`}
              maxLength={1000}
              rows={3}
              value={observaciones}
              onChange={(evento) =>
                setObservaciones(
                  evento.target.value
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-white/20 dark:bg-[#0b1729] dark:text-white"
              placeholder="Indica qué verificaste y cómo; no registres diagnósticos médicos."
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!puedeRegistrar}
                onClick={() =>
                  registrar("verificado")
                }
                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50 dark:text-emerald-200"
              >
                Confirmar verificación
              </button>

              <button
                type="button"
                disabled={!puedeRegistrar}
                onClick={() =>
                  registrar(
                    "requiere_correccion"
                  )
                }
                className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50 dark:text-amber-200"
              >
                Solicitar corrección
              </button>
            </div>
          </>
        )}

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}