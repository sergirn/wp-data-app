import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "./StatCard"
import { InsightAlert } from "./InsightAlert"

interface DefenseBlockProps {
  teamStats: any
}

export function DefenseBlock({ teamStats }: DefenseBlockProps) {
  const blocksAvg = 7.4
  const recoveries = 12
  const counterDefEfficiency = 55
  const foulsProvoked = 4.3

  return (
    <Card>
      <CardHeader>
        <CardTitle>Defensa</CardTitle>
        <CardDescription>Capacidad defensiva y recuperación de balón</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Bloqueos / partido" value={blocksAvg} />
          <StatCard label="Recuperaciones" value={recoveries} />
          <StatCard label="Efic. Contra %" value={`${counterDefEfficiency}%`} />
          <StatCard label="Faltas provocadas" value={foulsProvoked} />
        </div>

        <InsightAlert text="Pocos bloqueos en inferioridad" type="warning" />
      </CardContent>
    </Card>
  )
}
