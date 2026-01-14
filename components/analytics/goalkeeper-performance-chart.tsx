"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { BarChart3, Table2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"

interface GoalkeeperPerformanceChartProps {
  matches: any[]
  stats: any[]
}

export function GoalkeeperPerformanceChart({ matches, stats }: GoalkeeperPerformanceChartProps) {
  const [view, setView] = useState<"chart" | "table">("chart")

  const data = useMemo(() => {
    const sorted = [...(matches ?? [])].sort((a, b) => {
      const aj = a?.jornada ?? 9999
      const bj = b?.jornada ?? 9999
      if (aj !== bj) return aj - bj
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })

    return sorted.slice(-15).map((match, idx) => {
      const goalkeepersStats = (stats ?? []).filter(
        (s) => s.match_id === match.id && s.portero_paradas_totales !== null,
      )

      const totalSaves = goalkeepersStats.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0)
      const totalGoalsAgainst = match.away_score || 0
      const totalShots = totalSaves + totalGoalsAgainst
      const savePercentage = totalShots > 0 ? (totalSaves / totalShots) * 100 : 0

      const savesInferiority = goalkeepersStats.reduce((sum, s) => sum + (s.portero_paradas_hombre_menos || 0), 0)
      const penaltiesSaved = goalkeepersStats.reduce((sum, s) => sum + (s.portero_paradas_penalti_parado || 0), 0)

      const jornadaNumber = match.jornada ?? idx + 1

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        rival: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        percentage: Number(savePercentage.toFixed(1)),
        saves: totalSaves,
        savesInf: savesInferiority,
        pensSaved: penaltiesSaved,

        golesRecibidos: totalGoalsAgainst,
        tirosRecibidos: totalShots,
      }
    })
  }, [matches, stats])

  const avgPct = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.percentage, 0) / data.length).toFixed(1)
  }, [data])

  const totalSaves = useMemo(() => data.reduce((s, d) => s + d.saves, 0), [data])
  const totalGoalsAgainst = useMemo(() => data.reduce((s, d) => s + d.golesRecibidos, 0), [data])
  const totalShotsAgainst = totalSaves + totalGoalsAgainst

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Rendimiento de Porteros</CardTitle>
            <CardDescription className="truncate">
              Evolución de paradas y efectividad (últimos 15) · Media:{" "}
              <span className="font-medium text-white">{avgPct}%</span>
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

      <CardContent className="min-w-0 w-full overflow-hidden">
        {view === "chart" ? (
          <ChartContainer
            config={{
              percentage: { label: "% Efectividad", color: "hsl(34 95% 55%)" },
              saves: { label: "Paradas Totales", color: "hsl(199 95% 55%)" },
              savesInf: { label: "Paradas en Inferioridad", color: "hsl(142 85% 45%)" },
              pensSaved: { label: "Penaltis Parados", color: "hsl(262 85% 65%)" },
            }}
            className="w-full h-[200px] sm:h-[240px] lg:h-[230px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillSaves" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-saves)" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="var(--color-saves)" stopOpacity={0.08} />
                  </linearGradient>

                  <linearGradient id="fillSavesInf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-savesInf)" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="var(--color-savesInf)" stopOpacity={0.08} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

                <XAxis
                  dataKey="jornada"
                  fontSize={12}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  minTickGap={18}
                  stroke="#888888"
                  tick={{ fill: "#fff" }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="left"
                  fontSize={12}
                  width={30}
                  tickMargin={6}
                  stroke="#888888"
                  tick={{ fill: "#fff" }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  fontSize={12}
                  width={34}
                  tickMargin={6}
                  domain={[0, 100]}
                  stroke="#888888"
                  tick={{ fill: "#fff" }}
                  axisLine={false}
                  tickLine={false}
                />

                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label, payload) => {
                        const p = payload?.[0]?.payload
                        if (!p) return label
                        return `${label} · vs ${p.rival} · ${p.fullDate}`
                      }}
                    />
                  }
                />

                <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12, color: "#fff" }} />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="saves"
                  name="Paradas Totales"
                  stroke="var(--color-saves)"
                  fill="url(#fillSaves)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="savesInf"
                  name="Paradas en Inferioridad"
                  stroke="var(--color-savesInf)"
                  fill="url(#fillSavesInf)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="percentage"
                  name="% Efectividad"
                  stroke="var(--color-percentage)"
                  fill="url(#fillPercentage)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="rounded-xl border overflow-hidden bg-card w-full">
            <div className="w-full overflow-x-auto">
              <div className="max-h-[420px] overflow-y-auto">
                <Table className="min-w-[980px]">
                  <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[90px]">Jornada</TableHead>
                      <TableHead>Rival</TableHead>
                      <TableHead className="text-right">Paradas</TableHead>
                      <TableHead className="text-right">Paradas Inf.</TableHead>
                      <TableHead className="text-right">Pen. Parados</TableHead>
                      <TableHead className="text-right">GC</TableHead>
                      <TableHead className="text-right">% Efec.</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                    </TableRow>
                  </UITableHeader>

                  <TableBody>
                    {data.map((m, idx) => (
                      <TableRow
                        key={m.matchId}
                        className={`transition-colors ${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                      >
                        <TableCell className="font-semibold">{m.jornada}</TableCell>

                        <TableCell className="max-w-[360px]">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{m.rival}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-right tabular-nums">{m.saves}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.savesInf}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.pensSaved}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.golesRecibidos}</TableCell>

                        <TableCell className="text-right tabular-nums">
                          <span className="font-semibold text-white">{m.percentage.toFixed(1)}%</span>
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* footer */}
            <div className="border-t bg-muted/20 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{data.length}</span> partidos
                </span>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md border bg-card px-2 py-1">
                    Total Paradas: <span className="font-semibold text-foreground">{totalSaves}</span>
                  </span>
                  <span className="rounded-md border bg-card px-2 py-1">
                    Total GC: <span className="font-semibold text-foreground">{totalGoalsAgainst}</span>
                  </span>
                  <span className="rounded-md border bg-card px-2 py-1">
                    Total Tiros: <span className="font-semibold text-foreground">{totalShotsAgainst}</span>
                  </span>
                  <span className="rounded-md border bg-card px-2 py-1">
                    Media %: <span className="font-semibold text-white">{avgPct}%</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
