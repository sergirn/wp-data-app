"use client"

import { useMemo } from "react"
import { Target } from "lucide-react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"

import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"
import { ExpandableChartCard } from "../../analytics-player/ExpandableChartCard"

export function GK_PenaltiesChart({ matches, stats }: { matches: any[]; stats: any[] }) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    const statsArr = Array.isArray(stats) ? stats : []

    return sorted.slice(-15).map((match, idx) => {
      const mid = String(match.id)
      const ms = statsArr.filter((s) => String(s.match_id) === mid)

      const saved = sumField(ms, "portero_paradas_penalti_parado")
      const conceded = sumField(ms, "portero_goles_penalti")
      const total = saved + conceded
      const saveRate = total > 0 ? (saved / total) * 100 : 0

      return { ...formatMatchRow(match, idx), saved, conceded, total, saveRate: Number(saveRate.toFixed(1)) }
    })
  }, [matches, stats])

  return (
    <ExpandableChartCard
      title="Penaltis"
      description="Parados vs recibidos · últimos 15"
      icon={<Target className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            saved: { label: "Parados", color: "hsl(142 70% 45%)" },
            conceded: { label: "Recibidos", color: "hsl(0 80% 55%)" },
          }}
          className={`w-full ${compact ? "h-[200px]" : "h-[420px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gkFillPenSaved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-saved)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-saved)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="gkFillPenConc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-conceded)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-conceded)" stopOpacity={0.08} />
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
                      return p ? `${label} · vs ${p.rival} · ${p.fullDate} · %Parados: ${p.saveRate}%` : label
                    }}
                  />
                }
              />
              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

              <Area type="monotone" dataKey="saved" name="Parados" stroke="var(--color-saved)" fill="url(#gkFillPenSaved)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="conceded" name="Recibidos" stroke="var(--color-conceded)" fill="url(#gkFillPenConc)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[900px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">Parados</TableHead>
                    <TableHead className="text-right">Recibidos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">% Parados</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {data.map((m, idx) => (
                    <TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/40`}>
                      <TableCell className="font-semibold">{m.jornada}</TableCell>
                      <TableCell className="truncate max-w-[340px]">{m.rival}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.saved}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.conceded}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.total}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{m.saveRate.toFixed(1)}%</TableCell>
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
