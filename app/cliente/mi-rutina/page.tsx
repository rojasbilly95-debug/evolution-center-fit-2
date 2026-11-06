
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

function PanelCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p className="text-sm text-cyan-300">
        Cargando tu rutina personalizada...
      </p>
    </main>
  );
}

function Mensaje({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-7">
      <h2 className="text-xl font-bold text-white">
        {titulo}
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {descripcion}
      </p>
    </section>
  );
}

async function ContenidoMiRutina() {
  // Compatible con Cache Components de Next.js 16.
  await connection();

  const supabase = await createClient();

  // 1. Autenticación
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. Comprobar el rol.
  const { data: rol, error: rolError } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (rolError || rol?.rol !== "cliente") {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <Mensaje
            titulo="Acceso restringido"
            descripcion="Esta sección está disponible únicamente para clientes."
          />
          <Link
            href="/cliente"
            className="mt-5 inline-block text-cyan-300 hover:underline"
          >
            Volver al portal
          </Link>
        </div>
      </main>
    );
  }

  // 3. Buscar la asignación vigente más reciente.
  const {
    data: asignacion,
    error: asignacionError,
  } = await supabase
    .from("asignaciones_rutinas")
    .select("id, rutina_id, estado")
    .eq("cliente_id", user.id)
    .in("estado", ["programada", "activa"])
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Leer la rutina y sus objetivos.
  let nombreRutina = "";
  let filasRutina: {
    ejercicio_id: number;
    orden: number;
    series: number | null;
    repeticiones: number | null;
    duracion_min: number | null;
    descanso_seg: number | null;
  }[] = [];

  let catalogoPorId = new Map<
    number,
    {
      id: number;
      nombre: string;
      descripcion: string | null;
      grupo_muscular: string | null;
      tipo: string | null;
    }
  >();

  let errorDatos = false;

  if (asignacion && !asignacionError) {
    const { data: rutina, error: rutinaError } =
      await supabase
        .from("rutinas")
        .select("id, nombre")
        .eq("id", asignacion.rutina_id)
        .maybeSingle();

    if (rutinaError || !rutina) {
      errorDatos = true;
    } else {
      nombreRutina = rutina.nombre;

      const {
        data: plantilla,
        error: plantillaError,
      } = await supabase
        .from("rutina_ejercicios")
        .select(
          "ejercicio_id, orden, series, repeticiones, duracion_min, descanso_seg"
        )
        .eq("rutina_id", asignacion.rutina_id)
        .order("orden", { ascending: true });

      if (plantillaError) {
        errorDatos = true;
      } else {
        filasRutina = plantilla ?? [];

        const ids = [
          ...new Set(
            filasRutina.map((fila) => fila.ejercicio_id)
          ),
        ];

        if (ids.length > 0) {
          const {
            data: catalogo,
            error: catalogoError,
          } = await supabase
            .from("ejercicios")
            .select(
              "id, nombre, descripcion, grupo_muscular, tipo"
            )
            .in("id", ids);

          if (catalogoError) {
            errorDatos = true;
          } else {
            catalogoPorId = new Map(
              (catalogo ?? []).map((ejercicio) => [
                ejercicio.id,
                ejercicio,
              ])
            );
          }
        }
      }
    }
  }

  const totalSeries = filasRutina.reduce(
    (total, fila) => total + (fila.series ?? 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-xl font-black">
              EVOLUTION CENTER FIT{" "}
              <span className="text-cyan-400">2.0</span>
            </h1>

            <p className="mt-1 text-xs text-slate-400">
              Portal del cliente
            </p>
          </div>

          <Link
            href="/cliente"
            className="rounded-xl border border-cyan-400/30 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
          >
            Volver a mi panel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
          Mi entrenamiento
        </p>

        <h2 className="mt-3 text-3xl font-bold">
          Mi rutina personalizada
        </h2>

        <p className="mt-3 text-sm text-slate-400">
          Consulta los ejercicios que tu entrenador ha
          aprobado y asignado a tu plan.
        </p>

        <div className="mt-8">
          {asignacionError ? (
            <Mensaje
              titulo="No se pudo consultar tu plan"
              descripcion="Comprueba tu conexión e inténtalo nuevamente."
            />
          ) : !asignacion ? (
            <Mensaje
              titulo="Todavía no tienes una rutina vigente"
              descripcion="Cuando tu entrenador te asigne una rutina, podrás consultar aquí sus ejercicios."
            />
          ) : errorDatos ? (
            <Mensaje
              titulo="No se pudieron cargar los ejercicios"
              descripcion="No fue posible consultar todos los datos de tu rutina. Revisa los permisos de lectura y vuelve a intentarlo."
            />
          ) : (
            <>
              <section className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Plan asignado
                    </p>

                    <h3 className="mt-3 text-2xl font-bold">
                      {nombreRutina}
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      Asignación #{asignacion.id}
                    </p>
                  </div>

                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    {asignacion.estado === "activa"
                      ? "Activa"
                      : "Programada"}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-950 p-4">
                    <p className="text-xs text-slate-400">
                      Ejercicios
                    </p>

                    <p className="mt-2 text-3xl font-bold text-cyan-300">
                      {filasRutina.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4">
                    <p className="text-xs text-slate-400">
                      Series objetivo por sesión
                    </p>

                    <p className="mt-2 text-3xl font-bold text-cyan-300">
                      {totalSeries}
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-7">
                <h3 className="text-xl font-bold">
                  Ejercicios de mi rutina
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Objetivos establecidos para una sesión
                  de esta rutina.
                </p>

                {filasRutina.length === 0 ? (
                  <div className="mt-5">
                    <Mensaje
                      titulo="No hay ejercicios disponibles"
                      descripcion="La rutina no tiene ejercicios visibles para tu cuenta. El entrenador debe verificar su configuración y los permisos."
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {filasRutina.map((fila) => {
                      const ejercicio = catalogoPorId.get(
                        fila.ejercicio_id
                      );

                      return (
                        <article
                          key={`${fila.orden}-${fila.ejercicio_id}`}
                          className="rounded-2xl border border-white/10 bg-slate-900 p-6"
                        >
                          <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                            Ejercicio {fila.orden}
                          </p>

                          <h4 className="mt-3 text-lg font-bold">
                            {ejercicio?.nombre ??
                              `Ejercicio #${fila.ejercicio_id}`}
                          </h4>

                          {ejercicio?.grupo_muscular && (
                            <p className="mt-2 text-sm text-slate-400">
                              {ejercicio.grupo_muscular}
                              {ejercicio.tipo
                                ? ` · ${ejercicio.tipo}`
                                : ""}
                            </p>
                          )}

                          {ejercicio?.descripcion && (
                            <p className="mt-3 text-sm leading-6 text-slate-400">
                              {ejercicio.descripcion}
                            </p>
                          )}

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-slate-950 p-3">
                              <p className="text-xs text-slate-400">
                                Series
                              </p>
                              <p className="mt-1 font-bold">
                                {fila.series ?? "—"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-950 p-3">
                              <p className="text-xs text-slate-400">
                                {fila.repeticiones != null
                                  ? "Repeticiones"
                                  : "Duración"}
                              </p>
                              <p className="mt-1 font-bold">
                                {fila.repeticiones != null
                                  ? fila.repeticiones
                                  : fila.duracion_min != null
                                    ? `${fila.duracion_min} min`
                                    : "—"}
                              </p>
                            </div>

                            <div className="col-span-2 rounded-xl bg-slate-950 p-3">
                              <p className="text-xs text-slate-400">
                                Descanso entre series
                              </p>
                              <p className="mt-1 font-bold">
                                {fila.descanso_seg != null
                                  ? `${fila.descanso_seg} segundos`
                                  : "No especificado"}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <p className="mt-7 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-300">
                Esta pantalla muestra los objetivos de
                tu rutina. Los resultados reales de cada
                entrenamiento se registrarán durante las
                sesiones supervisadas por tu entrenador.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function MiRutinaPage() {
  return (
    <Suspense fallback={<PanelCarga />}>
      <ContenidoMiRutina />
    </Suspense>
  );
}
