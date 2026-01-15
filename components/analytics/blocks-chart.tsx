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
  CartesianGrid,
  Legend,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import type { Match, MatchStats, Player } from "@/lib/types"
import { Shield } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"

interface BlocksChartProps {
  matches: Match[]
  stats: MatchStats[]
  players: Player[]
}

export function BlocksChart({ matches, stats }: BlocksChartProps) {
  const sortedMatches = useMemo(() => {
    return [...(matches ?? [])].sort((a: any, b: any) => {
      const aj = a?.jornada ?? 9999
      const bj = b?.jornada ?? 9999
      if (aj !== bj) return aj - bj
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })
  }, [matches])

  const matchData = useMemo(() => {
    const statsArr = Array.isArray(stats) ? stats : []

    return sortedMatches.map((match: any, index: number) => {
      const matchStats = statsArr.filter((s: any) => String(s.match_id) === String(match.id))

      const totalBlocks = matchStats.reduce((sum: number, s: any) => sum + (s.acciones_bloqueo || 0), 0)

      // ⚠️ Mantengo tu lógica original
      const totalGoalsReceived = match.away_score ?? 0

      const jornadaNumber = match.jornada ?? index + 1
      const balance = totalBlocks - totalGoalsReceived

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        rival: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        bloqueos: totalBlocks,
        golesRecibidos: totalGoalsReceived,
        balance,
      }
    })
  }, [sortedMatches, stats])

  const chartData = useMemo(() => {
    return matchData.map((m, index) => {
      const prev = matchData.slice(0, index + 1)
      const avgBlocks = prev.reduce((sum, x) => sum + x.bloqueos, 0) / (index + 1)

      return {
        matchId: m.matchId,
        jornada: m.jornada,
        rival: m.rival,
        fullDate: m.fullDate,
        bloqueos: m.bloqueos,
        golesRecibidos: m.golesRecibidos,
        promedioBloqueos: Number(avgBlocks.toFixed(1)),
        balance: m.balance,
      }
    })
  }, [matchData])

  const partidos = matchData.length
  const totalBlocks = matchData.reduce((sum, m) => sum + m.bloqueos, 0)
  const totalGoalsReceived = matchData.reduce((sum, m) => sum + m.golesRecibidos, 0)
  const avgBlocksPerMatch = partidos > 0 ? (totalBlocks / partidos).toFixed(1) : "0.0"
  const avgGoalsReceivedPerMatch = partidos > 0 ? (totalGoalsReceived / partidos).toFixed(1) : "0.0"
  const balanceTotal = totalBlocks - totalGoalsReceived

  const maxAbsBalance = Math.max(...matchData.map((m) => Math.abs(m.balance)), 1)

  const getBlocksColor = (blocks: number) => {
    if (blocks >= 5) return "bg-green-500"
    if (blocks >= 3) return "bg-yellow-500"
    return "bg-orange-500"
  }

  const getBalanceColor = (v: number) => (v >= 0 ? "bg-green-500" : "bg-red-500")

  if (!matchData.length) return null

  return (
    <ExpandableChartCard
      title="Eficiencia de Bloqueos"
      description={`Últimos ${partidos} · Media: ${avgBlocksPerMatch} bloq/p · Recibidos: ${avgGoalsReceivedPerMatch}/p`}
      icon={<Shield className="w-5 h-5" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      rightHeader={
        <span className="text-xs text-muted-foreground">
          {balanceTotal >= 0 ? "+" : ""}
          {balanceTotal}
        </span>
      }
      renderChart={({ compact }) => (
        <div className="space-y-3">
          {/* ✅ resumen (compacto / grande) */}
          <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-3 md:gap-4"}`}>
            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Bloqueos</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalBlocks}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgBlocksPerMatch}/p</div> : null}
            </div>

            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Recibidos</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{totalGoalsReceived}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgGoalsReceivedPerMatch}/p</div> : null}
            </div>

            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Balance</div>
              <div
                className={`text-lg font-bold ${
                  balanceTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {balanceTotal >= 0 ? "+" : ""}
                {balanceTotal}
              </div>
              {!compact ? <div className="text-xs text-muted-foreground">Bloq − Rec.</div> : null}
            </div>
          </div>

          <ChartContainer
            config={{
              bloqueos: { label: "Bloqueos", color: "hsl(142, 71%, 45%)" },
              golesRecibidos: { label: "Goles Recibidos", color: "hsl(0, 84%, 60%)" },
              promedioBloqueos: { label: "Promedio Bloqueos", color: "hsl(217, 91%, 60%)" },
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
                        return `${label} · vs ${p.rival} · ${p.fullDate} · Bal: ${p.balance >= 0 ? "+" : ""}${p.balance}`
                      }}
                    />
                  }
                />

                <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

                <Bar
                  yAxisId="left"
                  dataKey="bloqueos"
                  name="Bloqueos"
                  fill="var(--color-bloqueos)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="golesRecibidos"
                  name="Goles Recibidos"
                  fill="var(--color-golesRecibidos)"
                  radius={[4, 4, 0, 0]}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="promedioBloqueos"
                  name="Promedio Bloqueos"
                  stroke="var(--color-promedioBloqueos)"
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
              <Table className="min-w-[860px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-center">Bloqueos</TableHead>
                    <TableHead className="text-center">Recibidos</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {matchData.map((m, idx) => {
                    const dot = m.balance >= 0 ? "bg-green-500" : "bg-red-500"
                    const pctBalance = Math.round((Math.abs(m.balance) / maxAbsBalance) * 100)

                    return (
                      <TableRow
                        key={m.matchId}
                        className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                      >
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${dot}`} />
                            {m.jornada}
                          </div>
                        </TableCell>

                        <TableCell className="max-w-[360px]">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{m.rival}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge className={`${getBlocksColor(m.bloqueos)} text-white tabular-nums`}>{m.bloqueos}</Badge>
                        </TableCell>

                        <TableCell className="text-center tabular-nums">
                          <Badge variant="destructive" className="tabular-nums">
                            {m.golesRecibidos}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-end justify-end gap-3">
                            <Badge className={`${getBalanceColor(m.balance)} text-white tabular-nums`}>
                              {m.balance >= 0 ? "+" : ""}
                              {m.balance}
                            </Badge>

                            <div className="hidden md:block w-20">
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-2 rounded-full bg-blue-600 dark:bg-blue-400 transition-all"
                                  style={{ width: `${pctBalance}%` }}
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
                  Bloqueos: <span className="font-semibold text-foreground">{totalBlocks}</span>{" "}
                  <span className="text-muted-foreground">({avgBlocksPerMatch}/p)</span>
                </span>
                <span className="rounded-md border bg-card px-2 py-1">
                  Recibidos: <span className="font-semibold text-foreground">{totalGoalsReceived}</span>{" "}
                  <span className="text-muted-foreground">({avgGoalsReceivedPerMatch}/p)</span>
                </span>
                <span className="rounded-md border bg-card px-2 py-1">
                  Balance:{" "}
                  <span
                    className={`font-semibold ${
                      balanceTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {balanceTotal >= 0 ? "+" : ""}
                    {balanceTotal}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}
