
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Perfil = {
  edad: number;
  peso_kg: number | null;
  estatura_cm: number | null;
  objetivo: string;
  experiencia: string;
  frecuencia_semanal: number;
  minutos_por_sesion: number;
  lugar: string;
  equipamiento: string[];
  restricciones: string | null;
};

type DatosFormulario = {
  edad: string;
  peso_kg: string;
  estatura_cm: string;
  objetivo: string;
  experiencia: string;
  frecuencia_semanal: string;
  minutos_por_sesion: string;
  lugar: string;
  equipamiento: string[];
  restricciones: string;
};

type CampoTexto = Exclude<
  keyof DatosFormulario,
  "equipamiento"
>;

const equipamientos = [
  { valor: "mancuernas", nombre: "Mancuernas" },
  { valor: "maquinas", nombre: "Máquinas" },
  { valor: "bandas", nombre: "Bandas elásticas" },
  { valor: "barra", nombre: "Barra" },
  { valor: "peso_corporal", nombre: "Peso corporal" },
];

const estiloCampo =
  "w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400";

const estiloEtiqueta =
  "mb-2 block text-sm font-semibold text-slate-200";

export default function FormularioPerfil({
  perfilInicial,
}: {
  perfilInicial: Perfil | null;
}) {
  const router = useRouter();

  const [datos, setDatos] = useState<DatosFormulario>({
    edad: perfilInicial?.edad?.toString() ?? "",
    peso_kg: perfilInicial?.peso_kg?.toString() ?? "",
    estatura_cm:
      perfilInicial?.estatura_cm?.toString() ?? "",
    objetivo: perfilInicial?.objetivo ?? "",
    experiencia: perfilInicial?.experiencia ?? "",
    frecuencia_semanal:
      perfilInicial?.frecuencia_semanal?.toString() ?? "",
    minutos_por_sesion:
      perfilInicial?.minutos_por_sesion?.toString() ?? "",
    lugar: perfilInicial?.lugar ?? "",
    equipamiento: perfilInicial?.equipamiento ?? [],
    restricciones: perfilInicial?.restricciones ?? "",
  });

  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  function actualizarTexto(
    campo: CampoTexto,
    valor: string
  ) {
    setDatos((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    setGuardado(false);
    setError("");
  }

  function cambiarEquipamiento(
    valor: string,
    seleccionado: boolean
  ) {
    setDatos((anterior) => ({
      ...anterior,
      equipamiento: seleccionado
        ? [...new Set([...anterior.equipamiento, valor])]
        : anterior.equipamiento.filter(
            (item) => item !== valor
          ),
    }));

    setGuardado(false);
    setError("");
  }

  // Vista previa informativa del IMC.
  // El valor definitivo se calcula en PostgreSQL.
  const peso = Number(datos.peso_kg);
  const altura = Number(datos.estatura_cm);

  const imcEstimado =
    datos.peso_kg.trim() !== "" &&
    datos.estatura_cm.trim() !== "" &&
    peso > 0 &&
    altura > 0
      ? (peso / Math.pow(altura / 100, 2)).toFixed(1)
      : null;

  async function guardarPerfil(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setGuardando(true);
    setGuardado(false);
    setError("");

    try {
      const edad = Number(datos.edad);
      const frecuencia = Number(datos.frecuencia_semanal);
      const minutos = Number(datos.minutos_por_sesion);

      const pesoValor =
        datos.peso_kg.trim() === ""
          ? null
          : Number(datos.peso_kg);

      const estaturaValor =
        datos.estatura_cm.trim() === ""
          ? null
          : Number(datos.estatura_cm);

      // Validaciones adicionales del formulario.
      if (
        !Number.isInteger(edad) ||
        edad < 18 ||
        edad > 90
      ) {
        throw new Error(
          "La edad debe estar entre 18 y 90 años."
        );
      }

      if (
        !Number.isInteger(frecuencia) ||
        frecuencia < 1 ||
        frecuencia > 7
      ) {
        throw new Error(
          "La frecuencia debe estar entre 1 y 7 días."
        );
      }

      if (
        !Number.isInteger(minutos) ||
        minutos < 15 ||
        minutos > 240
      ) {
        throw new Error(
          "La duración debe estar entre 15 y 240 minutos."
        );
      }

      if (
        pesoValor !== null &&
        (!Number.isFinite(pesoValor) ||
          pesoValor < 30 ||
          pesoValor > 300)
      ) {
        throw new Error(
          "El peso debe estar entre 30 y 300 kg."
        );
      }

      if (
        estaturaValor !== null &&
        (!Number.isFinite(estaturaValor) ||
          estaturaValor < 120 ||
          estaturaValor > 230)
      ) {
        throw new Error(
          "La estatura debe estar entre 120 y 230 cm."
        );
      }

      if (datos.restricciones.length > 500) {
        throw new Error(
          "Las restricciones no pueden superar los 500 caracteres."
        );
      }

      const supabase = createClient();

      // Obtener identidad real de la sesión.
      const {
        data: { user },
        error: errorAuth,
      } = await supabase.auth.getUser();

      if (errorAuth || !user) {
        throw new Error(
          "Tu sesión no está disponible. Inicia sesión nuevamente."
        );
      }

      // Crear o actualizar únicamente el propio perfil.
      const { error: errorGuardado } = await supabase
        .from("perfiles_clientes")
        .upsert(
          {
            usuario_id: user.id,
            edad,
            peso_kg: pesoValor,
            estatura_cm: estaturaValor,
            objetivo: datos.objetivo,
            experiencia: datos.experiencia,
            frecuencia_semanal: frecuencia,
            minutos_por_sesion: minutos,
            lugar: datos.lugar,
            equipamiento: datos.equipamiento,
            restricciones:
              datos.restricciones.trim() || null,
          },
          {
            onConflict: "usuario_id",
          }
        );

      if (errorGuardado) {
        throw new Error(errorGuardado.message);
      }

      setGuardado(true);
      router.refresh();
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Ocurrió un error al guardar el perfil."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={guardarPerfil}
      className="space-y-7"
    >
      {/* DATOS FÍSICOS */}
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
        <h2 className="mb-6 text-xl font-bold">
          1. Datos físicos
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="edad" className={estiloEtiqueta}>
              Edad (años)
            </label>
            <input
              id="edad"
              type="number"
              min="18"
              max="90"
              step="1"
              required
              value={datos.edad}
              onChange={(e) =>
                actualizarTexto("edad", e.target.value)
              }
              className={estiloCampo}
            />
          </div>

          <div>
            <label htmlFor="peso" className={estiloEtiqueta}>
              Peso (kg)
            </label>
            <input
              id="peso"
              type="number"
              min="30"
              max="300"
              step="0.01"
              placeholder="Opcional"
              value={datos.peso_kg}
              onChange={(e) =>
                actualizarTexto("peso_kg", e.target.value)
              }
              className={estiloCampo}
            />
          </div>

          <div>
            <label htmlFor="estatura" className={estiloEtiqueta}>
              Estatura (cm)
            </label>
            <input
              id="estatura"
              type="number"
              min="120"
              max="230"
              step="0.01"
              placeholder="Opcional"
              value={datos.estatura_cm}
              onChange={(e) =>
                actualizarTexto(
                  "estatura_cm",
                  e.target.value
                )
              }
              className={estiloCampo}
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-800 p-4">
          <p className="text-sm text-slate-400">
            IMC estimado
          </p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">
            {imcEstimado ?? "No disponible"}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Indicador orientativo. No constituye
            una evaluación médica.
          </p>
        </div>
      </section>

      {/* OBJETIVO Y EXPERIENCIA */}
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
        <h2 className="mb-6 text-xl font-bold">
          2. Objetivo y experiencia
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="objetivo" className={estiloEtiqueta}>
              Objetivo principal
            </label>
            <select
              id="objetivo"
              required
              value={datos.objetivo}
              onChange={(e) =>
                actualizarTexto("objetivo", e.target.value)
              }
              className={estiloCampo}
            >
              <option value="" disabled>
                Selecciona un objetivo
              </option>
              <option value="perder_grasa">
                Pérdida de grasa
              </option>
              <option value="ganar_masa_muscular">
                Ganancia muscular
              </option>
              <option value="mejorar_resistencia">
                Mejorar resistencia
              </option>
              <option value="mejorar_condicion_fisica">
                Mejorar condición física
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="experiencia" className={estiloEtiqueta}>
              Experiencia
            </label>
            <select
              id="experiencia"
              required
              value={datos.experiencia}
              onChange={(e) =>
                actualizarTexto(
                  "experiencia",
                  e.target.value
                )
              }
              className={estiloCampo}
            >
              <option value="" disabled>
                Selecciona tu nivel
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
        </div>
      </section>

      {/* DISPONIBILIDAD */}
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
        <h2 className="mb-6 text-xl font-bold">
          3. Disponibilidad
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="frecuencia" className={estiloEtiqueta}>
              Días por semana
            </label>
            <input
              id="frecuencia"
              type="number"
              min="1"
              max="7"
              step="1"
              required
              value={datos.frecuencia_semanal}
              onChange={(e) =>
                actualizarTexto(
                  "frecuencia_semanal",
                  e.target.value
                )
              }
              className={estiloCampo}
            />
          </div>

          <div>
            <label htmlFor="minutos" className={estiloEtiqueta}>
              Minutos por sesión
            </label>
            <input
              id="minutos"
              type="number"
              min="15"
              max="240"
              step="1"
              required
              value={datos.minutos_por_sesion}
              onChange={(e) =>
                actualizarTexto(
                  "minutos_por_sesion",
                  e.target.value
                )
              }
              className={estiloCampo}
            />
          </div>

          <div>
            <label htmlFor="lugar" className={estiloEtiqueta}>
              Lugar
            </label>
            <select
              id="lugar"
              required
              value={datos.lugar}
              onChange={(e) =>
                actualizarTexto("lugar", e.target.value)
              }
              className={estiloCampo}
            >
              <option value="" disabled>
                Selecciona el lugar
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
      </section>

      {/* EQUIPAMIENTO */}
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
        <h2 className="mb-3 text-xl font-bold">
          4. Equipamiento disponible
        </h2>
        <p className="mb-6 text-sm text-slate-400">
          Puedes seleccionar varias opciones.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {equipamientos.map((equipo) => (
            <label
              key={equipo.valor}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-800 p-4"
            >
              <input
                type="checkbox"
                checked={datos.equipamiento.includes(
                  equipo.valor
                )}
                onChange={(e) =>
                  cambiarEquipamiento(
                    equipo.valor,
                    e.target.checked
                  )
                }
                className="h-5 w-5 accent-cyan-400"
              />

              <span className="text-sm">
                {equipo.nombre}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* RESTRICCIONES */}
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
        <h2 className="mb-3 text-xl font-bold">
          5. Consideraciones adicionales
        </h2>

        <p className="mb-5 text-sm text-slate-400">
          Campo opcional para indicar consideraciones
          relevantes que deberá revisar el entrenador.
          No incluyas información médica innecesaria.
        </p>

        <label htmlFor="restricciones" className={estiloEtiqueta}>
          Restricciones o consideraciones
        </label>

        <textarea
          id="restricciones"
          rows={4}
          maxLength={500}
          value={datos.restricciones}
          onChange={(e) =>
            actualizarTexto(
              "restricciones",
              e.target.value
            )
          }
          placeholder="Opcional"
          className={estiloCampo}
        />

        <p className="mt-2 text-right text-xs text-slate-400">
          {datos.restricciones.length}/500
        </p>
      </section>

      {/* MENSAJES Y GUARDADO */}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      {guardado && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          Perfil guardado correctamente en Supabase.
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 px-6 py-4 font-bold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
      >
        {guardando
          ? "Guardando información..."
          : "Guardar mi perfil"}
      </button>
    </form>
  );
}
