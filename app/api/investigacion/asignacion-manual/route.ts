import { connection, NextResponse } from "next/server";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient as crearServidor } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorJson(mensaje: string, status: number) {
  return NextResponse.json(
    { error: mensaje },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function fechaValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor;
}

function sumarDias(fecha: string, dias: number) {
  return new Date(
    Date.parse(`${fecha}T00:00:00.000Z`) + dias * 86400000
  ).toISOString().slice(0, 10);
}

async function verificarEntrenador() {
  const servidor = await crearServidor();
  const { data, error } = await servidor.auth.getUser();

  if (error || !data.user) {
    return {
      respuesta: errorJson("Debes iniciar sesión.", 401),
      admin: null,
      entrenadorId: null,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    return {
      respuesta: errorJson("Supabase no está configurado.", 503),
      admin: null,
      entrenadorId: null,
    };
  }

  const admin = crearAdmin(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: roles, error: errorRol } = await admin
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", data.user.id)
    .eq("rol", "entrenador")
    .limit(1);

  if (errorRol || !roles?.length) {
    return {
      respuesta: errorJson("Acceso exclusivo para entrenadores.", 403),
      admin: null,
      entrenadorId: null,
    };
  }

  return {
    respuesta: null,
    admin,
    entrenadorId: data.user.id,
  };
}

export async function GET() {
  await connection();

  try {
    const acceso = await verificarEntrenador();

    if (acceso.respuesta) return acceso.respuesta;
    if (!acceso.admin) return errorJson("Acceso inválido.", 403);

    const { data, error } = await acceso.admin
      .from("rutinas")
      .select("id,nombre,objetivo,nivel,duracion_min")
      .eq("estado", "publicada")
      .order("nombre")
      .limit(500);

    if (error) {
      return errorJson("No se pudieron consultar las rutinas.", 500);
    }

    return NextResponse.json(
      { rutinas: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error consultando rutinas:", error);
    return errorJson("Error inesperado.", 500);
  }
}

export async function POST(request: Request) {
  await connection();

  try {
    const acceso = await verificarEntrenador();

    if (acceso.respuesta) return acceso.respuesta;
    if (!acceso.admin || !acceso.entrenadorId) {
      return errorJson("Acceso inválido.", 403);
    }

    const admin = acceso.admin;
    const entrenadorId = acceso.entrenadorId;

    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorJson("Solicitud inválida.", 400);
    }

    const datos = body as Record<string, unknown>;
    const { clienteId, rutinaId, fechaInicio, fechaFin, notas } = datos;

    if (typeof clienteId !== "string" || !UUID.test(clienteId)) {
      return errorJson("Cliente inválido.", 400);
    }

    if (
      typeof rutinaId !== "number" ||
      !Number.isSafeInteger(rutinaId) ||
      rutinaId <= 0
    ) {
      return errorJson("Rutina inválida.", 400);
    }

    if (!fechaValida(fechaInicio)) {
      return errorJson("Fecha de inicio inválida.", 400);
    }

    if (fechaFin != null && !fechaValida(fechaFin)) {
      return errorJson("Fecha de fin inválida.", 400);
    }

    if (
      notas != null &&
      (typeof notas !== "string" || notas.length > 1000)
    ) {
      return errorJson("Observaciones inválidas.", 400);
    }

    const { data: vinculos, error: errorVinculo } = await admin
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", entrenadorId)
      .eq("cliente_id", clienteId)
      .eq("activa", true)
      .limit(1);

    if (errorVinculo || !vinculos?.length) {
      return errorJson("Cliente no asignado al entrenador.", 403);
    }

    const { data: participante, error: errorParticipante } =
      await admin
        .from("participantes_estudio")
        .select("grupo_estudio,fecha_inicio_estudio,fecha_fin_estudio")
        .eq("cliente_id", clienteId)
        .maybeSingle();

    if (errorParticipante) {
      return errorJson("No se pudo consultar el estudio.", 500);
    }

    if (!participante) {
      return errorJson("Cliente no inscrito en el estudio.", 409);
    }

    const limite =
      participante.grupo_estudio === "GC"
        ? participante.fecha_fin_estudio
        : participante.grupo_estudio === "GE"
          ? sumarDias(participante.fecha_inicio_estudio, 27)
          : null;

    if (!limite) {
      return errorJson("Grupo de estudio inválido.", 409);
    }

    const finReal =
      typeof fechaFin === "string" ? fechaFin : limite;

    if (
      fechaInicio < participante.fecha_inicio_estudio ||
      fechaInicio > limite ||
      finReal < fechaInicio ||
      finReal > limite
    ) {
      return errorJson(
        "Las fechas están fuera del período de entrenamiento habitual.",
        409
      );
    }

    const { data: asignacion, error: errorRpc } = await admin.rpc(
      "asignar_rutina_manual_estudio",
      {
        p_entrenador_id: entrenadorId,
        p_cliente_id: clienteId,
        p_rutina_id: rutinaId,
        p_fecha_inicio: fechaInicio,
        p_fecha_fin: finReal,
        p_notas: typeof notas === "string" ? notas.trim() : null,
      }
    );

    if (errorRpc) {
      console.error("Error de asignación manual:", errorRpc);

      return errorJson(
        "No se pudo asignar la rutina. Verifica que no exista un plan vigente y que la rutina cumpla los requisitos.",
        409
      );
    }

    return NextResponse.json(
      {
        mensaje: "Rutina asignada manualmente.",
        asignacion,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Error inesperado de asignación:", error);
    return errorJson("Error inesperado.", 500);
  }
}
