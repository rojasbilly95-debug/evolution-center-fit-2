import { connection, NextResponse } from "next/server";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient as crearServidor } from "@/lib/supabase/server";

function errorJson(mensaje: string, status: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: Request) {
  await connection();

  try {
    // 1. Validar origen de la solicitud.
    const origen = request.headers.get("origin");
    const origenEsperado = new URL(request.url).origin;

    if (!origen || origen !== origenEsperado) {
      return errorJson("Origen no autorizado.", 403);
    }

    // 2. Exigir JSON.
    const tipo = request.headers.get("content-type") ?? "";

    if (!/^application\/json(?:\s*;|$)/i.test(tipo)) {
      return errorJson("Se requiere JSON.", 415);
    }

    const texto = await request.text();

    if (!texto || texto.length > 4096) {
      return errorJson("Solicitud inválida.", 400);
    }

    let body: unknown;

    try {
      body = JSON.parse(texto);
    } catch {
      return errorJson("JSON inválido.", 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorJson("Datos inválidos.", 400);
    }

    const datos = body as Record<string, unknown>;
    const asignacionId = datos.asignacionId;
    const motivo =
      typeof datos.motivo === "string"
        ? datos.motivo.trim()
        : "";

    const confirmarFaltantes =
      datos.confirmarFaltantes === true;

    if (
      typeof asignacionId !== "number" ||
      !Number.isSafeInteger(asignacionId) ||
      asignacionId <= 0
    ) {
      return errorJson("Identificador inválido.", 400);
    }

    if (motivo.length < 20 || motivo.length > 1000) {
      return errorJson(
        "La justificación debe tener entre 20 y 1000 caracteres.",
        400
      );
    }

    if (
      datos.confirmarFaltantes !== undefined &&
      typeof datos.confirmarFaltantes !== "boolean"
    ) {
      return errorJson("Confirmación inválida.", 400);
    }

    // 3. Identificar al entrenador autenticado.
    const servidor = await crearServidor();
    const { data: sesion, error: errorAuth } =
      await servidor.auth.getUser();

    const usuario = sesion.user;

    if (errorAuth || !usuario) {
      return errorJson("Debes iniciar sesión.", 401);
    }

    // 4. Crear cliente administrativo en servidor.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clave =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clave) {
      return errorJson(
        "Servicio no configurado.",
        503
      );
    }

    const admin = crearAdmin(url, clave, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 5. Confirmar que tiene rol entrenador.
    const { data: roles, error: errorRol } =
      await admin
        .from("usuario_roles")
        .select("rol")
        .eq("usuario_id", usuario.id)
        .eq("rol", "entrenador")
        .limit(1);

    if (errorRol) {
      return errorJson(
        "No se pudo verificar el rol.",
        500
      );
    }

    if (!roles?.length) {
      return errorJson(
        "Acceso exclusivo para entrenadores.",
        403
      );
    }

    // 6. Consultar el plan solicitado.
    const { data: plan, error: errorPlan } =
      await admin
        .from("asignaciones_rutinas")
        .select("id,cliente_id,entrenador_id")
        .eq("id", asignacionId)
        .maybeSingle();

    if (errorPlan) {
      return errorJson(
        "No se pudo consultar el plan.",
        500
      );
    }

    if (!plan) {
      return errorJson("Plan no encontrado.", 404);
    }

    if (plan.entrenador_id !== usuario.id) {
      return errorJson(
        "No eres responsable de este plan.",
        403
      );
    }

    // 7. Verificar la relación activa con el cliente.
    const { data: relacion, error: errorRelacion } =
      await admin
        .from("asignaciones_entrenadores")
        .select("cliente_id")
        .eq("cliente_id", plan.cliente_id)
        .eq("entrenador_id", usuario.id)
        .eq("activa", true)
        .maybeSingle();

    if (errorRelacion) {
      return errorJson(
        "No se pudo verificar la relación.",
        500
      );
    }

    if (!relacion) {
      return errorJson(
        "No tienes acceso a este cliente.",
        403
      );
    }

    // 8. Ejecutar el cierre auditado en PostgreSQL.
    // El ID del entrenador procede de la sesión,
    // nunca del cuerpo enviado por el navegador.
    const { data: resultado, error: errorRpc } =
      await admin.rpc(
        "cerrar_plan_estudio_revisado",
        {
          p_asignacion_id: asignacionId,
          p_entrenador_id: usuario.id,
          p_motivo: motivo,
          p_confirmar_faltantes: confirmarFaltantes,
        }
      );

    if (errorRpc) {
      console.error("Error cerrando plan:", {
        codigo: errorRpc.code,
        mensaje: errorRpc.message,
      });

      const conflicto = [
        "P0001",
        "23514",
        "23505",
      ].includes(errorRpc.code ?? "");

      return errorJson(
        conflicto
          ? errorRpc.message
          : "No se pudo cerrar el plan.",
        conflicto ? 409 : 500
      );
    }

    return NextResponse.json(
      {
        mensaje: "Plan cerrado correctamente.",
        resultado,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Error inesperado:", error);

    return errorJson(
      "Error inesperado al procesar el cierre.",
      500
    );
  }
}