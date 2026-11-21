"use server";

import { revalidatePath } from "next/cache";
import { createClient as crearAdmin } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type ResultadoAccion = {
  ok: boolean;
  mensaje: string;
};

const RUTA = "/administrador/usuarios";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resultado(
  ok: boolean,
  mensaje: string
): ResultadoAccion {
  return { ok, mensaje };
}

function clientePrivilegiado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    throw new Error(
      "Faltan las credenciales privadas de Supabase."
    );
  }

  return crearAdmin(url, clave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function comprobarAdministrador() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(
      "Tu sesión ha caducado. Inicia sesión nuevamente."
    );
  }

  const admin = clientePrivilegiado();

  const { data: rol, error: errorRol } = await admin
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (errorRol || rol?.rol !== "administrador") {
    throw new Error(
      "No tienes autorización para gestionar usuarios."
    );
  }

  return {
    admin,
    responsableId: user.id,
  };
}

async function iniciarAuditoria(
  admin: ReturnType<typeof clientePrivilegiado>,
  responsableId: string,
  usuarioId: string,
  accion: "editar_nombre" | "suspender" | "reactivar",
  datos: Record<string, unknown>
) {
  const { data, error } = await admin
    .from("auditoria_gestion_usuarios")
    .insert({
      responsable_id: responsableId,
      usuario_id: usuarioId,
      accion,
      resultado: "iniciada",
      datos,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      "No se pudo registrar la auditoría. Operación cancelada."
    );
  }

  return data.id as number;
}

async function terminarAuditoria(
  admin: ReturnType<typeof clientePrivilegiado>,
  auditoriaId: number,
  completada: boolean
) {
  const { error } = await admin
    .from("auditoria_gestion_usuarios")
    .update({
      resultado: completada
        ? "completada"
        : "fallida",
    })
    .eq("id", auditoriaId);

  if (error) {
    console.error(
      "No se pudo cerrar la auditoría:",
      error.message
    );
  }
}

// ======================================
// ACTUALIZAR NOMBRE DEL USUARIO
// ======================================

export async function actualizarNombreUsuario(
  _anterior: ResultadoAccion,
  formulario: FormData
): Promise<ResultadoAccion> {
  const id = String(formulario.get("usuarioId") ?? "");
  const nombre = String(
    formulario.get("nombreCompleto") ?? ""
  )
    .trim()
    .replace(/\s+/g, " ");

  if (!UUID.test(id)) {
    return resultado(false, "Identificador inválido.");
  }

  if (nombre.length < 3 || nombre.length > 120) {
    return resultado(
      false,
      "El nombre debe tener entre 3 y 120 caracteres."
    );
  }

  try {
    const { admin, responsableId } =
      await comprobarAdministrador();

    const { data: usuario, error: errorConsulta } =
      await admin
        .from("usuarios")
        .select("nombre_completo")
        .eq("id", id)
        .single();

    if (errorConsulta || !usuario) {
      return resultado(
        false,
        "No se encontró el usuario."
      );
    }

    if (usuario.nombre_completo === nombre) {
      return resultado(
        true,
        "El nombre ya estaba actualizado."
      );
    }

    const auditoriaId = await iniciarAuditoria(
      admin,
      responsableId,
      id,
      "editar_nombre",
      {
        nombre_anterior: usuario.nombre_completo,
        nombre_nuevo: nombre,
      }
    );

    const { data: actualizado, error } = await admin
      .from("usuarios")
      .update({
        nombre_completo: nombre,
      })
      .eq("id", id)
      .select("id")
      .single();

    await terminarAuditoria(
      admin,
      auditoriaId,
      !error && Boolean(actualizado)
    );

    if (error || !actualizado) {
      return resultado(
        false,
        "No se pudo actualizar el nombre."
      );
    }

    revalidatePath(RUTA);

    return resultado(
      true,
      "Nombre actualizado correctamente."
    );
  } catch (error) {
    return resultado(
      false,
      error instanceof Error
        ? error.message
        : "No se pudo completar la operación."
    );
  }
}

// ======================================
// SUSPENDER O REACTIVAR CUENTA
// ======================================

export async function cambiarEstadoUsuario(
  _anterior: ResultadoAccion,
  formulario: FormData
): Promise<ResultadoAccion> {
  const id = String(formulario.get("usuarioId") ?? "");
  const operacion = String(
    formulario.get("operacion") ?? ""
  );

  if (!UUID.test(id)) {
    return resultado(false, "Identificador inválido.");
  }

  if (
    operacion !== "suspender" &&
    operacion !== "reactivar"
  ) {
    return resultado(
      false,
      "Operación no permitida."
    );
  }

  try {
    const { admin, responsableId } =
      await comprobarAdministrador();

    // No permitir que un administrador se bloquee
    // a sí mismo.
    if (id === responsableId) {
      return resultado(
        false,
        "No puedes suspender tu propia cuenta."
      );
    }

    const { data: rolObjetivo, error: errorRol } =
      await admin
        .from("usuario_roles")
        .select("rol")
        .eq("usuario_id", id)
        .maybeSingle();

    if (errorRol) {
      return resultado(
        false,
        "No se pudo verificar el rol del usuario."
      );
    }

    // Las cuentas administrativas se gestionan
    // mediante un procedimiento separado.
    if (rolObjetivo?.rol === "administrador") {
      return resultado(
        false,
        "No se permite suspender administradores desde esta pantalla."
      );
    }

    const { data: cuenta, error: errorCuenta } =
      await admin.auth.admin.getUserById(id);

    if (errorCuenta || !cuenta.user) {
      return resultado(
        false,
        "No se encontró la cuenta en Supabase Auth."
      );
    }

    const suspendidoActualmente =
      Boolean(
        cuenta.user.banned_until &&
        new Date(cuenta.user.banned_until).getTime() >
          Date.now()
      );

    if (
      (operacion === "suspender" &&
        suspendidoActualmente) ||
      (operacion === "reactivar" &&
        !suspendidoActualmente)
    ) {
      return resultado(
        true,
        "La cuenta ya tiene el estado solicitado."
      );
    }

    const auditoriaId = await iniciarAuditoria(
      admin,
      responsableId,
      id,
      operacion,
      {
        suspendido_antes: suspendidoActualmente,
      }
    );

    const { error } =
      await admin.auth.admin.updateUserById(id, {
        ban_duration:
          operacion === "suspender"
            ? "876000h"
            : "none",
      });

    await terminarAuditoria(
      admin,
      auditoriaId,
      !error
    );

    if (error) {
      return resultado(
        false,
        "Supabase no pudo cambiar el estado de la cuenta."
      );
    }

    revalidatePath(RUTA);

    return resultado(
      true,
      operacion === "suspender"
        ? "Cuenta suspendida. Los tokens existentes pueden seguir vigentes hasta su expiración."
        : "Cuenta reactivada correctamente."
    );
  } catch (error) {
    return resultado(
      false,
      error instanceof Error
        ? error.message
        : "No se pudo cambiar el estado."
    );
  }
}