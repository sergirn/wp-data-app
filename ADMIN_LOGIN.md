# Credenciales de Administrador

Para acceder como administrador, usa las siguientes credenciales:

## Credenciales de Admin
- **Email:** admin@waterpolostats.com
- **Contraseña:** Admin123!

## Pasos para configurar el usuario admin

1. Ejecuta el script SQL para crear el usuario admin:
   \`\`\`
   scripts/014_create_admin_auth_user.sql
   \`\`\`

2. Ve a la página de login: `/auth/login`

3. Haz clic en el botón "Rellenar credenciales de Admin (Demo)" para auto-completar los campos

4. Haz clic en "Iniciar Sesión"

## Características del Admin

Como super administrador, tendrás acceso a:
- Ver y gestionar todos los clubes
- Crear nuevos usuarios y asignarlos a clubes específicos
- Acceder al panel de administración en `/admin`
- Ver estadísticas de todos los clubes

## Crear usuarios adicionales

Una vez logueado como admin, ve a `/admin` para crear nuevos usuarios y asignarlos a clubes específicos (CN Sant Andreu, CE Mediterrani, etc.).
