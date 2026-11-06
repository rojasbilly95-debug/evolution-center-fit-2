
import { NextResponse, connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorJson(mensaje: string, status: number) {
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

export async function GET(request: Request) {
  // Esperar una solicitud real antes de acceder a su URL.
  await connection();

  try {
    // 1. Leer parámetros opcionales.
    const url = new URL(request.url);

    const clienteId = url.searchParams.get("clienteId");
    const rutinaIdTexto = url.searchParams.get("rutinaId");

    // 2. Validar identificador del cliente.
    if (
      clienteId !== null &&
      !UUID_REGEX.test(clienteId)
    ) {
      return errorJson(
        "Identificador de cliente inválido.",
        400
      );
    }

    // 3. Validar identificador de rutina.
    if (
      rutinaIdTexto !== null &&
      (
        !/^[1-9]\d*$/.test(rutinaIdTexto) ||
        !Number.isSafeInteger(Number(rutinaIdTexto))
      )
    ) {
      return errorJson(
        "Identificador de rutina inválido.",
        400
      );
    }

    // 4. Autenticación mediante la sesión actual.
    const supabase = await createClient();

    const {
      data: auth,
      error: authError,
    } = await supabase.auth.getClaims();

    const entrenadorId = auth?.claims?.sub;

    if (authError || !entrenadorId) {
      return errorJson(
        "Debes iniciar sesión.",
        401
      );
    }

    // 5. Verificar rol de entrenador.
    const {
      data: rol,
      error: errorRol,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .maybeSingle();

    if (errorRol) {
      return errorJson(
        "No se pudo verificar tu rol.",
        500
      );
    }

    if (rol?.rol !== "entrenador") {
      return errorJson(
        "Solo los entrenadores pueden consultar este historial.",
        403
      );
    }

    // 6. Consultar revisiones del entrenador autenticado.
    // Se respetan las políticas RLS de Supabase.
    let consulta = supabase
      .from("revisiones_rutinas")
      .select(
        "id,cliente_id,entrenador_id,rutina_id,decision,observaciones,puntaje_compatibilidad,metodo_motor,revisado_en"
      )
      .eq("entrenador_id", entrenadorId);

    // Filtro opcional por cliente.
    if (clienteId) {
      consulta = consulta.eq(
        "cliente_id",
        clienteId
      );
    }

    // Filtro opcional por rutina.
    if (rutinaIdTexto) {
      consulta = consulta.eq(
        "rutina_id",
        Number(rutinaIdTexto)
      );
    }

    // 7. Obtener las últimas 50 revisiones.
    const {
      data: revisiones,
      error: errorConsulta,
    } = await consulta
      .order("id", { ascending: false })
      .limit(50);

    if (errorConsulta) {
      console.error(
        "Error al consultar historial:",
        errorConsulta.code,
        errorConsulta.message
      );

      return errorJson(
        "No se pudo consultar el historial de revisiones.",
        500
      );
    }

    // 8. Respuesta.
    return NextResponse.json(
      {
        mensaje: "Historial consultado correctamente.",
        total: revisiones?.length ?? 0,
        revisiones: revisiones ?? [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error inesperado al consultar historial:",
      error
    );

    return errorJson(
      "Ocurrió un error al consultar el historial.",
      500
    );
  }
}
