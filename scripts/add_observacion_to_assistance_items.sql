-- Add observacion column to support_assistance_items
ALTER TABLE public.support_assistance_items 
ADD COLUMN IF NOT EXISTS observacion varchar(140);

COMMENT ON COLUMN public.support_assistance_items.observacion IS 'Observaciones adicionales por cada artículo (máx 140 caracteres)';
