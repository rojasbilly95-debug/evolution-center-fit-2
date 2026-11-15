
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  EncabezadoPublico,
  PiePublico,
  FotoPrograma,
  fotos,
  programasPublicos,
} from "../_components/web-publica";

const objetivos = [
  "Todos",
  "Inicio",
  "Fuerza",
  "Pérdida de grasa",
  "Resistencia",
  "Bienestar",
];

const niveles = [
  "Todos",
  "Principiante",
  "Intermedio",
];

const lugares = [
  "Todos",
  "Gimnasio",
  "Casa",
  "Mixto",
];

export default function CatalogoPublico() {
  const [busqueda, setBusqueda] = useState("");
  const [objetivo, setObjetivo] = useState("Todos");
  const [nivel, setNivel] = useState("Todos");
  const [lugar, setLugar] = useState("Todos");
  const [expandido, setExpandido] = useState<string | null>(null);

  const programasFiltrados = useMemo(() => {
    return programasPublicos.filter((programa) => {
      const texto = [
        programa.nombre,
        programa.descripcion,
        programa.objetivo,
      ]
        .join(" ")
        .toLocaleLowerCase("es");

      const coincideBusqueda = texto.includes(
        busqueda.trim().toLocaleLowerCase("es")
      );

      return (
        coincideBusqueda &&
        (objetivo === "Todos" ||
          programa.objetivo === objetivo) &&
        (nivel === "Todos" ||
          programa.nivel === nivel) &&
        (lugar === "Todos" ||
          programa.lugar === lugar)
      );
    });
  }, [busqueda, objetivo, nivel, lugar]);

  function limpiarFiltros() {
    setBusqueda("");
    setObjetivo("Todos");
    setNivel("Todos");
    setLugar("Todos");
    setExpandido(null);
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EncabezadoPublico activo="programas" />

      {/* ENCABEZADO DEL CATALOGO */}

      <section className="overflow-hidden bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:px-8 lg:py-16">
          <div>
            <span className="inline-flex rounded-full border border-cyan-300 bg-white/75 px-4 py-2 text-xs font-bold text-cyan-800 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-300">
              🏋️ Entrenamiento · Objetivos · Programas
            </span>

            <h1 className="mt-6 text-4xl leading-tight font-black tracking-tight sm:text-5xl">
              Catálogo de{" "}
              <span className="bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent">
                entrenamientos
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Explora distintos estilos de entrenamiento,
              descubre sus características y encuentra
              una orientación que se adapte a tus intereses.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#explorar"
                className="rounded-xl bg-cyan-500 px-6 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
              >
                Explorar programas ↓
              </a>

              <Link
                href="/#como-unirme"
                className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                Cómo unirme
              </Link>
            </div>
          </div>

          {/* FOTOGRAFIA PRINCIPAL */}

          <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-300 to-violet-300 shadow-xl">
            <FotoPrograma
              src={fotos.fuerza}
              className="absolute inset-0"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />

            <div className="absolute right-6 bottom-6 left-6 text-white">
              <p className="text-xs font-semibold text-cyan-200">
                EVOLUTION CENTER FIT 2.0
              </p>

              <h2 className="mt-2 text-2xl font-extrabold">
                Un objetivo, múltiples caminos.
              </h2>

              <p className="mt-2 max-w-md text-sm text-white/85">
                La rutina definitiva se selecciona de acuerdo
                con tu perfil y la revisión del entrenador.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BARRA DE PRESENTACION */}

      <section className="px-5 pt-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-700 px-6 py-5 text-white">
          <h2 className="text-lg font-black">
            ⚡ Entrenamientos para avanzar a tu ritmo
          </h2>

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-white/90">
            <span>✓ Objetivos definidos</span>
            <span>✓ Distintos niveles</span>
            <span>✓ Supervisión profesional</span>
          </div>
        </div>
      </section>

      {/* CATALOGO CON FILTROS */}

      <section
        id="explorar"
        className="scroll-mt-36 px-5 py-12 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl items-start gap-7 lg:grid-cols-[270px_minmax(0,1fr)]">

          {/* PANEL LATERAL DE FILTROS */}

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-28 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-extrabold">
              Filtrar programas
            </h2>

            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
              Selecciona las características que te interesan.
            </p>

            <div className="mt-6 space-y-5">

              {/* BUSCADOR */}

              <div>
                <label
                  htmlFor="buscar-programa"
                  className="mb-2 block text-sm font-bold"
                >
                  Buscar
                </label>

                <input
                  id="buscar-programa"
                  type="search"
                  placeholder="Ej. fuerza, inicio..."
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              {/* FILTRO OBJETIVO */}

              <div>
                <label
                  htmlFor="objetivo"
                  className="mb-2 block text-sm font-bold"
                >
                  Objetivo
                </label>

                <select
                  id="objetivo"
                  value={objetivo}
                  onChange={(e) =>
                    setObjetivo(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {objetivos.map((opcion) => (
                    <option
                      key={opcion}
                      value={opcion}
                    >
                      {opcion}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTRO NIVEL */}

              <div>
                <label
                  htmlFor="nivel"
                  className="mb-2 block text-sm font-bold"
                >
                  Nivel
                </label>

                <select
                  id="nivel"
                  value={nivel}
                  onChange={(e) =>
                    setNivel(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {niveles.map((opcion) => (
                    <option
                      key={opcion}
                      value={opcion}
                    >
                      {opcion}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTRO LUGAR */}

              <div>
                <label
                  htmlFor="lugar"
                  className="mb-2 block text-sm font-bold"
                >
                  Lugar de entrenamiento
                </label>

                <select
                  id="lugar"
                  value={lugar}
                  onChange={(e) =>
                    setLugar(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {lugares.map((opcion) => (
                    <option
                      key={opcion}
                      value={opcion}
                    >
                      {opcion}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={limpiarFiltros}
                className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Limpiar filtros
              </button>
            </div>

            {/* RECOMENDACION */}

            <div className="mt-6 rounded-2xl bg-cyan-50 p-5 dark:bg-cyan-950/40">
              <h3 className="text-sm font-extrabold">
                ✨ ¿No sabes por dónde comenzar?
              </h3>

              <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                Tu entrenador puede evaluar qué rutina
                es compatible con tu perfil.
              </p>

              <Link
                href="/#como-unirme"
                className="mt-4 inline-flex w-full justify-center rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white dark:bg-cyan-500 dark:text-slate-950"
              >
                Conocer cómo unirme →
              </Link>
            </div>
          </aside>

          {/* RESULTADOS DEL CATALOGO */}

          <div className="min-w-0">
            <h2 className="text-2xl font-black">
              Explora nuestros programas
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {programasFiltrados.length} categorías encontradas
            </p>

            {/* FILTROS RAPIDOS */}

            <div className="mt-6 flex flex-wrap gap-2">
              {objetivos.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() =>
                    setObjetivo(opcion)
                  }
                  aria-pressed={objetivo === opcion}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                    objetivo === opcion
                      ? "border-slate-900 bg-slate-900 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {opcion}
                </button>
              ))}
            </div>

            {/* TARJETAS DE PROGRAMAS */}

            {programasFiltrados.length > 0 ? (
              <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {programasFiltrados.map((programa) => (
                  <article
                    id={programa.id}
                    key={programa.id}
                    className="scroll-mt-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <FotoPrograma
                        src={programa.foto}
                        className="h-full w-full"
                      />

                      <div className="absolute top-3 left-3 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-900 shadow">
                        {programa.icono} {programa.objetivo}
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-black">
                        {programa.nombre}
                      </h3>

                      <p className="mt-2 min-h-24 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {programa.descripcion}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {programa.nivel}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {programa.lugar}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {programa.duracion}
                        </span>
                      </div>

                      {/* DETALLES DESPLEGABLES */}

                      <button
                        type="button"
                        aria-expanded={
                          expandido === programa.id
                        }
                        onClick={() =>
                          setExpandido(
                            expandido === programa.id
                              ? null
                              : programa.id
                          )
                        }
                        className="mt-5 w-full rounded-xl border border-cyan-400 px-4 py-3 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-slate-800"
                      >
                        {expandido === programa.id
                          ? "Ocultar detalles ↑"
                          : "Ver detalles →"}
                      </button>

                      {expandido === programa.id && (
                        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                          <p className="text-xs font-extrabold">
                            ¿Qué puedes encontrar?
                          </p>

                          <ul className="mt-3 space-y-2">
                            {programa.detalles.map(
                              (detalle) => (
                                <li
                                  key={detalle}
                                  className="flex items-start gap-2 text-xs leading-6 text-slate-600 dark:text-slate-300"
                                >
                                  <span className="text-cyan-600">
                                    ✓
                                  </span>
                                  <span>
                                    {detalle}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>

                          <Link
                            href="/#como-unirme"
                            className="mt-5 inline-flex text-xs font-bold text-cyan-700 underline dark:text-cyan-300"
                          >
                            Cómo acceder a la plataforma
                          </Link>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="text-3xl">
                  🔎
                </p>

                <h3 className="mt-4 text-xl font-extrabold">
                  No encontramos coincidencias
                </h3>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Prueba con otro objetivo, nivel o lugar.
                </p>

                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="mt-5 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950"
                >
                  Mostrar todos
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MENSAJE FINAL */}

      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-700 p-8 text-white md:p-12">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-3xl font-black">
                ¿Listo para comenzar?
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/90">
                Estas categorías son orientativas y no
                representan una asignación de rutina.
                El gimnasio confirma el acceso y el entrenador
                selecciona el plan correspondiente.
              </p>
            </div>

            <Link
              href="/#como-unirme"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-7 py-4 text-sm font-extrabold text-slate-900"
            >
              Conocer cómo unirme →
            </Link>
          </div>
        </div>
      </section>

      <PiePublico />
    </main>
  );
}
