
"use client";

import Link from "next/link";
import { ESTUDIO } from "@/lib/investigacion/calendario-estudio";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

// EVOLUTION CENTER FIT 2.0
// FASE 110.6 - Panel de investigacion responsive
// Mantiene las API y reglas de registro existentes.

type Grupo = "GE" | "GC";
type FiltroGrupo = "todos" | Grupo;

type Cliente = {
  clienteId: string;
  nombre: string;
  grupoEstudio: Grupo | null;
  fechaInicio: string | null;
  fechaFin: string | null;
};

type NombreIcono =
  | "usuarios"
  | "experimento"
  | "escudo"
  | "calendario"
  | "buscar"
  | "actualizar"
  | "check"
  | "menu"
  | "documento";

const iconos: Record<NombreIcono, ReactNode> = {
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" />
    </>
  ),
  experimento: (
    <>
      <path d="M9 3h6M10 3v7L4 20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-6-10V3" />
      <path d="M8 16h8" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  buscar: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  actualizar: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  documento: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h8" />
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
      {iconos[nombre]}
    </svg>
  );
}

// NAVEGACION
const enlaces = [
  { href: "/entrenador", texto: "Inicio" },
  { href: "/entrenador/clientes", texto: "Mis clientes" },
  {
    href: "/entrenador/investigacion",
    texto: "Investigación",
  },
  {
    href: "/entrenador/investigacion/reporte",
    texto: "Reportes",
  },
  { href: "/catalogo", texto: "Catálogo" },
];

// FECHAS SIN CONVERSION DE ZONA HORARIA
function fechaLegible(fecha: string | null) {
  if (!fecha) return "Sin fecha";

  const coincidencia =
    /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);

  return coincidencia
    ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`
    : fecha;
}

// IDENTIFICADOR VISUAL DEL GRUPO
function InsigniaGrupo({
  grupo,
}: {
  grupo: Grupo;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
        grupo === "GE"
          ? "border-cyan-400/25 bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-200"
          : "border-emerald-400/25 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-200"
      }`}
    >
      {grupo} ·{" "}
      {grupo === "GE" ? "Experimental" : "Control"}
    </span>
  );
}

// CABECERA RESPONSIVE
function Cabecera() {
  return (
    <header className="relative z-40 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white/95 dark:bg-[#0c1526]/95 shadow-lg shadow-slate-950/5 dark:shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/entrenador"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-[#07121e]">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-800 dark:text-cyan-300">
                2.0
              </span>
            </span>
            <span className="block text-[11px] text-slate-600 dark:text-slate-400">
              Panel de investigación
            </span>
          </span>
        </Link>

        {/* NAVEGACION PARA COMPUTADORAS */}
        <nav
          aria-label="Navegación del entrenador"
          className="hidden items-center gap-1 xl:flex"
        >
          {enlaces.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                item.href === "/entrenador/investigacion"
                  ? "page"
                  : undefined
              }
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                item.href === "/entrenador/investigacion"
                  ? "bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {item.texto}
            </Link>
          ))}
        </nav>

        {/* NAVEGACION PARA CELULAR Y TABLET */}
        <details className="relative shrink-0 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-300/80 dark:border-white/15 bg-slate-100/80 dark:bg-white/5 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
            <Icono nombre="menu" />
            Menú
          </summary>

          <nav
            aria-label="Navegación móvil del entrenador"
            className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-slate-300/80 dark:border-white/15 bg-white dark:bg-[#101d31] p-2 shadow-2xl shadow-slate-950/10 dark:shadow-black/50"
          >
            {enlaces.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  item.href === "/entrenador/investigacion"
                    ? "page"
                    : undefined
                }
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                  item.href === "/entrenador/investigacion"
                    ? "bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10"
                }`}
              >
                {item.texto}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}

// TARJETA DE INDICADOR
function TarjetaResumen({
  titulo,
  valor,
  icono,
  color,
}: {
  titulo: string;
  valor: number | string;
  icono: NombreIcono;
  color: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#172a43] to-slate-50 dark:to-[#101a2d] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.19)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_20px_42px_rgba(0,0,0,0.27)] sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
        >
          <Icono nombre={icono} />
        </span>

        <span className="h-2 w-2 rounded-full bg-cyan-400/70" />
      </div>

      <p className="mt-5 text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">
        {valor}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        {titulo}
      </p>
    </article>
  );
}

// PAGINA PRINCIPAL
export default function InvestigacionPage() {
  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState("");
  const [exito, setExito] = useState("");

  const [clienteId, setClienteId] = useState("");
  const [grupo, setGrupo] = useState<Grupo>("GE");
  const [fechaInicio, setFechaInicio] = useState<string>(ESTUDIO.inicio);

  const [busqueda, setBusqueda] = useState("");
  const [filtroGrupo, setFiltroGrupo] =
    useState<FiltroGrupo>("todos");

  // 1. CONSULTAR PARTICIPANTES
  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");

    try {
      const respuesta = await fetch(
        "/api/investigacion/participantes",
        { cache: "no-store" }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudieron consultar los clientes."
        );
      }

      setClientes(datos.clientes ?? []);
    } catch (err) {
      setErrorCarga(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado al consultar participantes."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarClientes();
  }, [cargarClientes]);

  // 2. CLASIFICAR PARTICIPANTES
  const registrados = useMemo(
    () =>
      clientes.filter(
        (cliente) => cliente.grupoEstudio !== null
      ),
    [clientes]
  );

  const disponibles = useMemo(
    () =>
      clientes.filter(
        (cliente) => cliente.grupoEstudio === null
      ),
    [clientes]
  );

  const totalGE = registrados.filter(
    (cliente) => cliente.grupoEstudio === "GE"
  ).length;

  const totalGC = registrados.filter(
    (cliente) => cliente.grupoEstudio === "GC"
  ).length;

  // 3. BUSQUEDA Y FILTROS LOCALES
  const participantesVisibles = registrados.filter(
    (cliente) => {
      const nombre = cliente.nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      const texto = busqueda
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      return (
        nombre.includes(texto) &&
        (filtroGrupo === "todos" ||
          cliente.grupoEstudio === filtroGrupo)
      );
    }
  );

  // 4. REGISTRO ORIGINAL CONSERVADO
  async function registrarParticipante(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (guardando) return;

    if (!clienteId || !fechaInicio) {
      setError(
        "Selecciona un cliente y una fecha de inicio."
      );
      return;
    }

    setGuardando(true);
    setError("");
    setExito("");

    try {
      const respuesta = await fetch(
        "/api/investigacion/participantes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clienteId,
            grupoEstudio: grupo,
            fechaInicio,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudo registrar al participante."
        );
      }

      setExito(
        "Participante registrado correctamente."
      );
      setClienteId("");
      setFechaInicio(ESTUDIO.inicio);
      setGrupo("GE");

      await cargarClientes();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error inesperado al registrar."
      );
    } finally {
      setGuardando(false);
    }
  }

  // ESTILO COMPARTIDO PARA FORMULARIOS
  const campo =
    "min-h-12 w-full rounded-xl border border-slate-300/80 dark:border-white/15 " +
    "bg-white dark:bg-[#0b1628] px-4 py-3 text-sm text-[var(--ecf-text,#102238)] dark:text-white outline-none " +
    "transition-colors placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-cyan-400/70 " +
    "focus:ring-2 focus:ring-cyan-400/20 " +
    "disabled:cursor-not-allowed disabled:opacity-50";

  const valorResumen = (numero: number) =>
    errorCarga ? "—" : cargando ? "…" : numero;

  // 5. INTERFAZ PRINCIPAL
  return (
    <main className="relative min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] text-[var(--ecf-text,#102238)] dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-cyan-500/[0.06] to-transparent"
      />

      <Cabecera />

      <div className="relative mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        {/* BIENVENIDA */}
        <section className="overflow-hidden rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-[#eafaff] dark:from-[#122b40] via-white dark:via-[#111d32] to-[#f5f2ff] dark:to-[#1a1735] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-200">
                <Icono
                  nombre="experimento"
                  className="h-4 w-4"
                />
                Investigación · GE y GC
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Panel de{" "}
                <span className="text-cyan-800 dark:text-cyan-300">
                  investigación
                </span>
              </h1>

              <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
                Administra la inscripción de participantes,
                consulta sus grupos y mantén la separación
                entre el procedimiento experimental y el
                control.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/entrenador"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100/80 dark:bg-white/5 px-5 py-3 text-sm font-semibold transition hover:bg-slate-200/70 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                Volver al panel
              </Link>

              <Link
                href="/entrenador/investigacion/reporte"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#07121e] shadow-[0_9px_25px_rgba(6,182,212,0.16)] transition motion-safe:hover:-translate-y-0.5 hover:bg-cyan-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                <Icono
                  nombre="documento"
                  className="h-4 w-4"
                />
                Reportes Jamovi
              </Link>
            </div>
          </div>
        </section>

        {/* INDICADORES */}
        <section
          aria-label="Resumen del estudio"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <TarjetaResumen
            titulo="Participantes registrados"
            valor={valorResumen(registrados.length)}
            icono="usuarios"
            color="bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
          />

          <TarjetaResumen
            titulo="Grupo experimental (GE)"
            valor={valorResumen(totalGE)}
            icono="experimento"
            color="bg-violet-50 dark:bg-violet-400/10 text-violet-800 dark:text-violet-300"
          />

          <TarjetaResumen
            titulo="Grupo control (GC)"
            valor={valorResumen(totalGC)}
            icono="escudo"
            color="bg-emerald-50 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-300"
          />
        </section>

        {/* MENSAJES */}
        {errorCarga && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/25 bg-red-50 dark:bg-red-400/10 p-4 text-sm text-red-800 dark:text-red-200"
          >
            No se pudo actualizar el listado:{" "}
            {errorCarga}

            <button
              type="button"
              onClick={() => void cargarClientes()}
              className="ml-2 font-bold underline underline-offset-4"
            >
              Reintentar
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/25 bg-red-50 dark:bg-red-400/10 p-4 text-sm text-red-800 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {exito && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-50 dark:bg-emerald-400/10 p-4 text-sm text-emerald-800 dark:text-emerald-200"
          >
            <Icono
              nombre="check"
              className="h-5 w-5"
            />
            {exito}
          </div>
        )}

        {/* REGISTRO DE PARTICIPANTES */}
        <section
          aria-labelledby="titulo-registro"
          className="rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#15243a] to-slate-50 dark:to-[#101a2b] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.23)] sm:p-7"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
                Inscripción controlada
              </p>

              <h2
                id="titulo-registro"
                className="mt-2 text-xl font-bold sm:text-2xl"
              >
                Registrar participante
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Asigna un cliente a GE o GC.
                El grupo no podrá modificarse
                desde este formulario.
              </p>
            </div>

            <span className="inline-flex self-start rounded-full border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-100/80 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {cargando
                ? "Consultando..."
                : `${disponibles.length} disponibles`}
            </span>
          </div>

          <form
            onSubmit={registrarParticipante}
            className="mt-7 grid gap-5 md:grid-cols-2"
          >
            {/* CLIENTE */}
            <div className="min-w-0 space-y-2">
              <label
                htmlFor="cliente"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Cliente
              </label>

              <select
                id="cliente"
                value={clienteId}
                onChange={(e) =>
                  setClienteId(e.target.value)
                }
                required
                disabled={
                  cargando ||
                  guardando ||
                  disponibles.length === 0
                }
                className={campo}
              >
                <option value="">
                  Seleccionar cliente
                </option>

                {disponibles.map((cliente) => (
                  <option
                    key={cliente.clienteId}
                    value={cliente.clienteId}
                  >
                    {cliente.nombre}
                  </option>
                ))}
              </select>

              {!cargando &&
                disponibles.length === 0 && (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    No hay clientes sin grupo disponibles
                    para registrar.
                  </p>
                )}
            </div>

            {/* GRUPO */}
            <div className="min-w-0 space-y-2">
              <label
                htmlFor="grupo"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Grupo de investigación
              </label>

              <select
                id="grupo"
                value={grupo}
                onChange={(e) =>
                  setGrupo(e.target.value as Grupo)
                }
                disabled={cargando || guardando}
                className={campo}
              >
                <option value="GE">
                  GE — Grupo experimental
                </option>
                <option value="GC">
                  GC — Grupo control
                </option>
              </select>
            </div>

            {/* FECHA */}
            <div className="min-w-0 space-y-2">
              <label
                htmlFor="fecha"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Fecha de inicio del estudio
              </label>

              <input
                id="fecha"
                type="date"
                value={fechaInicio}
                readOnly
                min={ESTUDIO.inicio}
                max={ESTUDIO.inicio}
                required
                disabled={cargando || guardando}
                className={`${campo} dark:[color-scheme:dark]`}
              />

              <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Icono
                  nombre="calendario"
                  className="h-4 w-4"
                />
                Fecha oficial fija: 09/11/2026.
                Las 12 semanas son comunes para GE y GC.
              </p>
            </div>

            {/* BOTON */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  guardando ||
                  cargando ||
                  disponibles.length === 0 ||
                  !clienteId ||
                  !fechaInicio
                }
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-[#07121e] shadow-[0_9px_25px_rgba(6,182,212,0.2)] transition-[transform,background-color,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_12px_32px_rgba(6,182,212,0.25)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none"
              >
                {guardando ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-800/30 border-t-slate-900" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Icono
                      nombre="check"
                      className="h-4 w-4"
                    />
                    Registrar participante
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* INFORMACION GE Y GC */}
        <section
          aria-label="Información metodológica"
          className="grid gap-4 md:grid-cols-2"
        >
          <article className="rounded-2xl border border-violet-400/20 bg-violet-50 dark:bg-violet-400/[0.07] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.13)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-violet-400/15 p-2.5 text-violet-800 dark:text-violet-200">
                <Icono nombre="experimento" />
              </span>

              <h3 className="font-bold text-violet-900 dark:text-violet-100">
                Grupo experimental (GE)
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
              Recibe recomendaciones inteligentes
              supervisadas durante la intervención,
              después del pretest.
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-400/20 bg-emerald-50 dark:bg-emerald-400/[0.07] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.13)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-400/15 p-2.5 text-emerald-800 dark:text-emerald-200">
                <Icono nombre="escudo" />
              </span>

              <h3 className="font-bold text-emerald-900 dark:text-emerald-100">
                Grupo control (GC)
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
              Continúa con la asignación habitual
              de rutinas sin utilizar el motor
              inteligente durante el estudio.
            </p>
          </article>
        </section>

        {/* DIRECTORIO DE PARTICIPANTES */}
        <section
          aria-labelledby="titulo-participantes"
          className="overflow-hidden rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white dark:bg-[#111d31] shadow-[0_18px_48px_rgba(0,0,0,0.2)]"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
                Directorio del estudio
              </p>

              <h2
                id="titulo-participantes"
                className="mt-2 text-xl font-bold sm:text-2xl"
              >
                Participantes registrados
              </h2>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Consulta los grupos y las fechas
                registradas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void cargarClientes()}
              disabled={cargando || guardando}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-300/80 dark:border-white/15 bg-slate-100/80 dark:bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-200/70 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icono
                nombre="actualizar"
                className="h-4 w-4"
              />
              Actualizar
            </button>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <div className="grid gap-3 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 p-5 sm:grid-cols-[minmax(0,1fr)_180px] sm:p-6">
            <div className="relative min-w-0">
              <label
                htmlFor="buscar-participante"
                className="sr-only"
              >
                Buscar participante por nombre
              </label>

              <Icono
                nombre="buscar"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400"
              />

              <input
                id="buscar-participante"
                type="search"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                placeholder="Buscar participante..."
                className={`${campo} pl-10`}
              />
            </div>

            <div>
              <label
                htmlFor="filtrar-grupo"
                className="sr-only"
              >
                Filtrar por grupo
              </label>

              <select
                id="filtrar-grupo"
                value={filtroGrupo}
                onChange={(e) =>
                  setFiltroGrupo(
                    e.target.value as FiltroGrupo
                  )
                }
                className={campo}
              >
                <option value="todos">
                  Todos los grupos
                </option>
                <option value="GE">
                  Solo GE
                </option>
                <option value="GC">
                  Solo GC
                </option>
              </select>
            </div>
          </div>

          <div
            role="status"
            className="px-5 pt-4 text-xs text-slate-600 dark:text-slate-400 sm:px-6"
          >
            {cargando
              ? "Consultando participantes..."
              : errorCarga
                ? "No se pudo actualizar el listado"
                : `${participantesVisibles.length} de ${registrados.length} participantes visibles`}
          </div>

          {/* VISTA PARA CELULARES */}
          <div className="space-y-3 p-5 md:hidden">
            {!cargando &&
              !errorCarga &&
              participantesVisibles.map((cliente) => (
                <article
                  key={cliente.clienteId}
                  className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-[#0c1729] p-4 shadow-lg shadow-black/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="break-words font-bold">
                      {cliente.nombre}
                    </h3>

                    <InsigniaGrupo
                      grupo={
                        cliente.grupoEstudio as Grupo
                      }
                    />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-600 dark:text-slate-400">
                        Inicio
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {fechaLegible(
                          cliente.fechaInicio
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-slate-600 dark:text-slate-400">
                        Fin
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {fechaLegible(
                          cliente.fechaFin
                        )}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-4 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Registrado
                  </p>
                </article>
              ))}
          </div>

          {/* TABLA PARA TABLET Y PC */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/90 dark:bg-white/[0.035] text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Cliente
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Grupo
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Inicio
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Fin
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {!cargando &&
                  !errorCarga &&
                  participantesVisibles.map(
                    (cliente) => (
                      <tr
                        key={cliente.clienteId}
                        className="border-t border-slate-200 dark:border-white/[0.07] transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          {cliente.nombre}
                        </td>

                        <td className="px-6 py-4">
                          <InsigniaGrupo
                            grupo={
                              cliente.grupoEstudio as Grupo
                            }
                          />
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-slate-700 dark:text-slate-300">
                          {fechaLegible(
                            cliente.fechaInicio
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-slate-700 dark:text-slate-300">
                          {fechaLegible(
                            cliente.fechaFin
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Registrado
                          </span>
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>

          {/* ESTADOS VACIOS */}
          {!cargando &&
            !errorCarga &&
            participantesVisibles.length === 0 && (
              <p className="px-5 pb-8 pt-5 text-center text-sm text-slate-600 dark:text-slate-400">
                {registrados.length === 0
                  ? "Todavía no hay participantes registrados."
                  : "No hay participantes que coincidan con los filtros."}
              </p>
            )}

          {cargando && (
            <p className="px-5 pb-8 pt-5 text-center text-sm text-slate-600 dark:text-slate-400">
              Cargando participantes...
            </p>
          )}
        </section>

        <footer className="pt-2 text-center text-xs text-slate-600 dark:text-slate-500">
          Evolution Center Fit 2.0 · Investigación.
          Los registros demostrativos no constituyen
          resultados científicos.
        </footer>
      </div>
    </main>
  );
}
