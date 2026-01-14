"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import type { Match, MatchStats, Player } from "@/lib/types"
import { TrendingUp, BarChart3, Table2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"

interface ManAdvantageChartProps {
  matches: Match[]
  stats: MatchStats[]
  players: Player[]
}

export function ManAdvantageChart({ matches, stats, players }: ManAdvantageChartProps) {
  const [view, setView] = useState<"chart" | "table">("chart")

  // ✅ ordenar de jornada 1 a la actual (fallback a fecha)
  const sortedMatches = useMemo(() => {
    return [...(matches ?? [])].sort((a: any, b: any) => {
      const aj = a?.jornada ?? 9999
      const bj = b?.jornada ?? 9999
      if (aj !== bj) return aj - bj
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })
  }, [matches])

  const matchData = useMemo(() => {
    return sortedMatches.map((match: any, index: number) => {
      const matchStats = (stats ?? []).filter((s: any) => s.match_id === match.id)
      const totalGoals = matchStats.reduce((sum: number, s: any) => sum + (s.goles_hombre_mas || 0), 0)
      const totalMisses = matchStats.reduce((sum: number, s: any) => sum + (s.tiros_hombre_mas || 0), 0)
      const totalAttempts = totalGoals + totalMisses
      const efficiency = totalAttempts > 0 ? Math.round((totalGoals / totalAttempts) * 100) : 0

      const jornadaNumber = match.jornada ?? index + 1

      return {
        index,
        matchId: match.id,
        fullOpponent: match.opponent,
        jornada: `J${jornadaNumber}`,
        jornadaNumber,
        date: new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
        goles: totalGoals,
        fallos: totalMisses,
        eficiencia: efficiency,
        total: totalAttempts,
      }
    })
  }, [sortedMatches, stats])

  const chartData = useMemo(() => {
    return matchData.map((m, index) => {
      const previousMatches = matchData.slice(0, index + 1)
      const avgEfficiency = previousMatches.reduce((sum, x) => sum + x.eficiencia, 0) / (index + 1)

      return {
        jornada: m.jornada,
        goles: m.goles,
        fallos: m.fallos,
        eficienciaAcumulada: Number(avgEfficiency.toFixed(1)),
      }
    })
  }, [matchData])

  // ===== Totales / medias =====
  const partidos = matchData.length
  const totalGoals = matchData.reduce((sum, m) => sum + m.goles, 0)
  const totalMisses = matchData.reduce((sum, m) => sum + m.fallos, 0)
  const totalAttempts = totalGoals + totalMisses
  const overallEfficiency = totalAttempts > 0 ? Math.round((totalGoals / totalAttempts) * 100) : 0
  const avgGoalsPerMatch = partidos > 0 ? (totalGoals / partidos).toFixed(1) : "0.0"
  const avgMissesPerMatch = partidos > 0 ? (totalMisses / partidos).toFixed(1) : "0.0"

  const maxAttempts = Math.max(...matchData.map((m) => m.total), 1)

  const getEfficiencyColor = (eff: number) => {
    if (eff >= 60) return "bg-green-500"
    if (eff >= 40) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Eficiencia en Superioridad</CardTitle>
            <CardDescription className="truncate">
              Análisis de rendimiento en situaciones de superioridad numérica (jornada 1 → actual)
            </CardDescription>
          </div>

          {/* ✅ Switch Chart/Table */}
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <BarChart3 className={`h-4 w-4 ${view === "chart" ? "text-foreground" : "text-muted-foreground"}`} />
            <Switch
              checked={view === "table"}
              onCheckedChange={(v) => setView(v ? "table" : "chart")}
              aria-label="Cambiar vista de gráfico a tabla"
            />
            <Table2 className={`h-4 w-4 ${view === "table" ? "text-foreground" : "text-muted-foreground"}`} />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* ===== RESUMEN (igual que lo tenías) ===== */}
        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Total Anotados</div>
            <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{totalGoals}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Media: {avgGoalsPerMatch}/partido</div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Total Fallados</div>
            <div className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{totalMisses}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Media: {avgMissesPerMatch}/partido</div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Eficiencia</div>
            <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">{overallEfficiency}%</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              {totalGoals}/{totalAttempts} intentos
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Partidos</div>
            <div className="text-lg md:text-xl font-bold">{partidos}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Total registrados</div>
          </div>
        </div>

        {/* ===== VISTA: CHART o TABLA ===== */}
        {view === "chart" ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Evolución por Partido</h3>

            <ChartContainer
              config={{
                goles: { label: "Goles Anotados", color: "hsl(142, 71%, 45%)" },
                fallos: { label: "Tiros Fallados", color: "hsl(0, 84%, 60%)" },
                eficienciaAcumulada: { label: "Eficiencia Acumulada %", color: "hsl(217, 91%, 60%)" },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

                  {/* ✅ J1 → Jn (sin reversed) */}
                  <XAxis
                    dataKey="jornada"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={18}
                  />

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

                  <Bar yAxisId="left" dataKey="goles" fill="var(--color-goles)" name="Goles Anotados" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="fallos" fill="var(--color-fallos)" name="Tiros Fallados" radius={[4, 4, 0, 0]} />

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
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">Tabla por Jornada</h3>
                <p className="text-xs text-muted-foreground truncate">Resumen por partido (jornada 1 → actual)</p>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Efic. alta
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" /> Media
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Baja
                </span>
              </div>
            </div>

            {/* ✅ tabla pro (misma estructura) */}
            <div className="rounded-xl border overflow-hidden bg-card">
              <div className="w-full overflow-x-auto">
                <div className="max-h-[420px] overflow-y-auto">
                  <Table className="min-w-[920px]">
                    <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[90px]">Jornada</TableHead>
                        <TableHead>Rival</TableHead>
                        <TableHead className="text-right">Anotados</TableHead>
                        <TableHead className="text-right">Fallados</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Eficiencia</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                      </TableRow>
                    </UITableHeader>

                    <TableBody>
                      {matchData.map((m, idx) => {
                        const pct = Math.round((m.total / maxAttempts) * 100)
                        const dot =
                          m.eficiencia >= 60 ? "bg-green-500" : m.eficiencia >= 40 ? "bg-yellow-500" : "bg-red-500"

                        return (
                          <TableRow
                            key={m.matchId}
                            className={`
                              transition-colors
                              ${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"}
                              hover:bg-muted/40
                            `}
                          >
                            <TableCell className="font-semibold">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${dot}`} />
                                {m.jornada}
                              </div>
                            </TableCell>

                            <TableCell className="max-w-[360px]">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{m.fullOpponent}</p>
                                <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                              </div>
                            </TableCell>

                            <TableCell className="text-right tabular-nums">
                              <Badge className="bg-green-500 text-white hover:bg-green-500 tabular-nums">+{m.goles}</Badge>
                            </TableCell>

                            <TableCell className="text-right tabular-nums">
                              <Badge variant="destructive" className="tabular-nums">
                                −{m.fallos}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right tabular-nums">
                              <div className="flex items-end justify-end gap-3">
                                <Badge variant="secondary" className="tabular-nums">
                                  {m.total}
                                </Badge>

                                <div className="hidden md:block w-20">
                                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-2 rounded-full bg-blue-600 dark:bg-blue-400 transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <Badge className={`${getEfficiencyColor(m.eficiencia)} text-white tabular-nums`}>
                                {m.eficiencia}%
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* footer con totales */}
              <div className="border-t bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{partidos}</span> partidos
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border bg-card px-2 py-1">
                      Anotados: <span className="font-semibold text-foreground">{totalGoals}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Fallados: <span className="font-semibold text-foreground">{totalMisses}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Eficiencia: <span className="font-semibold text-foreground">{overallEfficiency}%</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Intentos: <span className="font-semibold text-foreground">{totalAttempts}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
