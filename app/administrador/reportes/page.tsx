import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  SECCIONES,
  accesoAdministrador,
  asistenciaConfirmada,
  obtenerMetricas,
} from "@/lib/admin/reportes";

// ==============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.18 - REPORTES ADMINISTRATIVOS
// ==============================================

function Cargando() {
  return (
    <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] p-8 text-cyan-800 dark:text-cyan-200">
      Cargando reportes administrativos...
    </main>
  );
}

async function ContenidoReportes() {
  await connection();

  const acceso = await accesoAdministrador();

  if (acceso.estado === "sin_sesion") {
    redirect("/login");
  }

  if (acceso.estado === "sin_permiso") {
    redirect("/");
  }

  if (acceso.estado === "sin_configuracion") {
    return (
      <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] p-8 text-[var(--ecf-text,#102238)] dark:text-white">
        <h1 className="text-xl font-bold">
          Configuración pendiente
        </h1>

        <p className="mt-3 text-amber-800 dark:text-amber-200">
          No se configuró la conexión privada
          de Supabase en el servidor.
        </p>
      </main>
    );
  }

  // Obtener información real de Supabase.

  const metricas = await obtenerMetricas(
    acceso.db
  );

  const fallidas = metricas.filter(
    (metrica) => metrica.valor === null
  ).length;

  const asistencia =
    asistenciaConfirmada(metricas);

  const generado = new Date().toLocaleString(
    "es-PE",
    {
      timeZone: "America/Lima",
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

  return (
    <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080e1b] px-4 py-8 text-[var(--ecf-text,#102238)] dark:text-white sm:px-7">
      <div className="mx-auto max-w-6xl space-y-7">

        {/* CABECERA */}

        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#eaf8ff] dark:from-[#173a50] to-[#eef1fc] dark:to-[#1f1d38] p-6 sm:p-9">

          <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            FASE 111.18 · ADMINISTRACIÓN
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Centro de reportes
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 dark:text-slate-300">
            Consulta los indicadores operativos
            del gimnasio y descarga informes
            administrativos de Evolution
            Center Fit 2.0.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">

            <a
              href="/administrador/reportes/exportar"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#07121e] hover:bg-cyan-300"
            >
              Descargar reporte CSV
            </a>

            <Link
              href="/administrador"
              className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/20 px-5 py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Volver al administrador
            </Link>

          </div>

          <p className="mt-5 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
            Consulta generada: {generado}
            {" · "}Hora de Lima
          </p>

        </section>

        {/* ADVERTENCIA SI FALLA ALGUNA CONSULTA */}

        {fallidas > 0 && (
          <div
            role="alert"
            className="rounded-2xl border border-amber-400/20 bg-amber-50 dark:bg-amber-400/10 p-5"
          >
            <h2 className="font-bold text-amber-800 dark:text-amber-200">
              Hay indicadores sin verificar
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              No se pudieron consultar {fallidas}
              {" "}indicadores.

              Los valores afectados aparecerán
              como «No disponible», en lugar
              de mostrar datos incorrectos.
            </p>
          </div>
        )}

        {/* INDICADORES PRINCIPALES */}

        <section className="grid gap-4 md:grid-cols-2">

          <article className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#14263f] p-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Asistencia confirmada
            </p>

            <p className="mt-3 text-4xl font-black text-[var(--ecf-text,#102238)] dark:text-white">
              {asistencia}
            </p>

            <p className="mt-3 text-xs leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Porcentaje calculado sobre
              sesiones realizadas y ausencias
              confirmadas.

              No incluye sesiones pendientes,
              en curso o canceladas.
            </p>
          </article>

          <article className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#14263f] p-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Disponibilidad de los indicadores
            </p>

            <p className="mt-3 text-4xl font-black text-[var(--ecf-text,#102238)] dark:text-white">
              {metricas.length - fallidas}
              <span className="text-slate-500">
                {" / "}
                {metricas.length}
              </span>
            </p>

            <p className="mt-3 text-xs leading-6 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Indicadores consultados
              correctamente desde Supabase.
            </p>
          </article>

        </section>

        {/* CATEGORIAS */}

        {SECCIONES.map((seccion) => {
          const indicadores = metricas.filter(
            (metrica) =>
              metrica.seccion === seccion.id
          );

          return (
            <section
              key={seccion.id}
              className="space-y-4"
            >

              <div>
                <h2 className="text-xl font-bold">
                  {seccion.titulo}
                </h2>

                <p className="mt-1 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  {seccion.nota}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

                {indicadores.map((indicador) => (
                  <article
                    key={indicador.codigo}
                    className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-5"
                  >

                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {indicador.titulo}
                    </p>

                    <p className="mt-3 text-3xl font-black tabular-nums">
                      {indicador.valor === null
                        ? "—"
                        : indicador.valor.toLocaleString(
                            "es-PE"
                          )}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                      {indicador.descripcion}
                    </p>

                    {indicador.valor === null && (
                      <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                        No disponible
                      </p>
                    )}

                  </article>
                ))}

              </div>

            </section>
          );
        })}

        {/* INFORMACION IMPORTANTE */}

        <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#112039] p-6">
          <h2 className="text-lg font-bold">
            Alcance de los reportes
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
            Este panel presenta información
            operativa registrada en Supabase.

            Los conteos pueden incluir cuentas
            y datos de demostración.

            Las revisiones de entrenadores no
            equivalen al número de evaluaciones
            generadas por el motor IA.

            Las cifras GE y GC representan
            inscripciones, no resultados
            pretest y postest de la tesis.
          </p>
        </section>

        <footer className="py-5 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0
          {" · "}
          Reportes administrativos
        </footer>

      </div>
    </main>
  );
}

// ==============================================
// PAGINA PRINCIPAL
// ==============================================

export default function ReportesAdminPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <ContenidoReportes />
    </Suspense>
  );
}
