
import "server-only";

import {
  accesoAdministrador,
  asistenciaConfirmada,
  obtenerMetricas,
} from "@/lib/admin/reportes";

// ============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.18 - EXPORTACION CSV
// ============================================

export async function GET() {
  const acceso = await accesoAdministrador();

  if (acceso.estado === "sin_sesion") {
    return new Response(
      "Debes iniciar sesión.",
      { status: 401 }
    );
  }

  if (acceso.estado === "sin_permiso") {
    return new Response(
      "Acceso restringido.",
      { status: 403 }
    );
  }

  if (acceso.estado === "sin_configuracion") {
    return new Response(
      "Servicio no configurado.",
      { status: 503 }
    );
  }

  const datos = await obtenerMetricas(
    acceso.db
  );

  const generado = new Date();

  const fecha = generado
    .toISOString()
    .slice(0, 10);

  // Escapar correctamente los valores CSV.
  function celda(valor: string | number) {
    const texto = String(valor).replaceAll(
      '"',
      '""'
    );

    return `"${texto}"`;
  }

  const filas: (string | number)[][] = [
    [
      "seccion",
      "indicador",
      "valor",
      "estado",
      "fecha_generacion_utc",
    ],

    ...datos.map((item) => [
      item.seccion,
      item.titulo,

      item.valor === null
        ? ""
        : item.valor,

      item.valor === null
        ? "no_disponible"
        : "verificado",

      generado.toISOString(),
    ]),

    [
      "sesiones",
      "Asistencia confirmada",
      asistenciaConfirmada(datos),
      "calculada",
      generado.toISOString(),
    ],
  ];

  const csv =
    "\uFEFF" +
    filas
      .map((fila) =>
        fila.map(celda).join(",")
      )
      .join("\r\n");

  return new Response(csv, {
    status: 200,

    headers: {
      "Content-Type":
        "text/csv; charset=utf-8",

      "Content-Disposition":
        `attachment; filename="reporte-administrativo-${fecha}.csv"`,

      "Cache-Control":
        "private, no-store, max-age=0",

      "X-Content-Type-Options":
        "nosniff",
    },
  });
}
