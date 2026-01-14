"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AlertTriangle, BarChart3, Table2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"

interface DisciplineChartProps {
  matches: any[]
  stats: any[]
}

export function DisciplineChart({ matches, stats }: DisciplineChartProps) {
  const [view, setView] = useState<"chart" | "table">("chart")

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
      const matchStats = (stats ?? []).filter((s) => s.match_id === match.id)

      const exp3 = matchStats.reduce((sum, s) => sum + (s.faltas_exp_3_bruta || 0) + (s.faltas_exp_3_int || 0), 0)
      const exp20 = matchStats.reduce((sum, s) => sum + (s.faltas_exp_20_1c1 || 0) + (s.faltas_exp_20_boya || 0), 0)
      const penaltis = matchStats.reduce((sum, s) => sum + (s.faltas_penalti || 0), 0)
      const contrafaltas = matchStats.reduce((sum, s) => sum + (s.faltas_contrafaltas || 0), 0)

      const jornadaNumber = match.jornada ?? index + 1
      const total = exp3 + exp20 + penaltis + contrafaltas

      return {
        index,
        matchId: match.id,
        jornada: `J${jornadaNumber}`,
        jornadaNumber,
        date: new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
        fullOpponent: match.opponent,

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
      jornada: m.jornada,
      exp3: m.exp3,
      exp20: m.exp20,
      penaltis: m.penaltis,
      contrafaltas: m.contrafaltas,
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

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Disciplina por Partido</CardTitle>
            <CardDescription className="truncate">
              Evolución de faltas y exclusiones (jornada 1 → actual)
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

      <CardContent>
        {/* ===== RESUMEN ===== */}
        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Total Disciplina</div>
            <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">{totalAcciones}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Media: {avgAcciones}/partido</div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Exclusiones</div>
            <div className="text-lg md:text-2xl font-bold text-amber-600 dark:text-amber-400">{totalExclusiones}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Media: {avgExclusiones}/partido</div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Penaltis</div>
            <div className="text-lg md:text-2xl font-bold text-violet-600 dark:text-violet-400">{totalPenaltis}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Media: {avgPenaltis}/partido</div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">Contrafaltas</div>
            <div className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{totalContrafaltas}</div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">Media: {avgContrafaltas}/partido</div>
          </div>
        </div>

        {/* ===== VISTA: CHART o TABLA ===== */}
        {view === "chart" ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Evolución por Partido</h3>

            <ChartContainer
              config={{
                exp3: { label: "Exclusiones 3m", color: "hsl(0, 84%, 60%)" },
                exp20: { label: "Exclusiones 20s", color: "hsl(38, 92%, 55%)" },
                penaltis: { label: "Penaltis", color: "hsl(262, 85%, 65%)" },
                contrafaltas: { label: "Contrafaltas", color: "hsl(217, 91%, 60%)" },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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

                  <Bar dataKey="exp3" fill="var(--color-exp3)" name="Exclusiones 3m" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exp20" fill="var(--color-exp20)" name="Exclusiones 20s" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="penaltis" fill="var(--color-penaltis)" name="Penaltis" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="contrafaltas"
                    fill="var(--color-contrafaltas)"
                    name="Contrafaltas"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
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
                  <span className="h-2 w-2 rounded-full bg-green-500" /> OK
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" /> Medio
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Alto
                </span>
              </div>
            </div>

            {/* ✅ tabla pro: sticky header + zebra + columnas responsive + barra de intensidad */}
            <div className="rounded-xl border overflow-hidden bg-card">
              <div className="w-full overflow-x-auto">
                <div className="max-h-[420px] overflow-y-auto">
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

                        const level = total <= 4 ? "ok" : total <= 8 ? "mid" : "high"
                        const levelDot = level === "ok" ? "bg-green-500" : level === "mid" ? "bg-yellow-500" : "bg-red-500"

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

              {/* footer con totales */}
              <div className="border-t bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{partidos}</span> partidos
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border bg-card px-2 py-1">
                      Exclusiones: <span className="font-semibold text-foreground">{totalExclusiones}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Penaltis: <span className="font-semibold text-foreground">{totalPenaltis}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Contrafaltas: <span className="font-semibold text-foreground">{totalContrafaltas}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Total: <span className="font-semibold text-foreground">{totalAcciones}</span>
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
