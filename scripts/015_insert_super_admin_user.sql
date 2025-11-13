-- Insert super admin user directly into auth.users and profiles
-- This creates a fully functional admin account

-- First, insert into auth.users (Supabase's authentication table)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@waterpolostats.com',
  crypt('Admin123!', gen_salt('bf')), -- Password: Admin123!
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Admin"}',
  false,
  'authenticated',
  'authenticated',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Then insert into profiles table
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_super_admin,
  club_id,
  created_at,
  updated_at
)
SELECT 
  id,
  'admin@waterpolostats.com',
  'Super Admin',
  'admin',
  true,
  NULL, -- Super admin doesn't belong to a specific club
  now(),
  now()
FROM auth.users
WHERE email = 'admin@waterpolostats.com'
ON CONFLICT (id) DO UPDATE
SET 
  is_super_admin = true,
  role = 'admin',
  full_name = 'Super Admin';

-- Verify the user was created
SELECT 
  u.email,
  p.full_name,
  p.role,
  p.is_super_admin
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'admin@waterpolostats.com';
