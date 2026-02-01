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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"
import { Repeat2 } from "lucide-react"
import type { Match, MatchStats } from "@/lib/types"

interface TurnoversRecoveriesChartProps {
  matches: Match[]
  stats: MatchStats[]
}

export function TurnoversRecoveriesChart({ matches, stats }: TurnoversRecoveriesChartProps) {
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

      const perdidas = matchStats.reduce((sum: number, s: any) => sum + (s.acciones_perdida_poco || 0), 0)
      const recuperaciones = matchStats.reduce((sum: number, s: any) => sum + (s.acciones_recuperacion || 0), 0)

      const jornadaNumber = match.jornada ?? index + 1
      const balance = recuperaciones - perdidas

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        rival: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        perdidas,
        recuperaciones,
        balance,
      }
    })
  }, [sortedMatches, stats])

  const chartData = useMemo(() => {
    let balanceAcumulado = 0
    return matchData.map((m) => {
      balanceAcumulado += m.balance
      return {
        matchId: m.matchId,
        jornada: m.jornada,
        rival: m.rival,
        fullDate: m.fullDate,

        perdidas: m.perdidas,
        recuperaciones: m.recuperaciones,
        balance: balanceAcumulado,
        balancePartido: m.balance,
      }
    })
  }, [matchData])

  const partidos = matchData.length
  const totalPerdidas = matchData.reduce((s, m) => s + m.perdidas, 0)
  const totalRecuperaciones = matchData.reduce((s, m) => s + m.recuperaciones, 0)
  const balanceTotal = totalRecuperaciones - totalPerdidas

  const avgPerdidas = partidos > 0 ? (totalPerdidas / partidos).toFixed(1) : "0.0"
  const avgRecuperaciones = partidos > 0 ? (totalRecuperaciones / partidos).toFixed(1) : "0.0"
  const avgBalance = partidos > 0 ? (balanceTotal / partidos).toFixed(1) : "0.0"

  const maxAbsBalance = Math.max(...matchData.map((m) => Math.abs(m.balance)), 1)

  const getBalanceColor = (v: number) => (v >= 0 ? "bg-green-500" : "bg-red-500")

  if (!matchData.length) return null

  return (
    <ExpandableChartCard
      title="Control de Posesión"
      description={`Últimos ${partidos} · Bal: ${avgBalance}/p · Rec: ${avgRecuperaciones}/p · Pérd: ${avgPerdidas}/p`}
      icon={<Repeat2 className="w-5 h-5" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      rightHeader={
        <span className="text-xs text-muted-foreground">
          {balanceTotal >= 0 ? "+" : ""}
          {balanceTotal}
        </span>
      }
      renderChart={({ compact }) => (
        <div className="space-y-3">
          {/* Resumen */}
          <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-3 md:gap-4"}`}>
            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Pérdidas</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{totalPerdidas}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgPerdidas}/p</div> : null}
            </div>

            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Recuperaciones</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{totalRecuperaciones}</div>
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgRecuperaciones}/p</div> : null}
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
              {!compact ? <div className="text-xs text-muted-foreground">Media: {avgBalance}/p</div> : null}
            </div>
          </div>

          <ChartContainer
            config={{
              perdidas: { label: "Pérdidas", color: "hsl(0, 84%, 60%)" },
              recuperaciones: { label: "Recuperaciones", color: "hsl(142, 71%, 45%)" },
              balance: { label: "Balance (acum.)", color: "hsl(217, 91%, 60%)" },
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
                        return `${label} · vs ${p.rival} · ${p.fullDate} · Bal(p): ${p.balancePartido >= 0 ? "+" : ""}${p.balancePartido}`
                      }}
                    />
                  }
                />

                <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

                <Bar dataKey="perdidas" fill="var(--color-perdidas)" name="Pérdidas" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="recuperaciones"
                  fill="var(--color-recuperaciones)"
                  name="Recuperaciones"
                  radius={[4, 4, 0, 0]}
                />

                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-balance)"
                  name="Balance (acumulado)"
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
                    <TableHead className="text-right">Pérdidas</TableHead>
                    <TableHead className="text-right">Recup.</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {matchData.map((m, idx) => {
                    const pct = Math.round((Math.abs(m.balance) / maxAbsBalance) * 100)
                    const dot = m.balance >= 0 ? "bg-green-500" : "bg-red-500"

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

                        <TableCell className="text-right tabular-nums">
                          <Badge variant="destructive" className="tabular-nums">
                            −{m.perdidas}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right tabular-nums">
                          <Badge className="bg-green-500 text-white hover:bg-green-500 tabular-nums">
                            +{m.recuperaciones}
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
                                  style={{ width: `${pct}%` }}
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
                  Pérdidas: <span className="font-semibold text-foreground">{totalPerdidas}</span>{" "}
                  <span className="text-muted-foreground">({avgPerdidas}/p)</span>
                </span>
                <span className="rounded-md border bg-card px-2 py-1">
                  Recuperaciones: <span className="font-semibold text-foreground">{totalRecuperaciones}</span>{" "}
                  <span className="text-muted-foreground">({avgRecuperaciones}/p)</span>
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
