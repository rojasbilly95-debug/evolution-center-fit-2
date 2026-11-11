
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

// ============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.18.2
// RECEPCION DE INVITACIONES SUPABASE
// ============================================

export default function RecibirInvitacionPage() {
  const router = useRouter();

  const procesando = useRef(false);

  const [mensaje, setMensaje] = useState(
    "Estamos verificando tu invitación..."
  );

  const [error, setError] = useState(false);

  useEffect(() => {
    // Evitar procesar dos veces un enlace
    // en desarrollo con React Strict Mode.

    if (procesando.current) {
      return;
    }

    procesando.current = true;

    async function recibirInvitacion() {
      try {
        const url = new URL(
          window.location.href
        );

        const fragmento =
          new URLSearchParams(
            window.location.hash.slice(1)
          );

        const accessToken =
          fragmento.get("access_token");

        const refreshToken =
          fragmento.get("refresh_token");

        const codigo =
          url.searchParams.get("code");

        const errorEnlace =
          fragmento.get("error") ||
          url.searchParams.get("error");

        const tipo =
          fragmento.get("type");

        // Limpiar los datos sensibles
        // de la dirección del navegador.

        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname
        );

        if (
          errorEnlace ||
          (tipo && tipo !== "invite")
        ) {
          setError(true);
          setMensaje(
            "El enlace de invitación no es válido o ha caducado."
          );
          return;
        }

        if (
          !(accessToken && refreshToken) &&
          !codigo
        ) {
          setError(true);
          setMensaje(
            "No encontramos los datos de la invitación. Abre el enlace recibido por correo."
          );
          return;
        }

        const supabase = createClient();

        // Supabase puede entregar una sesión
        // mediante tokens o un código PKCE.

        if (accessToken && refreshToken) {
          const resultado =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (resultado.error) {
            throw new Error(
              "No se pudo establecer la sesión."
            );
          }
        } else if (codigo) {
          const resultado =
            await supabase.auth.exchangeCodeForSession(
              codigo
            );

          if (resultado.error) {
            throw new Error(
              "No se pudo intercambiar el código."
            );
          }
        }

        // Comprobar identidad real.

        const {
          data,
          error: errorUsuario,
        } = await supabase.auth.getUser();

        if (errorUsuario || !data.user) {
          throw new Error(
            "No se pudo verificar el usuario."
          );
        }

        setMensaje(
          "Invitación verificada. Preparando la activación..."
        );

        // Continuar con la contraseña inicial.

        router.replace("/activar-cuenta");
        router.refresh();

      } catch (errorDesconocido) {
        console.error(
          "Error al procesar la invitación:",
          errorDesconocido instanceof Error
            ? errorDesconocido.name
            : "desconocido"
        );

        setError(true);

        setMensaje(
          "No pudimos completar la invitación. Solicita al administrador un nuevo enlace."
        );
      }
    }

    void recibirInvitacion();

  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] px-4 py-10 text-white">

      <section className="w-full max-w-lg rounded-3xl border border-cyan-400/20 bg-[#112039] p-8 text-center shadow-2xl">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400 text-3xl font-black text-[#081525]">
          E
        </div>

        <h1 className="mt-6 text-2xl font-black">
          Evolution Center Fit 2.0
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Activación de cuenta
        </p>

        <div
          role="status"
          className={`mt-7 rounded-xl border p-5 text-sm leading-7 ${
            error
              ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
              : "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
          }`}
        >
          {mensaje}
        </div>

        {error && (
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-cyan-200 hover:bg-white/10"
          >
            Volver al inicio de sesión
          </Link>
        )}

        <p className="mt-7 text-xs leading-6 text-slate-400">
          Tu acceso está protegido
          mediante Supabase Auth.
        </p>

      </section>
    </main>
  );
}
