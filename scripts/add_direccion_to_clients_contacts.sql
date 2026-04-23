-- Add direccion field to clients_contacts table
ALTER TABLE public.clients_contacts ADD COLUMN IF NOT EXISTS direccion text;
