"use client";

import { useActionState, useState } from "react";

import {
  actualizarNombreUsuario,
  cambiarEstadoUsuario,
  type ResultadoAccion,
} from "./acciones";

type Props = {
  usuarioId: string;
  nombre: string;
  rol: string;
  suspendido: boolean | null;
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
  esMiCuenta,
}: Props) {
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
    cambiandoEstado,
  ] = useActionState(
    cambiarEstadoUsuario,
    inicial
  );

  const esAdministrador = rol === "administrador";

  const puedeCambiarEstado =
    !esAdministrador &&
    !esMiCuenta &&
    suspendido !== null;

  const operacion = suspendido
    ? "reactivar"
    : "suspender";

  function confirmarCambio(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    const mensaje =
      operacion === "suspender"
        ? `¿Seguro que deseas suspender la cuenta de ${nombre}?`
        : `¿Deseas reactivar la cuenta de ${nombre}?`;

    if (!window.confirm(mensaje)) {
      evento.preventDefault();
    }
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditando(!editando)}
          className="rounded-xl border border-cyan-300 px-4 py-2.5 text-sm font-bold text-cyan-800 transition hover:bg-cyan-50 dark:border-cyan-400/30 dark:text-cyan-200 dark:hover:bg-cyan-400/10"
        >
          {editando ? "Cancelar edición" : "✎ Editar nombre"}
        </button>

        {puedeCambiarEstado && (
          <form
            action={accionCuenta}
            onSubmit={confirmarCambio}
          >
            <input
              type="hidden"
              name="usuarioId"
              value={usuarioId}
            />

            <input
              type="hidden"
              name="operacion"
              value={operacion}
            />

            <button
              type="submit"
              disabled={cambiandoEstado}
              className={
                suspendido
                  ? "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  : "rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-400/10 dark:text-amber-200"
              }
            >
              {cambiandoEstado
                ? "Procesando..."
                : suspendido
                  ? "↻ Reactivar cuenta"
                  : "⏸ Suspender cuenta"}
            </button>
          </form>
        )}
      </div>

      {editando && (
        <form
          action={accionNombre}
          className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#081526]"
        >
          <input
            type="hidden"
            name="usuarioId"
            value={usuarioId}
          />

          <label
            htmlFor={`nombre-${usuarioId}`}
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
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
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#101d31] dark:text-white"
          />

          <button
            type="submit"
            disabled={guardandoNombre}
            className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-[#07121e] hover:bg-cyan-300 disabled:opacity-50"
          >
            {guardandoNombre
              ? "Guardando..."
              : "Guardar cambios"}
          </button>
        </form>
      )}

      {estadoNombre.mensaje && (
        <p
          role="status"
          className={`mt-3 text-sm font-semibold ${
            estadoNombre.ok
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-rose-600 dark:text-rose-300"
          }`}
        >
          {estadoNombre.mensaje}
        </p>
      )}

      {estadoCuenta.mensaje && (
        <p
          role="status"
          className={`mt-3 text-sm font-semibold ${
            estadoCuenta.ok
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-rose-600 dark:text-rose-300"
          }`}
        >
          {estadoCuenta.mensaje}
        </p>
      )}

      {esAdministrador && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Por seguridad, la suspensión de administradores
          está deshabilitada.
        </p>
      )}

      {esMiCuenta && !esAdministrador && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          No puedes suspender tu propia cuenta.
        </p>
      )}

      {suspendido === null && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          No se pudo verificar el estado de esta cuenta
          en Supabase Auth.
        </p>
      )}
    </div>
  );
}