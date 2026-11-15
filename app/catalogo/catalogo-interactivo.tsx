
"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

// EVOLUTION CENTER FIT 2.0
// FASE 110.7 - Catalogo profesional y responsive.
// Solo cambia la presentacion. No escribe en Supabase.

export type Ejercicio = {
  id: number;
  nombre: string;
  descripcion: string | null;
  grupo_muscular: string;
  tipo: string;
  nivel: string;
  equipamiento: string;
  lugar: string;
  activo: boolean;
};

export type Rutina = {
  id: number;
  nombre: string;
  objetivo: string;
  nivel: string;
  lugar: string;
  duracion_min: number;
  frecuencia_semanal: number;
  estado: string;
};

export type RutinaEjercicio = {
  rutina_id: number;
  ejercicio_id: number;
  orden: number;
  series: number | null;
  repeticiones: number | null;
  duracion_min: number | null;
  descanso_seg: number;
};

type Props = {
  rol: "entrenador" | "administrador";
  ejercicios: Ejercicio[];
  rutinas: Rutina[];
  relaciones: RutinaEjercicio[];
};

type Vista = "rutinas" | "ejercicios";

type NombreIcono =
  | "dumbbell"
  | "layers"
  | "calendar"
  | "search"
  | "filter"
  | "arrow"
  | "chevron"
  | "clock"
  | "menu"
  | "check"
  | "book";

const dibujos: Record<NombreIcono, ReactNode> = {
  dumbbell: (
    <>
      <path d="m6.5 6.5 11 11M4 9l5-5M15 20l5-5M2 7l5-5M17 22l5-5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  book: (
    <>
      <path d="M4 4h7a3 3 0 0 1 3 3v14H7a3 3 0 0 0-3 2V4ZM14 7a3 3 0 0 1 3-3h3v17h-3a3 3 0 0 0-3 2" />
    </>
  ),
};

function Icono({
  nombre,
  className = "h-5 w-5",
}: {
  nombre: NombreIcono;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {dibujos[nombre]}
    </svg>
  );
}

function formatear(valor: string | null | undefined) {
  if (!valor) return "No registrado";

  return valor
    .replaceAll("_", " ")
    .replace(/^./, (letra) => letra.toUpperCase());
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// FOTOGRAFIAS ILUSTRATIVAS (sin cambios en Supabase).
// Hasta 32 rutinas, cada una recibe una URL distinta.
type CategoriaFoto = "fuerza" | "cardio" | "casa" | "general";

const bancoFotos: Record<CategoriaFoto, readonly string[]> = {
  fuerza: [
    "photo-1517836357463-d25dfeac3438",
    "photo-1541534741688-6078c6bfb5c5",
    "photo-1526506118085-60ce8714f8c5",
    "photo-1605296867304-46d5465a13f1",
    "photo-1599058917212-d750089bc07e",
    "photo-1581009146145-b5ef050c2e1e",
    "photo-1571019614242-c5c5dee9f50b",
    "photo-1598971639058-fab3c3109a00",
    "photo-1517963879433-6ad2b056d712",
    "photo-1583454110551-21f2fa2afe61",
    "photo-1534438327276-14e5300c3a48",
    "photo-1540497077202-7c8a3999166f",
    "photo-1571902943202-507ec2618e8f",
    "photo-1517838277536-f5f99be501cd",
  ],
  cardio: [
    "photo-1538805060514-97d9cc17730c",
    "photo-1648995361141-30676a75fd27",
    "photo-1480179087180-d9f0ec044897",
    "photo-1633394782240-f81aba3f850d",
    "photo-1517649763962-0c623066013b",
    "photo-1483721310020-03333e577078",
    "photo-1549476464-37392f717541",
  ],
  casa: [
    "photo-1518611012118-696072aa579a",
    "photo-1594737625785-a6cbdabd333c",
    "photo-1596727147705-61a532a659bd",
    "photo-1758599880358-0661cbb1a595",
    "photo-1534258936925-c58bed479fcb",
  ],
  general: [
    "photo-1571019613454-1cb2f99b2d8b",
    "photo-1591258370814-01609b341790",
    "photo-1591311630200-ffa9120a540f",
    "photo-1584735935682-2f2b69dff9d2",
    "photo-1599058945522-28d584b6f0ff",
    "photo-1566241142559-40e1dab266c6",
  ],
};

const fotosDisponibles = Array.from(new Set(Object.values(bancoFotos).flat()));

function urlFoto(id: string) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
}

function categoriaDeRutina(rutina: Rutina): CategoriaFoto {
  const texto = normalizar(`${rutina.nombre} ${rutina.objetivo}`);
  const lugar = normalizar(rutina.lugar);

  if (/fuerza|hipertrofia|muscular|potencia/.test(texto)) return "fuerza";
  if (/cardio|aerob|resistencia|grasa|adelgaza|peso/.test(texto)) return "cardio";
  if (/movilidad|flexibilidad|estiramiento|bienestar/.test(texto)) return "casa";
  if (lugar === "casa" || /bandas/.test(texto)) return "casa";
  return "general";
}

function fotosUnicasPorRutina(rutinas: Rutina[]): Map<number, string> {
  const resultado = new Map<number, string>();
  const utilizadas = new Set<string>();

  // Ordenar por ID garantiza que los filtros no cambien las fotografias.
  for (const rutina of [...rutinas].sort((a, b) => a.id - b.id)) {
    const prioridad = bancoFotos[categoriaDeRutina(rutina)];
    const candidatas = [...prioridad, ...fotosDisponibles];
    const foto = candidatas.find((id) => !utilizadas.has(id));
    const elegida = foto ?? fotosDisponibles[Math.abs(rutina.id) % fotosDisponibles.length];
    utilizadas.add(elegida);
    resultado.set(rutina.id, urlFoto(elegida));
  }

  return resultado;
}

function fotoDeEjercicio(ejercicio: Ejercicio): string {
  const texto = normalizar(`${ejercicio.nombre} ${ejercicio.grupo_muscular} ${ejercicio.tipo}`);
  const lugar = normalizar(ejercicio.lugar);
  let categoria: CategoriaFoto = "general";

  if (/cardio|aerob|correr|trote|resistencia/.test(texto)) categoria = "cardio";
  else if (/movilidad|estiramiento|flexibilidad|yoga/.test(texto)) categoria = "casa";
  else if (/pecho|espalda|hombro|biceps|triceps|brazo|fuerza|pierna|gluteo/.test(texto)) categoria = "fuerza";
  else if (lugar === "casa") categoria = "casa";

  const opciones = bancoFotos[categoria];
  return urlFoto(opciones[Math.abs(ejercicio.id) % opciones.length]);
}

function FotoRutinaCatalogo({ foto }: { foto: string }) {
  return (
    <div className="relative mb-5 h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950 via-slate-800 to-violet-950 sm:h-48">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 motion-safe:group-hover:scale-105"
        style={{ backgroundImage: `url("${foto}")` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
      <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-white">
        Fotografia ilustrativa
      </span>
    </div>
  );
}

function FotoEjercicioCatalogo({ ejercicio, mini = false }: { ejercicio: Ejercicio; mini?: boolean }) {
  const foto = fotoDeEjercicio(ejercicio);
  if (mini) {
    return (
      <div
        aria-hidden="true"
        className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-800 bg-cover bg-center dark:border-white/10 sm:h-14 sm:w-14"
        style={{ backgroundImage: `url("${foto}")` }}
      />
    );
  }
  return <FotoRutinaCatalogo foto={foto} />;
}

function Etiqueta({
  children,
  color = "cyan",
}: {
  children: ReactNode;
  color?: "cyan" | "emerald" | "amber" | "slate";
}) {
  const estilos = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-800 dark:text-cyan-200",
    emerald:
      "border-emerald-400/25 bg-emerald-400/10 text-emerald-800 dark:text-emerald-200",
    amber:
      "border-amber-400/25 bg-amber-400/10 text-amber-800 dark:text-amber-200",
    slate:
      "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${estilos[color]}`}
    >
      {children}
    </span>
  );
}

// NAVEGACION SEGUN EL ROL
function Cabecera({
  rol,
}: {
  rol: Props["rol"];
}) {
  const esEntrenador = rol === "entrenador";

  const volver = esEntrenador
    ? "/entrenador"
    : "/administrador";

  const enlaces = esEntrenador
    ? [
        { texto: "Inicio", href: "/entrenador" },
        {
          texto: "Mis clientes",
          href: "/entrenador/clientes",
        },
        {
          texto: "Investigación",
          href: "/entrenador/investigacion",
        },
        {
          texto: "Reportes",
          href: "/entrenador/investigacion/reporte",
        },
        { texto: "Catálogo", href: "/catalogo" },
      ]
    : [
        {
          texto: "Administración",
          href: "/administrador",
        },
        { texto: "Catálogo", href: "/catalogo" },
      ];

  return (
    <header className="relative z-40 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white/95 dark:bg-[#0c1526]/95 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={volver}
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-[#07121e]">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-700 dark:text-cyan-300">2.0</span>
            </span>

            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Catálogo de entrenamiento
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-1 xl:flex"
        >
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={
                enlace.href === "/catalogo"
                  ? "page"
                  : undefined
              }
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                enlace.href === "/catalogo"
                  ? "bg-cyan-400/10 text-cyan-700 dark:text-cyan-300"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              {enlace.texto}
            </Link>
          ))}
        </nav>

        <details className="relative shrink-0 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
            <Icono nombre="menu" />
            Menú
          </summary>

          <nav
            aria-label="Navegación móvil"
            className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#101d31] p-2 shadow-2xl shadow-black/50"
          >
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={
                  enlace.href === "/catalogo"
                    ? "page"
                    : undefined
                }
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                  enlace.href === "/catalogo"
                    ? "bg-cyan-400/10 text-cyan-700 dark:text-cyan-300"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                {enlace.texto}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}

function TarjetaIndicador({
  titulo,
  valor,
  icono,
  color,
}: {
  titulo: string;
  valor: number;
  icono: NombreIcono;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#172a43] to-slate-50 dark:to-[#101a2d] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.19)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_20px_42px_rgba(0,0,0,0.26)] sm:p-6">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
      >
        <Icono nombre={icono} />
      </span>

      <p className="mt-5 text-3xl font-extrabold tabular-nums text-[var(--ecf-text,#102238)] dark:text-white sm:text-4xl">
        {valor}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        {titulo}
      </p>
    </article>
  );
}

// TARJETA DE RUTINA
function TarjetaRutina({
  rutina,
  foto,
  componentes,
  ejerciciosPorId,
}: {
  rutina: Rutina;
  foto: string;
  componentes: RutinaEjercicio[];
  ejerciciosPorId: Map<number, Ejercicio>;
}) {
  const publicada = rutina.estado === "publicada";

  return (
    <article className="group min-w-0 rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#152740] to-slate-50 dark:to-[#101a2d] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.20)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_24px_55px_rgba(0,0,0,0.28)] sm:p-6">
      <FotoRutinaCatalogo foto={foto} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-800 dark:text-violet-200">
          <Icono
            nombre="layers"
            className="h-6 w-6"
          />
        </span>

        <Etiqueta color={publicada ? "emerald" : "amber"}>
          {formatear(rutina.estado)}
        </Etiqueta>
      </div>

      <h3 className="mt-5 text-xl font-extrabold leading-snug text-[var(--ecf-text,#102238)] dark:text-white">
        {rutina.nombre}
      </h3>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {formatear(rutina.objetivo)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Duración
          </p>
          <p className="mt-1 font-bold text-slate-900 dark:text-slate-100">
            {rutina.duracion_min} min
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Frecuencia
          </p>
          <p className="mt-1 font-bold text-slate-900 dark:text-slate-100">
            {rutina.frecuencia_semanal} días/sem.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Etiqueta color="cyan">
          {formatear(rutina.nivel)}
        </Etiqueta>

        <Etiqueta color="slate">
          {formatear(rutina.lugar)}
        </Etiqueta>

        <Etiqueta color="slate">
          {componentes.length} ejercicios
        </Etiqueta>
      </div>

      <details className="group/detalle mt-6 overflow-hidden rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50/90 dark:bg-[#0a1627]/70 open:border-cyan-400/25">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-cyan-800 dark:text-cyan-200 transition-colors hover:bg-cyan-400/[0.07] focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Icono
              nombre="book"
              className="h-5 w-5"
            />
            Ver ejercicios incluidos
          </span>

          <Icono
            nombre="chevron"
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-open/detalle:rotate-180"
          />
        </summary>

        <div className="border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 p-3 sm:p-4">
          {componentes.length === 0 ? (
            <p className="p-3 text-sm text-slate-500 dark:text-slate-400">
              Esta rutina todavía no tiene ejercicios
              vinculados.
            </p>
          ) : (
            <ol className="space-y-2">
              {componentes.map((item) => {
                const ejercicio = ejerciciosPorId.get(
                  item.ejercicio_id
                );

                const objetivo = [
                  item.series !== null
                    ? `${item.series} series`
                    : null,
                  item.repeticiones !== null
                    ? `${item.repeticiones} rep.`
                    : null,
                  item.duracion_min !== null
                    ? `${item.duracion_min} min`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li
                    key={`${item.rutina_id}-${item.orden}-${item.ejercicio_id}`}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.045] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                        {item.orden}
                      </span>
                      {ejercicio && <FotoEjercicioCatalogo ejercicio={ejercicio} mini />}

                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white">
                          {ejercicio?.nombre ??
                            "Ejercicio no encontrado"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {ejercicio
                            ? formatear(
                                ejercicio.grupo_muscular
                              )
                            : "Sin grupo muscular"}
                        </p>
                      </div>
                    </div>

                    <div className="pl-11 text-xs sm:pl-3 sm:text-right">
                      <p className="font-semibold text-cyan-800 dark:text-cyan-200">
                        {objetivo ||
                          "Sin objetivo detallado"}
                      </p>
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        Descanso: {item.descanso_seg} s
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </details>
    </article>
  );
}

// TARJETA DE EJERCICIO
function TarjetaEjercicio({
  ejercicio,
}: {
  ejercicio: Ejercicio;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#152740] to-slate-50 dark:to-[#101a2d] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.18)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_20px_42px_rgba(0,0,0,0.26)] sm:p-6">
      <FotoEjercicioCatalogo ejercicio={ejercicio} />
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-700 dark:text-cyan-300">
          <Icono
            nombre="dumbbell"
            className="h-6 w-6"
          />
        </span>

        <Etiqueta
          color={ejercicio.activo ? "emerald" : "amber"}
        >
          {ejercicio.activo ? "Activo" : "Inactivo"}
        </Etiqueta>
      </div>

      <h3 className="mt-5 text-lg font-bold text-[var(--ecf-text,#102238)] dark:text-white">
        {ejercicio.nombre}
      </h3>

      <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {ejercicio.descripcion ||
          "Sin descripción registrada."}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-5">
        {[
          {
            etiqueta: "Grupo muscular",
            valor: formatear(
              ejercicio.grupo_muscular
            ),
          },
          {
            etiqueta: "Nivel",
            valor: formatear(ejercicio.nivel),
          },
          {
            etiqueta: "Tipo",
            valor: formatear(ejercicio.tipo),
          },
          {
            etiqueta: "Lugar",
            valor: formatear(ejercicio.lugar),
          },
        ].map((dato) => (
          <div key={dato.etiqueta} className="min-w-0">
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              {dato.etiqueta}
            </dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
              {dato.valor}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Equipamiento
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatear(ejercicio.equipamiento)}
        </p>
      </div>
    </article>
  );
}

// CATALOGO PRINCIPAL
export default function CatalogoInteractivo({
  rol,
  ejercicios,
  rutinas,
  relaciones,
}: Props) {
  const [vista, setVista] =
    useState<Vista>("rutinas");

  const [busqueda, setBusqueda] = useState("");
  const [nivel, setNivel] = useState("todos");
  const [lugar, setLugar] = useState("todos");

  const volver =
    rol === "administrador"
      ? "/administrador"
      : "/entrenador";

  const fotosPorRutina = useMemo(() => fotosUnicasPorRutina(rutinas), [rutinas]);

  const ejerciciosPorId = useMemo(
    () =>
      new Map(
        ejercicios.map((ejercicio) => [
          ejercicio.id,
          ejercicio,
        ])
      ),
    [ejercicios]
  );

  const relacionesPorRutina = useMemo(() => {
    const resultado = new Map<
      number,
      RutinaEjercicio[]
    >();

    for (const relacion of relaciones) {
      const anteriores =
        resultado.get(relacion.rutina_id) ?? [];

      anteriores.push(relacion);
      resultado.set(relacion.rutina_id, anteriores);
    }

    for (const elementos of resultado.values()) {
      elementos.sort(
        (a, b) => a.orden - b.orden
      );
    }

    return resultado;
  }, [relaciones]);

  const texto = normalizar(busqueda.trim());

  const coincide = (
    nombre: string,
    nivelActual: string,
    lugarActual: string
  ) =>
    normalizar(nombre).includes(texto) &&
    (nivel === "todos" ||
      nivelActual === nivel) &&
    (lugar === "todos" ||
      lugarActual === lugar);

  const rutinasFiltradas = rutinas
    .filter((rutina) =>
      coincide(
        `${rutina.nombre} ${rutina.objetivo}`,
        rutina.nivel,
        rutina.lugar
      )
    )
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );

  const ejerciciosFiltrados = ejercicios
    .filter((ejercicio) =>
      coincide(
        `${ejercicio.nombre} ${ejercicio.grupo_muscular} ${ejercicio.tipo}`,
        ejercicio.nivel,
        ejercicio.lugar
      )
    )
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );

  const totalVisible =
    vista === "rutinas"
      ? rutinasFiltradas.length
      : ejerciciosFiltrados.length;

  const totalOriginal =
    vista === "rutinas"
      ? rutinas.length
      : ejercicios.length;

  const hayFiltros =
    busqueda.trim() !== "" ||
    nivel !== "todos" ||
    lugar !== "todos";

  function limpiarFiltros() {
    setBusqueda("");
    setNivel("todos");
    setLugar("todos");
  }

  const campo =
    "min-h-12 w-full rounded-xl border border-slate-300 dark:border-white/15 " +
    "bg-[var(--ecf-surface-soft,#f8fafc)] dark:bg-[#0b1628] px-4 py-3 text-sm text-[var(--ecf-text,#102238)] dark:text-white outline-none " +
    "transition-colors focus:border-cyan-400/70 " +
    "focus:ring-2 focus:ring-cyan-400/20";

  return (
    <main className="relative min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] text-[var(--ecf-text,#102238)] dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-cyan-500/[0.06] to-transparent"
      />

      <Cabecera rol={rol} />

      <div className="relative mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        {/* BIENVENIDA */}
        <section className="overflow-hidden rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-cyan-50 dark:from-[#122b40] via-white dark:via-[#111d32] to-violet-50 dark:to-[#1a1735] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-200">
                <Icono
                  nombre="dumbbell"
                  className="h-4 w-4"
                />
                Catálogo de entrenamiento
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Ejercicios y{" "}
                <span className="text-cyan-700 dark:text-cyan-300">
                  rutinas
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                Explora los ejercicios y las rutinas
                disponibles en Supabase. Consulta
                objetivos, niveles y composición de
                cada rutina desde un mismo espacio.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={volver}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 px-5 py-3 text-sm font-semibold transition hover:bg-slate-200 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                Volver a mi panel
                <Icono
                  nombre="arrow"
                  className="h-4 w-4"
                />
              </Link>
            </div>
          </div>
        </section>

        {/* INDICADORES REALES */}
        <section
          aria-label="Resumen del catálogo"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <TarjetaIndicador
            titulo="Ejercicios registrados"
            valor={ejercicios.length}
            icono="dumbbell"
            color="bg-cyan-400/10 text-cyan-700 dark:text-cyan-300"
          />

          <TarjetaIndicador
            titulo="Rutinas registradas"
            valor={rutinas.length}
            icono="layers"
            color="bg-violet-400/10 text-violet-700 dark:text-violet-300"
          />

          <TarjetaIndicador
            titulo="Vínculos rutina-ejercicio"
            valor={relaciones.length}
            icono="calendar"
            color="bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
          />
        </section>

        {/* EXPLORADOR */}
        <section aria-labelledby="titulo-explorador">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
              Explorador
            </p>

            <h2
              id="titulo-explorador"
              className="mt-2 text-2xl font-bold sm:text-3xl"
            >
              Descubre el catálogo
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Selecciona una vista, utiliza los filtros y
              consulta los detalles de los registros.
            </p>
          </div>

          {/* PESTAÑAS */}
          <div
            aria-label="Tipo de catálogo"
            className="flex flex-wrap gap-3"
          >
            <button
              type="button"
              aria-pressed={vista === "rutinas"}
              onClick={() => setVista("rutinas")}
              className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-lg shadow-black/10 transition-[transform,background-color,border-color] duration-200 motion-safe:hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                vista === "rutinas"
                  ? "bg-cyan-400 text-[#07121e]"
                  : "border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <Icono
                nombre="layers"
                className="h-4 w-4"
              />
              Rutinas
            </button>

            <button
              type="button"
              aria-pressed={vista === "ejercicios"}
              onClick={() => setVista("ejercicios")}
              className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-lg shadow-black/10 transition-[transform,background-color,border-color] duration-200 motion-safe:hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                vista === "ejercicios"
                  ? "bg-cyan-400 text-[#07121e]"
                  : "border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <Icono
                nombre="dumbbell"
                className="h-4 w-4"
              />
              Ejercicios
            </button>
          </div>

          {/* FILTROS */}
          <div className="mt-5 grid gap-4 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-4 shadow-[0_14px_35px_rgba(0,0,0,0.16)] sm:p-5 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
            <div className="min-w-0">
              <label
                htmlFor="buscar-catalogo"
                className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Buscar
              </label>

              <div className="relative">
                <Icono
                  nombre="search"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                />

                <input
                  id="buscar-catalogo"
                  type="search"
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(e.target.value)
                  }
                  placeholder={
                    vista === "rutinas"
                      ? "Buscar rutinas u objetivos..."
                      : "Buscar ejercicios o grupos musculares..."
                  }
                  className={`${campo} pl-11`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="nivel-catalogo"
                className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Nivel
              </label>

              <select
                id="nivel-catalogo"
                value={nivel}
                onChange={(e) =>
                  setNivel(e.target.value)
                }
                className={campo}
              >
                <option value="todos">
                  Todos los niveles
                </option>
                <option value="principiante">
                  Principiante
                </option>
                <option value="intermedio">
                  Intermedio
                </option>
                <option value="avanzado">
                  Avanzado
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="lugar-catalogo"
                className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Lugar
              </label>

              <select
                id="lugar-catalogo"
                value={lugar}
                onChange={(e) =>
                  setLugar(e.target.value)
                }
                className={campo}
              >
                <option value="todos">
                  Todos los lugares
                </option>
                <option value="gimnasio">
                  Gimnasio
                </option>
                <option value="casa">
                  Casa
                </option>
                <option value="mixto">
                  Mixto
                </option>
              </select>
            </div>
          </div>

          {/* RESULTADOS */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p
              role="status"
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              {totalVisible} de {totalOriginal}{" "}
              {vista === "rutinas"
                ? "rutinas visibles"
                : "ejercicios visibles"}
            </p>

            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300 transition hover:bg-cyan-400/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                <Icono
                  nombre="filter"
                  className="h-4 w-4"
                />
                Limpiar filtros
              </button>
            )}
          </div>

          {/* LISTADO DE RUTINAS */}
          {vista === "rutinas" ? (
            <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
              {rutinasFiltradas.map((rutina) => (
                <TarjetaRutina
                  key={rutina.id}
                  rutina={rutina}
                  foto={fotosPorRutina.get(rutina.id) ?? urlFoto(bancoFotos.general[0])}
                  componentes={
                    relacionesPorRutina.get(
                      rutina.id
                    ) ?? []
                  }
                  ejerciciosPorId={ejerciciosPorId}
                />
              ))}
            </div>
          ) : (
            /* LISTADO DE EJERCICIOS */
            <div className="mt-5 grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
              {ejerciciosFiltrados.map((ejercicio) => (
                <TarjetaEjercicio
                  key={ejercicio.id}
                  ejercicio={ejercicio}
                />
              ))}
            </div>
          )}

          {/* SIN COINCIDENCIAS */}
          {totalVisible === 0 && (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-10 text-center shadow-lg shadow-black/10">
              <Icono
                nombre="search"
                className="mx-auto h-10 w-10 text-slate-600 dark:text-slate-500"
              />

              <h3 className="mt-4 text-xl font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                No se encontraron resultados
              </h3>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Prueba otros filtros para encontrar
                {vista === "rutinas"
                  ? " rutinas."
                  : " ejercicios."}
              </p>

              {hayFiltros && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="mt-5 min-h-11 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  Mostrar todos
                </button>
              )}
            </div>
          )}
        </section>

        {/* NOTA FUNCIONAL */}
        <section className="rounded-2xl border border-cyan-400/15 bg-gradient-to-r from-cyan-500/[0.07] to-violet-500/[0.07] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-700 dark:text-cyan-300">
              <Icono nombre="check" />
            </span>

            <div>
              <h2 className="font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                Consulta de entrenamiento
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Este catálogo muestra las rutinas y
                ejercicios registrados. Consultar una
                rutina no significa que haya sido
                aprobada o asignada a un cliente.
                Las asignaciones se gestionan mediante
                los procesos autorizados del sistema.
              </p>
            </div>
          </div>
        </section>

        <footer className="pt-2 text-center text-xs text-slate-600 dark:text-slate-500">
          Evolution Center Fit 2.0 · Catálogo de entrenamiento
        </footer>
      </div>
    </main>
  );
}
