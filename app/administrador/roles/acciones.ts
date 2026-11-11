
"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as crearClientePrivilegiado } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// =============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.19.2.8
// CAMBIO SEGURO DE ROLES
// =============================================

const RUTA = "/administrador/roles";

const ROLES_VALIDOS = [
  "cliente",
  "entrenador",
  "administrador",
];

const UUID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function cambiarRolUsuario(
  formData: FormData
) {
  // 1. VERIFICAR LA SESION REAL

  const supabase = await createClient();

  const {
    data: identidad,
    error: errorIdentidad,
  } = await supabase.auth.getUser();

  const administradorId = identidad.user?.id;

  if (errorIdentidad || !administradorId) {
    redirect("/login");
  }

  // 2. COMPROBAR EL ROL EN EL SERVIDOR

  const {
    data: permiso,
    error: errorPermiso,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", administradorId)
    .maybeSingle();

  if (
    errorPermiso ||
    permiso?.rol !== "administrador"
  ) {
    redirect("/");
  }

  // 3. LEER Y VALIDAR EL FORMULARIO

  const usuarioId = String(
    formData.get("usuarioId") ?? ""
  ).trim();

  const rolNuevo = String(
    formData.get("rolNuevo") ?? ""
  ).trim();

  const motivo = String(
    formData.get("motivo") ?? ""
  ).trim();

  const confirmado =
    formData.get("confirmar") === "si";

  if (
    !UUID_VALIDO.test(usuarioId) ||
    !ROLES_VALIDOS.includes(rolNuevo) ||
    motivo.length < 10 ||
    motivo.length > 500 ||
    !confirmado
  ) {
    redirect(`${RUTA}?resultado=validacion`);
  }

  // 4. IMPEDIR CAMBIOS DEL PROPIO ROL

  if (usuarioId === administradorId) {
    redirect(`${RUTA}?resultado=bloqueado`);
  }

  // 5. CONFIGURAR CLIENTE PRIVILEGIADO
  // La clave permanece solo en el servidor.

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    console.error(
      "Roles: configuración del servidor incompleta"
    );

    redirect(`${RUTA}?resultado=error`);
  }

  const admin = crearClientePrivilegiado(
    url,
    clave,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 6. EJECUTAR LA FUNCION TRANSACCIONAL
  // PostgreSQL valida las restricciones y
  // registra la auditoría en la misma operación.

  const { error: errorCambio } =
    await admin.rpc("cambiar_rol_seguro", {
      p_administrador_id: administradorId,
      p_usuario_id: usuarioId,
      p_rol_nuevo: rolNuevo,
      p_motivo: motivo,
    });

  if (errorCambio) {
    console.error(
      "Roles: cambio rechazado por PostgreSQL",
      {
        codigo: errorCambio.code,
        mensaje: errorCambio.message,
      }
    );

    redirect(`${RUTA}?resultado=bloqueado`);
  }

  // 7. ACTUALIZAR LA PANTALLA

  revalidatePath(RUTA);

  redirect(`${RUTA}?resultado=correcto`);
}
