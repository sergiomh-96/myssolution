-- Migration: Change support_assistances.id from UUID to BIGSERIAL (Fixed with Policy handling)

BEGIN;

-- 1. Drop foreign key and POLICIES that depend on the column
ALTER TABLE public.support_assistance_items DROP CONSTRAINT IF EXISTS support_assistance_items_assistance_id_fkey;
DROP POLICY IF EXISTS "support_assistance_items_select" ON public.support_assistance_items;
DROP POLICY IF EXISTS "support_assistance_items_all" ON public.support_assistance_items;

-- 2. Añadir nueva columna ID numérica en asistencias
ALTER TABLE public.support_assistances ADD COLUMN new_id BIGSERIAL;

-- 3. Crear columna temporal en ítems para el mapeo
ALTER TABLE public.support_assistance_items ADD COLUMN new_assistance_id BIGINT;

-- 4. Mapear los IDs antiguos a los nuevos
UPDATE public.support_assistance_items i
SET new_assistance_id = s.new_id
FROM public.support_assistances s
WHERE i.assistance_id = s.id;

-- 5. Quitar la clave primaria antigua
ALTER TABLE public.support_assistances DROP CONSTRAINT IF EXISTS support_assistances_pkey CASCADE;

-- 6. Reemplazar columnas en la tabla de ítems
ALTER TABLE public.support_assistance_items DROP COLUMN assistance_id;
ALTER TABLE public.support_assistance_items RENAME COLUMN new_assistance_id TO assistance_id;
ALTER TABLE public.support_assistance_items ALTER COLUMN assistance_id SET NOT NULL;

-- 7. Reemplazar ID en la tabla de asistencias
ALTER TABLE public.support_assistances DROP COLUMN id;
ALTER TABLE public.support_assistances RENAME COLUMN new_id TO id;
ALTER TABLE public.support_assistances ADD PRIMARY KEY (id);

-- 8. Restaurar la clave foránea
ALTER TABLE public.support_assistance_items ADD CONSTRAINT support_assistance_items_assistance_id_fkey 
  FOREIGN KEY (assistance_id) REFERENCES public.support_assistances(id) ON DELETE CASCADE;

-- 9. RECREAR POLÍTICAS RLS
CREATE POLICY "support_assistance_items_select" ON public.support_assistance_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_assistances sa
      WHERE sa.id = assistance_id
    )
  );

CREATE POLICY "support_assistance_items_all" ON public.support_assistance_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.support_assistances sa
      WHERE sa.id = assistance_id
      AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        OR sa.created_by = auth.uid()
        OR sa.empleado_id = auth.uid()
      )
    )
  );

COMMIT;
