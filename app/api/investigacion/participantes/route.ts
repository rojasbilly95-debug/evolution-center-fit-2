
import { NextResponse, connection } from "next/server";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { ESTUDIO } from "@/lib/investigacion/calendario-estudio";

function errorJson(mensaje: string, status: number) {
  return NextResponse.json(
    { error: mensaje },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

async function verificarEntrenador() {
  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.getUser();
  const usuario = data?.user;

  if (error || !usuario) {
    return { respuesta: errorJson("Inicia sesión.", 401) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    return {
      respuesta: errorJson("Supabase no está configurado.", 503),
    };
  }

  const admin = createAdminClient(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: roles, error: errorRol } = await admin
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", usuario.id)
    .eq("rol", "entrenador")
    .limit(1);

  if (errorRol || !roles?.length) {
    return {
      respuesta: errorJson("Acceso exclusivo para entrenadores.", 403),
    };
  }

  return { admin, usuarioId: usuario.id };
}

// Consultar participantes del entrenador
export async function GET() {
  await connection();

  try {
    const acceso = await verificarEntrenador();

    if (acceso.respuesta) return acceso.respuesta;

    const admin = acceso.admin!;
    const usuarioId = acceso.usuarioId!;

    const { data: vinculos, error } = await admin
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", usuarioId)
      .eq("activa", true)
      .limit(500);

    if (error) {
      return errorJson("No se pudieron consultar los clientes.", 500);
    }

    const ids = [
      ...new Set((vinculos ?? []).map((v) => v.cliente_id)),
    ];

    if (ids.length === 0) {
      return NextResponse.json({ clientes: [] });
    }

    const { data: participantes, error: errorEstudio } =
      await admin
        .from("participantes_estudio")
        .select(
          "cliente_id,grupo_estudio,fecha_inicio_estudio,fecha_fin_estudio"
        )
        .in("cliente_id", ids);

    if (errorEstudio) {
      return errorJson("No se pudo consultar el estudio.", 500);
    }

    // Los nombres son opcionales; si no están disponibles,
    // se muestra el identificador del cliente.
    const { data: usuarios } = await admin
      .from("usuarios")
      .select("id,nombre_completo")
      .in("id", ids);

    const nombres = new Map(
      (usuarios ?? []).map((u) => [u.id, u.nombre_completo])
    );

    const registros = new Map(
      (participantes ?? []).map((p) => [p.cliente_id, p])
    );

    const clientes = ids.map((id) => {
      const registro = registros.get(id);

      return {
        clienteId: id,
        nombre: nombres.get(id) ?? `Cliente ${id.slice(0, 8)}`,
        grupoEstudio: registro?.grupo_estudio ?? null,
        fechaInicio: registro?.fecha_inicio_estudio ?? null,
        fechaFin: registro?.fecha_fin_estudio ?? null,
      };
    });

    return NextResponse.json(
      { clientes },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error consultando participantes:", error);
    return errorJson("Error inesperado.", 500);
  }
}

// Registrar un participante
export async function POST(request: Request) {
  await connection();

  try {
    const acceso = await verificarEntrenador();

    if (acceso.respuesta) return acceso.respuesta;

    const admin = acceso.admin!;
    const usuarioId = acceso.usuarioId!;

    const cuerpo = await request.json().catch(() => null);

    const clienteId = cuerpo?.clienteId;
    const grupoEstudio = cuerpo?.grupoEstudio;
    const fechaInicio = cuerpo?.fechaInicio;

    const uuidValido =
      typeof clienteId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        clienteId
      );

    if (!uuidValido) {
      return errorJson("Cliente inválido.", 400);
    }

    if (grupoEstudio !== "GE" && grupoEstudio !== "GC") {
      return errorJson("El grupo debe ser GE o GC.", 400);
    }

    const fecha =
      typeof fechaInicio === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)
        ? new Date(`${fechaInicio}T00:00:00.000Z`)
        : null;

    if (
      !fecha ||
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== fechaInicio
    ) {
      return errorJson("Fecha de inicio inválida.", 400);
    }

    if (fechaInicio !== ESTUDIO.inicio) {
      return errorJson(
        "Todos los participantes deben iniciar el estudio el 09/11/2026.",
        409
      );
    }

    // Solo se permite registrar clientes asignados
    // al entrenador autenticado.
    const { data: vinculos, error: errorVinculo } =
      await admin
        .from("asignaciones_entrenadores")
        .select("cliente_id")
        .eq("entrenador_id", usuarioId)
        .eq("cliente_id", clienteId)
        .eq("activa", true)
        .limit(1);

    if (errorVinculo || !vinculos?.length) {
      return errorJson("Cliente no autorizado.", 403);
    }

    // INSERT, no UPSERT: evita cambiar accidentalmente
    // el grupo de un participante ya registrado.
    const { error: errorRegistro } = await admin
      .from("participantes_estudio")
      .insert({
        cliente_id: clienteId,
        grupo_estudio: grupoEstudio,
        fecha_inicio_estudio: fechaInicio,
      });

    if (errorRegistro) {
      if (errorRegistro.code === "23505") {
        return errorJson(
          "Este cliente ya está registrado en el estudio.",
          409
        );
      }

      console.error("Error registrando participante:", errorRegistro);
      return errorJson("No se pudo registrar al participante.", 500);
    }

    return NextResponse.json(
      { mensaje: "Participante registrado correctamente." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro de investigación:", error);
    return errorJson("Error inesperado.", 500);
  }
}
