
import "server-only";

import {
  createClient,
} from "@supabase/supabase-js";

// EVOLUTION CENTER FIT 2.0
// FASE 111.17.4
// Auditoría de revisión IA con vínculo explícito.

type DatosRevisionIA = {
  revisionId: number;
  elegible: boolean;
};

export async function registrarRevisionIA({
  revisionId,
  elegible,
}: DatosRevisionIA): Promise<void> {
  if (
    !Number.isSafeInteger(revisionId) ||
    revisionId <= 0 ||
    typeof elegible !== "boolean"
  ) {
    console.error(
      "Trazabilidad IA: datos inválidos."
    );
    return;
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    console.error(
      "Trazabilidad IA: falta configuración privada."
    );
    return;
  }

  try {
    const admin = createClient(url, clave, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // La función trigger de PostgreSQL
    // recuperará cliente, entrenador, rutina,
    // decisión, puntaje, método y fecha
    // desde revisiones_rutinas.

    const { error } = await admin
      .from("ecf_trazabilidad_revisiones_ia")
      .insert({
        revision_id: revisionId,
        elegible,
      });

    if (error) {
      console.error(
        "Trazabilidad IA: registro rechazado.",
        error.code,
        error.message
      );
    }
  } catch (error) {
    console.error(
      "Trazabilidad IA: fallo inesperado.",
      error instanceof Error
        ? error.name
        : "desconocido"
    );
  }
}
