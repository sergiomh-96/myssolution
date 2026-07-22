-- Migration: Add factura_numero and factura_fecha to support_assistances

ALTER TABLE public.support_assistances
ADD COLUMN IF NOT EXISTS factura_numero TEXT,
ADD COLUMN IF NOT EXISTS factura_fecha DATE;
