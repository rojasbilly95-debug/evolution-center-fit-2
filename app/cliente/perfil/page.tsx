
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";
import FormularioPerfil from "./formulario-perfil";

// =============================================
// EVOLUTION CENTER FIT 2.0
// FASE 110.16 - PERFIL DEL CLIENTE
// Conserva autenticacion, rol y datos originales.
// =============================================

const enlaces = [
  { texto: "Inicio", href: "/cliente" },
  { texto: "Mi rutina", href: "/cliente/mi-rutina" },
  { texto: "Calendario", href: "/cliente#mi-calendario" },
  { texto: "Mi progreso", href: "/cliente#mi-progreso" },
  { texto: "Mi perfil", href: "/cliente/perfil" },
];

const apartados = [
  {
    numero: "01",
    titulo: "Datos físicos",
    descripcion: "Edad, peso, estatura e IMC orientativo.",
  },
  {
    numero: "02",
    titulo: "Objetivo y experiencia",
    descripcion: "Tu meta principal y nivel de entrenamiento.",
  },
  {
    numero: "03",
    titulo: "Disponibilidad",
    descripcion: "Frecuencia, duración y lugar.",
  },
  {
    numero: "04",
    titulo: "Equipamiento",
    descripcion: "Material disponible para entrenar.",
  },
  {
    numero: "05",
    titulo: "Consideraciones",
    descripcion: "Información adicional para el entrenador.",
  },
];

function CabeceraPerfil() {
  return (
    <header className="relative z-40 border-b border-white/10 bg-[#0c1526]/95 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/cliente"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-[#07121e]">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-300">2.0</span>
            </span>

            <span className="block text-[11px] text-slate-400">
              Mi perfil de entrenamiento
            </span>
          </span>
        </Link>

        {/* NAVEGACION PARA PC */}
        <nav
          aria-label="Navegación del cliente"
          className="hidden items-center gap-1 xl:flex"
        >
          {enlaces.map((enlace) => {
            const activo =
              enlace.href === "/cliente/perfil";

            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                  activo
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {enlace.texto}
              </Link>
            );
          })}

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="ml-1 min-h-11 rounded-xl border border-rose-400/20 px-3 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-rose-300"
            >
              Cerrar sesión
            </button>
          </form>
        </nav>

        {/* NAVEGACION PARA CELULAR Y TABLET */}
        <details className="relative shrink-0 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            Menú
          </summary>

          <nav
            aria-label="Navegación móvil"
            className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-white/15 bg-[#101d31] p-2 shadow-2xl shadow-black/50"
          >
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={
                  enlace.href === "/cliente/perfil"
                    ? "page"
                    : undefined
                }
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  enlace.href === "/cliente/perfil"
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "text-slate-200 hover:bg-white/10"
                }`}
              >
                {enlace.texto}
              </Link>
            ))}

            <form
              action={cerrarSesion}
              className="mt-2 border-t border-white/10 pt-2"
            >
              <button
                type="submit"
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-300 hover:bg-rose-400/10"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </details>
      </div>
    </header>
  );
}

function CargandoPerfil() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080d1a] px-5 text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111d31] px-6 py-5 shadow-xl">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-300" />

        <p className="text-sm text-slate-300">
          Cargando tu perfil de entrenamiento...
        </p>
      </div>
    </main>
  );
}

function EstadoPerfil({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080d1a] px-5 py-10 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-[#172a43] to-[#101a2d] p-8 text-center shadow-[0_24px_65px_rgba(0,0,0,0.3)]">
        <h1 className="text-2xl font-bold">{titulo}</h1>

        <p className="mt-4 text-sm leading-7 text-slate-400">
          {descripcion}
        </p>

        <Link
          href="/cliente"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          Volver al panel del cliente
        </Link>
      </section>
    </main>
  );
}

async function ContenidoPerfil() {
  await connection();

  const supabase = await createClient();

  // 1. VERIFICAR IDENTIDAD
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  // 2. VERIFICAR ROL DE CLIENTE
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .single();

  if (accesoError || acceso?.rol !== "cliente") {
    return (
      <EstadoPerfil
        titulo="Acceso restringido"
        descripcion="Esta página está disponible únicamente para clientes autorizados."
      />
    );
  }

  // 3. CONSULTAR EL PERFIL PROPIO
  const { data: perfil, error: perfilError } =
    await supabase
      .from("perfiles_clientes")
      .select(
        "edad,peso_kg,estatura_cm,objetivo,experiencia,frecuencia_semanal,minutos_por_sesion,lugar,equipamiento,restricciones"
      )
      .eq("usuario_id", userId)
      .maybeSingle();

  if (perfilError) {
    return (
      <EstadoPerfil
        titulo="No se pudo cargar tu perfil"
        descripcion="No fue posible consultar tu información. Comprueba los permisos de lectura e inténtalo nuevamente."
      />
    );
  }

  return (
    <main className="ecf-profile relative min-h-screen bg-[#080d1a] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-cyan-500/[0.06] to-transparent"
      />

      <CabeceraPerfil />

      <div className="relative mx-auto w-full max-w-7xl space-y-7 px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        {/* ENCABEZADO DESTACADO */}
        <section className="overflow-hidden rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-[#122b40] via-[#111d32] to-[#1a1735] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-200">
                Configuración personal
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Mi perfil de{" "}
                <span className="text-cyan-300">
                  entrenamiento
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Configura tus datos físicos, objetivos,
                disponibilidad y equipamiento para
                facilitar la selección de rutinas
                adaptadas a tu perfil.
              </p>

              <span
                className={`mt-5 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  perfil
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-400/25 bg-amber-400/10 text-amber-200"
                }`}
              >
                {perfil
                  ? "Perfil registrado"
                  : "Perfil por completar"}
              </span>
            </div>

            <Link
              href="/cliente"
              className="inline-flex min-h-11 items-center justify-center self-start rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              Volver a mi panel
            </Link>
          </div>
        </section>

        {/* CONTENIDO PRINCIPAL */}
        <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* GUIA DEL PERFIL */}
          <aside className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#172a43] to-[#101a2d] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.18)] sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Tu información
              </p>

              <h2 className="mt-2 text-lg font-bold">
                Apartados del perfil
              </h2>

              <ol className="mt-5 space-y-4">
                {apartados.map((apartado) => (
                  <li
                    key={apartado.numero}
                    className="flex items-start gap-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xs font-bold text-cyan-200">
                      {apartado.numero}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {apartado.titulo}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {apartado.descripcion}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-5">
              <h3 className="text-sm font-bold text-cyan-200">
                Información importante
              </h3>

              <p className="mt-2 text-xs leading-6 text-slate-300">
                Tu perfil ayuda a evaluar la
                compatibilidad de nuevas rutinas.
                Las recomendaciones continúan sujetas
                a revisión del entrenador.
              </p>
            </div>
          </aside>

          {/* FORMULARIO REAL */}
          <div className="ecf-profile-content min-w-0">
            <FormularioPerfil perfilInicial={perfil} />
          </div>
        </div>

        <footer className="pt-3 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 ·
          Perfil de entrenamiento personal
        </footer>
      </div>
    </main>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<CargandoPerfil />}>
      <ContenidoPerfil />
    </Suspense>
  );
}
