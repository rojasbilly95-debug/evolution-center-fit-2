import { createClient } from "@/lib/supabase/server";
import BotonRecomendar from "./boton-recomendar";

type Props = {
  clienteId: string;
};

function Aviso({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
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

  // Los clientes que no participan en el estudio
  // mantienen el flujo habitual de recomendaciones.
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
    const fecha = String(data.fecha_inicio_estudio ?? "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return (
        <Aviso mensaje="La fecha de inicio del estudio no es vÃ¡lida. La IA permanece deshabilitada." />
      );
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const inicio = Date.UTC(anio, mes - 1, dia);

    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    function valor(tipo: string) {
      return Number(
        partes.find((parte) => parte.type === tipo)?.value
      );
    }

    const hoy = Date.UTC(
      valor("year"),
      valor("month") - 1,
      valor("day")
    );

    const dias = Math.floor(
      (hoy - inicio) / 86400000
    );

    if (!Number.isFinite(dias) || dias < 28) {
      const fechaHabilitacion = new Date(
        inicio + 28 * 86400000
      ).toLocaleDateString("es-PE", {
        timeZone: "UTC",
      });

      return (
        <Aviso
          mensaje={`Grupo experimental (GE): la IA estarÃ¡ disponible desde el ${fechaHabilitacion}, despuÃ©s de las cuatro semanas de pretest.`}
        />
      );
    }

    return <BotonRecomendar clienteId={clienteId} />;
  }

  return (
    <Aviso mensaje="Grupo de investigaciÃ³n no reconocido. La IA permanece deshabilitada." />
  );
}