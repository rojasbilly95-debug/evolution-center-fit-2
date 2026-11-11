
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

// =============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.18.2
// ACEPTAR INVITACIÓN
// CORRECCIÓN NEXT.JS 16 - SUSPENSE
// =============================================

type Parametros = {
  token_hash?: string;
  estado?: string;
};

// =============================================
// ACCIÓN SEGURA DEL SERVIDOR
// =============================================

async function aceptarInvitacion(
  formData: FormData
) {
  "use server";

  const recibido = formData.get("token_hash");

  const tokenHash =
    typeof recibido === "string"
      ? recibido.trim()
      : "";

  if (
    tokenHash.length < 20 ||
    tokenHash.length > 512 ||
    /\s/.test(tokenHash)
  ) {
    redirect(
      "/aceptar-invitacion?estado=invalida"
    );
  }

  const supabase = await createClient();

  // Verificar el enlace de invitación.
  // Supabase crea la sesión autenticada.

  const { error, data } =
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });

  if (
    error ||
    !data.user ||
    !data.session
  ) {
    console.error(
      "Invitación: no se pudo verificar",
      error?.code ?? "sin-sesion"
    );

    redirect(
      "/aceptar-invitacion?estado=invalida"
    );
  }

  // El usuario ya tiene una sesión.
  // Ahora debe establecer su contraseña.

  redirect("/activar-cuenta");
}

// =============================================
// CONTENIDO DINÁMICO
// =============================================

async function ContenidoInvitacion({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  await connection();

  const parametros = await searchParams;

  const tokenHash =
    typeof parametros.token_hash === "string"
      ? parametros.token_hash
      : "";

  const valido =
    tokenHash.length >= 20 &&
    tokenHash.length <= 512 &&
    !/\s/.test(tokenHash);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] px-4 py-10 text-white">

      <section className="w-full max-w-lg rounded-3xl border border-cyan-400/20 bg-[#112039] p-7 shadow-2xl sm:p-10">

        {/* LOGO */}

        <div className="mb-6 flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-[#07121e]">
            E
          </div>

          <div>
            <p className="font-black">
              Evolution Center Fit 2.0
            </p>

            <p className="text-xs text-slate-400">
              Activación de usuarios
            </p>
          </div>

        </div>

        <h1 className="text-3xl font-black">
          Aceptar invitación
        </h1>

        {/* INVITACIÓN VÁLIDA */}

        {valido ? (
          <>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Has recibido una invitación
              para utilizar Evolution Center Fit.

              Al aceptarla, verificaremos el
              enlace y podrás establecer
              tu contraseña personal.
            </p>

            <form
              action={aceptarInvitacion}
              className="mt-7"
            >
              <input
                type="hidden"
                name="token_hash"
                value={tokenHash}
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-400 px-5 py-4 font-black text-[#07121e] transition hover:bg-cyan-300"
              >
                Aceptar y continuar
              </button>
            </form>
          </>
        ) : (

          /* INVITACIÓN INVÁLIDA */

          <>
            <div
              role="alert"
              className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm leading-7 text-amber-100"
            >
              {parametros.estado === "invalida"
                ? "No se pudo verificar la invitación. Es posible que haya caducado o ya se haya utilizado."
                : "No se encontró un enlace de invitación válido."}

              {" "}
              Solicita al administrador una
              nueva invitación.
            </div>

            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-semibold text-cyan-300 hover:underline"
            >
              Volver al inicio de sesión
            </Link>
          </>
        )}

        <p className="mt-6 text-xs leading-6 text-slate-400">
          No compartas este enlace con otras
          personas. Es personal y de un solo uso.
        </p>

      </section>

    </main>
  );
}

// =============================================
// PANTALLA DE CARGA
// =============================================

function CargandoInvitacion() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] px-4 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#112039] p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-400 text-2xl font-black text-[#081525]">
          E
        </div>

        <p className="text-lg font-bold">
          Evolution Center Fit 2.0
        </p>

        <p className="mt-3 text-sm text-slate-400">
          Preparando tu invitación...
        </p>
      </section>
    </main>
  );
}

// =============================================
// PÁGINA PRINCIPAL CON SUSPENSE
// =============================================

export default function AceptarInvitacionPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  return (
    <Suspense fallback={<CargandoInvitacion />}>
      <ContenidoInvitacion
        searchParams={searchParams}
      />
    </Suspense>
  );
}
