
import "server-only";

import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

import MarcoAdministrador from "./_components/marco-administrador";

// ==========================================
// EVOLUTION CENTER FIT 2.0
// LAYOUT GENERAL DEL ADMINISTRADOR
// ==========================================

// CIERRE REAL DE SESION

async function cerrarSesion() {
  "use server";

  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

// ==========================================
// VERIFICAR ACCESO ADMINISTRATIVO
// ==========================================

async function AreaAdministrativa({
  children,
}: {
  children: ReactNode;
}) {
  await connection();

  const supabase = await createClient();

  const {
    data: identidad,
    error: errorAuth,
  } = await supabase.auth.getUser();

  if (
    errorAuth ||
    !identidad.user
  ) {
    redirect("/login");
  }

  const {
    data: permiso,
    error: errorRol,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorRol ||
    permiso?.rol !== "administrador"
  ) {
    redirect("/");
  }

  return (
    <MarcoAdministrador
      cerrarSesion={cerrarSesion}
    >
      {children}
    </MarcoAdministrador>
  );
}

// ==========================================
// LAYOUT PRINCIPAL
// ==========================================

export default function AdministradorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#080e1b] text-cyan-200">
          Verificando acceso administrativo...
        </main>
      }
    >
      <AreaAdministrativa>
        {children}
      </AreaAdministrativa>
    </Suspense>
  );
}
