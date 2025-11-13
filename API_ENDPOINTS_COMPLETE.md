# API Endpoints y Operaciones de Base de Datos

## Índice
1. [Autenticación](#autenticación)
2. [Endpoints REST API](#endpoints-rest-api)
3. [Operaciones CRUD con Supabase](#operaciones-crud-con-supabase)
4. [Consultas Complejas](#consultas-complejas)
5. [Variables de Entorno](#variables-de-entorno)

---

## Autenticación

### Login
\`\`\`typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Sign in with email and password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})
\`\`\`

### Sign Up
\`\`\`typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe'
    }
  }
})
\`\`\`

### Get Current User
\`\`\`typescript
const { data: { user } } = await supabase.auth.getUser()
\`\`\`

### Sign Out
\`\`\`typescript
await supabase.auth.signOut()
\`\`\`

---

## Endpoints REST API

### 1. POST /api/setup-admin
Crea el primer usuario administrador del sistema.

**Request Body:**
\`\`\`json
{
  "email": "admin@example.com",
  "password": "securepassword",
  "fullName": "Admin User"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Admin user created successfully"
}
\`\`\`

### 2. POST /api/admin/create-club
Crea un nuevo club (solo administradores).

**Headers:**
\`\`\`
Authorization: Bearer <session_token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "name": "Club Natació Barcelona",
  "shortName": "CN Barcelona",
  "logoUrl": "/logos/cn-barcelona.png",
  "primaryColor": "#FF0000",
  "secondaryColor": "#FFFF00"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": 1,
  "name": "Club Natació Barcelona",
  "shortName": "CN Barcelona",
  "logoUrl": "/logos/cn-barcelona.png",
  "primaryColor": "#FF0000",
  "secondaryColor": "#FFFF00",
  "createdAt": "2024-01-01T00:00:00Z"
}
\`\`\`

### 3. POST /api/admin/create-user
Crea un nuevo usuario (solo administradores).

**Headers:**
\`\`\`
Authorization: Bearer <session_token>
\`\`\`

**Request Body:**
\`\`\`json
{
  "email": "coach@example.com",
  "password": "password123",
  "fullName": "Coach Name",
  "role": "coach",
  "clubId": 1
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "userId": "uuid-here",
  "message": "User created successfully"
}
\`\`\`

---

## Operaciones CRUD con Supabase

### Clubs

#### Obtener todos los clubs
\`\`\`typescript
const { data: clubs, error } = await supabase
  .from('clubs')
  .select('*')
  .order('name')
\`\`\`

#### Obtener un club por ID
\`\`\`typescript
const { data: club, error } = await supabase
  .from('clubs')
  .select('*')
  .eq('id', clubId)
  .single()
\`\`\`

#### Crear un club
\`\`\`typescript
const { data: club, error } = await supabase
  .from('clubs')
  .insert({
    name: 'Club Name',
    short_name: 'CN Name',
    logo_url: '/logos/club.png',
    primary_color: '#FF0000',
    secondary_color: '#0000FF'
  })
  .select()
  .single()
\`\`\`

#### Actualizar un club
\`\`\`typescript
const { data: club, error } = await supabase
  .from('clubs')
  .update({
    name: 'New Name',
    logo_url: '/logos/new-logo.png'
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
const { data: players, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .order('number')
\`\`\`

#### Obtener jugadores de campo
\`\`\`typescript
const { data: fieldPlayers, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .eq('is_goalkeeper', false)
  .order('number')
\`\`\`

#### Obtener porteros
\`\`\`typescript
const { data: goalkeepers, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .eq('is_goalkeeper', true)
  .order('number')
\`\`\`

#### Crear un jugador
\`\`\`typescript
const { data: player, error } = await supabase
  .from('players')
  .insert({
    name: 'Player Name',
    number: 7,
    is_goalkeeper: false,
    club_id: clubId
  })
  .select()
  .single()
\`\`\`

#### Actualizar un jugador
\`\`\`typescript
const { data: player, error } = await supabase
  .from('players')
  .update({
    name: 'New Name',
    number: 10
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
const { data: matches, error } = await supabase
  .from('matches')
  .select('*')
  .eq('club_id', clubId)
  .order('match_date', { ascending: false })
\`\`\`

#### Obtener un partido con estadísticas
\`\`\`typescript
const { data: match, error } = await supabase
  .from('matches')
  .select(`
    *,
    match_stats (
      *,
      players (*)
    )
  `)
  .eq('id', matchId)
  .single()
\`\`\`

#### Crear un partido
\`\`\`typescript
const { data: match, error } = await supabase
  .from('matches')
  .insert({
    match_date: '2024-01-15',
    opponent: 'CN Barcelona',
    location: 'Piscina Sant Andreu',
    home_score: 10,
    away_score: 8,
    is_home: true,
    season: '2024-2025',
    jornada: 5,
    notes: 'Gran partido',
    club_id: clubId
  })
  .select()
  .single()
\`\`\`

#### Actualizar un partido
\`\`\`typescript
const { data: match, error } = await supabase
  .from('matches')
  .update({
    home_score: 12,
    away_score: 9,
    notes: 'Victoria importante'
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
const { data: stats, error } = await supabase
  .from('match_stats')
  .select(`
    *,
    players (*)
  `)
  .eq('match_id', matchId)
\`\`\`

#### Obtener estadísticas de un jugador
\`\`\`typescript
const { data: stats, error } = await supabase
  .from('match_stats')
  .select(`
    *,
    matches (*)
  `)
  .eq('player_id', playerId)
  .order('matches(match_date)', { ascending: false })
\`\`\`

#### Crear estadísticas de partido
\`\`\`typescript
const { data: stats, error } = await supabase
  .from('match_stats')
  .insert({
    match_id: matchId,
    player_id: playerId,
    goles_totales: 3,
    goles_boya_jugada: 1,
    goles_hombre_mas: 2,
    tiros_totales: 5,
    tiros_hombre_mas: 1,
    tiros_fuera: 1,
    tiros_eficiencia: 60,
    acciones_asistencias: 2
  })
  .select()
  .single()
\`\`\`

#### Actualizar estadísticas
\`\`\`typescript
const { data: stats, error } = await supabase
  .from('match_stats')
  .update({
    goles_totales: 4,
    tiros_totales: 6,
    tiros_eficiencia: 67
  })
  .eq('id', statsId)
  .select()
  .single()
\`\`\`

---

### Profiles

#### Obtener perfil del usuario actual
\`\`\`typescript
const { data: { user } } = await supabase.auth.getUser()

const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
\`\`\`

#### Actualizar perfil
\`\`\`typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'New Name',
    role: 'coach'
  })
  .eq('id', userId)
  .select()
  .single()
\`\`\`

---

## Consultas Complejas

### Estadísticas agregadas de un jugador
\`\`\`typescript
const { data: playerStats, error } = await supabase
  .from('match_stats')
  .select(`
    goles_totales,
    tiros_totales,
    acciones_asistencias,
    matches!inner(match_date, opponent)
  `)
  .eq('player_id', playerId)
  .order('matches(match_date)', { ascending: false })

// Calcular totales
const totals = playerStats?.reduce((acc, stat) => ({
  goals: acc.goals + stat.goles_totales,
  shots: acc.shots + stat.tiros_totales,
  assists: acc.assists + stat.acciones_asistencias,
  matches: acc.matches + 1
}), { goals: 0, shots: 0, assists: 0, matches: 0 })
\`\`\`

### Top goleadores de un club
\`\`\`typescript
const { data: topScorers, error } = await supabase
  .from('match_stats')
  .select(`
    player_id,
    players!inner(name, number, club_id),
    goles_totales
  `)
  .eq('players.club_id', clubId)
  .order('goles_totales', { ascending: false })
  .limit(10)
\`\`\`

### Estadísticas de portero por partido
\`\`\`typescript
const { data: goalkeeperStats, error } = await supabase
  .from('match_stats')
  .select(`
    portero_paradas_totales,
    portero_goles_boya_parada,
    portero_goles_hombre_menos,
    portero_goles_dir_mas_5m,
    portero_goles_contraataque,
    portero_goles_penalti,
    matches!inner(match_date, opponent)
  `)
  .eq('player_id', playerId)
  .order('matches(match_date)', { ascending: false })

// Calcular eficiencia
const efficiency = goalkeeperStats?.map(stat => {
  const goalsConceded = 
    stat.portero_goles_boya_parada +
    stat.portero_goles_hombre_menos +
    stat.portero_goles_dir_mas_5m +
    stat.portero_goles_contraataque +
    stat.portero_goles_penalti
  
  const totalShots = stat.portero_paradas_totales + goalsConceded
  const savePercentage = totalShots > 0 
    ? (stat.portero_paradas_totales / totalShots) * 100 
    : 0
  
  return {
    ...stat,
    goalsConceded,
    totalShots,
    savePercentage
  }
})
\`\`\`

### Eficiencia en hombre más
\`\`\`typescript
const { data: manAdvantageStats, error } = await supabase
  .from('match_stats')
  .select(`
    goles_hombre_mas,
    tiros_hombre_mas,
    matches!inner(match_date, opponent, jornada)
  `)
  .eq('players.club_id', clubId)
  .order('matches(jornada)', { ascending: true })

// Agrupar por partido
const byMatch = manAdvantageStats?.reduce((acc, stat) => {
  const matchKey = `${stat.matches.match_date}-${stat.matches.opponent}`
  if (!acc[matchKey]) {
    acc[matchKey] = {
      date: stat.matches.match_date,
      opponent: stat.matches.opponent,
      jornada: stat.matches.jornada,
      goals: 0,
      misses: 0
    }
  }
  acc[matchKey].goals += stat.goles_hombre_mas
  acc[matchKey].misses += stat.tiros_hombre_mas
  return acc
}, {})

// Calcular eficiencia por partido
const efficiency = Object.values(byMatch).map(match => ({
  ...match,
  total: match.goals + match.misses,
  efficiency: match.goals + match.misses > 0 
    ? (match.goals / (match.goals + match.misses)) * 100 
    : 0
}))
\`\`\`

### Partidos con resultado
\`\`\`typescript
const { data: matches, error } = await supabase
  .from('matches')
  .select('*')
  .eq('club_id', clubId)
  .order('match_date', { ascending: false })

// Clasificar resultados
const results = matches?.map(match => {
  const ourScore = match.is_home ? match.home_score : match.away_score
  const theirScore = match.is_home ? match.away_score : match.home_score
  
  let result: 'win' | 'draw' | 'loss'
  if (ourScore > theirScore) result = 'win'
  else if (ourScore === theirScore) result = 'draw'
  else result = 'loss'
  
  return {
    ...match,
    ourScore,
    theirScore,
    result,
    goalDifference: ourScore - theirScore
  }
})
\`\`\`

---

## Variables de Entorno

### Requeridas para Supabase
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

### Requeridas para PostgreSQL (opcional, para conexiones directas)
\`\`\`env
POSTGRES_URL=postgresql://user:password@host:5432/database
POSTGRES_PRISMA_URL=postgresql://user:password@host:5432/database?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:5432/database
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=database
POSTGRES_HOST=host
\`\`\`

---

## Notas Importantes

### Row Level Security (RLS)
Todas las tablas tienen políticas RLS habilitadas:

- **clubs**: Lectura pública, escritura solo para admins
- **players**: Lectura pública, escritura para admins y coaches del mismo club
- **matches**: Lectura pública, escritura para admins y coaches del mismo club
- **match_stats**: Lectura pública, escritura para admins y coaches del mismo club
- **profiles**: Los usuarios solo pueden ver y editar su propio perfil
- **audit_logs**: Solo lectura para admins

### Campos Auto-calculados

#### Para jugadores de campo:
- `goles_totales`: Suma de todos los tipos de goles
- `tiros_totales`: Suma de goles + tiros fallados
- `tiros_eficiencia`: (goles / tiros_totales) * 100

#### Para porteros:
- `portero_paradas_totales`: Suma de todos los tipos de paradas
- Goles recibidos: Suma de todos los tipos de goles del portero

### Campos Importantes

#### Hombre + (Man Advantage):
- `goles_hombre_mas`: Goles anotados en superioridad numérica
- `tiros_hombre_mas`: Tiros fallados en superioridad numérica
- Eficiencia: (goles_hombre_mas / (goles_hombre_mas + tiros_hombre_mas)) * 100

#### Portero - Goles Recibidos:
Los goles que registra el portero en el campo "goles" representan los goles recibidos del equipo rival:
- `portero_goles_boya_parada`: Goles de boya recibidos
- `portero_goles_hombre_menos`: Goles recibidos en inferioridad
- `portero_goles_dir_mas_5m`: Goles de directo +5m recibidos
- `portero_goles_contraataque`: Goles de contraataque recibidos
- `portero_goles_penalti`: Penaltis recibidos

Estos se suman automáticamente al campo `away_score` del partido.
