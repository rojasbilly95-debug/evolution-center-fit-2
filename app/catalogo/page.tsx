
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import CatalogoInteractivo, {
  type Ejercicio,
  type Rutina,
  type RutinaEjercicio,
} from "./catalogo-interactivo";

function PantallaCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p className="text-slate-300">
        Cargando catálogo de entrenamiento...
      </p>
    </main>
  );
}

async function ContenidoCatalogo() {
  // Evitar prerenderizar datos de sesión.
  await connection();

  const supabase = await createClient();

  // 1. Verificar identidad.
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  // 2. Comprobar rol en PostgreSQL.
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .single();

  if (
    accesoError ||
    !["entrenador", "administrador"].includes(
      acceso?.rol ?? ""
    )
  ) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-white">
        <h1 className="text-3xl font-bold">
          Acceso restringido
        </h1>
        <p className="text-center text-slate-400">
          Este catálogo es exclusivo para
          entrenadores y administradores.
        </p>
        <Link
          href="/login"
          className="text-cyan-400 hover:underline"
        >
          Volver a mi sesión
        </Link>
      </main>
    );
  }

  // 3. Consultar las tres tablas reales.
  const [
    resultadoEjercicios,
    resultadoRutinas,
    resultadoRelaciones,
  ] = await Promise.all([
    supabase
      .from("ejercicios")
      .select(
        "id,nombre,descripcion,grupo_muscular,tipo,nivel,equipamiento,lugar,activo"
      )
      .order("nombre"),

    supabase
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,lugar,duracion_min,frecuencia_semanal,estado"
      )
      .order("nombre"),

    supabase
      .from("rutina_ejercicios")
      .select(
        "rutina_id,ejercicio_id,orden,series,repeticiones,duracion_min,descanso_seg"
      )
      .order("orden"),
  ]);

  // 4. No ocultar errores como si fueran tablas vacías.
  if (
    resultadoEjercicios.error ||
    resultadoRutinas.error ||
    resultadoRelaciones.error
  ) {
    console.error("Error al consultar catálogo", {
      ejercicios: resultadoEjercicios.error?.message,
      rutinas: resultadoRutinas.error?.message,
      relaciones: resultadoRelaciones.error?.message,
    });

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
        <h1 className="text-2xl font-bold">
          No se pudo cargar el catálogo
        </h1>
        <p className="text-center text-slate-400">
          Revisa los permisos y las políticas RLS
          de las tres tablas en Supabase.
        </p>
        <Link
          href="/login"
          className="text-cyan-400"
        >
          Volver
        </Link>
      </main>
    );
  }

  const rol = acceso.rol as
    | "entrenador"
    | "administrador";

  return (
    <CatalogoInteractivo
      rol={rol}
      ejercicios={
        (resultadoEjercicios.data ?? []) as Ejercicio[]
      }
      rutinas={
        (resultadoRutinas.data ?? []) as Rutina[]
      }
      relaciones={
        (resultadoRelaciones.data ?? []) as RutinaEjercicio[]
      }
    />
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<PantallaCarga />}>
      <ContenidoCatalogo />
    </Suspense>
  );
}
