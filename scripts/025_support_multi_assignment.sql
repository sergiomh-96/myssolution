-- Migration: Support Assistance Multiple Assignments
CREATE TABLE IF NOT EXISTS public.support_assistance_assignments (
  id BIGSERIAL PRIMARY KEY,
  assistance_id BIGINT NOT NULL REFERENCES public.support_assistances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assistance_id, user_id)
);

-- RLS
ALTER TABLE public.support_assistance_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow auth select assignments" ON public.support_assistance_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow auth insert assignments" ON public.support_assistance_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow auth delete assignments" ON public.support_assistance_assignments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Update support_assistances SELECT policy
DROP POLICY IF EXISTS "support_assistances_select" ON public.support_assistances;
CREATE POLICY "support_assistances_select" ON public.support_assistances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager', 'viewer')
        OR (role IN ('support_agent', 'sales_rep') AND (
          created_by = auth.uid() 
          OR empleado_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.support_assistance_assignments WHERE assistance_id = support_assistances.id AND user_id = auth.uid())
        ))
      )
    )
  );

-- Update support_assistances UPDATE policy
DROP POLICY IF EXISTS "support_assistances_update" ON public.support_assistances;
CREATE POLICY "support_assistances_update" ON public.support_assistances
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role IN ('support_agent', 'sales_rep') AND (
          created_by = auth.uid() 
          OR empleado_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.support_assistance_assignments WHERE assistance_id = support_assistances.id AND user_id = auth.uid())
        ))
      )
    )
  );
