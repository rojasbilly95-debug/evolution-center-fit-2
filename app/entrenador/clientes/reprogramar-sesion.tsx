"use client";

import { useState, type FormEvent } from "react";
import type { SesionResumen } from "./control-asistencia";

type Registro = {
  id: number;
  fechaAnterior: string;
  horaAnterior: string | null;
  fechaNueva: string;
  horaNueva: string;
  motivo: string;
  creadoEn: string;
};

type Props = {
  sesion: SesionResumen;
  estadoPlan: string;
  fechaInicio: string;
  fechaFin: string | null;
  onActualizada: (mensaje: string) => void;
};

function hoyLima() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function mostrarFecha(fecha: string) {
  const partes = fecha.split("-");

  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : fecha;
}

function mostrarHora(hora: string | null | undefined) {
  return hora ? hora.slice(0, 5) : "Sin hora";
}

export default function ReprogramarSesion({
  sesion,
  estadoPlan,
  fechaInicio,
  fechaFin,
  onActualizada,
}: Props) {
  const [formularioVisible, setFormularioVisible] =
    useState(false);

  const [historialVisible, setHistorialVisible] =
    useState(false);

  const [fechaNueva, setFechaNueva] = useState(
    sesion.fechaProgramada
  );

  const [horaNueva, setHoraNueva] = useState(
    sesion.horaProgramada?.slice(0, 5) ?? ""
  );

  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [cargandoHistorial, setCargandoHistorial] =
    useState(false);

  const [historial, setHistorial] = useState<Registro[]>([]);
  const [error, setError] = useState("");

  const hoy = hoyLima();

  const fechaMinima =
    fechaInicio > hoy ? fechaInicio : hoy;

  const autorizada =
    sesion.estado === "programada" &&
    sesion.fechaProgramada >= hoy &&
    ["programada", "activa"].includes(estadoPlan);

  const horaCorrecta =
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(horaNueva);

  const fechaCorrecta =
    /^\d{4}-\d{2}-\d{2}$/.test(fechaNueva) &&
    fechaNueva >= fechaMinima &&
    Boolean(fechaFin && fechaNueva <= fechaFin);

  const sinCambios =
    fechaNueva === sesion.fechaProgramada &&
    horaNueva ===
      (sesion.horaProgramada?.slice(0, 5) ?? "");

  const puedeGuardar =
    autorizada &&
    !guardando &&
    fechaCorrecta &&
    horaCorrecta &&
    motivo.trim().length >= 15 &&
    motivo.trim().length <= 500 &&
    !sinCambios;

  function abrirFormulario() {
    setFechaNueva(sesion.fechaProgramada);

    setHoraNueva(
      sesion.horaProgramada?.slice(0, 5) ?? ""
    );

    setMotivo("");
    setError("");

    setFormularioVisible((actual) => !actual);
  }

  async function cargarHistorial() {
    setCargandoHistorial(true);
    setError("");

    try {
      const respuesta = await fetch(
        `/api/sesiones/reprogramar?sesionId=${encodeURIComponent(
          String(sesion.id)
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const datos = (await respuesta.json()) as {
        error?: string;
        historial?: Registro[];
      };

      if (
        !respuesta.ok ||
        !Array.isArray(datos.historial)
      ) {
        throw new Error(
          datos.error ??
            "No se pudo consultar el historial."
        );
      }

      setHistorial(datos.historial);
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Error de consulta."
      );
    } finally {
      setCargandoHistorial(false);
    }
  }

  async function alternarHistorial() {
    if (historialVisible) {
      setHistorialVisible(false);
      return;
    }

    setHistorialVisible(true);

    await cargarHistorial();
  }

  async function guardar(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!puedeGuardar) return;

    setGuardando(true);
    setError("");

    try {
      const respuesta = await fetch(
        "/api/sesiones/reprogramar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            sesionId: sesion.id,
            fechaNueva,
            horaNueva,
            motivo: motivo.trim(),
          }),
        }
      );

      const datos = (await respuesta.json()) as {
        error?: string;
        mensaje?: string;
      };

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudo reprogramar la sesión."
        );
      }

      setFormularioVisible(false);
      setMotivo("");

      if (historialVisible) {
        await cargarHistorial();
      }

      onActualizada(
        datos.mensaje ??
          "Sesión reprogramada correctamente."
      );
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "Error de conexión."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mt-3 rounded-xl border border-cyan-300/20 bg-slate-100/60 p-3 dark:bg-[#0b172a]">

      <div className="flex flex-wrap items-center justify-between gap-2">

        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Horario de la sesión
          </p>

          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {mostrarFecha(sesion.fechaProgramada)}
            {" · "}
            {mostrarHora(sesion.horaProgramada)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          {autorizada && (
            <button
              type="button"
              onClick={abrirFormulario}
              className="min-h-10 rounded-lg border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-400/10 dark:text-cyan-300"
            >
              {formularioVisible
                ? "Cerrar formulario"
                : "Reprogramar"}
            </button>
          )}

          <button
            type="button"
            onClick={() => void alternarHistorial()}
            aria-expanded={historialVisible}
            className="min-h-10 rounded-lg border border-slate-400/30 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10"
          >
            {historialVisible
              ? "Ocultar historial"
              : "Ver historial"}
          </button>

        </div>
      </div>

      {formularioVisible && autorizada && (
        <form
          onSubmit={(evento) => void guardar(evento)}
          className="mt-4 grid gap-3 border-t border-white/10 pt-4"
        >

          <p className="text-xs text-amber-700 dark:text-amber-300">
            Solo se permiten fechas futuras dentro
            del mismo plan. El cambio quedará auditado.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">

            <label className="grid gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nueva fecha

              <input
                type="date"
                required
                value={fechaNueva}
                min={fechaMinima}
                max={fechaFin ?? undefined}
                onChange={(e) =>
                  setFechaNueva(e.target.value)
                }
                className="min-h-11 rounded-lg border border-slate-400/25 bg-white px-3 text-slate-900 dark:bg-[#071222] dark:text-white"
              />
            </label>

            <label className="grid gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nueva hora (Lima)

              <input
                type="time"
                required
                value={horaNueva}
                onChange={(e) =>
                  setHoraNueva(e.target.value)
                }
                className="min-h-11 rounded-lg border border-slate-400/25 bg-white px-3 text-slate-900 dark:bg-[#071222] dark:text-white"
              />
            </label>

          </div>

          <label className="grid gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Motivo del cambio (15 a 500 caracteres)

            <textarea
              required
              rows={3}
              minLength={15}
              maxLength={500}
              value={motivo}
              onChange={(e) =>
                setMotivo(e.target.value)
              }
              className="rounded-lg border border-slate-400/25 bg-white p-3 text-slate-900 dark:bg-[#071222] dark:text-white"
            />
          </label>

          <button
            type="submit"
            disabled={!puedeGuardar}
            className="min-h-11 w-fit rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando
              ? "Guardando cambio..."
              : "Confirmar reprogramación"}
          </button>

        </form>
      )}

      {historialVisible && (
        <div className="mt-4 border-t border-slate-400/20 pt-3">

          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Historial de reprogramaciones
          </p>

          {cargandoHistorial ? (
            <p className="mt-2 text-xs text-slate-500">
              Consultando historial...
            </p>
          ) : historial.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Esta sesión no tiene cambios registrados.
            </p>
          ) : (
            <ol className="mt-2 space-y-2">

              {historial.map((registro) => (
                <li
                  key={registro.id}
                  className="rounded-lg border border-slate-400/20 bg-white/70 p-3 text-xs dark:bg-white/[0.04]"
                >

                  <p className="font-semibold text-slate-900 dark:text-white">
                    {mostrarFecha(registro.fechaAnterior)}
                    {" "}
                    {mostrarHora(registro.horaAnterior)}
                    {" → "}
                    {mostrarFecha(registro.fechaNueva)}
                    {" "}
                    {mostrarHora(registro.horaNueva)}
                  </p>

                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {registro.motivo}
                  </p>

                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {new Date(
                      registro.creadoEn
                    ).toLocaleString("es-PE", {
                      timeZone: "America/Lima",
                    })}
                  </p>

                </li>
              ))}

            </ol>
          )}

        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

    </section>
  );
}