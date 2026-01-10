import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "./StatCard"
import { InsightAlert } from "./InsightAlert"

interface AttackBlockProps {
  teamStats: any
}

export function AttackBlock({ teamStats }: AttackBlockProps) {

  const goalsAvg = 11.2
  const efficiency = 48
  const hmEfficiency = 42
  const counterEfficiency = 61

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ataque</CardTitle>
        <CardDescription>
          Producción y calidad ofensiva
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Goles / partido" value={goalsAvg} />
          <StatCard label="Eficiencia" value={`${efficiency}%`} />
          <StatCard label="HM %" value={`${hmEfficiency}%`} />
          <StatCard label="Contraataque %" value={`${counterEfficiency}%`} />
        </div>

        <InsightAlert
          text="Eficacia baja en superioridad respecto a la media"
          type="warning"
        />
      </CardContent>
    </Card>
  )
}
