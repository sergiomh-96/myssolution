-- Add unique constraint on (id_tarifa, id_producto) in precios_producto
-- Required for upsert to work correctly
ALTER TABLE public.precios_producto
  DROP CONSTRAINT IF EXISTS precios_producto_tarifa_producto_unique;

ALTER TABLE public.precios_producto
  ADD CONSTRAINT precios_producto_tarifa_producto_unique
  UNIQUE (id_tarifa, id_producto);
