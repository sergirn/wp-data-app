import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "./StatCard"
import { InsightAlert } from "./InsightAlert"

interface ControlBlockProps {
  teamStats: any
}

export function ControlBlock({ teamStats }: ControlBlockProps) {
  const possession = 54
  const turnovers = 10
  const setPlays = 8
  const fastBreaks = 6

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control</CardTitle>
        <CardDescription>Dominio de juego y gestión de balón</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Posesión %" value={`${possession}%`} />
          <StatCard label="Pérdidas" value={turnovers} />
          <StatCard label="Jugadas planificadas" value={setPlays} />
          <StatCard label="Contraataques" value={fastBreaks} />
        </div>

        <InsightAlert text="Pérdidas altas en presión rival" type="warning" />
      </CardContent>
    </Card>
  )
}
