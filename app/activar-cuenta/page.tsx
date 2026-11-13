import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

// =============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.18.2
// ESTABLECER CONTRASEÑA INICIAL
// =============================================

type Parametros = {
  estado?: string;
};

async function establecerContrasena(
  formData: FormData
) {
  "use server";

  const supabase = await createClient();

  // Verificar identidad antes de
  // permitir cambiar la contraseña.

  const {
    data: identidad,
    error: errorIdentidad,
  } = await supabase.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    redirect("/login");
  }

  const nueva = formData.get("contrasena");
  const repetida = formData.get("confirmar");

  if (
    typeof nueva !== "string" ||
    typeof repetida !== "string" ||
    nueva.length < 12 ||
    nueva.length > 128 ||
    nueva !== repetida
  ) {
    redirect(
      "/activar-cuenta?estado=datos"
    );
  }

  // La contraseña se cambia en Supabase Auth.
  // No se guarda en tablas propias.

  const { error } =
    await supabase.auth.updateUser({
      password: nueva,
    });

  if (error) {
    console.error(
      "Activacion: fallo al guardar contraseña",
      error.code
    );

    redirect(
      "/activar-cuenta?estado=error"
    );
  }

  // Cerrar la sesión temporal para que
  // el usuario entre con su contraseña.

  const { error: errorSalida } =
    await supabase.auth.signOut({
      scope: "local",
    });

  if (errorSalida) {
    console.error(
      "Activacion: fallo al cerrar sesion",
      errorSalida.code
    );

    redirect(
      "/activar-cuenta?estado=salida"
    );
  }

  redirect("/login");
}

export default async function ActivarCuentaPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  await connection();

  const supabase = await createClient();

  const {
    data: identidad,
    error,
  } = await supabase.auth.getUser();

  if (error || !identidad.user) {
    redirect("/login");
  }

  const parametros = await searchParams;

  const mensajes: Record<string, string> = {
    datos:
      "Comprueba que las contraseñas coincidan y tengan al menos 12 caracteres.",

    error:
      "No se pudo establecer la contraseña. Comprueba que cumpla los requisitos de seguridad e inténtalo nuevamente.",

    salida:
      "La contraseña se guardó, pero no se pudo cerrar la sesión automáticamente. Cierra sesión antes de ingresar nuevamente.",
  };

  const mensaje =
    typeof parametros.estado === "string"
      ? mensajes[parametros.estado]
      : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg,#f4f8fc)] px-4 py-10 text-[var(--ecf-text,#102238)] dark:bg-[#080e1b] dark:text-white">

      <section className="w-full max-w-lg rounded-3xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface,#ffffff)] p-7 shadow-2xl shadow-slate-200/60 dark:border-cyan-400/20 dark:bg-[#112039] dark:shadow-black/30 sm:p-10">

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-[#07121e]">
            E
          </div>

          <div>
            <p className="font-black">
              Evolution Center Fit 2.0
            </p>

            <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Seguridad de la cuenta
            </p>
          </div>
        </div>

        <h1 className="text-3xl font-black">
          Crear mi contraseña
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
          Tu invitación fue verificada.

          Ahora establece una contraseña
          personal para iniciar sesión
          en el sistema.
        </p>

        <p className="mt-4 break-words rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900 dark:bg-[#081525] dark:text-cyan-200">
          {identidad.user.email ?? "Usuario invitado"}
        </p>

        {mensaje && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-amber-400/30 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"
          >
            {mensaje}
          </div>
        )}

        {parametros.estado !== "salida" ? (
          <form
            action={establecerContrasena}
            className="mt-7 space-y-5"
          >
            <div>
              <label
                htmlFor="contrasena"
                className="mb-2 block text-sm font-semibold"
              >
                Nueva contraseña
              </label>

              <input
                id="contrasena"
                name="contrasena"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Mínimo 12 caracteres"
                className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface-soft,#f8fafc)] px-4 py-3 text-[var(--ecf-text,#102238)] outline-none placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20 dark:border-white/15 dark:bg-[#071627] dark:text-white dark:placeholder:text-slate-400 dark:focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="confirmar"
                className="mb-2 block text-sm font-semibold"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmar"
                name="confirmar"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface-soft,#f8fafc)] px-4 py-3 text-[var(--ecf-text,#102238)] outline-none placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/20 dark:border-white/15 dark:bg-[#071627] dark:text-white dark:placeholder:text-slate-400 dark:focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-cyan-400 px-5 py-4 font-black text-[#07121e] transition hover:bg-cyan-300"
            >
              Guardar contraseña
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl border border-[var(--ecf-border,#dce5ee)] px-4 py-3 text-sm font-semibold text-cyan-800 hover:bg-cyan-50 dark:border-white/15 dark:text-cyan-200 dark:hover:bg-white/5"
          >
            Ir al inicio de sesión
          </Link>
        )}

        <p className="mt-6 text-xs leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
          Tu contraseña se administra
          mediante Supabase Auth.

          El administrador no necesita
          conocerla ni almacenarla.
        </p>

      </section>
    </main>
  );
}
