"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "fotos-perfil";
const MAX_ARCHIVO_ORIGINAL = 8 * 1024 * 1024;
const MAX_ARCHIVO_FINAL = 2 * 1024 * 1024;

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type Props = {
  usuarioId: string;
};

async function convertirAWebp(
  archivo: File
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new window.Image();

    imagen.onload = () => {
      try {
        const ancho = imagen.naturalWidth;
        const alto = imagen.naturalHeight;

        if (!ancho || !alto) {
          throw new Error("La imagen no es válida.");
        }

        const lado = Math.min(ancho, alto);

        const origenX = (ancho - lado) / 2;
        const origenY = (alto - lado) / 2;

        const canvas = document.createElement("canvas");

        canvas.width = 512;
        canvas.height = 512;

        const contexto = canvas.getContext("2d");

        if (!contexto) {
          throw new Error(
            "No se pudo procesar la fotografía."
          );
        }

        contexto.drawImage(
          imagen,
          origenX,
          origenY,
          lado,
          lado,
          0,
          0,
          512,
          512
        );

        canvas.toBlob(
          (resultado) => {
            if (!resultado) {
              reject(
                new Error(
                  "No se pudo convertir la fotografía."
                )
              );
              return;
            }

            resolve(resultado);
          },
          "image/webp",
          0.82
        );
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(url);

      reject(
        new Error("No se pudo abrir la fotografía.")
      );
    };

    imagen.src = url;
  });
}

export default function FotoPerfil({
  usuarioId,
}: Props) {
  const ruta = `${usuarioId}/perfil.webp`;

  const [fotoUrl, setFotoUrl] = useState<string | null>(
    null
  );

  const [vistaPrevia, setVistaPrevia] = useState<
    string | null
  >(null);

  const [archivo, setArchivo] = useState<File | null>(
    null
  );

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const vistaTemporal = useRef<string | null>(null);

  // Consultar la fotografía existente.
  useEffect(() => {
    let activo = true;

    async function consultarFoto() {
      const supabase = createClient();

      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(ruta, 300);

      if (!activo) return;

      setFotoUrl(data?.signedUrl ?? null);
      setCargando(false);
    }

    void consultarFoto();

    return () => {
      activo = false;
    };
  }, [ruta]);

  // Liberar recursos de la vista previa.
  useEffect(() => {
    return () => {
      if (vistaTemporal.current) {
        URL.revokeObjectURL(vistaTemporal.current);
      }
    };
  }, []);

  function limpiarSeleccion() {
    if (vistaTemporal.current) {
      URL.revokeObjectURL(vistaTemporal.current);
      vistaTemporal.current = null;
    }

    setArchivo(null);
    setVistaPrevia(null);
  }

  function seleccionarArchivo(
    evento: React.ChangeEvent<HTMLInputElement>
  ) {
    const seleccionado = evento.target.files?.[0];

    evento.target.value = "";

    if (!seleccionado) return;

    setError("");
    setMensaje("");

    if (!TIPOS_PERMITIDOS.includes(seleccionado.type)) {
      setError(
        "Selecciona una imagen JPG, PNG o WebP."
      );
      return;
    }

    if (seleccionado.size > MAX_ARCHIVO_ORIGINAL) {
      setError(
        "La imagen original no debe superar los 8 MB."
      );
      return;
    }

    limpiarSeleccion();

    const url = URL.createObjectURL(seleccionado);

    vistaTemporal.current = url;

    setArchivo(seleccionado);
    setVistaPrevia(url);
  }

  async function guardarFotografia() {
    if (!archivo || procesando) return;

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      const imagenWebp = await convertirAWebp(
        archivo
      );

      if (imagenWebp.size > MAX_ARCHIVO_FINAL) {
        throw new Error(
          "La fotografía procesada supera los 2 MB."
        );
      }

      const supabase = createClient();

      const { error: errorSubida } =
        await supabase.storage
          .from(BUCKET)
          .upload(ruta, imagenWebp, {
            contentType: "image/webp",
            cacheControl: "60",
            upsert: true,
          });

      if (errorSubida) {
        throw new Error(errorSubida.message);
      }

      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(ruta, 300);

      setFotoUrl(data?.signedUrl ?? null);

      limpiarSeleccion();

      setMensaje(
        "Tu fotografía se guardó correctamente."
      );
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo guardar la fotografía."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function eliminarFotografia() {
    if (!fotoUrl || procesando) return;

    const confirmar = window.confirm(
      "¿Deseas eliminar tu fotografía de perfil?"
    );

    if (!confirmar) return;

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      const supabase = createClient();

      const { error: errorEliminar } =
        await supabase.storage
          .from(BUCKET)
          .remove([ruta]);

      if (errorEliminar) {
        throw new Error(errorEliminar.message);
      }

      setFotoUrl(null);
      limpiarSeleccion();

      setMensaje(
        "Tu fotografía se eliminó correctamente."
      );
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo eliminar la fotografía."
      );
    } finally {
      setProcesando(false);
    }
  }

  const imagenVisible = vistaPrevia ?? fotoUrl;

  return (
    <section
      className="
        rounded-3xl
        border border-slate-200
        bg-white
        p-5
        shadow-sm
        dark:border-white/10
        dark:bg-[#111d31]
        sm:p-7
      "
      aria-labelledby="titulo-fotografia"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

        {/* FOTOGRAFÍA */}
        <div
          className="
            flex h-32 w-32
            shrink-0
            items-center justify-center
            overflow-hidden
            rounded-3xl
            border-2 border-cyan-400/30
            bg-cyan-400/10
            text-cyan-700
            dark:text-cyan-200
          "
        >
          {imagenVisible ? (
            // La URL puede ser temporal o estar firmada.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagenVisible}
              alt="Mi fotografía de perfil"
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-16 w-16"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          )}
        </div>

        {/* CONTROLES */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            Identificación personal
          </p>

          <h2
            id="titulo-fotografia"
            className="mt-2 text-xl font-bold text-slate-900 dark:text-white"
          >
            Fotografía de perfil
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Añade una fotografía para facilitar tu
            identificación por parte del entrenador.
            La imagen se almacena de forma privada.
          </p>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            JPG, PNG o WebP. Se realizará un recorte
            cuadrado automático.
          </p>

          {cargando && (
            <p className="mt-3 text-xs text-cyan-700 dark:text-cyan-300">
              Consultando fotografía...
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <label
              htmlFor="archivo-foto-perfil"
              className={`
                inline-flex min-h-11
                cursor-pointer items-center
                justify-center rounded-xl
                bg-cyan-400 px-5 py-3
                text-sm font-bold text-slate-950
                transition hover:bg-cyan-300
                ${
                  procesando
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              `}
            >
              Seleccionar fotografía
            </label>

            <input
              id="archivo-foto-perfil"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={procesando}
              onChange={seleccionarArchivo}
            />

            {archivo && (
              <button
                type="button"
                onClick={guardarFotografia}
                disabled={procesando}
                className="
                  min-h-11 rounded-xl
                  bg-emerald-500 px-5 py-3
                  text-sm font-bold text-white
                  transition hover:bg-emerald-400
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {procesando
                  ? "Guardando..."
                  : "Guardar fotografía"}
              </button>
            )}

            {fotoUrl && !archivo && (
              <button
                type="button"
                onClick={eliminarFotografia}
                disabled={procesando}
                className="
                  min-h-11 rounded-xl
                  border border-rose-400/30
                  px-5 py-3
                  text-sm font-semibold
                  text-rose-700
                  dark:text-rose-300
                  transition hover:bg-rose-400/10
                  disabled:opacity-50
                "
              >
                Eliminar fotografía
              </button>
            )}

            {archivo && (
              <button
                type="button"
                onClick={limpiarSeleccion}
                disabled={procesando}
                className="
                  min-h-11 rounded-xl
                  border border-slate-300
                  px-5 py-3
                  text-sm font-semibold
                  text-slate-700
                  dark:border-white/20
                  dark:text-slate-200
                  disabled:opacity-50
                "
              >
                Cancelar
              </button>
            )}
          </div>

          {vistaPrevia && (
            <p className="mt-3 text-xs text-cyan-700 dark:text-cyan-300">
              Vista previa. Pulsa «Guardar fotografía»
              para confirmar el cambio.
            </p>
          )}

          {mensaje && (
            <p
              role="status"
              className="
                mt-4 rounded-xl
                border border-emerald-400/20
                bg-emerald-400/10
                px-4 py-3 text-sm
                text-emerald-800
                dark:text-emerald-200
              "
            >
              {mensaje}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="
                mt-4 rounded-xl
                border border-rose-400/20
                bg-rose-400/10
                px-4 py-3 text-sm
                text-rose-800
                dark:text-rose-200
              "
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}