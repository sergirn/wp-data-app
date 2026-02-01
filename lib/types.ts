export interface Player {
  id: number
  number: number
  name: string
  is_goalkeeper: boolean
  club_id: number
  photo_url?: string | null // Added photo_url field for player photos
}

export interface Match {
  id: number
  match_date: string
  opponent: string
  location: string | null
  home_score: number
  away_score: number
  is_home: boolean
  season: string | null
  jornada: number | null
  notes: string | null
  club_id: number
  penalty_home_score: number | null // Added penalty shootout fields
  penalty_away_score: number | null
}

export type MatchWithQuarterScores = Match & {
  q1_score?: number
  q1_score_rival?: number
  q2_score?: number
  q2_score_rival?: number
  q3_score?: number
  q3_score_rival?: number
  q4_score?: number
  q4_score_rival?: number
}

export interface MatchStats {
  id?: number
  match_id: number
  player_id: number

  // Goals
  goles_totales: number // Auto-calculated from all goal types
  goles_boya_jugada: number // Boya/jugada goals
  goles_hombre_mas: number // Man advantage goals
  goles_lanzamiento: number // Drive shot goals
  goles_dir_mas_5m: number // Direct +5m goals
  goles_contraataque: number // Counterattack goals
  goles_penalti_anotado: number // Penalty goals scored

  // Legacy goal fields (keeping for backward compatibility)
  goles_boya_cada: number
  goles_penalti_juego: number
  goles_penalti_fallo: number
  goles_corner: number
  goles_fuera: number
  goles_parados: number
  goles_bloqueado: number
  goles_eficiencia: number

  // Shots
  tiros_totales: number // Auto-calculated: goals + missed shots
  tiros_hombre_mas: number // Man advantage missed shots
  tiros_penalti_fallado: number // Missed penalties
  tiros_corner: number // Corner shots (missed)
  tiros_fuera: number // Shots out
  tiros_parados: number // Shots saved
  tiros_bloqueado: number // Shots blocked
  tiros_eficiencia: number // Auto-calculated: goals / (goals + shots) * 100

  // Legacy shot fields (keeping for backward compatibility)
  tiros_boya_cada: number
  tiros_lanzamiento: number
  tiros_dir_mas_5m: number
  tiros_contraataque: number
  tiros_penalti_juego: number

  // Fouls
  faltas_exp_20_1c1: number // 20" exclusion 1-on-1
  faltas_exp_20_boya: number // 20" exclusion boya
  faltas_penalti: number // Penalty fouls
  faltas_contrafaltas: number // Counter fouls

  // Legacy foul fields (keeping for backward compatibility)
  faltas_exp_3_int: number
  faltas_exp_3_bruta: number

  // Actions
  acciones_bloqueo: number // Blocks
  acciones_asistencias: number // Assists
  acciones_recuperacion: number // Recoveries
  acciones_rebote: number // Rebounds
  acciones_exp_provocada: number // Exclusions drawn
  acciones_penalti_provocado: number // Penalties drawn
  acciones_recibir_gol: number // Goals received

  // Legacy action fields (keeping for backward compatibility)
  acciones_perdida_poco: number

  // Goalkeeper stats
  portero_gol: number // Regular goals conceded
  portero_gol_superioridad: number // Goals conceded in opponent's numerical superiority
  portero_fallo_superioridad: number // Opponent's misses in numerical superiority
  portero_goles_totales: number // Added total goals conceded
  portero_goles_boya: number // Updated field name
  portero_goles_hombre_menos: number
  portero_goles_dir_mas_5m: number // Updated field name
  portero_goles_contraataque: number
  portero_goles_penalti: number

  portero_paradas_totales: number
  portero_paradas_parada_recup: number // Updated field name
  portero_paradas_fuera: number
  portero_paradas_penalti_parado: number
  portero_paradas_hombre_menos: number // Added man down saves

  portero_acciones_asistencias: number // Updated field name
  portero_acciones_recuperacion: number // Updated field name
  portero_acciones_perdida_pos: number
  portero_acciones_exp_provocada: number // Updated field name

  portero_goles_boya_parada: number
  portero_goles_lanzamiento: number
  portero_goles_penalti_encajado: number
  portero_tiros_parado: number
  portero_tiros_parada_recup: number
  portero_faltas_exp_3_int: number
  portero_acciones_rebote: number
  portero_acciones_gol_recibido: number
  portero_paradas_pedida: number
  portero_exp_provocada: number
  portero_penalti_provocado: number
  portero_recibir_gol: number
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: "admin" | "coach" | "viewer"
  club_id: number | null // Added club_id
  is_super_admin: boolean // Added super admin flag
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  user_id: string | null
  action: string
  table_name: string
  record_id: number | null
  old_data: any
  new_data: any
  created_at: string
}

export interface Club {
  id: number
  name: string
  short_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  created_at: string
  updated_at: string
}

export interface MatchComparisonTotals {
  matchId: number
  jornada: string
  opponent: string
  result: string

  // ATAQUE
  goles: number
  tiros: number
  eficienciaTiro: number
  asistencias: number

  golesHombreMas: number
  fallosHombreMas: number
  eficienciaHombreMas: number

  // DEFENSA
  bloqueos: number
  recuperaciones: number
  perdidas: number
  balancePosesion: number

  golesRecibidos: number

  golesRecibidosHombreMenos: number
  paradasHombreMenos: number
  eficienciaDefensivaHombreMenos: number

  // PORTERO
  paradasPortero: number
  paradasConRecuperacion: number
  porcentajeParadas: number
}
