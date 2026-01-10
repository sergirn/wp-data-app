import { AttackBlock } from "./AttackBlock"
import { DefenseBlock } from "./DefenseBlock"
import { ControlBlock } from "./ControlBlock"
import { GoalkeeperBlock } from "./GoalkeeperBlock"

interface TeamDashboardProps {
  teamStats?: any // luego rellenar con datos reales
}

export function TeamDashboard({ teamStats }: TeamDashboardProps) {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttackBlock teamStats={teamStats} />
        <DefenseBlock teamStats={teamStats} />
        <ControlBlock teamStats={teamStats} />
        <GoalkeeperBlock teamStats={teamStats} />
      </div>
    </section>
  )
}
