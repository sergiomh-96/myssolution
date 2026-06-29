-- Migration: Fix offer update permissions (RLS) for assigned and collaborating users
-- Also update offer_items RLS to allow collaborating users to modify items

-- 1. Update UPDATE policy for offers to allow assigned and collaborating users to update
DROP POLICY IF EXISTS "offers_update" ON public.offers;

CREATE POLICY "offers_update" ON public.offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role IN ('sales_rep', 'support_agent') AND (
          created_by = auth.uid()
          OR assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.offer_assignments
            WHERE offer_id = id AND user_id = auth.uid()
          )
        ))
      )
    )
  );

-- 2. Update ALL policy for offer_items to allow collaborating users to manage items
DROP POLICY IF EXISTS "offer_items_all" ON public.offer_items;

CREATE POLICY "offer_items_all" ON public.offer_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
      AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        OR o.created_by = auth.uid()
        OR o.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.offer_assignments oa
          WHERE oa.offer_id = o.id AND oa.user_id = auth.uid()
        )
      )
    )
  );
