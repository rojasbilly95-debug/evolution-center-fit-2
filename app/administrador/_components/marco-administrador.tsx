
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ==========================================
// EVOLUTION CENTER FIT 2.0
// FASE 126.10
// MARCO ADMINISTRATIVO RESPONSIVO
// CLARO / OSCURO / AUTOMATICO
// ==========================================

type NombreIcono =
  | "inicio"
  | "usuarios"
  | "invitar"
  | "entrenador"
  | "asignar"
  | "catalogo"
  | "ejercicios"
  | "rutinas"
  | "calendario"
  | "ia"
  | "reportes"
  | "roles"
  | "historial"
  | "salir"
  | "menu"
  | "cerrar";

type Enlace = {
  texto: string;
  href: string;
  icono: NombreIcono;
};

type PropsNavegacion = {
  cerrarSesion: () => Promise<void>;
  alNavegar: () => void;
};

// ==========================================
// ICONOS COMPARTIDOS
// ==========================================

function Icono({
  nombre,
  className = "h-5 w-5",
}: {
  nombre: NombreIcono;
  className?: string;
}) {
  const dibujos: Record<NombreIcono, ReactNode> = {
    inicio: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9" />
        <path d="M9 21v-7h6v7" />
      </>
    ),
    usuarios: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
        <path d="M16 5a3 3 0 0 1 0 6" />
        <path d="M18 15a5 5 0 0 1 3 5" />
      </>
    ),
    invitar: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3" />
        <path d="M19 8v8M15 12h8" />
      </>
    ),
    entrenador: (
      <>
        <path d="M3 10v4M6 7v10M18 7v10M21 10v4" />
        <path d="M6 12h12" />
      </>
    ),
    asignar: (
      <>
        <circle cx="8" cy="7" r="3" />
        <path d="M2 20v-2a6 6 0 0 1 12 0v2" />
        <path d="m16 13 2 2 4-4" />
      </>
    ),
    catalogo: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </>
    ),
    ejercicios: (
      <>
        <path d="M3 12h3l3-7 5 14 3-7h4" />
      </>
    ),
    rutinas: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="m3 6 1 1 2-2" />
        <path d="m3 12 1 1 2-2" />
        <path d="m3 18 1 1 2-2" />
      </>
    ),
    calendario: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
        <path d="m9 16 2 2 4-4" />
      </>
    ),
    ia: (
      <>
        <path d="m12 2 2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2Z" />
        <path d="m19 17 .8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z" />
      </>
    ),
    reportes: (
      <>
        <path d="M4 21V13h4v8M10 21V8h4v13M16 21V4h4v17" />
      </>
    ),
    roles: (
      <>
        <path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    historial: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    salir: (
      <>
        <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
        <path d="M14 7l5 5-5 5M19 12H9" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    cerrar: (
      <>
        <path d="M5 5l14 14M19 5 5 19" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dibujos[nombre]}
    </svg>
  );
}

// ==========================================
// SECCIONES DEL ADMINISTRADOR
// SE CONSERVAN TODAS LAS RUTAS
// ==========================================

const SECCIONES: {
  titulo: string;
  enlaces: Enlace[];
}[] = [
  {
    titulo: "Personas",
    enlaces: [
      {
        texto: "Usuarios",
        href: "/administrador/usuarios",
        icono: "usuarios",
      },
      {
        texto: "Invitar usuario",
        href: "/administrador/usuarios/nuevo",
        icono: "invitar",
      },
      {
        texto: "Entrenadores",
        href: "/administrador/entrenadores",
        icono: "entrenador",
      },
      {
        texto: "Asignar entrenador",
        href: "/administrador/entrenadores/asignar",
        icono: "asignar",
      },
    ],
  },
  {
    titulo: "Entrenamiento",
    enlaces: [
      {
        texto: "Catálogo",
        href: "/administrador/catalogo",
        icono: "catalogo",
      },
      {
        texto: "Ejercicios",
        href: "/administrador/catalogo/ejercicios",
        icono: "ejercicios",
      },
      {
        texto: "Editor de rutinas",
        href: "/administrador/catalogo/componer",
        icono: "rutinas",
      },
      {
        texto: "Entrenamientos",
        href: "/administrador/entrenamientos",
        icono: "calendario",
      },
    ],
  },
  {
    titulo: "Sistema",
    enlaces: [
      {
        texto: "Supervisión IA",
        href: "/administrador/ia",
        icono: "ia",
      },
      {
        texto: "Reportes operativos",
        href: "/administrador/reportes",
        icono: "reportes",
      },
      {
        texto: "Roles y permisos",
        href: "/administrador/roles",
        icono: "roles",
      },
      {
        texto: "Historial de roles",
        href: "/administrador/roles/historial",
        icono: "historial",
      },
    ],
  },
];

// ==========================================
// ENLACE DEL MENU
// ==========================================

function Item({
  texto,
  href,
  icono,
  ruta,
  alNavegar,
}: Enlace & {
  ruta: string;
  alNavegar: () => void;
}) {
  const activo = ruta === href;

  return (
    <Link
      href={href}
      onClick={alNavegar}
      aria-current={activo ? "page" : undefined}
      className={[
        "group flex min-h-11 items-center gap-3",
        "rounded-xl px-3 py-2.5 text-sm",
        "transition-colors duration-150",
        "focus-visible:outline-2",
        "focus-visible:outline-offset-2",
        "focus-visible:outline-cyan-500",
        activo
          ? [
              "bg-cyan-50 font-bold text-cyan-800",
              "ring-1 ring-cyan-200",
              "dark:bg-cyan-400/10",
              "dark:text-cyan-200",
              "dark:ring-cyan-400/20",
            ].join(" ")
          : [
              "font-medium",
              "text-slate-600 hover:bg-slate-100",
              "hover:text-slate-950",
              "dark:text-slate-300",
              "dark:hover:bg-white/10",
              "dark:hover:text-white",
            ].join(" "),
      ].join(" ")}
    >
      <Icono
        nombre={icono}
        className={[
          "h-[18px] w-[18px] shrink-0",
          activo
            ? "text-cyan-600 dark:text-cyan-300"
            : "text-slate-400 group-hover:text-cyan-600 dark:text-slate-400 dark:group-hover:text-cyan-300",
        ].join(" ")}
      />

      <span className="min-w-0 flex-1">
        {texto}
      </span>

      {activo && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500"
        />
      )}
    </Link>
  );
}

// ==========================================
// GRUPOS DESPLEGABLES
// ==========================================

function Grupo({
  titulo,
  enlaces,
  ruta,
  alNavegar,
}: {
  titulo: string;
  enlaces: Enlace[];
  ruta: string;
  alNavegar: () => void;
}) {
  const contieneRuta = enlaces.some(
    (item) => item.href === ruta
  );

  const [desplegado, setDesplegado] =
    useState(true);

  const visible = desplegado || contieneRuta;

  return (
    <section className="space-y-1">
      <button
        type="button"
        onClick={() =>
          setDesplegado((actual) => !actual)
        }
        aria-expanded={visible}
        className={[
          "flex w-full items-center",
          "justify-between rounded-lg",
          "px-3 py-2 text-left",
          "text-[11px] font-extrabold",
          "uppercase tracking-[0.13em]",
          "text-slate-500",
          "hover:bg-slate-100",
          "dark:text-slate-400",
          "dark:hover:bg-white/5",
        ].join(" ")}
      >
        <span>{titulo}</span>

        <span
          aria-hidden="true"
          className="text-base leading-none"
        >
          {visible ? "−" : "+"}
        </span>
      </button>

      {visible && (
        <div className="space-y-1">
          {enlaces.map((item) => (
            <Item
              key={item.href}
              {...item}
              ruta={ruta}
              alNavegar={alNavegar}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ==========================================
// NAVEGACION ADMINISTRATIVA
// ==========================================

function Navegacion({
  cerrarSesion,
  alNavegar,
}: PropsNavegacion) {
  const ruta = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* IDENTIDAD DE LA PLATAFORMA */}

      <Link
        href="/administrador"
        onClick={alNavegar}
        className={[
          "flex items-center gap-3",
          "border-b border-[var(--ecf-border)]",
          "px-5 py-5",
          "focus-visible:outline-2",
          "focus-visible:outline-cyan-500",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-12 w-12 shrink-0",
            "items-center justify-center",
            "rounded-2xl",
            "bg-gradient-to-br",
            "from-cyan-500 to-teal-500",
            "text-xl font-black text-white",
            "shadow-lg shadow-cyan-600/15",
          ].join(" ")}
        >
          E
        </span>

        <span className="min-w-0">
          <span className="block text-sm font-black leading-5 text-[var(--ecf-text)]">
            Evolution Center Fit
            <span className="ml-1 text-cyan-600 dark:text-cyan-300">
              2.0
            </span>
          </span>

          <span className="mt-1 block text-xs text-[var(--ecf-muted)]">
            Gestión administrativa
          </span>
        </span>
      </Link>

      {/* MENU PRINCIPAL */}

      <nav
        aria-label="Navegación administrativa"
        className={[
          "min-h-0 flex-1",
          "space-y-5 overflow-y-auto",
          "px-3 py-5",
        ].join(" ")}
      >
        <Item
          texto="Inicio y resumen"
          href="/administrador"
          icono="inicio"
          ruta={ruta}
          alNavegar={alNavegar}
        />

        <div className="mx-3 h-px bg-[var(--ecf-border)]" />

        {SECCIONES.map((grupo) => (
          <Grupo
            key={grupo.titulo}
            {...grupo}
            ruta={ruta}
            alNavegar={alNavegar}
          />
        ))}
      </nav>

      {/* PIE DEL MENU */}

      <div className="border-t border-[var(--ecf-border)] p-4">
        <div className="mb-3 rounded-xl bg-[var(--ecf-surface-soft)] p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-xs font-bold text-[var(--ecf-text)]">
              Evolution Center Fit 2.0
            </span>
          </div>

          <p className="mt-1 text-xs text-[var(--ecf-muted)]">
            Plataforma web · Panel administrativo
          </p>
        </div>

        {/* SE CONSERVA LA ACCION ORIGINAL */}

        <form action={cerrarSesion}>
          <button
            type="submit"
            className={[
              "flex min-h-11 w-full",
              "items-center gap-3 rounded-xl",
              "border border-rose-200",
              "bg-rose-50 px-4 py-3",
              "text-left text-sm font-semibold",
              "text-rose-700",
              "transition-colors",
              "hover:bg-rose-100",
              "dark:border-rose-400/20",
              "dark:bg-rose-400/10",
              "dark:text-rose-200",
              "dark:hover:bg-rose-400/20",
              "focus-visible:outline-2",
              "focus-visible:outline-rose-500",
            ].join(" ")}
          >
            <Icono nombre="salir" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// MARCO ADMINISTRATIVO RESPONSIVO
// ==========================================

export default function MarcoAdministrador({
  children,
  cerrarSesion,
}: {
  children: ReactNode;
  cerrarSesion: () => Promise<void>;
}) {
  const [menuMovil, setMenuMovil] =
    useState(false);

  const ruta = usePathname();

  // Cerrar el menú con Escape.

  useEffect(() => {
    if (!menuMovil) return;

    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setMenuMovil(false);
      }
    };

    window.addEventListener("keydown", manejarTecla);

    return () => {
      window.removeEventListener(
        "keydown",
        manejarTecla
      );
    };
  }, [menuMovil]);

  const enlaceActual = SECCIONES
    .flatMap((grupo) => grupo.enlaces)
    .find((enlace) => enlace.href === ruta);

  const tituloActual =
    ruta === "/administrador"
      ? "Inicio y resumen"
      : enlaceActual?.texto ?? "Administración";

  return (
    <div
      className={[
        "ecf-role-admin",
        "flex min-h-screen",
        "bg-[var(--ecf-bg)]",
        "text-[var(--ecf-text)]",
      ].join(" ")}
    >
      {/* ==================================
          MENU LATERAL DE COMPUTADORA
      ================================== */}

      <aside
        className={[
          "sticky top-0 hidden",
          "h-screen w-[278px]",
          "shrink-0 lg:block",
          "border-r border-[var(--ecf-border)]",
          "bg-[var(--ecf-surface)]",
        ].join(" ")}
      >
        <Navegacion
          cerrarSesion={cerrarSesion}
          alNavegar={() => {}}
        />
      </aside>

      {/* ==================================
          CONTENIDO PRINCIPAL
      ================================== */}

      <div className="min-w-0 flex-1">

        {/* ENCABEZADO ADAPTATIVO */}

        <header
          className={[
            "sticky top-0 z-30",
            "flex min-h-[76px]",
            "items-center justify-between",
            "gap-4 px-4 py-3",
            "sm:px-6 lg:px-8",
            "border-b border-[var(--ecf-border)]",
            "bg-[var(--ecf-surface)]",
            "shadow-sm",
          ].join(" ")}
        >
          {/* TITULO COMPUTADORA */}

          <div className="hidden min-w-0 lg:block">
            <p className="text-xs font-medium text-[var(--ecf-muted)]">
              Administración / {tituloActual}
            </p>

            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--ecf-text)]">
              {tituloActual}
            </h1>
          </div>

          {/* TITULO CELULAR */}

          <div className="min-w-0 lg:hidden">
            <p className="text-sm font-extrabold text-[var(--ecf-text)]">
              Evolution Center Fit
              <span className="ml-1 text-cyan-600 dark:text-cyan-300">
                2.0
              </span>
            </p>

            <p className="mt-0.5 truncate text-xs text-[var(--ecf-muted)]">
              {tituloActual}
            </p>
          </div>

          {/* INDICADOR DE ROL */}

          <div className="ml-auto hidden items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200 sm:flex">
            <Icono
              nombre="roles"
              className="h-4 w-4"
            />
            Administrador
          </div>

          {/* BOTON DEL MENU MOVIL */}

          <button
            type="button"
            aria-label="Abrir menú de administración"
            aria-expanded={menuMovil}
            aria-controls="ecf-menu-admin-movil"
            onClick={() => setMenuMovil(true)}
            className={[
              "inline-flex min-h-11",
              "items-center gap-2",
              "rounded-xl px-4 py-2",
              "border border-[var(--ecf-border)]",
              "bg-[var(--ecf-surface-soft)]",
              "text-sm font-semibold",
              "text-[var(--ecf-text)]",
              "hover:border-cyan-400",
              "lg:hidden",
            ].join(" ")}
          >
            <Icono nombre="menu" />
            Menú
          </button>
        </header>

        {/* CONTENIDO EXISTENTE
            SE CONSERVA EL COMPORTAMIENTO
            DE OCULTAR CABECERAS ANTIGUAS */}

        <div className="min-w-0 [&>main>header]:hidden">
          {children}
        </div>
      </div>

      {/* ==================================
          MENU MOVIL DESPLEGABLE
      ================================== */}

      {menuMovil && (
        <div
          id="ecf-menu-admin-movil"
          className="fixed inset-0 z-[1100] lg:hidden"
        >
          {/* FONDO OSCURECIDO */}

          <button
            type="button"
            onClick={() => setMenuMovil(false)}
            className="absolute inset-0 bg-slate-950/65"
            aria-label="Cerrar menú administrativo"
            tabIndex={-1}
          />

          {/* PANEL LATERAL */}

          <aside
            aria-label="Menú de administración"
            className={[
              "absolute inset-y-0 left-0",
              "w-[min(88vw,310px)]",
              "border-r border-[var(--ecf-border)]",
              "bg-[var(--ecf-surface)]",
              "text-[var(--ecf-text)]",
              "shadow-2xl",
            ].join(" ")}
          >
            {/* CERRAR MENU */}

            <div className="absolute right-3 top-2 z-10">
              <button
                type="button"
                onClick={() => setMenuMovil(false)}
                aria-label="Cerrar navegación"
                className={[
                  "flex h-10 w-10",
                  "items-center justify-center",
                  "rounded-xl",
                  "bg-[var(--ecf-surface-soft)]",
                  "text-[var(--ecf-text)]",
                  "hover:bg-cyan-100",
                  "dark:hover:bg-cyan-400/10",
                ].join(" ")}
              >
                <Icono nombre="cerrar" />
              </button>
            </div>

            <Navegacion
              cerrarSesion={cerrarSesion}
              alNavegar={() => setMenuMovil(false)}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
