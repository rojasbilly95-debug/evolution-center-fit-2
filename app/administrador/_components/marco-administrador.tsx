
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

// ==========================================
// EVOLUTION CENTER FIT 2.0
// MENU ADMINISTRATIVO COMPARTIDO
// ==========================================

type Enlace = {
  texto: string;
  href: string;
};

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
        },
        {
          texto: "Invitar usuario",
          href: "/administrador/usuarios/nuevo",
        },
        {
          texto: "Entrenadores",
          href: "/administrador/entrenadores",
        },
        {
          texto: "Asignar entrenador",
          href: "/administrador/entrenadores/asignar",
        },
      ],
    },
    {
      titulo: "Entrenamiento",
      enlaces: [
        {
          texto: "Catálogo",
          href: "/administrador/catalogo",
        },
        {
          texto: "Ejercicios",
          href: "/administrador/catalogo/ejercicios",
        },
        {
          texto: "Editor de rutinas",
          href: "/administrador/catalogo/componer",
        },
        {
          texto: "Entrenamientos",
          href: "/administrador/entrenamientos",
        },
      ],
    },

    {
      titulo: "Sistema",
      enlaces: [
        {
          texto: "Supervisión IA",
          href: "/administrador/ia",
        },
        {
          texto: "Reportes operativos",
          href: "/administrador/reportes",
        },
        {
          texto: "Roles y permisos",
          href: "/administrador/roles",
        },
        {
          texto: "Historial de roles",
          href: "/administrador/roles/historial",
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
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${activo
          ? "bg-cyan-400/15 font-bold text-cyan-200 ring-1 ring-cyan-400/25"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${activo ? "bg-cyan-300" : "bg-slate-600"
          }`}
      />
      {texto}
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
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-400 hover:bg-white/5 hover:text-slate-200"
      >
        <span>{titulo}</span>

        <span
          aria-hidden="true"
          className="text-base"
        >
          {visible ? "−" : "+"}
        </span>
      </button>

      {visible && (
        <div className="space-y-1 pl-2">
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
// NAVEGACION Y CERRAR SESION
// ==========================================

function Navegacion({
  cerrarSesion,
  alNavegar,
}: {
  cerrarSesion: () => Promise<void>;
  alNavegar: () => void;
}) {
  const ruta = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* LOGO */}

      <Link
        href="/administrador"
        onClick={alNavegar}
        className="flex items-center gap-3 border-b border-white/10 px-5 py-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-[#081525]">
          E
        </span>

        <span className="min-w-0">
          <span className="block text-sm font-black leading-5 text-white">
            Evolution Center Fit{" "}
            <span className="text-cyan-300">
              2.0
            </span>
          </span>

          <span className="block text-xs text-slate-400">
            Panel administrativo
          </span>
        </span>
      </Link>

      {/* OPCIONES */}

      <nav
        aria-label="Navegación administrativa"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-5"
      >
        <Item
          texto="Inicio y resumen"
          href="/administrador"
          ruta={ruta}
          alNavegar={alNavegar}
        />

        <div className="h-px bg-white/10" />

        {SECCIONES.map((grupo) => (
          <Grupo
            key={grupo.titulo}
            {...grupo}
            ruta={ruta}
            alNavegar={alNavegar}
          />
        ))}
      </nav>

      {/* CERRAR SESION AL FINAL */}

      <div className="border-t border-white/10 p-4">
        <p className="mb-3 px-2 text-xs font-semibold text-slate-400">
          Sesión de administrador
        </p>

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="w-full rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// DISEÑO RESPONSIVO
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

  return (
    <div className="flex min-h-screen bg-[#080e1b] text-white">

      {/* MENU LATERAL PARA COMPUTADORA */}

      <aside className="sticky top-0 hidden h-screen w-[278px] shrink-0 border-r border-white/10 bg-[#101d30] lg:block">
        <Navegacion
          cerrarSesion={cerrarSesion}
          alNavegar={() => { }}
        />
      </aside>

      {/* CONTENIDO */}

      <div className="min-w-0 flex-1">

        {/* BARRA PARA CELULAR */}

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#101d30] px-4 py-3 lg:hidden">
          <span className="text-sm font-extrabold text-white">
            Evolution Center Fit{" "}
            <span className="text-cyan-300">
              2.0
            </span>
          </span>

          <button
            type="button"
            aria-label="Abrir menú de administración"
            aria-expanded={menuMovil}
            onClick={() => setMenuMovil(true)}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold"
          >
            ☰ Menú
          </button>
        </header>

        {/* OCULTAR CABECERAS ANTIGUAS.
            NO ELIMINA EL CONTENIDO. */}

        <div className="[&>main>header]:hidden">
          {children}
        </div>
      </div>

      {/* MENU DESPLEGABLE PARA CELULAR */}

      {menuMovil && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuMovil(false)}
            className="absolute inset-0 bg-black/70"
            aria-label="Cerrar menú"
          />

          <aside className="absolute inset-y-0 left-0 w-[min(88vw,310px)] bg-[#101d30] shadow-2xl">
            <div className="absolute right-3 top-2 z-10">
              <button
                type="button"
                onClick={() => setMenuMovil(false)}
                className="rounded-lg bg-[#1c314d] px-3 py-2 text-sm"
                aria-label="Cerrar navegación"
              >
                ✕
              </button>
            </div>

            <Navegacion
              cerrarSesion={cerrarSesion}
              alNavegar={() =>
                setMenuMovil(false)
              }
            />
          </aside>
        </div>
      )}
    </div>
  );
}
