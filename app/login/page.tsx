
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Usuario = {
  email: string;
  nombre: string;
  rol: string;
};

// Obtener información y rol del usuario desde Supabase.
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

  return {
    usuario: {
      email,
      nombre: perfil.data?.nombre_completo ?? "No disponible",
      rol: acceso.data?.rol ?? "No disponible",
    },
    error:
      perfil.error || acceso.error
        ? "La cuenta se autenticó, pero no se pudo consultar su perfil o rol. Revisaremos los permisos de la base de datos."
        : "",
  };
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verificando, setVerificando] = useState(true);

  // Comprobar si ya existe una sesión activa.
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

          // Redirección según el rol comprobado.
          if (
            !resultado.error &&
            resultado.usuario.rol === "cliente"
          ) {
            router.replace("/cliente");
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

  // Iniciar sesión utilizando Supabase Auth.
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

      // Consultar el rol registrado en PostgreSQL.
      const resultado = await obtenerPerfil(
        data.user.id,
        data.user.email ?? email
      );

      setUsuario(resultado.usuario);
      setError(resultado.error);
      setPassword("");

      // Enviar al cliente a su panel correspondiente.
      if (
        !resultado.error &&
        resultado.usuario.rol === "cliente"
      ) {
        router.replace("/cliente");
        return;
      }

      // Los demás roles tendrán sus paneles
      // cuando se implementen sus módulos.
    } catch {
      setError(
        "No se pudo conectar. Comprueba tu conexión."
      );
    } finally {
      setCargando(false);
    }
  }

  // Cerrar sesión desde la pantalla de acceso.
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

      setUsuario(null);
      setEmail("");
      setPassword("");
    } catch {
      setError(
        "Ocurrió un error al cerrar la sesión."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md">

        {/* Encabezado */}
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

        {/* Contenedor principal */}
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">

          {verificando ? (
            <p className="text-center text-slate-300">
              Comprobando sesión...
            </p>
          ) : usuario ? (

            // Estado autenticado
            <div className="space-y-5">
              <div className="rounded-2xl bg-emerald-500/10 p-5 text-center">
                <div className="mb-2 text-3xl">✓</div>

                <h2 className="text-xl font-bold text-emerald-300">
                  Autenticación correcta
                </h2>

                <p className="mt-2 text-sm text-slate-300">
                  Supabase ha reconocido tu cuenta.
                </p>
              </div>

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

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
                >
                  {error}
                </p>
              )}

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

            // Formulario de inicio de sesión
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
                {/* Correo electrónico */}
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

                {/* Contraseña */}
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

                {/* Mensajes de error */}
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300"
                  >
                    {error}
                  </p>
                )}

                {/* Botón de acceso */}
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

        {/* Pie de página */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Lima, Perú · 2026
        </p>
      </div>
    </main>
  );
}
