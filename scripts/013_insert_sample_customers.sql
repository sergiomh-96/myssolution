-- Insert sample customers for testing
-- Sergio's user ID: b3f44b6d-005c-4ee6-a304-3208dd3bbadc
-- Soporte's user ID: 60db8203-6480-4432-92da-76472c90caa0

INSERT INTO public.customers (
  company_name,
  industry,
  contact_email,
  contact_phone,
  contact_name,
  address,
  website,
  assigned_to,
  status,
  created_by,
  created_at,
  updated_at
) VALUES
-- Customers assigned to Sergio (Sales Rep)
(
  'Tecnocorp Solutions SL',
  'Technology',
  'contact@tecnocorp.es',
  '+34 91 234 5678',
  'María García López',
  'Calle Principal 123, Madrid 28001, Spain',
  'www.tecnocorp.es',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  'active',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  NOW(),
  NOW()
),
(
  'Construcciones García SA',
  'Construction',
  'ventas@construcciones-garcia.es',
  '+34 93 456 7890',
  'Juan María Sánchez',
  'Av. Diagonal 456, Barcelona 08002, Spain',
  'www.construcciones-garcia.es',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  'active',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  NOW(),
  NOW()
),
(
  'EcoVentas Sostenible',
  'Retail',
  'info@ecoventas.com',
  '+34 96 123 4567',
  'Isabel Rodríguez',
  'Calle Verde 789, Valencia 46001, Spain',
  'www.ecoventas.com',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  'prospect',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  NOW(),
  NOW()
),
(
  'Hospitales Integrados Plus',
  'Healthcare',
  'procurement@hip.es',
  '+34 91 789 0123',
  'Dr. Carlos Pérez',
  'Paseo de la Castellana 200, Madrid 28035, Spain',
  'www.hip.es',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  'prospect',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  NOW(),
  NOW()
),
-- Customers assigned to Soporte (Support Agent)
(
  'Logística Express Iberia',
  'Logistics',
  'compras@logisticaexpress.es',
  '+34 93 234 5678',
  'Alfonso Martín',
  'Polígono Industrial Norte 12, Barcelona 08041, Spain',
  'www.logisticaexpress.es',
  '60db8203-6480-4432-92da-76472c90caa0',
  'active',
  '60db8203-6480-4432-92da-76472c90caa0',
  NOW(),
  NOW()
),
(
  'Distribuidora Premium SA',
  'Distribution',
  'ventas@distribuidora-premium.es',
  '+34 91 456 7890',
  'Rosa María López',
  'Calle Industrial 345, Madrid 28042, Spain',
  'www.distribuidora-premium.es',
  '60db8203-6480-4432-92da-76472c90caa0',
  'active',
  '60db8203-6480-4432-92da-76472c90caa0',
  NOW(),
  NOW()
),
(
  'Educación Global Instituciones',
  'Education',
  'direccion@educacionglobal.es',
  '+34 98 765 4321',
  'Prof. Miguel Ángel Santos',
  'Campus Universitario s/n, Bilbao 48001, Spain',
  'www.educacionglobal.es',
  '60db8203-6480-4432-92da-76472c90caa0',
  'prospect',
  '60db8203-6480-4432-92da-76472c90caa0',
  NOW(),
  NOW()
),
(
  'Fabricas Metálicas Avanzadas',
  'Manufacturing',
  'contacto@fabricasmetalicas.es',
  '+34 96 789 0123',
  'Enrique Blasco',
  'Zona Industrial Sur 678, Valencia 46013, Spain',
  'www.fabricasmetalicas.es',
  '60db8203-6480-4432-92da-76472c90caa0',
  'inactive',
  '60db8203-6480-4432-92da-76472c90caa0',
  NOW(),
  NOW()
),
-- Unassigned leads
(
  'StartUp Innovadora Tech',
  'Technology',
  'founders@startupinnovadora.es',
  '+34 93 111 2222',
  'Emma Rodríguez García',
  'Calle Startup 999, Barcelona 08008, Spain',
  'www.startupinnovadora.es',
  NULL,
  'prospect',
  'b3f44b6d-005c-4ee6-a304-3208dd3bbadc',
  NOW(),
  NOW()
);

