"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { BarChart3, Table2, TrendingUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Match } from "@/lib/types"

interface GoalDifferenceEvolutionChartProps {
  matches: Match[]
}

export function GoalDifferenceEvolutionChart({ matches }: GoalDifferenceEvolutionChartProps) {
  const [view, setView] = useState<"chart" | "table">("chart")

  const data = useMemo(() => {
    const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
      const aj = a?.jornada ?? 9999
      const bj = b?.jornada ?? 9999
      if (aj !== bj) return aj - bj
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })

    let acumulada = 0

    return sorted.map((m: any, idx: number) => {
      const anotados = m.home_score ?? 0
      const recibidos = m.away_score ?? 0
      const diff = anotados - recibidos
      acumulada += diff

      const jornadaNumber = m.jornada ?? idx + 1

      return {
        matchId: m.id ?? `${jornadaNumber}-${m.match_date}-${idx}`,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        rival: m.opponent,
        fullDate: new Date(m.match_date).toLocaleDateString("es-ES"),

        anotados,
        recibidos,
        diff,
        diferenciaAcumulada: acumulada,
      }
    })
  }, [matches])

  const partidos = data.length

  const totalFor = useMemo(() => data.reduce((s, d) => s + d.anotados, 0), [data])
  const totalAgainst = useMemo(() => data.reduce((s, d) => s + d.recibidos, 0), [data])
  const totalDiff = totalFor - totalAgainst

  const avgFor = partidos > 0 ? (totalFor / partidos).toFixed(1) : "0.0"
  const avgAgainst = partidos > 0 ? (totalAgainst / partidos).toFixed(1) : "0.0"
  const avgDiff = partidos > 0 ? (totalDiff / partidos).toFixed(1) : "0.0"

  const getDiffBadge = (v: number) => (v >= 0 ? "bg-green-500" : "bg-red-500")

  if (!data.length) return null

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Evolución Diferencia de Goles</CardTitle>
            <CardDescription className="truncate">
              Balance acumulado jornada a jornada · Total:{" "}
              <span className="font-medium text-white">
                {totalDiff > 0 ? "+" : ""}
                {totalDiff}
              </span>
            </CardDescription>
          </div>

          {/* Switch Chart/Table */}
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
        {/* Resumen responsive (como los tuyos) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="rounded-lg border bg-card p-2 text-center">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground leading-none">Goles Anotados</p>
            <p className="text-lg sm:text-2xl font-bold leading-none text-green-600 dark:text-green-400">{totalFor}</p>
            <p className="hidden sm:block text-[11px] text-muted-foreground leading-none mt-1">{avgFor}/partido</p>
          </div>

          <div className="rounded-lg border bg-card p-2 text-center">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground leading-none">Goles Recibidos</p>
            <p className="text-lg sm:text-2xl font-bold leading-none text-red-600 dark:text-red-400">{totalAgainst}</p>
            <p className="hidden sm:block text-[11px] text-muted-foreground leading-none mt-1">{avgAgainst}/partido</p>
          </div>

          <div className="rounded-lg border bg-card p-2 text-center">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground leading-none">Diferencia</p>
            <p
              className={`text-lg sm:text-2xl font-bold leading-none ${
                totalDiff >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {totalDiff > 0 ? "+" : ""}
              {totalDiff}
            </p>
            <p className="hidden sm:block text-[11px] text-muted-foreground leading-none mt-1">{avgDiff}/partido</p>
          </div>
        </div>

        {view === "chart" ? (
          <ChartContainer
            config={{
              anotados: { label: "Goles anotados", color: "hsl(142 71% 45%)" },
              recibidos: { label: "Goles recibidos", color: "hsl(0 84% 60%)" },
              diferenciaAcumulada: { label: "Dif. acumulada", color: "hsl(217 91% 60%)" },
            }}
            className="w-full h-[240px] sm:h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

                <XAxis
                  dataKey="jornada"
                  fontSize={12}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />

                <YAxis
                  yAxisId="left"
                  fontSize={12}
                  width={34}
                  tickMargin={6}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
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
                        if (!p) return String(label)
                        return `${label} · vs ${p.rival} · ${p.fullDate} · Dif: ${p.diff > 0 ? "+" : ""}${p.diff}`
                      }}
                    />
                  }
                />

                <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

                <Bar
                  yAxisId="left"
                  dataKey="anotados"
                  name="Goles anotados"
                  fill="var(--color-anotados)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="recibidos"
                  name="Goles recibidos"
                  fill="var(--color-recibidos)"
                  radius={[4, 4, 0, 0]}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="diferenciaAcumulada"
                  name="Dif. acumulada"
                  stroke="var(--color-diferenciaAcumulada)"
                  strokeWidth={5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
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
                      <TableHead className="text-right">Anot.</TableHead>
                      <TableHead className="text-right">Recib.</TableHead>
                      <TableHead className="text-right">Dif.</TableHead>
                      <TableHead className="text-right">Dif. acum.</TableHead>
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

                        <TableCell className="text-right tabular-nums">
                          <Badge className="bg-green-500 text-white hover:bg-green-500 tabular-nums">{m.anotados}</Badge>
                        </TableCell>

                        <TableCell className="text-right tabular-nums">
                          <Badge variant="destructive" className="tabular-nums">
                            {m.recibidos}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right tabular-nums">
                          <Badge className={`${getDiffBadge(m.diff)} text-white tabular-nums`}>
                            {m.diff > 0 ? "+" : ""}
                            {m.diff}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right tabular-nums">
                          <span className="font-semibold text-white">
                            {m.diferenciaAcumulada > 0 ? "+" : ""}
                            {m.diferenciaAcumulada}
                          </span>
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
                  <span className="font-medium text-foreground">{partidos}</span> partidos
                </span>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md border bg-card px-2 py-1">
                    Anotados: <span className="font-semibold text-foreground">{totalFor}</span>{" "}
                    <span className="text-muted-foreground">({avgFor}/p)</span>
                  </span>
                  <span className="rounded-md border bg-card px-2 py-1">
                    Recibidos: <span className="font-semibold text-foreground">{totalAgainst}</span>{" "}
                    <span className="text-muted-foreground">({avgAgainst}/p)</span>
                  </span>
                  <span className="rounded-md border bg-card px-2 py-1">
                    Dif.:{" "}
                    <span className={`font-semibold ${totalDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {totalDiff > 0 ? "+" : ""}
                      {totalDiff}
                    </span>{" "}
                    <span className="text-muted-foreground">({avgDiff}/p)</span>
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
