"use client";

import {
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

type PropsCasillas = {
  id: string;
  etiqueta: string;
  digitos: string;
  cantidadEnteros: number;
  cantidadDecimales: number;
  ejemplo: string;
  onChange: (valor: string) => void;
};

type PropsNumero = {
  id: string;
  etiqueta: string;
  valor: string;
  minimo: number;
  maximo: number;
  maxDigitos: number;
  onChange: (valor: string) => void;
};

// ======================================================
// ESTILOS
// ======================================================

const estiloCampo =
  "w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface-soft,#f8fafc)] px-4 py-3 text-[var(--ecf-text,#102238)] placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/15 dark:bg-[#0b1729] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400";

const estiloEtiqueta =
  "mb-2 block text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-slate-200";

const estiloSeccion =
  "rounded-3xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface,#ffffff)] p-6 shadow-sm dark:border-white/10 dark:bg-[#111d31] dark:shadow-none sm:p-8";

const estiloCasilla =
  "flex h-12 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold tabular-nums text-slate-900 dark:border-white/20 dark:bg-[#101d31] dark:text-white sm:w-9";

const estiloFlecha =
  "flex flex-1 items-center justify-center text-[11px] font-bold text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-200 dark:hover:bg-cyan-400/10";

// ======================================================
// EQUIPAMIENTO
// ======================================================

const equipamientos = [
  { valor: "mancuernas", nombre: "Mancuernas" },
  { valor: "maquinas", nombre: "Máquinas" },
  { valor: "bandas", nombre: "Bandas elásticas" },
  { valor: "barra", nombre: "Barra" },
  { valor: "peso_corporal", nombre: "Peso corporal" },
];

// ======================================================
// UTILIDADES NUMÉRICAS
// ======================================================

function soloDigitos(
  valor: string,
  maximo: number
): string {
  return valor
    .replace(/[^0-9]/g, "")
    .slice(0, maximo);
}

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

function validarPegadoNumerico(
  evento: ClipboardEvent<HTMLInputElement>
) {
  const texto =
    evento.clipboardData.getData("text");

  if (!/^[0-9]+$/.test(texto)) {
    evento.preventDefault();
  }
}

// Convierte un valor de la base de datos
// en una secuencia de dígitos.
//
// Ejemplo:
// 75.50 -> "7550"
// 1.75  -> "175"

function numeroADigitos(
  valor: number | null | undefined,
  decimales: number
): string {
  if (
    valor == null ||
    !Number.isFinite(valor)
  ) {
    return "";
  }

  return valor
    .toFixed(decimales)
    .replace(".", "")
    .replace(/^0+(?=\d)/, "");
}

// Convierte los dígitos del formulario
// en el número correspondiente.
//
// Ejemplo:
// "7550" -> 75.50
// "175"  -> 1.75

function digitosANumero(
  digitos: string,
  decimales: number
): number | null {
  if (digitos === "") {
    return null;
  }

  return (
    Number(digitos) /
    Math.pow(10, decimales)
  );
}

// ======================================================
// CASILLAS DE PESO Y ESTATURA
// ======================================================

function CasillasMedida({
  id,
  etiqueta,
  digitos,
  cantidadEnteros,
  cantidadDecimales,
  ejemplo,
  onChange,
}: PropsCasillas) {
  const maximoDigitos =
    cantidadEnteros + cantidadDecimales;

  // Se añaden ceros a la izquierda para
  // mantener el punto en una posición fija.

  const completo = digitos.padStart(
    cantidadDecimales + 1,
    "0"
  );

  const parteEntera = completo
    .slice(0, -cantidadDecimales)
    .replace(/^0+(?=\d)/, "");

  const parteDecimal = completo.slice(
    -cantidadDecimales
  );

  const enterosVisibles =
    digitos === ""
      ? "".padStart(cantidadEnteros, " ")
      : parteEntera.padStart(
          cantidadEnteros,
          " "
        );

  return (
    <div className="space-y-2">
      <label
        htmlFor={`${id}-entrada`}
        className="relative inline-flex max-w-full cursor-text items-center gap-2 rounded-xl p-1 transition hover:bg-cyan-50/60 focus-within:ring-2 focus-within:ring-cyan-400 dark:hover:bg-cyan-400/5"
      >
        {/* PARTE ENTERA */}

        <div className="flex gap-1">
          {Array.from(
            { length: cantidadEnteros },
            (_, indice) => {
              const cifra =
                enterosVisibles[indice];

              return (
                <span
                  key={`${id}-entero-${indice}`}
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
        </div>

        {/* PUNTO FIJO */}

        <span
          aria-hidden="true"
          className="select-none text-2xl font-black text-cyan-700 dark:text-cyan-300"
        >
          .
        </span>

        {/* PARTE DECIMAL */}

        <div className="flex gap-1">
          {Array.from(
            { length: cantidadDecimales },
            (_, indice) => (
              <span
                key={`${id}-decimal-${indice}`}
                aria-hidden="true"
                className={`${estiloCasilla} ${
                  digitos === ""
                    ? "text-slate-400 dark:text-slate-500"
                    : ""
                }`}
              >
                {digitos === ""
                  ? "0"
                  : parteDecimal[indice]}
              </span>
            )
          )}
        </div>

        {/* UNA SOLA ENTRADA PARA TODAS LAS CASILLAS */}

        <input
          id={`${id}-entrada`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          pattern="[0-9]*"
          maxLength={maximoDigitos}
          value={digitos}
          onChange={(evento) =>
            onChange(
              soloDigitos(
                evento.target.value,
                maximoDigitos
              )
            )
          }
          onFocus={(evento) => {
            // Facilita reemplazar el valor completo.
            evento.currentTarget.select();
          }}
          onClick={(evento) => {
            evento.currentTarget.select();
          }}
          onKeyDown={
            bloquearCaracteresNoNumericos
          }
          onPaste={validarPegadoNumerico}
          onDrop={(evento) =>
            evento.preventDefault()
          }
          aria-label={`${etiqueta}. ${ejemplo}. Solo números, sin escribir el punto.`}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
      </label>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {ejemplo}. Un clic para escribir;
        el punto permanece fijo.
      </p>
    </div>
  );
}

// ======================================================
// CAMPO NUMÉRICO CON FLECHAS
// ======================================================

function CampoNumeroConFlechas({
  id,
  etiqueta,
  valor,
  minimo,
  maximo,
  maxDigitos,
  onChange,
}: PropsNumero) {
  function moverNumero(incremento: number) {
    if (valor === "") {
      onChange(String(minimo));
      return;
    }

    const numeroActual = Number(valor);

    const nuevoNumero = Number.isFinite(
      numeroActual
    )
      ? Math.min(
          maximo,
          Math.max(
            minimo,
            numeroActual + incremento
          )
        )
      : minimo;

    onChange(String(nuevoNumero));
  }

  const numero = Number(valor);

  const deshabilitarSubir =
    valor !== "" && numero >= maximo;

  const deshabilitarBajar =
    valor !== "" && numero <= minimo;

  return (
    <div>
      <label
        htmlFor={id}
        className={estiloEtiqueta}
      >
        {etiqueta}
      </label>

      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={maxDigitos}
          required
          value={valor}
          onChange={(evento) =>
            onChange(
              soloDigitos(
                evento.target.value,
                maxDigitos
              )
            )
          }
          onKeyDown={
            bloquearCaracteresNoNumericos
          }
          onPaste={validarPegadoNumerico}
          onDrop={(evento) =>
            evento.preventDefault()
          }
          className={`${estiloCampo} pr-12`}
          placeholder={`${minimo} a ${maximo}`}
        />

        {/* FLECHAS DENTRO DEL CAMPO */}

        <div className="absolute inset-y-1 right-1 flex w-9 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/15 dark:bg-[#13243a]">
          <button
            type="button"
            aria-label={`Aumentar ${etiqueta.toLowerCase()}`}
            disabled={deshabilitarSubir}
            onClick={() => moverNumero(1)}
            className={`${estiloFlecha} border-b border-slate-200 dark:border-white/15`}
          >
            ▲
          </button>

          <button
            type="button"
            aria-label={`Disminuir ${etiqueta.toLowerCase()}`}
            disabled={deshabilitarBajar}
            onClick={() => moverNumero(-1)}
            className={estiloFlecha}
          >
            ▼
          </button>
        </div>
      </div>
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

  // ==================================================
  // DATOS GENERALES
  // ==================================================

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

  // ==================================================
  // MEDIDAS FÍSICAS
  // ==================================================

  const [precisionAltura] = useState(() =>
    perfilInicial?.estatura_cm != null &&
    !Number.isInteger(
      perfilInicial.estatura_cm
    )
      ? 4
      : 2
  );

  const [pesoDigitos, setPesoDigitos] =
    useState(() =>
      numeroADigitos(
        perfilInicial?.peso_kg,
        2
      )
    );

  const [
    alturaDigitos,
    setAlturaDigitos,
  ] = useState(() =>
    numeroADigitos(
      perfilInicial?.estatura_cm == null
        ? null
        : perfilInicial.estatura_cm / 100,
      precisionAltura
    )
  );

  // Permite conservar la precisión original
  // de medidas que no se han editado.

  const [
    pesoModificado,
    setPesoModificado,
  ] = useState(false);

  const [
    alturaModificada,
    setAlturaModificada,
  ] = useState(false);

  // ==================================================
  // ESTADO DEL FORMULARIO
  // ==================================================

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

  function actualizarPeso(valor: string) {
    setPesoDigitos(valor);
    setPesoModificado(true);
    limpiarMensajes();
  }

  function actualizarAltura(valor: string) {
    setAlturaDigitos(valor);
    setAlturaModificada(true);
    limpiarMensajes();
  }

  // ==================================================
  // CÁLCULO DEL IMC
  // ==================================================

  const pesoCalculado = pesoModificado
    ? digitosANumero(pesoDigitos, 2)
    : (perfilInicial?.peso_kg ?? null);

  const alturaEnMetros = alturaModificada
    ? digitosANumero(
        alturaDigitos,
        precisionAltura
      )
    : perfilInicial?.estatura_cm == null
      ? null
      : perfilInicial.estatura_cm / 100;

  const imcEstimado =
    pesoCalculado !== null &&
    alturaEnMetros !== null &&
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
  // GUARDAR PERFIL EN SUPABASE
  // ==================================================

  async function guardarPerfil(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (guardando) {
      return;
    }

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

      // El peso se almacena en kg.

      const pesoValor = pesoModificado
        ? digitosANumero(pesoDigitos, 2)
        : (perfilInicial?.peso_kg ?? null);

      // La interfaz presenta metros.
      // PostgreSQL almacena centímetros.

      const metros = alturaModificada
        ? digitosANumero(
            alturaDigitos,
            precisionAltura
          )
        : perfilInicial?.estatura_cm == null
          ? null
          : perfilInicial.estatura_cm / 100;

      const estaturaValor = alturaModificada
        ? metros === null
          ? null
          : Number(
              (metros * 100).toFixed(2)
            )
        : (perfilInicial?.estatura_cm ?? null);

      // =================================================
      // VALIDACIONES
      // =================================================

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

      if (
        datos.restricciones.length > 500
      ) {
        throw new Error(
          "Las consideraciones no pueden superar los 500 caracteres."
        );
      }

      // =================================================
      // AUTENTICACIÓN
      // =================================================

      const supabase = createClient();

      const {
        data: { user },
        error: errorAuth,
      } = await supabase.auth.getUser();

      if (errorAuth || !user) {
        throw new Error(
          "Tu sesión no está disponible. Inicia sesión nuevamente."
        );
      }

      // =================================================
      // INSERTAR O ACTUALIZAR PERFIL
      // =================================================

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
      {/* ===============================================
          1. DATOS FÍSICOS
      =============================================== */}

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
                actualizarTexto(
                  "edad",
                  soloDigitos(
                    evento.target.value,
                    2
                  )
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
              digitos={pesoDigitos}
              cantidadEnteros={3}
              cantidadDecimales={2}
              ejemplo="Escribe 7550 para registrar 75.50 kg"
              onChange={actualizarPeso}
            />

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Campo opcional.
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
              digitos={alturaDigitos}
              cantidadEnteros={1}
              cantidadDecimales={
                precisionAltura
              }
              ejemplo={
                precisionAltura === 2
                  ? "Escribe 175 para registrar 1.75 m"
                  : "Escribe 17500 para registrar 1.7500 m"
              }
              onChange={actualizarAltura}
            />

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Campo opcional. La estatura se
              guarda en centímetros.
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

      {/* ===============================================
          2. OBJETIVO Y EXPERIENCIA
      =============================================== */}

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

      {/* ===============================================
          3. DISPONIBILIDAD
      =============================================== */}

      <section className={estiloSeccion}>
        <h2 className="mb-6 text-xl font-bold">
          3. Disponibilidad
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          {/* DÍAS POR SEMANA */}

          <CampoNumeroConFlechas
            id="frecuencia"
            etiqueta="Días por semana"
            valor={datos.frecuencia_semanal}
            minimo={1}
            maximo={7}
            maxDigitos={1}
            onChange={(valor) =>
              actualizarTexto(
                "frecuencia_semanal",
                valor
              )
            }
          />

          {/* MINUTOS POR SESIÓN */}

          <CampoNumeroConFlechas
            id="minutos"
            etiqueta="Minutos por sesión"
            valor={datos.minutos_por_sesion}
            minimo={15}
            maximo={240}
            maxDigitos={3}
            onChange={(valor) =>
              actualizarTexto(
                "minutos_por_sesion",
                valor
              )
            }
          />

          {/* LUGAR */}

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

      {/* ===============================================
          4. EQUIPAMIENTO
      =============================================== */}

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
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--ecf-border,#dce5ee)] bg-[var(--ecf-surface-soft,#f8fafc)] p-4 transition-colors hover:border-cyan-400/40 dark:border-white/10 dark:bg-[#0b1729] dark:hover:bg-[#112238]"
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

      {/* ===============================================
          5. CONSIDERACIONES
      =============================================== */}

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

      {/* ===============================================
          MENSAJES
      =============================================== */}

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

      {/* ===============================================
          BOTÓN DE GUARDADO
      =============================================== */}

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