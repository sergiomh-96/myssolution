-- Insert sample brands
INSERT INTO public.brands (name, description) VALUES
('AGFRI', 'AGFRI - Sistemas de cortinas y persianas especializadas'),
('MYSAIR', 'MYSAIR - Soluciones de ventilación y aire acondicionado')
ON CONFLICT (name) DO NOTHING;

-- Update products to link to brands
UPDATE public.products
SET brand_id = (
  SELECT id FROM public.brands 
  WHERE public.brands.name = public.products.marca
)
WHERE brand_id IS NULL;
