import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export type PerfilVerificable = {
  edad: number | null;
  peso_kg: number | null;
  estatura_cm: number | null;
  objetivo: string | null;
  experiencia: string | null;
  frecuencia_semanal: number | null;
  minutos_por_sesion: number | null;
  lugar: string | null;
  equipamiento: string[] | null;
  equipamiento_casa: string[] | null;
  equipamiento_gimnasio: string[] | null;
  restricciones: string | null;
};

export const CAMPOS_PERFIL_VERIFICABLE =
  "edad,peso_kg,estatura_cm,objetivo,experiencia,frecuencia_semanal,minutos_por_sesion,lugar,equipamiento,equipamiento_casa,equipamiento_gimnasio,restricciones";

export function clasificacionCompleta(
  perfil: PerfilVerificable
): boolean {
  if (
    !perfil.objetivo ||
    !perfil.experiencia ||
    !perfil.frecuencia_semanal ||
    !perfil.minutos_por_sesion
  ) {
    return false;
  }

  if (perfil.lugar === "casa") {
    return Array.isArray(
      perfil.equipamiento_casa
    );
  }

  if (perfil.lugar === "gimnasio") {
    return Array.isArray(
      perfil.equipamiento_gimnasio
    );
  }

  if (perfil.lugar === "mixto") {
    return (
      Array.isArray(perfil.equipamiento_casa) &&
      Array.isArray(perfil.equipamiento_gimnasio)
    );
  }

  return false;
}

export function huellaPerfil(
  perfil: PerfilVerificable
): string {
  const equipos = (
    valor: string[] | null
  ) =>
    valor === null
      ? null
      : [...valor].sort();

  const serializado = JSON.stringify({
    edad: perfil.edad,
    peso_kg: perfil.peso_kg,
    estatura_cm: perfil.estatura_cm,
    objetivo: perfil.objetivo,
    experiencia: perfil.experiencia,
    frecuencia: perfil.frecuencia_semanal,
    minutos: perfil.minutos_por_sesion,
    lugar: perfil.lugar,
    equipamiento: equipos(
      perfil.equipamiento
    ),
    casa: equipos(
      perfil.equipamiento_casa
    ),
    gimnasio: equipos(
      perfil.equipamiento_gimnasio
    ),
    restricciones:
      perfil.restricciones?.trim() ?? null,
  });

  return createHash("sha256")
    .update(serializado)
    .digest("hex");
}

export function clientePrivadoSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    throw new Error(
      "Falta configuración privada de Supabase."
    );
  }

  return createClient(url, clave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function estadoVerificacionPerfil(
  clienteId: string,
  perfil: PerfilVerificable
) {
  if (!clasificacionCompleta(perfil)) {
    return {
      estado: "incompleto" as const,
      observaciones: "",
    };
  }

  const admin = clientePrivadoSupabase();

  const { data, error } = await admin
    .from("verificaciones_perfil_entrenador")
    .select(
      "estado,observaciones,huella_perfil,revisado_en"
    )
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (error) {
    throw new Error(
      "No se pudo consultar la verificación profesional."
    );
  }

  if (!data) {
    return {
      estado: "pendiente" as const,
      observaciones: "",
    };
  }

  if (
    data.huella_perfil !==
    huellaPerfil(perfil)
  ) {
    return {
      estado: "desactualizado" as const,
      observaciones: data.observaciones,
    };
  }

  return {
    estado: data.estado as
      | "verificado"
      | "requiere_correccion",

    observaciones:
      data.observaciones as string,

    revisadoEn:
      data.revisado_en as string,
  };
}