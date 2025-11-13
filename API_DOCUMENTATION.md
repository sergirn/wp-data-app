# API Endpoints y Operaciones de Base de Datos

## Resumen
Esta aplicación utiliza Supabase como backend, por lo que no hay endpoints REST tradicionales. En su lugar, todas las operaciones se realizan directamente con la base de datos de Supabase usando el cliente de JavaScript/TypeScript.

## Variables de Entorno Necesarias

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio
\`\`\`

## Operaciones CRUD por Tabla

### 1. Clubs (Clubes)

**Estructura:**
\`\`\`typescript
interface Club {
  id: number
  name: string
  short_name: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  created_at: string
  updated_at: string
}
\`\`\`

**Operaciones:**

\`\`\`typescript
// Obtener todos los clubes
const { data, error } = await supabase
  .from('clubs')
  .select('*')
  .order('name')

// Obtener un club por ID
const { data, error } = await supabase
  .from('clubs')
  .select('*')
  .eq('id', clubId)
  .single()

// Crear un club
const { data, error } = await supabase
  .from('clubs')
  .insert({
    name: 'Nombre del Club',
    short_name: 'Siglas',
    logo_url: '/logos/club-logo.png',
    primary_color: '#0000FF',
    secondary_color: '#FFFFFF'
  })
  .select()
  .single()

// Actualizar un club
const { data, error } = await supabase
  .from('clubs')
  .update({
    name: 'Nuevo Nombre',
    logo_url: '/logos/new-logo.png'
  })
  .eq('id', clubId)
  .select()
  .single()

// Eliminar un club
const { error } = await supabase
  .from('clubs')
  .delete()
  .eq('id', clubId)
\`\`\`

### 2. Players (Jugadores)

**Estructura:**
\`\`\`typescript
interface Player {
  id: number
  club_id: number
  name: string
  number: number
  is_goalkeeper: boolean
  created_at: string
}
\`\`\`

**Operaciones:**

\`\`\`typescript
// Obtener todos los jugadores de un club
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .order('number')

// Obtener jugadores de campo
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .eq('is_goalkeeper', false)
  .order('number')

// Obtener porteros
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('club_id', clubId)
  .eq('is_goalkeeper', true)
  .order('number')

// Obtener un jugador por ID
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('id', playerId)
  .single()

// Crear un jugador
const { data, error } = await supabase
  .from('players')
  .insert({
    club_id: clubId,
    name: 'Nombre del Jugador',
    number: 7,
    is_goalkeeper: false
  })
  .select()
  .single()

// Actualizar un jugador
const { data, error } = await supabase
  .from('players')
  .update({
    name: 'Nuevo Nombre',
    number: 10
  })
  .eq('id', playerId)
  .select()
  .single()

// Eliminar un jugador
const { error } = await supabase
  .from('players')
  .delete()
  .eq('id', playerId)
\`\`\`

### 3. Matches (Partidos)

**Estructura:**
\`\`\`typescript
interface Match {
  id: number
  club_id: number
  opponent: string
  match_date: string
  location: string
  is_home: boolean
  home_score: number
  away_score: number
  jornada: number
  season: string
  notes: string | null
  created_at: string
}
\`\`\`

**Operaciones:**

\`\`\`typescript
// Obtener todos los partidos de un club
const { data, error } = await supabase
  .from('matches')
  .select('*')
  .eq('club_id', clubId)
  .order('match_date', { ascending: false })

// Obtener partidos por temporada
const { data, error } = await supabase
  .from('matches')
  .select('*')
  .eq('club_id', clubId)
  .eq('season', '2024-2025')
  .order('match_date', { ascending: false })

// Obtener un partido con estadísticas
const { data, error } = await supabase
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

// Crear un partido
const { data, error } = await supabase
  .from('matches')
  .insert({
    club_id: clubId,
    opponent: 'Rival FC',
    match_date: '2024-03-15',
    location: 'Piscina Municipal',
    is_home: true,
    home_score: 10,
    away_score: 8,
    jornada: 15,
    season: '2024-2025',
    notes: 'Notas del partido'
  })
  .select()
  .single()

// Actualizar un partido
const { data, error } = await supabase
  .from('matches')
  .update({
    home_score: 12,
    away_score: 9,
    notes: 'Actualización de notas'
  })
  .eq('id', matchId)
  .select()
  .single()

// Eliminar un partido (también elimina estadísticas relacionadas)
const { error } = await supabase
  .from('matches')
  .delete()
  .eq('id', matchId)
\`\`\`

### 4. Match Stats (Estadísticas de Partido)

**Estructura para Jugadores de Campo:**
\`\`\`typescript
interface FieldPlayerMatchStats {
  id: number
  match_id: number
  player_id: number
  
  // Goles
  goles_totales: number
  goles_boya_jugada: number
  goles_hombre_mas: number
  goles_lanzamiento: number
  goles_dir_mas_5m: number
  goles_contraataque: number
  goles_penalti_anotado: number
  
  // Tiros
  tiros_totales: number
  tiros_penalti_fallado: number
  tiros_corner: number
  tiros_fuera: number
  tiros_parados: number
  tiros_bloqueado: number
  
  // Faltas
  faltas_exp_20_1c1: number
  faltas_exp_20_boya: number
  faltas_penalti: number
  faltas_contrafaltas: number
  
  // Acciones
  acciones_bloqueo: number
  acciones_asistencias: number
  acciones_recuperacion: number
  acciones_rebote: number
  acciones_exp_provocada: number
  acciones_penalti_provocado: number
  acciones_recibir_gol: number
  
  created_at: string
}
\`\`\`

**Estructura para Porteros:**
\`\`\`typescript
interface GoalkeeperMatchStats {
  id: number
  match_id: number
  player_id: number
  
  // Goles Recibidos
  portero_goles_totales: number
  portero_goles_boya: number
  portero_goles_hombre_menos: number
  portero_goles_dir_mas_5m: number
  portero_goles_contraataque: number
  portero_goles_penalti: number
  
  // Paradas
  portero_paradas_totales: number
  portero_paradas_parada_recup: number
  portero_paradas_fuera: number
  portero_paradas_penalti_parado: number
  portero_paradas_hombre_menos: number
  
  // Acciones
  portero_acciones_asistencias: number
  portero_acciones_recuperacion: number
  portero_acciones_perdida_pos: number
  portero_acciones_exp_provocada: number
  
  created_at: string
}
\`\`\`

**Operaciones:**

\`\`\`typescript
// Obtener estadísticas de un partido
const { data, error } = await supabase
  .from('match_stats')
  .select(`
    *,
    players (*)
  `)
  .eq('match_id', matchId)

// Obtener estadísticas de un jugador
const { data, error } = await supabase
  .from('match_stats')
  .select(`
    *,
    matches (*)
  `)
  .eq('player_id', playerId)
  .order('matches(match_date)', { ascending: false })

// Crear estadísticas de partido
const { data, error } = await supabase
  .from('match_stats')
  .insert({
    match_id: matchId,
    player_id: playerId,
    goles_totales: 3,
    tiros_totales: 5,
    acciones_asistencias: 2
    // ... más campos
  })
  .select()
  .single()

// Actualizar estadísticas
const { data, error } = await supabase
  .from('match_stats')
  .update({
    goles_totales: 4,
    tiros_totales: 6
  })
  .eq('id', statId)
  .select()
  .single()

// Eliminar estadísticas
const { error } = await supabase
  .from('match_stats')
  .delete()
  .eq('id', statId)
\`\`\`

### 5. Profiles (Perfiles de Usuario)

**Estructura:**
\`\`\`typescript
interface Profile {
  id: string // UUID from auth.users
  email: string
  full_name: string | null
  role: 'admin' | 'coach' | 'viewer'
  club_id: number | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
}
\`\`\`

**Operaciones:**

\`\`\`typescript
// Obtener perfil del usuario actual
const { data: { user } } = await supabase.auth.getUser()
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

// Obtener todos los perfiles de un club
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('club_id', clubId)

// Actualizar perfil
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'Nombre Completo',
    role: 'coach'
  })
  .eq('id', userId)
  .select()
  .single()
\`\`\`

### 6. Audit Logs (Registros de Auditoría)

**Estructura:**
\`\`\`typescript
interface AuditLog {
  id: number
  table_name: string
  record_id: number
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: any
  new_data: any
  user_id: string
  created_at: string
}
\`\`\`

**Operaciones:**

\`\`\`typescript
// Obtener logs de auditoría
const { data, error } = await supabase
  .from('audit_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100)

// Obtener logs de una tabla específica
const { data, error } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('table_name', 'matches')
  .order('created_at', { ascending: false })
\`\`\`

## Autenticación

### Registro
\`\`\`typescript
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@ejemplo.com',
  password: 'contraseña_segura',
  options: {
    data: {
      full_name: 'Nombre Completo',
      club_id: clubId
    }
  }
})
\`\`\`

### Inicio de Sesión
\`\`\`typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@ejemplo.com',
  password: 'contraseña'
})
\`\`\`

### Cerrar Sesión
\`\`\`typescript
const { error } = await supabase.auth.signOut()
\`\`\`

### Obtener Usuario Actual
\`\`\`typescript
const { data: { user }, error } = await supabase.auth.getUser()
\`\`\`

## Row Level Security (RLS)

Todas las tablas tienen políticas RLS habilitadas:

- **clubs**: Lectura pública, escritura solo para admins
- **players**: Lectura pública, escritura para admins y coaches del club
- **matches**: Lectura pública, escritura para admins y coaches del club
- **match_stats**: Lectura pública, escritura para admins y coaches del club
- **profiles**: Los usuarios solo pueden ver/editar su propio perfil, admins pueden ver todos
- **audit_logs**: Solo lectura para admins

## Consultas Complejas Útiles

### Obtener estadísticas agregadas de un jugador
\`\`\`typescript
const { data, error } = await supabase
  .from('match_stats')
  .select('*')
  .eq('player_id', playerId)

// Calcular totales en el cliente
const totals = data.reduce((acc, stat) => ({
  totalGoles: acc.totalGoles + (stat.goles_totales || 0),
  totalTiros: acc.totalTiros + (stat.tiros_totales || 0),
  totalAsistencias: acc.totalAsistencias + (stat.acciones_asistencias || 0)
}), { totalGoles: 0, totalTiros: 0, totalAsistencias: 0 })
\`\`\`

### Obtener top goleadores de una temporada
\`\`\`typescript
const { data: matches } = await supabase
  .from('matches')
  .select('id')
  .eq('club_id', clubId)
  .eq('season', '2024-2025')

const matchIds = matches.map(m => m.id)

const { data: stats } = await supabase
  .from('match_stats')
  .select(`
    player_id,
    goles_totales,
    players (name, number)
  `)
  .in('match_id', matchIds)

// Agrupar y ordenar en el cliente
const playerGoals = stats.reduce((acc, stat) => {
  const playerId = stat.player_id
  if (!acc[playerId]) {
    acc[playerId] = {
      player: stat.players,
      totalGoles: 0
    }
  }
  acc[playerId].totalGoles += stat.goles_totales
  return acc
}, {})

const topScorers = Object.values(playerGoals)
  .sort((a, b) => b.totalGoles - a.totalGoles)
  .slice(0, 10)
\`\`\`

## Notas Importantes

1. **Transacciones**: Supabase no soporta transacciones multi-tabla directamente. Usa funciones de PostgreSQL para operaciones complejas.

2. **Límites**: Por defecto, las consultas están limitadas a 1000 registros. Usa paginación para conjuntos grandes.

3. **Realtime**: Puedes suscribirte a cambios en tiempo real:
\`\`\`typescript
const channel = supabase
  .channel('matches-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'matches' },
    (payload) => console.log('Change received!', payload)
  )
  .subscribe()
\`\`\`

4. **Optimización**: Usa `.select()` con campos específicos en lugar de `*` para mejorar el rendimiento.

5. **Errores**: Siempre verifica `error` antes de usar `data`.
