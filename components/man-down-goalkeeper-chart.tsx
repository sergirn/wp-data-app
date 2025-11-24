"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { Match, MatchStats, Player } from "@/lib/types"

interface ManDownGoalkeeperChartProps {
  matches: Match[]
  stats: MatchStats[]
  players: Player[]
}

export function ManDownGoalkeeperChart({ matches, stats, players }: ManDownGoalkeeperChartProps) {
  const matchData = matches.map((match, index) => {
    const matchStats = stats.filter((s) => s.match_id === match.id)
    const goalsConced = matchStats.reduce((sum, s) => sum + (s.portero_goles_hombre_menos || 0), 0)
    const savesMade = matchStats.reduce((sum, s) => sum + (s.portero_paradas_hombre_menos || 0), 0)
    const totalShots = goalsConced + savesMade
    const efficiency = totalShots > 0 ? Math.round((savesMade / totalShots) * 100) : 0

    return {
      index,
      matchId: match.id,
      match: `${match.opponent.substring(0, 15)}${match.opponent.length > 15 ? "..." : ""}`,
      fullOpponent: match.opponent,
      date: new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
      golesEvitados: savesMade,
      golesRecibidos: goalsConced,
      eficiencia: efficiency,
      total: totalShots,
    }
  })

  const chartData = matchData.map((match, index) => {
    const previousMatches = matchData.slice(0, index + 1)
    const avgSaves = previousMatches.reduce((sum, m) => sum + m.golesEvitados, 0) / (index + 1)
    const avgGoalsConced = previousMatches.reduce((sum, m) => sum + m.golesRecibidos, 0) / (index + 1)

    return {
      date: match.date,
      avgSaves: Number(avgSaves.toFixed(2)),
      avgGoalsConced: Number(avgGoalsConced.toFixed(2)),
    }
  })

  // Calculate overall stats
  const totalSaves = matchData.reduce((sum, m) => sum + m.golesEvitados, 0)
  const totalGoalsConced = matchData.reduce((sum, m) => sum + m.golesRecibidos, 0)
  const totalShots = totalSaves + totalGoalsConced
  const overallEfficiency = totalShots > 0 ? Math.round((totalSaves / totalShots) * 100) : 0
  const avgSavesPerMatch = matchData.length > 0 ? (totalSaves / matchData.length).toFixed(2) : "0.00"
  const avgGoalsConcedPerMatch = matchData.length > 0 ? (totalGoalsConced / matchData.length).toFixed(2) : "0.00"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eficiencia en Inferioridad</CardTitle>
        <CardDescription>Media de goles evitados vs recibidos por partido en inferioridad numérica</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Evitados</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalSaves}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Media Evitados/Partido</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{avgSavesPerMatch}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Recibidos</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{totalGoalsConced}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Media Recibidos/Partido</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{avgGoalsConcedPerMatch}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Evolución de Medias por Partido</h3>
          <ChartContainer
            config={{
              avgSaves: {
                label: "Media Evitados",
                color: "hsl(142, 71%, 45%)",
              },
              avgGoalsConced: {
                label: "Media Recibidos",
                color: "hsl(0, 84%, 60%)",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgSaves"
                  stroke="var(--color-avgSaves)"
                  name="Media Evitados"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgGoalsConced"
                  stroke="var(--color-avgGoalsConced)"
                  name="Media Recibidos"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Eficiencia por Partido</h3>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Fecha</th>
                    <th className="p-3 text-left font-medium">Rival</th>
                    <th className="p-3 text-center font-medium">Goles Evitados</th>
                    <th className="p-3 text-center font-medium">Goles Recibidos</th>
                    <th className="p-3 text-center font-medium">Total</th>
                    <th className="p-3 text-center font-medium">Eficiencia</th>
                  </tr>
                </thead>
                <tbody>
                  {matchData.map((match) => (
                    <tr key={match.matchId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-3">{match.fullDate}</td>
                      <td className="p-3 font-medium">{match.fullOpponent}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-green-700 dark:text-green-400 font-medium">
                          {match.golesEvitados}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-red-700 dark:text-red-400 font-medium">
                          {match.golesRecibidos}
                        </span>
                      </td>
                      <td className="p-3 text-center font-medium">{match.total}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-medium ${
                            match.eficiencia >= 50
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : match.eficiencia >= 30
                                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {match.eficiencia}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
