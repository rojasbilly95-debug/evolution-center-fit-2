
"use client";

import Link from "next/link";
import { useState } from "react";

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

function formatear(texto: string) {
  return texto
    .replaceAll("_", " ")
    .replace(/^./, (letra) => letra.toUpperCase());
}

export default function CatalogoInteractivo({
  rol,
  ejercicios,
  rutinas,
  relaciones,
}: Props) {
  const [vista, setVista] = useState<
    "rutinas" | "ejercicios"
  >("rutinas");

  const [busqueda, setBusqueda] = useState("");
  const [nivel, setNivel] = useState("todos");

  const buscar = busqueda.trim().toLowerCase();

  const ejerciciosFiltrados = ejercicios.filter(
    (ejercicio) => {
      const coincideTexto =
        `${ejercicio.nombre} ${ejercicio.grupo_muscular} ${ejercicio.tipo}`
          .toLowerCase()
          .includes(buscar);

      const coincideNivel =
        nivel === "todos" ||
        ejercicio.nivel === nivel;

      return coincideTexto && coincideNivel;
    }
  );

  const rutinasFiltradas = rutinas.filter(
    (rutina) => {
      const coincideTexto =
        `${rutina.nombre} ${rutina.objetivo}`
          .toLowerCase()
          .includes(buscar);

      const coincideNivel =
        nivel === "todos" ||
        rutina.nivel === nivel;

      return coincideTexto && coincideNivel;
    }
  );

  const volver =
    rol === "administrador"
      ? "/administrador"
      : "/entrenador";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-xl font-black">
              EVOLUTION CENTER FIT
              <span className="ml-2 text-cyan-400">
                2.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Catálogo de entrenamiento
            </p>
          </div>

          <Link
            href={volver}
            className="text-sm font-medium text-cyan-400 hover:underline"
          >
            Volver a mi panel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
          HU-02 · Catálogo inteligente
        </p>

        <h2 className="mt-3 text-3xl font-black sm:text-4xl">
          Ejercicios y rutinas
        </h2>

        <p className="mt-3 text-slate-400">
          Explora el catálogo almacenado en Supabase.
          Estas rutinas todavía no están asignadas
          ni aprobadas para un cliente específico.
        </p>

        {/* RESUMEN */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              nombre: "Ejercicios",
              valor: ejercicios.length,
            },
            {
              nombre: "Rutinas",
              valor: rutinas.length,
            },
            {
              nombre: "Ejercicios asignados",
              valor: relaciones.length,
            },
          ].map((item) => (
            <div
              key={item.nombre}
              className="rounded-2xl border border-white/10 bg-slate-900 p-6"
            >
              <p className="text-sm text-slate-400">
                {item.nombre}
              </p>
              <p className="mt-2 text-3xl font-black text-cyan-400">
                {item.valor}
              </p>
            </div>
          ))}
        </div>

        {/* PESTAÑAS */}
        <div className="mt-9 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setVista("rutinas")}
            aria-pressed={vista === "rutinas"}
            className={`rounded-xl px-5 py-3 text-sm font-bold ${
              vista === "rutinas"
                ? "bg-cyan-400 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            Ver rutinas
          </button>

          <button
            type="button"
            onClick={() => setVista("ejercicios")}
            aria-pressed={vista === "ejercicios"}
            className={`rounded-xl px-5 py-3 text-sm font-bold ${
              vista === "ejercicios"
                ? "bg-cyan-400 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            Ver ejercicios
          </button>
        </div>

        {/* FILTROS */}
        <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="buscar-catalogo"
              className="mb-2 block text-sm font-medium"
            >
              Buscar
            </label>
            <input
              id="buscar-catalogo"
              type="search"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="nivel-catalogo"
              className="mb-2 block text-sm font-medium"
            >
              Nivel
            </label>
            <select
              id="nivel-catalogo"
              value={nivel}
              onChange={(e) =>
                setNivel(e.target.value)
              }
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-cyan-400"
            >
              <option value="todos">Todos</option>
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
        </div>

        {/* RUTINAS */}
        {vista === "rutinas" ? (
          <section className="mt-7 space-y-5">
            {rutinasFiltradas.length === 0 ? (
              <div className="rounded-2xl bg-slate-900 p-8 text-center text-slate-400">
                No se encontraron rutinas.
              </div>
            ) : (
              rutinasFiltradas.map((rutina) => {
                const componentes = relaciones
                  .filter(
                    (r) => r.rutina_id === rutina.id
                  )
                  .sort(
                    (a, b) => a.orden - b.orden
                  );

                return (
                  <article
                    key={rutina.id}
                    className="rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <h3 className="text-xl font-bold">
                        {rutina.nombre}
                      </h3>

                      <span className="h-fit rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                        {formatear(rutina.estado)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                      <span>{formatear(rutina.objetivo)}</span>
                      <span>· {formatear(rutina.nivel)}</span>
                      <span>· {rutina.duracion_min} min</span>
                      <span>· {rutina.frecuencia_semanal} días/sem.</span>
                      <span>· {formatear(rutina.lugar)}</span>
                    </div>

                    <h4 className="mt-7 font-semibold">
                      Ejercicios incluidos
                    </h4>

                    <div className="mt-4 space-y-3">
                      {componentes.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          Esta rutina aún no tiene ejercicios.
                        </p>
                      ) : (
                        componentes.map((item) => {
                          const ejercicio = ejercicios.find(
                            (e) =>
                              e.id === item.ejercicio_id
                          );

                          return (
                            <div
                              key={`${item.rutina_id}-${item.orden}`}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-800 p-4"
                            >
                              <div>
                                <p className="font-medium">
                                  {item.orden}.{" "}
                                  {ejercicio?.nombre ??
                                    "Ejercicio no encontrado"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {ejercicio?.grupo_muscular ??
                                    "Sin grupo muscular"}
                                </p>
                              </div>

                              <div className="text-sm text-cyan-300">
                                {item.series !== null &&
                                  `${item.series} series · `}
                                {item.repeticiones !== null
                                  ? `${item.repeticiones} rep.`
                                  : item.duracion_min !== null
                                  ? `${item.duracion_min} min`
                                  : "Sin duración"}
                                <p className="mt-1 text-xs text-slate-400">
                                  Descanso: {item.descanso_seg} s
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        ) : (
          /* EJERCICIOS */
          <section className="mt-7 grid gap-5 md:grid-cols-2">
            {ejerciciosFiltrados.length === 0 ? (
              <p className="text-slate-400">
                No se encontraron ejercicios.
              </p>
            ) : (
              ejerciciosFiltrados.map((ejercicio) => (
                <article
                  key={ejercicio.id}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-6"
                >
                  <div className="mb-4 text-3xl">
                    🏋️
                  </div>

                  <h3 className="text-lg font-bold">
                    {ejercicio.nombre}
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    {ejercicio.descripcion ??
                      "Sin descripción"}
                  </p>

                  <div className="mt-5 space-y-2 text-sm text-slate-300">
                    <p>
                      Grupo muscular:{" "}
                      {ejercicio.grupo_muscular}
                    </p>
                    <p>
                      Tipo: {formatear(ejercicio.tipo)}
                    </p>
                    <p>
                      Nivel: {formatear(ejercicio.nivel)}
                    </p>
                    <p>
                      Equipo:{" "}
                      {formatear(ejercicio.equipamiento)}
                    </p>
                    <p>
                      Lugar: {formatear(ejercicio.lugar)}
                    </p>
                    <p>
                      Estado:{" "}
                      {ejercicio.activo
                        ? "Activo"
                        : "Inactivo"}
                    </p>
                  </div>
                </article>
              ))
            )}
          </section>
        )}
      </div>
    </main>
  );
}
