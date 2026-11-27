"use client";

import { useEffect, useState } from "react";

type Estado =
  | "pendiente"
  | "incompleto"
  | "desactualizado"
  | "verificado"
  | "requiere_correccion";

const ETIQUETAS: Record<Estado, string> = {
  pendiente: "Pendiente de verificación",
  incompleto: "Perfil incompleto: debe corregirlo el cliente",
  desactualizado: "El cliente cambió su perfil: verificar de nuevo",
  verificado: "Perfil verificado por entrenador",
  requiere_correccion: "Corrección solicitada al cliente",
};

export default function VerificarPerfil({
  clienteId,
}: {
  clienteId: string;
}) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let activo = true;

    fetch(
      `/api/entrenador/verificar-perfil?clienteId=${encodeURIComponent(
        clienteId
      )}`,
      { cache: "no-store" }
    )
      .then(async (respuesta) => {
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error ?? "No se pudo consultar la verificación."
          );
        }

        if (activo) {
          setEstado(datos.estado as Estado);
          setObservaciones(datos.observaciones ?? "");
        }
      })
      .catch((fallo) => {
        if (activo) {
          setError(String(fallo.message));
        }
      });

    return () => {
      activo = false;
    };
  }, [clienteId]);

  async function registrar(
    decision: "verificado" | "requiere_correccion"
  ) {
    setError("");
    setOcupado(true);

    try {
      const respuesta = await fetch(
        "/api/entrenador/verificar-perfil",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clienteId,
            estado: decision,
            observaciones,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ?? "No se pudo registrar la revisión."
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
    !ocupado && observaciones.trim().length >= 10;

  return (
    <section className="mt-4 rounded-xl border border-cyan-400/30 bg-[#102840] p-4 text-white shadow-sm">
      <h4 className="text-base font-bold text-white">
        Verificación profesional del perfil
      </h4>

      <p className="mt-1 text-sm font-semibold text-cyan-200">
        {estado
          ? ETIQUETAS[estado]
          : "Consultando revisión..."}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-200">
        Confirma con el cliente el lugar real de entrenamiento,
        la disponibilidad del equipamiento y las
        consideraciones. Esta revisión se invalida si
        cambia su perfil.
      </p>

      {estado !== null && estado !== "incompleto" && (
        <>
          <label
            htmlFor={`verificacion-${clienteId}`}
            className="mt-3 block text-sm font-bold text-white"
          >
            Evidencia de la revisión (mínimo 10 caracteres)
          </label>

          <textarea
            id={`verificacion-${clienteId}`}
            maxLength={1000}
            rows={4}
            value={observaciones}
            onChange={(evento) =>
              setObservaciones(evento.target.value)
            }
            className="mt-2 w-full resize-y rounded-lg border border-white/25 bg-[#071626] p-3 text-sm leading-6 text-white caret-cyan-300 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
            placeholder="Indica qué verificaste y cómo; no registres diagnósticos médicos."
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!puedeRegistrar}
              onClick={() => registrar("verificado")}
              className="min-h-10 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Confirmar verificación
            </button>

            <button
              type="button"
              disabled={!puedeRegistrar}
              onClick={() =>
                registrar("requiere_correccion")
              }
              className="min-h-10 rounded-lg border border-amber-300 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100 transition-colors hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Solicitar corrección
            </button>
          </div>
        </>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
    </section>
  );
}