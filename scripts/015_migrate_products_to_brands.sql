-- Alter products table to add brand_id foreign key
-- First, we need to add the brand_id column
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS brand_id UUID;

-- Add foreign key constraint
ALTER TABLE public.products
ADD CONSTRAINT fk_products_brand_id 
FOREIGN KEY (brand_id) 
REFERENCES public.brands(id) 
ON DELETE RESTRICT;

-- Update existing products to link to brands based on marca field
-- This will be done after we insert the brands
