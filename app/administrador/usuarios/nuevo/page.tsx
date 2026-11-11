
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import {
  createClient as crearAdmin,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// ================================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.10 - REGISTRO DE USUARIOS
// Invitacion de clientes y entrenadores.
// ================================================

type Props = {
  searchParams: Promise<{
    estado?: string;
  }>;
};

const MENSAJES: Record<
  string,
  {
    texto: string;
    error: boolean;
  }
> = {
  exito: {
    texto:
      "Invitación enviada y cuenta registrada con el rol seleccionado. Comprueba el correo de invitación.",
    error: false,
  },

  datos: {
    texto:
      "Revisa el nombre, correo y rol. Solo puedes invitar clientes o entrenadores.",
    error: true,
  },

  config: {
    texto:
      "Falta la configuración privada del servidor. No se realizó ninguna operación.",
    error: true,
  },

  invitacion: {
    texto:
      "No se pudo enviar la invitación. Comprueba si el correo ya está registrado y si Supabase puede enviar correos.",
    error: true,
  },

  registro: {
    texto:
      "Falló el registro del perfil o del rol. Se intentó revertir la cuenta recién creada. Revisa los registros del servidor.",
    error: true,
  },

  revision: {
    texto:
      "La invitación se generó, pero falló el registro y no se pudo confirmar la reversión. Revisa Supabase Auth antes de volver a intentarlo.",
    error: true,
  },
};

// ================================================
// ACCION SEGURA DEL SERVIDOR
// ================================================

async function invitarUsuario(
  formData: FormData
) {
  "use server";

  // ----------------------------------------------
  // 1. RECIBIR Y VALIDAR DATOS
  // ----------------------------------------------

  const nombreOriginal =
    formData.get("nombre");

  const correoOriginal =
    formData.get("correo");

  const rolOriginal =
    formData.get("rol");

  const nombre =
    typeof nombreOriginal === "string"
      ? nombreOriginal
          .trim()
          .replace(/\s+/g, " ")
      : "";

  const correo =
    typeof correoOriginal === "string"
      ? correoOriginal
          .trim()
          .toLowerCase()
      : "";

  const rol =
    typeof rolOriginal === "string"
      ? rolOriginal
      : "";

  const emailValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      correo
    );

  if (
    nombre.length < 2 ||
    nombre.length > 120 ||
    correo.length > 254 ||
    !emailValido ||
    !["cliente", "entrenador"].includes(rol)
  ) {
    redirect(
      "/administrador/usuarios/nuevo?estado=datos"
    );
  }

  // ----------------------------------------------
  // 2. VERIFICAR SESION REAL
  // ----------------------------------------------

  const sesion = await createClient();

  const {
    data: autenticacion,
    error: errorAuth,
  } = await sesion.auth.getUser();

  if (
    errorAuth ||
    !autenticacion.user
  ) {
    redirect("/login");
  }

  // ----------------------------------------------
  // 3. COMPROBAR ROL ADMINISTRADOR
  // ----------------------------------------------

  const {
    data: acceso,
    error: errorAcceso,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq(
      "usuario_id",
      autenticacion.user.id
    )
    .maybeSingle();

  if (
    errorAcceso ||
    acceso?.rol !== "administrador"
  ) {
    redirect("/administrador");
  }

  // ----------------------------------------------
  // 4. CONFIGURACION PRIVADA
  // ----------------------------------------------

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    redirect(
      "/administrador/usuarios/nuevo?estado=config"
    );
  }

  // Cliente privilegiado exclusivo del servidor.
  const admin = crearAdmin(
    url,
    clave,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // ----------------------------------------------
  // 5. INVITAR USUARIO
  // ----------------------------------------------

const invitacion =
  await admin.auth.admin.inviteUserByEmail(
    correo,
    {
      data: {
        nombre_completo: nombre,
      },
      redirectTo:
        "https://evolution-center-fit-2.vercel.app/invitacion/recibir",
    }
  );

  const nuevoId =
    invitacion.data.user?.id;

  if (
    invitacion.error ||
    !nuevoId
  ) {
    console.error(
      "admin.invitarUsuario: error de invitacion",
      invitacion.error?.code ?? "sin-id"
    );

    redirect(
      "/administrador/usuarios/nuevo?estado=invitacion"
    );
  }

  // ----------------------------------------------
  // 6. REGISTRAR PERFIL DEL USUARIO
  // ----------------------------------------------

  const {
    error: errorPerfil,
  } = await admin
    .from("usuarios")
    .upsert(
      {
        id: nuevoId,
        nombre_completo: nombre,
      },
      {
        onConflict: "id",
      }
    );

  // ----------------------------------------------
  // 7. ASIGNAR ROL
  // ----------------------------------------------

  let errorRol: string | null = null;

  if (!errorPerfil) {
    const {
      error,
    } = await admin
      .from("usuario_roles")
      .upsert(
        {
          usuario_id: nuevoId,
          rol,
        },
        {
          onConflict: "usuario_id",
        }
      );

    errorRol = error?.code ?? null;
  }

  // ----------------------------------------------
  // 8. VERIFICAR EL ROL GUARDADO
  // ----------------------------------------------

  let rolConfirmado = false;

  if (
    !errorPerfil &&
    !errorRol
  ) {
    const {
      data,
      error,
    } = await admin
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", nuevoId)
      .maybeSingle();

    rolConfirmado =
      !error &&
      data?.rol === rol;
  }

  // ----------------------------------------------
  // 9. REVERTIR SI FALLA EL REGISTRO
  // ----------------------------------------------

  if (
    errorPerfil ||
    errorRol ||
    !rolConfirmado
  ) {
    console.error(
      "admin.invitarUsuario: registro no confirmado",
      {
        perfil:
          errorPerfil?.code ?? null,
        rol: errorRol,
        confirmado: rolConfirmado,
      }
    );

    const {
      error: errorReversion,
    } = await admin.auth.admin.deleteUser(
      nuevoId
    );

    if (errorReversion) {
      console.error(
        "admin.invitarUsuario: reversión pendiente",
        errorReversion.code
      );

      redirect(
        "/administrador/usuarios/nuevo?estado=revision"
      );
    }

    redirect(
      "/administrador/usuarios/nuevo?estado=registro"
    );
  }

  // ----------------------------------------------
  // 10. REGISTRAR EVENTO BASICO
  // ----------------------------------------------

  console.info(
    "admin.invitarUsuario: cuenta creada",
    {
      actorId:
        autenticacion.user.id,
      nuevoId,
      rol,
    }
  );

  // La auditoria persistente se implementara
  // posteriormente en una tabla protegida.

  // ----------------------------------------------
  // 11. ACTUALIZAR VISTAS
  // ----------------------------------------------

  revalidatePath("/administrador");

  revalidatePath(
    "/administrador/usuarios"
  );

  redirect(
    "/administrador/usuarios/nuevo?estado=exito"
  );
}

// ================================================
// PANTALLA DE CARGA
// ================================================

function Cargando() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] text-cyan-200">
      Cargando formulario de invitación...
    </main>
  );
}

// ================================================
// CONTENIDO PROTEGIDO
// ================================================

async function Contenido({
  searchParams,
}: Props) {
  await connection();

  const { estado } = await searchParams;

  const mensaje =
    typeof estado === "string"
      ? MENSAJES[estado]
      : undefined;

  // ----------------------------------------------
  // VERIFICAR ADMINISTRADOR PARA MOSTRAR FORMULARIO
  // ----------------------------------------------

  const supabase = await createClient();

  const {
    data: identidad,
    error,
  } = await supabase.auth.getUser();

  if (
    error ||
    !identidad.user
  ) {
    redirect("/login");
  }

  const {
    data: rol,
    error: errorRol,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq(
      "usuario_id",
      identidad.user.id
    )
    .maybeSingle();

  if (
    errorRol ||
    rol?.rol !== "administrador"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080e1b] p-6 text-white">
        <section className="max-w-lg rounded-2xl border border-rose-400/25 bg-rose-400/10 p-8 text-center">
          <h1 className="text-2xl font-bold">
            Acceso restringido
          </h1>

          <p className="mt-3 text-sm text-slate-300">
            Solo un administrador puede
            invitar usuarios.
          </p>

          <Link
            href="/login"
            className="mt-4 inline-block font-semibold text-cyan-300"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  // ----------------------------------------------
  // INTERFAZ
  // ----------------------------------------------

  return (
    <main className="min-h-screen bg-[#080e1b] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* NAVEGACION */}

        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href="/administrador"
            className="font-semibold text-cyan-300 hover:underline"
          >
            ← Centro administrativo
          </Link>

          <Link
            href="/administrador/usuarios"
            className="rounded-xl border border-white/15 px-4 py-2.5 font-semibold text-slate-200 hover:bg-white/10"
          >
            Ver directorio de usuarios
          </Link>
        </nav>

        {/* CABECERA */}

        <header className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#17374b] to-[#171d39] p-6 shadow-xl sm:p-9">
          <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-300">
            EVOLUTION CENTER FIT 2.0
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-400">
            Administración de cuentas
          </p>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Invitar nuevo usuario
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Registra un cliente o entrenador
            enviándole una invitación por
            correo electrónico.

            Su perfil y rol quedarán registrados
            en Supabase.
          </p>
        </header>

        {/* MENSAJES */}

        {mensaje && (
          <div
            role="status"
            className={`rounded-2xl border p-5 text-sm leading-6 ${
              mensaje.error
                ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
                : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* FORMULARIO */}

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#162940] to-[#101c30] p-6 shadow-[0_16px_45px_rgba(0,0,0,0.2)] sm:p-8">

          <h2 className="text-xl font-bold">
            Datos de la nueva cuenta
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Completa todos los campos para
            enviar la invitación.
          </p>

          <form
            action={invitarUsuario}
            className="mt-6 space-y-5"
          >

            {/* NOMBRE */}

            <div>
              <label
                htmlFor="nombre"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Nombre completo
              </label>

              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                placeholder="Ejemplo: María López"
                className="w-full rounded-xl border border-white/15 bg-[#071627] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
              />
            </div>

            {/* CORREO */}

            <div>
              <label
                htmlFor="correo"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Correo electrónico
              </label>

              <input
                id="correo"
                name="correo"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                placeholder="usuario@ejemplo.com"
                className="w-full rounded-xl border border-white/15 bg-[#071627] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
              />
            </div>

            {/* ROL */}

            <div>
              <label
                htmlFor="rol"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Rol inicial
              </label>

              <select
                id="rol"
                name="rol"
                required
                defaultValue="cliente"
                className="w-full rounded-xl border border-white/15 bg-[#071627] px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="cliente">
                  Cliente
                </option>

                <option value="entrenador">
                  Entrenador
                </option>
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Por seguridad, esta pantalla
                no permite crear administradores.
              </p>
            </div>

            {/* BOTON */}

            <button
              type="submit"
              className="min-h-12 w-full rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-[#07121e] transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Enviar invitación y registrar cuenta
            </button>
          </form>
        </section>

        {/* AVISO */}

        <aside className="rounded-2xl border border-white/10 bg-[#111e32] p-5 text-sm leading-7 text-slate-300">
          <h2 className="font-bold text-white">
            Información importante
          </h2>

          <p className="mt-2">
            Supabase Auth debe tener configurado
            el envío de correos y el flujo de
            aceptación de invitaciones.
          </p>

          <p className="mt-2">
            La cuenta se registra cuando la
            invitación se genera correctamente,
            pero su propietario todavía deberá
            aceptarla y configurar el acceso.
          </p>

          <p className="mt-3 text-amber-200">
            Antes de habilitar esta función en
            producción, rota las credenciales
            privadas compartidas anteriormente.
          </p>
        </aside>

        <footer className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Administración
        </footer>
      </div>
    </main>
  );
}

// ================================================
// PAGINA PRINCIPAL
// ================================================

export default function NuevoUsuarioPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido
        searchParams={searchParams}
      />
    </Suspense>
  );
}
