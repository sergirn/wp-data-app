"use client"

import { GK_GoalsConcededChart } from "./GK_GoalsConcededChart"
import { GK_OffensiveChart } from "./GK_OffensiveChart"
import { GK_ParticipationChart } from "./GK_ParticipationChart"
import { GK_PenaltiesChart } from "./GK_PenaltiesChart"
import { GK_SavesAndGoalsChart } from "./GK_SavesAndGoalsChart"
import { GK_SavesBreakdownChart } from "./GK_SavesBreakdownChart"



export function StatsChartsGoalkeeper({
  matches,
  stats,
}: {
  matches: any[]
  stats: any[]
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      <GK_SavesAndGoalsChart matches={matches} stats={stats} />
      <GK_GoalsConcededChart matches={matches} stats={stats} />
      <GK_SavesBreakdownChart matches={matches} stats={stats} />
      <GK_ParticipationChart matches={matches} stats={stats} />
      <GK_PenaltiesChart matches={matches} stats={stats} />
      <GK_OffensiveChart matches={matches} stats={stats} />
    </div>
  )
}
