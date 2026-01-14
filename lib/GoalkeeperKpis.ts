export type KpiItemGK = {
  key: string
  label: string
  value: React.ReactNode
  cardClass?: string
}

export function buildGoalkeeperKpis(args: {
  matchCount: number
  stats: any
  savePercentage: string
  paradasPerMatch: string
  golesPerMatch: string
}): KpiItemGK[] {
  const { matchCount, stats, savePercentage, paradasPerMatch, golesPerMatch } = args

  return [
    { key: "matches", label: "Partidos Jugados", value: matchCount, cardClass: "bg-gradient-to-br from-blue-500/5 to-blue-500/10" },
    { key: "saves", label: "Paradas Totales", value: stats.portero_paradas_totales, cardClass: "bg-gradient-to-br from-background to-muted" },
    { key: "ga", label: "Goles Recibidos", value: stats.goles_recibidos_reales, cardClass: "bg-gradient-to-br from-blue-500/5 to-blue-500/10" },
    { key: "sv%", label: "% de Paradas", value: `${savePercentage}%`, cardClass: "bg-gradient-to-br from-background to-muted" },
    { key: "savespm", label: "Paradas / Partido", value: paradasPerMatch, cardClass: "bg-gradient-to-br from-blue-500/5 to-blue-500/10" },
    { key: "gapm", label: "Goles Rec. / Partido", value: golesPerMatch, cardClass: "bg-gradient-to-br from-background to-muted" },
  ]
}
