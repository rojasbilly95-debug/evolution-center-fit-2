
"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

// =====================================================
// EVOLUTION CENTER FIT 2.0
// FASE 114.2.6
// CALENDARIO REAL Y GESTIÓN DE HORARIOS
// =====================================================

type Vista = "dia" | "semana" | "mes";

type Sesion = {
  id: number;
  asignacion_id: number;
  numero_sesion: number;
  fecha_programada: string;
  hora_programada: string | null;
  estado: string;
  inicio_real: string | null;
  fin_real: string | null;
  duracion_real_min: number | null;
  observaciones: string | null;
  cliente_id: string | null;
  cliente_nombre: string | null;
  rutina_id: number | null;
  rutina_nombre: string | null;
  duracion_programada_min: number | null;
  frecuencia_semanal: number | null;
  plan_estado: string | null;
  plan_fecha_inicio: string | null;
  plan_fecha_fin: string | null;
};

type RespuestaCalendario = {
  modo?: string;
  total_clientes?: number;
  total_planes?: number;
  total_sesiones?: number;
  sesiones?: Sesion[];
  paginacion?: {
    pagina: number;
    limite: number;
    total_paginas: number;
  };
  error?: string;
};

type RespuestaHorario = {
  actualizada?: boolean;
  mensaje?: string;
  error?: string;
};

const DIAS = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

// =====================================================
// FUNCIONES AUXILIARES DE FECHA
// =====================================================

function fechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();

  const mes = String(
    fecha.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    fecha.getDate()
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function desdeISO(valor: string): Date {
  const [anio, mes, dia] = valor
    .split("-")
    .map(Number);

  return new Date(anio, mes - 1, dia);
}

function sumarDias(
  fecha: Date,
  cantidad: number
): Date {
  const copia = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );

  copia.setDate(
    copia.getDate() + cantidad
  );

  return copia;
}

function lunesDe(fecha: Date): Date {
  return sumarDias(
    fecha,
    -((fecha.getDay() + 6) % 7)
  );
}

function periodo(
  vista: Vista,
  fecha: Date
) {
  if (vista === "dia") {
    const dia = fechaISO(fecha);

    return {
      desde: dia,
      hasta: dia,
    };
  }

  if (vista === "semana") {
    const lunes = lunesDe(fecha);

    return {
      desde: fechaISO(lunes),
      hasta: fechaISO(
        sumarDias(lunes, 6)
      ),
    };
  }

  return {
    desde: fechaISO(
      new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        1
      )
    ),

    hasta: fechaISO(
      new Date(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        0
      )
    ),
  };
}

function mostrarFecha(
  valor: string
): string {
  return new Intl.DateTimeFormat(
    "es-PE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(desdeISO(valor));
}

// =====================================================
// FORMATO DE HORA
// =====================================================

function mostrarHora(
  valor: string | null
): string {
  if (!valor) {
    return "Horario por definir";
  }

  const [horas, minutos] = valor
    .split(":")
    .map(Number);

  if (
    !Number.isInteger(horas) ||
    !Number.isInteger(minutos) ||
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return "Horario no válido";
  }

  const periodoDia =
    horas < 12
      ? "a. m."
      : "p. m.";

  const hora12 = horas % 12 || 12;

  return `${hora12}:${String(
    minutos
  ).padStart(2, "0")} ${periodoDia}`;
}

// =====================================================
// COLORES SEGÚN ESTADO
// =====================================================

function colorEstado(
  estado: string
): string {
  switch (estado) {
    case "programada":
      return "border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300";

    case "realizada":
      return "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";

    case "ausente":
      return "border-red-500/30 bg-red-50 dark:bg-red-500/15 text-red-800 dark:text-red-300";

    case "cancelada":
      return "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300";

    default:
      return "border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300";
  }
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

function CalendarioEntrenadorContenido() {
  const [vista, setVista] =
    useState<Vista>("semana");

  const [fecha, setFecha] =
    useState(() => new Date());

  const [sesiones, setSesiones] =
    useState<Sesion[]>([]);

  const [cliente, setCliente] =
    useState("todos");

  const [seleccionada, setSeleccionada] =
    useState<Sesion | null>(null);

  // -----------------------------------------------
  // ESTADOS PARA EDITAR HORARIOS
  // -----------------------------------------------

  const [horaEdicion, setHoraEdicion] =
    useState("");

  const [
    guardandoHorario,
    setGuardandoHorario,
  ] = useState(false);

  const [
    errorHorario,
    setErrorHorario,
  ] = useState("");

  const [
    avisoHorario,
    setAvisoHorario,
  ] = useState("");

  // -----------------------------------------------
  // ESTADOS DE CONSULTA
  // -----------------------------------------------

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [recarga, setRecarga] =
    useState(0);

  const [resumen, setResumen] =
    useState({
      clientes: 0,
      planes: 0,
      sesiones: 0,
    });

  const rango = periodo(
    vista,
    fecha
  );

  // =================================================
  // CONSULTAR SESIONES REALES
  // =================================================

  useEffect(() => {
    const controlador =
      new AbortController();

    async function cargar() {
      setCargando(true);
      setError("");
      setSesiones([]);

      try {
        const registros: Sesion[] = [];

        let paginas = 1;
        let totalClientes = 0;
        let totalPlanes = 0;
        let totalSesiones = 0;

        for (
          let pagina = 1;
          pagina <= paginas;
          pagina++
        ) {
          const parametros =
            new URLSearchParams({
              desde: rango.desde,
              hasta: rango.hasta,
              pagina: String(pagina),
            });

          const respuesta = await fetch(
            `/api/entrenador/calendario?${parametros.toString()}`,
            {
              method: "GET",
              credentials: "same-origin",
              cache: "no-store",
              signal: controlador.signal,
            }
          );

          const datos =
            (await respuesta.json()) as
              RespuestaCalendario;

          if (!respuesta.ok) {
            throw new Error(
              datos.error ||
                `Error del servidor (${respuesta.status}).`
            );
          }

          if (
            datos.modo !== "real" ||
            !Array.isArray(
              datos.sesiones
            )
          ) {
            throw new Error(
              "La API no devolvió un calendario real válido."
            );
          }

          if (pagina === 1) {
            totalClientes =
              datos.total_clientes ?? 0;

            totalPlanes =
              datos.total_planes ?? 0;

            totalSesiones =
              datos.total_sesiones ?? 0;

            paginas =
              datos.paginacion
                ?.total_paginas ?? 1;

            if (paginas > 30) {
              throw new Error(
                "Hay demasiadas sesiones en este periodo. Selecciona un intervalo menor."
              );
            }
          }

          registros.push(
            ...datos.sesiones
          );
        }

        if (
          !controlador.signal.aborted
        ) {
          setSesiones(registros);

          setResumen({
            clientes: totalClientes,
            planes: totalPlanes,
            sesiones: totalSesiones,
          });
        }
      } catch (fallo) {
        if (
          !controlador.signal.aborted
        ) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo consultar el calendario."
          );
        }
      } finally {
        if (
          !controlador.signal.aborted
        ) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => {
      controlador.abort();
    };
  }, [
    rango.desde,
    rango.hasta,
    recarga,
  ]);

  // =================================================
  // LISTA DE CLIENTES
  // =================================================

  const clientes = useMemo(() => {
    const mapa = new Map<
      string,
      string
    >();

    for (const sesion of sesiones) {
      if (sesion.cliente_id) {
        mapa.set(
          sesion.cliente_id,
          sesion.cliente_nombre ||
            "Cliente sin nombre"
        );
      }
    }

    return Array.from(
      mapa,
      ([id, nombre]) => ({
        id,
        nombre,
      })
    ).sort((a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es"
      )
    );
  }, [sesiones]);

  // =================================================
  // FILTRAR SESIONES POR CLIENTE
  // =================================================

  const filtradas = useMemo(
    () =>
      sesiones.filter(
        (sesion) =>
          cliente === "todos" ||
          sesion.cliente_id === cliente
      ),
    [sesiones, cliente]
  );

  // =================================================
  // AGRUPAR Y ORDENAR POR HORARIO
  // =================================================

  const porFecha = useMemo(() => {
    const mapa = new Map<
      string,
      Sesion[]
    >();

    for (const sesion of filtradas) {
      const lista =
        mapa.get(
          sesion.fecha_programada
        ) ?? [];

      lista.push(sesion);

      mapa.set(
        sesion.fecha_programada,
        lista
      );
    }

    // Mostrar primero las sesiones
    // con horario asignado.
    // Las sesiones sin hora van al final.

    for (const lista of mapa.values()) {
      lista.sort((a, b) => {
        const horaA =
          a.hora_programada ??
          "99:99";

        const horaB =
          b.hora_programada ??
          "99:99";

        const diferencia =
          horaA.localeCompare(
            horaB
          );

        return diferencia !== 0
          ? diferencia
          : a.numero_sesion -
              b.numero_sesion;
      });
    }

    return mapa;
  }, [filtradas]);

  // =================================================
  // GENERAR DÍAS DEL CALENDARIO
  // =================================================

  const diasCalendario =
    useMemo(() => {
      if (vista === "dia") {
        return [fecha];
      }

      if (vista === "semana") {
        const lunes = lunesDe(
          fecha
        );

        return Array.from(
          { length: 7 },
          (_, indice) =>
            sumarDias(
              lunes,
              indice
            )
        );
      }

      const primero =
        new Date(
          fecha.getFullYear(),
          fecha.getMonth(),
          1
        );

      const inicio =
        lunesDe(primero);

      return Array.from(
        { length: 42 },
        (_, indice) =>
          sumarDias(
            inicio,
            indice
          )
      );
    }, [
      vista,
      fecha,
    ]);

  // =================================================
  // TÍTULO DEL PERIODO
  // =================================================

  const etiquetaPeriodo =
    vista === "mes"
      ? new Intl.DateTimeFormat(
          "es-PE",
          {
            month: "long",
            year: "numeric",
          }
        ).format(fecha)
      : vista === "semana"
        ? `${mostrarFecha(
            rango.desde
          )} — ${mostrarFecha(
            rango.hasta
          )}`
        : mostrarFecha(
            rango.desde
          );

  // =================================================
  // VALIDAR ESTADO DE SESIÓN
  // =================================================

  const puedeEditarHorario =
    seleccionada?.estado ===
      "programada" &&
    (
      seleccionada.plan_estado ===
        "programada" ||
      seleccionada.plan_estado ===
        "activa"
    ) &&
    seleccionada.inicio_real ===
      null &&
    seleccionada.fin_real ===
      null &&
    seleccionada.duracion_real_min ===
      null;

  // =================================================
  // ABRIR DETALLE
  // =================================================

  function abrirDetalleSesion(
    sesion: Sesion
  ) {
    if (guardandoHorario) {
      return;
    }

    setSeleccionada(sesion);

    setHoraEdicion(
      sesion.hora_programada
        ?.slice(0, 5) ?? ""
    );

    setErrorHorario("");
    setAvisoHorario("");
  }

  function cerrarDetalle() {
    if (guardandoHorario) {
      return;
    }

    setSeleccionada(null);
    setErrorHorario("");
  }

  // =================================================
  // GUARDAR HORARIO EN SUPABASE
  // =================================================

  async function guardarHorario() {
    if (
      !seleccionada ||
      guardandoHorario
    ) {
      return;
    }

    if (!puedeEditarHorario) {
      setErrorHorario(
        "Esta sesión no permite modificar horarios."
      );

      return;
    }

    const horaValida =
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
        horaEdicion
      );

    if (!horaValida) {
      setErrorHorario(
        "Selecciona una hora válida (HH:mm)."
      );

      return;
    }

    setGuardandoHorario(true);
    setErrorHorario("");

    try {
      const respuesta = await fetch(
        "/api/sesiones/horario",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials:
            "same-origin",

          cache: "no-store",

          body: JSON.stringify({
            sesionId:
              seleccionada.id,

            horaProgramada:
              horaEdicion,
          }),
        }
      );

      const datos =
        (await respuesta
          .json()
          .catch(
            () => ({})
          )) as RespuestaHorario;

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudo guardar el horario."
        );
      }

      if (
        datos.actualizada !== true
      ) {
        throw new Error(
          "El servidor no confirmó la actualización."
        );
      }

      // Cerrar detalle.
      setSeleccionada(null);

      // Confirmar actualización.
      setAvisoHorario(
        datos.mensaje ||
          "Horario actualizado correctamente."
      );

      // Volver a consultar Supabase.
      setRecarga(
        (valor) => valor + 1
      );
    } catch (fallo) {
      setErrorHorario(
        fallo instanceof Error
          ? fallo.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setGuardandoHorario(false);
    }
  }

  // =================================================
  // NAVEGACIÓN DEL CALENDARIO
  // =================================================

  function mover(
    cantidad: number
  ) {
    if (vista === "mes") {
      setFecha(
        new Date(
          fecha.getFullYear(),
          fecha.getMonth() +
            cantidad,
          1
        )
      );
    } else {
      setFecha(
        sumarDias(
          fecha,
          cantidad *
            (vista === "semana"
              ? 7
              : 1)
        )
      );
    }

    setCliente("todos");
    setSeleccionada(null);
  }

  function cambiarVista(
    nueva: Vista
  ) {
    setVista(nueva);
    setCliente("todos");
    setSeleccionada(null);
  }

  // =================================================
  // TARJETA DE SESIÓN
  // =================================================

  function tarjetaSesion(
    sesion: Sesion
  ) {
    return (
      <button
        type="button"
        key={sesion.id}
        onClick={() =>
          abrirDetalleSesion(sesion)
        }
        className="w-full rounded-xl border border-cyan-500/20 bg-slate-50 dark:bg-[#172b40] p-3 text-left transition hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-[#1b3650]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300">
            Sesión{" "}
            {sesion.numero_sesion}
          </span>

          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] ${colorEstado(
              sesion.estado
            )}`}
          >
            {sesion.estado}
          </span>
        </div>

        <p className="mt-2 break-words text-sm font-semibold text-[var(--ecf-text,#102238)] dark:text-white">
          {sesion.cliente_nombre ||
            "Cliente"}
        </p>

        <p className="mt-2 text-xs font-semibold text-cyan-800 dark:text-cyan-300">
          ◷{" "}
          {mostrarHora(
            sesion.hora_programada
          )}
        </p>

        <p className="mt-2 break-words text-xs text-slate-700 dark:text-slate-300">
          {sesion.rutina_nombre ||
            "Rutina asignada"}
        </p>

        <p className="mt-2 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
          {sesion.duracion_programada_min !=
          null
            ? `${sesion.duracion_programada_min} minutos previstos`
            : "Duración no disponible"}
        </p>
      </button>
    );
  }

  // =================================================
  // INTERFAZ PRINCIPAL
  // =================================================

  return (
    <main className="min-h-screen bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] px-4 py-7 text-[var(--ecf-text,#102238)] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ENCABEZADO */}

        <header>
          <Link
            href="/entrenador"
            className="text-sm font-medium text-cyan-800 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-cyan-200"
          >
            ← Volver al panel del entrenador
          </Link>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-800 dark:text-cyan-300">
                Gestión de entrenamientos
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Calendario de entrenamiento
              </h1>

              <p className="mt-3 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                Sesiones programadas,
                clientes, rutinas y horarios
                del gimnasio.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setRecarga(
                  (valor) =>
                    valor + 1
                )
              }
              disabled={cargando}
              className="rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-slate-50 dark:bg-[#14233a] px-5 py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-[#1d304c] disabled:opacity-50"
            >
              {cargando
                ? "Cargando..."
                : "↻ Actualizar"}
            </button>
          </div>
        </header>

        {/* CONFIRMACIÓN DE HORARIOS */}

        {avisoHorario && (
          <div
            role="status"
            className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4"
          >
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Horario actualizado correctamente
              </p>

              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                {avisoHorario}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAvisoHorario("")
              }
              className="rounded-lg px-3 py-2 text-emerald-800 dark:text-emerald-300 hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label="Cerrar confirmación"
            >
              ✕
            </button>
          </div>
        )}

        {/* INDICADORES REALES */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            [
              "Clientes asignados",
              resumen.clientes,
            ],
            [
              "Planes asociados",
              resumen.planes,
            ],
            [
              "Sesiones del periodo",
              resumen.sesiones,
            ],
            [
              "Sesiones filtradas",
              filtradas.length,
            ],
          ].map(
            ([titulo, valor]) => (
              <article
                key={titulo}
                className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-5"
              >
                <p className="text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  {titulo}
                </p>

                <p className="mt-3 text-3xl font-extrabold tabular-nums">
                  {valor}
                </p>
              </article>
            )
          )}
        </section>

        {/* CONTROLES DEL CALENDARIO */}

        <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-5">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    mover(-1)
                  }
                  className="rounded-lg bg-slate-100 dark:bg-white/10 px-3 py-2 hover:bg-slate-200 dark:hover:bg-white/20"
                  aria-label="Periodo anterior"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFecha(
                      new Date()
                    );

                    setCliente(
                      "todos"
                    );
                  }}
                  className="rounded-lg bg-slate-100 dark:bg-white/10 px-4 py-2 text-sm hover:bg-slate-200 dark:hover:bg-white/20"
                >
                  Hoy
                </button>

                <button
                  type="button"
                  onClick={() =>
                    mover(1)
                  }
                  className="rounded-lg bg-slate-100 dark:bg-white/10 px-3 py-2 hover:bg-slate-200 dark:hover:bg-white/20"
                  aria-label="Periodo siguiente"
                >
                  →
                </button>
              </div>

              <h2 className="mt-4 text-lg font-bold capitalize">
                {etiquetaPeriodo}
              </h2>
            </div>

            <div className="flex gap-2">
              {(
                [
                  "dia",
                  "semana",
                  "mes",
                ] as Vista[]
              ).map(
                (opcion) => (
                  <button
                    type="button"
                    key={opcion}
                    onClick={() =>
                      cambiarVista(
                        opcion
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      vista === opcion
                        ? "bg-cyan-400 text-[#07121e]"
                        : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20"
                    }`}
                  >
                    {opcion === "dia"
                      ? "Día"
                      : opcion ===
                          "semana"
                        ? "Semana"
                        : "Mes"}
                  </button>
                )
              )}
            </div>
          </div>

          {/* FILTROS */}

          <div className="mt-6 grid gap-4 border-t border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pt-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cliente-calendario"
                className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Filtrar por cliente
              </label>

              <select
                id="cliente-calendario"
                value={cliente}
                onChange={(
                  evento
                ) =>
                  setCliente(
                    evento.target.value
                  )
                }
                className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#0b1526] px-4 py-3 text-sm"
              >
                <option value="todos">
                  Todos los clientes
                </option>

                {clientes.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.nombre}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="fecha-calendario"
                className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Ir a una fecha
              </label>

              <input
                id="fecha-calendario"
                type="date"
                value={fechaISO(
                  fecha
                )}
                onChange={(
                  evento
                ) => {
                  if (
                    evento.target.value
                  ) {
                    setFecha(
                      desdeISO(
                        evento.target.value
                      )
                    );

                    setCliente(
                      "todos"
                    );
                  }
                }}
                className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#0b1526] px-4 py-3 text-sm"
              />
            </div>
          </div>
        </section>

        {/* AGENDA DE SESIONES */}

        <section className="rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">
              Agenda de sesiones
            </h2>

            <span className="text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              {filtradas.length}{" "}
              sesiones en la vista
            </span>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-500/10 p-5"
            >
              <p className="font-bold text-red-800 dark:text-red-300">
                No se pudo cargar el calendario.
              </p>

              <p className="mt-2 text-sm text-red-800 dark:text-red-200">
                {error}
              </p>

              <Link
                href="/login"
                className="mt-3 inline-block text-sm text-cyan-800 dark:text-cyan-300 underline"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          ) : cargando ? (
            <div className="py-20 text-center text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Consultando sesiones reales...
            </div>
          ) : vista === "dia" ? (
            // VISTA DIARIA

            <div className="space-y-3">
              {(
                porFecha.get(
                  fechaISO(fecha)
                ) ?? []
              ).length === 0 ? (
                <p className="py-14 text-center text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                  No hay sesiones registradas
                  para esta fecha.
                </p>
              ) : (
                (
                  porFecha.get(
                    fechaISO(fecha)
                  ) ?? []
                ).map(
                  tarjetaSesion
                )
              )}
            </div>
          ) : (
            // VISTAS SEMANAL Y MENSUAL

            <div className="overflow-x-auto">
              <div
                className={`grid gap-2 ${
                  vista ===
                  "semana"
                    ? "min-w-[1050px] grid-cols-7"
                    : "min-w-[750px] grid-cols-7"
                }`}
              >
                {DIAS.map(
                  (dia) => (
                    <div
                      key={dia}
                      className="py-2 text-center text-xs font-bold text-[var(--ecf-muted,#64748b)] dark:text-slate-400"
                    >
                      {dia}
                    </div>
                  )
                )}

                {diasCalendario.map(
                  (dia) => {
                    const clave =
                      fechaISO(
                        dia
                      );

                    const lista =
                      porFecha.get(
                        clave
                      ) ?? [];

                    const otroMes =
                      vista ===
                        "mes" &&
                      dia.getMonth() !==
                        fecha.getMonth();

                    return (
                      <div
                        key={
                          clave
                        }
                        className={`rounded-xl border p-2 ${
                          vista ===
                          "semana"
                            ? "min-h-[340px]"
                            : "min-h-[135px]"
                        } ${
                          otroMes
                            ? "border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#0b1422] opacity-50"
                            : "border-[var(--ecf-border,#dce5ee)] dark:border-white/10 bg-white dark:bg-[#0c1728]"
                        }`}
                      >
                        {/* NÚMERO DEL DÍA */}

                        <button
                          type="button"
                          onClick={() => {
                            setFecha(
                              dia
                            );

                            setVista(
                              "dia"
                            );

                            setCliente(
                              "todos"
                            );
                          }}
                          className="mb-3 rounded-lg px-2 py-1 text-sm font-bold hover:bg-slate-100 dark:hover:bg-white/10"
                        >
                          {dia.getDate()}
                        </button>

                        {/* SESIONES SEMANALES */}

                        {vista ===
                        "semana" ? (
                          <div className="space-y-2">
                            {lista.length ===
                            0 ? (
                              <p className="text-xs text-slate-500 dark:text-slate-600">
                                Sin sesiones
                              </p>
                            ) : (
                              lista.map(
                                tarjetaSesion
                              )
                            )}
                          </div>
                        ) : (
                          // SESIONES MENSUALES

                          <div className="space-y-1">
                            {lista
                              .slice(
                                0,
                                3
                              )
                              .map(
                                (
                                  sesion
                                ) => (
                                  <button
                                    key={
                                      sesion.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      abrirDetalleSesion(
                                        sesion
                                      )
                                    }
                                    className="block w-full rounded-md bg-cyan-100 dark:bg-cyan-500/15 p-2 text-left text-[11px] text-cyan-800 dark:text-cyan-200 transition hover:bg-cyan-200 dark:hover:bg-cyan-500/25"
                                  >
                                    <span className="block truncate font-semibold">
                                      {sesion.cliente_nombre ||
                                        "Cliente"}
                                    </span>

                                    <span className="mt-1 block truncate text-[10px] text-cyan-800/80 dark:text-cyan-300/80">
                                      {sesion.hora_programada
                                        ? mostrarHora(
                                            sesion.hora_programada
                                          )
                                        : "Sin horario"}
                                    </span>
                                  </button>
                                )
                              )}

                            {/* VER MÁS SESIONES */}

                            {lista.length >
                              3 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFecha(
                                    dia
                                  );

                                  setVista(
                                    "dia"
                                  );

                                  setCliente(
                                    "todos"
                                  );
                                }}
                                className="text-left text-[11px] text-cyan-800 dark:text-cyan-300 hover:underline"
                              >
                                +
                                {lista.length -
                                  3}{" "}
                                sesiones ·
                                Ver todas
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </section>

        {/* INFORMACIÓN DEL CALENDARIO */}

        <footer className="rounded-xl border border-cyan-500/20 bg-cyan-50 dark:bg-cyan-500/5 p-4 text-sm text-slate-700 dark:text-slate-300">
          Este calendario permite consultar
          y administrar los horarios de las
          sesiones reales del gimnasio.

          Los cambios requieren autorización
          y están sujetos a las restricciones
          del plan y la disponibilidad del
          entrenador y del cliente.

          La asistencia y el cumplimiento se
          registran en los módulos de
          seguimiento correspondientes.
        </footer>
      </div>

      {/* ============================================
          MODAL DE DETALLE DE SESIÓN
      ============================================ */}

      {seleccionada && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalle-sesion"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-[var(--ecf-surface,#ffffff)] dark:bg-[#111d31] p-6 shadow-2xl"
          >
            {/* ENCABEZADO DEL MODAL */}

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-cyan-800 dark:text-cyan-300">
                  Detalle del entrenamiento
                </p>

                <h2
                  id="titulo-detalle-sesion"
                  className="mt-2 text-2xl font-bold"
                >
                  Sesión{" "}
                  {
                    seleccionada.numero_sesion
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  cerrarDetalle
                }
                disabled={
                  guardandoHorario
                }
                className="rounded-lg bg-slate-100 dark:bg-white/10 px-3 py-2 hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-50"
                aria-label="Cerrar detalle"
              >
                ✕
              </button>
            </div>

            {/* DATOS DE LA SESIÓN */}

            <dl className="mt-6 space-y-4 text-sm">
              {[
                [
                  "Cliente",
                  seleccionada.cliente_nombre,
                ],
                [
                  "Fecha",
                  mostrarFecha(
                    seleccionada.fecha_programada
                  ),
                ],
                [
                  "Hora programada",
                  mostrarHora(
                    seleccionada.hora_programada
                  ),
                ],
                [
                  "Rutina",
                  seleccionada.rutina_nombre,
                ],
                [
                  "Estado",
                  seleccionada.estado,
                ],
                [
                  "Duración programada",
                  seleccionada.duracion_programada_min !=
                  null
                    ? `${seleccionada.duracion_programada_min} minutos`
                    : null,
                ],
                [
                  "Duración realizada",
                  seleccionada.duracion_real_min !=
                  null
                    ? `${seleccionada.duracion_real_min} minutos`
                    : null,
                ],
                [
                  "Estado del plan",
                  seleccionada.plan_estado,
                ],
                [
                  "Observaciones",
                  seleccionada.observaciones,
                ],
              ].map(
                ([titulo, valor]) => (
                  <div
                    key={titulo}
                    className="flex justify-between gap-5 border-b border-[var(--ecf-border,#dce5ee)] dark:border-white/10 pb-3"
                  >
                    <dt className="text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                      {titulo}
                    </dt>

                    <dd className="max-w-[60%] text-right font-medium">
                      {valor ||
                        "No registrado"}
                    </dd>
                  </div>
                )
              )}
            </dl>

            {/* =====================================
                FORMULARIO DE HORARIOS REALES
            ===================================== */}

            <section className="mt-6 rounded-xl border border-cyan-500/20 bg-slate-50 dark:bg-[#0b1728] p-5">
              <h3 className="text-base font-bold text-[var(--ecf-text,#102238)] dark:text-white">
                Programación del horario
              </h3>

              <p className="mt-2 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                Selecciona la hora de
                inicio del entrenamiento.
                Zona horaria: Lima, Perú.
              </p>

              {/* SELECTOR DE HORA */}

              <div className="mt-5">
                <label
                  htmlFor="hora-entrenamiento"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Hora de inicio
                </label>

                <input
                  id="hora-entrenamiento"
                  type="time"
                  value={
                    horaEdicion
                  }
                  onChange={(
                    evento
                  ) => {
                    setHoraEdicion(
                      evento.target.value
                    );

                    setErrorHorario(
                      ""
                    );
                  }}
                  disabled={
                    !puedeEditarHorario ||
                    guardandoHorario
                  }
                  className="w-full rounded-xl border border-[var(--ecf-border,#dce5ee)] dark:border-white/15 bg-white dark:bg-[#101f34] px-4 py-3 text-[var(--ecf-text,#102238)] dark:text-white outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* DURACIÓN PROGRAMADA */}

              <p className="mt-3 text-xs text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
                Duración prevista:{" "}
                {seleccionada.duracion_programada_min !=
                null
                  ? `${seleccionada.duracion_programada_min} minutos`
                  : "No disponible"}
              </p>

              {/* ESTADO NO PERMITIDO */}

              {!puedeEditarHorario && (
                <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                  Esta sesión no permite
                  modificar su horario.
                  Revisa el estado del plan
                  y los registros de ejecución.
                </p>
              )}

              {/* ERROR DE PROGRAMACIÓN */}

              {errorHorario && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-300"
                >
                  {errorHorario}
                </div>
              )}

              {/* BOTÓN GUARDAR */}

              <button
                type="button"
                onClick={() =>
                  void guardarHorario()
                }
                disabled={
                  !puedeEditarHorario ||
                  guardandoHorario ||
                  !horaEdicion
                }
                className="mt-5 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#07121e] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardandoHorario
                  ? "Guardando horario..."
                  : seleccionada.hora_programada
                    ? "Actualizar horario"
                    : "Asignar horario"}
              </button>

              <p className="mt-3 text-center text-xs text-slate-600 dark:text-slate-500">
                El servidor verificará
                los permisos, las fechas
                y los conflictos antes
                de guardar los cambios.
              </p>
            </section>

            {/* ACCESO AL SEGUIMIENTO */}

            {seleccionada.cliente_id && (
              <Link
                href={`/entrenador/clientes/${seleccionada.cliente_id}/seguimiento`}
                className="mt-6 block rounded-xl bg-cyan-400 px-5 py-3 text-center text-sm font-bold text-[#07121e] hover:bg-cyan-300"
              >
                Abrir seguimiento del cliente →
              </Link>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

// =====================================================
// NEXT.JS 16 — PROTECCIÓN DE PRERENDERIZADO
// =====================================================

export default function CalendarioEntrenadorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--ecf-bg,#f4f8fc)] dark:bg-[#080d1a] px-6 text-[var(--ecf-text,#102238)] dark:text-white">
          <div className="text-center">
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

            <h1 className="text-xl font-bold">
              Evolution Center Fit 2.0
            </h1>

            <p className="mt-3 text-sm text-[var(--ecf-muted,#64748b)] dark:text-slate-400">
              Preparando calendario
              de entrenamiento...
            </p>
          </div>
        </main>
      }
    >
      <CalendarioEntrenadorContenido />
    </Suspense>
  );
}
