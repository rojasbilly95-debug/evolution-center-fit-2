
import "server-only";

import {
  createClient as crearAdmin,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// ============================================
// EVOLUTION CENTER FIT 2.0
// FASE 111.18 - REPORTES ADMINISTRATIVOS
// Consultas agregadas de solo lectura.
// ============================================

export const SECCIONES = [
  {
    id: "personas",
    titulo: "Personas y roles",
    nota: "Cuentas y roles del gimnasio.",
  },
  {
    id: "catalogo",
    titulo: "Catálogo",
    nota: "Rutinas y ejercicios almacenados.",
  },
  {
    id: "planes",
    titulo: "Planes de entrenamiento",
    nota: "Asignaciones registradas y vigentes.",
  },
  {
    id: "sesiones",
    titulo: "Sesiones y asistencia",
    nota: "Estados operativos de las sesiones.",
  },
  {
    id: "ia",
    titulo: "Supervisión de IA",
    nota: "Revisiones y eventos de evaluación guardados.",
  },
  {
    id: "estudio",
    titulo: "Inscripción al estudio",
    nota: "Participantes por grupo; no son resultados pre/post.",
  },
] as const;

type Filtro =
  | {
      tipo: "eq";
      campo: string;
      valor: string;
    }
  | {
      tipo: "in";
      campo: string;
      valores: string[];
    };

type Definicion = {
  codigo: string;
  seccion: string;
  titulo: string;
  descripcion: string;
  tabla: string;
  columna: string;
  filtro?: Filtro;
};

const DEFINICIONES: Definicion[] = [
  // PERSONAS
  {
    codigo: "perfiles",
    seccion: "personas",
    titulo: "Perfiles registrados",
    descripcion: "Filas de usuarios",
    tabla: "usuarios",
    columna: "id",
  },
  {
    codigo: "clientes",
    seccion: "personas",
    titulo: "Clientes",
    descripcion: "Rol cliente",
    tabla: "usuario_roles",
    columna: "usuario_id",
    filtro: {
      tipo: "eq",
      campo: "rol",
      valor: "cliente",
    },
  },
  {
    codigo: "entrenadores",
    seccion: "personas",
    titulo: "Entrenadores",
    descripcion: "Rol entrenador",
    tabla: "usuario_roles",
    columna: "usuario_id",
    filtro: {
      tipo: "eq",
      campo: "rol",
      valor: "entrenador",
    },
  },
  {
    codigo: "administradores",
    seccion: "personas",
    titulo: "Administradores",
    descripcion: "Rol administrador",
    tabla: "usuario_roles",
    columna: "usuario_id",
    filtro: {
      tipo: "eq",
      campo: "rol",
      valor: "administrador",
    },
  },

  // CATALOGO
  {
    codigo: "rutinas",
    seccion: "catalogo",
    titulo: "Rutinas",
    descripcion: "Total en el catálogo",
    tabla: "rutinas",
    columna: "id",
  },
  {
    codigo: "ejercicios",
    seccion: "catalogo",
    titulo: "Ejercicios",
    descripcion: "Total en el catálogo",
    tabla: "ejercicios",
    columna: "id",
  },

  // PLANES
  {
    codigo: "planes",
    seccion: "planes",
    titulo: "Planes registrados",
    descripcion: "Asignaciones de rutinas",
    tabla: "asignaciones_rutinas",
    columna: "id",
  },
  {
    codigo: "planes_vigentes",
    seccion: "planes",
    titulo: "Planes vigentes",
    descripcion: "Programada, activa o pausada",
    tabla: "asignaciones_rutinas",
    columna: "id",
    filtro: {
      tipo: "in",
      campo: "estado",
      valores: [
        "programada",
        "activa",
        "pausada",
      ],
    },
  },

  // SESIONES
  {
    codigo: "sesiones",
    seccion: "sesiones",
    titulo: "Sesiones totales",
    descripcion: "Todos los estados",
    tabla: "sesiones_entrenamiento",
    columna: "id",
  },
  {
    codigo: "realizadas",
    seccion: "sesiones",
    titulo: "Realizadas",
    descripcion: "Asistencia confirmada",
    tabla: "sesiones_entrenamiento",
    columna: "id",
    filtro: {
      tipo: "eq",
      campo: "estado",
      valor: "realizada",
    },
  },
  {
    codigo: "ausentes",
    seccion: "sesiones",
    titulo: "Ausentes",
    descripcion: "Ausencia confirmada",
    tabla: "sesiones_entrenamiento",
    columna: "id",
    filtro: {
      tipo: "eq",
      campo: "estado",
      valor: "ausente",
    },
  },
  {
    codigo: "programadas",
    seccion: "sesiones",
    titulo: "Programadas",
    descripcion: "Pendientes de resolver",
    tabla: "sesiones_entrenamiento",
    columna: "id",
    filtro: {
      tipo: "eq",
      campo: "estado",
      valor: "programada",
    },
  },
  {
    codigo: "en_curso",
    seccion: "sesiones",
    titulo: "En curso",
    descripcion: "Sesiones iniciadas",
    tabla: "sesiones_entrenamiento",
    columna: "id",
    filtro: {
      tipo: "eq",
      campo: "estado",
      valor: "en_curso",
    },
  },

  // INTELIGENCIA ARTIFICIAL
  {
    codigo: "revisiones",
    seccion: "ia",
    titulo: "Revisiones",
    descripcion: "Decisiones de entrenadores, GE y GC",
    tabla: "revisiones_rutinas",
    columna: "id",
  },
  {
    codigo: "aprobadas",
    seccion: "ia",
    titulo: "Aprobadas",
    descripcion: "Decisiones de aprobación",
    tabla: "revisiones_rutinas",
    columna: "id",
    filtro: {
      tipo: "eq",
      campo: "decision",
      valor: "aprobada",
    },
  },
  {
    codigo: "ajustes",
    seccion: "ia",
    titulo: "Ajustes solicitados",
    descripcion: "Decisiones de ajuste",
    tabla: "revisiones_rutinas",
    columna: "id",
    filtro: {
      tipo: "eq",
      campo: "decision",
      valor: "ajustes_solicitados",
    },
  },
  {
    codigo: "rechazadas",
    seccion: "ia",
    titulo: "Rechazadas",
    descripcion: "Decisiones de rechazo",
    tabla: "revisiones_rutinas",
    columna: "id",
    filtro: {
      tipo: "eq",
      campo: "decision",
      valor: "rechazada",
    },
  },
  {
    codigo: "evaluaciones_ia",
    seccion: "ia",
    titulo: "Eventos IA",
    descripcion: "Evaluaciones guardadas desde la auditoría",
    tabla: "ecf_eventos_evaluacion_ia",
    columna: "id",
  },
  {
    codigo: "errores_ia",
    seccion: "ia",
    titulo: "Errores API IA",
    descripcion: "Eventos de error HTTP 5xx",
    tabla: "ecf_eventos_evaluacion_ia",
    columna: "id",
    filtro: {
      tipo: "eq",
      campo: "resultado",
      valor: "error_api",
    },
  },

  // INVESTIGACION
  {
    codigo: "ge",
    seccion: "estudio",
    titulo: "Inscritos GE",
    descripcion: "Grupo experimental; incluye demos",
    tabla: "participantes_estudio",
    columna: "cliente_id",
    filtro: {
      tipo: "eq",
      campo: "grupo_estudio",
      valor: "GE",
    },
  },
  {
    codigo: "gc",
    seccion: "estudio",
    titulo: "Inscritos GC",
    descripcion: "Grupo control; incluye demos",
    tabla: "participantes_estudio",
    columna: "cliente_id",
    filtro: {
      tipo: "eq",
      campo: "grupo_estudio",
      valor: "GC",
    },
  },
];

export type Metrica = {
  codigo: string;
  seccion: string;
  titulo: string;
  descripcion: string;
  valor: number | null;
};

// ============================================
// AUTORIZACION DEL ADMINISTRADOR
// ============================================

export async function accesoAdministrador(): Promise<
  | { estado: "sin_sesion" }
  | { estado: "sin_permiso" }
  | { estado: "sin_configuracion" }
  | {
      estado: "autorizado";
      db: SupabaseClient;
    }
> {
  const sesion = await createClient();

  const {
    data: identidad,
    error: errorIdentidad,
  } = await sesion.auth.getUser();

  if (errorIdentidad || !identidad.user) {
    return { estado: "sin_sesion" };
  }

  const {
    data: rol,
    error: errorRol,
  } = await sesion
    .from("usuario_roles")
    .select("rol")
    .eq("usuario_id", identidad.user.id)
    .maybeSingle();

  if (
    errorRol ||
    rol?.rol !== "administrador"
  ) {
    return { estado: "sin_permiso" };
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clave =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !clave) {
    return { estado: "sin_configuracion" };
  }

  const db = crearAdmin(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return {
    estado: "autorizado",
    db,
  };
}

// ============================================
// CONSULTAR INDICADORES REALES
// ============================================

export async function obtenerMetricas(
  db: SupabaseClient
): Promise<Metrica[]> {
  return Promise.all(
    DEFINICIONES.map(async (item) => {
      try {
        let consulta = db
          .from(item.tabla)
          .select(item.columna, {
            count: "exact",
            head: true,
          });

        if (item.filtro?.tipo === "eq") {
          consulta = consulta.eq(
            item.filtro.campo,
            item.filtro.valor
          );
        } else if (item.filtro?.tipo === "in") {
          consulta = consulta.in(
            item.filtro.campo,
            item.filtro.valores
          );
        }

        const {
          count,
          error,
        } = await consulta;

        if (error) {
          console.error(
            "Reporte administrativo:",
            item.codigo,
            error.code
          );
        }

        return {
          codigo: item.codigo,
          seccion: item.seccion,
          titulo: item.titulo,
          descripcion: item.descripcion,
          valor: error ? null : count,
        };
      } catch {
        console.error(
          "Reporte administrativo: consulta fallida",
          item.codigo
        );

        return {
          codigo: item.codigo,
          seccion: item.seccion,
          titulo: item.titulo,
          descripcion: item.descripcion,
          valor: null,
        };
      }
    })
  );
}

// ============================================
// CALCULAR ASISTENCIA CONFIRMADA
// ============================================

export function asistenciaConfirmada(
  metricas: Metrica[]
): string {
  const hechas = metricas.find(
    (x) => x.codigo === "realizadas"
  )?.valor;

  const ausentes = metricas.find(
    (x) => x.codigo === "ausentes"
  )?.valor;

  if (
    hechas == null ||
    ausentes == null ||
    hechas + ausentes === 0
  ) {
    return "Sin datos";
  }

  return `${
    Math.round(
      (hechas / (hechas + ausentes)) * 100
    )
  }%`;
}
