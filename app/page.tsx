
import Link from "next/link";

import {
  EncabezadoPublico,
  PiePublico,
  FotoPrograma,
  fotos,
  programasPublicos,
} from "./_components/web-publica";

const beneficios = [
  {
    icono: "🏋️",
    titulo: "Rutinas personalizadas",
    texto:
      "Planes seleccionados según tu objetivo, experiencia y disponibilidad.",
  },
  {
    icono: "📈",
    titulo: "Seguimiento del progreso",
    texto:
      "Consulta los registros de asistencia, cumplimiento y continuidad.",
  },
  {
    icono: "👤",
    titulo: "Acompañamiento profesional",
    texto:
      "Un entrenador revisa las recomendaciones y supervisa tus sesiones.",
  },
  {
    icono: "⚡",
    titulo: "Entrenamiento organizado",
    texto:
      "Conoce tu rutina y la programación de tus sesiones.",
  },
  {
    icono: "📅",
    titulo: "Calendario personal",
    texto:
      "Revisa tus fechas y horarios de entrenamiento.",
  },
  {
    icono: "✨",
    titulo: "Tecnología inteligente",
    texto:
      "La IA ayuda a identificar rutinas compatibles con tu perfil.",
  },
];

const pasos = [
  {
    numero: "01",
    titulo: "Completa tu perfil",
    texto:
      "Indica tu objetivo, experiencia, tiempo disponible y equipamiento.",
  },
  {
    numero: "02",
    titulo: "Recibe un plan",
    texto:
      "Tu entrenador evalúa las alternativas y aprueba una rutina adecuada.",
  },
  {
    numero: "03",
    titulo: "Entrena y revisa tu progreso",
    texto:
      "Consulta tu calendario, sigue el entrenamiento y observa tus avances.",
  },
];

const preguntas = [
  {
    q: "¿Necesito experiencia para empezar?",
    a:
      "No necesariamente. La plataforma contempla perfiles con distintos niveles de experiencia y disponibilidad.",
  },
  {
    q: "¿La inteligencia artificial elige mi rutina?",
    a:
      "La herramienta evalúa compatibilidad cuando su uso está autorizado. El entrenador revisa y aprueba el plan que se asigna.",
  },
  {
    q: "¿Puedo ver mis sesiones y progreso?",
    a:
      "Sí. Los clientes con cuenta pueden consultar su rutina, calendario e indicadores personales disponibles.",
  },
  {
    q: "¿Cómo puedo obtener una cuenta?",
    a:
      "El administrador del gimnasio gestiona las invitaciones. Después de recibir una, podrás activar tu cuenta e iniciar sesión.",
  },
];

export default function InicioPublico() {
  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EncabezadoPublico activo="inicio" />

      {/* PORTADA PRINCIPAL */}

      <section className="overflow-hidden bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[1fr_1.1fr] lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex rounded-full border border-cyan-300 bg-white/75 px-4 py-2 text-xs font-bold text-cyan-800 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-300">
              🏋️ Entrenamiento + Tecnología + Evolución
            </span>

            <h1 className="mt-6 text-4xl leading-[1.1] font-black tracking-tight sm:text-5xl xl:text-6xl">
              Tu entrenamiento,
              <span className="mt-2 block bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 bg-clip-text text-transparent">
                nuestra evolución.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Descubre una forma más organizada de entrenar:
              rutinas adaptadas a tu perfil, acompañamiento
              profesional y herramientas para seguir tu progreso.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#como-unirme"
                className="rounded-xl bg-cyan-500 px-6 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
              >
                Quiero empezar →
              </Link>

              <Link
                href="/programas"
                className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-bold text-slate-900 transition hover:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                Explorar programas
              </Link>
            </div>

            <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
              ¿Ya tienes una cuenta?{" "}
              <Link
                href="/login"
                className="font-bold text-cyan-700 underline dark:text-cyan-300"
              >
                Inicia sesión aquí.
              </Link>
            </p>
          </div>

          {/* IMAGEN PRINCIPAL */}

          <div className="relative min-h-[530px] lg:min-h-[510px]">
            <div className="absolute inset-x-0 top-1 bottom-20 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cyan-200 to-blue-200 shadow-xl">
              <FotoPrograma
                src={fotos.hero}
                className="h-full w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
            </div>

            {/* PANEL VISUAL */}

            <div className="absolute right-3 bottom-0 left-3 rounded-3xl border border-white/80 bg-white/95 p-5 shadow-2xl backdrop-blur-sm sm:right-5 sm:left-auto sm:w-[340px] dark:border-slate-700 dark:bg-slate-900/95">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-cyan-600">
                    EVOLUTION CENTER FIT
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    Mi entrenamiento
                  </h2>
                </div>

                <span className="rounded-full bg-cyan-50 px-3 py-2 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  Vista ilustrativa
                </span>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-violet-700 p-5 text-white">
                <p className="text-xs text-cyan-300">
                  TU PLAN DE ENTRENAMIENTO
                </p>
                <h3 className="mt-2 text-xl font-extrabold">
                  Cada sesión cuenta.
                </h3>
                <p className="mt-2 text-xs leading-6 text-slate-200">
                  Organiza tus entrenamientos y mantén tus
                  objetivos siempre a la vista.
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-cyan-50 p-4 dark:bg-cyan-950/50">
                  <p className="text-xl">📈</p>
                  <p className="mt-2 text-sm font-extrabold">
                    Mi progreso
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Registros y evolución
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                  <p className="text-xl">📅</p>
                  <p className="mt-2 text-sm font-extrabold">
                    Calendario
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sesiones y horarios
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}

      <section
        id="beneficios"
        className="scroll-mt-36 px-5 py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black sm:text-4xl">
              ¿Por qué elegir{" "}
              <span className="text-cyan-600">
                Evolution Center Fit 2.0?
              </span>
            </h2>

            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Una plataforma que conecta tus entrenamientos,
              tu entrenador y tu progreso.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {beneficios.map((item) => (
              <article
                key={item.titulo}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="text-3xl">
                  {item.icono}
                </span>

                <h3 className="mt-4 text-lg font-extrabold">
                  {item.titulo}
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  {item.texto}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}

      <section
        id="como-funciona"
        className="scroll-mt-36 bg-slate-100/80 px-5 py-20 lg:px-8 dark:bg-slate-900/60"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black sm:text-4xl">
              Así de fácil es{" "}
              <span className="text-cyan-600">
                comenzar tu evolución
              </span>
            </h2>

            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Tres pasos para organizar tu entrenamiento.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {pasos.map((paso) => (
              <article
                key={paso.numero}
                className="rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  {paso.numero}
                </div>

                <h3 className="mt-5 text-lg font-extrabold">
                  {paso.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  {paso.texto}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMAS */}

      <section
        id="programas"
        className="scroll-mt-36 px-5 py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black tracking-widest text-cyan-600">
                ENCUENTRA TU OBJETIVO
              </p>

              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Programas de{" "}
                <span className="text-cyan-600">
                  entrenamiento
                </span>
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400">
                Explora distintas orientaciones de entrenamiento
                y conoce cuál puede ajustarse a tus intereses.
              </p>
            </div>

            <Link
              href="/programas"
              className="w-fit rounded-xl bg-slate-900 px-6 py-4 text-sm font-bold text-white hover:bg-cyan-600 dark:bg-cyan-500 dark:text-slate-950"
            >
              Ver catálogo completo →
            </Link>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {programasPublicos.map((programa) => (
              <Link
                key={programa.id}
                href={`/programas#${programa.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative h-44 overflow-hidden">
                  <FotoPrograma
                    src={programa.foto}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                  />

                  <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-800">
                    {programa.icono} {programa.objetivo}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-extrabold">
                    {programa.nombre}
                  </h3>

                  <p className="mt-2 min-h-14 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {programa.descripcion}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {programa.nivel} · {programa.duracion}
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 font-bold text-cyan-700 group-hover:bg-cyan-500 group-hover:text-white">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Categorías orientativas. La disponibilidad y
            asignación real se confirman con el entrenador.
          </p>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}

      <section className="bg-slate-100/80 px-5 py-20 lg:px-8 dark:bg-slate-900/60">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-black sm:text-4xl">
            Preguntas frecuentes
          </h2>

          <div className="mt-9 space-y-4">
            {preguntas.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <summary className="cursor-pointer font-bold marker:text-cyan-600">
                  {item.q}
                </summary>

                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* COMO UNIRME */}

      <section
        id="como-unirme"
        className="scroll-mt-36 px-5 py-20 lg:px-8"
      >
        <div className="mx-auto max-w-7xl rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-700 p-8 text-white md:p-12">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black tracking-widest text-cyan-100">
                COMIENZA TU EXPERIENCIA
              </p>

              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                ¿Listo para tu próxima evolución?
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/90">
                Para formar parte de la plataforma, solicita
                tu incorporación al administrador del gimnasio.
                Recibirás una invitación para activar tu cuenta.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-7 py-4 text-sm font-extrabold text-slate-950 hover:bg-cyan-50"
            >
              Ya tengo una cuenta →
            </Link>
          </div>
        </div>
      </section>

      <PiePublico />
    </main>
  );
}
