export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import ProgramarSesiones from "../../programar-sesiones";

type Props = {
  params: Promise<{ clienteId: string }>;
};

function mostrarFechaPlan(
  fecha: string | null
): string {
  if (!fecha) {
    return "Sin fecha definida";
  }

  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default async function SeguimientoClientePage({
  params,
}: Props) {
  await connection();

  const { clienteId } = await params;
  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const entrenadorId = auth?.claims?.sub;

  if (authError || !entrenadorId) {
    redirect("/login");
  }

  const { data: acceso, error: errorAcceso } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .single();

  if (errorAcceso || acceso?.rol !== "entrenador") {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <h1 className="text-2xl font-bold">
          Acceso restringido
        </h1>
        <p className="mt-3 text-slate-400">
          Esta página es exclusiva para entrenadores.
        </p>
      </main>
    );
  }

  const { data: relacion, error: errorRelacion } =
    await supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", entrenadorId)
      .eq("cliente_id", clienteId)
      .eq("activa", true)
      .maybeSingle();

  if (errorRelacion || !relacion) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <h1 className="text-2xl font-bold">
          Cliente no disponible
        </h1>
        <p className="mt-3 text-slate-400">
          No tienes una asignación activa con este cliente.
        </p>
        <Link
          href="/entrenador/clientes"
          className="mt-6 inline-block text-cyan-400"
        >
          Volver a mis clientes
        </Link>
      </main>
    );
  }

  const [
    { data: usuario },
    { data: planes, error: errorPlanes },
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre_completo")
      .eq("id", clienteId)
      .maybeSingle(),

    supabase
      .from("asignaciones_rutinas")
      .select("id,estado,fecha_inicio,fecha_fin")
      .eq("cliente_id", clienteId)
      .order("id", { ascending: false })
      .limit(30),
  ]);

  // Estados que representan un plan no cerrado.
  const estadosVigentes = [
    "programada",
    "activa",
    "pausada",
  ];

  // Seleccionar el plan vigente más reciente.
  // No utilizar planes finalizados o cancelados
  // como si fueran planes actuales.
  const planVigente =
    planes?.find((plan) =>
      estadosVigentes.includes(plan.estado)
    ) ?? null;

  // Conservar la referencia a planes historicos.
  const planesHistoricos =
    planes?.filter((plan) =>
      ["finalizada", "cancelada"].includes(
        plan.estado
      )
    ) ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Link
            href="/entrenador/clientes"
            className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Volver a mis clientes
          </Link>

          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-cyan-400">
            Evolution Center Fit 2.0
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Seguimiento de entrenamiento
          </h1>

          <p className="mt-3 text-slate-400">
            {usuario?.nombre_completo ??
              "Cliente asignado"}
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {errorPlanes ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
            No se pudieron consultar las rutinas del cliente.
            Revisa los permisos de acceso.
          </div>
        ) : !planVigente ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-8">
            <h2 className="text-xl font-bold">
              Sin plan vigente
            </h2>

            <p className="mt-3 text-slate-400">
              {planesHistoricos.length > 0
                ? "El cliente no tiene un plan vigente. Sus planes anteriores permanecen registrados en el historial."
                : "Este cliente todavía no tiene una rutina asignada."}
            </p>
          </div>
        ) : (
          <ProgramarSesiones
            key={planVigente.id}
            asignacionId={planVigente.id}
          />
        )}

        {/* HISTORIAL DE PLANES DE ENTRENAMIENTO */}
        {!errorPlanes && (
          <section
            aria-labelledby="historial-planes"
            className="mt-10 rounded-2xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Evolution Center Fit 2.0
              </p>

              <h2
                id="historial-planes"
                className="mt-2 text-2xl font-black text-white"
              >
                Historial de entrenamiento
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Consulta los planes anteriores del cliente.
                Los planes finalizados o cancelados se
                muestran separados del plan vigente.
              </p>
            </div>

            {planesHistoricos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-slate-950/50 p-6">
                <h3 className="font-semibold text-slate-200">
                  Sin planes históricos
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Todavía no existen planes finalizados
                  o cancelados entre las últimas
                  asignaciones consultadas.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {planesHistoricos.map((plan) => (
                  <li
                    key={plan.id}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-white">
                          Plan #{plan.id}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Asignación histórica
                        </p>
                      </div>

                      <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                        {plan.estado === "finalizada"
                          ? "Finalizado"
                          : "Cancelado"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-900 p-3">
                        <p className="text-xs text-slate-400">
                          Fecha de inicio
                        </p>

                        <p className="mt-1 font-semibold text-slate-100">
                          {mostrarFechaPlan(
                            plan.fecha_inicio
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-900 p-3">
                        <p className="text-xs text-slate-400">
                          Fecha de finalización prevista
                        </p>

                        <p className="mt-1 font-semibold text-slate-100">
                          {mostrarFechaPlan(
                            plan.fecha_fin
                          )}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-emerald-300">
                      Registro histórico de solo consulta.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </section>
    </main>
  );
}