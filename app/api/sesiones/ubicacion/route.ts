import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientePrivadoSupabase } from "@/lib/perfil/verificacion";

const FUENTES = [
  "presencial",
  "videollamada_consentida",
  "entrevista",
  "registro_cliente",
] as const;

type Lugar = "casa" | "gimnasio";

function json(
  datos: object,
  status = 200
) {
  return NextResponse.json(datos, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function enteroPositivo(
  valor: unknown
): valor is number {
  return (
    typeof valor === "number" &&
    Number.isSafeInteger(valor) &&
    valor > 0
  );
}

// ========================================
// AUTORIZAR ACCESO A LA SESIÓN
// ========================================

async function contextoSesion(
  sesionId: number
) {
  const supabase =
    await createClient();

  const {
    data: auth,
    error: authError,
  } = await supabase.auth.getUser();

  const entrenadorId =
    auth.user?.id;

  if (authError || !entrenadorId) {
    return {
      error: json(
        { error: "Debes iniciar sesión." },
        401
      ),
    };
  }

  const {
    data: rol,
    error: errorRol,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", entrenadorId)
    .maybeSingle();

  if (
    errorRol ||
    rol?.rol !== "entrenador"
  ) {
    return {
      error: json(
        {
          error:
            "Solo el entrenador puede registrar evidencia.",
        },
        403
      ),
    };
  }

  const {
    data: sesion,
    error: errorSesion,
  } = await supabase
    .from("sesiones_entrenamiento")
    .select("id,asignacion_id,estado")
    .eq("id", sesionId)
    .maybeSingle();

  if (errorSesion || !sesion) {
    return {
      error: json(
        { error: "Sesión no encontrada." },
        404
      ),
    };
  }

  const {
    data: plan,
    error: errorPlan,
  } = await supabase
    .from("asignaciones_rutinas")
    .select(
      "cliente_id,entrenador_id,rutina_id"
    )
    .eq("id", sesion.asignacion_id)
    .eq("entrenador_id", entrenadorId)
    .maybeSingle();

  if (errorPlan || !plan) {
    return {
      error: json(
        { error: "Plan no autorizado." },
        403
      ),
    };
  }

  const {
    data: relacion,
    error: errorRelacion,
  } = await supabase
    .from("asignaciones_entrenadores")
    .select("cliente_id")
    .eq("cliente_id", plan.cliente_id)
    .eq("entrenador_id", entrenadorId)
    .eq("activa", true)
    .maybeSingle();

  if (errorRelacion || !relacion) {
    return {
      error: json(
        {
          error:
            "El cliente ya no está asignado a este entrenador.",
        },
        403
      ),
    };
  }

  return {
    supabase,
    entrenadorId,
    sesion,
    plan,
  };
}

// ========================================
// COMPROBAR COMPATIBILIDAD DEL LUGAR
// ========================================

async function rutinaCompatibleConLugar(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  clienteId: string,
  rutinaId: number,
  lugar: Lugar
) {
  const [
    consultaPerfil,
    consultaRutina,
    consultaRelaciones,
  ] = await Promise.all([
    supabase
      .from("perfiles_clientes")
      .select(
        "lugar,equipamiento_casa,equipamiento_gimnasio"
      )
      .eq("usuario_id", clienteId)
      .maybeSingle(),

    supabase
      .from("rutinas")
      .select("lugar")
      .eq("id", rutinaId)
      .maybeSingle(),

    supabase
      .from("rutina_ejercicios")
      .select("ejercicio_id")
      .eq("rutina_id", rutinaId),
  ]);

  if (
    consultaPerfil.error ||
    consultaRutina.error ||
    consultaRelaciones.error ||
    !consultaPerfil.data ||
    !consultaRutina.data
  ) {
    return {
      valido: false,
      motivo:
        "No se pudo comprobar la compatibilidad del plan.",
    };
  }

  const perfil =
    consultaPerfil.data;

  if (
    perfil.lugar !== "mixto" &&
    perfil.lugar !== lugar
  ) {
    return {
      valido: false,
      motivo:
        "El cliente no declaró esta ubicación como disponible.",
    };
  }

  const equiposDeclarados =
    lugar === "casa"
      ? perfil.equipamiento_casa
      : perfil.equipamiento_gimnasio;

  if (!Array.isArray(equiposDeclarados)) {
    return {
      valido: false,
      motivo:
        "El cliente debe clasificar sus equipos para esta ubicación.",
    };
  }

  if (
    consultaRutina.data.lugar !== "mixto" &&
    consultaRutina.data.lugar !== lugar
  ) {
    return {
      valido: false,
      motivo:
        "La rutina fue diseñada para otra ubicación.",
    };
  }

  const relaciones =
    consultaRelaciones.data ?? [];

  if (!relaciones.length) {
    return {
      valido: false,
      motivo:
        "Esta rutina no tiene ejercicios.",
    };
  }

  const {
    data: ejercicios,
    error,
  } = await supabase
    .from("ejercicios")
    .select(
      "id,lugar,equipamiento,activo"
    )
    .in(
      "id",
      [
        ...new Set(
          relaciones.map(
            (r) => r.ejercicio_id
          )
        ),
      ]
    );

  if (error || !ejercicios) {
    return {
      valido: false,
      motivo:
        "No se pudieron consultar los ejercicios.",
    };
  }

  const porId = new Map(
    ejercicios.map(
      (ejercicio) => [
        ejercicio.id,
        ejercicio,
      ]
    )
  );

  const equipos = new Set<string>([
    ...equiposDeclarados,
    "peso_corporal",
  ]);

  for (const relacion of relaciones) {
    const ejercicio = porId.get(
      relacion.ejercicio_id
    );

    if (
      !ejercicio ||
      !ejercicio.activo ||
      (
        ejercicio.lugar !== "mixto" &&
        ejercicio.lugar !== lugar
      ) ||
      !equipos.has(
        ejercicio.equipamiento
      )
    ) {
      return {
        valido: false,
        motivo:
          "La rutina completa no es realizable con el equipo declarado en esta ubicación.",
      };
    }
  }

  return {
    valido: true,
  };
}

// ========================================
// GET: CONSULTAR EVIDENCIA
// ========================================

export async function GET(
  request: Request
) {
  const parametro = new URL(
    request.url
  ).searchParams.get("sesionId");

  const sesionId =
    Number(parametro);

  if (
    !parametro ||
    !enteroPositivo(sesionId)
  ) {
    return json(
      { error: "Sesión inválida." },
      400
    );
  }

  const acceso =
    await contextoSesion(sesionId);

  if (acceso.error) {
    return acceso.error;
  }

  try {
    const admin =
      clientePrivadoSupabase();

    const {
      data,
      error,
    } = await admin
      .from(
        "sesiones_ubicaciones_evidencias"
      )
      .select(
        "lugar,estado_verificacion,fuente_verificacion,observaciones,actualizado_en"
      )
      .eq("sesion_id", sesionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return json({
      evidencia: data ?? null,
    });
  } catch {
    return json(
      {
        error:
          "No se pudo consultar el registro de ubicación. Revisa la migración SQL.",
      },
      503
    );
  }
}

// ========================================
// POST: REGISTRAR EVIDENCIA
// ========================================

export async function POST(
  request: Request
) {
  const body: unknown =
    await request
      .json()
      .catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return json(
      { error: "Solicitud inválida." },
      400
    );
  }

  const {
    sesionId,
    lugar,
    estado_verificacion,
    fuente_verificacion,
    observaciones,
  } = body as Record<
    string,
    unknown
  >;

  if (
    !enteroPositivo(sesionId) ||
    (
      lugar !== "casa" &&
      lugar !== "gimnasio"
    )
  ) {
    return json(
      {
        error:
          "Sesión o ubicación inválida.",
      },
      400
    );
  }

  if (
    !(
      [
        "pendiente",
        "declarada",
        "verificada",
      ] as unknown[]
    ).includes(
      estado_verificacion
    )
  ) {
    return json(
      {
        error:
          "Estado de evidencia inválido.",
      },
      400
    );
  }

  if (
    typeof observaciones !== "string" ||
    observaciones.length > 1000
  ) {
    return json(
      {
        error:
          "Observaciones inválidas.",
      },
      400
    );
  }

  const fuente =
    typeof fuente_verificacion === "string"
      ? fuente_verificacion
      : null;

  if (
    fuente !== null &&
    !FUENTES.includes(
      fuente as typeof FUENTES[number]
    )
  ) {
    return json(
      {
        error:
          "Fuente de evidencia inválida.",
      },
      400
    );
  }

  if (
    estado_verificacion === "pendiente" &&
    fuente !== null
  ) {
    return json(
      {
        error:
          "Una sesión pendiente no puede tener una fuente de verificación.",
      },
      400
    );
  }

  if (
    estado_verificacion !== "pendiente" &&
    (
      !fuente ||
      observaciones.trim().length < 10
    )
  ) {
    return json(
      {
        error:
          "Especifica la fuente y describe la evidencia (mínimo 10 caracteres).",
      },
      400
    );
  }

  if (
    estado_verificacion === "verificada" &&
    fuente !== "presencial" &&
    fuente !== "videollamada_consentida"
  ) {
    return json(
      {
        error:
          "Una entrevista o declaración no comprueba por sí sola la sesión.",
      },
      400
    );
  }

  // ========================================
  // AUTORIZACIÓN Y ESTADO DE LA SESIÓN
  // ========================================

  const acceso =
    await contextoSesion(sesionId);

  if (acceso.error) {
    return acceso.error;
  }

  if (
    estado_verificacion === "verificada" &&
    acceso.sesion!.estado !== "realizada"
  ) {
    return json(
      {
        error:
          "Solo una sesión finalizada como realizada puede verificarse.",
      },
      409
    );
  }

  if (
    estado_verificacion !== "verificada" &&
    ![
      "programada",
      "en_curso",
      "realizada",
    ].includes(
      acceso.sesion!.estado
    )
  ) {
    return json(
      {
        error:
          "No se registra ubicación en sesiones ausentes o canceladas.",
      },
      409
    );
  }

  // ========================================
  // COMPROBAR LUGAR Y EQUIPAMIENTO
  // ========================================

  const compatibilidad =
    await rutinaCompatibleConLugar(
      acceso.supabase!,
      acceso.plan!.cliente_id,
      acceso.plan!.rutina_id,
      lugar
    );

  if (!compatibilidad.valido) {
    return json(
      {
        error:
          compatibilidad.motivo,
      },
      409
    );
  }

  // ========================================
  // GUARDAR EVIDENCIA
  // ========================================

  try {
    const admin =
      clientePrivadoSupabase();

    const existente = await admin
      .from(
        "sesiones_ubicaciones_evidencias"
      )
      .select(
        "lugar,estado_verificacion"
      )
      .eq("sesion_id", sesionId)
      .maybeSingle();

    if (existente.error) {
      throw existente.error;
    }

    // Una evidencia ya verificada no
    // puede sobrescribirse desde esta ruta.

    if (
      existente.data?.estado_verificacion ===
      "verificada"
    ) {
      return json(
        {
          error:
            "La evidencia verificada es inmutable; solicita una rectificación auditada.",
        },
        409
      );
    }

    // No permitir cambiar silenciosamente
    // la ubicación tras iniciar la sesión.

    if (
      existente.data &&
      existente.data.lugar !== lugar &&
      acceso.sesion!.estado !== "programada"
    ) {
      return json(
        {
          error:
            "No se puede cambiar silenciosamente el lugar de una sesión iniciada.",
        },
        409
      );
    }

    const {
      error,
    } = await admin
      .from(
        "sesiones_ubicaciones_evidencias"
      )
      .upsert(
        {
          sesion_id: sesionId,
          lugar,
          estado_verificacion,
          fuente_verificacion: fuente,
          observaciones:
            observaciones.trim() || null,
          registrado_por:
            acceso.entrenadorId!,
          verificado_por:
            estado_verificacion === "verificada"
              ? acceso.entrenadorId!
              : null,
          verificado_en:
            estado_verificacion === "verificada"
              ? new Date().toISOString()
              : null,
          actualizado_en:
            new Date().toISOString(),
        },
        {
          onConflict: "sesion_id",
        }
      );

    if (error) {
      throw error;
    }

    return json({
      mensaje:
        "Ubicación y estado de evidencia registrados sin modificar la asistencia.",
    });
  } catch {
    return json(
      {
        error:
          "No se pudo registrar la evidencia. Verifica la migración SQL.",
      },
      503
    );
  }
}