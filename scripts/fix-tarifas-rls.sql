-- Fix RLS policies for tarifas and precios_producto tables
-- Drop existing policies if present, then recreate

-- tarifas: INSERT
DROP POLICY IF EXISTS "tarifas_insert" ON public.tarifas;
CREATE POLICY "tarifas_insert" ON public.tarifas
  FOR INSERT TO authenticated WITH CHECK (true);

-- tarifas: UPDATE
DROP POLICY IF EXISTS "tarifas_update" ON public.tarifas;
CREATE POLICY "tarifas_update" ON public.tarifas
  FOR UPDATE TO authenticated USING (true);

-- precios_producto: INSERT
DROP POLICY IF EXISTS "precios_producto_insert" ON public.precios_producto;
CREATE POLICY "precios_producto_insert" ON public.precios_producto
  FOR INSERT TO authenticated WITH CHECK (true);

-- precios_producto: UPDATE
DROP POLICY IF EXISTS "precios_producto_update" ON public.precios_producto;
CREATE POLICY "precios_producto_update" ON public.precios_producto
  FOR UPDATE TO authenticated USING (true);

-- precios_producto: DELETE
DROP POLICY IF EXISTS "precios_producto_delete" ON public.precios_producto;
CREATE POLICY "precios_producto_delete" ON public.precios_producto
  FOR DELETE TO authenticated USING (true);
