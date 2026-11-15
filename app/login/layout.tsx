
import Link from "next/link";
import type { ReactNode } from "react";

export default function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080d1a] text-white lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">

      {/* PANEL VISUAL DEL GIMNASIO */}

      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#081522] p-10 lg:flex xl:p-14">

        {/* FOTOGRAFIA */}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85")',
          }}
        />

        {/* OSCURECIMIENTO PARA LEGIBILIDAD */}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#061422]/90 via-[#061422]/55 to-[#050b16]/95"
        />

        {/* IDENTIDAD DE MARCA */}

        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-400 text-2xl font-black text-[#07121e] shadow-lg shadow-cyan-900/30">
              E
            </span>

            <span>
              <span className="block text-sm font-black tracking-wide">
                EVOLUTION CENTER FIT
                <span className="ml-1 text-cyan-300">
                  2.0
                </span>
              </span>

              <span className="block text-xs text-slate-300">
                Tu evolución comienza aquí
              </span>
            </span>
          </Link>
        </div>

        {/* MENSAJE DE BIENVENIDA */}

        <div className="relative z-10 max-w-xl">

          <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-sm">
            Bienvenido a Evolution
          </span>

          <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
            Tu próximo
            <span className="block text-cyan-300">
              nivel comienza
            </span>
            aquí.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-200">
            Cada entrenamiento es una oportunidad
            para superarte. Accede a tus rutinas,
            organiza tus sesiones y continúa
            avanzando hacia tus objetivos.
          </p>

          {/* BENEFICIOS */}

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              "Rutinas de entrenamiento",
              "Seguimiento del progreso",
              "Organización de sesiones",
            ].map((beneficio) => (
              <span
                key={beneficio}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md"
              >
                {beneficio}
              </span>
            ))}
          </div>

          {/* DESCUBRIR PROGRAMAS */}

          <Link
            href="/programas"
            className="mt-9 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-6 py-3 text-sm font-bold text-cyan-100 transition-colors hover:bg-cyan-400/25 focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            Explorar nuestros programas
            <span aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        {/* PIE DEL PANEL */}

        <div className="relative z-10 flex items-center justify-between gap-3 border-t border-white/15 pt-5">
          <p className="text-xs text-slate-300">
            Evolution Center Fit 2.0
          </p>

          <p className="text-xs text-slate-400">
            Lima, Perú
          </p>
        </div>
      </aside>

      {/* PANEL DEL FORMULARIO */}

      <section className="relative min-h-screen min-w-0 bg-[#080d1a]">

        {/* NAVEGACION SUPERIOR */}

        <nav
          aria-label="Navegación de acceso"
          className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-4 py-5 sm:px-8"
        >
          {/* VOLVER A LA PORTADA */}

          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-[#122039]/90 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-300/40 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <span aria-hidden="true">
              ←
            </span>
            Volver al inicio
          </Link>

          {/* PROGRAMAS PUBLICOS */}

          <Link
            href="/programas"
            className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/10 focus-visible:outline-2 focus-visible:outline-cyan-300 sm:text-sm"
          >
            Ver programas
          </Link>
        </nav>

        {/* FORMULARIO EXISTENTE DE SUPABASE */}

        <div className="min-h-screen">
          {children}
        </div>

      </section>
    </div>
  );
}
