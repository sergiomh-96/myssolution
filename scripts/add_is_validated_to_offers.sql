-- Añadir la columna is_validated a la tabla offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false;

-- Añadir campos para el histórico de validación
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
-- Campo para saber si la oferta llegó a necesitar validación alguna vez (histórico)
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS validation_required_at TIMESTAMPTZ;
