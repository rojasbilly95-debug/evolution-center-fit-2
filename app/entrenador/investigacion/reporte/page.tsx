import Link from "next/link";

export default function ReporteInvestigacionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">

        <Link
          href="/entrenador/investigacion"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          Volver al panel de investigación
        </Link>

        <header>
          <p className="text-sm font-semibold text-blue-700">
            EVOLUTION CENTER FIT 2.0
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Reporte de investigación
          </h1>

          <p className="mt-2 text-slate-600">
            Resultados de adherencia al plan de entrenamiento
            para el grupo experimental y el grupo control.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Comparación pretest y postest
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-blue-50 p-5">
              <p className="font-semibold text-blue-900">
                Pretest
              </p>
              <p className="mt-2 text-sm text-blue-800">
                Semanas 1 a 4
              </p>
              <p className="mt-2 text-sm text-blue-800">
                Evaluación inicial de la adherencia.
              </p>
            </div>

            <div className="rounded-xl bg-indigo-50 p-5">
              <p className="font-semibold text-indigo-900">
                Postest
              </p>
              <p className="mt-2 text-sm text-indigo-800">
                Semanas 9 a 12
              </p>
              <p className="mt-2 text-sm text-indigo-800">
                Evaluación posterior a la intervención.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold">
              Indicadores incluidos
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Porcentaje de asistencia</li>
              <li>Porcentaje de cumplimiento</li>
              <li>Continuidad en semanas activas</li>
              <li>Identificación de grupo GE o GC</li>
            </ul>
          </div>

          <a
            href="/api/investigacion/exportar"
            className="mt-6 block rounded-xl bg-blue-700 px-6 py-4 text-center font-semibold text-white transition hover:bg-blue-800"
          >
            Descargar resultados CSV para Jamovi
          </a>

          <p className="mt-4 text-sm text-slate-500">
            El reporte contiene únicamente participantes
            asignados al entrenador autenticado. Los
            identificadores personales se sustituyen
            por códigos seudónimos.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Las mediciones incompletas se exportan como
            valores vacíos. No se generan resultados
            de entrenamiento ficticios.
          </p>
        </section>

      </div>
    </main>
  );
}
