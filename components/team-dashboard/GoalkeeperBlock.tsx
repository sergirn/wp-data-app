import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "./StatCard"
import { InsightAlert } from "./InsightAlert"

interface GoalkeeperBlockProps {
  teamStats: any
}

export function GoalkeeperBlock({ teamStats }: GoalkeeperBlockProps) {
  const saves = 22
  const saveRate = 48
  const penaltiesSaved = 2
  const goalsAgainstHM = 5

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portero</CardTitle>
        <CardDescription>Rendimiento bajo palos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Paradas" value={saves} />
          <StatCard label="Eficiencia %" value={`${saveRate}%`} />
          <StatCard label="Penales parados" value={penaltiesSaved} />
          <StatCard label="Goles recibidos HM" value={goalsAgainstHM} />
        </div>

        <InsightAlert text="Eficiencia baja en inferioridad" type="warning" />
      </CardContent>
    </Card>
  )
}
