-- Fix RLS policies for tarifas and precios_producto tables
-- These tables only had SELECT policies, blocking inserts/updates

-- tarifas: add INSERT and UPDATE for authenticated users (admin role handled in app layer)
CREATE POLICY IF NOT EXISTS "tarifas_insert" ON public.tarifas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "tarifas_update" ON public.tarifas
  FOR UPDATE TO authenticated USING (true);

-- precios_producto: add INSERT, UPDATE, DELETE for authenticated users
CREATE POLICY IF NOT EXISTS "precios_producto_insert" ON public.precios_producto
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "precios_producto_update" ON public.precios_producto
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "precios_producto_delete" ON public.precios_producto
  FOR DELETE TO authenticated USING (true);
