import { bloqueoIAEstudio } from "@/lib/investigacion/bloqueo-ia-estudio";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EjercicioMotor = {
  nombre: string;
  nivel: string;
  lugar: string;
  equipamiento: string;
};

type RutinaMotor = {
  id: number;
  nombre: string;
  objetivo: string;
  nivel: string;
  frecuencia_semanal: number;
  duracion_min: number;
  lugar: string;
  estado: string;
  ejercicios: EjercicioMotor[];
};

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    { status: estado }
  );
}

export async function POST(request: Request) {
  try {
    // 1. Recibir y validar el identificador del cliente.
    const body: unknown = await request.json().catch(() => null);

    const clienteId =
      body !== null &&
      typeof body === "object" &&
      "clienteId" in body
        ? body.clienteId
        : null;

    const esUuid =
      typeof clienteId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        clienteId
      );

    if (!esUuid) {
      return respuestaError("Identificador de cliente inválido.", 400);
    }

    const supabase = await createClient();

    // 2. Verificar la sesión autenticada.
    const { data: auth, error: authError } =
      await supabase.auth.getClaims();

    const entrenadorId = auth?.claims?.sub;

    if (authError || !entrenadorId) {
      return respuestaError("Debes iniciar sesión.", 401);
    }

    // 3. Comprobar el rol de entrenador.
    const { data: acceso, error: errorRol } = await supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .single();

    if (errorRol || acceso?.rol !== "entrenador") {
      return respuestaError("No tienes autorización.", 403);
    }

    // 4. Confirmar que el cliente está asignado al entrenador.
    const { data: asignacion, error: errorAsignacion } = await supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("cliente_id", clienteId)
      .eq("entrenador_id", entrenadorId)
      .eq("activa", true)
      .maybeSingle();

    if (errorAsignacion) {
      throw new Error("No se pudo consultar la asignación.");
    }

    if (!asignacion) {
      return respuestaError(
        "El cliente no está asignado a este entrenador.",
        403
      );
    }

    // 5. Obtener el perfil del cliente autorizado.
    const { data: perfil, error: errorPerfil } = await supabase
      .from("perfiles_clientes")
      .select(
        "objetivo,experiencia,frecuencia_semanal,minutos_por_sesion,lugar,equipamiento"
      )
      .eq("usuario_id", clienteId)
      .maybeSingle();

    if (errorPerfil) {
      throw new Error("No se pudo consultar el perfil.");
    }

    if (!perfil) {
      return respuestaError("El cliente todavía no tiene perfil.", 404);
    }

    // 6. Consultar el catálogo de rutinas publicadas.
    const { data: rutinas, error: errorRutinas } = await supabase
      .from("rutinas")
      .select(
        "id,nombre,objetivo,nivel,frecuencia_semanal,duracion_min,lugar,estado"
      )
      .eq("estado", "publicada");

    if (errorRutinas) {
      throw new Error("No se pudieron consultar las rutinas.");
    }

    const idsRutinas = (rutinas ?? []).map((rutina) => rutina.id);

    const resultadoVacio = {
      total_evaluadas: 0,
      total_elegibles: 0,
      metodo: "reglas_deterministas_v1",
      similitud_aplicada: false,
      logica_difusa_aplicada: false,
      resultados: [],
    };

    if (idsRutinas.length === 0) {
      return NextResponse.json(resultadoVacio);
    }

    // 7. Consultar los ejercicios asociados a las rutinas.
    const { data: relaciones, error: errorRelaciones } = await supabase
      .from("rutina_ejercicios")
      .select("rutina_id,ejercicio_id,orden")
      .in("rutina_id", idsRutinas);

    if (errorRelaciones) {
      throw new Error("No se pudieron consultar las relaciones.");
    }

    const idsEjercicios = [
      ...new Set(
        (relaciones ?? []).map((relacion) => relacion.ejercicio_id)
      ),
    ];

    if (idsEjercicios.length === 0) {
      return NextResponse.json({
        ...resultadoVacio,
        advertencia: "Las rutinas no tienen ejercicios asignados.",
      });
    }

    // 8. Consultar la información de cada ejercicio.
    const { data: ejercicios, error: errorEjercicios } = await supabase
      .from("ejercicios")
      .select("id,nombre,nivel,lugar,equipamiento,activo")
      .in("id", idsEjercicios);

    if (errorEjercicios) {
      throw new Error("No se pudieron consultar los ejercicios.");
    }

    const ejerciciosPorId = new Map(
      (ejercicios ?? []).map((ejercicio) => [ejercicio.id, ejercicio])
    );

    // 9. Preparar las rutinas completas para FastAPI.
    const rutinasMotor: RutinaMotor[] = [];
    const rutinasOmitidas: string[] = [];

    for (const rutina of rutinas ?? []) {
      const componentes = (relaciones ?? [])
        .filter((relacion) => relacion.rutina_id === rutina.id)
        .sort((a, b) => a.orden - b.orden);

      let completa = componentes.length > 0;
      const ejerciciosMotor: EjercicioMotor[] = [];

      for (const componente of componentes) {
        const ejercicio = ejerciciosPorId.get(componente.ejercicio_id);

        if (!ejercicio || !ejercicio.activo) {
          completa = false;
          break;
        }

        ejerciciosMotor.push({
          nombre: ejercicio.nombre,
          nivel: ejercicio.nivel,
          lugar: ejercicio.lugar,
          equipamiento: ejercicio.equipamiento,
        });
      }

      if (!completa) {
        rutinasOmitidas.push(rutina.nombre);
        continue;
      }

      rutinasMotor.push({
        id: rutina.id,
        nombre: rutina.nombre,
        objetivo: rutina.objetivo,
        nivel: rutina.nivel,
        frecuencia_semanal: rutina.frecuencia_semanal,
        duracion_min: rutina.duracion_min,
        lugar: rutina.lugar,
        estado: rutina.estado,
        ejercicios: ejerciciosMotor,
      });
    }

    if (rutinasMotor.length === 0) {
      return NextResponse.json({
        ...resultadoVacio,
        rutinas_omitidas: rutinasOmitidas,
      });
    }

    // 10. Verificar la URL privada del servicio de IA.
    // PASO 80.10: bloqueo de IA por estudio
    const bloqueoIA = await bloqueoIAEstudio(String(clienteId));
    if (bloqueoIA) return bloqueoIA;

    const servicio = process.env.IA_SERVICE_URL;

    const claveInternaIA = process.env.IA_INTERNAL_API_KEY;
    if (!claveInternaIA) {
      return NextResponse.json(
        { error: "Servicio de IA no configurado." },
        { status: 503 }
      );
    }


    if (!servicio) {
      return respuestaError("No se configuró IA_SERVICE_URL.", 503);
    }

    // 11. Solicitar reglas, ranking, similitud y lógica difusa.
    // La lógica difusa NO cambia la elegibilidad obligatoria.
    let respuestaIA: Response;

    try {
      respuestaIA = await fetch(new URL("/evaluar", servicio), {
        method: "POST",
        headers: {
"X-IA-Service-Key": claveInternaIA,
                    "Content-Type": "application/json",
        },
        body: JSON.stringify({
          perfil,
          rutinas: rutinasMotor,
          incluir_similitud: true,
          incluir_logica_difusa: true,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      return respuestaError(
        "No se pudo conectar con FastAPI. Comprueba que el servicio esté funcionando.",
        503
      );
    }

    if (!respuestaIA.ok) {
      console.error("FastAPI devolvió:", respuestaIA.status);
      return respuestaError("FastAPI no pudo procesar las rutinas.", 502);
    }

    // 12. Validar la respuesta antes de enviarla al navegador.
    const resultado: unknown = await respuestaIA.json();

    if (
      !resultado ||
      typeof resultado !== "object" ||
      Array.isArray(resultado) ||
      !("resultados" in resultado) ||
      !Array.isArray(resultado.resultados) ||
      !("total_evaluadas" in resultado) ||
      typeof resultado.total_evaluadas !== "number" ||
      !("total_elegibles" in resultado) ||
      typeof resultado.total_elegibles !== "number"
    ) {
      return respuestaError("El motor devolvió una respuesta inválida.", 502);
    }

    // Se conservan los campos devueltos por FastAPI:
    // ajuste_difuso, similitud_semantica, desglose_puntaje, etc.
    return NextResponse.json(
      {
        ...resultado,
        rutinas_omitidas: rutinasOmitidas,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error en la integración con IA:", error);
    return respuestaError("No se pudo completar la evaluación.", 500);
  }
}
