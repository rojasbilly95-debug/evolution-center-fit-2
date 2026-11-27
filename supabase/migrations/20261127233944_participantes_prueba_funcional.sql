CREATE TABLE IF NOT EXISTS public.participantes_prueba_funcional (
    cliente_id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    grupo_prueba TEXT NOT NULL
        CHECK (grupo_prueba IN ('GE', 'GC')),

    fecha_inicio_prueba DATE NOT NULL
        DEFAULT ((now() AT TIME ZONE 'America/Lima')::date),

    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.participantes_prueba_funcional
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.participantes_prueba_funcional
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.participantes_prueba_funcional
TO service_role;