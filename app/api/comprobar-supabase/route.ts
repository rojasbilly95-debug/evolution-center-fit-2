
import { NextResponse } from "next/server";

export async function GET() {
  // Esta comprobación solo funciona en desarrollo.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Ruta no disponible" },
      { status: 404 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        conexion: "fallida",
        motivo: "Faltan variables de entorno",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      new URL("/auth/v1/settings", url),
      {
        headers: {
          apikey: key,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          conexion: "fallida",
          servicio: "Supabase Auth",
          codigoHTTP: response.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      conexion: "correcta",
      servicio: "Supabase Auth",
      mensaje: "Next.js pudo contactar con Supabase",
    });
  } catch {
    return NextResponse.json(
      {
        conexion: "fallida",
        motivo: "No se pudo contactar con Supabase",
      },
      { status: 502 }
    );
  }
}
