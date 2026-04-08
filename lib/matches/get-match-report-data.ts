import { createClient } from "@/lib/supabase/server"
import {
  accumulatePlayerStats,
  getPlayerDerived,
  getPlayerSummary,
} from "@/lib/stats/playerStatsHelpers"
import {
  accumulateGoalkeeperStats,
  getGoalkeeperDerived,
  getGoalkeeperSummary,
} from "@/lib/stats/goalkeeperStatsHelpers"

type PlayerMini = {
  id: number
  name: string
  number: number
  photo_url?: string | null
}

function calculateSuperioridadStats(stats: any[]) {
  const anotadas = stats.reduce((acc, stat) => acc + (stat.goles_hombre_mas || 0), 0)
  const anotadas_palo = stats.reduce((acc, stat) => acc + (stat.gol_del_palo_sup || 0), 0)
  const falladas = stats.reduce((acc, stat) => acc + (stat.tiros_hombre_mas || 0), 0)

  const rebotesRecuperados = stats.reduce((acc, stat) => acc + (stat.rebote_recup_hombre_mas || 0), 0)
  const rebotesPerdidos = stats.reduce((acc, stat) => acc + (stat.rebote_perd_hombre_mas || 0), 0)

  const goles = anotadas + anotadas_palo
  const total = goles + falladas
  const eficiencia = total > 0 ? ((goles / total) * 100).toFixed(1) : "0.0"

  return {
    anotadas,
    anotadas_palo,
    falladas,
    total,
    eficiencia: Number.parseFloat(eficiencia),
    rebotesRecuperados,
    rebotesPerdidos,
  }
}

function calculateInferioridadStats(stats: any[]) {
  const paradas = stats.reduce((acc, stat) => acc + (stat.portero_paradas_hombre_menos ?? 0), 0)
  const fuera = stats.reduce((acc, stat) => acc + (stat.portero_inferioridad_fuera ?? 0), 0)
  const bloqueo = stats.reduce((acc, stat) => acc + (stat.portero_inferioridad_bloqueo ?? 0), 0)

  const evitados = paradas + fuera + bloqueo
  const recibidos = stats.reduce(
    (acc, stat) => acc + (stat.portero_goles_hombre_menos ?? 0) + (stat.portero_gol_palo ?? 0),
    0
  )

  const total = evitados + recibidos
  const eficiencia = total > 0 ? Math.round((evitados / total) * 1000) / 10 : 0

  return { evitados, recibidos, paradas, fuera, bloqueo, total, eficiencia }
}

function calculateBlocksStats(stats: any[], golesRecibidos: number) {
  const bloqueos = stats.reduce((acc, stat) => acc + (stat.acciones_bloqueo || 0), 0)
  const total = bloqueos + golesRecibidos
  const eficacia = total > 0 ? ((bloqueos / total) * 100).toFixed(1) : "0.0"

  return {
    bloqueos,
    golesRecibidos,
    eficacia: Number.parseFloat(eficacia),
  }
}

const normalizeRel = <T,>(rel: T | T[] | null | undefined): T | null => {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

export async function getMatchReportData(matchId: number, profileId?: string | null) {
  const supabase = await createClient()

  const { data: match, error } = await supabase
    .from("matches")
    .select(`
      *,
      clubs (*),
      competitions:competition_id ( id, name, slug, image_url ),
      match_stats (
        *,
        players (*)
      )
    `)
    .eq("id", matchId)
    .maybeSingle()

  if (error || !match) {
    throw new Error("Match not found")
  }

  const hiddenStats =
    profileId != null
      ? (
          await supabase
            .from("profile_hidden_stats")
            .select("stat_key")
            .eq("profile_id", profileId)
        ).data?.map((row) => row.stat_key) ?? []
      : []

  const { data: penaltyRows } = await supabase
    .from("penalty_shootout_players")
    .select(`
      id,
      match_id,
      shot_order,
      scored,
      result_type,
      player_id,
      goalkeeper_id,
      players:player_id (
        id,
        name,
        number,
        photo_url
      ),
      goalkeeper:goalkeeper_id (
        id,
        name,
        number,
        photo_url
      )
    `)
    .eq("match_id", matchId)
    .order("shot_order", { ascending: true })

  const { data: gkShots } = await supabase
    .from("goalkeeper_shots")
    .select("id, match_id, goalkeeper_player_id, x, y, result, shot_index")
    .eq("match_id", match.id)
    .order("shot_index", { ascending: true })

  const isTied = match.home_score === match.away_score
  const hasPenalties =
    isTied && (match.penalty_home_score != null || match.penalty_away_score != null)

  const homePenaltyShooters = (penaltyRows ?? [])
    .filter((r: any) => r.player_id !== null)
    .map((r: any) => ({
      ...r,
      players: normalizeRel(r.players),
    }))

  const rivalPenaltyShots = (penaltyRows ?? [])
    .filter((r: any) => r.player_id === null)
    .map((r: any) => ({
      ...r,
      goalkeeper: normalizeRel(r.goalkeeper),
    }))

  const playersById = new Map<number, PlayerMini>(
    (match.match_stats ?? []).map((s: any) => {
      const p = s.players
      return [p.id, { id: p.id, name: p.name, number: p.number, photo_url: p.photo_url }]
    })
  )

  const getWinner = (playerId: number | null | undefined): PlayerMini | null => {
    if (!playerId) return null
    return playersById.get(playerId) ?? null
  }

  const periods = [
    {
      q: 1,
      home: match.q1_score ?? 0,
      away: match.q1_score_rival ?? 0,
      winner: getWinner(match.sprint1_winner_player_id),
    },
    {
      q: 2,
      home: match.q2_score ?? 0,
      away: match.q2_score_rival ?? 0,
      winner: getWinner(match.sprint2_winner_player_id),
    },
    {
      q: 3,
      home: match.q3_score ?? 0,
      away: match.q3_score_rival ?? 0,
      winner: getWinner(match.sprint3_winner_player_id),
    },
    {
      q: 4,
      home: match.q4_score ?? 0,
      away: match.q4_score_rival ?? 0,
      winner: getWinner(match.sprint4_winner_player_id),
    },
  ]

  const fieldPlayersStats = (match.match_stats ?? [])
    .filter((stat: any) => !stat.players.is_goalkeeper)
    .sort((a: any, b: any) => a.players.number - b.players.number)

  const goalkeepersStats = (match.match_stats ?? [])
    .filter((stat: any) => stat.players.is_goalkeeper)
    .sort((a: any, b: any) => a.players.number - b.players.number)

  const superioridadStats = calculateSuperioridadStats(match.match_stats ?? [])
  const inferioridadStats = calculateInferioridadStats(match.match_stats ?? [])
  const blocksStats = calculateBlocksStats(match.match_stats ?? [], match.away_score ?? 0)
  const players = (match.match_stats ?? []).map((s: any) => s.players)

  const attackTotals = accumulatePlayerStats(match.match_stats ?? [], hiddenStats)
  const attackDerived = getPlayerDerived(attackTotals, hiddenStats)
  const attackSummary = getPlayerSummary(attackTotals, hiddenStats)

  const defenseTotals = attackTotals
  const defenseDerived = attackDerived
  const defenseSummary = attackSummary

  const goalkeeperTotals = accumulateGoalkeeperStats(match.match_stats ?? [], hiddenStats)
  const goalkeeperDerived = getGoalkeeperDerived(goalkeeperTotals, hiddenStats)
  const goalkeeperSummary = getGoalkeeperSummary(goalkeeperTotals, hiddenStats)

  const clubName = match.clubs?.short_name || match.clubs?.name || "Nuestro Equipo"
  const matchDate = new Date(match.match_date)

  let result: string
  if (hasPenalties) {
    result =
      match.penalty_home_score! > match.penalty_away_score!
        ? "Victoria (Penaltis)"
        : "Derrota (Penaltis)"
  } else {
    result =
      match.home_score > match.away_score
        ? "Victoria"
        : match.home_score < match.away_score
          ? "Derrota"
          : "Empate"
  }

  return {
    match,
    clubName,
    matchDate,
    result,
    hasPenalties,
    periods,
    homePenaltyShooters,
    rivalPenaltyShots,
    fieldPlayersStats,
    goalkeepersStats,
    superioridadStats,
    inferioridadStats,
    blocksStats,
    players,
    hiddenStats,
    allGoalkeeperShots: gkShots ?? [],

    attackTotals,
    attackDerived,
    attackSummary,

    defenseTotals,
    defenseDerived,
    defenseSummary,

    goalkeeperTotals,
    goalkeeperDerived,
    goalkeeperSummary,
  }
}