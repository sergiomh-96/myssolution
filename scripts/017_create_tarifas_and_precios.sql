-- Create tarifas table
CREATE TABLE IF NOT EXISTS public.tarifas (
  id_tarifa UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (fecha_fin IS NULL OR fecha_fin > fecha_inicio)
);

-- Add comment to tarifas table
COMMENT ON TABLE public.tarifas IS 'Tabla de tarifas con periodos de vigencia';

-- Enable RLS on tarifas
ALTER TABLE public.tarifas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tarifas
-- All authenticated users can view tarifas
CREATE POLICY "tarifas_select" ON public.tarifas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins and managers can create tarifas
CREATE POLICY "tarifas_insert" ON public.tarifas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Only admins and managers can update tarifas
CREATE POLICY "tarifas_update" ON public.tarifas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Only admins can delete tarifas
CREATE POLICY "tarifas_delete" ON public.tarifas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create precios_producto table
CREATE TABLE IF NOT EXISTS public.precios_producto (
  id_precio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  id_tarifa UUID NOT NULL REFERENCES public.tarifas(id_tarifa) ON DELETE CASCADE,
  precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_product_tarifa UNIQUE (id_producto, id_tarifa)
);

-- Add comment to precios_producto table
COMMENT ON TABLE public.precios_producto IS 'Precios de productos por tarifa';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_precios_producto_producto ON public.precios_producto(id_producto);
CREATE INDEX IF NOT EXISTS idx_precios_producto_tarifa ON public.precios_producto(id_tarifa);

-- Enable RLS on precios_producto
ALTER TABLE public.precios_producto ENABLE ROW LEVEL SECURITY;

-- RLS Policies for precios_producto
-- All authenticated users can view precios_producto
CREATE POLICY "precios_producto_select" ON public.precios_producto
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins and managers can create precios_producto
CREATE POLICY "precios_producto_insert" ON public.precios_producto
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Only admins and managers can update precios_producto
CREATE POLICY "precios_producto_update" ON public.precios_producto
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Only admins can delete precios_producto
CREATE POLICY "precios_producto_delete" ON public.precios_producto
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tarifas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_precios_producto_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER tarifas_updated_at
  BEFORE UPDATE ON public.tarifas
  FOR EACH ROW
  EXECUTE FUNCTION update_tarifas_updated_at();

CREATE TRIGGER precios_producto_updated_at
  BEFORE UPDATE ON public.precios_producto
  FOR EACH ROW
  EXECUTE FUNCTION update_precios_producto_updated_at();
