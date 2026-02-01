"use client"

import { useMemo } from "react"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle } from "lucide-react"

interface DisciplineChartProps {
  matches: any[]
  stats: any[]
}

export function DisciplineChart({ matches, stats }: DisciplineChartProps) {
  // ✅ ordenar de jornada 1 a la actual
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

      const exp3 = matchStats.reduce(
        (sum, s) => sum + (s.faltas_exp_3_bruta || 0) + (s.faltas_exp_3_int || 0),
        0,
      )
      const exp20 = matchStats.reduce(
        (sum, s) => sum + (s.faltas_exp_20_1c1 || 0) + (s.faltas_exp_20_boya || 0),
        0,
      )
      const penaltis = matchStats.reduce((sum, s) => sum + (s.faltas_penalti || 0), 0)
      const contrafaltas = matchStats.reduce((sum, s) => sum + (s.faltas_contrafaltas || 0), 0)

      const jornadaNumber = match.jornada ?? index + 1
      const total = exp3 + exp20 + penaltis + contrafaltas

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        fullOpponent: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        exp3,
        exp20,
        penaltis,
        contrafaltas,
        total,
        totalExclusiones: exp3 + exp20,
      }
    })
  }, [sortedMatches, stats])

  const chartData = useMemo(() => {
    return matchData.map((m) => ({
      matchId: m.matchId,
      jornada: m.jornada,
      rival: m.fullOpponent,
      fullDate: m.fullDate,

      exp3: m.exp3,
      exp20: m.exp20,
      penaltis: m.penaltis,
      contrafaltas: m.contrafaltas,
      total: m.total,
      totalExclusiones: m.totalExclusiones,
    }))
  }, [matchData])

  // ===== RESUMEN =====
  const partidos = matchData.length
  const totalExp3 = matchData.reduce((sum, m) => sum + m.exp3, 0)
  const totalExp20 = matchData.reduce((sum, m) => sum + m.exp20, 0)
  const totalPenaltis = matchData.reduce((sum, m) => sum + m.penaltis, 0)
  const totalContrafaltas = matchData.reduce((sum, m) => sum + m.contrafaltas, 0)

  const totalExclusiones = totalExp3 + totalExp20
  const totalAcciones = totalExclusiones + totalPenaltis + totalContrafaltas

  const avgAcciones = partidos > 0 ? (totalAcciones / partidos).toFixed(1) : "0.0"
  const avgExclusiones = partidos > 0 ? (totalExclusiones / partidos).toFixed(1) : "0.0"
  const avgPenaltis = partidos > 0 ? (totalPenaltis / partidos).toFixed(1) : "0.0"
  const avgContrafaltas = partidos > 0 ? (totalContrafaltas / partidos).toFixed(1) : "0.0"

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
      description={`P. ${partidos} · Bal: ${avgAcciones}/p · Exp.: ${avgExclusiones}/p · Pen: ${avgPenaltis}/p · Cont: ${avgContrafaltas}/p`}
      icon={<AlertTriangle className="h-5 w-5" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      rightHeader={<span className="text-xs text-muted-foreground">{totalAcciones}</span>}
      renderChart={({ compact }) => (
        <div className="space-y-3">
          {/* Resumen compacto */}
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
              <div className="text-[10px] font-medium text-muted-foreground">Contrafaltas</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{totalContrafaltas}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgContrafaltas}/p</div> : null}
            </div>
          </div>

          <ChartContainer
            config={{
              exp3: { label: "Exclusiones 3m", color: "hsl(0, 84%, 60%)" },
              exp20: { label: "Exclusiones 20s", color: "hsl(38, 92%, 55%)" },
              penaltis: { label: "Penaltis", color: "hsl(262, 85%, 65%)" },
              contrafaltas: { label: "Contrafaltas", color: "hsl(217, 91%, 60%)" },
            }}
            className={`w-full ${compact ? "h-[190px]" : "h-[420px]"}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
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
                  fontSize={12}
                  width={34}
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
                        return `${label} · vs ${p.rival} · ${p.fullDate} · Total: ${p.total}`
                      }}
                    />
                  }
                />

                <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

                <Bar dataKey="exp3" fill="var(--color-exp3)" name="Exclusiones 3m" radius={[4, 4, 0, 0]} />
                <Bar dataKey="exp20" fill="var(--color-exp20)" name="Exclusiones 20s" radius={[4, 4, 0, 0]} />
                <Bar dataKey="penaltis" fill="var(--color-penaltis)" name="Penaltis" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contrafaltas" fill="var(--color-contrafaltas)" name="Contrafaltas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[860px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>

                    <TableHead className="text-right">Excl.</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Exp. 3m</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Exp. 20s</TableHead>

                    <TableHead className="text-right hidden sm:table-cell">Pen.</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Contraf.</TableHead>

                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {matchData.map((m, idx) => {
                    const total = m.total
                    const excl = m.totalExclusiones
                    const percent = Math.round((total / maxTotal) * 100)

                    const levelDot =
                      total <= 4 ? "bg-green-500" : total <= 8 ? "bg-yellow-500" : "bg-red-500"

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

                        <TableCell className="text-right hidden md:table-cell tabular-nums">{m.exp3}</TableCell>
                        <TableCell className="text-right hidden md:table-cell tabular-nums">{m.exp20}</TableCell>

                        <TableCell className="text-right hidden sm:table-cell tabular-nums">{m.penaltis}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell tabular-nums">{m.contrafaltas}</TableCell>

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
                  Contrafaltas: <span className="font-semibold text-foreground">{totalContrafaltas}</span>{" "}
                  <span className="text-muted-foreground">({avgContrafaltas}/p)</span>
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
