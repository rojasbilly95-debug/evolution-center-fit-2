
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ControlAsistencia, {
  type SesionResumen,
} from "./control-asistencia";

import RegistroEjercicios from "./registro-ejercicios";
import ResumenCumplimiento from "./resumen-cumplimiento";
import ResumenAdherencia from "./resumen-adherencia";

// ============================================
// EVOLUTION CENTER FIT 2.0
// PASO 65.9
// PROGRAMACION, ASISTENCIA, EJERCICIOS
// Y ADHERENCIA DEL PLAN
// ============================================

// ============================================
// 1. TIPOS
// ============================================

type Plan = {
  id: number;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  frecuenciaSemanal: number;
  nombreRutina: string;
};

type RespuestaConsulta = {
  error?: string;
  plan?: Plan;
  sesiones?: SesionResumen[];
};

type RespuestaProgramacion = {
  error?: string;
  mensaje?: string;
  creadas?: number;
  total?: number;
  yaProgramadas?: boolean;
};

type EstadoConsulta = {
  cargando: boolean;
  error: string;
  plan: Plan | null;
  sesiones: SesionResumen[];
};

type Props = {
  asignacionId: number;
};

// ============================================
// 2. DIAS DE ENTRENAMIENTO
// ============================================

const DIAS = [
  {
    numero: 1,
    nombre: "Lun",
    completo: "Lunes",
  },
  {
    numero: 2,
    nombre: "Mar",
    completo: "Martes",
  },
  {
    numero: 3,
    nombre: "Mié",
    completo: "Miércoles",
  },
  {
    numero: 4,
    nombre: "Jue",
    completo: "Jueves",
  },
  {
    numero: 5,
    nombre: "Vie",
    completo: "Viernes",
  },
  {
    numero: 6,
    nombre: "Sáb",
    completo: "Sábado",
  },
  {
    numero: 7,
    nombre: "Dom",
    completo: "Domingo",
  },
] as const;

// ============================================
// 3. FUNCIONES DE FECHAS
// ============================================

function mostrarFecha(
  valor: string | null
): string {
  if (!valor) {
    return "Sin fecha definida";
  }

  const partes = valor.split("-");

  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : valor;
}

function fechaUTC(
  valor: string
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const fecha = new Date(
    `${valor}T00:00:00.000Z`
  );

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha.toISOString().slice(0, 10) ===
    valor
    ? fecha
    : null;
}

function calcularFechas(
  inicio: string,
  fin: string,
  dias: number[]
): string[] {
  const desde = fechaUTC(inicio);
  const hasta = fechaUTC(fin);

  if (!desde || !hasta || hasta < desde) {
    return [];
  }

  const fechas: string[] = [];
  const fecha = new Date(desde);

  for (
    let i = 0;
    fecha <= hasta && i < 3660;
    i += 1
  ) {
    const diaISO =
      fecha.getUTCDay() || 7;

    if (dias.includes(diaISO)) {
      fechas.push(
        fecha.toISOString().slice(0, 10)
      );
    }

    fecha.setUTCDate(
      fecha.getUTCDate() + 1
    );
  }

  return fechas;
}

// ============================================
// 4. COMPONENTE PRINCIPAL
// ============================================

export default function ProgramarSesiones({
  asignacionId,
}: Props) {
  // ==========================================
  // 4.1. ESTADOS DEL CALENDARIO
  // ==========================================

  const [estado, setEstado] =
    useState<EstadoConsulta>({
      cargando: true,
      error: "",
      plan: null,
      sesiones: [],
    });

  const [dias, setDias] =
    useState<number[]>([]);

  const [consulta, setConsulta] =
    useState(0);

  const [guardando, setGuardando] =
    useState(false);

  const [
    errorGuardar,
    setErrorGuardar,
  ] = useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [
    mostrarTodas,
    setMostrarTodas,
  ] = useState(false);

  // Sesion seleccionada para ver ejercicios.

  const [
    sesionAbierta,
    setSesionAbierta,
  ] = useState<number | null>(null);

  // ==========================================
  // 5. CONSULTAR PLAN Y SESIONES
  // ==========================================

  useEffect(() => {
    const controlador =
      new AbortController();

    async function cargar() {
      try {
        const respuesta = await fetch(
          `/api/sesiones/programar?asignacionId=${encodeURIComponent(
            String(asignacionId)
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        const datos: RespuestaConsulta =
          await respuesta
            .json()
            .catch(() => ({}));

        if (!respuesta.ok) {
          throw new Error(
            datos.error ??
              "No se pudo consultar la programación."
          );
        }

        if (
          !datos.plan ||
          !Array.isArray(datos.sesiones)
        ) {
          throw new Error(
            "La respuesta de programación está incompleta."
          );
        }

        if (controlador.signal.aborted) {
          return;
        }

        setEstado({
          cargando: false,
          error: "",
          plan: datos.plan,
          sesiones: datos.sesiones,
        });
      } catch (problema) {
        if (controlador.signal.aborted) {
          return;
        }

        setEstado({
          cargando: false,
          error:
            problema instanceof Error
              ? problema.message
              : "No se pudo consultar la programación.",
          plan: null,
          sesiones: [],
        });
      }
    }

    void cargar();

    return () => controlador.abort();
  }, [asignacionId, consulta]);

  // ==========================================
  // 6. DATOS DEL PLAN
  // ==========================================

  const plan = estado.plan;

  const yaProgramadas =
    estado.sesiones.length > 0;

  const fechasPrevistas = useMemo(
    () =>
      plan?.fechaFin
        ? calcularFechas(
            plan.fechaInicio,
            plan.fechaFin,
            dias
          )
        : [],
    [plan, dias]
  );

  const diasCorrectos = Boolean(
    plan &&
      Number.isInteger(
        plan.frecuenciaSemanal
      ) &&
      dias.length ===
        plan.frecuenciaSemanal
  );

  const planProgramable =
    plan?.estado === "programada" ||
    plan?.estado === "activa";

  const puedeProgramar = Boolean(
    !estado.cargando &&
      !estado.error &&
      !guardando &&
      !yaProgramadas &&
      planProgramable &&
      plan?.fechaFin &&
      diasCorrectos &&
      fechasPrevistas.length > 0
  );

  // ==========================================
  // 7. ACTUALIZAR CALENDARIO
  // ==========================================

  function actualizar() {
    if (guardando) {
      return;
    }

    setEstado((anterior) => ({
      ...anterior,
      cargando: true,
      error: "",
    }));

    setConsulta(
      (anterior) => anterior + 1
    );
  }

  // ==========================================
  // 8. SELECCIONAR DIAS
  // ==========================================

  function alternarDia(
    numero: number
  ) {
    if (
      guardando ||
      yaProgramadas
    ) {
      return;
    }

    setDias((anteriores) =>
      anteriores.includes(numero)
        ? anteriores.filter(
            (dia) => dia !== numero
          )
        : [
            ...anteriores,
            numero,
          ].sort(
            (a, b) => a - b
          )
    );

    setErrorGuardar("");
    setMensaje("");
  }

  // ==========================================
  // 9. PROGRAMAR SESIONES
  // ==========================================

  async function programar() {
    if (!puedeProgramar) {
      return;
    }

    setGuardando(true);
    setErrorGuardar("");
    setMensaje("");

    try {
      const respuesta = await fetch(
        "/api/sesiones/programar",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            asignacionId,
            diasSemana: dias,
          }),
          cache: "no-store",
        }
      );

      const datos: RespuestaProgramacion =
        await respuesta
          .json()
          .catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudieron programar las sesiones."
        );
      }

      if (
        typeof datos.total !== "number"
      ) {
        throw new Error(
          "El servidor no confirmó la programación."
        );
      }

      setMensaje(
        datos.mensaje ??
          `Programación registrada: ${datos.total} sesiones.`
      );

      setEstado((anterior) => ({
        ...anterior,
        cargando: true,
        error: "",
      }));

      setConsulta(
        (anterior) => anterior + 1
      );
    } catch (problema) {
      setErrorGuardar(
        problema instanceof Error
          ? problema.message
          : "No se pudo conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  }

  // ==========================================
  // 10. ABRIR Y CERRAR EJERCICIOS
  // ==========================================

  function alternarEjercicios(
    sesionId: number
  ) {
    setSesionAbierta((actual) =>
      actual === sesionId
        ? null
        : sesionId
    );
  }

  // ==========================================
  // 11. RESUMEN DE ASISTENCIA
  // ==========================================

  const sesionesVisibles =
    mostrarTodas
      ? estado.sesiones
      : estado.sesiones.slice(0, 8);

  const realizadas =
    estado.sesiones.filter(
      (sesion) =>
        sesion.estado === "realizada"
    ).length;

  const ausentes =
    estado.sesiones.filter(
      (sesion) =>
        sesion.estado === "ausente"
    ).length;

  const enCurso =
    estado.sesiones.filter(
      (sesion) =>
        sesion.estado === "en_curso"
    ).length;

  // ==========================================
  // 12. INTERFAZ
  // ==========================================

  return (
    <section
      aria-label="Programación de sesiones de entrenamiento"
      className="mt-4 rounded-xl border border-cyan-400/20 bg-slate-950/60 p-4"
    >
      {/* ====================================
          ENCABEZADO
      ==================================== */}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Calendario de entrenamiento
          </p>

          <h6 className="mt-1 text-base font-bold text-white">
            Programación, asistencia y ejercicios
          </h6>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Programa los días de entrenamiento,
            registra la asistencia y supervisa
            el cumplimiento de cada ejercicio.
          </p>
        </div>

        <button
          type="button"
          onClick={actualizar}
          disabled={
            guardando ||
            estado.cargando
          }
          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
        >
          Actualizar
        </button>
      </div>

      {/* ====================================
          CARGANDO
      ==================================== */}

      {estado.cargando && (
        <p
          role="status"
          className="mt-4 text-sm text-slate-400"
        >
          Consultando el calendario del plan...
        </p>
      )}

      {/* ====================================
          ERROR DE CONSULTA
      ==================================== */}

      {estado.error && (
        <div className="mt-4 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3">
          <p
            role="alert"
            className="text-sm text-rose-200"
          >
            {estado.error}
          </p>

          <button
            type="button"
            onClick={actualizar}
            className="mt-2 text-xs font-semibold text-cyan-300 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {!estado.cargando &&
        !estado.error &&
        plan && (
          <>
            {/* ============================
                DATOS DEL PLAN
            ============================ */}

            <div className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">
                  Inicio
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {mostrarFecha(
                    plan.fechaInicio
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Fin
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {mostrarFecha(
                    plan.fechaFin
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Frecuencia
                </p>

                <p className="mt-1 text-sm font-semibold text-cyan-200">
                  {plan.frecuenciaSemanal}{" "}
                  días/semana
                </p>
              </div>
            </div>

            {/* ============================
                MENSAJE DE EXITO
            ============================ */}

            {mensaje && (
              <p
                role="status"
                className="mt-3 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200"
              >
                {mensaje}
              </p>
            )}

            {/* ============================
                CALENDARIO REGISTRADO
            ============================ */}

            {yaProgramadas ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-emerald-200">
                    {estado.sesiones.length}{" "}
                    sesiones registradas
                  </p>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    Calendario creado
                  </span>
                </div>

                {/* ========================
                    INDICADORES DE ASISTENCIA
                ======================== */}

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/10 bg-slate-900 p-3 text-center">
                    <p className="text-xl font-bold text-emerald-300">
                      {realizadas}
                    </p>

                    <p className="text-xs text-slate-400">
                      Realizadas
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-slate-900 p-3 text-center">
                    <p className="text-xl font-bold text-rose-300">
                      {ausentes}
                    </p>

                    <p className="text-xs text-slate-400">
                      Ausencias
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-slate-900 p-3 text-center">
                    <p className="text-xl font-bold text-amber-300">
                      {enCurso}
                    </p>

                    <p className="text-xs text-slate-400">
                      En curso
                    </p>
                  </div>
                </div>

                {/* ========================
                    PASO 65.9
                    RESUMEN DE ADHERENCIA
                ======================== */}

                <ResumenAdherencia
                  asignacionId={asignacionId}
                  revision={consulta}
                />

                {/* ========================
                    SESIONES Y ASISTENCIA
                ======================== */}

                <ol className="space-y-3">
                  {sesionesVisibles.map(
                    (sesion) => {
                      const ejerciciosAbiertos =
                        sesionAbierta ===
                        sesion.id;

                      const panelId =
                        `ejercicios-sesion-${sesion.id}`;

                      return (
                        <li
                          key={sesion.id}
                          className="space-y-2"
                        >
                          {/* CONTROL DE ASISTENCIA */}

                          <ControlAsistencia
                            sesion={sesion}
                            estadoPlan={
                              plan.estado
                            }
                            onActualizada={(
                              nuevoMensaje
                            ) => {
                              setMensaje(
                                nuevoMensaje
                              );

                              actualizar();
                            }}
                          />

                          {/* ====================
                              BOTON DE EJERCICIOS
                          ==================== */}

                          <div className="rounded-lg border border-cyan-400/15 bg-slate-900/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold text-white">
                                  Cumplimiento de ejercicios
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-400">
                                  Consulta los objetivos y
                                  registra las series
                                  realizadas durante esta
                                  sesión.
                                </p>
                              </div>

                              <button
                                type="button"
                                aria-expanded={
                                  ejerciciosAbiertos
                                }
                                aria-controls={
                                  panelId
                                }
                                onClick={() =>
                                  alternarEjercicios(
                                    sesion.id
                                  )
                                }
                                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                  ejerciciosAbiertos
                                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                                    : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
                                }`}
                              >
                                {ejerciciosAbiertos
                                  ? "Ocultar ejercicios"
                                  : "Ver ejercicios"}
                              </button>
                            </div>

                            {/* ==================
                                REGISTRO DE
                                EJERCICIOS Y SERIES
                            ================== */}

                            {ejerciciosAbiertos && (
                              <div
                                id={panelId}
                                className="mt-3"
                              >
                                <RegistroEjercicios
                                  sesionId={sesion.id}
                                />

                                {/* RESUMEN POR SESION */}

                                <ResumenCumplimiento
                                  key={`${sesion.id}-${consulta}`}
                                  sesionId={sesion.id}
                                />
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    }
                  )}
                </ol>

                {/* ========================
                    MOSTRAR TODAS
                ======================== */}

                {estado.sesiones.length >
                  8 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarTodas(
                          (valor) => !valor
                        )
                      }
                      className="text-xs font-semibold text-cyan-300 underline"
                    >
                      {mostrarTodas
                        ? "Mostrar menos"
                        : "Ver todas las sesiones"}
                    </button>
                  )}

                {/* ========================
                    INFORMACION DEL MODULO
                ======================== */}

                <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
                  <p className="text-xs leading-5 text-slate-400">
                    La asistencia se registra
                    por sesión. Los ejercicios
                    pueden consultarse desde el
                    calendario y sus series
                    reales se registran
                    únicamente cuando la sesión
                    está en curso.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    El resumen de adherencia
                    permite consultar asistencia,
                    cumplimiento y continuidad,
                    diferenciando los datos
                    provisionales de los
                    resultados finales.
                  </p>
                </div>
              </div>
            ) : (
              /* ==========================
                  PROGRAMACION INICIAL
              ========================== */

              <div className="mt-4 space-y-4">
                {!plan.fechaFin && (
                  <p
                    role="alert"
                    className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-200"
                  >
                    Este plan no tiene fecha de
                    finalización. Define primero
                    su período.
                  </p>
                )}

                {!planProgramable && (
                  <p
                    role="alert"
                    className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-200"
                  >
                    El plan está en estado
                    «{plan.estado}» y no admite
                    nuevas sesiones.
                  </p>
                )}

                {/* ========================
                    SELECCION DE DIAS
                ======================== */}

                <div>
                  <p className="text-sm font-semibold text-white">
                    Selecciona{" "}
                    {plan.frecuenciaSemanal}{" "}
                    días de la semana
                  </p>

                  <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
                    {DIAS.map((dia) => {
                      const seleccionado =
                        dias.includes(
                          dia.numero
                        );

                      return (
                        <button
                          key={dia.numero}
                          type="button"
                          aria-label={
                            dia.completo
                          }
                          aria-pressed={
                            seleccionado
                          }
                          onClick={() =>
                            alternarDia(
                              dia.numero
                            )
                          }
                          disabled={
                            guardando ||
                            !planProgramable ||
                            !plan.fechaFin
                          }
                          className={`min-h-12 rounded-lg border px-1 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm ${
                            seleccionado
                              ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
                              : "border-white/15 bg-slate-900 text-slate-300 hover:border-cyan-400/40"
                          }`}
                        >
                          {dia.nombre}
                        </button>
                      );
                    })}
                  </div>

                  <p
                    className={`mt-2 text-xs ${
                      diasCorrectos
                        ? "text-emerald-300"
                        : "text-slate-400"
                    }`}
                  >
                    {dias.length} de{" "}
                    {plan.frecuenciaSemanal}{" "}
                    días seleccionados
                  </p>
                </div>

                {/* ========================
                    VISTA PREVIA
                ======================== */}

                {diasCorrectos &&
                  fechasPrevistas.length >
                    0 && (
                    <div className="rounded-lg border border-cyan-400/20 bg-cyan-950/15 p-3">
                      <p className="text-sm font-semibold text-cyan-200">
                        Vista previa:{" "}
                        {fechasPrevistas.length}{" "}
                        sesiones
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Fechas previstas según
                        los días seleccionados:
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {fechasPrevistas
                          .slice(0, 8)
                          .map((fecha) => (
                            <span
                              key={fecha}
                              className="rounded-md border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                            >
                              {mostrarFecha(
                                fecha
                              )}
                            </span>
                          ))}
                      </div>

                      {fechasPrevistas.length >
                        8 && (
                        <p className="mt-2 text-xs text-slate-400">
                          Y{" "}
                          {fechasPrevistas.length -
                            8}{" "}
                          sesiones más.
                        </p>
                      )}
                    </div>
                  )}

                {/* ========================
                    ERROR DE PROGRAMACION
                ======================== */}

                {errorGuardar && (
                  <p
                    role="alert"
                    className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200"
                  >
                    {errorGuardar}
                  </p>
                )}

                {/* ========================
                    CONFIRMAR PROGRAMACION
                ======================== */}

                <button
                  type="button"
                  onClick={() =>
                    void programar()
                  }
                  disabled={
                    !puedeProgramar
                  }
                  className="min-h-11 w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {guardando
                    ? "Programando sesiones..."
                    : `Confirmar programación${
                        fechasPrevistas.length >
                        0
                          ? ` (${fechasPrevistas.length} sesiones)`
                          : ""
                      }`}
                </button>

                <p className="text-xs leading-5 text-slate-500">
                  La programación se guarda
                  una sola vez. Aún no se ha
                  implementado la
                  reprogramación.
                </p>
              </div>
            )}
          </>
        )}
    </section>
  );
}
