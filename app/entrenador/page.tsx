
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";

const modulos = [
  {
    titulo: "Mis clientes",
    descripcion:
      "Consultar los clientes asignados y sus perfiles de entrenamiento.",
    icono: "👥",
    referencia: "Gestión de clientes",
  },
  {
    titulo: "Recomendaciones de IA",
    descripcion:
      "Examinar las rutinas personalizadas propuestas por el motor inteligente.",
    icono: "🧠",
    referencia: "HU-03",
  },
  {
    titulo: "Aprobación de rutinas",
    descripcion:
      "Revisar, aprobar, rechazar o solicitar ajustes a las rutinas.",
    icono: "📋",
    referencia: "HU-04",
  },
  {
    titulo: "Seguimiento de clientes",
    descripcion:
      "Supervisar asistencia, cumplimiento y continuidad del entrenamiento.",
    icono: "📊",
    referencia: "HU-06",
  },
];

function CargandoPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
        <h2 className="text-xl font-bold">
          Evolution Center Fit 2.0
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          Verificando acceso del entrenador...
        </p>
      </div>
    </main>
  );
}

async function ContenidoEntrenador() {
  // Renderizar esta página con cada solicitud.
  await connection();

  const supabase = await createClient();

  // Comprobar el token de autenticación.
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  // Verificar el rol autorizado en PostgreSQL.
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .single();

  if (accesoError || acceso?.rol !== "entrenador") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-white">
        <div className="text-5xl">🔒</div>

        <h1 className="text-center text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="max-w-md text-center text-slate-400">
          Tu cuenta no tiene autorización para acceder
          al panel del entrenador.
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950"
        >
          Volver a mi sesión
        </Link>
      </main>
    );
  }

  // Obtener el nombre del entrenador.
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre_completo")
    .eq("id", userId)
    .single();

  const nombre = perfil?.nombre_completo ?? "Entrenador";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Encabezado */}
      <header className="border-b border-white/10 bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-xl font-black text-slate-950">
              E
            </div>

            <div>
              <h1 className="text-lg font-black tracking-tight">
                EVOLUTION CENTER FIT
                <span className="ml-2 text-cyan-400">
                  2.0
                </span>
              </h1>

              <p className="text-xs text-slate-400">
                Panel de entrenamiento profesional
              </p>
            </div>
          </div>

          <Link
            href="/catalogo"
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
          >
            Ver catálogo de rutinas
          </Link>

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="rounded-xl border border-red-400/30 px-5 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Bienvenida */}
        <section className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Portal del entrenador
          </p>

          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            ¡Bienvenido, {nombre}!
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-slate-400">
            Desde este espacio podrás gestionar las rutinas
            de entrenamiento, evaluar las recomendaciones
            inteligentes y supervisar la adherencia
            de tus clientes.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            <span>✓</span>
            Rol de entrenador verificado
          </div>
        </section>

        {/* Sección principal */}
        <section>
          <div className="mb-6">
            <h3 className="text-2xl font-bold">
              Módulos de entrenamiento
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Herramientas que desarrollaremos para
              la supervisión de clientes.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {modulos.map((modulo) => (
              <article
                key={modulo.titulo}
                className="group rounded-3xl border border-white/10 bg-slate-900 p-7 transition-colors hover:border-cyan-400/30"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl">
                    {modulo.icono}
                  </div>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                    {modulo.referencia}
                  </span>
                </div>

                <h4 className="text-xl font-bold">
                  {modulo.titulo}
                </h4>

                <p className="mt-3 min-h-16 leading-7 text-slate-400">
                  {modulo.descripcion}
                </p>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-sm font-medium text-cyan-400">
                    Módulo en desarrollo
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Información del sistema */}
        <section className="mt-10 rounded-3xl border border-cyan-400/10 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 p-7">
          <p className="text-sm font-semibold text-cyan-300">
            Inteligencia artificial y supervisión humana
          </p>

          <h3 className="mt-3 text-xl font-bold">
            Recomendaciones supervisadas
          </h3>

          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            El motor inteligente propondrá rutinas a
            partir del perfil del cliente. El entrenador
            revisará las propuestas antes de aprobar
            el plan de entrenamiento.
          </p>
        </section>
      </div>

      <footer className="border-t border-white/10 px-6 py-7 text-center text-xs text-slate-500">
        Evolution Center Fit 2.0 · Portal del entrenador
      </footer>
    </main>
  );
}

export default function EntrenadorPage() {
  return (
    <Suspense fallback={<CargandoPanel />}>
      <ContenidoEntrenador />
    </Suspense>
  );
}
