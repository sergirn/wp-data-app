"use client"


import { DisciplineChart } from "./DisciplineChart"
import { PositiveActionsChart } from "./PositiveActionsChart"
import { NegativeActionsChart } from "./NegativeActionsChart"
import { ManAdvantageChart } from "./ManAdvantageChart"
import { PenaltiesChart } from "./PenaltiesChart"
import { GoalsAndShotsChart } from "./ShootingEfficiencyPlayerChart"

interface Props {
  matches: any[]
  stats: any[]
}

export function StatsCharts6x6({ matches, stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      <GoalsAndShotsChart matches={matches} stats={stats} />
      <DisciplineChart matches={matches} stats={stats} />
      <PositiveActionsChart matches={matches} stats={stats} />
      <NegativeActionsChart matches={matches} stats={stats} />
      <ManAdvantageChart matches={matches} stats={stats} />
      <PenaltiesChart matches={matches} stats={stats} />
    </div>
  )
}
