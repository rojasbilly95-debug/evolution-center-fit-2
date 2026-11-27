import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  CAMPOS_PERFIL_VERIFICABLE,
  clientePrivadoSupabase,
  type PerfilVerificable,
} from "@/lib/perfil/verificacion";

import SeguimientoClientePage from "@/app/entrenador/clientes/[clienteId]/seguimiento/page";

import VerificarPerfil from "@/app/entrenador/clientes/verificar-perfil";

import BotonRecomendarProtegido from "@/app/entrenador/clientes/boton-recomendar-protegido";

import VentanaSeguimiento from "@/app/entrenador/clientes/ventana-seguimiento";

type Props = {
  params: Promise<{
    clienteId: string;
  }>;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SeguimientoEnVentana({
  params,
}: Props) {
  await connection();

  const { clienteId } = await params;

  if (!UUID.test(clienteId)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: errorSesion,
  } = await supabase.auth.getUser();

  if (errorSesion || !user) {
    redirect("/login");
  }

  // Autorizar al entrenador y comprobar relación activa.
  const [rol, relacion] = await Promise.all([
    supabase
      .from("usuario_roles")
      .select("rol")
      .eq("usuario_id", user.id)
      .eq("rol", "entrenador")
      .maybeSingle(),

    supabase
      .from("asignaciones_entrenadores")
      .select("cliente_id")
      .eq("entrenador_id", user.id)
      .eq("cliente_id", clienteId)
      .eq("activa", true)
      .maybeSingle(),
  ]);

  if (
    rol.error ||
    relacion.error ||
    !rol.data ||
    !relacion.data
  ) {
    notFound();
  }

  const [usuario, consultaPerfil] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre_completo")
      .eq("id", clienteId)
      .maybeSingle(),

    supabase
      .from("perfiles_clientes")
      .select(CAMPOS_PERFIL_VERIFICABLE)
      .eq("usuario_id", clienteId)
      .maybeSingle(),
  ]);

  if (usuario.error || consultaPerfil.error) {
    throw new Error(
      "No se pudo consultar la información del cliente."
    );
  }

  const nombre =
    usuario.data?.nombre_completo?.trim() ||
    "Cliente asignado";

  const perfil =
    (consultaPerfil.data as PerfilVerificable | null) ??
    null;

  // Las fotografías serán privadas.
  // Si todavía no existe la imagen, se mostrarán iniciales.
  let fotoUrl: string | null = null;

  try {
    const admin = clientePrivadoSupabase();

    const { data } = await admin.storage
      .from("fotos-perfil")
      .createSignedUrl(
        `${clienteId}/perfil.webp`,
        300
      );

    fotoUrl = data?.signedUrl ?? null;
  } catch {
    fotoUrl = null;
  }

  return (
    <VentanaSeguimiento
      nombre={nombre}
      perfil={perfil}
      fotoUrl={fotoUrl}
      seguimiento={
        <SeguimientoClientePage params={params} />
      }
      verificacion={
        perfil ? (
          <VerificarPerfil clienteId={clienteId} />
        ) : null
      }
      recomendaciones={
        perfil ? (
          <BotonRecomendarProtegido
            clienteId={clienteId}
          />
        ) : null
      }
    />
  );
}