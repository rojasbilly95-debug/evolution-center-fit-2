// Calendario oficial de la investigación.
// Fechas civiles de Lima, Perú.
// Cambiar solamente si se modifica el protocolo aprobado.

export const ESTUDIO = {
  inicio: "2026-11-09",
  finPretest: "2026-12-06",
  inicioIntervencion: "2026-12-07",
  finIntervencion: "2027-01-03",
  inicioPostest: "2027-01-04",
  fin: "2027-01-31",
} as const;

export type FaseEstudio =
  | "pretest"
  | "intervencion"
  | "postest";

export function fechaHoyLima(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const leer = (nombre: string) =>
    partes.find((p) => p.type === nombre)?.value ?? "";

  return (
    leer("year") +
    "-" +
    leer("month") +
    "-" +
    leer("day")
  );
}

export function faseEstudioOficial(
  fecha: string
): FaseEstudio | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return null;
  }

  const fechaUTC = new Date(fecha + "T00:00:00.000Z");

  if (
    !Number.isFinite(fechaUTC.getTime()) ||
    fechaUTC.toISOString().slice(0, 10) !== fecha
  ) {
    return null;
  }

  if (
    fecha >= ESTUDIO.inicio &&
    fecha <= ESTUDIO.finPretest
  ) {
    return "pretest";
  }

  if (
    fecha >= ESTUDIO.inicioIntervencion &&
    fecha <= ESTUDIO.finIntervencion
  ) {
    return "intervencion";
  }

  if (
    fecha >= ESTUDIO.inicioPostest &&
    fecha <= ESTUDIO.fin
  ) {
    return "postest";
  }

  return null;
}
