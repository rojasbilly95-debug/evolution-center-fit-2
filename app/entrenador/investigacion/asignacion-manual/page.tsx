"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ESTUDIO } from "@/lib/investigacion/calendario-estudio";

type Cliente = {
  clienteId: string;
  nombre: string;
  grupoEstudio: "GE" | "GC" | null;
  fechaInicio: string | null;
  fechaFin: string | null;
};

type Rutina = {
  id: number;
  nombre: string;
  nivel: string;
  duracion_min: number;
};

function sumarDias(fecha: string, dias: number) {
  return new Date(
    Date.parse(`${fecha}T00:00:00.000Z`) + dias * 86400000
  ).toISOString().slice(0, 10);
}

export default function AsignacionManualPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [rutinaId, setRutinaId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargar() {
      try {
        const [rc, rr] = await Promise.all([
          fetch("/api/investigacion/participantes", {
            cache: "no-store",
          }),
          fetch("/api/investigacion/asignacion-manual", {
            cache: "no-store",
          }),
        ]);

        const clientesJson = await rc.json();
        const rutinasJson = await rr.json();

        if (!rc.ok || !rr.ok) {
          throw new Error(
            clientesJson.error ??
            rutinasJson.error ??
            "No se pudieron cargar los datos."
          );
        }

        setClientes(
          (clientesJson.clientes ?? []).filter(
            (c: Cliente) => c.grupoEstudio !== null
          )
        );

        setRutinas(rutinasJson.rutinas ?? []);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Error al cargar."
        );
      } finally {
        setCargando(false);
      }
    }

    void cargar();
  }, []);

  const seleccionado = clientes.find(
    (c) => c.clienteId === clienteId
  );

  const limite =
    seleccionado?.grupoEstudio === "GE" &&
    fechaInicio &&
    fechaInicio < ESTUDIO.inicioIntervencion
      ? ESTUDIO.finPretest
      : ESTUDIO.fin;

  const intervaloGEInvalido =
    seleccionado?.grupoEstudio === "GE" &&
    fechaInicio >= ESTUDIO.inicioIntervencion &&
    fechaInicio <= ESTUDIO.finIntervencion;

    async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    try {
      const respuesta = await fetch(
        "/api/investigacion/asignacion-manual",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clienteId,
            rutinaId: Number(rutinaId),
            fechaInicio,
            fechaFin: fechaFin || null,
            notas,
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ?? "No se pudo asignar la rutina."
        );
      }

      setMensaje("Rutina asignada correctamente sin IA.");
      setRutinaId("");
      setNotas("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error inesperado."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#080d1a] dark:text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/entrenador/investigacion"
          className="text-sm font-medium text-blue-700 hover:underline dark:text-cyan-300"
        >
          Volver al panel de investigación
        </Link>

        <header>
          <p className="text-sm font-semibold text-blue-700 dark:text-cyan-300">
            EVOLUTION CENTER FIT 2.0
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Asignación manual de rutinas
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Entrenamiento habitual para el grupo control
            y los periodos pretest y postest del grupo experimental.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#111d31] dark:shadow-black/20">
          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:border dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200">
              {error}
            </p>
          )}

          {mensaje && (
            <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:border dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
              {mensaje}
            </p>
          )}

          {cargando ? (
            <p>Cargando datos...</p>
          ) : (
            <form onSubmit={guardar} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="cliente">
                  Participante
                </label>
                <select
                  id="cliente"
                  required
                  value={clienteId}
                  onChange={(e) => {
                    setClienteId(e.target.value);
                    setFechaInicio("");
                    setFechaFin("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#0b1628] dark:text-white dark:focus:border-cyan-400"
                >
                  <option value="">Seleccionar participante</option>
                  {clientes.map((c) => (
                    <option key={c.clienteId} value={c.clienteId}>
                      {c.nombre} - {c.grupoEstudio}
                    </option>
                  ))}
                </select>
              </div>

              {seleccionado && (
                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900 dark:border dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                  <p>Grupo: {seleccionado.grupoEstudio}</p>
                  <p>Inicio del estudio: {seleccionado.fechaInicio}</p>
                  <p>Último día permitido: {limite}</p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="rutina">
                  Rutina
                </label>
                <select
                  id="rutina"
                  required
                  value={rutinaId}
                  onChange={(e) => setRutinaId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#0b1628] dark:text-white dark:focus:border-cyan-400"
                >
                  <option value="">Seleccionar rutina</option>
                  {rutinas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} - {r.nivel} - {r.duracion_min} min
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="inicio">
                    Fecha de inicio
                  </label>
                  <input
                    id="inicio"
                    type="date"
                    required
                    min={seleccionado?.fechaInicio ?? undefined}
                    max={limite ?? undefined}
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#0b1628] dark:text-white dark:focus:border-cyan-400 dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="fin">
                    Fecha de fin (opcional)
                  </label>
                  <input
                    id="fin"
                    type="date"
                    min={fechaInicio || seleccionado?.fechaInicio || undefined}
                    max={limite ?? undefined}
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#0b1628] dark:text-white dark:focus:border-cyan-400 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="notas">
                  Observaciones
                </label>
                <textarea
                  id="notas"
                  rows={3}
                  maxLength={1000}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-cyan-500 dark:border-white/15 dark:bg-[#0b1628] dark:text-white dark:focus:border-cyan-400"
                  placeholder="Indicaciones del entrenador..."
                />
              </div>

              <button
                type="submit"
                disabled={guardando || !clienteId || !rutinaId || !fechaInicio || Boolean(intervaloGEInvalido)}
                className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
              >
                {guardando ? "Guardando..." : "Asignar rutina sin IA"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
