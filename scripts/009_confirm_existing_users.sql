-- Confirmar todos los usuarios existentes (útil para desarrollo)
-- Este script marca todos los usuarios como confirmados

-- Nota: Este script debe ejecutarse directamente en Supabase SQL Editor
-- ya que modifica la tabla auth.users que es una tabla del sistema

UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Verificar que los usuarios tienen perfiles
INSERT INTO public.profiles (id, full_name, role, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  COALESCE(raw_user_meta_data->>'role', 'coach') as role,
  NOW() as updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
