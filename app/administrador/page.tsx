
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient as crearClientePrivilegiado } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/lib/actions/auth";

// =====================================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.8.4 - CENTRO ADMINISTRATIVO
// Usuarios, indicadores y asignaciones reales.
// Todas las operaciones son de solo lectura.
// =====================================================

type Props = {
  searchParams: Promise<{ q?: string }>;
};

type Usuario = {
  id: string;
  nombre_completo: string | null;
};

type UsuarioRol = {
  usuario_id: string;
  rol: string;
};

type AsignacionEntrenador = {
  cliente_id: string;
  entrenador_id: string;
  activa: boolean;
  asignado_en: string | null;
};

type AsignacionVista = {
  clienteId: string;
  entrenadorId: string;
  cliente: string;
  entrenador: string;
  activa: boolean;
  fecha: string | null;
  valida: boolean;
};

type IconoTipo =
  | "usuarios"
  | "rutinas"
  | "sesiones"
  | "seguridad";

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function numero(valor: number | null) {
  return valor === null
    ? "—"
    : new Intl.NumberFormat("es-PE").format(valor);
}

function nombreRol(rol: string) {
  const etiquetas: Record<string, string> = {
    administrador: "Administrador",
    entrenador: "Entrenador",
    cliente: "Cliente",
  };

  return etiquetas[rol] ?? rol;
}

// =====================================================
// ICONOS
// =====================================================

function Icono({ tipo }: { tipo: IconoTipo }) {
  const rutas = {
    usuarios: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" />
      </>
    ),

    rutinas: (
      <path d="m6.5 6.5 11 11M4 9l5-5M15 20l5-5M2 7l5-5M17 22l5-5" />
    ),

    sesiones: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),

    seguridad: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      {rutas[tipo]}
    </svg>
  );
}

// =====================================================
// TARJETAS DE INDICADORES
// =====================================================

function Indicador({
  titulo,
  valor,
  detalle,
  tipo,
}: {
  titulo: string;
  valor: number | null;
  detalle: string;
  tipo: IconoTipo;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br from-[#192d46] to-[#101b30] p-5 shadow-[0_15px_38px_rgba(0,0,0,0.2)] transition-[transform,border-color] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/30">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <Icono tipo={tipo} />
      </span>

      <p className="mt-5 text-3xl font-black tabular-nums text-white">
        {numero(valor)}
      </p>

      <h3 className="mt-2 text-sm font-bold text-slate-200">
        {titulo}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {valor === null
          ? "Información no disponible"
          : detalle}
      </p>
    </article>
  );
}

// =====================================================
// TARJETAS DE MODULOS
// =====================================================

function Modulo({
  titulo,
  descripcion,
  estado,
  href,
  tipo,
}: {
  titulo: string;
  descripcion: string;
  estado: "Disponible" | "En desarrollo";
  href?: string;
  tipo: IconoTipo;
}) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          <Icono tipo={tipo} />
        </span>

        <span
          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            estado === "Disponible"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
              : "border-amber-400/20 bg-amber-400/10 text-amber-200"
          }`}
        >
          {estado}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-bold text-white">
        {titulo}
      </h3>

      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
        {descripcion}
      </p>

      <p className="mt-auto border-t border-white/10 pt-4 text-xs font-bold text-cyan-300">
        {href
          ? "Abrir herramienta →"
          : "Pendiente de implementación segura"}
      </p>
    </>
  );

  const clases =
    "flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#172a43] to-[#0d192c] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.16)] transition-[transform,border-color,box-shadow] hover:border-cyan-400/30 hover:shadow-[0_20px_48px_rgba(0,0,0,0.24)] sm:p-6";

  return href ? (
    <Link
      href={href}
      className={`${clases} motion-safe:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-cyan-300`}
    >
      {contenido}
    </Link>
  ) : (
    <article className={clases}>
      {contenido}
    </article>
  );
}

// =====================================================
// CARGA DEL PANEL
// =====================================================

function EstadoCarga() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e1b] text-sm text-cyan-200">
      Cargando centro de administración...
    </main>
  );
}

// =====================================================
// CONTENIDO DEL ADMINISTRADOR
// =====================================================

async function ContenidoAdministrador({
  searchParams,
}: Props) {
  // Evita errores de prerenderizado en Next.js 16.
  // La lectura de datos se realiza dentro de Suspense.
  await connection();

  const parametros = await searchParams;

  const busqueda =
    typeof parametros.q === "string"
      ? parametros.q.trim().slice(0, 60)
      : "";

  const supabase = await createClient();

  // ===================================================
  // 1. VALIDAR SESION
  // ===================================================

  const {
    data: identidad,
    error: errorIdentidad,
  } = await supabase.auth.getClaims();

  const usuarioId = identidad?.claims?.sub;

  if (errorIdentidad || !usuarioId) {
    redirect("/login");
  }

  // ===================================================
  // 2. VALIDAR ROL ADMINISTRADOR
  // ===================================================

  const {
    data: acceso,
    error: errorAcceso,
  } = await supabase
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (errorAcceso || acceso?.rol !== "administrador") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080e1b] p-6 text-white">
        <section className="max-w-lg rounded-2xl border border-rose-400/20 bg-rose-400/10 p-8 text-center">
          <h1 className="text-2xl font-bold">
            Acceso restringido
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Tu cuenta no tiene permisos para acceder
            al administrador.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-block text-sm font-bold text-cyan-300 hover:underline"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  // ===================================================
  // 3. OBTENER NOMBRE DEL ADMINISTRADOR
  // ===================================================

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre_completo")
    .eq("id", usuarioId)
    .maybeSingle();

  const nombre =
    perfil?.nombre_completo || "Administrador";

  // ===================================================
  // 4. CONFIGURACION DE CONSULTAS
  // ===================================================

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;

  const habilitado = Boolean(url && clave);

  // ===================================================
  // 5. INDICADORES GENERALES
  // ===================================================

  let cantidadUsuarios: number | null = null;
  let cantidadClientes: number | null = null;
  let cantidadEntrenadores: number | null = null;
  let cantidadRutinas: number | null = null;
  let cantidadEjercicios: number | null = null;
  let cantidadPlanes: number | null = null;
  let cantidadSesiones: number | null = null;

  let programadas: number | null = null;
  let enCurso: number | null = null;
  let realizadas: number | null = null;
  let ausentes: number | null = null;

  // ===================================================
  // 6. DIRECTORIO DE USUARIOS
  // ===================================================

  let usuarios: Usuario[] = [];
  let roles = new Map<string, string>();
  let errorUsuarios = false;

  // ===================================================
  // 7. ASIGNACIONES DE ENTRENADORES
  // ===================================================

  let asignacionesVista: AsignacionVista[] = [];
  let totalAsignaciones: number | null = null;
  let errorAsignaciones = false;

  // ===================================================
  // 8. CONSULTAS A SUPABASE
  // ===================================================

  if (url && clave) {
    // Cliente privilegiado: solamente servidor.
    // La identidad y el rol ya fueron comprobados.
    const admin = crearClientePrivilegiado(
      url,
      clave,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    async function contar(
      tabla: string,
      campo?: string,
      valor?: string
    ): Promise<number | null> {
      let consulta = admin
        .from(tabla)
        .select("*", {
          count: "exact",
          head: true,
        });

      if (campo && valor) {
        consulta = consulta.eq(campo, valor);
      }

      const { count, error } = await consulta;

      return error ? null : count;
    }

    // -----------------------------------------------
    // CONSULTAR INDICADORES
    // -----------------------------------------------

    [
      cantidadUsuarios,
      cantidadClientes,
      cantidadEntrenadores,
      cantidadRutinas,
      cantidadEjercicios,
      cantidadPlanes,
      cantidadSesiones,
      programadas,
      enCurso,
      realizadas,
      ausentes,
    ] = await Promise.all([
      contar("usuarios"),

      contar(
        "usuario_roles",
        "rol",
        "cliente"
      ),

      contar(
        "usuario_roles",
        "rol",
        "entrenador"
      ),

      contar("rutinas"),

      contar("ejercicios"),

      contar("asignaciones_rutinas"),

      contar("sesiones_entrenamiento"),

      contar(
        "sesiones_entrenamiento",
        "estado",
        "programada"
      ),

      contar(
        "sesiones_entrenamiento",
        "estado",
        "en_curso"
      ),

      contar(
        "sesiones_entrenamiento",
        "estado",
        "realizada"
      ),

      contar(
        "sesiones_entrenamiento",
        "estado",
        "ausente"
      ),
    ]);

    // -----------------------------------------------
    // BUSCAR USUARIOS
    // -----------------------------------------------

    let consultaUsuarios = admin
      .from("usuarios")
      .select("id,nombre_completo")
      .order("nombre_completo", {
        ascending: true,
      })
      .limit(25);

    if (busqueda) {
      consultaUsuarios = consultaUsuarios.ilike(
        "nombre_completo",
        `%${busqueda.replace(/[%_]/g, "")}%`
      );
    }

    // -----------------------------------------------
    // CONSULTAR ASIGNACIONES
    // -----------------------------------------------

    const [
      resultadoUsuarios,
      resultadoAsignaciones,
    ] = await Promise.all([
      consultaUsuarios,

      admin
        .from("asignaciones_entrenadores")
        .select(
          "cliente_id,entrenador_id,activa,asignado_en",
          { count: "exact" }
        )
        .order("asignado_en", {
          ascending: false,
        })
        .limit(100),
    ]);

    // -----------------------------------------------
    // PROCESAR USUARIOS
    // -----------------------------------------------

    if (resultadoUsuarios.error) {
      errorUsuarios = true;
    } else {
      usuarios =
        (resultadoUsuarios.data ?? []) as Usuario[];

      const ids = usuarios.map(
        (usuario) => usuario.id
      );

      if (ids.length > 0) {
        const resultadoRoles = await admin
          .from("usuario_roles")
          .select("usuario_id,rol")
          .in("usuario_id", ids);

        if (resultadoRoles.error) {
          errorUsuarios = true;
        } else {
          roles = new Map(
            (
              (resultadoRoles.data ?? []) as UsuarioRol[]
            ).map((registro) => [
              registro.usuario_id,
              registro.rol,
            ])
          );
        }
      }
    }

    // -----------------------------------------------
    // PROCESAR ASIGNACIONES
    // -----------------------------------------------

    if (resultadoAsignaciones.error) {
      errorAsignaciones = true;
    } else {
      totalAsignaciones =
        resultadoAsignaciones.count;

      const filas =
        (resultadoAsignaciones.data ??
          []) as AsignacionEntrenador[];

      const ids = [
        ...new Set(
          filas.flatMap((fila) => [
            fila.cliente_id,
            fila.entrenador_id,
          ])
        ),
      ];

      if (ids.length > 0) {
        const [
          resultadoNombres,
          resultadoRoles,
        ] = await Promise.all([
          admin
            .from("usuarios")
            .select("id,nombre_completo")
            .in("id", ids),

          admin
            .from("usuario_roles")
            .select("usuario_id,rol")
            .in("usuario_id", ids),
        ]);

        if (
          resultadoNombres.error ||
          resultadoRoles.error
        ) {
          errorAsignaciones = true;
        } else {
          // Mapa de nombres por identificador.
          const nombres = new Map(
            (
              (resultadoNombres.data ??
                []) as Usuario[]
            ).map((usuario) => [
              usuario.id,
              usuario.nombre_completo ||
                "Sin nombre registrado",
            ])
          );

          // Mapa de roles por identificador.
          const rolesAsignados = new Map(
            (
              (resultadoRoles.data ??
                []) as UsuarioRol[]
            ).map((registro) => [
              registro.usuario_id,
              registro.rol,
            ])
          );

          // Construir relaciones para el panel.
          asignacionesVista = filas.map(
            (fila) => ({
              clienteId: fila.cliente_id,
              entrenadorId: fila.entrenador_id,

              cliente:
                nombres.get(fila.cliente_id) ??
                "Cliente no encontrado",

              entrenador:
                nombres.get(fila.entrenador_id) ??
                "Entrenador no encontrado",

              activa: fila.activa,
              fecha: fila.asignado_en,

              valida:
                rolesAsignados.get(
                  fila.cliente_id
                ) === "cliente" &&
                rolesAsignados.get(
                  fila.entrenador_id
                ) === "entrenador" &&
                fila.cliente_id !==
                  fila.entrenador_id &&
                nombres.has(fila.cliente_id) &&
                nombres.has(fila.entrenador_id),
            })
          );
        }
      }
    }
  }

  // ===================================================
  // 9. DEFINIR INDICADORES DEL PANEL
  // ===================================================

  const indicadores = [
    {
      titulo: "Usuarios registrados",
      valor: cantidadUsuarios,
      detalle: "Cuentas en el registro de perfiles",
      tipo: "usuarios" as const,
    },
    {
      titulo: "Clientes",
      valor: cantidadClientes,
      detalle: "Cuentas con rol cliente",
      tipo: "usuarios" as const,
    },
    {
      titulo: "Entrenadores",
      valor: cantidadEntrenadores,
      detalle: "Cuentas con rol entrenador",
      tipo: "usuarios" as const,
    },
    {
      titulo: "Planes asignados",
      valor: cantidadPlanes,
      detalle: "Asignaciones registradas",
      tipo: "rutinas" as const,
    },
    {
      titulo: "Rutinas",
      valor: cantidadRutinas,
      detalle: "Rutinas del catálogo",
      tipo: "rutinas" as const,
    },
    {
      titulo: "Ejercicios",
      valor: cantidadEjercicios,
      detalle: "Ejercicios del catálogo",
      tipo: "rutinas" as const,
    },
    {
      titulo: "Sesiones",
      valor: cantidadSesiones,
      detalle: "Sesiones registradas",
      tipo: "sesiones" as const,
    },
    {
      titulo: "Sesiones realizadas",
      valor: realizadas,
      detalle: "Sesiones con estado realizada",
      tipo: "sesiones" as const,
    },
  ];

  // ===================================================
  // 10. MODULOS DEL ADMINISTRADOR
  // ===================================================

  const modulos = [
    {
      titulo: "Directorio de usuarios",
      descripcion:
        "Buscar cuentas registradas y consultar sus roles.",
      tipo: "usuarios" as const,
      estado: "Disponible" as const,
      href: "/administrador/usuarios",
    },
    {
      titulo: "Catálogo de entrenamiento",
      descripcion:
        "Consultar ejercicios y rutinas del sistema.",
      tipo: "rutinas" as const,
      estado: "Disponible" as const,
      href: "/catalogo",
    },
    {
      titulo: "Supervisión de sesiones",
      descripcion:
        "Consultar los estados generales de las sesiones.",
      tipo: "sesiones" as const,
      estado: "Disponible" as const,
      href: "#sesiones",
    },
    {
      titulo: "Asignaciones de entrenadores",
      descripcion:
        "Ver clientes, responsables y estado real de las relaciones.",
      tipo: "usuarios" as const,
      estado: "Disponible" as const,
      href: "#asignaciones",
    },
    {
      titulo: "Gestión de roles y permisos",
      descripcion:
        "Crear o cambiar roles con auditoría y controles de seguridad.",
      tipo: "seguridad" as const,
      estado: "En desarrollo" as const,
    },
    {
      titulo: "Reportes y auditoría",
      descripcion:
        "Reportes históricos y registro de acciones administrativas.",
      tipo: "seguridad" as const,
      estado: "En desarrollo" as const,
    },
  ];

  // ===================================================
  // 11. ESTADOS DE SESIONES
  // ===================================================

  const estadosSesion = [
    {
      nombre: "Programadas",
      valor: programadas,
      color: "bg-cyan-400",
      texto: "text-cyan-300",
    },
    {
      nombre: "En curso",
      valor: enCurso,
      color: "bg-amber-400",
      texto: "text-amber-300",
    },
    {
      nombre: "Realizadas",
      valor: realizadas,
      color: "bg-emerald-400",
      texto: "text-emerald-300",
    },
    {
      nombre: "Ausentes",
      valor: ausentes,
      color: "bg-rose-400",
      texto: "text-rose-300",
    },
  ];

  // ===================================================
  // 12. INTERFAZ ADMINISTRATIVA
  // ===================================================

  return (
    <main className="min-h-screen bg-[#080e1b] text-white">
      {/* ============================================
          CABECERA
      ============================================ */}

      <header className="relative z-30 border-b border-white/10 bg-[#0e192b] shadow-xl shadow-black/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/administrador"
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-[#07121e]">
              E
            </span>

            <span>
              <span className="block text-sm font-black">
                EVOLUTION CENTER FIT{" "}
                <span className="text-cyan-300">
                  2.0
                </span>
              </span>

              <span className="text-xs text-slate-400">
                Administración del sistema
              </span>
            </span>
          </Link>

          <nav
            aria-label="Navegación del administrador"
            className="flex flex-wrap items-center gap-2 text-sm font-semibold"
          >
            <a
              href="#usuarios"
              className="rounded-xl px-3 py-2.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Usuarios
            </a>

            <a
              href="#asignaciones"
              className="rounded-xl px-3 py-2.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Asignaciones
            </a>

            <a
              href="#sesiones"
              className="rounded-xl px-3 py-2.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Sesiones
            </a>

            <Link
              href="/catalogo"
              className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-cyan-200 hover:bg-cyan-400/20"
            >
              Catálogo
            </Link>

            <form action={cerrarSesion}>
              <button
                type="submit"
                className="min-h-11 rounded-xl border border-rose-400/20 px-4 py-2 font-bold text-rose-300 hover:bg-rose-400/10"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-9 px-4 py-8 sm:px-6 lg:py-10">
        {/* ============================================
            BIENVENIDA
        ============================================ */}

        <section className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#17344a] via-[#14263d] to-[#201b3d] p-6 shadow-[0_24px_65px_rgba(0,0,0,0.25)] sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Centro de administración
          </p>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            ¡Bienvenido, {nombre}!
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Supervisa las cuentas, el catálogo,
            las asignaciones y el estado de los
            entrenamientos con información real.
          </p>

          <span className="mt-5 inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-200">
            ✓ Identidad y rol verificados
          </span>
        </section>

        {/* ============================================
            AVISO DE CONFIGURACION
        ============================================ */}

        {!habilitado && (
          <div
            role="alert"
            className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm leading-6 text-amber-200"
          >
            Estadísticas no disponibles.
            Falta configurar la credencial privada
            de consulta en el servidor.
            No se muestran cifras inventadas.
          </div>
        )}

        {/* ============================================
            INDICADORES
        ============================================ */}

        <section aria-labelledby="titulo-indicadores">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Panorama general
          </p>

          <h2
            id="titulo-indicadores"
            className="mt-2 text-2xl font-extrabold"
          >
            Indicadores del gimnasio
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Totales consultados desde Supabase.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicadores.map((item) => (
              <Indicador
                key={item.titulo}
                {...item}
              />
            ))}
          </div>
        </section>

        {/* ============================================
            MODULOS
        ============================================ */}

        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Herramientas de control
          </p>

          <h2 className="mt-2 text-2xl font-extrabold">
            Módulos de administración
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Los módulos disponibles son de consulta.
            Las operaciones de escritura requieren
            permisos auditados.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modulos.map((modulo) => (
              <Modulo
                key={modulo.titulo}
                {...modulo}
              />
            ))}
          </div>
        </section>

        {/* ============================================
            DIRECTORIO DE USUARIOS
        ============================================ */}

        <section
          id="usuarios"
          className="scroll-mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#16283f] to-[#101b2f] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Administración de cuentas
              </p>

              <h2 className="mt-2 text-2xl font-extrabold">
                Directorio de usuarios
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Consulta y búsqueda de hasta 25
                registros por solicitud.
              </p>
            </div>

            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
              Solo lectura
            </span>
          </div>

          <form
            action="/administrador"
            method="get"
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <label
              htmlFor="buscar-usuario"
              className="sr-only"
            >
              Buscar por nombre
            </label>

            <input
              id="buscar-usuario"
              name="q"
              type="search"
              maxLength={60}
              defaultValue={busqueda}
              placeholder="Buscar usuario por nombre..."
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-[#081526] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
            />

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-[#07121e] transition hover:bg-cyan-300"
            >
              Buscar
            </button>

            <Link
              href="/administrador#usuarios"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Limpiar
            </Link>
          </form>

          <div className="mt-5 space-y-3">
            {!habilitado || errorUsuarios ? (
              <p
                role="alert"
                className="rounded-xl border border-amber-400/15 bg-amber-400/10 p-5 text-sm text-amber-200"
              >
                No se pudo consultar el directorio.
                Revisa la configuración y los permisos.
              </p>
            ) : usuarios.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#081526] p-6 text-sm text-slate-400">
                No se encontraron usuarios.
              </p>
            ) : (
              usuarios.map((usuario) => (
                <article
                  key={usuario.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b192c] p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-black text-cyan-200">
                      {(
                        usuario.nombre_completo?.trim()[0] ??
                        "U"
                      ).toUpperCase()}
                    </span>

                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">
                        {usuario.nombre_completo ||
                          "Usuario sin nombre"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Cuenta registrada
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
                    {roles.has(usuario.id)
                      ? nombreRol(
                          roles.get(usuario.id)!
                        )
                      : "Rol no disponible"}
                  </span>
                </article>
              ))
            )}
          </div>
        </section>

        {/* ============================================
            ASIGNACIONES DE ENTRENADORES
        ============================================ */}

        <section
          id="asignaciones"
          className="scroll-mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#16283f] to-[#101b2f] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Organización del gimnasio
              </p>

              <h2 className="mt-2 text-2xl font-extrabold">
                Clientes y entrenadores asignados
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Consulta quién supervisa a cada
                cliente, la fecha y el estado de
                la relación.
              </p>
            </div>

            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
              {totalAsignaciones === null
                ? "Sin datos"
                : `${totalAsignaciones} relaciones`}
            </span>
          </div>

          {!habilitado || errorAsignaciones ? (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-200"
            >
              No se pudieron consultar las
              asignaciones. Revisa los permisos
              y la conexión.
            </p>
          ) : asignacionesVista.length === 0 ? (
            <p className="mt-6 rounded-xl border border-white/10 bg-[#081526] p-6 text-sm text-slate-400">
              No existen asignaciones registradas.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {asignacionesVista.map((relacion) => (
                <article
                  key={relacion.clienteId}
                  className="min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br from-[#142840] to-[#0a1729] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.17)] transition-[border-color,transform] duration-200 motion-safe:hover:-translate-y-1 hover:border-cyan-400/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Relación cliente-entrenador
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                        relacion.activa
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                          : "border-slate-400/20 bg-white/5 text-slate-300"
                      }`}
                    >
                      {relacion.activa
                        ? "Activa"
                        : "Inactiva"}
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl border border-white/10 bg-[#081526] p-4">
                    <p className="text-xs text-slate-400">
                      Cliente
                    </p>

                    <p className="mt-1 break-words font-bold text-white">
                      {relacion.cliente}
                    </p>
                  </div>

                  <div
                    className="my-3 text-center text-cyan-300"
                    aria-hidden="true"
                  >
                    ↓
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#081526] p-4">
                    <p className="text-xs text-slate-400">
                      Entrenador responsable
                    </p>

                    <p className="mt-1 break-words font-bold text-white">
                      {relacion.entrenador}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <span
                      className={`text-xs font-bold ${
                        relacion.valida
                          ? "text-emerald-300"
                          : "text-amber-300"
                      }`}
                    >
                      {relacion.valida
                        ? "✓ Roles correctos"
                        : "⚠ Revisar relación"}
                    </span>

                    <span className="text-xs text-slate-400">
                      {relacion.fecha
                        ? new Date(
                            relacion.fecha
                          ).toLocaleDateString(
                            "es-PE",
                            {
                              timeZone:
                                "America/Lima",
                            }
                          )
                        : "Sin fecha"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalAsignaciones !== null &&
            totalAsignaciones > 100 && (
              <p className="mt-4 text-xs text-amber-200">
                Se muestran las primeras 100 relaciones.
                La paginación está pendiente.
              </p>
            )}

          <p className="mt-5 text-xs leading-6 text-slate-400">
            Consulta de solo lectura.
            Las reasignaciones y bajas requieren
            una función segura con auditoría.
          </p>
        </section>

        {/* ============================================
            SUPERVISION DE SESIONES
        ============================================ */}

        <section
          id="sesiones"
          className="scroll-mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#16283f] to-[#101b2f] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-7"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Seguimiento operativo
          </p>

          <h2 className="mt-2 text-2xl font-extrabold">
            Estado de las sesiones
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Distribución de estados registrados,
            no resultados científicos de adherencia.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {estadosSesion.map((item) => {
              const porcentaje =
                cantidadSesiones !== null &&
                cantidadSesiones > 0 &&
                item.valor !== null
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        (item.valor /
                          cantidadSesiones) *
                          100
                      )
                    )
                  : null;

              return (
                <article
                  key={item.nombre}
                  className="rounded-2xl border border-white/10 bg-[#0a1728] p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-200">
                      {item.nombre}
                    </h3>

                    <span
                      className={`text-xl font-black ${item.texto}`}
                    >
                      {numero(item.valor)}
                    </span>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                    {porcentaje !== null && (
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{
                          width: `${porcentaje}%`,
                        }}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-5 text-xs leading-6 text-slate-400">
            Las sesiones canceladas forman parte
            del total general. Una sesión pendiente
            no es automáticamente una ausencia.
          </p>
        </section>

        {/* ============================================
            SEGURIDAD
        ============================================ */}

        <section className="rounded-3xl border border-cyan-400/15 bg-gradient-to-r from-[#0d283b] to-[#1a1836] p-6 shadow-[0_14px_36px_rgba(0,0,0,0.17)]">
          <div className="flex items-start gap-4">
            <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
              <Icono tipo="seguridad" />
            </span>

            <div>
              <h2 className="text-lg font-bold">
                Seguridad y control de acceso
              </h2>

              <p className="mt-2 text-sm leading-7 text-slate-300">
                El panel comprueba la identidad
                y el rol antes de efectuar
                consultas globales. Crear usuarios,
                cambiar roles y editar asignaciones
                requerirá API protegidas y
                registro de auditoría.
              </p>

              <p className="mt-3 text-xs text-amber-200">
                La verificación del rol no sustituye
                una auditoría integral de seguridad.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================
            PIE DE PAGINA
        ============================================ */}

        <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
          Evolution Center Fit 2.0 · Centro administrativo
        </footer>
      </div>
    </main>
  );
}

// =====================================================
// PAGINA PRINCIPAL
// =====================================================

export default function AdministradorPage({
  searchParams,
}: Props) {
  return (
    <Suspense fallback={<EstadoCarga />}>
      <ContenidoAdministrador
        searchParams={searchParams}
      />
    </Suspense>
  );
}
