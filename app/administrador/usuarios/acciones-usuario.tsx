"use client";

import {
  useActionState,
  useState,
  type FormEvent,
} from "react";

import {
  actualizarNombreUsuario,
  cambiarEstadoUsuario,
  gestionarArchivadoUsuario,
  type ResultadoAccion,
} from "./acciones";

type Props = {
  usuarioId: string;
  nombre: string;
  rol: string;
  suspendido: boolean | null;
  archivado: boolean;
  esMiCuenta: boolean;
};

const inicial: ResultadoAccion = {
  ok: false,
  mensaje: "",
};

export default function AccionesUsuario({
  usuarioId,
  nombre,
  rol,
  suspendido,
  archivado,
  esMiCuenta,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(false);

  const [
    estadoNombre,
    accionNombre,
    guardandoNombre,
  ] = useActionState(
    actualizarNombreUsuario,
    inicial
  );

  const [
    estadoCuenta,
    accionCuenta,
    cambiandoCuenta,
  ] = useActionState(
    cambiarEstadoUsuario,
    inicial
  );

  const [
    estadoArchivo,
    accionArchivo,
    cambiandoArchivo,
  ] = useActionState(
    gestionarArchivadoUsuario,
    inicial
  );

  const esAdministrador =
    rol === "administrador";

  const puedeGestionarEstado =
    !esAdministrador &&
    !esMiCuenta &&
    suspendido !== null &&
    (rol === "cliente" || rol === "entrenador");

  const operacionCuenta = suspendido
    ? "reactivar"
    : "suspender";

  const operacionArchivo = archivado
    ? "restaurar"
    : "archivar";

  function confirmarCuenta(
    evento: FormEvent<HTMLFormElement>
  ) {
    const mensaje = suspendido
      ? `¿Deseas reactivar la cuenta de ${nombre}?`
      : `¿Seguro que deseas suspender la cuenta de ${nombre}?`;

    if (!window.confirm(mensaje)) {
      evento.preventDefault();
    }
  }

  function confirmarArchivo(
    evento: FormEvent<HTMLFormElement>
  ) {
    const mensaje = archivado
      ? `¿Deseas restaurar la cuenta de ${nombre}? Volverá al estado de suspensión que tenía antes de archivarse.`
      : `¿Deseas archivar a ${nombre}? Su acceso quedará bloqueado, pero sus rutinas, sesiones e historial permanecerán guardados.`;

    if (!window.confirm(mensaje)) {
      evento.preventDefault();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200"
      >
        ⋯ Gestionar
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`titulo-usuario-${usuarioId}`}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-2xl dark:border-white/15 dark:bg-[#112039] dark:text-white sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                  Gestión de cuenta
                </p>

                <h2
                  id={`titulo-usuario-${usuarioId}`}
                  className="mt-2 break-words text-xl font-black"
                >
                  {nombre}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {rol === "administrador"
                    ? "Administrador"
                    : rol === "entrenador"
                      ? "Entrenador"
                      : rol === "cliente"
                        ? "Cliente"
                        : "Sin rol"}
                  {" · "}
                  {archivado
                    ? "Archivado"
                    : suspendido === true
                      ? "Suspendido"
                      : suspendido === false
                        ? "Activo"
                        : "Estado no disponible"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  setEditando(false);
                }}
                aria-label="Cerrar ventana"
                className="rounded-lg border border-slate-200 px-3 py-2 font-bold dark:border-white/15"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-200 pt-5 dark:border-white/10">
              {/* EDITAR NOMBRE */}

              <button
                type="button"
                onClick={() =>
                  setEditando((actual) => !actual)
                }
                className="w-full rounded-xl border border-cyan-300 px-4 py-3 text-left text-sm font-bold text-cyan-800 hover:bg-cyan-50 dark:border-cyan-400/30 dark:text-cyan-200 dark:hover:bg-cyan-400/10"
              >
                ✎{" "}
                {editando
                  ? "Cancelar edición"
                  : "Editar nombre"}
              </button>

              {editando && (
                <form
                  action={accionNombre}
                  className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-[#081526]"
                >
                  <input
                    type="hidden"
                    name="usuarioId"
                    value={usuarioId}
                  />

                  <label
                    htmlFor={`nombre-${usuarioId}`}
                    className="block text-sm font-semibold"
                  >
                    Nombre completo
                  </label>

                  <input
                    key={nombre}
                    id={`nombre-${usuarioId}`}
                    name="nombreCompleto"
                    defaultValue={nombre}
                    minLength={3}
                    maxLength={120}
                    required
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#101d31] dark:text-white"
                  />

                  <button
                    type="submit"
                    disabled={guardandoNombre}
                    className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-[#07121e] hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {guardandoNombre
                      ? "Guardando..."
                      : "Guardar nombre"}
                  </button>
                </form>
              )}

              {/* SUSPENDER O REACTIVAR */}

              {puedeGestionarEstado && !archivado && (
                <form
                  action={accionCuenta}
                  onSubmit={confirmarCuenta}
                >
                  <input
                    type="hidden"
                    name="usuarioId"
                    value={usuarioId}
                  />

                  <input
                    type="hidden"
                    name="operacion"
                    value={operacionCuenta}
                  />

                  <button
                    type="submit"
                    disabled={cambiandoCuenta}
                    className={
                      suspendido
                        ? "w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                        : "w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
                    }
                  >
                    {cambiandoCuenta
                      ? "Procesando..."
                      : suspendido
                        ? "↻ Reactivar cuenta"
                        : "⏸ Suspender cuenta"}
                  </button>
                </form>
              )}

              {/* ARCHIVAR O RESTAURAR */}

              {puedeGestionarEstado && (
                <form
                  action={accionArchivo}
                  onSubmit={confirmarArchivo}
                >
                  <input
                    type="hidden"
                    name="usuarioId"
                    value={usuarioId}
                  />

                  <input
                    type="hidden"
                    name="operacion"
                    value={operacionArchivo}
                  />

                  <button
                    type="submit"
                    disabled={cambiandoArchivo}
                    className={
                      archivado
                        ? "w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                        : "w-full rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-left text-sm font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-200"
                    }
                  >
                    {cambiandoArchivo
                      ? "Procesando..."
                      : archivado
                        ? "↻ Restaurar usuario"
                        : "▣ Archivar usuario"}
                  </button>
                </form>
              )}
            </div>

            {/* RESULTADOS */}

            {[
              estadoNombre,
              estadoCuenta,
              estadoArchivo,
            ].map((estado, indice) =>
              estado.mensaje ? (
                <p
                  key={indice}
                  role="status"
                  className={`mt-3 rounded-xl p-3 text-sm font-semibold ${
                    estado.ok
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
                  }`}
                >
                  {estado.mensaje}
                </p>
              ) : null
            )}

            {/* PROTECCIONES */}

            {esAdministrador && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Las cuentas administrativas están
                protegidas contra suspensión y archivado
                desde esta pantalla.
              </p>
            )}

            {esMiCuenta && !esAdministrador && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                No puedes suspender ni archivar
                tu propia cuenta.
              </p>
            )}

            {suspendido === null && (
              <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
                No se pudo verificar esta cuenta
                en Supabase Auth.
              </p>
            )}

            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                Archivar conserva los datos del usuario.
                No equivale a eliminarlo definitivamente.
              </p>

              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  setEditando(false);
                }}
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}