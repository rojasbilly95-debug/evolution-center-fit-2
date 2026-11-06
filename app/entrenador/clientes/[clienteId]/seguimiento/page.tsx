export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import ProgramarSesiones from "../../programar-sesiones";

type Props = {
  params: Promise<{ clienteId: string }>;
};

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
      .select("id,estado")
      .eq("cliente_id", clienteId)
      .order("id", { ascending: false })
      .limit(30),
  ]);

  const estadosVigentes = [
    "programada",
    "en_curso",
    "vigente",
    "activa",
  ];

  const planVigente =
    planes?.find((plan) =>
      estadosVigentes.includes(plan.estado)
    ) ?? planes?.[0];

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
              Sin plan de entrenamiento
            </h2>
            <p className="mt-3 text-slate-400">
              Este cliente todavía no tiene una rutina asignada.
            </p>
          </div>
        ) : (
          <ProgramarSesiones
            key={planVigente.id}
            asignacionId={planVigente.id}
          />
        )}
      </section>
    </main>
  );
}