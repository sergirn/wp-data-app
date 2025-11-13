# API Endpoints y Operaciones de Base de Datos

## Documentación Completa de la API de Water Polo Stats

### Tabla de Contenidos
1. [Autenticación](#autenticación)
2. [Endpoints REST API](#endpoints-rest-api)
3. [Operaciones CRUD con Supabase](#operaciones-crud-con-supabase)
4. [Consultas Complejas](#consultas-complejas)
5. [Variables de Entorno](#variables-de-entorno)

---

## Autenticación

La aplicación utiliza Supabase Auth para la autenticación de usuarios.

### Login
\`\`\`typescript
const supabase = createClient()
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@ejemplo.com',
  password: 'contraseña'
})
\`\`\`

### Signup
\`\`\`typescript
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@ejemplo.com',
  password: 'contraseña',
  options: {
    data: {
      full_name: 'Nombre Completo'
    }
  }
})
\`\`\`

### Logout
\`\`\`typescript
const { error } = await supabase.auth.signOut()
\`\`\`

### Get Current User
\`\`\`typescript
const { data: { user } } = await supabase.auth.getUser()
\`\`\`

---

## Endpoints REST API

### 1. Setup Admin
**Endpoint:** `POST /api/setup-admin`

Crea el primer usuario administrador del sistema.

**Request Body:**
\`\`\`json
{
  "email": "admin@ejemplo.com",
  "password": "contraseña_segura",
  "fullName": "Nombre del Admin",
  "clubName": "Nombre del Club"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Admin user created successfully"
}
\`\`\`

### 2. Create Club
**Endpoint:** `POST /api/admin/create-club`

Crea un nuevo club (solo administradores).

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Request Body:**
\`\`\`json
{
  "name": "Club Natació Barcelona",
  "shortName": "CN Barcelona",
  "logoUrl": "/logos/cn-barcelona.png"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": 1,
  "name": "Club Natació Barcelona",
  "short_name": "CN Barcelona",
  "logo_url": "/logos/cn-barcelona.png"
}
\`\`\`

### 3. Create User
**Endpoint:** `POST /api/admin/create-user`

Crea un nuevo usuario y lo asocia a un club (solo administradores).

**Headers:**
\`\`\`
Authorization: Bearer {token}
\`\`\`

**Request Body:**
\`\`\`json
{
  "email": "entrenador@ejemplo.com",
  "password": "contraseña",
  "fullName": "Nombre del Entrenador",
  "role": "coach",
  "clubId": 1
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "userId": "uuid-del-usuario",
  "profileId": "uuid-del-perfil"
}
\`\`\`

---

## Operaciones CRUD con Supabase

### Clubs

#### Obtener todos los clubs
\`\`\`typescript
const { data, error } = await supabase
  .from('clubs')
  .select('*')
  .order('name')
\`\`\`

#### Obtener un club por ID
\`\`\`typescript
const { data, error } = await supabase
  .from('clubs')
  .select('*')
  .eq('id', clubId)
  .single()
\`\`\`

#### Crear un club
\`\`\`typescript
const { data, error } = await supabase
  .from('clubs')
  .insert({
    name: 'Nombre del Club',
    short_name: 'Nombre Corto',
    logo_url: '/logos/logo.png'
  })
  .select()
  .single()
\`\`\`

#### Actualizar un club
\`\`\`typescript
const { data, error } = await supabase
  .from('clubs')
  .update({
    name: 'Nuevo Nombre',
    logo_url: '/logos/nuevo-logo.png'
  })
  .eq('id', clubId)
  .select()
  .single()
\`\`\`

#### Eliminar un club
\`\`\`typescript
const { error } = await supabase
  .from('clubs')
  .delete()
  .eq('id', clubId)
\`\`\`

---

### Players

#### Obtener todos los jugadores de un club
\`\`\`typescript
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .order('number')
\`\`\`

#### Obtener jugadores de campo
\`\`\`typescript
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .eq('is_goalkeeper', false)
  .order('number')
\`\`\`

#### Obtener porteros
\`\`\`typescript
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .eq('is_goalkeeper', true)
  .order('number')
\`\`\`

#### Crear un jugador
\`\`\`typescript
const { data, error } = await supabase
  .from('players')
  .insert({
    name: 'Nombre del Jugador',
    number: 7,
    position: 'Boya',
    is_goalkeeper: false,
    club_id: clubId
  })
  .select()
  .single()
\`\`\`

#### Actualizar un jugador
\`\`\`typescript
const { data, error } = await supabase
  .from('players')
  .update({
    name: 'Nuevo Nombre',
    number: 10,
    position: 'Extremo'
  })
  .eq('id', playerId)
  .select()
  .single()
\`\`\`

#### Eliminar un jugador
\`\`\`typescript
const { error } = await supabase
  .from('players')
  .delete()
  .eq('id', playerId)
\`\`\`

---

### Matches

#### Obtener todos los partidos de un club
\`\`\`typescript
const { data, error } = await supabase
  .from('matches')
  .select('*')
  .eq('club_id', clubId)
  .order('match_date', { ascending: false })
\`\`\`

#### Obtener partidos por temporada
\`\`\`typescript
const { data, error } = await supabase
  .from('matches')
  .select('*')
  .eq('club_id', clubId)
  .eq('season', '2024-2025')
  .order('match_date', { ascending: false })
\`\`\`

#### Obtener un partido con estadísticas
\`\`\`typescript
const { data, error } = await supabase
  .from('matches')
  .select(`
    *,
    match_stats(
      *,
      players(*)
    )
  `)
  .eq('id', matchId)
  .single()
\`\`\`

#### Crear un partido
\`\`\`typescript
const { data, error } = await supabase
  .from('matches')
  .insert({
    match_date: '2025-01-16',
    opponent: 'CN Barcelona',
    location: 'Piscina Sant Andreu',
    home_score: 12,
    away_score: 10,
    is_home: true,
    season: '2024-2025',
    jornada: 15,
    club_id: clubId
  })
  .select()
  .single()
\`\`\`

#### Actualizar un partido
\`\`\`typescript
const { data, error } = await supabase
  .from('matches')
  .update({
    home_score: 13,
    away_score: 11,
    notes: 'Gran partido'
  })
  .eq('id', matchId)
  .select()
  .single()
\`\`\`

#### Eliminar un partido
\`\`\`typescript
const { error } = await supabase
  .from('matches')
  .delete()
  .eq('id', matchId)
\`\`\`

---

### Match Stats

#### Obtener estadísticas de un partido
\`\`\`typescript
const { data, error } = await supabase
  .from('match_stats')
  .select(`
    *,
    players(*)
  `)
  .eq('match_id', matchId)
\`\`\`

#### Obtener estadísticas de un jugador
\`\`\`typescript
const { data, error } = await supabase
  .from('match_stats')
  .select(`
    *,
    matches(*)
  `)
  .eq('player_id', playerId)
  .order('matches(match_date)', { ascending: false })
\`\`\`

#### Crear estadísticas de partido
\`\`\`typescript
const { data, error} = await supabase
  .from('match_stats')
  .insert({
    match_id: matchId,
    player_id: playerId,
    goles_totales: 3,
    tiros_totales: 5,
    acciones_asistencias: 2,
    // ... otros campos
  })
  .select()
\`\`\`

#### Actualizar estadísticas
\`\`\`typescript
const { data, error } = await supabase
  .from('match_stats')
  .update({
    goles_totales: 4,
    tiros_totales: 6
  })
  .eq('id', statId)
  .select()
\`\`\`

---

### Profiles

#### Obtener perfil del usuario actual
\`\`\`typescript
const { data: { user } } = await supabase.auth.getUser()
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
\`\`\`

#### Actualizar perfil
\`\`\`typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'Nuevo Nombre',
    avatar_url: '/avatars/nuevo.jpg'
  })
  .eq('id', userId)
  .select()
  .single()
\`\`\`

---

## Consultas Complejas

### Estadísticas agregadas de jugadores por temporada
\`\`\`typescript
const { data, error } = await supabase
  .from('match_stats')
  .select(`
    player_id,
    players(name, number, is_goalkeeper),
    matches!inner(season, club_id)
  `)
  .eq('matches.club_id', clubId)
  .eq('matches.season', '2024-2025')

// Procesar datos para agregar estadísticas
const playerStats = data.reduce((acc, stat) => {
  const playerId = stat.player_id
  if (!acc[playerId]) {
    acc[playerId] = {
      player: stat.players,
      totalGoles: 0,
      totalTiros: 0,
      totalAsistencias: 0,
      matchesPlayed: 0
    }
  }
  acc[playerId].totalGoles += stat.goles_totales || 0
  acc[playerId].totalTiros += stat.tiros_totales || 0
  acc[playerId].totalAsistencias += stat.acciones_asistencias || 0
  acc[playerId].matchesPlayed += 1
  return acc
}, {})
\`\`\`

### Top goleadores de la temporada
\`\`\`typescript
// Obtener todas las estadísticas de la temporada
const { data: stats } = await supabase
  .from('match_stats')
  .select(`
    *,
    players(*),
    matches!inner(season, club_id)
  `)
  .eq('matches.club_id', clubId)
  .eq('matches.season', '2024-2025')

// Agregar y ordenar
const topScorers = Object.values(
  stats.reduce((acc, stat) => {
    const playerId = stat.player_id
    if (!acc[playerId]) {
      acc[playerId] = {
        ...stat.players,
        totalGoles: 0,
        matchesPlayed: 0
      }
    }
    acc[playerId].totalGoles += stat.goles_totales || 0
    acc[playerId].matchesPlayed += 1
    return acc
  }, {})
).sort((a, b) => b.totalGoles - a.totalGoles)
\`\`\`

### Eficiencia de hombre más por partido
\`\`\`typescript
const { data: matches } = await supabase
  .from('matches')
  .select(`
    *,
    match_stats(
      goles_hombre_mas,
      tiros_hombre_mas,
      players(name)
    )
  `)
  .eq('club_id', clubId)
  .eq('season', '2024-2025')

const manAdvantageStats = matches.map(match => {
  const totalGoals = match.match_stats.reduce((sum, s) => 
    sum + (s.goles_hombre_mas || 0), 0)
  const totalMisses = match.match_stats.reduce((sum, s) => 
    sum + (s.tiros_hombre_mas || 0), 0)
  const totalAttempts = totalGoals + totalMisses
  const efficiency = totalAttempts > 0 
    ? Math.round((totalGoals / totalAttempts) * 100) 
    : 0
  
  return {
    opponent: match.opponent,
    goals: totalGoals,
    misses: totalMisses,
    efficiency
  }
})
\`\`\`

### Estadísticas de porteros
\`\`\`typescript
const { data: goalkeeperStats } = await supabase
  .from('match_stats')
  .select(`
    *,
    players!inner(*),
    matches!inner(season, club_id, opponent, match_date)
  `)
  .eq('players.is_goalkeeper', true)
  .eq('matches.club_id', clubId)
  .eq('matches.season', '2024-2025')
  .order('matches.match_date', { ascending: false })

// Calcular eficiencia de paradas
const goalkeeperEfficiency = goalkeeperStats.map(stat => {
  const saves = stat.portero_paradas_totales || 0
  const goalsConceded = 
    (stat.portero_goles_boya_parada || 0) +
    (stat.portero_goles_hombre_menos || 0) +
    (stat.portero_goles_dir_mas_5m || 0) +
    (stat.portero_goles_contraataque || 0) +
    (stat.portero_goles_penalti || 0)
  const totalShots = saves + goalsConceded
  const efficiency = totalShots > 0 
    ? Math.round((saves / totalShots) * 100) 
    : 0
  
  return {
    player: stat.players.name,
    match: stat.matches.opponent,
    date: stat.matches.match_date,
    saves,
    goalsConceded,
    efficiency
  }
})
\`\`\`

---

## Variables de Entorno

### Requeridas

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Database (proporcionadas automáticamente por Supabase)
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
POSTGRES_USER=postgres
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=postgres
POSTGRES_HOST=...
\`\`\`

### Opcionales

\`\`\`env
# Desarrollo
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

---

## Campos de Estadísticas

### Jugadores de Campo

**Goles:**
- `goles_totales`: Total de goles (calculado automáticamente)
- `goles_boya_jugada`: Goles desde boya o jugada
- `goles_hombre_mas`: Goles en superioridad numérica
- `goles_lanzamiento`: Goles de lanzamiento
- `goles_dir_mas_5m`: Goles directos desde más de 5m
- `goles_contraataque`: Goles en contraataque
- `goles_penalti_anotado`: Penaltis anotados

**Tiros:**
- `tiros_totales`: Total de tiros (goles + tiros fallados)
- `tiros_hombre_mas`: Tiros fallados en hombre más
- `tiros_penalti_fallado`: Penaltis fallados
- `tiros_corner`: Tiros de corner fallados
- `tiros_fuera`: Tiros fuera
- `tiros_parados`: Tiros parados por el portero
- `tiros_bloqueado`: Tiros bloqueados
- `tiros_eficiencia`: Eficiencia de tiro (%)

**Faltas:**
- `faltas_exp_20_1c1`: Expulsiones 20" en 1 contra 1
- `faltas_exp_20_boya`: Expulsiones 20" en boya
- `faltas_penalti`: Penaltis cometidos
- `faltas_contrafaltas`: Contrafaltas

**Acciones:**
- `acciones_bloqueo`: Bloqueos realizados
- `acciones_asistencias`: Asistencias
- `acciones_recuperacion`: Recuperaciones de balón
- `acciones_rebote`: Rebotes capturados
- `acciones_exp_provocada`: Expulsiones provocadas
- `acciones_penalti_provocado`: Penaltis provocados
- `acciones_recibir_gol`: Goles recibidos (para estadísticas defensivas)

### Porteros

**Goles Encajados:**
- `portero_goles_boya_parada`: Goles desde boya
- `portero_goles_hombre_menos`: Goles en inferioridad numérica
- `portero_goles_dir_mas_5m`: Goles directos desde +5m
- `portero_goles_contraataque`: Goles en contraataque
- `portero_goles_penalti`: Goles de penalti

**Paradas:**
- `portero_paradas_totales`: Total de paradas (calculado automáticamente)
- `portero_tiros_parada_recup`: Paradas con recuperación
- `portero_paradas_fuera`: Paradas que salen fuera
- `portero_paradas_penalti_parado`: Penaltis parados
- `portero_paradas_hombre_menos`: Paradas en inferioridad numérica

**Acciones:**
- `acciones_asistencias`: Asistencias del portero
- `acciones_recuperacion`: Recuperaciones
- `portero_acciones_perdida_pos`: Pérdidas de posesión
- `acciones_exp_provocada`: Expulsiones provocadas

---

## Row Level Security (RLS)

Todas las tablas tienen políticas RLS habilitadas:

### Clubs
- **SELECT**: Público (cualquiera puede ver clubs)
- **INSERT/UPDATE/DELETE**: Solo administradores

### Players
- **SELECT**: Usuarios autenticados
- **INSERT/UPDATE/DELETE**: Administradores y entrenadores del mismo club

### Matches
- **SELECT**: Usuarios autenticados
- **INSERT/UPDATE/DELETE**: Administradores y entrenadores del mismo club

### Match Stats
- **SELECT**: Usuarios autenticados
- **INSERT/UPDATE/DELETE**: Administradores y entrenadores (a través de matches)

### Profiles
- **SELECT**: Usuario propietario o administradores
- **UPDATE**: Usuario propietario o administradores
- **INSERT**: Automático vía trigger
- **DELETE**: Solo administradores

---

## Notas Importantes

1. **Cálculos Automáticos**: Los totales de goles, tiros y paradas se calculan automáticamente en el frontend
2. **Eficiencia**: Se calcula como (goles / tiros totales) * 100 para jugadores y (paradas / (paradas + goles recibidos)) * 100 para porteros
3. **Hombre +**: La eficiencia se calcula como (goles / (goles + fallos)) * 100
4. **Seguridad**: Todas las operaciones están protegidas por RLS y requieren autenticación
5. **Auditoría**: La tabla `audit_logs` registra todas las operaciones importantes

---

Para más información, consulta la documentación de Supabase: https://supabase.com/docs
