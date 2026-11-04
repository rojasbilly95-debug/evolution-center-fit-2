
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";

// Funcionalidades administrativas planificadas.
const modulos = [
  {
    titulo: "Gestión de usuarios",
    descripcion:
      "Administrar las cuentas autorizadas del gimnasio.",
    icono: "👥",
    codigo: "Administración",
  },
  {
    titulo: "Roles y permisos",
    descripcion:
      "Supervisar los accesos de clientes y entrenadores.",
    icono: "🔐",
    codigo: "HU-07",
  },
  {
    titulo: "Catálogo de entrenamiento",
    descripcion:
      "Organizar los ejercicios y las rutinas disponibles.",
    icono: "🏋️",
    codigo: "HU-02",
  },
  {
    titulo: "Reportes generales",
    descripcion:
      "Consultar indicadores y resultados del gimnasio.",
    icono: "📊",
    codigo: "HU-06",
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
          Verificando permisos administrativos...
        </p>
      </div>
    </main>
  );
}

async function ContenidoAdministrador() {
  // Procesar autenticación en cada solicitud.
  await connection();

  const supabase = await createClient();

  // Comprobar identidad.
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  // Verificar rol autorizado en PostgreSQL.
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .single();

  if (accesoError || acceso?.rol !== "administrador") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-white">
        <div className="text-5xl">🔒</div>

        <h1 className="text-center text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="max-w-md text-center text-slate-400">
          Tu cuenta no tiene autorización para acceder
          al panel de administración.
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

  // Obtener datos del administrador autenticado.
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre_completo")
    .eq("id", userId)
    .single();

  const nombre =
    perfil?.nombre_completo ?? "Administrador";

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ENCABEZADO */}
      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-xl font-black text-slate-950">
              E
            </div>

            <div>
              <h1 className="text-lg font-black">
                EVOLUTION CENTER FIT
                <span className="ml-2 text-cyan-400">
                  2.0
                </span>
              </h1>

              <p className="text-xs text-slate-400">
                Administración del sistema
              </p>
            </div>
          </div>

          <Link
            href="/catalogo"
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
          >
            Administrar catálogo
          </Link>

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="rounded-xl border border-red-400/30 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/10"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="mx-auto max-w-7xl px-6 py-12">

        <section className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Panel de administración
          </p>

          <h2 className="text-3xl font-black sm:text-4xl">
            ¡Bienvenido, {nombre}!
          </h2>

          <p className="mt-4 max-w-3xl leading-7 text-slate-400">
            Desde este panel administrarás los usuarios,
            roles y recursos de Evolution Center Fit 2.0.
            También podrás supervisar los resultados
            generales del sistema.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            <span>✓</span>
            Identidad y rol de administrador verificados
          </div>
        </section>

        {/* MÓDULOS ADMINISTRATIVOS */}
        <section>
          <div className="mb-7">
            <h3 className="text-2xl font-bold">
              Módulos administrativos
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Herramientas previstas para la gestión
              y supervisión del gimnasio.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {modulos.map((modulo) => (
              <article
                key={modulo.titulo}
                className="rounded-3xl border border-white/10 bg-slate-900 p-7 transition-colors hover:border-cyan-400/30"
              >
                <div className="mb-6 flex items-start justify-between">

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl">
                    {modulo.icono}
                  </div>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                    {modulo.codigo}
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
                    Funcionalidad planificada
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* INFORMACIÓN DE SEGURIDAD */}
        <section className="mt-10 rounded-3xl border border-cyan-400/10 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 p-7">

          <p className="text-sm font-semibold text-cyan-300">
            Seguridad y control de acceso
          </p>

          <h3 className="mt-3 text-xl font-bold">
            Administración protegida
          </h3>

          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            El acceso a este panel requiere una sesión
            válida y un rol de administrador registrado
            en la base de datos. Las operaciones de
            administración de usuarios se habilitarán
            cuando implementemos y validemos sus
            permisos específicos.
          </p>

        </section>
      </div>

      <footer className="border-t border-white/10 px-6 py-7 text-center text-xs text-slate-500">
        Evolution Center Fit 2.0 · Administración
      </footer>
    </main>
  );
}

export default function AdministradorPage() {
  return (
    <Suspense fallback={<CargandoPanel />}>
      <ContenidoAdministrador />
    </Suspense>
  );
}
