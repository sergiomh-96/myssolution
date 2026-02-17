-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca TEXT CHECK (marca IN ('AGFRI', 'MYSAIR')),
  referencia TEXT,
  descripcion TEXT,
  texto_prescripcion TEXT,
  pvp_25 DECIMAL(10,2),
  pvp_26 DECIMAL(10,2),
  pvp_27 DECIMAL(10,2),
  largo DECIMAL(10,2),
  alto DECIMAL(10,2),
  ancho DECIMAL(10,2),
  volumen DECIMAL(10,3),
  larguero_largo DECIMAL(10,2),
  larguero_alto DECIMAL(10,2),
  familia TEXT,
  subfamilia TEXT,
  motorizada BOOLEAN DEFAULT false,
  modelo_nombre TEXT,
  tipo_deflexion TEXT,
  fijacion TEXT,
  acabado TEXT,
  compuerta TEXT,
  regulacion_compuerta TEXT,
  ficha_tecnica TEXT,
  area_efectiva DECIMAL(10,3),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  art_personalizado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_marca ON public.products(marca);
CREATE INDEX IF NOT EXISTS idx_products_referencia ON public.products(referencia);
CREATE INDEX IF NOT EXISTS idx_products_familia ON public.products(familia);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
-- All authenticated users can view active products
CREATE POLICY "products_select" ON public.products
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (status = 'active' OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    ))
  );

-- Only admins and managers can insert products
CREATE POLICY "products_insert" ON public.products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Only admins and managers can update products
CREATE POLICY "products_update" ON public.products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Only admins can delete products
CREATE POLICY "products_delete" ON public.products
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();
