
import { NextResponse, connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ====================================================
// EVOLUTION CENTER FIT 2.0
// FASE 113.3.4
// API DEL CALENDARIO REAL DEL ENTRENADOR
//
// - Sesiones reales de Supabase
// - Autenticación obligatoria
// - Verificación de rol entrenador
// - Clientes con asignación activa
// - Filtros por fecha
// - Paginación
// - Sin datos de demostración
// - Sin modificaciones a la base de datos
// ====================================================

const cabeceras = {
  "Cache-Control": "private, no-store, max-age=0",
};

function responder(
  datos: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(datos, {
    status,
    headers: cabeceras,
  });
}

// Validar fechas YYYY-MM-DD.
function fechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

export async function GET(request: Request) {
  // Next.js 16: ejecutar durante una solicitud real.
  await connection();

  try {
    // ================================================
    // 1. CLIENTE SUPABASE Y AUTENTICACIÓN
    // ================================================

    const supabase = await createClient();

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getClaims();

    const entrenadorId = authData?.claims?.sub;

    if (authError || !entrenadorId) {
      return responder(
        { error: "Debes iniciar sesión." },
        401
      );
    }

    // ================================================
    // 2. VERIFICAR ROL DEL ENTRENADOR
    // ================================================

    const {
      data: rol,
      error: rolError,
    } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .eq("rol", "entrenador")
      .maybeSingle();

    if (rolError) {
      console.error(
        "Error verificando rol:",
        rolError
      );

      return responder(
        {
          error: "No se pudo verificar el acceso.",
        },
        500
      );
    }

    if (!rol) {
      return responder(
        {
          error: "Acceso reservado a entrenadores.",
        },
        403
      );
    }

    // ================================================
    // 3. LEER Y VALIDAR FILTROS
    // ================================================

    const parametros = new URL(
      request.url
    ).searchParams;

    const desde = parametros.get("desde");
    const hasta = parametros.get("hasta");

    const paginaTexto =
      parametros.get("pagina") ?? "1";

    if (
      (desde === null) !== (hasta === null) ||
      (desde !== null && !fechaValida(desde)) ||
      (hasta !== null && !fechaValida(hasta)) ||
      (desde !== null &&
        hasta !== null &&
        desde > hasta)
    ) {
      return responder(
        {
          error: "Rango de fechas inválido.",
        },
        400
      );
    }

    if (!/^[1-9]\d*$/.test(paginaTexto)) {
      return responder(
        {
          error: "Número de página inválido.",
        },
        400
      );
    }

    const pagina = Number(paginaTexto);
    const limite = 100;

    if (
      !Number.isSafeInteger(pagina) ||
      pagina > 10000
    ) {
      return responder(
        {
          error: "Número de página fuera de rango.",
        },
        400
      );
    }

    // ================================================
    // 4. CONSULTAR CLIENTES ASIGNADOS
    // ================================================

    const {
      data: asignaciones,
      error: asignacionesError,
    } = await supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", entrenadorId)
      .eq("activa", true);

    if (asignacionesError) {
      console.error(
        "Error consultando asignaciones:",
        asignacionesError
      );

      return responder(
        {
          error:
            "No se pudieron consultar los clientes.",
        },
        500
      );
    }

    const clientesIds = [
      ...new Set(
        (asignaciones ?? []).map(
          (asignacion) => asignacion.cliente_id
        )
      ),
    ];

    // Respuesta cuando no existen clientes activos.
    if (clientesIds.length === 0) {
      return responder({
        modo: "real",
        total_clientes: 0,
        total_planes: 0,
        total_sesiones: 0,
        sesiones: [],
        paginacion: {
          pagina,
          limite,
          total_paginas: 0,
        },
      });
    }

    // ================================================
    // 5. CONSULTAR PLANES DEL ENTRENADOR
    // ================================================

    const {
      data: planes,
      error: planesError,
    } = await supabase
      .from("asignaciones_rutinas")
      .select(
        "id,cliente_id,entrenador_id,rutina_id,estado,fecha_inicio,fecha_fin"
      )
      .eq("entrenador_id", entrenadorId)
      .in("cliente_id", clientesIds);

    if (planesError) {
      console.error(
        "Error consultando planes:",
        planesError
      );

      return responder(
        {
          error:
            "No se pudieron consultar los planes.",
        },
        500
      );
    }

    const planesIds = (planes ?? []).map(
      (plan) => plan.id
    );

    if (planesIds.length === 0) {
      return responder({
        modo: "real",
        total_clientes: clientesIds.length,
        total_planes: 0,
        total_sesiones: 0,
        sesiones: [],
        paginacion: {
          pagina,
          limite,
          total_paginas: 0,
        },
      });
    }

    // ================================================
    // 6. CONSULTAR SESIONES REALES
    // ================================================

    let consulta = supabase
      .from("sesiones_entrenamiento")
      .select(
        "id,asignacion_id,numero_sesion,fecha_programada,hora_programada,estado,inicio_real,fin_real,duracion_real_min,observaciones",
        {
          count: "exact",
        }
      )
      .in("asignacion_id", planesIds);

    // Aplicar filtros de fechas si se proporcionan.
    if (desde !== null && hasta !== null) {
      consulta = consulta
        .gte("fecha_programada", desde)
        .lte("fecha_programada", hasta);
    }

    const {
      data: sesiones,
      error: sesionesError,
      count,
    } = await consulta
      .order("fecha_programada", {
        ascending: true,
      })
      .order("id", {
        ascending: true,
      })
      .range(
        (pagina - 1) * limite,
        pagina * limite - 1
      );

    if (sesionesError) {
      console.error(
        "Error consultando sesiones:",
        sesionesError
      );

      return responder(
        {
          error:
            "No se pudo cargar el calendario.",
        },
        500
      );
    }

    // ================================================
    // 7. CONSULTAR CLIENTES Y RUTINAS
    // ================================================

    const rutinasIds = [
      ...new Set(
        (planes ?? []).map(
          (plan) => plan.rutina_id
        )
      ),
    ];

    const [
      resultadoClientes,
      resultadoRutinas,
    ] = await Promise.all([
      supabase
        .from("usuarios")
        .select("id,nombre_completo")
        .in("id", clientesIds),

      supabase
        .from("rutinas")
        .select(
          "id,nombre,duracion_min,frecuencia_semanal"
        )
        .in("id", rutinasIds),
    ]);

    if (
      resultadoClientes.error ||
      resultadoRutinas.error
    ) {
      console.error(
        "Error obteniendo detalles:",
        resultadoClientes.error,
        resultadoRutinas.error
      );

      return responder(
        {
          error:
            "No se pudieron cargar los detalles.",
        },
        500
      );
    }

    // ================================================
    // 8. RELACIONAR SESIONES, PLANES Y CLIENTES
    // ================================================

    const mapaPlanes = new Map(
      (planes ?? []).map((plan) => [
        plan.id,
        plan,
      ])
    );

    const mapaClientes = new Map(
      (resultadoClientes.data ?? []).map(
        (cliente) => [
          cliente.id,
          cliente.nombre_completo,
        ]
      )
    );

    const mapaRutinas = new Map(
      (resultadoRutinas.data ?? []).map(
        (rutina) => [
          rutina.id,
          rutina,
        ]
      )
    );

    const registros = (sesiones ?? []).map(
      (sesion) => {
        const plan = mapaPlanes.get(
          sesion.asignacion_id
        );

        const rutina = plan
          ? mapaRutinas.get(plan.rutina_id)
          : undefined;

        return {
          id: sesion.id,
          asignacion_id: sesion.asignacion_id,
          numero_sesion: sesion.numero_sesion,

          fecha_programada:
            sesion.fecha_programada,

          hora_programada:
            sesion.hora_programada,

          estado: sesion.estado,

          inicio_real: sesion.inicio_real,
          fin_real: sesion.fin_real,
          duracion_real_min:
            sesion.duracion_real_min,

          observaciones:
            sesion.observaciones,

          cliente_id:
            plan?.cliente_id ?? null,

          cliente_nombre: plan
            ? mapaClientes.get(
              plan.cliente_id
            ) ?? null
            : null,

          rutina_id:
            plan?.rutina_id ?? null,

          rutina_nombre:
            rutina?.nombre ?? null,

          duracion_programada_min:
            rutina?.duracion_min ?? null,

          frecuencia_semanal:
            rutina?.frecuencia_semanal ?? null,

          plan_estado:
            plan?.estado ?? null,

          plan_fecha_inicio:
            plan?.fecha_inicio ?? null,

          plan_fecha_fin:
            plan?.fecha_fin ?? null,
        };
      }
    );

    // ================================================
    // 9. RESPUESTA DEL CALENDARIO REAL
    // ================================================

    return responder({
      modo: "real",

      entrenador_id: entrenadorId,

      total_clientes: clientesIds.length,

      total_planes: planesIds.length,

      total_sesiones: count ?? 0,

      sesiones: registros,

      paginacion: {
        pagina,
        limite,
        total_paginas: Math.ceil(
          (count ?? 0) / limite
        ),
      },
    });

  } catch (error) {
    console.error(
      "Error interno de calendario real:",
      error
    );

    return responder(
      {
        error:
          "Error interno del calendario.",
      },
      500
    );
  }
}
