"use client";

import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ======================================================
// TIPOS
// ======================================================

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

type PartesMedida = {
  enteros: string;
  decimales: string;
};

type PropsCasillas = {
  id: string;
  etiqueta: string;
  enteros: string;
  decimales: string;
  cantidadEnteros: number;
  cantidadDecimales: number;
  cambiarEnteros: (valor: string) => void;
  cambiarDecimales: (valor: string) => void;
};

// ======================================================
// CONFIGURACIÓN VISUAL
// ======================================================

const equipamientos = [
  { valor: "mancuernas", nombre: "Mancuernas" },
  { valor: "maquinas", nombre: "Máquinas" },
  { valor: "bandas", nombre: "Bandas elásticas" },
  { valor: "barra", nombre: "Barra" },
  { valor: "peso_corporal", nombre: "Peso corporal" },
];

const estiloCampo =
  "w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface-soft,#f8fafc)] px-4 py-3 text-[var(--ecf-text,#102238)] placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/15 dark:bg-[#0b1729] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400";

const estiloEtiqueta =
  "mb-2 block text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-slate-200";

const estiloSeccion =
  "rounded-3xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface,#ffffff)] p-6 shadow-sm dark:border-white/10 dark:bg-[#111d31] dark:shadow-none sm:p-8";

const estiloCasilla =
  "flex h-12 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold tabular-nums text-slate-900 dark:border-white/20 dark:bg-[#101d31] dark:text-white sm:w-9";

// ======================================================
// UTILIDADES DE ENTRADA NUMÉRICA
// ======================================================

// Evita introducir puntos, comas, letras y signos.
// Las teclas de navegación y edición siguen funcionando.

function bloquearCaracteresNoNumericos(
  evento: KeyboardEvent<HTMLInputElement>
) {
  if (
    evento.ctrlKey ||
    evento.metaKey ||
    evento.altKey
  ) {
    return;
  }

  if (
    evento.key.length === 1 &&
    !/^[0-9]$/.test(evento.key)
  ) {
    evento.preventDefault();
  }
}

// No permite pegar textos que contengan signos.
// Sí permite pegar cadenas compuestas solo por números.

function validarPegadoNumerico(
  evento: ClipboardEvent<HTMLInputElement>
) {
  const texto =
    evento.clipboardData.getData("text");

  if (!/^[0-9]+$/.test(texto)) {
    evento.preventDefault();
  }
}

function soloDigitos(
  valor: string,
  maximo: number
) {
  return valor
    .replace(/[^0-9]/g, "")
    .slice(0, maximo);
}

// Convierte un número existente de la BD
// en parte entera y parte decimal.

function separarNumero(
  valor: number | null | undefined,
  cantidadDecimales: number
): PartesMedida {
  if (
    valor == null ||
    !Number.isFinite(valor)
  ) {
    return {
      enteros: "",
      decimales: "",
    };
  }

  const [enteros, decimales = ""] =
    valor.toFixed(cantidadDecimales).split(".");

  return {
    enteros,
    decimales: decimales.replace(/0+$/, ""),
  };
}

// Genera un número decimal a partir de las casillas.
// Las medidas vacías son opcionales.
// Si hay decimales, la parte entera es obligatoria.

function obtenerMedida(
  partes: PartesMedida
): number | null {
  if (
    partes.enteros === "" &&
    partes.decimales === ""
  ) {
    return null;
  }

  if (partes.enteros === "") {
    return Number.NaN;
  }

  return Number(
    `${partes.enteros}.${partes.decimales || "0"}`
  );
}

// ======================================================
// COMPONENTE DE CASILLAS NUMÉRICAS
// ======================================================

function CasillasMedida({
  id,
  etiqueta,
  enteros,
  decimales,
  cantidadEnteros,
  cantidadDecimales,
  cambiarEnteros,
  cambiarDecimales,
}: PropsCasillas) {
  const referenciaEnteros =
    useRef<HTMLInputElement>(null);

  const referenciaDecimales =
    useRef<HTMLInputElement>(null);

  // Se alinean a la derecha los enteros.
  // Ejemplo: 75 kg -> [ ][7][5]

  const enterosVisibles = enteros.padStart(
    cantidadEnteros,
    " "
  );

  function actualizarEnteros(valor: string) {
    const limpio = soloDigitos(
      valor,
      cantidadEnteros
    );

    cambiarEnteros(limpio);

    // En estatura se avanza automáticamente
    // tras introducir el único entero.
    // En peso ocurre al completar tres cifras.

    if (limpio.length === cantidadEnteros) {
      referenciaDecimales.current?.focus();
    }
  }

  function actualizarDecimales(valor: string) {
    cambiarDecimales(
      soloDigitos(valor, cantidadDecimales)
    );
  }

  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        {/* PARTE ENTERA */}

        <div className="relative flex items-center gap-1 rounded-xl focus-within:ring-2 focus-within:ring-cyan-400">
          {Array.from(
            { length: cantidadEnteros },
            (_, indice) => {
              const cifra =
                enterosVisibles[indice];

              return (
                <span
                  key={`entero-${indice}`}
                  aria-hidden="true"
                  className={estiloCasilla}
                >
                  {cifra === " "
                    ? "\u00A0"
                    : cifra}
                </span>
              );
            }
          )}

          <input
            ref={referenciaEnteros}
            id={`${id}-enteros`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            pattern="[0-9]*"
            maxLength={cantidadEnteros}
            value={enteros}
            onChange={(evento) =>
              actualizarEnteros(
                evento.target.value
              )
            }
            onKeyDown={
              bloquearCaracteresNoNumericos
            }
            onPaste={validarPegadoNumerico}
            onDrop={(evento) =>
              evento.preventDefault()
            }
            aria-label={`${etiqueta}, parte entera`}
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
        </div>

        {/* PUNTO FIJO */}

        <span
          aria-hidden="true"
          className="select-none text-2xl font-black text-cyan-700 dark:text-cyan-300"
        >
          .
        </span>

        {/* PARTE DECIMAL */}

        <div className="relative flex items-center gap-1 rounded-xl focus-within:ring-2 focus-within:ring-cyan-400">
          {Array.from(
            { length: cantidadDecimales },
            (_, indice) => {
              const cifra = decimales[indice];

              return (
                <span
                  key={`decimal-${indice}`}
                  aria-hidden="true"
                  className={`${estiloCasilla} ${
                    cifra === undefined
                      ? "text-slate-400 dark:text-slate-500"
                      : ""
                  }`}
                >
                  {cifra ?? "0"}
                </span>
              );
            }
          )}

          <input
            ref={referenciaDecimales}
            id={`${id}-decimales`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            pattern="[0-9]*"
            maxLength={cantidadDecimales}
            value={decimales}
            onChange={(evento) =>
              actualizarDecimales(
                evento.target.value
              )
            }
            onKeyDown={(evento) => {
              bloquearCaracteresNoNumericos(
                evento
              );

              if (
                evento.key === "Backspace" &&
                decimales === ""
              ) {
                referenciaEnteros.current?.focus();
              }
            }}
            onPaste={validarPegadoNumerico}
            onDrop={(evento) =>
              evento.preventDefault()
            }
            aria-label={`${etiqueta}, parte decimal`}
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Introduce solo números. El punto es fijo;
        los decimales vacíos equivalen a cero.
      </p>
    </div>
  );
}

// ======================================================
// FORMULARIO PRINCIPAL
// ======================================================

export default function FormularioPerfil({
  perfilInicial,
}: {
  perfilInicial: Perfil | null;
}) {
  const router = useRouter();

  const [datos, setDatos] =
    useState<DatosFormulario>({
      edad:
        perfilInicial?.edad?.toString() ?? "",
      objetivo:
        perfilInicial?.objetivo ?? "",
      experiencia:
        perfilInicial?.experiencia ?? "",
      frecuencia_semanal:
        perfilInicial?.frecuencia_semanal?.toString() ??
        "",
      minutos_por_sesion:
        perfilInicial?.minutos_por_sesion?.toString() ??
        "",
      lugar:
        perfilInicial?.lugar ?? "",
      equipamiento:
        perfilInicial?.equipamiento ?? [],
      restricciones:
        perfilInicial?.restricciones ?? "",
    });

  // PESO
  // Se representa en kilogramos.

  const [partesPeso, setPartesPeso] =
    useState<PartesMedida>(() =>
      separarNumero(
        perfilInicial?.peso_kg,
        2
      )
    );

  // ESTATURA
  // Se representa en metros, pero se guarda en cm.
  // Si un perfil existente tiene fracciones de cm,
  // mostramos más precisión para no ocultarlas.

  const [precisionAltura] = useState(() =>
    perfilInicial?.estatura_cm != null &&
    !Number.isInteger(
      perfilInicial.estatura_cm
    )
      ? 4
      : 2
  );

  const [partesAltura, setPartesAltura] =
    useState<PartesMedida>(() =>
      separarNumero(
        perfilInicial?.estatura_cm == null
          ? null
          : perfilInicial.estatura_cm / 100,
        precisionAltura
      )
    );

  // Permite conservar los valores originales
  // cuando se guarda sin editar las medidas.

  const [pesoModificado, setPesoModificado] =
    useState(false);

  const [
    alturaModificada,
    setAlturaModificada,
  ] = useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [guardado, setGuardado] =
    useState(false);

  const [error, setError] =
    useState("");

  function limpiarMensajes() {
    setGuardado(false);
    setError("");
  }

  function actualizarTexto(
    campo: CampoTexto,
    valor: string
  ) {
    setDatos((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    limpiarMensajes();
  }

  function actualizarEntero(
    campo:
      | "edad"
      | "frecuencia_semanal"
      | "minutos_por_sesion",
    valor: string,
    maximo: number
  ) {
    actualizarTexto(
      campo,
      soloDigitos(valor, maximo)
    );
  }

  function cambiarEquipamiento(
    valor: string,
    seleccionado: boolean
  ) {
    setDatos((anterior) => ({
      ...anterior,
      equipamiento: seleccionado
        ? [
            ...new Set([
              ...anterior.equipamiento,
              valor,
            ]),
          ]
        : anterior.equipamiento.filter(
            (item) => item !== valor
          ),
    }));

    limpiarMensajes();
  }

  function actualizarPeso(
    parte: keyof PartesMedida,
    valor: string
  ) {
    setPartesPeso((anterior) => ({
      ...anterior,
      [parte]: valor,
    }));

    setPesoModificado(true);
    limpiarMensajes();
  }

  function actualizarAltura(
    parte: keyof PartesMedida,
    valor: string
  ) {
    setPartesAltura((anterior) => ({
      ...anterior,
      [parte]: valor,
    }));

    setAlturaModificada(true);
    limpiarMensajes();
  }

  // ==================================================
  // CÁLCULO DEL IMC
  // ==================================================

  const pesoCalculado = pesoModificado
    ? obtenerMedida(partesPeso)
    : (perfilInicial?.peso_kg ?? null);

  const alturaEnMetros = alturaModificada
    ? obtenerMedida(partesAltura)
    : perfilInicial?.estatura_cm == null
      ? null
      : perfilInicial.estatura_cm / 100;

  const imcEstimado =
    pesoCalculado != null &&
    alturaEnMetros != null &&
    Number.isFinite(pesoCalculado) &&
    Number.isFinite(alturaEnMetros) &&
    pesoCalculado > 0 &&
    alturaEnMetros > 0
      ? (
          pesoCalculado /
          Math.pow(alturaEnMetros, 2)
        ).toFixed(1)
      : null;

  // ==================================================
  // GUARDAR PERFIL
  // ==================================================

  async function guardarPerfil(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setGuardando(true);
    setGuardado(false);
    setError("");

    try {
      const edad = Number(datos.edad);

      const frecuencia = Number(
        datos.frecuencia_semanal
      );

      const minutos = Number(
        datos.minutos_por_sesion
      );

      const pesoValor = pesoModificado
        ? obtenerMedida(partesPeso)
        : (perfilInicial?.peso_kg ?? null);

      const metros = alturaModificada
        ? obtenerMedida(partesAltura)
        : perfilInicial?.estatura_cm == null
          ? null
          : perfilInicial.estatura_cm / 100;

      // La base de datos utiliza centímetros.

      const estaturaValor = alturaModificada
        ? metros === null
          ? null
          : Number.isFinite(metros)
            ? Number(
                (metros * 100).toFixed(2)
              )
            : Number.NaN
        : (perfilInicial?.estatura_cm ?? null);

      // Validar edad.

      if (
        !Number.isInteger(edad) ||
        edad < 18 ||
        edad > 90
      ) {
        throw new Error(
          "La edad debe estar entre 18 y 90 años."
        );
      }

      // Validar peso.
      // Estos límites mantienen la compatibilidad
      // con las reglas actuales del proyecto.

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

      // Validar estatura en centímetros.

      if (
        estaturaValor !== null &&
        (!Number.isFinite(estaturaValor) ||
          estaturaValor < 120 ||
          estaturaValor > 230)
      ) {
        throw new Error(
          "La estatura debe estar entre 1.20 y 2.30 metros."
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

      if (!datos.objetivo) {
        throw new Error(
          "Selecciona un objetivo."
        );
      }

      if (!datos.experiencia) {
        throw new Error(
          "Selecciona tu experiencia."
        );
      }

      if (!datos.lugar) {
        throw new Error(
          "Selecciona el lugar de entrenamiento."
        );
      }

      if (datos.restricciones.length > 500) {
        throw new Error(
          "Las consideraciones no pueden superar los 500 caracteres."
        );
      }

      const supabase = createClient();

      // Identificar al usuario autenticado.

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

      const { error: errorGuardado } =
        await supabase
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
              equipamiento:
                datos.equipamiento,
              restricciones:
                datos.restricciones.trim() ||
                null,
            },
            {
              onConflict: "usuario_id",
            }
          );

      if (errorGuardado) {
        throw new Error(
          errorGuardado.message
        );
      }

      setGuardado(true);
      router.refresh();
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No se pudo guardar el perfil."
      );
    } finally {
      setGuardando(false);
    }
  }

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <form
      onSubmit={guardarPerfil}
      className="space-y-7 text-[var(--ecf-text,#102238)] dark:text-white"
    >
      {/* 1. DATOS FÍSICOS */}

      <section className={estiloSeccion}>
        <h2 className="mb-2 text-xl font-bold">
          1. Datos físicos
        </h2>

        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Completa tus datos para que el entrenador
          pueda evaluar tu perfil.
        </p>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* EDAD */}

          <div>
            <label
              htmlFor="edad"
              className={estiloEtiqueta}
            >
              Edad (años)
            </label>

            <input
              id="edad"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              required
              value={datos.edad}
              onChange={(evento) =>
                actualizarEntero(
                  "edad",
                  evento.target.value,
                  2
                )
              }
              onKeyDown={
                bloquearCaracteresNoNumericos
              }
              onPaste={validarPegadoNumerico}
              className={estiloCampo}
              placeholder="Ejemplo: 25"
            />
          </div>

          {/* PESO */}

          <div>
            <p className={estiloEtiqueta}>
              Peso (kg)
            </p>

            <CasillasMedida
              id="peso"
              etiqueta="Peso en kilogramos"
              enteros={partesPeso.enteros}
              decimales={partesPeso.decimales}
              cantidadEnteros={3}
              cantidadDecimales={2}
              cambiarEnteros={(valor) =>
                actualizarPeso(
                  "enteros",
                  valor
                )
              }
              cambiarDecimales={(valor) =>
                actualizarPeso(
                  "decimales",
                  valor
                )
              }
            />

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Opcional. Ejemplo: 75.50 kg.
              Pulsa las casillas después del punto
              para introducir decimales.
            </p>
          </div>

          {/* ESTATURA */}

          <div>
            <p className={estiloEtiqueta}>
              Estatura (m)
            </p>

            <CasillasMedida
              id="estatura"
              etiqueta="Estatura en metros"
              enteros={partesAltura.enteros}
              decimales={partesAltura.decimales}
              cantidadEnteros={1}
              cantidadDecimales={
                precisionAltura
              }
              cambiarEnteros={(valor) =>
                actualizarAltura(
                  "enteros",
                  valor
                )
              }
              cambiarDecimales={(valor) =>
                actualizarAltura(
                  "decimales",
                  valor
                )
              }
            />

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Opcional. Ejemplo: 1.75 m
              equivale a 175 cm.
            </p>
          </div>
        </div>

        {/* IMC */}

        <div className="mt-6 rounded-xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface-soft,#f8fafc)] p-4 dark:border-white/10 dark:bg-[#0b1729]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            IMC estimado
          </p>

          <p className="mt-1 text-3xl font-black text-cyan-800 dark:text-cyan-300">
            {imcEstimado ??
              "No disponible"}
          </p>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Se calcula automáticamente con
            el peso y la estatura.
            Es un indicador orientativo,
            no una evaluación médica.
          </p>
        </div>
      </section>

      {/* 2. OBJETIVO Y EXPERIENCIA */}

      <section className={estiloSeccion}>
        <h2 className="mb-6 text-xl font-bold">
          2. Objetivo y experiencia
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="objetivo"
              className={estiloEtiqueta}
            >
              Objetivo principal
            </label>

            <select
              id="objetivo"
              required
              value={datos.objetivo}
              onChange={(evento) =>
                actualizarTexto(
                  "objetivo",
                  evento.target.value
                )
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
            <label
              htmlFor="experiencia"
              className={estiloEtiqueta}
            >
              Experiencia
            </label>

            <select
              id="experiencia"
              required
              value={datos.experiencia}
              onChange={(evento) =>
                actualizarTexto(
                  "experiencia",
                  evento.target.value
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

      {/* 3. DISPONIBILIDAD */}

      <section className={estiloSeccion}>
        <h2 className="mb-6 text-xl font-bold">
          3. Disponibilidad
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label
              htmlFor="frecuencia"
              className={estiloEtiqueta}
            >
              Días por semana
            </label>

            <input
              id="frecuencia"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              required
              value={
                datos.frecuencia_semanal
              }
              onChange={(evento) =>
                actualizarEntero(
                  "frecuencia_semanal",
                  evento.target.value,
                  1
                )
              }
              onKeyDown={
                bloquearCaracteresNoNumericos
              }
              onPaste={validarPegadoNumerico}
              className={estiloCampo}
              placeholder="Ejemplo: 3"
            />
          </div>

          <div>
            <label
              htmlFor="minutos"
              className={estiloEtiqueta}
            >
              Minutos por sesión
            </label>

            <input
              id="minutos"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              required
              value={
                datos.minutos_por_sesion
              }
              onChange={(evento) =>
                actualizarEntero(
                  "minutos_por_sesion",
                  evento.target.value,
                  3
                )
              }
              onKeyDown={
                bloquearCaracteresNoNumericos
              }
              onPaste={validarPegadoNumerico}
              className={estiloCampo}
              placeholder="Ejemplo: 60"
            />
          </div>

          <div>
            <label
              htmlFor="lugar"
              className={estiloEtiqueta}
            >
              Lugar
            </label>

            <select
              id="lugar"
              required
              value={datos.lugar}
              onChange={(evento) =>
                actualizarTexto(
                  "lugar",
                  evento.target.value
                )
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

      {/* 4. EQUIPAMIENTO */}

      <section className={estiloSeccion}>
        <h2 className="mb-3 text-xl font-bold">
          4. Equipamiento disponible
        </h2>

        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Puedes seleccionar varias opciones.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {equipamientos.map((equipo) => (
            <label
              key={equipo.valor}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface-soft,#f8fafc)] p-4 transition-colors hover:border-cyan-400/40 dark:border-white/10 dark:bg-[#0b1729]"
            >
              <input
                type="checkbox"
                checked={datos.equipamiento.includes(
                  equipo.valor
                )}
                onChange={(evento) =>
                  cambiarEquipamiento(
                    equipo.valor,
                    evento.target.checked
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

      {/* 5. CONSIDERACIONES */}

      <section className={estiloSeccion}>
        <h2 className="mb-3 text-xl font-bold">
          5. Consideraciones adicionales
        </h2>

        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Indica las consideraciones relevantes
          que deba conocer el entrenador.
          Evita incluir información médica innecesaria.
        </p>

        <label
          htmlFor="restricciones"
          className={estiloEtiqueta}
        >
          Restricciones o consideraciones
        </label>

        <textarea
          id="restricciones"
          rows={4}
          maxLength={500}
          value={datos.restricciones}
          onChange={(evento) =>
            actualizarTexto(
              "restricciones",
              evento.target.value
            )
          }
          placeholder="Opcional"
          className={estiloCampo}
        />

        <p className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">
          {datos.restricciones.length}/500
        </p>
      </section>

      {/* MENSAJES */}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {guardado && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
        >
          Perfil guardado correctamente.
        </p>
      )}

      {/* GUARDAR */}

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