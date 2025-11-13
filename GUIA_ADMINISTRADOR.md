# Guía del Super Administrador

## Acceso al Panel de Administración

Como **Super Administrador**, tienes acceso completo a todos los clubes y funcionalidades del sistema.

### 1. Iniciar Sesión

1. Ve a `/auth/login`
2. Usa las credenciales del super admin:
   - **Email**: `admin@waterpolostats.com`
   - **Password**: `Admin123!`
3. O usa el botón "Rellenar credenciales de Admin (Demo)" para auto-completar

### 2. Acceder al Panel de Administración

Una vez logueado como super admin, verás un botón **"Admin"** con un icono de escudo en la barra de navegación.

1. Haz clic en el botón **Admin** en la navegación
2. Serás redirigido a `/admin`
3. Aquí verás:
   - **Estadísticas**: Total de usuarios, clubes y super admins
   - **Formulario de creación de usuarios**
   - **Lista de todos los usuarios registrados**

## Crear Usuarios y Asignarlos a Clubes

### Formulario de Creación de Usuario

El formulario te permite crear usuarios con diferentes configuraciones:

#### Campos Obligatorios:

1. **Email** *
   - Email único del usuario
   - Será usado para iniciar sesión

2. **Contraseña** *
   - Mínimo 6 caracteres
   - El usuario podrá cambiarla después

3. **Rol** *
   - **Viewer (Solo lectura)**: Puede ver estadísticas pero no editar
   - **Coach (Puede editar)**: Puede crear y editar partidos y jugadores
   - **Admin (Control total del club)**: Control completo sobre su club

4. **Club** * (si no es super admin)
   - Selecciona el club al que pertenecerá el usuario
   - El usuario solo verá datos de este club

#### Campos Opcionales:

5. **Nombre Completo**
   - Nombre para mostrar en el sistema

6. **Super Administrador** (checkbox)
   - Si está marcado, el usuario tendrá acceso a TODOS los clubes
   - No necesita asignar un club específico
   - Puede acceder al panel de administración

### Ejemplos de Uso

#### Ejemplo 1: Crear un entrenador para CN Sant Andreu

\`\`\`
Email: entrenador@cnsantandreu.com
Contraseña: Coach2024!
Nombre Completo: Juan García
Rol: Coach (Puede editar)
Club: CN Sant Andreu
Super Administrador: ❌ (no marcado)
\`\`\`

**Resultado**: Juan podrá ver y editar partidos/jugadores solo del CN Sant Andreu.

#### Ejemplo 2: Crear un administrador para CE Mediterrani

\`\`\`
Email: admin@cemediterrani.com
Contraseña: Admin2024!
Nombre Completo: María López
Rol: Admin (Control total del club)
Club: CE Mediterrani
Super Administrador: ❌ (no marcado)
\`\`\`

**Resultado**: María tendrá control total sobre CE Mediterrani pero no verá datos de otros clubes.

#### Ejemplo 3: Crear un viewer para CN Sant Andreu

\`\`\`
Email: viewer@cnsantandreu.com
Contraseña: View2024!
Nombre Completo: Pedro Martínez
Rol: Viewer (Solo lectura)
Club: CN Sant Andreu
Super Administrador: ❌ (no marcado)
\`\`\`

**Resultado**: Pedro solo podrá ver estadísticas del CN Sant Andreu, sin poder editar nada.

#### Ejemplo 4: Crear otro super administrador

\`\`\`
Email: superadmin2@waterpolostats.com
Contraseña: SuperAdmin2024!
Nombre Completo: Ana Rodríguez
Rol: Admin (Control total del club)
Club: (no necesario)
Super Administrador: ✅ (marcado)
\`\`\`

**Resultado**: Ana tendrá acceso a todos los clubes y al panel de administración.

## Gestión de Usuarios

### Ver Usuarios Registrados

En la sección "Usuarios Registrados" verás:

- **Nombre/Email** del usuario
- **Badges** indicando:
  - 🔴 "Super Admin" si es super administrador
  - 🔵 Rol del usuario (admin, coach, viewer)
- **Club** asignado (si aplica)
- **Fecha de creación**

### Permisos por Rol

| Rol | Ver Datos | Crear/Editar Partidos | Crear/Editar Jugadores | Acceso Admin Panel | Ver Otros Clubes |
|-----|-----------|----------------------|------------------------|-------------------|------------------|
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Coach** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |

## Flujo de Trabajo Recomendado

### Para vender a un nuevo club:

1. **Crear el club** (si no existe):
   - Actualmente los clubes se crean mediante SQL
   - Contacta al desarrollador para añadir nuevos clubes

2. **Crear el administrador del club**:
   - Email del club
   - Rol: Admin
   - Asignar al club correspondiente
   - NO marcar como super admin

3. **El admin del club puede**:
   - Ver todas las estadísticas de su club
   - Crear y editar partidos
   - Gestionar jugadores
   - Configurar ajustes del club

4. **El admin del club NO puede**:
   - Ver datos de otros clubes
   - Crear usuarios (solo tú como super admin)
   - Acceder al panel de administración

## Seguridad

- **Row Level Security (RLS)** está activado en todas las tablas
- Los usuarios solo pueden ver datos de su club asignado
- Los super admins pueden ver todos los datos
- Las contraseñas están encriptadas por Supabase
- Los usuarios no pueden cambiar su propio rol o club

## Soporte

Si necesitas:
- Añadir nuevos clubes
- Modificar permisos de usuarios existentes
- Resolver problemas técnicos

Contacta al equipo de desarrollo o revisa la documentación técnica en los archivos README.
