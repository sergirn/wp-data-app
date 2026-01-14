"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
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

import type { Match, MatchStats } from "@/lib/types"

interface TurnoversRecoveriesChartProps {
  matches: Match[]
  stats: MatchStats[]
}

export function TurnoversRecoveriesChart({ matches, stats }: TurnoversRecoveriesChartProps) {
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

      const perdidas = matchStats.reduce((sum: number, s: any) => sum + (s.acciones_perdida_poco || 0), 0)
      const recuperaciones = matchStats.reduce((sum: number, s: any) => sum + (s.acciones_recuperacion || 0), 0)

      const jornadaNumber = match.jornada ?? index + 1
      const balance = recuperaciones - perdidas

      return {
        index,
        matchId: match.id,
        jornada: `J${jornadaNumber}`,
        jornadaNumber,
        fullOpponent: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
        date: new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
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
        jornada: m.jornada,
        perdidas: m.perdidas,
        recuperaciones: m.recuperaciones,
        balance: balanceAcumulado,
      }
    })
  }, [matchData])

  // ===== TOTALES / MEDIAS =====
  const partidos = matchData.length
  const totalPerdidas = matchData.reduce((s, m) => s + m.perdidas, 0)
  const totalRecuperaciones = matchData.reduce((s, m) => s + m.recuperaciones, 0)
  const balanceTotal = totalRecuperaciones - totalPerdidas

  const avgPerdidas = partidos > 0 ? (totalPerdidas / partidos).toFixed(1) : "0.0"
  const avgRecuperaciones = partidos > 0 ? (totalRecuperaciones / partidos).toFixed(1) : "0.0"
  const avgBalance = partidos > 0 ? (balanceTotal / partidos).toFixed(1) : "0.0"

  const maxAbsBalance = Math.max(...matchData.map((m) => Math.abs(m.balance)), 1)

  const getBalanceColor = (v: number) => (v >= 0 ? "bg-green-500" : "bg-red-500")

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Control de Posesión</CardTitle>
            <CardDescription className="truncate">
              Pérdidas y recuperaciones por partido (jornada 1 → actual)
            </CardDescription>
          </div>

          {/* ✅ Switch Chart/Table (igual que el otro) */}
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
        {/* ===== RESUMEN (igual UI que disciplina) ===== */}
        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Pérdidas</div>
            <div className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{totalPerdidas}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Media: {avgPerdidas}/partido</div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Recuperaciones</div>
            <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{totalRecuperaciones}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Media: {avgRecuperaciones}/partido</div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center col-span-2">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Balance Total</div>
            <div className={`text-lg md:text-2xl font-bold ${balanceTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {balanceTotal >= 0 ? "+" : ""}
              {balanceTotal}
            </div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              Media: {avgBalance}/partido · (Recuperaciones − Pérdidas)
            </div>
          </div>
        </div>

        {/* ===== VISTA: CHART o TABLA ===== */}
        {view === "chart" ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Evolución por Partido</h3>

            <ChartContainer
              config={{
                perdidas: { label: "Pérdidas", color: "hsl(0, 84%, 60%)" },
                recuperaciones: { label: "Recuperaciones", color: "hsl(142, 71%, 45%)" },
                balance: { label: "Balance (acum.)", color: "hsl(217, 91%, 60%)" },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

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
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: "Cantidad", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                  />

                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />

                  <Bar dataKey="perdidas" fill="var(--color-perdidas)" name="Pérdidas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recuperaciones" fill="var(--color-recuperaciones)" name="Recuperaciones" radius={[4, 4, 0, 0]} />

                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--color-balance)"
                    name="Balance (acumulado)"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "var(--color-balance)" }}
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
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Balance +
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Balance −
                </span>
              </div>
            </div>

            {/* ✅ tabla pro (igual patrón que disciplina) */}
            <div className="rounded-xl border overflow-hidden bg-card">
              <div className="w-full overflow-x-auto">
                <div className="max-h-[420px] overflow-y-auto">
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

              {/* footer con totales */}
              <div className="border-t bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{partidos}</span> partidos
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border bg-card px-2 py-1">
                      Pérdidas: <span className="font-semibold text-foreground">{totalPerdidas}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Recuperaciones: <span className="font-semibold text-foreground">{totalRecuperaciones}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Balance:{" "}
                      <span className={`font-semibold ${balanceTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {balanceTotal >= 0 ? "+" : ""}
                        {balanceTotal}
                      </span>
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
