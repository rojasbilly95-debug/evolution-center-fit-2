
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import FormularioPerfil from "./formulario-perfil";

function CargandoPerfil() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p className="text-slate-300">
        Cargando perfil del cliente...
      </p>
    </main>
  );
}

async function ContenidoPerfil() {
  // Los datos privados se consultan en cada solicitud.
  await connection();

  const supabase = await createClient();

  // Comprobar identidad.
  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  // Comprobar que pertenece al rol cliente.
  const { data: acceso, error: accesoError } =
    await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", userId)
      .single();

  if (accesoError || acceso?.rol !== "cliente") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-white">
        <h1 className="text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="text-center text-slate-400">
          Solo los clientes autorizados pueden
          acceder a este formulario.
        </p>

        <Link href="/login" className="text-cyan-400">
          Volver a mi sesión
        </Link>
      </main>
    );
  }

  // Obtener el perfil actual, si existe.
  const { data: perfil, error: perfilError } =
    await supabase
      .from("perfiles_clientes")
      .select(
        "edad,peso_kg,estatura_cm,objetivo,experiencia,frecuencia_semanal,minutos_por_sesion,lugar,equipamiento,restricciones"
      )
      .eq("usuario_id", userId)
      .maybeSingle();

  if (perfilError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-white">
        <h1 className="text-2xl font-bold">
          No se pudo cargar el perfil
        </h1>

        <p className="text-slate-400">
          Comprueba los permisos de la tabla en Supabase.
        </p>

        <Link href="/cliente" className="text-cyan-400">
          Volver al panel
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/cliente"
          className="text-sm font-medium text-cyan-400 hover:underline"
        >
          ← Volver al panel del cliente
        </Link>

        <header className="mb-8 mt-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-cyan-400">
            Evolution Center Fit 2.0
          </p>

          <h1 className="text-3xl font-black sm:text-4xl">
            Mi perfil de entrenamiento
          </h1>

          <p className="mt-3 text-slate-400">
            Completa tu información para preparar
            futuras recomendaciones personalizadas.
          </p>
        </header>

        <FormularioPerfil perfilInicial={perfil} />

      </div>
    </main>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<CargandoPerfil />}>
      <ContenidoPerfil />
    </Suspense>
  );
}
