import Link from "next/link";
import ComparativaGrupos from "./comparativa-grupos";

type NombreIcono =
  | "documento"
  | "descarga"
  | "grafico"
  | "calendario"
  | "check"
  | "escudo"
  | "menu"
  | "archivo";

const enlaces = [
  { href: "/entrenador", texto: "Inicio" },
  { href: "/entrenador/clientes", texto: "Mis clientes" },
  { href: "/entrenador/investigacion", texto: "Investigación" },
  {
    href: "/entrenador/investigacion/reporte",
    texto: "Reportes",
  },
  { href: "/catalogo", texto: "Catálogo" },
];

const iconos: Record<NombreIcono, React.ReactNode> = {
  documento: (
    <>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6M9 17h6M9 9h1" />
    </>
  ),
  descarga: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </>
  ),
  grafico: (
    <>
      <path d="M4 19h16" />
      <path d="M7 15V9" />
      <path d="M12 15V5" />
      <path d="M17 15v-3" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9.5 12 1.8 1.8 3.7-4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  archivo: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h8M8 9h2" />
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

function Cabecera() {
  return (
    <header className="relative z-40 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white/95 dark:bg-[#0c1526]/95 shadow-lg shadow-slate-900/10 dark:shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/entrenador"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-xl font-black text-[#07121e]">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-black tracking-wide sm:text-sm">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-800 dark:text-cyan-300">2.0</span>
            </span>
            <span className="block text-[11px] text-slate-600 dark:text-slate-400">
              Reportes de investigación
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navegación del entrenador"
          className="hidden items-center gap-1 xl:flex"
        >
          {enlaces.map((item) => {
            const activo =
              item.href ===
              "/entrenador/investigacion/reporte";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                  activo
                    ? "bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                {item.texto}
              </Link>
            );
          })}
        </nav>

        <details className="relative shrink-0 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-slate-100 dark:bg-white/5 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
            <Icono nombre="menu" />
            Menú
          </summary>

          <nav className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#101d31] p-2 shadow-2xl shadow-slate-900/20 dark:shadow-black/50">
            {enlaces.map((item) => {
              const activo =
                item.href ===
                "/entrenador/investigacion/reporte";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                    activo
                      ? "bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  {item.texto}
                </Link>
              );
            })}
          </nav>
        </details>
      </div>
    </header>
  );
}

function TarjetaDato({
  titulo,
  descripcion,
  icono,
  color,
}: {
  titulo: string;
  descripcion: string;
  icono: NombreIcono;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#15243a] to-slate-50 dark:to-[#101a2b] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.18)] transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/20 hover:shadow-[0_18px_40px_rgba(0,0,0,0.26)] sm:p-6">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
      >
        <Icono nombre={icono} />
      </span>

      <h3 className="mt-4 text-lg font-bold text-[var(--ecf-text,#102238)] dark:text-white">
        {titulo}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {descripcion}
      </p>
    </article>
  );
}

function PasoMedicion({
  titulo,
  semanas,
  descripcion,
  color,
}: {
  titulo: string;
  semanas: string;
  descripcion: string;
  color: string;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-[0_12px_28px_rgba(0,0,0,0.12)] sm:p-6 ${color}`}
    >
      <h3 className="text-lg font-bold text-[var(--ecf-text,#102238)] dark:text-white">
        {titulo}
      </h3>

      <p className="mt-3 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
        {semanas}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {descripcion}
      </p>
    </article>
  );
}

export default function ReporteInvestigacionPage() {
  return (
    <main className="relative min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] text-[var(--ecf-text,#102238)] dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-cyan-400/[0.08] dark:from-cyan-500/[0.06] to-transparent"
      />

      <Cabecera />

      <div className="relative mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="overflow-hidden rounded-[28px] border border-cyan-200 dark:border-cyan-400/15 bg-gradient-to-br from-[#eef9fd] dark:from-[#122b40] via-white dark:via-[#111d32] to-[#f6f3ff] dark:to-[#1a1735] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-300/20 bg-cyan-50 dark:bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-200">
                <Icono
                  nombre="archivo"
                  className="h-4 w-4"
                />
                Reporte pretest y postest
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Reporte de{" "}
                <span className="text-cyan-800 dark:text-cyan-300">
                  investigación
                </span>
              </h1>

              <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
                Exporta los resultados consolidados del
                estudio para su revisión estadística en
                Jamovi, manteniendo la diferenciación entre
                grupo experimental y grupo control.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/entrenador/investigacion"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 px-5 py-3 text-sm font-semibold transition hover:bg-slate-200 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  Volver a investigación
                </Link>

                <a
                  href="/api/investigacion/exportar"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#07121e] shadow-[0_9px_25px_rgba(6,182,212,0.18)] transition-[transform,background-color,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_12px_32px_rgba(6,182,212,0.25)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  <Icono
                    nombre="descarga"
                    className="h-4 w-4"
                  />
                  CSV por participante
                </a>

                <a
                  href="/api/investigacion/exportar?tipo=grupos"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-800 transition hover:bg-cyan-400/20 focus-visible:outline-2 focus-visible:outline-cyan-300 dark:text-cyan-200"
                >
                  Comparar GE y GC (CSV)
                </a>
              </div>
            </div>

            <div className="grid w-full max-w-sm gap-3 rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white/90 dark:bg-[#0d1729]/80 p-5 shadow-inner shadow-slate-900/10 dark:shadow-black/20">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300">
                  <Icono nombre="grafico" />
                </span>

                <div>
                  <p className="text-sm font-bold">
                    Exportación estadística
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Compatible con revisión en Jamovi
                  </p>
                </div>
              </div>

              <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] px-3 py-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-400/10 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                    1
                  </span>
                  El sistema prepara resultados del GE y GC.
                </li>
                <li className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] px-3 py-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-400/10 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                    2
                  </span>
                  Se exportan indicadores de adherencia.
                </li>
                <li className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] px-3 py-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-400/10 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                    3
                  </span>
                  El archivo CSV se analiza sin alterar registros.
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* RESUMEN */}
        <section
          aria-label="Indicadores del reporte"
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <TarjetaDato
            titulo="Comparación pretest y postest"
            descripcion="Se organizan mediciones iniciales y posteriores para el análisis del impacto del plan de entrenamiento."
            icono="grafico"
            color="bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300"
          />

          <TarjetaDato
            titulo="Indicadores incluidos"
            descripcion="Asistencia, cumplimiento y continuidad semanal, con grupo de estudio y fase de medición."
            icono="documento"
            color="bg-violet-50 dark:bg-violet-400/10 text-violet-800 dark:text-violet-300"
          />

          <TarjetaDato
            titulo="Exportación protegida"
            descripcion="El reporte sustituye identificadores personales por códigos seudónimos y no genera datos ficticios."
            icono="escudo"
            color="bg-emerald-50 dark:bg-emerald-400/10 text-emerald-800 dark:text-emerald-300"
          />
        </section>

        <ComparativaGrupos />

        {/* CONTENIDO PRINCIPAL */}
        <section className="rounded-3xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-gradient-to-br from-white dark:from-[#15243a] to-slate-50 dark:to-[#101a2b] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)] sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
                Preparación del análisis
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                Comparación pretest y postest
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                El reporte reúne los resultados del estudio
                para facilitar el análisis estadístico del
                comportamiento de la adherencia antes y
                después de la intervención.
              </p>
            </div>

            <span className="inline-flex self-start rounded-full border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              CSV listo para análisis
            </span>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <PasoMedicion
              titulo="Pretest"
              semanas="Semanas 1 a 4"
              descripcion="Evaluación inicial de la adherencia antes del periodo de intervención."
              color="border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/[0.07]"
            />

            <PasoMedicion
              titulo="Postest"
              semanas="Semanas 9 a 12"
              descripcion="Evaluación posterior a la intervención para comparar cambios observados."
              color="border-violet-300/60 dark:border-violet-400/20 bg-violet-50 dark:bg-violet-400/[0.07]"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-[#0c1729] p-5 shadow-inner shadow-black/10 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-400/10 text-cyan-800 dark:text-cyan-300">
                <Icono nombre="check" />
              </span>

              <div>
                <h3 className="text-lg font-bold">
                  Indicadores incluidos
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Variables exportadas para la revisión
                  estadística.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Porcentaje de asistencia",
                "Porcentaje de cumplimiento",
                "Continuidad en semanas activas",
                "Identificación de grupo GE o GC",
                "Fase de medición (pretest / postest)",
                "Campos compatibles para análisis en Jamovi",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="mt-0.5 text-emerald-800 dark:text-emerald-300">
                    <Icono
                      nombre="check"
                      className="h-4 w-4"
                    />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-300/60 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/[0.07] p-5 sm:p-6">
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
              Consideraciones del archivo exportado
            </h3>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
              <li>
                • El reporte contiene únicamente participantes
                asignados al entrenador autenticado.
              </li>
              <li>
                • Los identificadores personales se sustituyen
                por códigos seudónimos.
              </li>
              <li>
                • Las mediciones incompletas se exportan como
                valores vacíos.
              </li>
              <li>
                • No se generan resultados de entrenamiento
                ficticios ni registros artificiales.
              </li>
            </ul>
          </div>

          <div className="mt-7">
            <a
              href="/api/investigacion/exportar"
              className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-6 py-4 text-center text-sm font-extrabold text-[#07121e] shadow-[0_12px_32px_rgba(6,182,212,0.18)] transition-[transform,background-color,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_16px_38px_rgba(6,182,212,0.24)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:text-base"
            >
              <Icono
                nombre="descarga"
                className="h-5 w-5 transition-transform group-hover:translate-y-0.5"
              />
              Descargar resultados por participante (CSV)
            </a>

            <a
              href="/api/investigacion/exportar?tipo=grupos"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-400/10 px-6 py-3 text-center text-sm font-bold text-cyan-800 transition hover:bg-cyan-400/20 focus-visible:outline-2 focus-visible:outline-cyan-300 dark:text-cyan-200"
            >
              Descargar comparación GE frente a GC (CSV)
            </a>
          </div>
        </section>

        <footer className="pt-2 text-center text-xs text-slate-600 dark:text-slate-500">
          Evolution Center Fit 2.0 · Reporte de investigación.
          Exportación estadística con enfoque académico.
        </footer>
      </div>
    </main>
  );
}