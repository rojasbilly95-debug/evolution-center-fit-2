
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function cerrarSesion() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("No se pudo cerrar la sesión.");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
