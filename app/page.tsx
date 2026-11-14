
import Link from "next/link";

// EVOLUTION CENTER FIT 2.0
// FASE 130 - PORTADA DE BIENVENIDA
// Pagina publica, sin autenticacion obligatoria.
// Los modulos internos siguen protegidos por sus propios permisos.

const beneficios = [
  {
    icono: "🧠",
    titulo: "Recomendaciones inteligentes",
    descripcion:
      "El sistema analiza las características del cliente y evalúa la compatibilidad de las rutinas disponibles.",
  },
  {
    icono: "🏋️",
    titulo: "Supervisión profesional",
    descripcion:
      "El entrenador revisa las recomendaciones, aprueba rutinas y organiza las sesiones.",
  },
  {
    icono: "📊",
    titulo: "Seguimiento del progreso",
    descripcion:
      "Consulta la asistencia, el cumplimiento y la continuidad del entrenamiento.",
  },
];

const pasos = [
  {
    numero: "01",
    titulo: "Completa tu perfil",
    descripcion:
      "Registra tu objetivo, experiencia, tiempo disponible, frecuencia y equipamiento.",
  },
  {
    numero: "02",
    titulo: "Se evalúan las rutinas",
    descripcion:
      "Cuando está autorizado, el motor inteligente identifica rutinas compatibles con tu perfil.",
  },
  {
    numero: "03",
    titulo: "Entrena con supervisión",
    descripcion:
      "El entrenador aprueba el plan, programa las sesiones y registra la ejecución.",
  },
  {
    numero: "04",
    titulo: "Consulta tu evolución",
    descripcion:
      "Revisa tus sesiones, tu calendario y los indicadores de progreso.",
  },
];

const roles = [
  {
    icono: "👤",
    nombre: "Cliente",
    descripcion:
      "Tu espacio personal para consultar rutinas, sesiones programadas y progreso.",
    funciones: [
      "Perfil de entrenamiento",
      "Mi rutina y calendario",
      "Centro de entrenamiento del día",
      "Indicadores de progreso",
    ],
  },
  {
    icono: "📋",
    nombre: "Entrenador",
    descripcion:
      "Herramientas para evaluar rutinas, organizar sesiones y supervisar clientes.",
    funciones: [
      "Clientes asignados",
      "Evaluación de compatibilidad",
      "Aprobación y asignación de rutinas",
      "Asistencia, ejercicios y adherencia",
    ],
  },
  {
    icono: "⚙️",
    nombre: "Administrador",
    descripcion:
      "Control de los recursos y de la operación general de la plataforma.",
    funciones: [
      "Usuarios e invitaciones",
      "Roles y permisos",
      "Entrenadores y clientes",
      "Catálogo y reportes",
    ],
  },
];

function Flecha() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">

      {/* ENCABEZADO */}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">

          <Link
            href="/"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500 text-xl font-black text-white shadow-lg shadow-cyan-500/20">
              E
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight md:text-base">
                EVOLUTION CENTER FIT{" "}
                <span className="text-cyan-600 dark:text-cyan-400">
                  2.0
                </span>
              </p>

              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Plataforma inteligente de entrenamiento
              </p>
            </div>
          </Link>

          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 lg:flex"
          >
            <a href="#funciones" className="hover:text-cyan-600">
              Funciones
            </a>

            <a href="#como-funciona" className="hover:text-cyan-600">
              Cómo funciona
            </a>

            <a href="#roles" className="hover:text-cyan-600">
              Roles
            </a>

            <a href="#inteligencia-artificial" className="hover:text-cyan-600">
              Inteligencia artificial
            </a>

            <Link href="/catalogo" className="hover:text-cyan-600">
              Catálogo
            </Link>
          </nav>

          <Link
            href="/login"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-cyan-600 md:text-sm dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            Iniciar sesión
            <Flecha />
          </Link>
        </div>

        {/* NAVEGACION EN CELULARES */}

        <nav
          aria-label="Navegación móvil"
          className="flex gap-5 overflow-x-auto border-t border-slate-100 px-5 py-3 text-xs font-semibold whitespace-nowrap text-slate-600 lg:hidden dark:border-slate-800 dark:text-slate-300"
        >
          <a href="#funciones">Funciones</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#roles">Roles</a>
          <a href="#inteligencia-artificial">IA</a>
          <Link href="/catalogo">Catálogo</Link>
        </nav>
      </header>

      {/* BIENVENIDA PRINCIPAL */}

      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-slate-50 to-violet-100/70 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2 lg:py-28">

          <div>
            <span className="inline-flex rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-xs font-bold text-cyan-700 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-300">
              ✦ Entrenamiento + Tecnología + Innovación
            </span>

            <h1 className="mt-7 max-w-2xl text-4xl leading-tight font-black tracking-tight sm:text-5xl lg:text-6xl">
              Tu entrenamiento,
              <span className="mt-2 block bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent dark:from-cyan-300 dark:to-violet-300">
                nuestra evolución.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 md:text-lg dark:text-slate-300">
              Entrena con rutinas adaptadas a tu perfil,
              acompañamiento profesional y herramientas
              que te permiten conocer tu progreso.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-cyan-500 px-7 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
              >
                Comenzar ahora
                <Flecha />
              </Link>

              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/80 px-7 py-4 text-sm font-bold text-slate-800 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                Conocer cómo funciona
              </a>
            </div>

            <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
              ¿Ya tienes una cuenta? Ingresa con tus credenciales.
              Los nuevos usuarios reciben una invitación del administrador.
            </p>
          </div>

          {/* PANEL ILUSTRATIVO */}

          <div className="relative mx-auto w-full max-w-lg">

            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">

              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    EVOLUTION CENTER FIT
                  </p>

                  <h2 className="mt-1 text-lg font-extrabold">
                    Centro de entrenamiento
                  </h2>
                </div>

                <span className="rounded-full bg-cyan-50 px-3 py-2 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  Vista ilustrativa
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-violet-800 p-6 text-white">
                <p className="text-xs font-semibold text-cyan-300">
                  TU PLAN DE ENTRENAMIENTO
                </p>

                <h3 className="mt-3 text-2xl font-extrabold">
                  Cada sesión cuenta.
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Consulta tu rutina, organiza tus sesiones
                  y mantén tus objetivos a la vista.
                </p>

                <div className="mt-6 flex items-center gap-4 rounded-xl bg-white/10 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/20 text-2xl">
                    🏋️
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Mi rutina
                    </p>

                    <p className="mt-1 text-xs text-slate-300">
                      Ejercicios y sesiones programadas
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <span className="text-2xl">📅</span>
                  <p className="mt-3 text-sm font-bold">
                    Calendario
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Fechas y horarios
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <span className="text-2xl">📈</span>
                  <p className="mt-3 text-sm font-bold">
                    Mi progreso
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Evolución del plan
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              Representación visual de la plataforma, sin datos personales.
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}

      <section
        id="funciones"
        className="scroll-mt-36 px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              LO QUE OFRECE LA PLATAFORMA
            </p>

            <h2 className="mt-4 text-3xl font-black md:text-4xl">
              Mucho más que una rutina
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
              Un sistema que conecta la planificación, la
              supervisión del entrenador y el seguimiento
              del entrenamiento.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {beneficios.map((beneficio) => (
              <article
                key={beneficio.titulo}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-3xl dark:bg-cyan-950">
                  {beneficio.icono}
                </div>

                <h3 className="mt-6 text-lg font-extrabold">
                  {beneficio.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  {beneficio.descripcion}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}

      <section
        id="como-funciona"
        className="scroll-mt-36 bg-slate-100 px-5 py-20 md:px-8 dark:bg-slate-900/60"
      >
        <div className="mx-auto max-w-7xl">

          <div className="text-center">
            <p className="text-xs font-extrabold tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              TU PROCESO DE ENTRENAMIENTO
            </p>

            <h2 className="mt-4 text-3xl font-black md:text-4xl">
              ¿Cómo funciona Evolution Center Fit?
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {pasos.map((paso) => (
              <article
                key={paso.numero}
                className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-sm font-black text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                  {paso.numero}
                </div>

                <h3 className="mt-6 text-lg font-extrabold">
                  {paso.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  {paso.descripcion}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}

      <section
        id="roles"
        className="scroll-mt-36 px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              TRES EXPERIENCIAS, UNA PLATAFORMA
            </p>

            <h2 className="mt-4 text-3xl font-black md:text-4xl">
              Un espacio para cada usuario
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
              Cada persona accede a las herramientas
              correspondientes a su rol.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {roles.map((rol) => (
              <article
                key={rol.nombre}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-4xl">
                  {rol.icono}
                </div>

                <h3 className="mt-5 text-xl font-extrabold">
                  {rol.nombre}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  {rol.descripcion}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {rol.funciones.map((funcion) => (
                    <li
                      key={funcion}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        ✓
                      </span>
                      <span>{funcion}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500 px-4 py-3 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-slate-800"
                >
                  Acceder a mi cuenta
                  <Flecha />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* INTELIGENCIA ARTIFICIAL */}

      <section
        id="inteligencia-artificial"
        className="scroll-mt-36 bg-slate-100 px-5 py-20 md:px-8 dark:bg-slate-900/60"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">

          <div>
            <span className="text-xs font-extrabold tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              INTELIGENCIA ARTIFICIAL APLICADA
            </span>

            <h2 className="mt-4 text-3xl font-black md:text-4xl">
              Tecnología que apoya al entrenador
            </h2>

            <p className="mt-6 text-sm leading-8 text-slate-600 dark:text-slate-400">
              Nuestro motor híbrido analiza el perfil del
              cliente y las rutinas publicadas, aplica reglas
              de elegibilidad y calcula compatibilidades.
            </p>

            <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-slate-400">
              Los resultados pueden incorporar similitud
              semántica y lógica difusa. El entrenador
              conserva la decisión final de aprobación
              y asignación.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">

            {[
              "Perfil y disponibilidad del cliente",
              "Reglas de elegibilidad",
              "Evaluación de compatibilidad",
              "Revisión del entrenador",
              "Asignación del plan",
            ].map((etapa, indice) => (
              <div
                key={etapa}
                className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0 dark:border-slate-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  {indice + 1}
                </div>

                <p className="text-sm font-semibold">
                  {etapa}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCESO FINAL */}

      <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-violet-950 px-5 py-20 text-white md:px-8">

        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">

          <div>
            <h2 className="text-3xl font-black md:text-4xl">
              ¿Listo para continuar tu entrenamiento?
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Accede a tu cuenta para consultar tus herramientas.
              Si recibiste una invitación, activa tu usuario
              desde el enlace enviado por el administrador.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-4 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-300"
            >
              Iniciar sesión
              <Flecha />
            </Link>

            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-4 text-sm font-bold transition hover:bg-white/10"
            >
              Explorar catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* PIE DE PAGINA */}

      <footer className="border-t border-slate-200 bg-white px-5 py-8 dark:border-slate-800 dark:bg-slate-950">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>
            <p className="text-sm font-extrabold">
              EVOLUTION CENTER FIT 2.0
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Prototipo académico de entrenamiento inteligente
            </p>
          </div>

          <p className="max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">
            La herramienta inteligente apoya las decisiones
            profesionales y el seguimiento del entrenamiento.
            No reemplaza al entrenador.
          </p>
        </div>
      </footer>
    </main>
  );
}
