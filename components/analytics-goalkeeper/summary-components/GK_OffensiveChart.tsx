"use client"

import { useMemo } from "react"
import { TrendingUp } from "lucide-react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"

import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"
import { ExpandableChartCard } from "../../analytics-player/ExpandableChartCard"

export function GK_OffensiveChart({ matches, stats }: { matches: any[]; stats: any[] }) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    const statsArr = Array.isArray(stats) ? stats : []

    return sorted.slice(-15).map((match, idx) => {
      const mid = String(match.id)
      const ms = statsArr.filter((s) => String(s.match_id) === mid)

      const gol = sumField(ms, "portero_gol")
      const golSup = sumField(ms, "portero_gol_superioridad")
      const falloSup = sumField(ms, "portero_fallo_superioridad")
      const intentosSup = golSup + falloSup
      const effSup = intentosSup > 0 ? (golSup / intentosSup) * 100 : 0

      return {
        ...formatMatchRow(match, idx),
        gol,
        golSup,
        falloSup,
        effSup: Number(effSup.toFixed(1)),
      }
    })
  }, [matches, stats])

  return (
    <ExpandableChartCard
      title="Participación Ofensiva"
      description="Goles y superioridad · últimos 15"
      icon={<TrendingUp className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-orange-500/5 to-red-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            gol: { label: "Goles", color: "hsl(142 70% 45%)" },
            golSup: { label: "Goles Superioridad", color: "hsl(160 70% 45%)" },
            falloSup: { label: "Fallos Superioridad", color: "hsl(28 90% 55%)" },
          }}
          className={`w-full ${compact ? "h-[200px]" : "h-[420px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gkFillGol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-gol)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-gol)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="gkFillGolSup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-golSup)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-golSup)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="gkFillFalloSup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-falloSup)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-falloSup)" stopOpacity={0.08} />
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
                      return p ? `${label} · vs ${p.rival} · ${p.fullDate} · EffSup: ${p.effSup}%` : label
                    }}
                  />
                }
              />

              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

              <Area type="monotone" dataKey="gol" name="Goles" stroke="var(--color-gol)" fill="url(#gkFillGol)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="golSup" name="Goles Superioridad" stroke="var(--color-golSup)" fill="url(#gkFillGolSup)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="falloSup" name="Fallos Superioridad" stroke="var(--color-falloSup)" fill="url(#gkFillFalloSup)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[980px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">Goles</TableHead>
                    <TableHead className="text-right">Gol Sup.</TableHead>
                    <TableHead className="text-right">Fallo Sup.</TableHead>
                    <TableHead className="text-right">Eff Sup.</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {data.map((m, idx) => (
                    <TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/40`}>
                      <TableCell className="font-semibold">{m.jornada}</TableCell>
                      <TableCell className="truncate max-w-[340px]">{m.rival}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.gol}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.golSup}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.falloSup}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{m.effSup.toFixed(1)}%</TableCell>
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
