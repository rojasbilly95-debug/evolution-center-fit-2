import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // 7. Calcular fecha actual en Lima, Perú.
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const obtener = (tipo: string) =>
      Number(
        partes.find((p) => p.type === tipo)?.value
      );

    const hoy = Date.UTC(
      obtener("year"),
      obtener("month") - 1,
      obtener("day")
    );

    // 8. Verificar fecha de inicio del estudio.
    const fechaInicio = participante.fecha_inicio_estudio;

    if (
      typeof fechaInicio !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)
    ) {
      return denegar(
        "La fecha del estudio no es válida.",
        503
      );
    }

    const inicio = Date.parse(
      `${fechaInicio}T00:00:00.000Z`
    );

    if (
      !Number.isFinite(hoy) ||
      !Number.isFinite(inicio) ||
      new Date(inicio).toISOString().slice(0, 10) !==
        fechaInicio
    ) {
      return denegar(
        "La fecha del estudio no es válida.",
        503
      );
    }

    // 9. Calcular días transcurridos.
    const diasTranscurridos = Math.floor(
      (hoy - inicio) / 86400000
    );

    // 10. GE: impedir IA durante las semanas 1 a 4.
    if (diasTranscurridos < 28) {
      return denegar(
        "El grupo experimental todavía está en pretest. La IA se habilita desde la semana 5.",
        403
      );
    }

    // 11. GE: permitir IA desde la semana 5.
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