-- Migration: Update support assistance permissions to match user request
-- 1. All roles can create (insert)
-- 2. admin and manager (gerente) can see and edit all
-- 3. support_agent (technical support) and sales_rep can only see and edit their own or assigned

-- Update SELECT policy
DROP POLICY IF EXISTS "support_assistances_select" ON public.support_assistances;
CREATE POLICY "support_assistances_select" ON public.support_assistances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager', 'viewer')
        OR (role IN ('support_agent', 'sales_rep') AND (created_by = auth.uid() OR empleado_id = auth.uid()))
      )
    )
  );

-- Update INSERT policy (allow all authenticated)
DROP POLICY IF EXISTS "support_assistances_insert" ON public.support_assistances;
CREATE POLICY "support_assistances_insert" ON public.support_assistances
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update UPDATE policy
DROP POLICY IF EXISTS "support_assistances_update" ON public.support_assistances;
CREATE POLICY "support_assistances_update" ON public.support_assistances
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role IN ('support_agent', 'sales_rep') AND (created_by = auth.uid() OR empleado_id = auth.uid()))
      )
    )
  );

-- Update DELETE policy (Admins and Managers)
DROP POLICY IF EXISTS "support_assistances_delete" ON public.support_assistances;
CREATE POLICY "support_assistances_delete" ON public.support_assistances
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
