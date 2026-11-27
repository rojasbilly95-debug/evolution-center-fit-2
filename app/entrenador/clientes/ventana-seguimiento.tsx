"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { PerfilVerificable } from "@/lib/perfil/verificacion";
import FotoCliente from "./foto-cliente";

type Props = {
  nombre: string;
  perfil: PerfilVerificable | null;
  fotoUrl: string | null;
  seguimiento: ReactNode;
  verificacion: ReactNode;
  recomendaciones: ReactNode;
};

function mostrar(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined || valor === "") {
    return "No registrado";
  }

  return String(valor).replaceAll("_", " ");
}

function equipos(
  valor: string[] | null | undefined
): string {
  if (!Array.isArray(valor)) {
    return "Pendiente de clasificar";
  }

  if (valor.length === 0) {
    return "Sin equipos declarados";
  }

  return valor.join(", ").replaceAll("_", " ");
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs text-slate-400">
        {titulo}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {valor}
      </p>
    </div>
  );
}

export default function VentanaSeguimiento({
  nombre,
  perfil,
  fotoUrl,
  seguimiento,
  verificacion,
  recomendaciones,
}: Props) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [mostrarFicha, setMostrarFicha] = useState(false);

  useEffect(() => {
    const dialog = dialogo.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  const imc =
    perfil?.peso_kg != null &&
    perfil.estatura_cm != null &&
    perfil.estatura_cm > 0
      ? (
          perfil.peso_kg /
          Math.pow(perfil.estatura_cm / 100, 2)
        ).toFixed(1)
      : null;

  return (
    <dialog
      ref={dialogo}
      aria-label={`Seguimiento de ${nombre}`}
      onCancel={(evento) => {
        evento.preventDefault();
        router.back();
      }}
      className="fixed inset-0 m-auto h-[96dvh] w-[98vw] max-w-[1650px] overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#091322] p-0 text-white shadow-2xl backdrop:bg-black/80"
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* CABECERA */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#112138] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
<FotoCliente
  nombre={nombre}
  fotoUrl={fotoUrl}
  compacto
/>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">
                {nombre}
              </h2>

              <p className="text-xs text-slate-400">
                Seguimiento del cliente
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-expanded={mostrarFicha}
              aria-controls="ficha-cliente-lateral"
              onClick={() =>
                setMostrarFicha((actual) => !actual)
              }
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20"
            >
              {mostrarFicha ? "− Cerrar datos" : "+ Datos del cliente"}
            </button>

            <button
              type="button"
              aria-label="Cerrar seguimiento"
              onClick={() => router.back()}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          {/* SEGUIMIENTO ORIGINAL */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="[&>main>header]:hidden [&>main]:min-h-0 [&>main>div.relative>section:first-child]:hidden">
              {seguimiento}
            </div>
          </div>

          {/* FICHA LATERAL */}
          {mostrarFicha && (
            <aside
              id="ficha-cliente-lateral"
              aria-label="Ficha del cliente"
              className="absolute inset-0 z-10 overflow-y-auto border-l border-white/10 bg-[#112138] p-4 md:relative md:inset-auto md:w-[390px] md:shrink-0 md:p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                    Información del cliente
                  </p>

                  <h3 className="mt-1 text-lg font-bold">
                    Ficha de entrenamiento
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarFicha(false)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>

              {!perfil ? (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
                  Este cliente todavía no tiene un perfil registrado.
                </p>
              ) : (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-3 font-bold text-cyan-200">
                      Datos físicos
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      <Dato
                        titulo="Edad"
                        valor={
                          perfil.edad != null
                            ? `${perfil.edad} años`
                            : "No registrada"
                        }
                      />

                      <Dato
                        titulo="Peso"
                        valor={
                          perfil.peso_kg != null
                            ? `${perfil.peso_kg} kg`
                            : "No registrado"
                        }
                      />

                      <Dato
                        titulo="Estatura"
                        valor={
                          perfil.estatura_cm != null
                            ? `${(
                                perfil.estatura_cm / 100
                              ).toFixed(2)} m`
                            : "No registrada"
                        }
                      />

                      <Dato
                        titulo="IMC orientativo"
                        valor={imc ?? "No disponible"}
                      />
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 font-bold text-cyan-200">
                      Objetivo y disponibilidad
                    </h4>

                    <div className="grid gap-2">
                      <Dato
                        titulo="Objetivo"
                        valor={mostrar(perfil.objetivo)}
                      />

                      <Dato
                        titulo="Experiencia"
                        valor={mostrar(perfil.experiencia)}
                      />

                      <Dato
                        titulo="Máximo de días disponibles"
                        valor={
                          perfil.frecuencia_semanal != null
                            ? `${perfil.frecuencia_semanal} días/semana`
                            : "No registrado"
                        }
                      />

                      <Dato
                        titulo="Máximo por sesión"
                        valor={
                          perfil.minutos_por_sesion != null
                            ? `${perfil.minutos_por_sesion} minutos`
                            : "No registrado"
                        }
                      />

                      <Dato
                        titulo="Lugar declarado"
                        valor={mostrar(perfil.lugar)}
                      />
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 font-bold text-cyan-200">
                      Equipamiento
                    </h4>

                    {perfil.lugar !== "gimnasio" && (
                      <Dato
                        titulo="Disponible en casa"
                        valor={equipos(
                          perfil.equipamiento_casa
                        )}
                      />
                    )}

                    {perfil.lugar !== "casa" && (
                      <Dato
                        titulo="Disponible en gimnasio"
                        valor={equipos(
                          perfil.equipamiento_gimnasio
                        )}
                      />
                    )}
                  </section>

                  <section>
                    <h4 className="mb-3 font-bold text-cyan-200">
                      Consideraciones
                    </h4>

                    <p className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">
                      {perfil.restricciones?.trim() ||
                        "Sin consideraciones adicionales declaradas."}
                    </p>
                  </section>

                  <section>
                    {verificacion}
                  </section>

                  <section>
                    <h4 className="mb-3 font-bold text-violet-200">
                      Recomendaciones inteligentes
                    </h4>

                    {recomendaciones}
                  </section>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </dialog>
  );
}