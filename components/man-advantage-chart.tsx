"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import type { Match, MatchStats, Player } from "@/lib/types"

interface ManAdvantageChartProps {
  matches: Match[]
  stats: MatchStats[]
  players: Player[]
}

export function ManAdvantageChart({ matches, stats, players }: ManAdvantageChartProps) {
  const matchData = matches.map((match, index) => {
    const matchStats = stats.filter((s) => s.match_id === match.id)
    const totalGoals = matchStats.reduce((sum, s) => sum + (s.goles_hombre_mas || 0), 0)
    const totalMisses = matchStats.reduce((sum, s) => sum + (s.tiros_hombre_mas || 0), 0)
    const totalAttempts = totalGoals + totalMisses
    const efficiency = totalAttempts > 0 ? Math.round((totalGoals / totalAttempts) * 100) : 0

    return {
      index,
      matchId: match.id,
      match: `${match.opponent.substring(0, 15)}${match.opponent.length > 15 ? "..." : ""}`,
      fullOpponent: match.opponent,
      jornada: `J${match.jornada || index + 1}`,
      jornadaNumber: match.jornada || index + 1,
      date: new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
      goles: totalGoals,
      fallos: totalMisses,
      eficiencia: efficiency,
      total: totalAttempts,
    }
  })

  const chartData = matchData.map((match, index) => {
    const previousMatches = matchData.slice(0, index + 1)
    const avgEfficiency = previousMatches.reduce((sum, m) => sum + m.eficiencia, 0) / (index + 1)

    return {
      jornada: match.jornada,
      goles: match.goles,
      fallos: match.fallos,
      eficienciaAcumulada: Number(avgEfficiency.toFixed(1)),
    }
  })

  // Calculate overall stats
  const totalGoals = matchData.reduce((sum, m) => sum + m.goles, 0)
  const totalMisses = matchData.reduce((sum, m) => sum + m.fallos, 0)
  const totalAttempts = totalGoals + totalMisses
  const overallEfficiency = totalAttempts > 0 ? Math.round((totalGoals / totalAttempts) * 100) : 0
  const avgGoalsPerMatch = matchData.length > 0 ? (totalGoals / matchData.length).toFixed(1) : "0.0"
  const avgMissesPerMatch = matchData.length > 0 ? (totalMisses / matchData.length).toFixed(1) : "0.0"

  const getEfficiencyColor = (eff: number) => {
    if (eff >= 60) return "bg-green-500"
    if (eff >= 40) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eficiencia en Superioridad</CardTitle>
        <CardDescription>Análisis de rendimiento en situaciones de superioridad numérica</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Anotados</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalGoals}</div>
            <div className="text-xs text-muted-foreground mt-1">Media: {avgGoalsPerMatch}/partido</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Fallados</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{totalMisses}</div>
            <div className="text-xs text-muted-foreground mt-1">Media: {avgMissesPerMatch}/partido</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Eficiencia Global</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{overallEfficiency}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalGoals}/{totalAttempts} intentos
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Partidos</div>
            <div className="text-3xl font-bold">{matchData.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Total registrados</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Evolución por Partido</h3>
          <ChartContainer
            config={{
              goles: {
                label: "Goles Anotados",
                color: "hsl(142, 71%, 45%)",
              },
              fallos: {
                label: "Tiros Fallados",
                color: "hsl(0, 84%, 60%)",
              },
              eficienciaAcumulada: {
                label: "Eficiencia Acumulada %",
                color: "hsl(217, 91%, 60%)",
              },
            }}
            className="h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="jornada" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Cantidad", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Eficiencia %", angle: 90, position: "insideRight", style: { fontSize: 12 } }}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="goles"
                  fill="var(--color-goles)"
                  name="Goles Anotados"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="fallos"
                  fill="var(--color-fallos)"
                  name="Tiros Fallados"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="eficienciaAcumulada"
                  stroke="var(--color-eficienciaAcumulada)"
                  name="Eficiencia Acumulada %"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "var(--color-eficienciaAcumulada)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Detalle por Partido</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {matchData.map((match) => (
              <Card key={match.matchId} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">{match.jornada}</div>
                      <CardTitle className="text-base">{match.fullOpponent}</CardTitle>
                      <CardDescription className="text-xs">{match.fullDate}</CardDescription>
                    </div>
                    <Badge className={`${getEfficiencyColor(match.eficiencia)} text-white`}>{match.eficiencia}%</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Anotados</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">{match.goles}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Fallados</span>
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">{match.fallos}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-lg font-bold">{match.total}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all"
                        style={{ width: `${match.eficiencia}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
