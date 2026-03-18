-- Update user sergio@mysair.es (or sergiomh.96@gmail.com) to admin role
UPDATE profiles
SET role = 'admin'
WHERE email = 'sergio@mysair.es' OR email = 'sergiomh.96@gmail.com';

-- Verify the update
SELECT id, full_name, email, role FROM profiles 
WHERE email = 'sergio@mysair.es' OR email = 'sergiomh.96@gmail.com';
