-- Añadir la columna is_validated a la tabla offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false;

-- Opcionalmente, agregar roles en la base de datos o asegurar tipos
-- Ya que esta propiedad indica si un "admin" ha validado la oferta (cuando hay descuentos)
