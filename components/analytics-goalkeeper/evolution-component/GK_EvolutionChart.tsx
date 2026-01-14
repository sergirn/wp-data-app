"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
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

type ViewMode = "chart" | "table"

export function GoalkeeperEvolutionChart({ matchStats }: { matchStats: any[] }) {
  const [view, setView] = useState<ViewMode>("chart")

  const data = useMemo(() => {
    // oldest -> newest para evolución
    const sorted = [...(matchStats ?? [])].slice().reverse()

    let cumulativeParadas = 0
    let matchesPlayed = 0

    return sorted.map((stat, index) => {
      const match = stat?.matches
      const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0
      const paradas = stat?.portero_paradas_totales ?? 0

      cumulativeParadas += paradas
      matchesPlayed = index + 1

      const totalShots = paradas + (rivalGoals ?? 0)
      const eficiencia = totalShots > 0 ? (paradas / totalShots) * 100 : 0
      const mediaParadas = cumulativeParadas / matchesPlayed

      const jornadaNumber = match?.jornada ?? index + 1
      const fullDate = match?.match_date ? new Date(match.match_date).toLocaleDateString("es-ES") : ""

      return {
        matchId: match?.id ?? `${index}`,
        jornadaNumber,
        partido: `J${jornadaNumber}`,
        rival: match?.opponent ?? "—",
        fullDate,

        mediaParadas: Number(mediaParadas.toFixed(1)),
        eficiencia: Number(eficiencia.toFixed(1)),
        golesRecibidos: Number((rivalGoals ?? 0).toFixed(0)),
        paradas: Number(paradas.toFixed(0)),
      }
    })
  }, [matchStats])

  const avgEficiencia = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.eficiencia, 0) / data.length).toFixed(1)
  }, [data])

  const avgParadas = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.paradas, 0) / data.length).toFixed(1)
  }, [data])

  const chartConfig = {
    mediaParadas: { label: "Media Paradas", color: "hsl(200 80% 50%)" },
    eficiencia: { label: "Eficiencia (%)", color: "hsl(160 70% 50%)" },
    golesRecibidos: { label: "Goles Recibidos", color: "hsl(0 70% 60%)" },
  } as const

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolución del Portero
            </CardTitle>
            <CardDescription className="truncate">
              Últimos {data.length} · Media paradas:{" "}
              <span className="font-medium text-white">{avgParadas}</span> · Media eficiencia:{" "}
              <span className="font-medium text-white">{avgEficiencia}%</span>
            </CardDescription>
          </div>

          {/* Switch chart/table */}
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shrink-0">
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
          <ChartContainer config={chartConfig} className="w-full h-[260px] sm:h-[320px] lg:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

                <XAxis
                  dataKey="partido"
                  fontSize={12}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />

                {/* Eje izq */}
                <YAxis yAxisId="left" fontSize={12} width={36} tickMargin={6} axisLine={false} tickLine={false} />

                {/* Eje dcha */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  fontSize={12}
                  width={40}
                  tickMargin={6}
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

                <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="mediaParadas"
                  name="Media Paradas"
                  stroke="var(--color-mediaParadas)"
                  strokeWidth={5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="eficiencia"
                  name="Eficiencia (%)"
                  stroke="var(--color-eficiencia)"
                  strokeWidth={1}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="golesRecibidos"
                  name="Goles Recibidos"
                  stroke="var(--color-golesRecibidos)"
                  strokeWidth={1}
                  dot={false}
                  activeDot={{ r: 4 }}
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
                      <TableHead className="text-right">Paradas</TableHead>
                      <TableHead className="text-right">Goles</TableHead>
                      <TableHead className="text-right">Media Paradas</TableHead>
                      <TableHead className="text-right">% Paradas</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                    </TableRow>
                  </UITableHeader>

                  <TableBody>
                    {data.map((m, idx) => (
                      <TableRow
                        key={`${m.matchId}-${m.partido}-${idx}`}
                        className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                      >
                        <TableCell className="font-semibold">{m.partido}</TableCell>

                        <TableCell className="max-w-[360px]">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{m.rival}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-right tabular-nums">{m.paradas}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.golesRecibidos}</TableCell>

                        <TableCell className="text-right tabular-nums font-semibold">
                          {m.mediaParadas.toFixed(1)}
                        </TableCell>

                        <TableCell className="text-right tabular-nums font-semibold">
                          {m.eficiencia.toFixed(1)}%
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
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
                    Media Paradas: <span className="font-semibold text-foreground tabular-nums">{avgParadas}</span>
                  </span>
                  <span className="rounded-md border bg-card px-2 py-1">
                    Media Eficiencia: <span className="font-semibold text-foreground tabular-nums">{avgEficiencia}%</span>
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
