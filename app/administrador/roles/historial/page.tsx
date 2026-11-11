
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  createClient as crearClientePrivilegiado,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// ===========================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.19.2.9
// HISTORIAL ADMINISTRATIVO DE ROLES
// ===========================================

type Auditoria = {
  id: string;
  administrador_id: string;
  usuario_id: string;
  rol_anterior: string;
  rol_nuevo: string;
  motivo: string;
  creado_en: string;
};

type Usuario = {
  id: string;
  nombre_completo: string;
};

function mostrarRol(rol: string) {
  const nombres: Record<string, string> = {
    administrador: "Administrador",
    entrenador: "Entrenador",
    cliente: "Cliente",
  };

  return nombres[rol] ?? rol;
}

function mostrarFecha(fecha: string) {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no disponible";
  }

  return valor.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function MensajeError() {
  return (
    <main className="min-h-screen bg-[#080e1b] p-6 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-400/20 bg-[#101d31] p-8">
        <h1 className="text-xl font-bold">
          No se pudo consultar la auditoría
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          Verifica la configuración y los permisos
          de lectura de la tabla de auditoría.
        </p>

        <Link
          href="/administrador/roles"
          className="mt-6 inline-block font-semibold text-cyan-300"
        >
          Volver a roles y permisos
        </Link>
      </div>
    </main>
  );
}

async function ContenidoHistorial() {
  await connection();

  // 1. Verificar identidad real.

  const supabase = await createClient();

  const {
    data: identidad,
    error: errorIdentidad,
  } = await supabase.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    redirect("/login");
  }

  // 2. Verificar rol administrativo.

  const {
    data: permiso,
    error: errorPermiso,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorPermiso ||
    permiso?.rol !== "administrador"
  ) {
    redirect("/");
  }

  // 3. Cliente privilegiado solo en servidor.

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return <MensajeError />;
  }

  const admin = crearClientePrivilegiado(
    url,
    clave,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 4. Consultar últimos 100 cambios.

  const {
    data,
    error,
  } = await admin
    .from("auditoria_cambios_rol")
    .select(
      "id,administrador_id,usuario_id,rol_anterior,rol_nuevo,motivo,creado_en"
    )
    .order("creado_en", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    console.error(
      "Auditoría: error de consulta",
      error.code
    );

    return <MensajeError />;
  }

  const registros = (data ?? []) as Auditoria[];

  // 5. Buscar nombres relacionados.

  const identificadores = Array.from(
    new Set(
      registros.flatMap((registro) => [
        registro.administrador_id,
        registro.usuario_id,
      ])
    )
  );

  const resultadoUsuarios =
    identificadores.length > 0
      ? await admin
          .from("usuarios")
          .select("id,nombre_completo")
          .in("id", identificadores)
      : { data: [], error: null };

  if (resultadoUsuarios.error) {
    console.error(
      "Auditoría: error consultando nombres",
      resultadoUsuarios.error.code
    );

    return <MensajeError />;
  }

  const usuarios =
    (resultadoUsuarios.data ?? []) as Usuario[];

  const nombres = new Map(
    usuarios.map((usuario) => [
      usuario.id,
      usuario.nombre_completo,
    ])
  );

  return (
    <main className="min-h-screen bg-[#080e1b] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/administrador/roles"
          className="text-sm font-semibold text-cyan-300 hover:underline"
        >
          ← Volver a roles y permisos
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Administración · Seguridad
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Historial de cambios de roles
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Registro de las modificaciones
              realizadas sobre los permisos
              de usuarios del gimnasio.
            </p>
          </div>

          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-200">
            Consulta administrativa
          </span>
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#101d31] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              Últimas operaciones registradas
            </h2>

            <span className="text-sm text-slate-400">
              {registros.length} registros mostrados
            </span>
          </div>

          {registros.length === 0 ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-[#080e1b] p-8 text-center">
              <p className="font-semibold text-white">
                Todavía no existen cambios registrados
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Los cambios de rol realizados mediante
                la nueva operación auditada aparecerán
                aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-4">
                      Fecha
                    </th>
                    <th className="px-3 py-4">
                      Administrador
                    </th>
                    <th className="px-3 py-4">
                      Usuario
                    </th>
                    <th className="px-3 py-4">
                      Rol anterior
                    </th>
                    <th className="px-3 py-4">
                      Rol nuevo
                    </th>
                    <th className="px-3 py-4">
                      Motivo
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {registros.map((registro) => (
                    <tr
                      key={registro.id}
                      className="border-b border-white/5 align-top"
                    >
                      <td className="whitespace-nowrap px-3 py-4 text-slate-300">
                        {mostrarFecha(registro.creado_en)}
                      </td>

                      <td className="px-3 py-4 font-semibold">
                        {nombres.get(
                          registro.administrador_id
                        ) ?? "Usuario no disponible"}
                      </td>

                      <td className="px-3 py-4">
                        {nombres.get(
                          registro.usuario_id
                        ) ?? "Usuario no disponible"}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {mostrarRol(
                          registro.rol_anterior
                        )}
                      </td>

                      <td className="px-3 py-4 font-semibold text-cyan-300">
                        {mostrarRol(
                          registro.rol_nuevo
                        )}
                      </td>

                      <td className="max-w-xs break-words px-3 py-4 text-slate-300">
                        {registro.motivo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs text-slate-500">
          Se muestran hasta 100 operaciones recientes.
          Las fechas se presentan en horario de Lima, Perú.
          Este historial solo permite consultar información.
        </p>
      </div>
    </main>
  );
}

export default function HistorialRolesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#080e1b] text-cyan-200">
          Consultando historial de auditoría...
        </main>
      }
    >
      <ContenidoHistorial />
    </Suspense>
  );
}
