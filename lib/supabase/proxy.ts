import { createServerClient } from "@supabase/ssr";
import { createClient as crearAdmin } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// ================================================
// EVOLUTION CENTER FIT 2.0
// PROTECCION DE SESIONES Y CUENTAS SUSPENDIDAS
// ================================================

function conservarCookies(
  original: NextResponse,
  destino: NextResponse
) {
original.cookies.getAll().forEach((cookie) => {
  destino.cookies.set(cookie);
});

  for (const nombre of [
    "cache-control",
    "expires",
    "pragma",
  ]) {
    const valor = original.headers.get(nombre);

    if (valor) {
      destino.headers.set(nombre, valor);
    }
  }

  destino.headers.set(
    "Cache-Control",
    "private, no-store"
  );

  return destino;
}

function accesoDenegado(
  request: NextRequest,
  original: NextResponse
) {
  const esApi =
    request.nextUrl.pathname.startsWith("/api/");

  if (esApi) {
    return conservarCookies(
      original,
      NextResponse.json(
        {
          error: "CUENTA_SUSPENDIDA",
          mensaje:
            "Tu cuenta está suspendida. Contacta al administrador.",
        },
        {
          status: 403,
        }
      )
    );
  }

  const destino = request.nextUrl.clone();

  destino.pathname = "/cuenta-suspendida";
  destino.search = "";

  return conservarCookies(
    original,
    NextResponse.redirect(destino)
  );
}

function verificacionNoDisponible(
  request: NextRequest,
  original: NextResponse
) {
  const mensaje =
    "No se pudo verificar el estado de la cuenta. Inténtalo nuevamente.";

  const respuesta =
    request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json(
          {
            error: "VERIFICACION_NO_DISPONIBLE",
            mensaje,
          },
          {
            status: 503,
          }
        )
      : new NextResponse(mensaje, {
          status: 503,
          headers: {
            "content-type":
              "text/plain; charset=utf-8",
          },
        });

  return conservarCookies(original, respuesta);
}

export async function updateSession(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );

          Object.entries(headers ?? {}).forEach(
            ([key, value]) => {
              response.headers.set(key, value);
            }
          );
        },
      },
    }
  );

  // ============================================
  // 1. VERIFICAR SESION
  // ============================================

  const { data, error } =
    await supabase.auth.getClaims();

  const usuarioId = data?.claims?.sub;

  // Mantener las validaciones existentes para
  // visitantes que todavía no tienen sesión.
  if (error || !usuarioId) {
    return response;
  }

  // ============================================
  // 2. VERIFICAR CONFIGURACION PRIVADA
  // ============================================

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    console.error(
      "No está configurada la verificación privada de cuentas."
    );

    return verificacionNoDisponible(
      request,
      response
    );
  }

  const admin = crearAdmin(url, clave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // ============================================
  // 3. CONSULTAR SUPABASE AUTH
  // ============================================

  try {
    const {
      data: cuenta,
      error: errorCuenta,
    } = await admin.auth.admin.getUserById(
      usuarioId
    );

    if (errorCuenta) {
      console.error(
        "Error al verificar usuario:",
        errorCuenta.message
      );

      if (errorCuenta.status === 404) {
        return accesoDenegado(
          request,
          response
        );
      }

      return verificacionNoDisponible(
        request,
        response
      );
    }

    if (!cuenta.user) {
      return accesoDenegado(
        request,
        response
      );
    }

    // ==========================================
    // 4. VERIFICAR SUSPENSION
    // ==========================================

    const fechaSuspension =
      cuenta.user.banned_until;

    const suspendida = Boolean(
      fechaSuspension &&
      new Date(fechaSuspension).getTime() >
        Date.now()
    );

    if (suspendida) {
      return accesoDenegado(
        request,
        response
      );
    }

    // Cuenta sin suspensión.
    return response;
  } catch (error) {
    console.error(
      "Error de verificación de seguridad:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );

    return verificacionNoDisponible(
      request,
      response
    );
  }
}