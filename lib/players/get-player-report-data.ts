import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getPlayerDerived,
  accumulatePlayerStats,
} from "@/lib/stats/playerStatsHelpers"
import {
  getGoalkeeperDerived,
  accumulateGoalkeeperStats,
} from "@/lib/stats/goalkeeperStatsHelpers"

function gkN(v: any) {
  return Number.isFinite(Number(v)) ? Number(v) : 0
}

export async function getHiddenStatsForProfile(profileId?: string | null) {
  const supabase = await createClient()

  if (!profileId) return []

  const { data } = await supabase
    .from("profile_hidden_stats")
    .select("stat_key")
    .eq("profile_id", profileId)

  return data?.map((row) => row.stat_key) ?? []
}

export async function getPlayerTotalsReportData(playerId: number, profileId?: string | null) {
  const supabase = await createClient()
  const hiddenStats = await getHiddenStatsForProfile(profileId)

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single()

  if (playerError || !player) notFound()

  const { data: matchStats } = await supabase
    .from("match_stats")
    .select(`
      *,
      matches (*)
    `)
    .eq("player_id", playerId)
    .order("matches(match_date)", { ascending: false })

  const rows = matchStats ?? []
  const matchCount = rows.length

  if (player.is_goalkeeper) {
    const totalsBase = accumulateGoalkeeperStats(rows as Array<Record<string, any>>, hiddenStats)

    const goles_recibidos_reales = hiddenStats.includes("goles_recibidos_reales")
      ? 0
      : rows.reduce((acc: number, stat: any) => {
          const match = stat.matches
          const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0
          return acc + gkN(rivalGoals)
        }, 0)

    const totals = {
      ...totalsBase,
      goles_recibidos_reales,
    }

    const derived = getGoalkeeperDerived(totals, hiddenStats)

    const hydratedMatchStats = rows.map((row: any) => ({
      ...row,
      derived: getGoalkeeperDerived(row, hiddenStats),
    }))

    return {
      kind: "goalkeeper" as const,
      player,
      hiddenStats,
      matchCount,
      totals,
      derived,
      matchStats: hydratedMatchStats,
    }
  }

  const totals = accumulatePlayerStats(rows as Array<Record<string, any>>, hiddenStats)
  const derived = getPlayerDerived(totals, hiddenStats)

  const hydratedMatchStats = rows.map((row: any) => ({
    ...row,
    derived: getPlayerDerived(row, hiddenStats),
  }))

  return {
    kind: "field" as const,
    player,
    hiddenStats,
    matchCount,
    totals,
    derived,
    matchStats: hydratedMatchStats,
  }
}

export async function getPlayerMatchReportData(
  playerId: number,
  matchStatId: number,
  profileId?: string | null
) {
  const supabase = await createClient()
  const hiddenStats = await getHiddenStatsForProfile(profileId)

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single()

  if (playerError || !player) notFound()

  const { data: stat, error: statError } = await supabase
    .from("match_stats")
    .select(`
      *,
      matches (*)
    `)
    .eq("id", matchStatId)
    .eq("player_id", playerId)
    .single()

  if (statError || !stat) notFound()

  if (player.is_goalkeeper) {
    const derived = getGoalkeeperDerived(stat, hiddenStats)

    return {
      kind: "goalkeeper" as const,
      player,
      hiddenStats,
      stat,
      match: stat.matches,
      derived,
    }
  }

  const derived = getPlayerDerived(stat, hiddenStats)

  return {
    kind: "field" as const,
    player,
    hiddenStats,
    stat,
    match: stat.matches,
    derived,
  }
}