-- Migration to add razon_social to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS razon_social text;
