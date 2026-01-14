"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import type { Player } from "@/lib/types"
import { buildEvolutionData, chartConfig, type MatchStatsWithMatch } from "./performance-chart"
import { Switch } from "@/components/ui/switch"
import { BarChart3, Table2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"

type ViewMode = "chart" | "table"

export function PerformanceEvolutionChart({
  matchStats,
  player,
}: {
  matchStats: MatchStatsWithMatch[]
  player: Player
}) {
  const [view, setView] = useState<ViewMode>("chart")

  const data = useMemo(() => buildEvolutionData(matchStats, player), [matchStats, player])

  if (!matchStats?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No hay datos suficientes para mostrar la evolución</p>
        </CardContent>
      </Card>
    )
  }

  const avg = (key: string) =>
    data.length ? (data.reduce((s: number, d: any) => s + (d[key] ?? 0), 0) / data.length).toFixed(1) : "0.0"

  const HeaderSwitch = (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <BarChart3 className={`h-4 w-4 ${view === "chart" ? "text-foreground" : "text-muted-foreground"}`} />
      <Switch
        checked={view === "table"}
        onCheckedChange={(v) => setView(v ? "table" : "chart")}
        aria-label="Cambiar vista de gráfico a tabla"
      />
      <Table2 className={`h-4 w-4 ${view === "table" ? "text-foreground" : "text-muted-foreground"}`} />
    </div>
  )

  const avgGoles = avg("goles")
  const avgTiros = avg("tiros")
  const avgAsist = avg("asistencias")
  const avgEff = avg("eficiencia")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Evolución del Rendimiento</CardTitle>
              <CardDescription className="truncate">
                Progreso a lo largo de la temporada ·{" "}
                <span className="font-medium text-foreground">
                  Media: {avgGoles} goles · {avgAsist} asist · {avgEff}%
                </span>
              </CardDescription>
            </div>
            {HeaderSwitch}
          </div>
        </CardHeader>

        <CardContent className="min-w-0 w-full overflow-hidden">
          {view === "chart" ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="match" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      const p = payload?.[0]?.payload
                      return p ? `${p.match} - ${p.opponent} (${p.date})` : String(value)
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="goles"
                    stroke={chartConfig.goles.color}
                    strokeWidth={1}
                    dot={false}
                    name="Goles"
                  />
                  <Line
                    type="monotone"
                    dataKey="asistencias"
                    stroke={chartConfig.asistencias.color}
                    strokeWidth={1}
                    dot={false}
                    name="Asistencias"
                  />
                  <Line
                    type="monotone"
                    dataKey="eficiencia"
                    stroke={chartConfig.eficiencia.color}
                    strokeWidth={4}
                    dot={false}
                    name="Eficiencia %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="rounded-xl border overflow-hidden bg-card w-full">
              <div className="w-full overflow-x-auto">
                <div className="max-h-[520px] overflow-y-auto">
                  <Table className="min-w-[980px]">
                    <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[90px]">Jornada</TableHead>
                        <TableHead>Rival</TableHead>
                        <TableHead className="text-right">Goles</TableHead>
                        <TableHead className="text-right">Tiros</TableHead>
                        <TableHead className="text-right">Asist.</TableHead>
                        <TableHead className="text-right">Eficiencia</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                      </TableRow>
                    </UITableHeader>

                    <TableBody>
                      {data.map((m: any, idx: number) => (
                        <TableRow
                          key={`${m.match}-${m.date}-${idx}`}
                          className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                        >
                          <TableCell className="font-semibold">{m.match}</TableCell>

                          <TableCell className="max-w-[360px]">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{m.opponent}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">{m.date}</p>
                            </div>
                          </TableCell>

                          <TableCell className="text-right tabular-nums">{m.goles ?? 0}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.tiros ?? 0}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.asistencias ?? 0}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {Number(m.eficiencia ?? 0).toFixed(1)}%
                          </TableCell>

                          <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{data.length}</span> partidos
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border bg-card px-2 py-1">
                      Media Goles: <span className="font-semibold text-foreground tabular-nums">{avgGoles}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Media Tiros: <span className="font-semibold text-foreground tabular-nums">{avgTiros}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Media Asist.: <span className="font-semibold text-foreground tabular-nums">{avgAsist}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Media Eficiencia: <span className="font-semibold text-foreground tabular-nums">{avgEff}%</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Si quieres volver a mostrar las MiniStat también para jugador de campo, dímelo y te lo dejo igual que el portero */}
    </div>
  )
}

function MiniStat({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${accent ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
