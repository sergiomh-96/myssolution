-- Migration: Add adjuntos_facturas and adjuntos_defectos columns to support_assistances
-- and configure Supabase storage buckets for SAT files

-- 1. Add columns to support_assistances if they don't exist
ALTER TABLE public.support_assistances 
ADD COLUMN IF NOT EXISTS adjuntos_facturas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS adjuntos_defectos JSONB DEFAULT '[]'::jsonb;

-- 2. Create Storage Buckets in Supabase (sat_facturas and sat_images) if they do not exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('sat_facturas', 'sat_facturas', true),
  ('sat_images', 'sat_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage RLS Policies for sat_facturas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access sat_facturas'
  ) THEN
    CREATE POLICY "Public Access sat_facturas" ON storage.objects 
      FOR SELECT USING (bucket_id = 'sat_facturas');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated upload sat_facturas'
  ) THEN
    CREATE POLICY "Authenticated upload sat_facturas" ON storage.objects 
      FOR INSERT WITH CHECK (bucket_id = 'sat_facturas');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated delete sat_facturas'
  ) THEN
    CREATE POLICY "Authenticated delete sat_facturas" ON storage.objects 
      FOR DELETE USING (bucket_id = 'sat_facturas');
  END IF;
END $$;

-- 4. Storage RLS Policies for sat_images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access sat_images'
  ) THEN
    CREATE POLICY "Public Access sat_images" ON storage.objects 
      FOR SELECT USING (bucket_id = 'sat_images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated upload sat_images'
  ) THEN
    CREATE POLICY "Authenticated upload sat_images" ON storage.objects 
      FOR INSERT WITH CHECK (bucket_id = 'sat_images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated delete sat_images'
  ) THEN
    CREATE POLICY "Authenticated delete sat_images" ON storage.objects 
      FOR DELETE USING (bucket_id = 'sat_images');
  END IF;
END $$;
