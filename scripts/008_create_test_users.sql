-- Create test user profiles
-- Note: These profiles will be linked to Supabase Auth users after they sign up

-- First, you need to create these users through Supabase Auth (signup page)
-- Then this script will update their profiles with the correct roles

-- Instructions:
-- 1. Sign up with these emails through the /auth/signup page:
--    - admin@cnsantandreu.cat (will be admin)
--    - coach@cnsantandreu.cat (will be coach)
--    - viewer@cnsantandreu.cat (will be viewer)
-- 2. After signing up, run this script to assign roles

-- Update profiles based on email
UPDATE profiles 
SET role = 'admin', full_name = 'Administrador CN Sant Andreu'
WHERE email = 'admin@cnsantandreu.cat';

UPDATE profiles 
SET role = 'coach', full_name = 'Entrenador CN Sant Andreu'
WHERE email = 'coach@cnsantandreu.cat';

UPDATE profiles 
SET role = 'viewer', full_name = 'Espectador CN Sant Andreu'
WHERE email = 'viewer@cnsantandreu.cat';

-- Verify the updates
SELECT id, email, full_name, role, created_at 
FROM profiles 
ORDER BY created_at DESC;
