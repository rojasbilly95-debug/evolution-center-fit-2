"use client";

import { useEffect, useState } from "react";

type Props = {
  nombre: string;
  fotoUrl?: string | null;
  compacto?: boolean;
};

export default function FotoCliente({
  nombre,
  fotoUrl,
  compacto = false,
}: Props) {
  const [urlFallida, setUrlFallida] =
    useState<string | null>(null);

  const [sobreFoto, setSobreFoto] = useState(false);
  const [fotoAbierta, setFotoAbierta] = useState(false);

  useEffect(() => {
    if (!fotoAbierta) return;

    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        evento.stopPropagation();
        setFotoAbierta(false);
      }
    }

    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        cerrarConEscape
      );
    };
  }, [fotoAbierta]);

  const iniciales =
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0] ?? "")
      .join("")
      .toUpperCase() || "CL";

  const mostrarFoto =
    Boolean(fotoUrl) && fotoUrl !== urlFallida;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={!mostrarFoto}
        aria-label={
          mostrarFoto
            ? `Ampliar fotografía de ${nombre}`
            : `Sin fotografía de ${nombre}`
        }
        aria-expanded={
          mostrarFoto ? fotoAbierta : undefined
        }
        title={
          mostrarFoto
            ? "Pasa el mouse o toca para ampliar"
            : undefined
        }
        onPointerEnter={(evento) => {
          if (evento.pointerType === "mouse") {
            setSobreFoto(true);
          }
        }}
        onPointerLeave={() => setSobreFoto(false)}
        onClick={() =>
          setFotoAbierta((abierta) => !abierta)
        }
        className={`group/foto flex shrink-0 items-center justify-center overflow-hidden border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 ${
          compacto
            ? "h-12 w-12 rounded-full text-sm text-cyan-200"
            : "h-16 w-16 rounded-2xl text-xl text-cyan-800 dark:text-cyan-200 sm:h-20 sm:w-20"
        } ${
          mostrarFoto
            ? "cursor-zoom-in"
            : "cursor-default"
        }`}
      >
        {mostrarFoto && fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover/foto:scale-110"
            onError={() => setUrlFallida(fotoUrl)}
          />
        ) : (
          <span aria-hidden="true">
            {iniciales}
          </span>
        )}
      </button>

      {mostrarFoto &&
        fotoUrl &&
        (sobreFoto || fotoAbierta) && (
          <div
            role={fotoAbierta ? "dialog" : undefined}
            aria-modal={
              fotoAbierta || undefined
            }
            aria-label={
              fotoAbierta
                ? `Fotografía ampliada de ${nombre}`
                : undefined
            }
            onClick={
              fotoAbierta
                ? () => setFotoAbierta(false)
                : undefined
            }
            className={`fixed inset-0 z-[110] flex items-center justify-center p-4 ${
              fotoAbierta
                ? "cursor-zoom-out bg-black/80"
                : "pointer-events-none bg-black/35"
            }`}
          >
            <div className="relative w-full max-w-[520px] rounded-2xl border border-white/25 bg-[#091322] p-2 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl}
                alt={`Fotografía de ${nombre} ampliada`}
                referrerPolicy="no-referrer"
                className="max-h-[75dvh] w-full rounded-xl object-contain"
                onError={() =>
                  setUrlFallida(fotoUrl)
                }
              />

              {fotoAbierta && (
                <button
                  type="button"
                  onClick={() =>
                    setFotoAbierta(false)
                  }
                  className="absolute right-4 top-4 rounded-lg bg-slate-950/85 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  Cerrar ✕
                </button>
              )}
            </div>
          </div>
        )}
    </div>
  );
}