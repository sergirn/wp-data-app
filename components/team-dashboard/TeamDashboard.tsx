import { AttackBlock } from "./AttackBlock"
import { DefenseBlock } from "./DefenseBlock"
import { GoalkeeperBlock } from "./GoalkeeperBlock"

interface TeamDashboardProps {
  teamStats?: any
}

export function TeamDashboard({ teamStats }: TeamDashboardProps) {
  const playerStats =
    (Array.isArray(teamStats) && teamStats) ||
    (Array.isArray(teamStats?.playerStats) && teamStats.playerStats) ||
    (Array.isArray(teamStats?.players) && teamStats.players) ||
    []

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AttackBlock playerStats={playerStats} />
        <DefenseBlock playerStats={playerStats} />
        <GoalkeeperBlock playerStats={playerStats}  />
      </div>
    </section>
  )
}

