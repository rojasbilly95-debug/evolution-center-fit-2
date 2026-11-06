
import { NextResponse, connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fallo(mensaje: string, status: number) {
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
  // Evita que Next.js intente prerenderizar
  // este endpoint que depende de request.url.
  await connection();

  try {
    // 1. Validar parámetros.
    const parametros = new URL(request.url).searchParams;

    const clienteId = parametros.get("clienteId");
    const rutinaIdTexto = parametros.get("rutinaId") ?? "";
    const rutinaId = Number(rutinaIdTexto);

    if (!clienteId || !UUID.test(clienteId)) {
      return fallo("Cliente no válido.", 400);
    }

    if (
      !/^[1-9]\d*$/.test(rutinaIdTexto) ||
      !Number.isSafeInteger(rutinaId)
    ) {
      return fallo("Rutina no válida.", 400);
    }

    // 2. Verificar sesión autenticada.
    const supabase = await createClient();

    const {
      data: autenticacion,
      error: errorAuth,
    } = await supabase.auth.getClaims();

    const entrenadorId = autenticacion?.claims?.sub;

    if (errorAuth || !entrenadorId) {
      return fallo("Debes iniciar sesión.", 401);
    }

    // 3. Verificar rol de entrenador.
    const {
      data: rol,
      error: errorRol,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .maybeSingle();

    if (errorRol) {
      return fallo(
        "No se pudo verificar tu rol.",
        500
      );
    }

    if (rol?.rol !== "entrenador") {
      return fallo("Acceso no autorizado.", 403);
    }

    // 4. Verificar relación activa entrenador-cliente.
    const {
      data: relacion,
      error: errorRelacion,
    } = await supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("cliente_id", clienteId)
      .eq("entrenador_id", entrenadorId)
      .eq("activa", true)
      .maybeSingle();

    if (errorRelacion) {
      return fallo(
        "No se pudo verificar la asignación del entrenador.",
        500
      );
    }

    if (!relacion) {
      return fallo(
        "No tienes acceso a este cliente.",
        403
      );
    }

    // 5. Crear cliente administrativo solo en servidor.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clave =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clave) {
      return fallo(
        "Falta la configuración del servidor.",
        503
      );
    }

    const admin = createAdminClient(url, clave, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const columnas =
      "id,rutina_id,revision_id,fecha_inicio,fecha_fin,estado,asignada_en";

    // 6. Buscar un plan vigente del cliente.
    const {
      data: planVigente,
      error: errorPlan,
    } = await admin
      .from("asignaciones_rutinas")
      .select(columnas)
      .eq("cliente_id", clienteId)
      .in("estado", [
        "programada",
        "activa",
        "pausada",
      ])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorPlan) {
      console.error(
        "Consulta de plan vigente:",
        errorPlan
      );

      return fallo(
        "No se pudo consultar el plan vigente.",
        500
      );
    }

    // 7. Buscar la última asignación de la rutina.
    const {
      data: ultimaAsignacion,
      error: errorUltima,
    } = await admin
      .from("asignaciones_rutinas")
      .select(columnas)
      .eq("cliente_id", clienteId)
      .eq("rutina_id", rutinaId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorUltima) {
      console.error(
        "Consulta de última asignación:",
        errorUltima
      );

      return fallo(
        "No se pudo consultar el historial de asignación.",
        500
      );
    }

    // 8. Respuesta.
    return NextResponse.json(
      {
        planVigente: planVigente ?? null,
        ultimaAsignacion: ultimaAsignacion ?? null,
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
      "Error al consultar estado de asignación:",
      error
    );

    return fallo(
      "Ocurrió un error al consultar la asignación.",
      500
    );
  }
}
