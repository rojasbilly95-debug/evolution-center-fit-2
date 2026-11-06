import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function denegar(mensaje: string, status: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function bloqueoIAEstudio(
  clienteId: string
): Promise<NextResponse | null> {
  try {
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

    const admin = createClient(url, clave, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

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

 // Sin inscripción verificada, no se permite
// utilizar el motor inteligente.
if (!participante) {
  return denegar(
    "El cliente no tiene una inscripción verificada en el estudio. La IA permanece deshabilitada.",
    403
  );
}

    // Sin inscripción verificada, no se permite
    // utilizar el motor inteligente.
    if (!participante) {
      return denegar(
        "El cliente no tiene una inscripción verificada en el estudio. La IA permanece deshabilitada.",
        403
      );
    }

    if (participante.grupo_estudio !== "GE") {
      return denegar(
        "Grupo de investigación no válido.",
        503
      );
    }

    // Calcular la fecha actual en Lima.
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const obtener = (tipo: string) =>
      Number(partes.find((p) => p.type === tipo)?.value);

    const hoy = Date.UTC(
      obtener("year"),
      obtener("month") - 1,
      obtener("day")
    );

    const inicio = Date.parse(
      `${participante.fecha_inicio_estudio}T00:00:00.000Z`
    );

    if (!Number.isFinite(inicio)) {
      return denegar(
        "La fecha del estudio no es válida.",
        503
      );
    }

    const diasTranscurridos = Math.floor(
      (hoy - inicio) / 86400000
    );

    // Semanas 1 a 4: pretest sin intervención.
    if (diasTranscurridos < 28) {
      return denegar(
        "El grupo experimental todavía está en pretest. La IA se habilita desde la semana 5.",
        403
      );
    }

    // Desde la semana 5 se permite la IA para GE.
    return null;
  } catch (error) {
    console.error("Error en control de investigación:", error);

    return denegar(
      "No se pudo verificar el acceso a la IA.",
      503
    );
  }
}
