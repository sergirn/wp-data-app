"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Match, MatchStats, Player } from "@/lib/types"

interface ManDownGoalkeeperChartProps {
  matches: Match[]
  stats: MatchStats[]
  players: Player[]
}

export function ManDownGoalkeeperChart({ matches, stats, players }: ManDownGoalkeeperChartProps) {
  const MATCHES_PER_PAGE = 10
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null)

  const matchData = matches.map((match, index) => {
    const matchStats = stats.filter((s) => s.match_id === match.id)
    // Goals conceded and saves are tracked in goalkeeper stats
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

  // Calculate overall stats
  const totalSaves = matchData.reduce((sum, m) => sum + m.golesEvitados, 0)
  const totalGoalsConced = matchData.reduce((sum, m) => sum + m.golesRecibidos, 0)
  const totalShots = totalSaves + totalGoalsConced
  const overallEfficiency = totalShots > 0 ? Math.round((totalSaves / totalShots) * 100) : 0

  const totalPages = Math.ceil(matchData.length / MATCHES_PER_PAGE)
  const startIndex = currentPage * MATCHES_PER_PAGE
  const endIndex = Math.min(startIndex + MATCHES_PER_PAGE, matchData.length)
  const displayedMatches = matchData.slice(startIndex, endIndex)

  const handleMatchClick = (index: number) => {
    setSelectedMatchIndex(index)
    const page = Math.floor(index / MATCHES_PER_PAGE)
    setCurrentPage(page)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eficiencia en Hombre -</CardTitle>
        <CardDescription>
          Goles evitados vs recibidos en inferioridad numérica - {totalSaves}/{totalShots} ({overallEfficiency}%
          eficiencia)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Goles Evitados</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalSaves}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Goles Recibidos</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{totalGoalsConced}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Eficiencia</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{overallEfficiency}%</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando partidos {startIndex + 1}-{endIndex} de {matchData.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={displayedMatches}>
              <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Legend />
              <Bar dataKey="golesEvitados" name="Goles Evitados" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
              <Bar dataKey="golesRecibidos" name="Goles Recibidos" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Detalle por Partido (Haz clic para ver en gráfica)</h3>
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
                    <tr
                      key={match.matchId}
                      onClick={() => handleMatchClick(match.index)}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${
                        selectedMatchIndex === match.index ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
                      }`}
                    >
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
