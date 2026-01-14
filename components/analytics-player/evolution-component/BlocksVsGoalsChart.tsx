"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
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

import { buildBlocksVsGoalsData, chartConfig, type MatchStatsWithMatch } from "./performance-chart"

type ViewMode = "chart" | "table"

export function BlocksVsGoalsChart({ matchStats }: { matchStats: MatchStatsWithMatch[] }) {
  const [view, setView] = useState<ViewMode>("chart")

  const data = useMemo(() => buildBlocksVsGoalsData(matchStats), [matchStats])

  if (!matchStats?.length) return null

  const totalBloq = data.reduce((s, d) => s + (d.bloqueos ?? 0), 0)
  const totalGR = data.reduce((s, d) => s + (d.golesRecibidos ?? 0), 0)
  const avgBloq = data.length ? (totalBloq / data.length).toFixed(2) : "0.00"
  const avgGR = data.length ? (totalGR / data.length).toFixed(2) : "0.00"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Bloqueos vs Goles Recibidos</CardTitle>
              <CardDescription className="truncate">
                Comparación defensiva por partido con medias acumuladas ·{" "}
                <span className="font-medium text-foreground">
                  Media: {avgBloq} bloq · {avgGR} GR
                </span>
              </CardDescription>
            </div>

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
                    dataKey="bloqueos"
                    stroke={chartConfig.bloqueos.color}
                    strokeWidth={1}
                    opacity={0.50}
                    dot={false}
                    name="Bloqueos"
                  />
                  <Line
                    type="monotone"
                    dataKey="golesRecibidos"
                    stroke={chartConfig.golesRecibidos.color}
                    strokeWidth={1}
                    opacity={0.50}
                    dot={false}
                    name="Goles Recibidos"
                  />
                  <Line
                    type="monotone"
                    dataKey="mediaBloqueos"
                    stroke={chartConfig.mediaBloqueos.color}
                    strokeWidth={5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Media Bloqueos"
                  />
                  <Line
                    type="monotone"
                    dataKey="mediaGolesRecibidos"
                    stroke={chartConfig.mediaGolesRecibidos.color}
                    strokeWidth={5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Media Goles Recibidos"
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
                        <TableHead className="text-right">Bloqueos</TableHead>
                        <TableHead className="text-right">Goles Rec.</TableHead>
                        <TableHead className="text-right">Media Bloq</TableHead>
                        <TableHead className="text-right">Media GR</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                      </TableRow>
                    </UITableHeader>

                    <TableBody>
                      {data.map((m, idx) => (
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

                          <TableCell className="text-right tabular-nums">{m.bloqueos ?? 0}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.golesRecibidos ?? 0}</TableCell>

                          <TableCell className="text-right tabular-nums">{Number(m.mediaBloqueos ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(m.mediaGolesRecibidos ?? 0).toFixed(2)}</TableCell>

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
                      Total Bloq: <span className="font-semibold text-foreground">{totalBloq}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Total GR: <span className="font-semibold text-foreground">{totalGR}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Media Bloq: <span className="font-semibold text-foreground">{avgBloq}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Media GR: <span className="font-semibold text-foreground">{avgGR}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
