import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// ================================================
// EVOLUTION CENTER FIT 2.0
// PROXY PRINCIPAL
// ================================================

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Áreas privadas
    "/cliente/:path*",
    "/entrenador/:path*",
    "/administrador/:path*",
    "/catalogo/:path*",

    // API privadas
    "/api/adherencia/:path*",
    "/api/asignaciones/:path*",
    "/api/entrenador/:path*",
    "/api/investigacion/:path*",
    "/api/recomendaciones/:path*",
    "/api/sesiones/:path*",
  ],
};