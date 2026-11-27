import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import {
  CAMPOS_PERFIL_VERIFICABLE,
  clasificacionCompleta,
  clientePrivadoSupabase,
  estadoVerificacionPerfil,
  huellaPerfil,
  type PerfilVerificable,
} from "@/lib/perfil/verificacion";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

// ========================================
// AUTORIZAR AL ENTRENADOR
// ========================================

async function autorizar(clienteId: string) {
  const servidor = await createClient();

  const {
    data: auth,
    error: authError,
  } = await servidor.auth.getUser();

  const entrenadorId = auth.user?.id;

  if (authError || !entrenadorId) {
    return {
      error: json(
        { error: "Inicia sesión." },
        401
      ),
    };
  }

  // Verificar rol y relación con el cliente.

  const [rol, relacion] = await Promise.all([
    servidor
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .maybeSingle(),

    servidor
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", entrenadorId)
      .eq("cliente_id", clienteId)
      .eq("activa", true)
      .maybeSingle(),
  ]);

  if (rol.error || relacion.error) {
    return {
      error: json(
        {
          error:
            "No se pudo verificar la autorización.",
        },
        500
      ),
    };
  }

  if (
    rol.data?.rol !== "entrenador" ||
    !relacion.data
  ) {
    return {
      error: json(
        {
          error:
            "No eres el entrenador asignado a este cliente.",
        },
        403
      ),
    };
  }

  // Consultar el perfil autorizado.

  const {
    data: perfil,
    error: errorPerfil,
  } = await servidor
    .from("perfiles_clientes")
    .select(CAMPOS_PERFIL_VERIFICABLE)
    .eq("usuario_id", clienteId)
    .maybeSingle();

  if (errorPerfil) {
    return {
      error: json(
        {
          error:
            "No se pudo consultar el perfil.",
        },
        500
      ),
    };
  }

  if (!perfil) {
    return {
      error: json(
        {
          error:
            "El cliente todavía no tiene perfil.",
        },
        404
      ),
    };
  }

  return {
    entrenadorId,
    perfil: perfil as PerfilVerificable,
  };
}

// ========================================
// GET: CONSULTAR VERIFICACIÓN
// ========================================

export async function GET(request: Request) {
  const clienteId = new URL(
    request.url
  ).searchParams.get("clienteId");

  if (!clienteId || !UUID.test(clienteId)) {
    return json(
      { error: "Cliente inválido." },
      400
    );
  }

  const acceso = await autorizar(clienteId);

  if (acceso.error) {
    return acceso.error;
  }

  try {
    const verificacion =
      await estadoVerificacionPerfil(
        clienteId,
        acceso.perfil!
      );

    return json({
      ...verificacion,

      perfilCompleto:
        clasificacionCompleta(
          acceso.perfil!
        ),
    });
  } catch {
    return json(
      {
        error:
          "No se pudo consultar la verificación. Revisa la migración SQL.",
      },
      503
    );
  }
}

// ========================================
// POST: REGISTRAR VERIFICACIÓN
// ========================================

export async function POST(request: Request) {
  const cuerpo: unknown = await request
    .json()
    .catch(() => null);

  if (
    !cuerpo ||
    typeof cuerpo !== "object" ||
    Array.isArray(cuerpo)
  ) {
    return json(
      { error: "Solicitud inválida." },
      400
    );
  }

  const {
    clienteId,
    estado,
    observaciones,
  } = cuerpo as Record<string, unknown>;

  if (
    typeof clienteId !== "string" ||
    !UUID.test(clienteId)
  ) {
    return json(
      { error: "Cliente inválido." },
      400
    );
  }

  if (
    estado !== "verificado" &&
    estado !== "requiere_correccion"
  ) {
    return json(
      { error: "Decisión inválida." },
      400
    );
  }

  if (
    typeof observaciones !== "string" ||
    observaciones.trim().length < 10 ||
    observaciones.trim().length > 1000
  ) {
    return json(
      {
        error:
          "Documenta la comprobación (10 a 1000 caracteres).",
      },
      400
    );
  }

  const acceso = await autorizar(clienteId);

  if (acceso.error) {
    return acceso.error;
  }

  if (
    !clasificacionCompleta(
      acceso.perfil!
    )
  ) {
    return json(
      {
        error:
          "El cliente debe completar y clasificar el equipamiento por ubicación.",
      },
      409
    );
  }

  try {
    const admin = clientePrivadoSupabase();

    const { error } = await admin
      .from("verificaciones_perfil_entrenador")
      .upsert(
        {
          cliente_id: clienteId,
          entrenador_id:
            acceso.entrenadorId!,

          huella_perfil: huellaPerfil(
            acceso.perfil!
          ),

          estado,

          observaciones:
            observaciones.trim(),

          revisado_en:
            new Date().toISOString(),
        },
        {
          onConflict: "cliente_id",
        }
      );

    if (error) {
      throw error;
    }

    return json({
      mensaje:
        "Revisión profesional registrada.",
      estado,
    });
  } catch {
    return json(
      {
        error:
          "No se pudo registrar la revisión. Verifica la migración SQL.",
      },
      503
    );
  }
}