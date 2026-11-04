
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import BotonRecomendar from "./boton-recomendar";

import { createClient } from "@/lib/supabase/server";

function formatear(texto: string) {
  return texto
    .replaceAll("_", " ")
    .replace(/^./, (letra) => letra.toUpperCase());
}

function CargandoClientes() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p className="text-slate-300">
        Consultando clientes asignados...
      </p>
    </main>
  );
}

function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
      {mensaje}
    </div>
  );
}

async function ContenidoClientes() {
  await connection();

  const supabase = await createClient();

  // 1. Verificar identidad.
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const entrenadorId = auth?.claims?.sub;

  if (authError || !entrenadorId) {
    redirect("/login");
  }

  // 2. Comprobar rol.
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .single();

  if (accesoError || acceso?.rol !== "entrenador") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-white">
        <h1 className="text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="text-slate-400">
          Este módulo es exclusivo para entrenadores.
        </p>

        <Link href="/login" className="text-cyan-400">
          Volver a mi sesión
        </Link>
      </main>
    );
  }

  // 3. Consultar asignaciones activas.
  const {
    data: asignaciones,
    error: errorAsignaciones,
  } = await supabase
    .from("asignaciones_entrenadores")
    .select("cliente_id")
    .eq("entrenador_id", entrenadorId)
    .eq("activa", true);

  const errorConsulta = errorAsignaciones
    ? "No se pudieron consultar las asignaciones."
    : "";

  const ids = (asignaciones ?? []).map(
    (a) => a.cliente_id
  );

  // 4. Consultar nombres y perfiles asignados.
  let clientes: {
    id: string;
    nombre: string;
    objetivo: string | null;
    experiencia: string | null;
    frecuencia: number | null;
    minutos: number | null;
    lugar: string | null;
    equipamiento: string[];
  }[] = [];

  let errorDatos = "";

  if (!errorConsulta && ids.length > 0) {
    const [usuarios, perfiles] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id,nombre_completo")
        .in("id", ids),

      supabase
        .from("perfiles_clientes")
        .select(
          "usuario_id,objetivo,experiencia,frecuencia_semanal,minutos_por_sesion,lugar,equipamiento"
        )
        .in("usuario_id", ids),
    ]);

    if (usuarios.error || perfiles.error) {
      errorDatos =
        "No se pudieron consultar los perfiles. Revisa las políticas RLS.";
    } else {
      const nombresPorId = new Map(
        (usuarios.data ?? []).map((u) => [
          u.id,
          u.nombre_completo,
        ])
      );

      const perfilesPorId = new Map(
        (perfiles.data ?? []).map((p) => [
          p.usuario_id,
          p,
        ])
      );

      clientes = ids.map((id) => {
        const perfil = perfilesPorId.get(id);

        return {
          id,
          nombre:
            nombresPorId.get(id) ??
            "Nombre no disponible",
          objetivo: perfil?.objetivo ?? null,
          experiencia: perfil?.experiencia ?? null,
          frecuencia:
            perfil?.frecuencia_semanal ?? null,
          minutos:
            perfil?.minutos_por_sesion ?? null,
          lugar: perfil?.lugar ?? null,
          equipamiento:
            perfil?.equipamiento ?? [],
        };
      });
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-black">
              EVOLUTION CENTER FIT
              <span className="ml-2 text-cyan-400">
                2.0
              </span>
            </h1>

            <p className="text-xs text-slate-400">
              Gestión de clientes
            </p>
          </div>

          <Link
            href="/entrenador"
            className="text-sm font-medium text-cyan-400 hover:underline"
          >
            Volver al panel
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Portal del entrenador
        </p>

        <h2 className="mt-3 text-3xl font-black sm:text-4xl">
          Mis clientes
        </h2>

        <p className="mt-3 text-slate-400">
          Consulta los perfiles de entrenamiento
          de los clientes que tienes asignados.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">
            Total de clientes asignados
          </p>

          <p className="mt-2 text-4xl font-black text-cyan-400">
            {errorConsulta || errorDatos
              ? "—"
              : clientes.length}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {errorConsulta || errorDatos ? (
            <MensajeError
              mensaje={errorConsulta || errorDatos}
            />
          ) : clientes.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-center">
              <h3 className="text-xl font-bold">
                Sin clientes asignados
              </h3>

              <p className="mt-3 text-slate-400">
                Todavía no tienes asignaciones activas.
              </p>
            </div>
          ) : (
            clientes.map((cliente) => (
              <article
                key={cliente.id}
                className="rounded-3xl border border-white/10 bg-slate-900 p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      Cliente asignado
                    </p>

                    <h3 className="mt-2 text-2xl font-bold">
                      {cliente.nombre}
                    </h3>
                  </div>

                  <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300">
                    Asignación activa
                  </span>
                </div>

                {cliente.objetivo ? (
                  <div className="mt-7 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-xs text-slate-400">
                        Objetivo
                      </p>
                      <p className="mt-2 font-semibold">
                        {formatear(cliente.objetivo)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-xs text-slate-400">
                        Experiencia
                      </p>
                      <p className="mt-2 font-semibold">
                        {cliente.experiencia
                          ? formatear(cliente.experiencia)
                          : "No disponible"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-xs text-slate-400">
                        Frecuencia semanal
                      </p>
                      <p className="mt-2 font-semibold">
                        {cliente.frecuencia ?? "—"} días
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-xs text-slate-400">
                        Tiempo por sesión
                      </p>
                      <p className="mt-2 font-semibold">
                        {cliente.minutos ?? "—"} minutos
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4 sm:col-span-2">
                      <p className="text-xs text-slate-400">
                        Lugar y equipamiento
                      </p>
                      <p className="mt-2 font-semibold">
                        {cliente.lugar
                          ? formatear(cliente.lugar)
                          : "No disponible"}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {cliente.equipamiento.length
                          ? cliente.equipamiento
                            .map(formatear)
                            .join(", ")
                          : "Sin equipamiento registrado"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200">
                    El perfil de entrenamiento aún no
                    está disponible.
                  </p>
                )}

                <div className="mt-6 border-t border-white/10 pt-6">
                  <BotonRecomendar clienteId={cliente.id} />
                </div>

              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default function ClientesEntrenadorPage() {
  return (
    <Suspense fallback={<CargandoClientes />}>
      <ContenidoClientes />
    </Suspense>
  );
}
