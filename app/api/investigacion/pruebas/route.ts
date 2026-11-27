import "server-only";

import { connection, NextResponse } from "next/server";
import { createClient as crearClienteServidor } from "@/lib/supabase/server";
import { createClient as crearClienteAdmin } from "@supabase/supabase-js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorJson(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status: estado,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(request: Request) {
  await connection();

  try {
    const url = new URL(request.url);
    const clienteId = url.searchParams.get("clienteId");

    if (!clienteId || !UUID.test(clienteId)) {
      return errorJson("Cliente inválido.", 400);
    }

    // 1. Identificar al usuario autenticado.
    const servidor = await crearClienteServidor();

    const {
      data: { user },
      error: errorAuth,
    } = await servidor.auth.getUser();

    if (errorAuth || !user) {
      return errorJson("Debes iniciar sesión.", 401);
    }

    // 2. Configuración privada del servidor.
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clavePrivada =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !clavePrivada) {
      return errorJson(
        "Configuración del servidor incompleta.",
        503
      );
    }

    const admin = crearClienteAdmin(
      supabaseUrl,
      clavePrivada,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // 3. Verificar que sea entrenador.
    const { data: roles, error: errorRoles } = await admin
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", user.id)
      .eq("rol", "entrenador")
      .limit(1);

    if (errorRoles) {
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

    // 4. Verificar que el cliente esté asignado
    //    al entrenador autenticado.
    const {
      data: relaciones,
      error: errorRelacion,
    } = await admin
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("cliente_id", clienteId)
      .eq("entrenador_id", user.id)
      .eq("activa", true)
      .limit(1);

    if (errorRelacion) {
      return errorJson(
        "No se pudo verificar la asignación.",
        500
      );
    }

    if (!relaciones?.length) {
      return errorJson(
        "Este cliente no está asignado a tu cuenta.",
        403
      );
    }

    // 5. Consultar por separado ambas tablas.
    const [
      consultaOficial,
      consultaPrueba,
    ] = await Promise.all([
      admin
        .from("participantes_estudio")
        .select("cliente_id")
        .eq("cliente_id", clienteId)
        .maybeSingle(),

      admin
        .from("participantes_prueba_funcional")
        .select(
          "cliente_id,grupo_prueba,fecha_inicio_prueba"
        )
        .eq("cliente_id", clienteId)
        .maybeSingle(),
    ]);

    if (
      consultaOficial.error ||
      consultaPrueba.error
    ) {
      return errorJson(
        "No se pudo consultar la inscripción.",
        500
      );
    }

    // 6. Impedir mezclar pruebas con el estudio.
    if (consultaOficial.data) {
      return errorJson(
        "El cliente pertenece al estudio oficial.",
        409
      );
    }

    const prueba = consultaPrueba.data;

    if (!prueba) {
      return errorJson(
        "El cliente no está inscrito en pruebas funcionales.",
        404
      );
    }

    // 7. Confirmar el modo de prueba.
    return NextResponse.json(
      {
        modo: "prueba_funcional",
        clienteId: prueba.cliente_id,
        grupoPrueba: prueba.grupo_prueba,
        fechaInicio: prueba.fecha_inicio_prueba,
        iaHabilitada: false,
        mensaje:
          "Inscripción de prueba verificada. " +
          "La IA todavía no está habilitada.",
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error(
      "Error consultando prueba funcional:",
      error
    );

    return errorJson(
      "No se pudo verificar el modo de prueba.",
      500
    );
  }
}