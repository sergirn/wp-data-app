export type KpiItem = {
  key: string
  label: string
  value: React.ReactNode
  cardClass?: string
}

export function buildFieldPlayerKpis(args: {
  matchCount: number
  stats: any
  eficienciaGeneral: string
  totalExclusiones: number
  golesPerMatch: string
}): KpiItem[] {
  const { matchCount, stats, eficienciaGeneral, totalExclusiones, golesPerMatch } = args

  return [
    { key: "matches", label: "Partidos", value: matchCount, cardClass: "bg-gradient-to-br from-blue-500/5 to-blue-500/10" },
    { key: "goals", label: "Goles", value: stats.goles_totales, cardClass: "bg-gradient-to-br from-background to-muted" },
    { key: "shots", label: "Tiros", value: stats.tiros_totales, cardClass: "bg-gradient-to-br from-blue-500/5 to-blue-500/10" },
    { key: "eff", label: "Eficiencia", value: `${eficienciaGeneral}%`, cardClass: "bg-gradient-to-br from-background to-muted" },
    { key: "assists", label: "Asistencias", value: stats.acciones_asistencias, cardClass: "bg-gradient-to-br from-blue-500/5 to-blue-500/10" },
    { key: "blocks", label: "Bloqueos", value: stats.acciones_bloqueo, cardClass: "bg-gradient-to-br from-background to-muted" },
    { key: "excl", label: "Exclusiones", value: totalExclusiones, cardClass: "bg-gradient-to-br from-blue-500/5 to-blue-500/10" },
    { key: "gpm", label: "Goles/Partido", value: golesPerMatch, cardClass: "bg-gradient-to-br from-background to-muted" },
  ]
}
