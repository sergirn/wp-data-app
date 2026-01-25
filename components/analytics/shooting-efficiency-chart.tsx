"use client"

import { useMemo } from "react"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Target } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"

interface ShootingEfficiencyChartProps {
  matches: any[]
  stats: any[]
}

export function ShootingEfficiencyChart({ matches, stats }: ShootingEfficiencyChartProps) {
  const data = useMemo(() => {
    const sorted = [...(matches ?? [])].sort((a, b) => {
      const aj = a?.jornada ?? 9999
      const bj = b?.jornada ?? 9999
      if (aj !== bj) return aj - bj
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    })

    return sorted.slice(-15).map((match, idx) => {
      const matchStats = (stats ?? []).filter((s) => String(s.match_id) === String(match.id))

      // ===== GENERAL =====
      const totalGoals = matchStats.reduce((sum, s) => sum + (s.goles_totales || 0), 0)
      const totalShots = matchStats.reduce((sum, s) => sum + (s.tiros_totales || 0), 0)
      const general = totalShots > 0 ? (totalGoals / totalShots) * 100 : 0

      // ===== SUPERIORIDAD =====
      const goalsSup = matchStats.reduce((sum, s) => sum + (s.goles_hombre_mas || 0), 0)
      const missesSup = matchStats.reduce((sum, s) => sum + (s.tiros_hombre_mas || 0), 0)
      const intentosSup = goalsSup + missesSup
      const superiority = intentosSup > 0 ? (goalsSup / intentosSup) * 100 : 0

      const jornadaNumber = match.jornada ?? idx + 1

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        rival: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        general: Number(general.toFixed(1)),
        superiority: Number(superiority.toFixed(1)),

        goles: totalGoals,
        tiros: totalShots,
      }
    })
  }, [matches, stats])

  const avgGeneral = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.general, 0) / data.length).toFixed(1)
  }, [data])

  const avgSup = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.superiority, 0) / data.length).toFixed(1)
  }, [data])

  if (!data.length) return null

  return (
    <ExpandableChartCard
      title="Eficiencia de tiros"
      description={`Últimos ${data.length} · Media: ${avgGeneral}% (General) · ${avgSup}% (Sup.)`}
      icon={<Target className="w-5 h-5" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      rightHeader={<span className="text-xs text-muted-foreground">{avgGeneral}%</span>}
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            general: { label: "Eficiencia General (%)", color: "hsla(0, 91%, 60%, 1.00)" },
            superiority: { label: "Eficiencia Superioridad (%)", color: "hsla(59, 85%, 45%, 1.00)" },
          }}
          className={`w-full ${compact ? "h-[190px]" : "h-[420px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillGeneral" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-general)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-general)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillSup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-superiority)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-superiority)" stopOpacity={0.08} />
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
                fontSize={12}
                width={34}
                tickMargin={6}
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                      const p = payload?.[0]?.payload
                      if (!p) return String(label)
                      return `${label} · vs ${p.rival} · ${p.fullDate}`
                    }}
                  />
                }
              />

              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

              <Area
                type="monotone"
                dataKey="general"
                name="Eficiencia General"
                stroke="var(--color-general)"
                fill="url(#fillGeneral)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              <Area
                type="monotone"
                dataKey="superiority"
                name="Eficiencia Superioridad"
                stroke="var(--color-superiority)"
                fill="url(#fillSup)"
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
              <Table className="min-w-[860px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">General</TableHead>
                    <TableHead className="text-right">Sup.</TableHead>
                    <TableHead className="text-right">Goles</TableHead>
                    <TableHead className="text-right">Tiros</TableHead>
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

                      <TableCell className="text-right tabular-nums">
                        <span className="font-semibold text-white">{m.general.toFixed(1)}%</span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        <span className="font-semibold text-white">{m.superiority.toFixed(1)}%</span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">{m.goles}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.tiros}</TableCell>

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
                  Media General: <span className="font-semibold text-white">{avgGeneral}%</span>
                </span>
                <span className="rounded-md border bg-card px-2 py-1">
                  Media Sup.: <span className="font-semibold text-white">{avgSup}%</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}