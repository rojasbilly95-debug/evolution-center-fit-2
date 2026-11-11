
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = {
    "Cache-Control": "private, no-store, max-age=0",
};

function respuesta(
    datos: Record<string, unknown>,
    status = 200
) {
    return NextResponse.json(datos, {
        status,
        headers,
    });
}

export async function GET() {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const publicKey =
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        const secretKey = process.env.SUPABASE_SECRET_KEY;

        if (!url || !publicKey || !secretKey) {
            console.error("Configuración Supabase incompleta");

            return respuesta(
                { error: "Servicio no configurado." },
                500
            );
        }

        // 1. Comprobar sesión del usuario.
        const cookieStore = await cookies();

        const supabase = createServerClient(
            url,
            publicKey,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(
                            ({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            }
                        );
                    },
                },
            }
        );

// 1. Verificar la sesión del usuario.
const {
    data: authData,
    error: authError,
} = await supabase.auth.getClaims();

// Obtener el ID de forma segura.
const entrenadorId = authData?.claims?.sub;

// Rechazar solicitudes sin sesión válida.
if (authError || !entrenadorId) {
    return respuesta(
        { error: "Sesión no válida." },
        401
    );
}

        // 2. Cliente privilegiado exclusivo del servidor.
        const admin = createClient(url, secretKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // 3. Verificar rol real en base de datos.
        const { data: roles, error: rolError } =
            await admin
                .from("usuario_roles")
                .select("usuario_id")
                .eq("usuario_id", entrenadorId)
                .eq("rol", "entrenador")
                .limit(1);

        if (rolError) {
            console.error("Error comprobando rol:", rolError);
            return respuesta(
                { error: "No se pudo verificar el rol." },
                500
            );
        }

        if (!roles?.length) {
            return respuesta(
                { error: "Acceso reservado a entrenadores." },
                403
            );
        }

        // 4. Consultar exclusivamente asignaciones activas.
        const { data: asignaciones, error: asignError } =
            await admin
                .from("asignaciones_entrenadores")
                .select("cliente_id")
                .eq("entrenador_id", entrenadorId)
                .eq("activa", true);

        if (asignError) {
            console.error(
                "Error consultando asignaciones:",
                asignError
            );

            return respuesta(
                { error: "No se pudieron verificar los clientes." },
                500
            );
        }

        const clientesIds = [
            ...new Set(
                (asignaciones ?? []).map((a) => a.cliente_id)
            ),
        ];

        if (clientesIds.length === 0) {
            return respuesta({
                modo: "demostracion",
                entrenador_id: entrenadorId,
                total_clientes: 0,
                total_sesiones: 0,
                sesiones: [],
            });
        }

        // 5. Consultar la vista, limitada al entrenador
        //    autenticado y sus clientes asignados.
        const { data: sesiones, error: sesionesError } =
            await admin
                .from("ecf_v_calendario_demo")
                .select(
                    "sesion_id, cliente_id, cliente_nombre, entrenador_id, entrenador_nombre, rutina_id, numero_sesion, semana, fecha_programada, duracion_programada_min, estado, es_simulacion"
                )
                .eq("entrenador_id", entrenadorId)
                .in("cliente_id", clientesIds)
                .eq("es_simulacion", true)
                .order("fecha_programada", {
                    ascending: true,
                })
                .order("numero_sesion", {
                    ascending: true,
                })
                .range(0, 999);

        if (sesionesError) {
            console.error(
                "Error consultando calendario:",
                sesionesError
            );

            return respuesta(
                { error: "No se pudo cargar el calendario." },
                500
            );
        }

        const registros = sesiones ?? [];

        const clientes = new Set(
            registros.map((s) => s.cliente_id)
        );

        // 6. Entregar únicamente datos de demostración.
        return respuesta({
            modo: "demostracion",
            entrenador_id: entrenadorId,
            total_clientes: clientes.size,
            total_sesiones: registros.length,
            sesiones: registros,
        });
    } catch (error) {
        console.error("Error API calendario demo:", error);

        return respuesta(
            { error: "Error interno del calendario." },
            500
        );
    }
}
