import type { Player } from "@/lib/types"

export interface MatchStatsWithMatch {
  id: number
  goles_totales: number
  tiros_totales: number
  acciones_asistencias: number
  acciones_bloqueo: number
  acciones_recibir_gol: number
  portero_paradas_totales: number
  matches: {
    id: number
    match_date: string
    opponent: string
    home_score: number
    away_score: number
    is_home: boolean
  }
}

export const chartConfig = {
  paradas: { label: "Paradas", color: "hsl(200 80% 50%)" },
  eficiencia: { label: "Eficiencia %", color: "hsl(160 70% 50%)" },
  goles: { label: "Goles", color: "hsl(200 80% 50%)" },
  asistencias: { label: "Asistencias", color: "hsl(280 70% 60%)" },
  bloqueos: { label: "Bloqueos", color: "hsl(220 80% 55%)" },
  golesRecibidos: { label: "Goles Recibidos", color: "hsl(0 70% 60%)" },
  mediaBloqueos: { label: "Media Bloqueos", color: "hsl(220 90% 40%)" },
  mediaGolesRecibidos: { label: "Media Goles Recibidos", color: "hsl(0 80% 45%)" },
}

export function sortStatsByDate(matchStats: MatchStatsWithMatch[]) {
  return [...matchStats].sort(
    (a, b) => new Date(a.matches.match_date).getTime() - new Date(b.matches.match_date).getTime(),
  )
}

export function buildEvolutionData(matchStats: MatchStatsWithMatch[], player: Player) {
  const sorted = sortStatsByDate(matchStats)

  return sorted.map((stat, index) => {
    const matchDate = new Date(stat.matches.match_date)
    const shortDate = `${matchDate.getDate()}/${matchDate.getMonth() + 1}`

    if (player.is_goalkeeper) {
      const rivalGoals = stat.matches.is_home ? stat.matches.away_score : stat.matches.home_score
      const paradas = stat.portero_paradas_totales || 0
      const totalShots = paradas + (rivalGoals || 0)
      const savePercentage = totalShots > 0 ? Math.round((paradas / totalShots) * 100) : 0

      return {
        match: `J${index + 1}`,
        date: shortDate,
        opponent: stat.matches.opponent.substring(0, 10),
        paradas,
        eficiencia: savePercentage,
        goles: stat.goles_totales || 0,
      }
    }

    const goles = stat.goles_totales || 0
    const tiros = stat.tiros_totales || 0
    const efficiency = tiros > 0 ? Math.round((goles / tiros) * 100) : 0

    return {
      match: `J${index + 1}`,
      date: shortDate,
      opponent: stat.matches.opponent.substring(0, 10),
      goles,
      tiros,
      asistencias: stat.acciones_asistencias || 0,
      eficiencia: efficiency,
    }
  })
}

export function buildBlocksVsGoalsData(matchStats: MatchStatsWithMatch[]) {
  const sorted = sortStatsByDate(matchStats)

  let cumulativeBlocks = 0
  let cumulativeGoalsReceived = 0

  return sorted.map((stat, index) => {
    const blocks = stat.acciones_bloqueo || 0
    const goalsReceived = stat.acciones_recibir_gol || 0

    cumulativeBlocks += blocks
    cumulativeGoalsReceived += goalsReceived

    const matchesPlayed = index + 1
    const avgBlocks = cumulativeBlocks / matchesPlayed
    const avgGoalsReceived = cumulativeGoalsReceived / matchesPlayed

    const matchDate = new Date(stat.matches.match_date)
    const shortDate = `${matchDate.getDate()}/${matchDate.getMonth() + 1}`

    return {
      match: `J${index + 1}`,
      date: shortDate,
      opponent: stat.matches.opponent.substring(0, 10),
      bloqueos: blocks,
      golesRecibidos: goalsReceived,
      mediaBloqueos: Number(avgBlocks.toFixed(2)),
      mediaGolesRecibidos: Number(avgGoalsReceived.toFixed(2)),
    }
  })
}
