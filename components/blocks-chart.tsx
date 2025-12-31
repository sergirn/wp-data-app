"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import type { Match, MatchStats, Player } from "@/lib/types"
import { TrendingUp } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } 
from "@/components/ui/accordion"

interface BlocksChartProps {
  matches: Match[]
  stats: MatchStats[]
  players: Player[]
}

export function BlocksChart({ matches, stats, players }: BlocksChartProps) {
  const matchData = matches.map((match, index) => {
    const matchStats = stats.filter((s) => s.match_id === match.id)
    const totalBlocks = matchStats.reduce((sum, s) => sum + (s.acciones_bloqueo || 0), 0)
    const totalGoalsReceived = match.away_score

    return {
      index,
      matchId: match.id,
      match: `${match.opponent.substring(0, 15)}${match.opponent.length > 15 ? "..." : ""}`,
      fullOpponent: match.opponent,
      jornada: `J${match.jornada || index + 1}`,
      jornadaNumber: match.jornada || index + 1,
      date: new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
      bloqueos: totalBlocks,
      golesRecibidos: totalGoalsReceived,
      resultado:
        match.home_score > match.away_score ? "Victoria" : match.home_score < match.away_score ? "Derrota" : "Empate",
    }
  })

  const chartData = matchData.map((match, index) => {
    const previousMatches = matchData.slice(0, index + 1)
    const avgBlocks = previousMatches.reduce((sum, m) => sum + m.bloqueos, 0) / (index + 1)

    return {
      jornada: match.jornada,
      bloqueos: match.bloqueos,
      golesRecibidos: match.golesRecibidos,
      promedioBloqueos: Number(avgBlocks.toFixed(1)),
    }
  })

  // Calculate overall stats
  const totalBlocks = matchData.reduce((sum, m) => sum + m.bloqueos, 0)
  const totalGoalsReceived = matchData.reduce((sum, m) => sum + m.golesRecibidos, 0)
  const avgBlocksPerMatch = matchData.length > 0 ? (totalBlocks / matchData.length).toFixed(1) : "0.0"
  const avgGoalsReceivedPerMatch = matchData.length > 0 ? (totalGoalsReceived / matchData.length).toFixed(1) : "0.0"
  const victoriesCount = matchData.filter((m) => m.resultado === "Victoria").length
  const defeatsCount = matchData.filter((m) => m.resultado === "Derrota").length

  const getBlocksColor = (blocks: number) => {
    if (blocks >= 5) return "bg-green-500"
    if (blocks >= 3) return "bg-yellow-500"
    return "bg-orange-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eficiencia de Bloqueos</CardTitle>
        <CardDescription>Rendimiento defensivo mediante bloqueos por partido</CardDescription>
      </CardHeader>
      <CardContent>
      <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
        <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
          <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
            Bloqueos
          </div>
          <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-green-400">
            {totalBlocks}
          </div>
          <div className="hidden md:block text-xs text-muted-foreground mt-1">
            Media: {avgBlocksPerMatch}/partido
          </div>
        </div>

        <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
          <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
            Recibidos
          </div>
          <div className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">
            {totalGoalsReceived}
          </div>
          <div className="hidden md:block text-xs text-muted-foreground mt-1">
            Media: {avgGoalsReceivedPerMatch}/partido
          </div>
        </div>

        <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
          <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
            Victorias
          </div>
          <div className="text-lg md:text-2xl font-bold text-blue-400 dark:text-blue-400">
            {victoriesCount}
          </div>
          <div className="hidden md:block text-xs text-muted-foreground mt-1">
            Con bloqueos efectivos
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
              bloqueos: {
                label: "Bloqueos",
                color: "hsl(142, 71%, 45%)",
              },
              golesRecibidos: {
                label: "Goles Recibidos",
                color: "hsl(0, 84%, 60%)",
              },
              promedioBloqueos: {
                label: "Promedio Bloqueos",
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
                  label={{ value: "Promedio", angle: 90, position: "insideRight", style: { fontSize: 12 } }}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="bloqueos"
                  fill="var(--color-bloqueos)"
                  name="Bloqueos"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="golesRecibidos"
                  fill="var(--color-golesRecibidos)"
                  name="Goles Recibidos"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="promedioBloqueos"
                  stroke="var(--color-promedioBloqueos)"
                  name="Promedio Bloqueos"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "var(--color-promedioBloqueos)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="mt-6">
          <Accordion type="single" collapsible>
            <AccordionItem
              value="detalle-partidos-bloqueos"
              className="rounded-lg"
            >
              <AccordionTrigger
                className="
                  px-4 py-3 rounded-lg
                  bg-blue-500/10 dark:bg-blue-400/10
                  hover:bg-blue-500/20 dark:hover:bg-blue-400/20
                  transition-colors
                  hover:no-underline
                "
              >
                <span className="flex w-full items-center justify-center gap-2 text-lg font-semibold">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  <span>Estadística por Partido</span>
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
                            className={`${getBlocksColor(match.bloqueos)} text-white`}
                          >
                            {match.bloqueos} bloqueos
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pb-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Bloqueos
                            </span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {match.bloqueos}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Goles Recibidos
                            </span>
                            <span className="text-lg font-bold text-red-600 dark:text-red-400">
                              {match.golesRecibidos}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t">
                            <span className="text-sm font-medium">Resultado</span>
                            <Badge
                              variant={
                                match.resultado === "Victoria"
                                  ? "default"
                                  : match.resultado === "Derrota"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {match.resultado}
                            </Badge>
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
