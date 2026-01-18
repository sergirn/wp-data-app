export type GKShotRow = {
  id: number
  match_id: number
  goalkeeper_player_id: number
  result: "goal" | "save"
  x: number
  y: number
  created_at: string
  matches?: {
    jornada: number | null
    match_date: string
    opponent: string
    season: string | null
  } | null
}