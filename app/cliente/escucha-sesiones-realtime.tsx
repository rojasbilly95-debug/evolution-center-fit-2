
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  asignacionId: number;
};

type EstadoConexion =
  | "conectando"
  | "conectado"
  | "desconectado";

export default function EscuchaSesionesRealtime({
  asignacionId,
}: Props) {
  const router = useRouter();

  const [estado, setEstado] =
    useState<EstadoConexion>("conectando");

  useEffect(() => {
    if (!Number.isInteger(asignacionId) ||
        asignacionId <= 0) {
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    let pendiente:
      ReturnType<typeof setTimeout> | undefined;

    let conectadoAntes = false;

    // Refresca los datos del servidor,
    // sin volver a cargar toda la página.
    function actualizarDatos() {
      if (pendiente) {
        clearTimeout(pendiente);
      }

      pendiente = setTimeout(() => {
        router.refresh();
      }, 350);
    }

    // Recuperar datos al regresar a la pestaña.
    function revisarVisibilidad() {
      if (document.visibilityState === "visible") {
        actualizarDatos();
      }
    }

    const canal = supabase
      .channel(
        `ecf-sesiones-${asignacionId}`
      )

      // Nueva sesión programada.
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sesiones_entrenamiento",
          filter: `asignacion_id=eq.${asignacionId}`,
        },
        actualizarDatos
      )

      // Cambio de horario o estado.
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sesiones_entrenamiento",
          filter: `asignacion_id=eq.${asignacionId}`,
        },
        actualizarDatos
      )

      .subscribe((estadoCanal) => {
        if (estadoCanal === "SUBSCRIBED") {
          setEstado("conectado");

          // Recuperar cambios después de una reconexión.
          if (conectadoAntes) {
            actualizarDatos();
          }

          conectadoAntes = true;
        }

        if (
          estadoCanal === "CHANNEL_ERROR" ||
          estadoCanal === "TIMED_OUT" ||
          estadoCanal === "CLOSED"
        ) {
          setEstado("desconectado");
        }
      });

    document.addEventListener(
      "visibilitychange",
      revisarVisibilidad
    );

    return () => {
      if (pendiente) {
        clearTimeout(pendiente);
      }

      document.removeEventListener(
        "visibilitychange",
        revisarVisibilidad
      );

      void supabase.removeChannel(canal);
    };
  }, [asignacionId, router]);

  const conectado = estado === "conectado";

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${
          conectado
            ? "bg-emerald-500"
            : estado === "conectando"
              ? "bg-amber-400"
              : "bg-rose-500"
        }`}
      />

      <span>
        {conectado
          ? "Actualizaciones en tiempo real activas"
          : estado === "conectando"
            ? "Conectando con las sesiones..."
            : "Sin conexión en tiempo real"}
      </span>
    </div>
  );
}
