-- Add notas_internas column to offers table
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS notas_internas text;

-- Add comment for documentation
COMMENT ON COLUMN offers.notas_internas IS 'Notas internas de la oferta que no se muestran en la oferta impresa';
