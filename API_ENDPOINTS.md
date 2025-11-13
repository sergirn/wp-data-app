# API Endpoints - Water Polo Stats

## Autenticación

Todas las rutas API requieren autenticación mediante Supabase Auth. El token de autenticación debe incluirse en las cookies de la sesión.

## Endpoints Disponibles

### 1. Setup Admin
**POST** `/api/setup-admin`

Crea el usuario super administrador inicial del sistema.

**Permisos:** Público (solo funciona si no existe admin)

**Request Body:** Ninguno

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Admin user created successfully",
  "email": "admin@waterpolostats.com"
}
\`\`\`

**Credenciales por defecto:**
- Email: `admin@waterpolostats.com`
- Password: `Admin123!`

---

### 2. Crear Club
**POST** `/api/admin/create-club`

Crea un nuevo club en el sistema.

**Permisos:** Solo super administradores

**Request Body:**
\`\`\`json
{
  "name": "Club Natació Barcelona",
  "short_name": "CN Barcelona",
  "logo_url": "/logos/cn-barcelona.png",
  "primary_color": "#1e40af",
  "secondary_color": "#dc2626",
  "description": "Descripción del club"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "club": {
    "id": 1,
    "name": "Club Natació Barcelona",
    "short_name": "CN Barcelona",
    "logo_url": "/logos/cn-barcelona.png",
    "primary_color": "#1e40af",
    "secondary_color": "#dc2626",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  }
}
\`\`\`

---

### 3. Crear Usuario
**POST** `/api/admin/create-user`

Crea un nuevo usuario y lo asigna a un club.

**Permisos:** Solo super administradores

**Request Body:**
\`\`\`json
{
  "email": "entrenador@club.com",
  "password": "SecurePassword123!",
  "fullName": "Juan Pérez",
  "role": "coach",
  "clubId": 1,
  "isSuperAdmin": false
}
\`\`\`

**Roles disponibles:**
- `admin` - Administrador del club
- `coach` - Entrenador
- `viewer` - Solo lectura

**Response:**
\`\`\`json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "entrenador@club.com",
    "created_at": "2025-01-15T10:00:00Z"
  }
}
\`\`\`

---

## Operaciones de Base de Datos (Supabase Client)

Todas las operaciones CRUD se realizan directamente mediante el cliente de Supabase desde el frontend o mediante Server Actions. A continuación se detallan las tablas y operaciones disponibles:

### Clubs

**Leer todos los clubs:**
\`\`\`typescript
const { data: clubs, error } = await supabase
  .from('clubs')
  .select('*')
  .order('name')
\`\`\`

**Actualizar club:**
\`\`\`typescript
const { data, error } = await supabase
  .from('clubs')
  .update({
    name: 'Nuevo nombre',
    logo_url: '/logos/nuevo-logo.png'
  })
  .eq('id', clubId)
\`\`\`

---

### Players (Jugadores)

**Leer jugadores del club:**
\`\`\`typescript
const { data: players, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .order('number')
\`\`\`

**Crear jugador:**
\`\`\`typescript
const { data, error } = await supabase
  .from('players')
  .insert({
    name: 'Nombre del jugador',
    number: 7,
    is_goalkeeper: false,
    club_id: clubId
  })
\`\`\`

**Actualizar jugador:**
\`\`\`typescript
const { data, error } = await supabase
  .from('players')
  .update({
    name: 'Nuevo nombre',
    number: 8
  })
  .eq('id', playerId)
\`\`\`

**Eliminar jugador:**
\`\`\`typescript
const { error } = await supabase
  .from('players')
  .delete()
  .eq('id', playerId)
\`\`\`

---

### Matches (Partidos)

**Leer partidos del club:**
\`\`\`typescript
const { data: matches, error } = await supabase
  .from('matches')
  .select('*')
  .eq('club_id', clubId)
  .order('match_date', { ascending: false })
\`\`\`

**Leer partido con estadísticas:**
\`\`\`typescript
const { data: match, error } = await supabase
  .from('matches')
  .select(`
    *,
    match_stats (
      *,
      players (
        id,
        name,
        number,
        is_goalkeeper
      )
    )
  `)
  .eq('id', matchId)
  .single()
\`\`\`

**Crear partido:**
\`\`\`typescript
const { data, error } = await supabase
  .from('matches')
  .insert({
    match_date: '2025-01-15',
    opponent: 'CN Barcelona',
    location: 'Piscina Municipal',
    home_score: 10,
    away_score: 8,
    is_home: true,
    season: '2024-25',
    jornada: 5,
    club_id: clubId
  })
\`\`\`

**Actualizar partido:**
\`\`\`typescript
const { data, error } = await supabase
  .from('matches')
  .update({
    home_score: 12,
    away_score: 9,
    notes: 'Gran partido'
  })
  .eq('id', matchId)
\`\`\`

**Eliminar partido:**
\`\`\`typescript
const { error } = await supabase
  .from('matches')
  .delete()
  .eq('id', matchId)
\`\`\`

---

### Match Stats (Estadísticas de Partido)

**Leer estadísticas de un partido:**
\`\`\`typescript
const { data: stats, error } = await supabase
  .from('match_stats')
  .select(`
    *,
    players (
      id,
      name,
      number,
      is_goalkeeper
    )
  `)
  .eq('match_id', matchId)
\`\`\`

**Crear/Actualizar estadísticas de jugador:**
\`\`\`typescript
const { data, error } = await supabase
  .from('match_stats')
  .upsert({
    match_id: matchId,
    player_id: playerId,
    goles_totales: 3,
    tiros_totales: 5,
    goles_eficiencia: 60.00,
    // ... más campos de estadísticas
  })
\`\`\`

**Campos disponibles en match_stats:**

**Goles:**
- `goles_totales` - Total de goles
- `goles_boya_cada` - Goles de boya cada
- `goles_hombre_mas` - Goles en superioridad
- `goles_lanzamiento` - Goles de lanzamiento
- `goles_dir_mas_5m` - Goles directos +5m
- `goles_contraataque` - Goles de contraataque
- `goles_penalti_juego` - Penaltis convertidos
- `goles_penalti_fallo` - Penaltis fallados
- `goles_corner` - Goles de corner
- `goles_fuera` - Tiros fuera
- `goles_parados` - Tiros parados
- `goles_bloqueado` - Tiros bloqueados
- `goles_eficiencia` - Eficiencia de gol (%)

**Tiros:**
- `tiros_totales` - Total de tiros
- `tiros_boya_cada` - Tiros de boya cada
- `tiros_hombre_mas` - Tiros en superioridad
- `tiros_lanzamiento` - Tiros de lanzamiento
- `tiros_dir_mas_5m` - Tiros directos +5m
- `tiros_contraataque` - Tiros de contraataque
- `tiros_penalti_juego` - Penaltis lanzados
- `tiros_penalti_fallo` - Penaltis fallados
- `tiros_corner` - Tiros de corner
- `tiros_fuera` - Tiros fuera
- `tiros_parados` - Tiros parados
- `tiros_bloqueado` - Tiros bloqueados
- `tiros_eficiencia` - Eficiencia de tiro (%)

**Faltas:**
- `faltas_exp_3_int` - Expulsiones 3 intentos
- `faltas_exp_3_bruta` - Expulsiones 3 brutas
- `faltas_penalti` - Penaltis cometidos
- `faltas_contrafaltas` - Contrafaltas

**Acciones:**
- `acciones_bloqueo` - Bloqueos
- `acciones_asistencias` - Asistencias
- `acciones_recuperacion` - Recuperaciones
- `acciones_rebote` - Rebotes
- `acciones_perdida_poco` - Pérdidas de posesión
- `acciones_exp_provocada` - Expulsiones provocadas
- `acciones_penalti_provocado` - Penaltis provocados
- `acciones_recibir_gol` - Goles recibidos

**Estadísticas de Portero:**
- `portero_goles_boya_parada` - Goles de boya encajados
- `portero_goles_lanzamiento` - Goles de lanzamiento encajados
- `portero_goles_dir_mas_5m` - Goles directos +5m encajados
- `portero_goles_penalti_encajado` - Penaltis encajados
- `portero_paradas_totales` - Total de paradas
- `portero_tiros_parado` - Tiros parados
- `portero_tiros_parada_recup` - Paradas con recuperación
- `portero_paradas_penalti_parado` - Penaltis parados
- `portero_faltas_exp_3_int` - Expulsiones 3 intentos
- `portero_acciones_rebote` - Rebotes
- `portero_acciones_perdida_pos` - Pérdidas de posesión
- `portero_acciones_gol_recibido` - Goles recibidos

---

### Profiles (Perfiles de Usuario)

**Leer perfil actual:**
\`\`\`typescript
const { data: { user } } = await supabase.auth.getUser()
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
\`\`\`

**Leer usuarios del club:**
\`\`\`typescript
const { data: users, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('club_id', clubId)
  .order('full_name')
\`\`\`

**Actualizar perfil:**
\`\`\`typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'Nuevo nombre',
    role: 'coach'
  })
  .eq('id', userId)
\`\`\`

---

### Audit Logs (Registro de Auditoría)

**Leer logs de auditoría:**
\`\`\`typescript
const { data: logs, error } = await supabase
  .from('audit_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100)
\`\`\`

---

## Autenticación con Supabase

### Login
\`\`\`typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@club.com',
  password: 'password123'
})
\`\`\`

### Signup
\`\`\`typescript
const { data, error } = await supabase.auth.signUp({
  email: 'nuevo@club.com',
  password: 'password123',
  options: {
    emailRedirectTo: window.location.origin,
    data: {
      full_name: 'Nombre Completo',
      role: 'viewer'
    }
  }
})
\`\`\`

### Logout
\`\`\`typescript
const { error } = await supabase.auth.signOut()
\`\`\`

### Obtener usuario actual
\`\`\`typescript
const { data: { user } } = await supabase.auth.getUser()
\`\`\`

---

## Permisos y Row Level Security (RLS)

El sistema implementa RLS para aislar datos por club:

### Super Administradores
- Pueden crear y gestionar clubs
- Pueden crear usuarios para cualquier club
- Acceso completo a todas las funciones

### Administradores de Club
- Pueden gestionar jugadores de su club
- Pueden crear, editar y eliminar partidos
- Pueden gestionar estadísticas
- Pueden ver usuarios de su club

### Entrenadores (Coaches)
- Pueden gestionar jugadores de su club
- Pueden crear y editar partidos
- Pueden gestionar estadísticas
- Solo lectura en configuración

### Viewers
- Solo lectura en todas las secciones
- No pueden modificar datos

---

## Exportación de Datos

La aplicación incluye funciones de exportación en los componentes:

### Exportar partido a PDF
\`\`\`typescript
import { exportMatchToPDF } from '@/lib/export-utils'

await exportMatchToPDF(match, stats, clubName)
\`\`\`

### Exportar estadísticas a Excel
\`\`\`typescript
import { exportToExcel } from '@/lib/export-utils'

exportToExcel(players, matches, stats, 'estadisticas-club.xlsx')
\`\`\`

---

## Variables de Entorno Requeridas

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (auto-configurado por Supabase)
POSTGRES_URL=your-postgres-url
POSTGRES_PRISMA_URL=your-prisma-url
POSTGRES_URL_NON_POOLING=your-non-pooling-url
POSTGRES_USER=your-user
POSTGRES_PASSWORD=your-password
POSTGRES_DATABASE=your-database
POSTGRES_HOST=your-host
\`\`\`

---

## Notas Importantes

1. **Aislamiento de Datos**: Cada club solo puede ver y modificar sus propios datos
2. **Autenticación Requerida**: Todas las operaciones requieren usuario autenticado
3. **Validación**: Los datos se validan tanto en cliente como en servidor
4. **Auditoría**: Todas las operaciones importantes se registran en audit_logs
5. **Cascada**: Al eliminar un club, se eliminan todos sus datos relacionados
