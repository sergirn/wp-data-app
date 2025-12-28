"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import type { Match, MatchStats, Player } from "@/lib/types"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } 
from "@/components/ui/accordion"
import { ShieldCheck } from "lucide-react"

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
      jornada: `J${match.jornada || index + 1}`,
      jornadaNumber: match.jornada || index + 1,
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
    const avgEfficiency = previousMatches.reduce((sum, m) => sum + m.eficiencia, 0) / (index + 1)

    return {
      jornada: match.jornada,
      evitados: match.golesEvitados,
      recibidos: match.golesRecibidos,
      eficienciaAcumulada: Number(avgEfficiency.toFixed(1)),
    }
  })

  // Calculate overall stats
  const totalSaves = matchData.reduce((sum, m) => sum + m.golesEvitados, 0)
  const totalGoalsConced = matchData.reduce((sum, m) => sum + m.golesRecibidos, 0)
  const totalShots = totalSaves + totalGoalsConced
  const overallEfficiency = totalShots > 0 ? Math.round((totalSaves / totalShots) * 100) : 0
  const avgSavesPerMatch = matchData.length > 0 ? (totalSaves / matchData.length).toFixed(1) : "0.0"
  const avgGoalsConcedPerMatch = matchData.length > 0 ? (totalGoalsConced / matchData.length).toFixed(1) : "0.0"

  const getEfficiencyColor = (eff: number) => {
    if (eff >= 50) return "bg-green-500"
    if (eff >= 30) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eficiencia en Inferioridad</CardTitle>
        <CardDescription>Análisis de rendimiento del portero en situaciones de inferioridad numérica</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
              Evitados
            </div>
            <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">
              {totalSaves}
            </div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              Media: {avgSavesPerMatch}/partido
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
              Recibidos
            </div>
            <div className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">
              {totalGoalsConced}
            </div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              Media: {avgGoalsConcedPerMatch}/partido
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
              Eficiencia
            </div>
            <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallEfficiency}%
            </div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              {totalSaves}/{totalShots} tiros
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
              Partidos
            </div>
            <div className="text-lg md:text-2xl font-bold">
              {matchData.length}
            </div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              Total registrados
            </div>
          </div>
        </div>


        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Evolución por Partido</h3>
          <ChartContainer
            config={{
              evitados: {
                label: "Goles Evitados",
                color: "hsl(142, 71%, 45%)",
              },
              recibidos: {
                label: "Goles Recibidos",
                color: "hsl(0, 84%, 60%)",
              },
              eficienciaAcumulada: {
                label: "Eficiencia Acumulada %",
                color: "hsl(217, 91%, 60%)",
              },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="jornada" reversed stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
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
                  dataKey="evitados"
                  fill="var(--color-evitados)"
                  name="Goles Evitados"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="recibidos"
                  fill="var(--color-recibidos)"
                  name="Goles Recibidos"
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
          <Accordion type="single" collapsible>
            <AccordionItem
              value="detalle-partidos-portero"
              className="rounded-lg"
            >
              <AccordionTrigger
                className="px-4 py-3 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 hover:bg-blue-500/20 dark:hover:bg-blue-400/20 transition-colors hover:no-underline">
                <span className="flex w-full items-center justify-center gap-2 text-lg font-semibold">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  <span>Estadistica por Partido</span>
                </span>
              </AccordionTrigger>

              <AccordionContent className="px-2 sm:px-4 pb-4 mt-2">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {matchData.map((match) => (
                    <Card key={match.matchId} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                              {match.jornada}
                            </div>
                            <CardTitle className="text-base">
                              {match.fullOpponent}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {match.fullDate}
                            </CardDescription>
                          </div>

                          <Badge
                            className={`${getEfficiencyColor(match.eficiencia)} text-white`}
                          >
                            {match.eficiencia}%
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pb-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Evitados
                            </span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              {match.golesEvitados}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Recibidos
                            </span>
                            <span className="text-lg font-bold text-red-600 dark:text-red-400">
                              {match.golesRecibidos}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t">
                            <span className="text-sm font-medium">Total</span>
                            <span className="text-lg font-bold">{match.total}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-red-500/30 dark:bg-red-500/30 rounded-full h-2 mt-2 overflow-hidden">
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  )
}
