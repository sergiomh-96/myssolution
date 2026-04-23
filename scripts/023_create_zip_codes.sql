-- Create zip_codes table for postal code lookup
CREATE TABLE IF NOT EXISTS public.zip_codes (
  cp integer PRIMARY KEY,
  poblacion text,
  nucleo_poblacion text,
  provincia text,
  ccaa text,
  latitud numeric,
  longitud numeric,
  municipio_id integer,
  id_interno integer -- Field represented by '#' in the image
);

-- Enable RLS
ALTER TABLE public.zip_codes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read zip codes
CREATE POLICY "zip_codes_select" ON public.zip_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_zip_codes_cp ON public.zip_codes(cp);
CREATE INDEX IF NOT EXISTS idx_zip_codes_poblacion ON public.zip_codes(poblacion);
