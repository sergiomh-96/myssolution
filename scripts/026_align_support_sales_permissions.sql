-- Migration: Align technical support (support_agent) permissions with sales_rep
-- Grant support_agent access to Clientes and Ofertas modules

-- 1. CUSTOMERS
-- support_agent already has SELECT access to all customers (from 003_create_customers.sql)

-- Update INSERT policy for customers
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'sales_rep', 'support_agent')
    )
  );

-- Update UPDATE policy for customers
DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role IN ('sales_rep', 'support_agent') AND (assigned_to = auth.uid() OR created_by = auth.uid()))
      )
    )
  );

-- 2. OFFERS
-- Update SELECT policy for offers
DROP POLICY IF EXISTS "offers_select" ON public.offers;
CREATE POLICY "offers_select" ON public.offers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager', 'viewer')
        OR (role IN ('sales_rep', 'support_agent') AND (created_by = auth.uid() OR assigned_to = auth.uid()))
      )
    )
  );

-- Update INSERT policy for offers
DROP POLICY IF EXISTS "offers_insert" ON public.offers;
CREATE POLICY "offers_insert" ON public.offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'sales_rep', 'support_agent')
    )
    AND created_by = auth.uid()
  );

-- Update UPDATE policy for offers
DROP POLICY IF EXISTS "offers_update" ON public.offers;
CREATE POLICY "offers_update" ON public.offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role IN ('sales_rep', 'support_agent') AND created_by = auth.uid())
      )
    )
  );

-- 3. OFFER ITEMS
-- We use a more generic policy for offer_items since it often depends on offer visibility
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
      )
    )
  );
