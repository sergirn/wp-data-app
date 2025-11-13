# Configuración del Sistema de Administración

## Crear el Usuario Super Admin

Para crear tu primer usuario super admin y poder acceder al sistema, sigue estos pasos:

### Paso 1: Ejecutar los Scripts SQL

Asegúrate de haber ejecutado todos los scripts SQL en orden:

1. `001_create_tables.sql` - Crea las tablas base
2. `002_seed_players.sql` - Datos de ejemplo de jugadores
3. `006_create_auth_tables.sql` - Tablas de autenticación
4. `010_add_multi_club_support.sql` - Soporte multi-club
5. `011_seed_example_clubs.sql` - Clubes de ejemplo
6. `013_update_rls_for_super_admin.sql` - Políticas RLS para super admins

### Paso 2: Crear el Usuario en Supabase

1. Ve a tu proyecto de Supabase Dashboard
2. Navega a **Authentication** → **Users**
3. Haz clic en **Add user** → **Create new user**
4. Ingresa:
   - **Email**: `admin@waterpolostats.com` (o el email que prefieras)
   - **Password**: `Admin123!` (o la contraseña que prefieras)
   - Marca **Auto Confirm User** para que no necesite confirmar el email

### Paso 3: Convertir el Usuario en Super Admin

Después de crear el usuario en Supabase, ejecuta este SQL en el **SQL Editor** de Supabase:

\`\`\`sql
-- Reemplaza 'admin@waterpolostats.com' con el email que usaste
UPDATE public.profiles
SET 
  role = 'admin',
  is_super_admin = true,
  club_id = NULL,
  full_name = 'Super Administrador'
WHERE email = 'admin@waterpolostats.com';
\`\`\`

### Paso 4: Iniciar Sesión

1. Ve a `/auth/login` en tu aplicación
2. Ingresa el email y contraseña que creaste
3. Deberías ver el botón "Admin" en la navegación
4. Haz clic en "Admin" para acceder al panel de administración

## Crear Usuarios para Clubes

Una vez que hayas iniciado sesión como super admin:

1. Ve al **Panel de Administración** (botón "Admin" en la navegación)
2. Usa el formulario "Crear Nuevo Usuario"
3. Completa los campos:
   - **Email**: Email del usuario
   - **Contraseña**: Contraseña temporal (el usuario puede cambiarla después)
   - **Nombre Completo**: Nombre del usuario
   - **Rol**: 
     - `Viewer`: Solo puede ver datos
     - `Coach`: Puede ver y editar datos
     - `Admin`: Control total del club
   - **Club**: Selecciona el club al que pertenece el usuario
   - **Super Administrador**: Solo marca esto si quieres que tenga acceso a todos los clubes

4. Haz clic en "Crear Usuario"

## Estructura de Roles

### Super Admin (is_super_admin = true)
- Acceso a todos los clubes
- Puede crear y gestionar usuarios
- Puede crear nuevos clubes
- Ve todos los datos del sistema

### Admin (role = 'admin', club_id = X)
- Control total de su club
- Puede crear/editar/eliminar partidos y jugadores
- Solo ve datos de su club

### Coach (role = 'coach', club_id = X)
- Puede crear y editar partidos y jugadores
- Solo ve datos de su club

### Viewer (role = 'viewer', club_id = X)
- Solo lectura
- Solo ve datos de su club

## Seguridad

- El registro público está deshabilitado (`/auth/signup` muestra un mensaje)
- Solo super admins pueden crear usuarios
- Row Level Security (RLS) filtra automáticamente los datos por club
- Los super admins pueden ver todos los datos pero los usuarios normales solo ven su club
- Todas las rutas excepto `/auth/*` requieren autenticación (middleware)

## Variables de Entorno Necesarias

Asegúrate de tener estas variables configuradas:

\`\`\`
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key  # Necesario para crear usuarios
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
\`\`\`

La `SUPABASE_SERVICE_ROLE_KEY` es especialmente importante para la creación de usuarios desde el panel de admin.
