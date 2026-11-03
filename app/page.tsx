
const roles = [
  {
    nombre: "Cliente",
    icono: "🏋️",
    descripcion:
      "Consulta tus rutinas, registra entrenamientos y revisa tu progreso.",
  },
  {
    nombre: "Entrenador",
    icono: "📋",
    descripcion:
      "Revisa recomendaciones, aprueba rutinas y supervisa las sesiones.",
  },
  {
    nombre: "Administrador",
    icono: "⚙️",
    descripcion:
      "Gestiona los usuarios, los permisos y los indicadores del gimnasio.",
  },
];

const funciones = [
  "Perfiles personalizados",
  "Recomendaciones con IA",
  "Aprobación del entrenador",
  "Seguimiento de adherencia",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-2xl text-slate-950">
              ◆
            </div>

            <div>
              <p className="text-lg font-black tracking-tight">
                EVOLUTION CENTER FIT
                <span className="ml-2 text-cyan-400">2.0</span>
              </p>
              <p className="text-xs text-slate-400">
                Plataforma inteligente de entrenamiento
              </p>
            </div>
          </div>

          <span className="hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-300 sm:block">
            Prototipo académico
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-24">
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          <p className="mb-6 inline-block rounded-full border border-violet-400/30 bg-violet-400/10 px-5 py-2 text-sm font-medium text-violet-300">
            Innovación • Inteligencia Artificial • Fitness
          </p>

          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Tu entrenamiento.
            <span className="block bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Nuestra evolución.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Un sistema inteligente diseñado para recomendar
            rutinas personalizadas, facilitar la supervisión
            del entrenador y medir la adherencia al
            entrenamiento.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <span className="rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-950">
              Evolution Center Fit 2.0
            </span>
            <span className="rounded-xl border border-white/20 px-6 py-3 font-medium text-slate-200">
              Versión en desarrollo
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-9 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Plataforma integral
          </p>
          <h2 className="mt-3 text-3xl font-bold">
            Un sistema, tres experiencias
          </h2>
          <p className="mt-3 text-slate-400">
            Cada usuario contará con funciones y permisos
            según su rol.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((rol) => (
            <article
              key={rol.nombre}
              className="rounded-3xl border border-white/10 bg-slate-900 p-8 transition-colors hover:border-cyan-400/50"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl">
                {rol.icono}
              </div>

              <h3 className="text-xl font-bold">{rol.nombre}</h3>
              <p className="mt-3 leading-7 text-slate-400">
                {rol.descripcion}
              </p>
              <p className="mt-6 text-sm font-medium text-cyan-400">
                Módulo planificado
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-900/50 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Funcionalidades que desarrollaremos
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {funciones.map((funcion) => (
              <div
                key={funcion}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <span className="mb-4 block text-xl text-cyan-400">
                  ✓
                </span>
                <p className="font-semibold">{funcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
        Evolution Center Fit 2.0 · Proyecto universitario ·
        Lima, Perú · 2026
      </footer>
    </main>
  );
}
