-- Migration: Create support assistances system

-- 1. Create sequence for external IDs starting after IN00817
CREATE SEQUENCE IF NOT EXISTS public.support_assistance_seq START 818;

-- 2. Create support_assistances table
CREATE TABLE IF NOT EXISTS public.support_assistances (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  titulo TEXT NOT NULL,
  customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
  contacto_nombre TEXT,
  contacto_telefono TEXT,
  contacto_email TEXT,
  tipo_cliente TEXT,
  codigo_postal TEXT,
  ciudad TEXT,
  provincia TEXT,
  empleado_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  hora TEXT,
  duracion_llamada INTEGER DEFAULT 0,
  tipo_incidencia TEXT,
  estado TEXT DEFAULT 'ABIERTA',
  subestado TEXT,
  distribuidor TEXT,
  sat TEXT,
  garantia BOOLEAN DEFAULT false,
  rma_number INTEGER DEFAULT 0,
  incidencia_desc TEXT,
  solucion_desc TEXT,
  comentarios_soporte TEXT,
  comentarios_admin TEXT,
  adjuntos JSONB DEFAULT '[]',
  direccion TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create support_assistance_items table
CREATE TABLE IF NOT EXISTS public.support_assistance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistance_id BIGINT NOT NULL REFERENCES public.support_assistances(id) ON DELETE CASCADE,
  marca TEXT, -- AGFRI, MYSAIR, etc.
  referencia TEXT,
  cantidad INTEGER DEFAULT 1,
  descripcion TEXT,
  en_garantia BOOLEAN DEFAULT false,
  observacion VARCHAR(140),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Trigger for auto-generating external_id (INXXXXX)
CREATE OR REPLACE FUNCTION public.generate_support_assistance_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.external_id IS NULL THEN
    NEW.external_id := 'IN' || LPAD(nextval('public.support_assistance_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_support_assistance_id
  BEFORE INSERT ON public.support_assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_support_assistance_id();

-- 5. Enable RLS
ALTER TABLE public.support_assistances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_assistance_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for support_assistances
-- Admins, managers, viewers see all
-- Support agents and sales reps see only their own (assigned or created)
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

CREATE POLICY "support_assistances_insert" ON public.support_assistances
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "support_assistances_update" ON public.support_assistances
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (created_by = auth.uid() OR empleado_id = auth.uid())
      )
    )
  );

CREATE POLICY "support_assistances_delete" ON public.support_assistances
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. RLS Policies for support_assistance_items (linked to assistance visibility)
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

-- 8. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_support_assistances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_assistances_updated_at
  BEFORE UPDATE ON public.support_assistances
  FOR EACH ROW
  EXECUTE FUNCTION update_support_assistances_updated_at();
