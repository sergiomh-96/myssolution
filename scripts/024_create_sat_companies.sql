-- Create sat_companies table for SAT lookup
CREATE TABLE IF NOT EXISTS public.sat_companies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empresa_sat text NOT NULL,
  nombre_tecnico text,
  zona text,
  telefono1 text, -- Storing phones as text to preserve formatting/leading zeros
  telefono2 text,
  email text,
  observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sat_companies ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read SAT companies
CREATE POLICY "sat_companies_select" ON public.sat_companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins and managers to manage SAT companies
CREATE POLICY "sat_companies_all_admin" ON public.sat_companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create index for faster search
CREATE INDEX IF NOT EXISTS idx_sat_companies_name ON public.sat_companies(empresa_sat);
CREATE INDEX IF NOT EXISTS idx_sat_companies_zona ON public.sat_companies(zona);
