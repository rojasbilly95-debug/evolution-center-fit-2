import { connection, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { createClient as crearServidor } from "@/lib/supabase/server";


type Registro = {
  cliente_id: string;
  grupo_estudio: string;
  pre_asistencia_pct: number | string | null;
  post_asistencia_pct: number | string | null;
  pre_cumplimiento_pct: number | string | null;
  post_cumplimiento_pct: number | string | null;
  pre_continuidad_sem: number | string | null;
  post_continuidad_sem: number | string | null;
};

function errorJson(mensaje: string, status: number) {
  return NextResponse.json(
    { error: mensaje },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}

function numeroCSV(valor: number | string | null): string {
  if (valor === null || valor === undefined) return "";

  const texto = String(valor);

  return /^\d+(\.\d+)?$/.test(texto) ? texto : "";
}

// Diferencia postest - pretest.
// Si falta alguna medición, permanece vacía.

function diferenciaCSV(
  previo: number | string | null,
  posterior: number | string | null
): string {
  const pre = numeroCSV(previo);
  const post = numeroCSV(posterior);

  if (pre === "" || post === "") {
    return "";
  }

  const diferencia =
    Number(post) - Number(pre);

  return Number.isFinite(diferencia)
    ? String(
        Math.round(diferencia * 100) / 100
      )
    : "";
}

function campoCSV(valor: string): string {
  let texto = valor;

  if (
    /^\s*[=+@]/.test(texto) ||
    (
      /^\s*-/.test(texto) &&
      !/^-\d+(?:\.\d+)?$/.test(texto)
    )
  ) {
    texto = "'" + texto;
  }

  return '"' + texto.replace(/"/g, '""') + '"';
}

export async function GET() {
  await connection();

  try {
    // 1. Comprobar que existe una sesión
    const servidor = await crearServidor();

    const { data: autenticacion, error: errorAuth } =
      await servidor.auth.getUser();

    if (errorAuth || !autenticacion.user) {
      return errorJson("Debes iniciar sesión.", 401);
    }

    const entrenadorId = autenticacion.user.id;

    // 2. Conectar con Supabase desde el servidor
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const clave =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clave) {
      return errorJson(
        "Falta la configuración privada de Supabase.",
        503
      );
    }

    const admin = crearAdmin(url, clave, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 3. Verificar que el usuario sea entrenador
    const { data: roles, error: errorRoles } = await admin
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", entrenadorId)
      .eq("rol", "entrenador")
      .limit(1);

    if (errorRoles) {
      return errorJson("No se pudo verificar tu rol.", 500);
    }

    if (!roles?.length) {
      return errorJson(
        "Solo los entrenadores pueden exportar resultados.",
        403
      );
    }

    // 4. Obtener exclusivamente los clientes asignados
    const { data: asignaciones, error: errorAsignaciones } =
      await admin
        .from("asignaciones_entrenadores")
        .select("cliente_id")
        .eq("entrenador_id", entrenadorId)
        .eq("activa", true)
        .range(0, 999);

    if (errorAsignaciones) {
      return errorJson(
        "No se pudieron consultar tus clientes.",
        500
      );
    }

    if ((asignaciones?.length ?? 0) >= 1000) {
      return errorJson(
        "El número de asignaciones supera el límite del reporte.",
        422
      );
    }

    const clientes = [
      ...new Set(
        (asignaciones ?? [])
          .map((registro) => registro.cliente_id)
          .filter((id): id is string => typeof id === "string")
      ),
    ];

    if (clientes.length === 0) {
      return errorJson(
        "No tienes clientes asignados para exportar.",
        404
      );
    }

    // 5. Ejecutar la función creada en el paso 80.12
    const { data: filas, error: errorReporte } = await admin
      .rpc("reporte_investigacion_prepost")
      .in("cliente_id", clientes)
      .order("grupo_estudio", { ascending: true })
      .order("cliente_id", { ascending: true })
      .limit(1000);

    if (errorReporte) {
      console.error("Error del reporte:", errorReporte);
      return errorJson(
        "No se pudieron calcular los resultados de investigación.",
        500
      );
    }

    const resultados = (filas ?? []) as Registro[];

    if (resultados.length === 0) {
      return errorJson(
        "Todavía no hay participantes inscritos entre tus clientes.",
        404
      );
    }

    if (resultados.length >= 1000) {
      return errorJson(
        "El reporte alcanzó su límite de registros.",
        422
      );
    }

    // 6. Columnas compatibles con el análisis de tesis
    const encabezados = [
      "participante_id",
      "grupo_estudio",
      "pre_asistencia_pct",
      "post_asistencia_pct",
      "pre_cumplimiento_pct",
      "post_cumplimiento_pct",
      "pre_continuidad_sem",
      "post_continuidad_sem",
      "delta_asistencia_pp",
      "delta_cumplimiento_pp",
      "delta_continuidad_sem",
    ];

    // 7. Sustituir UUID por identificadores seudónimos
    const registrosCSV = resultados.map((registro) => {
      const codigo = createHmac("sha256", clave)
        .update(registro.cliente_id)
        .digest("hex")
        .slice(0, 12);

      return [
        "P" + codigo,
        registro.grupo_estudio,
        numeroCSV(registro.pre_asistencia_pct),
        numeroCSV(registro.post_asistencia_pct),
        numeroCSV(registro.pre_cumplimiento_pct),
        numeroCSV(registro.post_cumplimiento_pct),
        numeroCSV(registro.pre_continuidad_sem),
        numeroCSV(registro.post_continuidad_sem),

        diferenciaCSV(
          registro.pre_asistencia_pct,
          registro.post_asistencia_pct
        ),

        diferenciaCSV(
          registro.pre_cumplimiento_pct,
          registro.post_cumplimiento_pct
        ),

        diferenciaCSV(
          registro.pre_continuidad_sem,
          registro.post_continuidad_sem
        ),
      ];
    });

    const contenido =
      "\uFEFF" +
      [encabezados, ...registrosCSV]
        .map((fila) => fila.map(campoCSV).join(";"))
        .join("\r\n");

    return new Response(contenido, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="investigacion-pretest-postest.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error exportando investigación:", error);
    return errorJson(
      "Ocurrió un error inesperado al exportar.",
      500
    );
  }
}
