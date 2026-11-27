-- EVOLUTION CENTER FIT 2.0
-- COHERENCIA DE PERFILES, UBICACIONES Y EVIDENCIAS
-- Migración aditiva: no modifica registros históricos.

-- 1. EQUIPAMIENTO SEGÚN LUGAR

ALTER TABLE public.perfiles_clientes
  ADD COLUMN IF NOT EXISTS equipamiento_casa text[],
  ADD COLUMN IF NOT EXISTS equipamiento_gimnasio text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'perfiles_equipamiento_casa_valido'
      AND conrelid = 'public.perfiles_clientes'::regclass
  ) THEN
    ALTER TABLE public.perfiles_clientes
      ADD CONSTRAINT perfiles_equipamiento_casa_valido
      CHECK (
        equipamiento_casa <@ ARRAY[
          'mancuernas',
          'maquinas',
          'bandas',
          'barra',
          'peso_corporal'
        ]::text[]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'perfiles_equipamiento_gimnasio_valido'
      AND conrelid = 'public.perfiles_clientes'::regclass
  ) THEN
    ALTER TABLE public.perfiles_clientes
      ADD CONSTRAINT perfiles_equipamiento_gimnasio_valido
      CHECK (
        equipamiento_gimnasio <@ ARRAY[
          'mancuernas',
          'maquinas',
          'bandas',
          'barra',
          'peso_corporal'
        ]::text[]
      );
  END IF;
END $$;

COMMENT ON COLUMN public.perfiles_clientes.equipamiento_casa IS
  'Equipamiento declarado disponible en casa. NULL significa que todavía no se clasificó.';

COMMENT ON COLUMN public.perfiles_clientes.equipamiento_gimnasio IS
  'Equipamiento declarado disponible en gimnasio. NULL significa que todavía no se clasificó.';


-- 2. VERIFICACIÓN DEL PERFIL POR EL ENTRENADOR

CREATE TABLE IF NOT EXISTS public.verificaciones_perfil_entrenador (
  cliente_id uuid PRIMARY KEY
    REFERENCES auth.users(id) ON DELETE CASCADE,

  entrenador_id uuid NOT NULL
    REFERENCES auth.users(id),

  huella_perfil text NOT NULL
    CHECK (huella_perfil ~ '^[a-f0-9]{64}$'),

  estado text NOT NULL
    CHECK (
      estado IN (
        'verificado',
        'requiere_correccion'
      )
    ),

  observaciones text NOT NULL
    CHECK (
      char_length(btrim(observaciones))
      BETWEEN 10 AND 1000
    ),

  revisado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS
  verificaciones_perfil_entrenador_responsable_idx
ON public.verificaciones_perfil_entrenador (
  entrenador_id
);

ALTER TABLE public.verificaciones_perfil_entrenador
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON public.verificaciones_perfil_entrenador
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.verificaciones_perfil_entrenador
TO service_role;


-- 3. UBICACIÓN Y EVIDENCIA DE CADA SESIÓN

CREATE TABLE IF NOT EXISTS public.sesiones_ubicaciones_evidencias (
  sesion_id bigint PRIMARY KEY
    REFERENCES public.sesiones_entrenamiento(id)
    ON DELETE RESTRICT,

  lugar text NOT NULL
    CHECK (
      lugar IN ('casa', 'gimnasio')
    ),

  estado_verificacion text NOT NULL
    DEFAULT 'pendiente'
    CHECK (
      estado_verificacion IN (
        'pendiente',
        'declarada',
        'verificada'
      )
    ),

  fuente_verificacion text NULL
    CHECK (
      fuente_verificacion IS NULL
      OR fuente_verificacion IN (
        'presencial',
        'videollamada_consentida',
        'entrevista',
        'registro_cliente'
      )
    ),

  observaciones text NULL
    CHECK (
      observaciones IS NULL
      OR char_length(observaciones) <= 1000
    ),

  registrado_por uuid NOT NULL
    REFERENCES auth.users(id),

  verificado_por uuid NULL
    REFERENCES auth.users(id),

  verificado_en timestamptz NULL,

  actualizado_en timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT evidencias_verificadas_exigen_justificacion
    CHECK (
      estado_verificacion <> 'verificada'
      OR (
        fuente_verificacion IN (
  'presencial',
  'videollamada_consentida'
)
AND verificado_por IS NOT NULL
AND verificado_en IS NOT NULL
        AND char_length(
          btrim(coalesce(observaciones, ''))
        ) >= 10
      )
    )
);

CREATE INDEX IF NOT EXISTS
  sesiones_ubicaciones_lugar_estado_idx
ON public.sesiones_ubicaciones_evidencias (
  lugar,
  estado_verificacion
);

ALTER TABLE public.sesiones_ubicaciones_evidencias
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON public.sesiones_ubicaciones_evidencias
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.sesiones_ubicaciones_evidencias
TO service_role;


-- 4. HISTORIAL DE VERIFICACIONES

CREATE TABLE IF NOT EXISTS public.auditoria_verificaciones_perfil (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id uuid NOT NULL,
  entrenador_id uuid NOT NULL,
  antes jsonb,
  despues jsonb NOT NULL,
  ocurrido_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auditoria_ubicaciones_sesion (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sesion_id bigint NOT NULL,
  registrado_por uuid NOT NULL,
  antes jsonb,
  despues jsonb NOT NULL,
  ocurrido_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auditoria_verificaciones_perfil
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auditoria_ubicaciones_sesion
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON public.auditoria_verificaciones_perfil
FROM PUBLIC, anon, authenticated;

REVOKE ALL
ON public.auditoria_ubicaciones_sesion
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON public.auditoria_verificaciones_perfil
TO service_role;

GRANT SELECT
ON public.auditoria_ubicaciones_sesion
TO service_role;


-- 5. FUNCIÓN PARA AUDITAR VERIFICACIONES

CREATE OR REPLACE FUNCTION public.auditar_verificacion_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.auditoria_verificaciones_perfil (
    cliente_id,
    entrenador_id,
    antes,
    despues
  )
  VALUES (
    NEW.cliente_id,
    NEW.entrenador_id,
    CASE
      WHEN TG_OP = 'UPDATE'
      THEN to_jsonb(OLD)
      ELSE NULL
    END,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;


-- 6. FUNCIÓN PARA AUDITAR UBICACIONES

CREATE OR REPLACE FUNCTION public.auditar_ubicacion_sesion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.estado_verificacion = 'verificada'
  THEN
    RAISE EXCEPTION
      'Una evidencia verificada no se puede sobreescribir.';
  END IF;

  INSERT INTO public.auditoria_ubicaciones_sesion (
    sesion_id,
    registrado_por,
    antes,
    despues
  )
  VALUES (
    NEW.sesion_id,
    NEW.registrado_por,
    CASE
      WHEN TG_OP = 'UPDATE'
      THEN to_jsonb(OLD)
      ELSE NULL
    END,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION public.auditar_verificacion_perfil()
FROM PUBLIC, anon, authenticated;

REVOKE ALL
ON FUNCTION public.auditar_ubicacion_sesion()
FROM PUBLIC, anon, authenticated;


-- 7. ACTIVAR AUDITORÍA

DROP TRIGGER IF EXISTS
  trg_auditar_verificacion_perfil
ON public.verificaciones_perfil_entrenador;

CREATE TRIGGER trg_auditar_verificacion_perfil
AFTER INSERT OR UPDATE
ON public.verificaciones_perfil_entrenador
FOR EACH ROW
EXECUTE FUNCTION public.auditar_verificacion_perfil();


DROP TRIGGER IF EXISTS
  trg_auditar_ubicacion_sesion
ON public.sesiones_ubicaciones_evidencias;

CREATE TRIGGER trg_auditar_ubicacion_sesion
BEFORE INSERT OR UPDATE
ON public.sesiones_ubicaciones_evidencias
FOR EACH ROW
EXECUTE FUNCTION public.auditar_ubicacion_sesion();