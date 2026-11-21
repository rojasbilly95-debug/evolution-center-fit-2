import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function cerrarSesion() {
  "use server";

  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

export default function CuentaSuspendidaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] px-4 py-12 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-[#17344a] via-[#14263d] to-[#201b3d] p-8 text-center shadow-2xl sm:p-10">

        <Link href="/" className="inline-flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-[#07121e]">
            E
          </span>

          <span className="text-left text-sm font-black">
            EVOLUTION CENTER FIT
            <span className="block text-cyan-300">
              2.0
            </span>
          </span>
        </Link>

        <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-4xl">
          🔒
        </div>

        <p className="mt-7 text-xs font-bold uppercase tracking-widest text-amber-300">
          ACCESO RESTRINGIDO
        </p>

        <h1 className="mt-3 text-3xl font-black">
          Cuenta suspendida
        </h1>

        <p className="mt-5 text-sm leading-7 text-slate-300">
          Tu cuenta no tiene acceso actualmente
          a las funciones privadas de Evolution Center Fit 2.0.
        </p>

        <p className="mt-3 text-sm leading-7 text-slate-400">
          Si consideras que se trata de un error,
          comunícate con la administración del gimnasio.
        </p>

        <div className="mt-8 grid gap-3">
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="min-h-12 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              Cerrar sesión
            </button>
          </form>

          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            ← Volver a la portada
          </Link>
        </div>

        <p className="mt-8 border-t border-white/10 pt-6 text-xs text-slate-500">
          Evolution Center Fit 2.0
          <span className="mt-1 block">
            Seguridad y administración de cuentas
          </span>
        </p>

      </section>
    </main>
  );
}