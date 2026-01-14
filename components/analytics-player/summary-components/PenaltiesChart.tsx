"use client"

import { useMemo } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Target } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"
import { ExpandableChartCard } from "../ExpandableChartCard"
import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"

interface Props {
  matches: any[]
  stats: any[]
}

export function PenaltiesChart({ matches, stats }: Props) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    return sorted.slice(-15).map((match, idx) => {
      const statsArr = Array.isArray(stats) ? stats : []
      const ms = statsArr.filter((s) => s.match_id === match.id)

      const goles = sumField(ms, "goles_penalti_anotado")
      const fallados = sumField(ms, "tiros_penalti_fallado")
      const total = goles + fallados
      const eficiencia = total > 0 ? (goles / total) * 100 : 0

      return {
        ...formatMatchRow(match, idx),
        goles,
        fallados,
        total,
        eficiencia: Number(eficiencia.toFixed(1)),
      }
    })
  }, [matches, stats])

  const avgEff = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.eficiencia, 0) / data.length).toFixed(1)
  }, [data])

  return (
    <ExpandableChartCard
      title="Penaltis"
      description={`Últimos 15 · Eficiencia media: ${avgEff}%`}
      icon={<Target className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-orange-500/5 to-red-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            goles: { label: "Goles", color: "hsl(142 70% 45%)" },
            fallados: { label: "Fallados", color: "hsl(0 80% 55%)" },
          }}
          className={`w-full ${compact ? "h-[160px]" : "h-[360px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillPenGoals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-goles)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-goles)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillPenMiss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-fallados)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-fallados)" stopOpacity={0.08} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
              <XAxis dataKey="jornada" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                      const p = payload?.[0]?.payload
                      if (!p) return label
                      return `${label} · vs ${p.rival} · ${p.fullDate} · Eff: ${p.eficiencia}%`
                    }}
                  />
                }
              />
              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

              <Area type="monotone" dataKey="goles" name="Goles" stroke="var(--color-goles)" fill="url(#fillPenGoals)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="fallados" name="Fallados" stroke="var(--color-fallados)" fill="url(#fillPenMiss)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[860px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">Goles</TableHead>
                    <TableHead className="text-right">Fallados</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Eficiencia</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>
                <TableBody>
                  {data.map((m, idx) => (
                    <TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/40`}>
                      <TableCell className="font-semibold">{m.jornada}</TableCell>
                      <TableCell className="max-w-[360px]">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.rival}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.goles}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.fallados}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.total}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{m.eficiencia.toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    />
  )
}
