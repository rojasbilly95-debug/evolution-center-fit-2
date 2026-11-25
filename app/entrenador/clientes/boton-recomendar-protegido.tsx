import { createClient } from "@/lib/supabase/server";
import BotonRecomendar from "./boton-recomendar";
import { ESTUDIO, fechaHoyLima } from "@/lib/investigacion/calendario-estudio";

type Props = {
  clienteId: string;
};


function Aviso({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
      {mensaje}
    </div>
  );
}


export default async function BotonRecomendarProtegido({
  clienteId,
}: Props) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("participantes_estudio")
    .select("grupo_estudio,fecha_inicio_estudio")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (error) {
    return (
      <Aviso mensaje="No se pudo verificar el grupo de investigaciÃ³n. La recomendaciÃ³n inteligente estÃ¡ deshabilitada por seguridad." />
    );
  }

  // Por seguridad, los no inscritos requieren una política distinta
  // para recibir IA fuera de la investigación.
  if (!data) {
    return (
      <Aviso mensaje="No se pudo verificar la inscripción del cliente. La IA permanece deshabilitada por seguridad." />
    );
  }

  const grupo = String(data.grupo_estudio ?? "")
    .trim()
    .toLowerCase();

  if (
    grupo === "gc" ||
    grupo === "control" ||
    grupo === "grupo_control"
  ) {
    return (
      <Aviso mensaje="Grupo control (GC): las recomendaciones inteligentes estÃ¡n deshabilitadas durante todo el estudio. Utiliza la asignaciÃ³n manual de rutinas." />
    );
  }

  if (
    grupo === "ge" ||
    grupo === "experimental" ||
    grupo === "grupo_experimental"
  ) {
    if (data.fecha_inicio_estudio !== ESTUDIO.inicio) {
      return (
        <Aviso mensaje="El calendario del participante no coincide con el calendario oficial del estudio." />
      );
    }

    const hoy = fechaHoyLima();

    if (hoy < ESTUDIO.inicioIntervencion) {
      return (
        <Aviso mensaje="Grupo experimental: la IA se habilitará el 07/12/2026." />
      );
    }

    if (hoy > ESTUDIO.finIntervencion) {
      return (
        <Aviso mensaje="La intervención terminó el 03/01/2027. Durante el postest no se generan nuevas recomendaciones de IA." />
      );
    }

    return <BotonRecomendar clienteId={clienteId} />;
  }

  return (
    <Aviso mensaje="Grupo de investigaciÃ³n no reconocido. La IA permanece deshabilitada." />
  );
}