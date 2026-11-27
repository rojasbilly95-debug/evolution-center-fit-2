"use client";

import { useState } from "react";

type Props = {
  nombre: string;
  fotoUrl?: string | null;
};

export default function FotoCliente({
  nombre,
  fotoUrl,
}: Props) {
  const [urlFallida, setUrlFallida] = useState<
    string | null
  >(null);

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
    <div
      className="
        relative flex h-16 w-16
        shrink-0 items-center justify-center
        overflow-hidden rounded-2xl
        border border-cyan-400/30
        bg-gradient-to-br
        from-cyan-400/20 to-blue-500/10
        text-xl font-black
        text-cyan-800 dark:text-cyan-200
        sm:h-20 sm:w-20
      "
    >
      {mostrarFoto && fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fotoUrl}
          alt={`Fotografía de ${nombre}`}
          className="h-full w-full object-cover"
          onError={() => setUrlFallida(fotoUrl)}
        />
      ) : (
        <span aria-label={`Iniciales de ${nombre}`}>
          {iniciales}
        </span>
      )}
    </div>
  );
}