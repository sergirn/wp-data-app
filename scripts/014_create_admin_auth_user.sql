-- Create admin user in Supabase Auth
-- This script creates the admin user with proper authentication

-- Email: admin@waterpolostats.com
-- Password: Admin123!

-- Insert into auth.users (Supabase's authentication table)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@waterpolostats.com',
  crypt('Admin123!', gen_salt('bf')), -- Password: Admin123!
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Administrador"}',
  NULL,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- Get the user ID we just created
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@waterpolostats.com';
  
  -- Create or update the profile for this user
  INSERT INTO public.profiles (id, email, full_name, role, is_super_admin, club_id)
  VALUES (
    admin_user_id,
    'admin@waterpolostats.com',
    'Super Administrador',
    'admin',
    true,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_super_admin = true,
    club_id = NULL,
    full_name = 'Super Administrador';
END $$;
