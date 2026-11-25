import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ESTUDIO, fechaHoyLima } from "@/lib/investigacion/calendario-estudio";

// =====================================
// RESPUESTA DE ACCESO DENEGADO
// =====================================

function denegar(mensaje: string, status: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// =====================================
// BLOQUEO DE IA SEGÚN EL ESTUDIO
// =====================================

export async function bloqueoIAEstudio(
  clienteId: string
): Promise<NextResponse | null> {
  try {
    // 1. Configuración privada de Supabase.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clave =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clave) {
      return denegar(
        "Falta la configuración privada de Supabase.",
        503
      );
    }

    // 2. Cliente administrativo exclusivo del servidor.
    const admin = createClient(url, clave, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 3. Consultar inscripción del cliente.
    const { data: participante, error } = await admin
      .from("participantes_estudio")
      .select("grupo_estudio,fecha_inicio_estudio")
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (error) {
      console.error("Error verificando grupo:", error);

      return denegar(
        "No se pudo verificar el grupo de investigación.",
        503
      );
    }

    // 4. Bloquear clientes sin inscripción verificada.
    if (!participante) {
      return denegar(
        "El cliente no tiene una inscripción verificada en el estudio. La IA permanece deshabilitada.",
        403
      );
    }

    // 5. El grupo control (GC) nunca puede utilizar IA.
    if (participante.grupo_estudio === "GC") {
      return denegar(
        "El grupo control no tiene acceso al motor inteligente.",
        403
      );
    }

    // 6. Rechazar grupos desconocidos o no válidos.
    if (participante.grupo_estudio !== "GE") {
      return denegar(
        "Grupo de investigación no válido.",
        503
      );
    }

    // Todos los participantes comparten calendario.
    if (participante.fecha_inicio_estudio !== ESTUDIO.inicio) {
      return denegar(
        "La fecha de inscripción no coincide con el calendario oficial del estudio.",
        409
      );
    }

    const hoy = fechaHoyLima();

    if (hoy < ESTUDIO.inicioIntervencion) {
      return denegar(
        "La IA permanece bloqueada hasta el inicio de la intervención (07/12/2026).",
        403
      );
    }

    if (hoy > ESTUDIO.finIntervencion) {
      return denegar(
        "La intervención terminó el 03/01/2027. No se permiten nuevas recomendaciones durante el postest.",
        403
      );
    }

    // GE: IA permitida exclusivamente durante la intervención.
    return null;
  } catch (error) {
    console.error(
      "Error en control de investigación:",
      error
    );

    return denegar(
      "No se pudo verificar el acceso a la IA.",
      503
    );
  }
}