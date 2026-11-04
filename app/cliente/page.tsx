
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";

// Módulos del panel del cliente
const modulos = [
  {
    titulo: "Mi perfil",
    descripcion:
      "Registra tus objetivos, experiencia y disponibilidad.",
  },
  {
    titulo: "Mis rutinas",
    descripcion:
      "Consulta tus planes personalizados aprobados.",
  },
  {
    titulo: "Mis entrenamientos",
    descripcion:
      "Consulta tus sesiones programadas y realizadas.",
  },
  {
    titulo: "Mi progreso",
    descripcion:
      "Revisa tu asistencia, cumplimiento y continuidad.",
  },
];

// Pantalla de carga
function CargandoPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

        <h2 className="text-xl font-bold">
          Evolution Center Fit 2.0
        </h2>

        <p className="mt-3 text-sm text-slate-400">
          Verificando acceso al panel...
        </p>
      </div>
    </main>
  );
}

// Contenido protegido
async function ContenidoCliente() {
  await connection();

  const supabase = await createClient();

  // Verificar identidad
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  // Verificar rol
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .single();

  if (accesoError || acceso?.rol !== "cliente") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-white">
        <h1 className="text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="text-center text-slate-400">
          Tu cuenta no tiene autorización para este panel.
        </p>

        <Link
          href="/login"
          className="text-cyan-400 hover:underline"
        >
          Volver a mi sesión
        </Link>
      </main>
    );
  }

  // Obtener nombre del cliente
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre_completo")
    .eq("id", userId)
    .single();

  const nombre = perfil?.nombre_completo ?? "Cliente";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* ENCABEZADO */}
      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-black">
              EVOLUTION CENTER FIT
              <span className="ml-2 text-cyan-400">
                2.0
              </span>
            </h1>

            <p className="text-xs text-slate-400">
              Portal del cliente
            </p>
          </div>

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="rounded-xl border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="mb-3 text-sm font-semibold text-cyan-400">
          PANEL PERSONAL
        </p>

        <h2 className="text-3xl font-bold md:text-4xl">
          ¡Bienvenido, {nombre}!
        </h2>

        <p className="mt-3 text-slate-400">
          Tu espacio personal de entrenamiento.
        </p>

        {/* TARJETAS */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {modulos.map((modulo) => (
            <article
              key={modulo.titulo}
              className="rounded-2xl border border-white/10 bg-slate-900 p-7"
            >
              <h3 className="text-xl font-bold">
                {modulo.titulo}
              </h3>

              <p className="mt-3 text-sm text-slate-400">
                {modulo.descripcion}
              </p>

              {/* ENLACE FUNCIONAL AL PERFIL */}
              {modulo.titulo === "Mi perfil" ? (
                <Link
                  href="/cliente/perfil"
                  className="mt-6 inline-block text-sm font-semibold text-cyan-400 hover:underline"
                >
                  Completar o editar mi perfil
                </Link>
              ) : (
                <p className="mt-6 text-xs font-semibold text-cyan-400">
                  Próximamente
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

// Página principal
export default function ClientePage() {
  return (
    <Suspense fallback={<CargandoPanel />}>
      <ContenidoCliente />
    </Suspense>
  );
}
