-- Create a super admin user for testing
-- Email: admin@waterpolostats.com
-- Password: Admin123!

-- First, we need to insert into auth.users (this is a simplified version)
-- In production, you should use Supabase's signUp function or dashboard

-- Note: This script assumes you'll create the user through Supabase Auth UI or API
-- Then run this to make them a super admin

-- Update the profile to be a super admin (replace the email with your actual admin email)
UPDATE public.profiles
SET 
  role = 'admin',
  is_super_admin = true,
  club_id = NULL,
  full_name = 'Super Administrador'
WHERE email = 'admin@waterpolostats.com';

-- If the profile doesn't exist yet, you can insert it manually after creating the auth user
-- INSERT INTO public.profiles (id, email, full_name, role, is_super_admin, club_id)
-- VALUES (
--   'YOUR_USER_ID_FROM_AUTH_USERS',
--   'admin@waterpolostats.com',
--   'Super Administrador',
--   'admin',
--   true,
--   NULL
-- );

-- Grant super admin access to all clubs
-- Super admins don't need a club_id, they can access everything
