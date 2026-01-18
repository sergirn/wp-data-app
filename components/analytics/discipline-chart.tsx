"use client"

import { useMemo } from "react"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Bar,
  Line,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle } from "lucide-react"

interface DisciplineChartProps {
  matches: any[]
  stats: any[]
}

export function DisciplineChart({ matches, stats }: DisciplineChartProps) {
  const sortedMatches = useMemo(() => {
    return [...(matches ?? [])].sort((a, b) => {
      const aj = a?.jornada ?? 9999
      const bj = b?.jornada ?? 9999
      if (aj !== bj) return aj - bj
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })
  }, [matches])

  const matchData = useMemo(() => {
    return sortedMatches.map((match, index) => {
      const matchStats = (stats ?? []).filter((s) => String(s.match_id) === String(match.id))

      // ✅ SOLO estos campos
      const exp20_1c1 = matchStats.reduce((sum, s) => sum + (s.faltas_exp_20_1c1 || 0), 0)
      const exp20_boya = matchStats.reduce((sum, s) => sum + (s.faltas_exp_20_boya || 0), 0)
      const penaltis = matchStats.reduce((sum, s) => sum + (s.faltas_penalti || 0), 0)
      const expSimple = matchStats.reduce((sum, s) => sum + (s.faltas_exp_simple || 0), 0)

      const jornadaNumber = match.jornada ?? index + 1

      const totalExclusiones = exp20_1c1 + exp20_boya + expSimple
      const total = totalExclusiones + penaltis

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        fullOpponent: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        exp20_1c1,
        exp20_boya,
        expSimple,
        penaltis,

        totalExclusiones,
        total,
      }
    })
  }, [sortedMatches, stats])

  // ✅ ChartData con promedio acumulado (como en BlocksChart)
  const chartData = useMemo(() => {
    return matchData.map((m, index) => {
      const prev = matchData.slice(0, index + 1)
      const avgTotal = prev.reduce((sum, x) => sum + x.total, 0) / (index + 1)

      return {
        matchId: m.matchId,
        jornada: m.jornada,
        rival: m.fullOpponent,
        fullDate: m.fullDate,

        exp20_1c1: m.exp20_1c1,
        exp20_boya: m.exp20_boya,
        expSimple: m.expSimple,
        penaltis: m.penaltis,

        totalExclusiones: m.totalExclusiones,
        total: m.total,

        // ✅ línea
        promedioTotal: Number(avgTotal.toFixed(1)),
      }
    })
  }, [matchData])

  // ===== RESUMEN (KPIs con medias, como antes) =====
  const partidos = matchData.length
  const total20_1c1 = matchData.reduce((sum, m) => sum + m.exp20_1c1, 0)
  const total20_boya = matchData.reduce((sum, m) => sum + m.exp20_boya, 0)
  const totalExpSimple = matchData.reduce((sum, m) => sum + m.expSimple, 0)
  const totalPenaltis = matchData.reduce((sum, m) => sum + m.penaltis, 0)

  const totalExclusiones = total20_1c1 + total20_boya + totalExpSimple
  const totalAcciones = totalExclusiones + totalPenaltis

  const avgAcciones = partidos > 0 ? (totalAcciones / partidos).toFixed(1) : "0.0"
  const avgExclusiones = partidos > 0 ? (totalExclusiones / partidos).toFixed(1) : "0.0"
  const avgPenaltis = partidos > 0 ? (totalPenaltis / partidos).toFixed(1) : "0.0"
  const avgExpSimple = partidos > 0 ? (totalExpSimple / partidos).toFixed(1) : "0.0"

  const maxTotal = Math.max(...matchData.map((m) => m.total), 1)

  const getDisciplineColor = (total: number) => {
    if (total <= 4) return "bg-green-500"
    if (total <= 8) return "bg-yellow-500"
    return "bg-red-500"
  }

  if (!matchData.length) return null

  return (
    <ExpandableChartCard
      title="Disciplina por Partido"
      description={`P. ${partidos} · Bal: ${avgAcciones}/p · Excl.: ${avgExclusiones}/p · Pen: ${avgPenaltis}/p`}
      icon={<AlertTriangle className="h-5 w-5" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      rightHeader={<span className="text-xs text-muted-foreground">{totalAcciones}</span>}
      renderChart={({ compact }) => (
        <div className="space-y-3">
          {/* ✅ KPIs ARRIBA (se mantienen) */}
          <div className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-4 md:gap-4"}`}>
            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalAcciones}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgAcciones}/p</div> : null}
            </div>

            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Exclusiones</div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{totalExclusiones}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgExclusiones}/p</div> : null}
            </div>

            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Penaltis</div>
              <div className="text-lg font-bold text-violet-600 dark:text-violet-400">{totalPenaltis}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgPenaltis}/p</div> : null}
            </div>

            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Exp. simple</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{totalExpSimple}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgExpSimple}/p</div> : null}
            </div>
          </div>

          <ChartContainer
            config={{
              exp20_1c1: { label: "Exp. 20s (1c1)", color: "hsl(38, 92%, 55%)" },
              exp20_boya: { label: "Exp. 20s (Boya)", color: "hsl(28, 90%, 55%)" },
              expSimple: { label: "Exp. simple", color: "hsl(217, 91%, 60%)" },
              penaltis: { label: "Penaltis", color: "hsl(262, 85%, 65%)" },
              promedioTotal: { label: "Media (acum.)", color: "hsl(142, 71%, 45%)" },
            }}
            className={`w-full ${compact ? "h-[190px]" : "h-[420px]"}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
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

                {/* barras */}
                <YAxis yAxisId="left" fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />

                {/* línea media */}
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
                        return `${label} · vs ${p.rival} · ${p.fullDate} · Total: ${p.total} · Media: ${p.promedioTotal}`
                      }}
                    />
                  }
                />

                <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

                <Bar
                  yAxisId="left"
                  dataKey="exp20_1c1"
                  fill="var(--color-exp20_1c1)"
                  name="Exp. 20s (1c1)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="exp20_boya"
                  fill="var(--color-exp20_boya)"
                  name="Exp. 20s (Boya)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="expSimple"
                  fill="var(--color-expSimple)"
                  name="Exp. simple"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="penaltis"
                  fill="var(--color-penaltis)"
                  name="Penaltis"
                  radius={[4, 4, 0, 0]}
                />

                {/* ✅ Media acumulada estilo BlocksChart */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="promedioTotal"
                  name="Media (acum.)"
                  stroke="var(--color-promedioTotal)"
                  strokeWidth={5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[920px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>

                    <TableHead className="text-right">Excl.</TableHead>
                    <TableHead className="text-right hidden md:table-cell">20s 1c1</TableHead>
                    <TableHead className="text-right hidden md:table-cell">20s Boya</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Exp S</TableHead>

                    <TableHead className="text-right hidden sm:table-cell">Pen.</TableHead>

                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {matchData.map((m, idx) => {
                    const total = m.total
                    const excl = m.totalExclusiones
                    const percent = Math.round((total / maxTotal) * 100)
                    const levelDot = total <= 4 ? "bg-green-500" : total <= 8 ? "bg-yellow-500" : "bg-red-500"

                    return (
                      <TableRow
                        key={m.matchId}
                        className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                      >
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${levelDot}`} />
                            {m.jornada}
                          </div>
                        </TableCell>

                        <TableCell className="max-w-[320px]">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{m.fullOpponent}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <Badge variant="secondary" className="tabular-nums">
                            {excl}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right hidden md:table-cell tabular-nums">{m.exp20_1c1}</TableCell>
                        <TableCell className="text-right hidden md:table-cell tabular-nums">{m.exp20_boya}</TableCell>
                        <TableCell className="text-right hidden md:table-cell tabular-nums">{m.expSimple}</TableCell>

                        <TableCell className="text-right hidden sm:table-cell tabular-nums">{m.penaltis}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-end justify-end gap-3">
                            <Badge className={`${getDisciplineColor(total)} text-white tabular-nums`}>{total}</Badge>

                            <div className="hidden md:block w-20">
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-2 rounded-full bg-blue-600 dark:bg-blue-400 transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="border-t bg-muted/20 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{partidos}</span> partidos
              </span>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-md border bg-card px-2 py-1">
                  Exclusiones: <span className="font-semibold text-foreground">{totalExclusiones}</span>{" "}
                  <span className="text-muted-foreground">({avgExclusiones}/p)</span>
                </span>

                <span className="rounded-md border bg-card px-2 py-1">
                  Penaltis: <span className="font-semibold text-foreground">{totalPenaltis}</span>{" "}
                  <span className="text-muted-foreground">({avgPenaltis}/p)</span>
                </span>

                <span className="rounded-md border bg-card px-2 py-1">
                  Exp. simple: <span className="font-semibold text-foreground">{totalExpSimple}</span>{" "}
                  <span className="text-muted-foreground">({avgExpSimple}/p)</span>
                </span>

                <span className="rounded-md border bg-card px-2 py-1">
                  Total: <span className="font-semibold text-foreground">{totalAcciones}</span>{" "}
                  <span className="text-muted-foreground">({avgAcciones}/p)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}
