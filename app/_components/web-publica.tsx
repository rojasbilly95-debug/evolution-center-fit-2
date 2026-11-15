
import Link from "next/link";

export const fotos = {
  hero: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1400&q=85",
  inicio: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=85",
  fuerza: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=85",
  grasa: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=85",
  adaptacion: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=900&q=85",
  resistencia: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=900&q=85",
  bienestar: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=85",
};

export type ProgramaPublico = {
  id: string;
  nombre: string;
  objetivo: string;
  nivel: string;
  lugar: string;
  duracion: string;
  icono: string;
  foto: string;
  descripcion: string;
  detalles: string[];
};

export const programasPublicos: ProgramaPublico[] = [
  {
    id: "inicio-fitness",
    nombre: "Inicio Fitness",
    objetivo: "Inicio",
    nivel: "Principiante",
    lugar: "Gimnasio",
    duracion: "30–45 min",
    icono: "🌱",
    foto: fotos.inicio,
    descripcion:
      "Comienza a desarrollar hábitos de actividad física y familiarízate con el entrenamiento.",
    detalles: [
      "Introducción al entrenamiento",
      "Ejercicios básicos y progresivos",
      "Orientación profesional",
    ],
  },
  {
    id: "fuerza-muscular",
    nombre: "Fuerza y masa muscular",
    objetivo: "Fuerza",
    nivel: "Intermedio",
    lugar: "Gimnasio",
    duracion: "45–60 min",
    icono: "🏋️",
    foto: fotos.fuerza,
    descripcion:
      "Explora entrenamientos orientados a desarrollar fuerza y masa muscular.",
    detalles: [
      "Ejercicios de fuerza",
      "Organización de series y repeticiones",
      "Seguimiento del cumplimiento",
    ],
  },
  {
    id: "perdida-grasa",
    nombre: "Pérdida de grasa",
    objetivo: "Pérdida de grasa",
    nivel: "Intermedio",
    lugar: "Mixto",
    duracion: "40–60 min",
    icono: "🔥",
    foto: fotos.grasa,
    descripcion:
      "Combina actividad física y constancia para trabajar hacia tus objetivos.",
    detalles: [
      "Entrenamiento adecuado al perfil",
      "Organización de sesiones semanales",
      "Control de asistencia y continuidad",
    ],
  },
  {
    id: "adaptacion",
    nombre: "Adaptación al gimnasio",
    objetivo: "Inicio",
    nivel: "Principiante",
    lugar: "Gimnasio",
    duracion: "30–45 min",
    icono: "🎯",
    foto: fotos.adaptacion,
    descripcion:
      "Conoce el entorno del gimnasio y comienza con ejercicios apropiados para tu experiencia.",
    detalles: [
      "Familiarización con equipos",
      "Aprendizaje progresivo",
      "Supervisión del entrenador",
    ],
  },
  {
    id: "resistencia",
    nombre: "Resistencia activa",
    objetivo: "Resistencia",
    nivel: "Intermedio",
    lugar: "Mixto",
    duracion: "40–60 min",
    icono: "⚡",
    foto: fotos.resistencia,
    descripcion:
      "Explora actividades orientadas a mejorar la resistencia y la condición física.",
    detalles: [
      "Trabajo de resistencia",
      "Sesiones organizadas",
      "Seguimiento de continuidad",
    ],
  },
  {
    id: "bienestar",
    nombre: "Bienestar en movimiento",
    objetivo: "Bienestar",
    nivel: "Principiante",
    lugar: "Casa",
    duracion: "20–40 min",
    icono: "🌿",
    foto: fotos.bienestar,
    descripcion:
      "Incorpora movimiento y actividad física de acuerdo con tus posibilidades.",
    detalles: [
      "Movimiento general",
      "Rutinas de nivel inicial",
      "Seguimiento de hábitos",
    ],
  },
];

export function EncabezadoPublico({
  activo = "inicio",
}: {
  activo?: "inicio" | "programas";
}) {
  const enlaces = [
    { nombre: "Inicio", href: "/" },
    { nombre: "Beneficios", href: "/#beneficios" },
    { nombre: "Cómo funciona", href: "/#como-funciona" },
    { nombre: "Programas", href: "/#programas" },
    { nombre: "Catálogo", href: "/programas" },
    { nombre: "Cómo unirme", href: "/#como-unirme" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-xl font-black text-white shadow-md shadow-cyan-500/20">
            E
          </span>

          <span>
            <span className="block text-sm font-black tracking-tight text-slate-900 dark:text-white">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-600">2.0</span>
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400">
              Plataforma inteligente de entrenamiento
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-5 lg:flex"
        >
          {enlaces.map((enlace) => {
            const seleccionado =
              (activo === "inicio" && enlace.href === "/") ||
              (activo === "programas" &&
                enlace.href === "/programas");

            return (
              <Link
                key={enlace.nombre}
                href={enlace.href}
                className={`border-b-2 py-3 text-xs font-semibold transition ${
                  seleccionado
                    ? "border-cyan-500 text-cyan-700 dark:text-cyan-300"
                    : "border-transparent text-slate-600 hover:text-cyan-600 dark:text-slate-300"
                }`}
              >
                {enlace.nombre}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/login"
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-cyan-600 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          Iniciar sesión →
        </Link>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="flex gap-5 overflow-x-auto border-t border-slate-100 px-5 py-3 text-xs font-semibold whitespace-nowrap lg:hidden dark:border-slate-800"
      >
        {enlaces.map((enlace) => (
          <Link
            key={enlace.nombre}
            href={enlace.href}
            className="text-slate-600 hover:text-cyan-600 dark:text-slate-300"
          >
            {enlace.nombre}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function PiePublico() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 py-8 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">
            EVOLUTION CENTER FIT{" "}
            <span className="text-cyan-600">2.0</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Entrenamiento, tecnología y acompañamiento.
          </p>
        </div>

        <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Link href="/">Inicio</Link>
          <Link href="/programas">Programas</Link>
          <Link href="/#como-unirme">Cómo unirme</Link>
          <Link href="/login">Iniciar sesión</Link>
        </div>

        <p className="text-xs text-slate-500">
          Prototipo académico · 2026
        </p>
      </div>
    </footer>
  );
}

export function FotoPrograma({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`bg-gradient-to-br from-cyan-200 via-slate-300 to-indigo-300 bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url("${src}")` }}
    />
  );
}
