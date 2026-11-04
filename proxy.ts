
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/cliente/:path*",
    "/entrenador/:path*",
    "/administrador/:path*",
    "/catalogo/:path*",
    "/api/recomendaciones/:path*",
  ],
};
