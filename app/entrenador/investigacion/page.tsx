
"use client";

import { useCallback, useEffect, useState } from "react";

type Grupo = "GE" | "GC";

type Cliente = {
  clienteId: string;
  nombre: string;
  grupoEstudio: Grupo | null;
  fechaInicio: string | null;
  fechaFin: string | null;
};

export default function InvestigacionPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const [clienteId, setClienteId] = useState("");
  const [grupo, setGrupo] = useState<Grupo>("GE");
  const [fechaInicio, setFechaInicio] = useState("");

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(
        "/api/investigacion/participantes",
        { cache: "no-store" }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ?? "No se pudieron consultar los clientes."
        );
      }

      setClientes(datos.clientes ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarClientes();
  }, [cargarClientes]);

  const registrados = clientes.filter(
    (cliente) => cliente.grupoEstudio !== null
  );

  const disponibles = clientes.filter(
    (cliente) => cliente.grupoEstudio === null
  );

  const totalGE = registrados.filter(
    (cliente) => cliente.grupoEstudio === "GE"
  ).length;

  const totalGC = registrados.filter(
    (cliente) => cliente.grupoEstudio === "GC"
  ).length;

  async function registrarParticipante(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!clienteId || !fechaInicio) {
      setError("Selecciona un cliente y una fecha de inicio.");
      return;
    }

    setGuardando(true);
    setError("");
    setExito("");

    try {
      const respuesta = await fetch(
        "/api/investigacion/participantes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clienteId,
            grupoEstudio: grupo,
            fechaInicio,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ?? "No se pudo registrar al participante."
        );
      }

      setExito("Participante registrado correctamente.");
      setClienteId("");
      setFechaInicio("");
      setGrupo("GE");

      await cargarClientes();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error inesperado al registrar."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* ENCABEZADO */}
        <header className="space-y-2">
          <div className="text-sm font-semibold text-blue-700">
            EVOLUTION CENTER FIT 2.0
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Panel de investigación
          </h1>

          <p className="max-w-3xl text-sm text-slate-600">
            Administración de participantes para el estudio
            sobre la adherencia al plan de entrenamiento.
          </p>

          <a
            href="/entrenador"
            className="inline-block text-sm font-medium text-blue-700 hover:underline"
          >
            ← Volver al panel del entrenador
          </a>
        </header>

        {/* INDICADORES */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              titulo: "Participantes registrados",
              valor: registrados.length,
              color: "text-slate-900",
            },
            {
              titulo: "Grupo experimental (GE)",
              valor: totalGE,
              color: "text-blue-700",
            },
            {
              titulo: "Grupo control (GC)",
              valor: totalGC,
              color: "text-emerald-700",
            },
          ].map((indicador) => (
            <div
              key={indicador.titulo}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-slate-500">
                {indicador.titulo}
              </p>

              <p
                className={`mt-2 text-4xl font-bold ${indicador.color}`}
              >
                {indicador.valor}
              </p>
            </div>
          ))}
        </section>

        {/* MENSAJES */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {exito && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {exito}
          </div>
        )}

        {/* REGISTRO */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Registrar participante
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Asigna un cliente a uno de los grupos del estudio.
            El grupo no podrá modificarse desde este formulario.
          </p>

          <form
            onSubmit={registrarParticipante}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            <div className="space-y-2">
              <label
                htmlFor="cliente"
                className="block text-sm font-semibold"
              >
                Cliente
              </label>

              <select
                id="cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                disabled={cargando || guardando}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              >
                <option value="">
                  Seleccionar cliente
                </option>

                {disponibles.map((cliente) => (
                  <option
                    key={cliente.clienteId}
                    value={cliente.clienteId}
                  >
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="grupo"
                className="block text-sm font-semibold"
              >
                Grupo de investigación
              </label>

              <select
                id="grupo"
                value={grupo}
                onChange={(e) =>
                  setGrupo(e.target.value as Grupo)
                }
                disabled={guardando}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              >
                <option value="GE">
                  GE - Grupo experimental
                </option>
                <option value="GC">
                  GC - Grupo control
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="fecha"
                className="block text-sm font-semibold"
              >
                Fecha de inicio del estudio
              </label>

              <input
                id="fecha"
                type="date"
                value={fechaInicio}
                onChange={(e) =>
                  setFechaInicio(e.target.value)
                }
                required
                disabled={guardando}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              />

              <p className="text-xs text-slate-500">
                Desde esta fecha se calcularán las 12 semanas.
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  guardando ||
                  cargando ||
                  !clienteId ||
                  !fechaInicio
                }
                className="w-full rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando
                  ? "Registrando..."
                  : "Registrar participante"}
              </button>
            </div>
          </form>
        </section>

        {/* INFORMACION METODOLOGICA */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="font-bold text-blue-900">
              Grupo experimental (GE)
            </h3>
            <p className="mt-2 text-sm text-blue-800">
              Recibirá recomendaciones inteligentes de rutinas
              durante la intervención, después del pretest.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="font-bold text-emerald-900">
              Grupo control (GC)
            </h3>
            <p className="mt-2 text-sm text-emerald-800">
              Continuará con el procedimiento habitual
              de asignación de rutinas, sin utilizar el
              motor de recomendación inteligente.
            </p>
          </div>
        </section>

        {/* TABLA */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold">
              Participantes del estudio
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Clientes registrados y su clasificación.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Grupo</th>
                  <th className="p-4">Inicio</th>
                  <th className="p-4">Fin</th>
                  <th className="p-4">Estado</th>
                </tr>
              </thead>

              <tbody>
                {registrados.map((cliente) => (
                  <tr
                    key={cliente.clienteId}
                    className="border-t border-slate-100"
                  >
                    <td className="p-4 font-medium">
                      {cliente.nombre}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          cliente.grupoEstudio === "GE"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {cliente.grupoEstudio}
                      </span>
                    </td>

                    <td className="p-4">
                      {cliente.fechaInicio}
                    </td>

                    <td className="p-4">
                      {cliente.fechaFin}
                    </td>

                    <td className="p-4 text-emerald-700">
                      Registrado
                    </td>
                  </tr>
                ))}

                {!cargando && registrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-500"
                    >
                      Todavía no hay participantes registrados.
                    </td>
                  </tr>
                )}

                {cargando && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-500"
                    >
                      Cargando participantes...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
