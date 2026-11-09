
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import {
  createClient as crearClientePrivilegiado,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// ==============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.13 - ADMINISTRACION DEL CATALOGO
// Alta de borradores y consultas protegidas.
// ==============================================

type Props = {
  searchParams: Promise<{
    q?: string;
    estado?: string;
  }>;
};

type Rutina = {
  id: number;
  nombre: string;
  objetivo: string;
  nivel: string;
  lugar: string;
  frecuencia_semanal: number;
  duracion_min: number;
  estado: string;
};

type Ejercicio = {
  id: number;
  nombre: string;
  descripcion: string | null;
  grupo_muscular: string | null;
  tipo: string | null;
  nivel: string;
  lugar: string;
  equipamiento: string | null;
  activo: boolean;
};

type Relacion = {
  rutina_id: number;
  ejercicio_id: number;
};

const OBJETIVOS = [
  { valor: "perder_grasa", texto: "Perder grasa" },
  {
    valor: "ganar_masa_muscular",
    texto: "Ganar masa muscular",
  },
  {
    valor: "mejorar_resistencia",
    texto: "Mejorar resistencia",
  },
  {
    valor: "mejorar_condicion_fisica",
    texto: "Mejorar condición física",
  },
];

const NIVELES = [
  "principiante",
  "intermedio",
  "avanzado",
];

const LUGARES = [
  "gimnasio",
  "casa",
  "mixto",
];

const EQUIPOS = [
  "peso_corporal",
  "mancuernas",
  "maquinas",
  "bandas",
  "barra",
];

function texto(valor: FormDataEntryValue | null) {
  return typeof valor === "string"
    ? valor.trim().replace(/\s+/g, " ")
    : "";
}

function etiqueta(valor: string) {
  const objetivo = OBJETIVOS.find(
    (item) => item.valor === valor
  );

  return objetivo?.texto ??
    valor.replaceAll("_", " ");
}

function formatoNumero(valor: number | null) {
  return valor === null
    ? "—"
    : new Intl.NumberFormat("es-PE").format(valor);
}

// ==============================================
// SEGURIDAD DEL SERVIDOR
// ==============================================

async function obtenerAdministrador() {
  const sesion = await createClient();

  const {
    data: identidad,
    error: errorIdentidad,
  } = await sesion.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    redirect("/login");
  }

  const {
    data: acceso,
    error: errorAcceso,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorAcceso ||
    acceso?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return null;
  }

  return crearClientePrivilegiado(
    url,
    clave,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ==============================================
// CREAR EJERCICIO INACTIVO
// ==============================================

async function crearEjercicio(
  formulario: FormData
) {
  "use server";

  const admin = await obtenerAdministrador();
  const ruta = "/administrador/catalogo";

  if (!admin) {
    redirect(`${ruta}?estado=config`);
  }

  const nombre = texto(formulario.get("nombre"));
  const descripcion = texto(
    formulario.get("descripcion")
  );
  const grupo = texto(
    formulario.get("grupo_muscular")
  );
  const tipo = texto(formulario.get("tipo"));
  const nivel = texto(formulario.get("nivel"));
  const lugar = texto(formulario.get("lugar"));
  const equipamiento = texto(
    formulario.get("equipamiento")
  );

  if (
    nombre.length < 3 ||
    nombre.length > 120 ||
    descripcion.length > 700 ||
    grupo.length < 2 ||
    grupo.length > 80 ||
    tipo.length < 2 ||
    tipo.length > 60 ||
    !NIVELES.includes(nivel) ||
    !LUGARES.includes(lugar) ||
    !EQUIPOS.includes(equipamiento)
  ) {
    redirect(`${ruta}?estado=datos`);
  }

  const {
    data,
    error,
  } = await admin
    .from("ejercicios")
    .insert({
      nombre,
      descripcion: descripcion || null,
      grupo_muscular: grupo,
      tipo,
      nivel,
      lugar,
      equipamiento,
      activo: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      "Error creando ejercicio inactivo:",
      error?.code ?? "sin_respuesta"
    );

    redirect(`${ruta}?estado=error_ejercicio`);
  }

  revalidatePath(ruta);

  redirect(`${ruta}?estado=ejercicio_creado`);
}

// ==============================================
// CREAR RUTINA EN BORRADOR
// ==============================================

async function crearRutina(
  formulario: FormData
) {
  "use server";

  const admin = await obtenerAdministrador();
  const ruta = "/administrador/catalogo";

  if (!admin) {
    redirect(`${ruta}?estado=config`);
  }

  const nombre = texto(formulario.get("nombre"));
  const objetivo = texto(
    formulario.get("objetivo")
  );
  const nivel = texto(formulario.get("nivel"));
  const lugar = texto(formulario.get("lugar"));

  const frecuencia = Number(
    formulario.get("frecuencia_semanal")
  );

  const duracion = Number(
    formulario.get("duracion_min")
  );

  if (
    nombre.length < 3 ||
    nombre.length > 120 ||
    !OBJETIVOS.some(
      (item) => item.valor === objetivo
    ) ||
    !NIVELES.includes(nivel) ||
    !LUGARES.includes(lugar) ||
    !Number.isInteger(frecuencia) ||
    frecuencia < 1 ||
    frecuencia > 7 ||
    !Number.isInteger(duracion) ||
    duracion < 15 ||
    duracion > 240
  ) {
    redirect(`${ruta}?estado=datos`);
  }

  const {
    data,
    error,
  } = await admin
    .from("rutinas")
    .insert({
      nombre,
      objetivo,
      nivel,
      lugar,
      frecuencia_semanal: frecuencia,
      duracion_min: duracion,
      estado: "borrador",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      "Error creando borrador de rutina:",
      error?.code ?? "sin_respuesta"
    );

    redirect(`${ruta}?estado=error_rutina`);
  }

  revalidatePath(ruta);

  redirect(`${ruta}?estado=rutina_creada`);
}

// ==============================================
// COMPONENTES DE LA INTERFAZ
// ==============================================

function Indicador({
  nombre,
  valor,
  descripcion,
}: {
  nombre: string;
  valor: number | null;
  descripcion: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a304a] to-[#101b2d] p-5 shadow-lg shadow-black/10">
      <p className="text-xs font-semibold text-slate-400">
        {nombre}
      </p>

      <p className="mt-3 text-3xl font-black tabular-nums text-white">
        {formatoNumero(valor)}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {descripcion}
      </p>
    </article>
  );
}

function CampoSeleccion({
  nombre,
  titulo,
  opciones,
}: {
  nombre: string;
  titulo: string;
  opciones: { valor: string; texto: string }[];
}) {
  return (
    <div>
      <label
        htmlFor={nombre}
        className="mb-2 block text-sm font-semibold text-slate-200"
      >
        {titulo}
      </label>

      <select
        id={nombre}
        name={nombre}
        required
        defaultValue=""
        className="min-h-12 w-full rounded-xl border border-white/15 bg-[#081525] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400"
      >
        <option value="" disabled>
          Selecciona una opción
        </option>

        {opciones.map((opcion) => (
          <option
            key={opcion.valor}
            value={opcion.valor}
          >
            {opcion.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

function opciones(valores: string[]) {
  return valores.map((valor) => ({
    valor,
    texto: etiqueta(valor),
  }));
}

function PantallaCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08101e] p-6 text-sm text-cyan-200">
      Cargando catálogo administrativo...
    </main>
  );
}

// ==============================================
// PAGINA DEL CATALOGO ADMINISTRATIVO
// ==============================================

async function Contenido({
  searchParams,
}: Props) {
  await connection();

  const parametros = await searchParams;

  const busqueda =
    typeof parametros.q === "string"
      ? parametros.q.trim().slice(0, 80)
      : "";

  const admin = await obtenerAdministrador();

  if (!admin) {
    return (
      <main className="min-h-screen bg-[#08101e] p-6 text-white">
        <Link
          href="/administrador"
          className="text-cyan-300"
        >
          ← Volver al administrador
        </Link>

        <p className="mt-8 rounded-xl border border-amber-400/25 bg-amber-400/10 p-5">
          No están configuradas las credenciales
          privadas del servidor.
        </p>
      </main>
    );
  }

  const [
    respuestaEjercicios,
    respuestaRutinas,
    respuestaRelaciones,
  ] = await Promise.all([
    admin
      .from("ejercicios")
      .select(
        "id,nombre,descripcion,grupo_muscular,tipo,nivel,lugar,equipamiento,activo",
        { count: "exact" }
      )
      .order("id", { ascending: false })
      .limit(100),

    admin
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,lugar,frecuencia_semanal,duracion_min,estado",
        { count: "exact" }
      )
      .order("id", { ascending: false })
      .limit(100),

    admin
      .from("rutina_ejercicios")
      .select(
        "rutina_id,ejercicio_id",
        { count: "exact" }
      )
      .limit(1000),
  ]);

  const errorConsulta = Boolean(
    respuestaEjercicios.error ||
    respuestaRutinas.error ||
    respuestaRelaciones.error
  );

  if (errorConsulta) {
    return (
      <main className="min-h-screen bg-[#08101e] p-6 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/administrador"
            className="text-cyan-300"
          >
            ← Volver al administrador
          </Link>

          <div className="mt-8 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-6">
            <h1 className="text-xl font-bold">
              Error al consultar el catálogo
            </h1>

            <p className="mt-3 text-sm text-slate-300">
              Revisa la conexión, los permisos
              y la estructura de las tablas
              en Supabase.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const ejercicios =
    (respuestaEjercicios.data ?? []) as Ejercicio[];

  const rutinas =
    (respuestaRutinas.data ?? []) as Rutina[];

  const relaciones =
    (respuestaRelaciones.data ?? []) as Relacion[];

  const totalEjercicios =
    respuestaEjercicios.count;

  const totalRutinas =
    respuestaRutinas.count;

  const relacionesCompletas =
    respuestaRelaciones.count !== null &&
    respuestaRelaciones.count <=
      relaciones.length;

  const asociaciones = new Map<number, number>();

  for (const relacion of relaciones) {
    const cantidad =
      asociaciones.get(relacion.rutina_id) ?? 0;

    asociaciones.set(
      relacion.rutina_id,
      cantidad + 1
    );
  }

  const ejerciciosFiltrados =
    ejercicios.filter((ejercicio) =>
      ejercicio.nombre
        .toLocaleLowerCase("es")
        .includes(
          busqueda.toLocaleLowerCase("es")
        )
    );

  const rutinasFiltradas =
    rutinas.filter((rutina) =>
      rutina.nombre
        .toLocaleLowerCase("es")
        .includes(
          busqueda.toLocaleLowerCase("es")
        )
    );

  const publicadas = rutinas.filter(
    (rutina) => rutina.estado === "publicada"
  ).length;

  const activos = ejercicios.filter(
    (ejercicio) => ejercicio.activo
  ).length;

  const avisos: Record<string, {
    mensaje: string;
    error: boolean;
  }> = {
    ejercicio_creado: {
      mensaje:
        "Ejercicio creado como inactivo. No se utilizará en las recomendaciones hasta su activación.",
      error: false,
    },
    rutina_creada: {
      mensaje:
        "Rutina creada como borrador. Todavía no está disponible para recomendaciones.",
      error: false,
    },
    datos: {
      mensaje:
        "Revisa los campos y sus valores antes de guardar.",
      error: true,
    },
    config: {
      mensaje:
        "Falta configurar el servidor para guardar datos.",
      error: true,
    },
    error_ejercicio: {
      mensaje:
        "No se pudo guardar el ejercicio. Revisa las restricciones de la tabla y el registro del servidor.",
      error: true,
    },
    error_rutina: {
      mensaje:
        "No se pudo guardar la rutina. Revisa las restricciones de la tabla y el registro del servidor.",
      error: true,
    },
  };

  const aviso =
    typeof parametros.estado === "string"
      ? avisos[parametros.estado]
      : undefined;

  return (
    <main className="min-h-screen bg-[#08101e] text-white">
      {/* CABECERA */}

      <header className="border-b border-white/10 bg-[#101d30]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link
            href="/administrador"
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-[#07121e]">
              E
            </span>

            <span>
              <span className="block text-sm font-black">
                EVOLUTION CENTER FIT{" "}
                <span className="text-cyan-300">
                  2.0
                </span>
              </span>

              <span className="text-xs text-slate-400">
                Administración del catálogo
              </span>
            </span>
          </Link>

          <Link
            href="/administrador"
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/10"
          >
            ← Volver al panel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {/* PRESENTACION */}

        <section className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#16374c] via-[#14263c] to-[#201c3b] p-6 shadow-xl shadow-black/20 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Gestión administrativa
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Catálogo de entrenamiento
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Organiza ejercicios y rutinas,
            consulta su disponibilidad y prepara
            nuevos contenidos de entrenamiento.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#crear-contenido"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              + Crear contenido
            </a>

            <Link
              href="/catalogo"
              className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20"
            >
              Ver catálogo actual
            </Link>
          </div>
        </section>

        {aviso && (
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm ${
              aviso.error
                ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {aviso.mensaje}
          </div>
        )}

        {/* INDICADORES */}

        <section>
          <h2 className="text-xl font-bold">
            Resumen del catálogo
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador
              nombre="Ejercicios"
              valor={totalEjercicios}
              descripcion="Total de registros"
            />

            <Indicador
              nombre="Rutinas"
              valor={totalRutinas}
              descripcion="Total de registros"
            />

            <Indicador
              nombre="Ejercicios activos"
              valor={activos}
              descripcion="Dentro de los primeros 100"
            />

            <Indicador
              nombre="Rutinas publicadas"
              valor={publicadas}
              descripcion="Dentro de las primeras 100"
            />
          </div>

          {(
            (totalEjercicios ?? 0) > 100 ||
            (totalRutinas ?? 0) > 100 ||
            !relacionesCompletas
          ) && (
            <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-200">
              La consulta está limitada a 100 registros
              de cada catálogo y 1000 relaciones.
              Algunos recuentos son parciales.
            </p>
          )}
        </section>

        {/* FORMULARIOS */}

        <section id="crear-contenido" className="scroll-mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Creación de contenido
          </p>

          <h2 className="mt-2 text-2xl font-extrabold">
            Nuevos ejercicios y rutinas
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Los ejercicios se crean inactivos
            y las rutinas se crean en borrador.
          </p>

          <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
            {/* EJERCICIOS */}

            <section className="rounded-3xl border border-white/10 bg-[#15263d] p-5 shadow-lg shadow-black/10 sm:p-7">
              <h3 className="text-xl font-bold">
                Crear ejercicio
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Define un ejercicio antes de
                habilitarlo para el catálogo.
              </p>

              <form action={crearEjercicio} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="nombre-ejercicio"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Nombre del ejercicio
                  </label>

                  <input
                    id="nombre-ejercicio"
                    name="nombre"
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder="Ejemplo: Sentadilla con mancuernas"
                    className="w-full rounded-xl border border-white/15 bg-[#081525] px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="grupo-muscular"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Grupo muscular
                    </label>

                    <input
                      id="grupo-muscular"
                      name="grupo_muscular"
                      required
                      minLength={2}
                      maxLength={80}
                      placeholder="Ejemplo: Piernas"
                      className="w-full rounded-xl border border-white/15 bg-[#081525] px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tipo-ejercicio"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Tipo
                    </label>

                    <input
                      id="tipo-ejercicio"
                      name="tipo"
                      required
                      minLength={2}
                      maxLength={60}
                      placeholder="Ejemplo: Fuerza"
                      className="w-full rounded-xl border border-white/15 bg-[#081525] px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <CampoSeleccion
                  nombre="nivel"
                  titulo="Nivel"
                  opciones={opciones(NIVELES)}
                />

                <CampoSeleccion
                  nombre="lugar"
                  titulo="Lugar"
                  opciones={opciones(LUGARES)}
                />

                <CampoSeleccion
                  nombre="equipamiento"
                  titulo="Equipamiento"
                  opciones={opciones(EQUIPOS)}
                />

                <div>
                  <label
                    htmlFor="descripcion-ejercicio"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Descripción
                  </label>

                  <textarea
                    id="descripcion-ejercicio"
                    name="descripcion"
                    rows={3}
                    maxLength={700}
                    placeholder="Describe la ejecución del ejercicio..."
                    className="w-full rounded-xl border border-white/15 bg-[#081525] px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
                >
                  Guardar ejercicio inactivo
                </button>
              </form>
            </section>

            {/* RUTINAS */}

            <section className="rounded-3xl border border-white/10 bg-[#15263d] p-5 shadow-lg shadow-black/10 sm:p-7">
              <h3 className="text-xl font-bold">
                Crear rutina
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Prepara una nueva rutina sin
                publicarla todavía.
              </p>

              <form action={crearRutina} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="nombre-rutina"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Nombre de la rutina
                  </label>

                  <input
                    id="nombre-rutina"
                    name="nombre"
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder="Ejemplo: Fuerza inicial 3 días"
                    className="w-full rounded-xl border border-white/15 bg-[#081525] px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  />
                </div>

                <CampoSeleccion
                  nombre="objetivo"
                  titulo="Objetivo"
                  opciones={OBJETIVOS}
                />

                <CampoSeleccion
                  nombre="nivel"
                  titulo="Nivel"
                  opciones={opciones(NIVELES)}
                />

                <CampoSeleccion
                  nombre="lugar"
                  titulo="Lugar"
                  opciones={opciones(LUGARES)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="frecuencia"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Días por semana
                    </label>

                    <input
                      id="frecuencia"
                      type="number"
                      name="frecuencia_semanal"
                      min={1}
                      max={7}
                      step={1}
                      required
                      className="w-full rounded-xl border border-white/15 bg-[#081525] px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="duracion"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Minutos por sesión
                    </label>

                    <input
                      id="duracion"
                      type="number"
                      name="duracion_min"
                      min={15}
                      max={240}
                      step={1}
                      required
                      className="w-full rounded-xl border border-white/15 bg-[#081525] px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
                >
                  Guardar rutina como borrador
                </button>
              </form>
            </section>
          </div>
        </section>

        {/* BUSCADOR */}

        <section className="rounded-2xl border border-white/10 bg-[#112039] p-5 sm:p-7">
          <h2 className="text-xl font-bold">
            Buscar en el catálogo
          </h2>

          <form
            action="/administrador/catalogo"
            method="get"
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="buscar" className="sr-only">
              Buscar ejercicio o rutina
            </label>

            <input
              id="buscar"
              name="q"
              defaultValue={busqueda}
              maxLength={80}
              placeholder="Buscar por nombre..."
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-[#081525] px-4 py-3 text-sm outline-none focus:border-cyan-400"
            />

            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              Buscar
            </button>

            <Link
              href="/administrador/catalogo"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm hover:bg-white/10"
            >
              Limpiar
            </Link>
          </form>
        </section>

        {/* LISTADOS */}

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-[#112039] p-5 sm:p-7">
            <h2 className="text-xl font-bold">
              Ejercicios registrados
            </h2>

            <p className="mt-2 text-xs text-slate-400">
              {ejerciciosFiltrados.length} registros en esta vista
            </p>

            <div className="mt-5 space-y-3">
              {ejerciciosFiltrados.length === 0 && (
                <p className="rounded-xl bg-[#081525] p-5 text-sm text-slate-400">
                  No se encontraron ejercicios.
                </p>
              )}

              {ejerciciosFiltrados.map((ejercicio) => (
                <article
                  key={ejercicio.id}
                  className="rounded-xl border border-white/10 bg-[#081525] p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="font-bold">
                      {ejercicio.nombre}
                    </h3>

                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      ejercicio.activo
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-amber-400/10 text-amber-300"
                    }`}>
                      {ejercicio.activo
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-300">
                    {etiqueta(ejercicio.nivel)} ·{" "}
                    {etiqueta(ejercicio.lugar)}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {ejercicio.grupo_muscular || "Sin grupo"} ·{" "}
                    {ejercicio.equipamiento
                      ? etiqueta(ejercicio.equipamiento)
                      : "Sin equipo"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#112039] p-5 sm:p-7">
            <h2 className="text-xl font-bold">
              Rutinas registradas
            </h2>

            <p className="mt-2 text-xs text-slate-400">
              {rutinasFiltradas.length} registros en esta vista
            </p>

            <div className="mt-5 space-y-3">
              {rutinasFiltradas.length === 0 && (
                <p className="rounded-xl bg-[#081525] p-5 text-sm text-slate-400">
                  No se encontraron rutinas.
                </p>
              )}

              {rutinasFiltradas.map((rutina) => (
                <article
                  key={rutina.id}
                  className="rounded-xl border border-white/10 bg-[#081525] p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="font-bold">
                      {rutina.nombre}
                    </h3>

                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      rutina.estado === "publicada"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-amber-400/10 text-amber-300"
                    }`}>
                      {rutina.estado}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-300">
                    {etiqueta(rutina.objetivo)}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {etiqueta(rutina.nivel)} ·{" "}
                    {rutina.frecuencia_semanal} días/semana ·{" "}
                    {rutina.duracion_min} min
                  </p>

                  <p className="mt-3 border-t border-white/10 pt-3 text-xs text-cyan-300">
                    Ejercicios asociados:{" "}
                    {relacionesCompletas
                      ? asociaciones.get(rutina.id) ?? 0
                      : "Sin verificar"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* SEGURIDAD */}

        <section className="rounded-2xl border border-cyan-400/15 bg-gradient-to-r from-[#102d40] to-[#1b1d39] p-6">
          <h2 className="font-bold">
            Control de publicación
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-300">
            Las nuevas rutinas permanecen en borrador
            y los ejercicios nuevos permanecen
            inactivos. No se modifican las
            rutinas ya asignadas a los clientes.
          </p>

          <p className="mt-3 text-sm text-amber-200">
            La activación, edición y publicación
            requieren validaciones adicionales.
            El historial persistente de cambios
            del catálogo también está pendiente.
          </p>
        </section>

        <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Catálogo administrativo
        </footer>
      </div>
    </main>
  );
}

export default function CatalogoAdministradorPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}
