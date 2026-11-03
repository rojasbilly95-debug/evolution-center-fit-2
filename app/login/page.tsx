
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ========================================
// TIPOS DE DATOS
// ========================================

type Usuario = {
  email: string;
  nombre: string;
  rol: string;
};

// ========================================
// REDIRECCIÓN SEGÚN EL ROL
// ========================================

function obtenerRutaPorRol(rol: string): string | null {
  switch (rol) {
    case "cliente":
      return "/cliente";

    case "entrenador":
      return "/entrenador";

    // Se habilitará cuando exista
    // el panel del administrador.
    case "administrador":
      return null;

    default:
      return null;
  }
}

// ========================================
// CONSULTAR PERFIL Y ROL EN SUPABASE
// ========================================

async function obtenerPerfil(id: string, email: string) {
  const supabase = createClient();

  const [perfil, acceso] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre_completo")
      .eq("id", id)
      .single(),

    supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", id)
      .single(),
  ]);

  const usuario: Usuario = {
    email,
    nombre: perfil.data?.nombre_completo ?? "No disponible",
    rol: acceso.data?.rol ?? "No disponible",
  };

  const error =
    perfil.error || acceso.error
      ? "La cuenta se autenticó, pero no se pudo consultar su perfil o rol. Revisaremos los permisos de la base de datos."
      : "";

  return { usuario, error };
}

// ========================================
// COMPONENTE PRINCIPAL DEL LOGIN
// ========================================

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const [error, setError] = useState("");

  const [cargando, setCargando] = useState(false);

  const [verificando, setVerificando] = useState(true);

  // ========================================
  // COMPROBAR SI YA EXISTE UNA SESIÓN
  // ========================================

  useEffect(() => {
    let activo = true;

    async function verificarSesion() {
      try {
        const supabase = createClient();

        const { data, error: errorAuth } =
          await supabase.auth.getUser();

        if (!activo) return;

        if (!errorAuth && data.user) {
          const resultado = await obtenerPerfil(
            data.user.id,
            data.user.email ?? ""
          );

          if (!activo) return;

          setUsuario(resultado.usuario);
          setError(resultado.error);

          // Obtener ruta según el rol.
          const ruta = !resultado.error
            ? obtenerRutaPorRol(resultado.usuario.rol)
            : null;

          // Redirigir a su panel autorizado.
          if (ruta) {
            router.replace(ruta);
            return;
          }
        }
      } catch {
        if (activo) {
          setError("No se pudo comprobar la sesión.");
        }
      } finally {
        if (activo) {
          setVerificando(false);
        }
      }
    }

    void verificarSesion();

    return () => {
      activo = false;
    };
  }, [router]);

  // ========================================
  // INICIAR SESIÓN CON SUPABASE AUTH
  // ========================================

  async function iniciarSesion(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setCargando(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: errorAuth } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (errorAuth || !data.user) {
        setError("Correo o contraseña incorrectos.");
        return;
      }

      // Consultar datos del usuario.
      const resultado = await obtenerPerfil(
        data.user.id,
        data.user.email ?? email
      );

      setUsuario(resultado.usuario);
      setError(resultado.error);
      setPassword("");

      // Determinar panel correspondiente.
      const ruta = !resultado.error
        ? obtenerRutaPorRol(resultado.usuario.rol)
        : null;

      if (ruta) {
        router.replace(ruta);
        return;
      }

      // Para roles sin panel disponible,
      // se mantiene la vista informativa.
    } catch {
      setError(
        "No se pudo conectar. Comprueba tu conexión."
      );
    } finally {
      setCargando(false);
    }
  }

  // ========================================
  // CERRAR SESIÓN
  // ========================================

  async function cerrarSesion() {
    setCargando(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: errorSalida } =
        await supabase.auth.signOut();

      if (errorSalida) {
        setError("No se pudo cerrar la sesión.");
        return;
      }

      // Limpiar los datos locales.
      setUsuario(null);
      setEmail("");
      setPassword("");

      // Actualizar los componentes del servidor.
      router.refresh();
    } catch {
      setError(
        "Ocurrió un error al cerrar la sesión."
      );
    } finally {
      setCargando(false);
    }
  }

  // ========================================
  // INTERFAZ VISUAL DEL LOGIN
  // ========================================

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md">

        {/* ENCABEZADO */}
        <div className="mb-8 text-center">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-3xl font-black text-slate-950">
            E
          </div>

          <h1 className="text-2xl font-black">
            EVOLUTION CENTER FIT
            <span className="ml-2 text-cyan-400">
              2.0
            </span>
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Sistema inteligente de entrenamiento
          </p>

        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">

          {verificando ? (

            // VERIFICANDO SESIÓN
            <div className="text-center">
              <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

              <p className="text-slate-300">
                Comprobando sesión...
              </p>
            </div>

          ) : usuario ? (

            // USUARIO AUTENTICADO
            <div className="space-y-5">

              <div className="rounded-2xl bg-emerald-500/10 p-5 text-center">

                <div className="mb-2 text-3xl">
                  ✓
                </div>

                <h2 className="text-xl font-bold text-emerald-300">
                  Autenticación correcta
                </h2>

                <p className="mt-2 text-sm text-slate-300">
                  Supabase ha reconocido tu cuenta.
                </p>

              </div>

              {/* INFORMACIÓN DEL USUARIO */}
              <div className="space-y-3 rounded-xl bg-slate-800 p-5 text-sm">

                <p>
                  <span className="text-slate-400">
                    Nombre:
                  </span>{" "}
                  {usuario.nombre}
                </p>

                <p>
                  <span className="text-slate-400">
                    Correo:
                  </span>{" "}
                  {usuario.email}
                </p>

                <p>
                  <span className="text-slate-400">
                    Rol registrado:
                  </span>{" "}
                  {usuario.rol}
                </p>

              </div>

              {/* MENSAJES DE ERROR */}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
                >
                  {error}
                </p>
              )}

              {/* PANEL NO IMPLEMENTADO */}
              {!error &&
                !obtenerRutaPorRol(usuario.rol) && (
                  <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
                    Tu cuenta está autenticada, pero el
                    panel correspondiente a este rol
                    todavía no está disponible.
                  </p>
                )}

              {/* CERRAR SESIÓN */}
              <button
                type="button"
                onClick={cerrarSesion}
                disabled={cargando}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                {cargando
                  ? "Cerrando sesión..."
                  : "Cerrar sesión"}
              </button>

            </div>

          ) : (

            // FORMULARIO DE INICIO DE SESIÓN
            <>
              <h2 className="text-2xl font-bold">
                ¡Bienvenido!
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Ingresa tus credenciales para continuar.
              </p>

              <form
                onSubmit={iniciarSesion}
                className="mt-8 space-y-5"
              >

                {/* CORREO ELECTRÓNICO */}
                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium"
                  >
                    Correo electrónico
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="correo@ejemplo.com"
                    autoComplete="username"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400"
                  />

                </div>

                {/* CONTRASEÑA */}
                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium"
                  >
                    Contraseña
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400"
                  />

                </div>

                {/* MENSAJES DE ERROR */}
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
                  >
                    {error}
                  </p>
                )}

                {/* BOTÓN INICIAR SESIÓN */}
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 px-5 py-3 font-bold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
                >
                  {cargando
                    ? "Verificando..."
                    : "Iniciar sesión"}
                </button>

              </form>
            </>
          )}

        </section>

        {/* PIE DE PÁGINA */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Lima, Perú · 2026
        </p>

      </div>
    </main>
  );
}
