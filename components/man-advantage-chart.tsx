"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
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
      date: match.date,
      goles: match.goles,
      fallos: match.fallos,
      mediaEficiencia: Number(avgEfficiency.toFixed(1)),
    }
  })

  // Calculate overall stats
  const totalGoals = matchData.reduce((sum, m) => sum + m.goles, 0)
  const totalMisses = matchData.reduce((sum, m) => sum + m.fallos, 0)
  const totalAttempts = totalGoals + totalMisses
  const overallEfficiency = totalAttempts > 0 ? Math.round((totalGoals / totalAttempts) * 100) : 0
  const avgGoalsPerMatch = matchData.length > 0 ? (totalGoals / matchData.length).toFixed(2) : "0.00"
  const avgMissesPerMatch = matchData.length > 0 ? (totalMisses / matchData.length).toFixed(2) : "0.00"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eficiencia en Superioridad</CardTitle>
        <CardDescription>Goles anotados vs fallados por partido en superioridad numérica</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Goles</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalGoals}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Media Goles/Partido</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{avgGoalsPerMatch}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Fallados</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{totalMisses}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Media Fallos/Partido</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{avgMissesPerMatch}</div>
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
              mediaEficiencia: {
                label: "Media Eficiencia %",
                color: "hsl(217, 91%, 60%)",
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
                  dataKey="goles"
                  stroke="var(--color-goles)"
                  name="Goles Anotados"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="fallos"
                  stroke="var(--color-fallos)"
                  name="Tiros Fallados"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="mediaEficiencia"
                  stroke="var(--color-mediaEficiencia)"
                  name="Media Eficiencia %"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 5 }}
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
                    <th className="p-3 text-center font-medium">Goles</th>
                    <th className="p-3 text-center font-medium">Fallos</th>
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
                          {match.goles}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-red-700 dark:text-red-400 font-medium">
                          {match.fallos}
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
