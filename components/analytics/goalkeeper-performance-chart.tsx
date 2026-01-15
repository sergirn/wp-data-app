"use client"

import { useMemo } from "react"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Shield } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"

interface GoalkeeperPerformanceChartProps {
  matches: any[]
  stats: any[]
}

export function GoalkeeperPerformanceChart({ matches, stats }: GoalkeeperPerformanceChartProps) {
  const data = useMemo(() => {
    const sorted = [...(matches ?? [])].sort((a, b) => {
      const aj = a?.jornada ?? 9999
      const bj = b?.jornada ?? 9999
      if (aj !== bj) return aj - bj
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })

    return sorted.slice(-15).map((match, idx) => {
      const goalkeepersStats = (stats ?? []).filter(
        (s) => String(s.match_id) === String(match.id) && s.portero_paradas_totales != null,
      )

      const totalSaves = goalkeepersStats.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0)

      // ⚠️ igual que tu código: si esto no es correcto para "goles recibidos", ajústalo aquí
      const totalGoalsAgainst = match.away_score || 0

      const totalShots = totalSaves + totalGoalsAgainst
      const savePercentage = totalShots > 0 ? (totalSaves / totalShots) * 100 : 0

      const savesInferiority = goalkeepersStats.reduce((sum, s) => sum + (s.portero_paradas_hombre_menos || 0), 0)
      const penaltiesSaved = goalkeepersStats.reduce((sum, s) => sum + (s.portero_paradas_penalti_parado || 0), 0)

      const jornadaNumber = match.jornada ?? idx + 1

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        rival: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        percentage: Number(savePercentage.toFixed(1)),
        saves: totalSaves,
        savesInf: savesInferiority,
        pensSaved: penaltiesSaved,

        golesRecibidos: totalGoalsAgainst,
        tirosRecibidos: totalShots,
      }
    })
  }, [matches, stats])

  const avgPct = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.percentage, 0) / data.length).toFixed(1)
  }, [data])

  const totalSaves = useMemo(() => data.reduce((s, d) => s + d.saves, 0), [data])
  const totalGoalsAgainst = useMemo(() => data.reduce((s, d) => s + d.golesRecibidos, 0), [data])
  const totalShotsAgainst = totalSaves + totalGoalsAgainst

  if (!data.length) return null

  return (
    <ExpandableChartCard
      title="Rendimiento de Porteros"
      description={`Últimos ${data.length} · Media: ${avgPct}% · Paradas: ${totalSaves} · GC: ${totalGoalsAgainst}`}
      icon={<Shield className="w-5 h-5" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      rightHeader={<span className="text-xs text-muted-foreground">{avgPct}%</span>}
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            saves: { label: "Paradas Totales", color: "hsl(199 95% 55%)" },
            savesInf: { label: "Paradas en Inferioridad", color: "hsl(142 85% 45%)" },
            percentage: { label: "% Efectividad", color: "hsl(34 95% 55%)" },
          }}
          className={`w-full ${compact ? "h-[190px]" : "h-[420px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillSaves" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-saves)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-saves)" stopOpacity={0.08} />
                </linearGradient>

                <linearGradient id="fillSavesInf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-savesInf)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-savesInf)" stopOpacity={0.08} />
                </linearGradient>

                {/* ✅ faltaba en tu componente original */}
                <linearGradient id="fillPercentage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-percentage)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--color-percentage)" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

              <XAxis
                dataKey="jornada"
                fontSize={12}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={18}
                axisLine={false}
                tickLine={false}
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
                      if (!p) return String(label)
                      return `${label} · vs ${p.rival} · ${p.fullDate} · %: ${p.percentage}% · Par: ${p.saves}`
                    }}
                  />
                }
              />

              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="saves"
                name="Paradas Totales"
                stroke="var(--color-saves)"
                fill="url(#fillSaves)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="savesInf"
                name="Paradas en Inferioridad"
                stroke="var(--color-savesInf)"
                fill="url(#fillSavesInf)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              <Area
                yAxisId="right"
                type="monotone"
                dataKey="percentage"
                name="% Efectividad"
                stroke="var(--color-percentage)"
                fill="url(#fillPercentage)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[980px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">Paradas</TableHead>
                    <TableHead className="text-right">Par. Inf.</TableHead>
                    <TableHead className="text-right">Pen. Par.</TableHead>
                    <TableHead className="text-right">GC</TableHead>
                    <TableHead className="text-right">Tiros</TableHead>
                    <TableHead className="text-right">% Efec.</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {data.map((m, idx) => (
                    <TableRow
                      key={m.matchId}
                      className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                    >
                      <TableCell className="font-semibold">{m.jornada}</TableCell>

                      <TableCell className="max-w-[360px]">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.rival}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">{m.saves}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.savesInf}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.pensSaved}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.golesRecibidos}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.tirosRecibidos}</TableCell>

                      <TableCell className="text-right tabular-nums">
                        <span className="font-semibold text-white">{m.percentage.toFixed(1)}%</span>
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
                  Total Paradas: <span className="font-semibold text-foreground">{totalSaves}</span>
                </span>
                <span className="rounded-md border bg-card px-2 py-1">
                  Total GC: <span className="font-semibold text-foreground">{totalGoalsAgainst}</span>
                </span>
                <span className="rounded-md border bg-card px-2 py-1">
                  Total Tiros: <span className="font-semibold text-foreground">{totalShotsAgainst}</span>
                </span>
                <span className="rounded-md border bg-card px-2 py-1">
                  Media %: <span className="font-semibold text-white">{avgPct}%</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}
