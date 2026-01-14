"use client"

import { useMemo } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { TrendingUp } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"
import { ExpandableChartCard } from "../ExpandableChartCard"
import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"

interface Props {
  matches: any[]
  stats: any[]
}

export function ManAdvantageChart({ matches, stats }: Props) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    return sorted.slice(-15).map((match, idx) => {
      const statsArr = Array.isArray(stats) ? stats : []
      const ms = statsArr.filter((s) => s.match_id === match.id)

      const goles = sumField(ms, "goles_hombre_mas")
      const fallos = sumField(ms, "tiros_hombre_mas") // fallos en superioridad
      const intentos = goles + fallos
      const eficiencia = intentos > 0 ? (goles / intentos) * 100 : 0

      const rebRec = sumField(ms, "rebote_recup_hombre_mas")
      const rebPer = sumField(ms, "rebote_perd_hombre_mas")

      return {
        ...formatMatchRow(match, idx),
        goles,
        fallos,
        intentos,
        eficiencia: Number(eficiencia.toFixed(1)),
        rebRec,
        rebPer,
      }
    })
  }, [matches, stats])

  const avgEff = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.eficiencia, 0) / data.length).toFixed(1)
  }, [data])

  return (
    <ExpandableChartCard
      title="Superioridad Numérica"
      description={`Últimos 15 · Eficiencia media: ${avgEff}%`}
      icon={<TrendingUp className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            goles: { label: "Goles", color: "hsl(142 70% 45%)" },
            fallos: { label: "Tiros fallados", color: "hsl(0 80% 55%)" },
          }}
          className={`w-full ${compact ? "h-[160px]" : "h-[360px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillSupGoals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-goles)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-goles)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillSupMiss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-fallos)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-fallos)" stopOpacity={0.08} />
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

              <Area type="monotone" dataKey="goles" name="Goles" stroke="var(--color-goles)" fill="url(#fillSupGoals)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="fallos" name="Tiros fallados" stroke="var(--color-fallos)" fill="url(#fillSupMiss)" strokeWidth={2} dot={false} />
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
                    <TableHead className="text-right">Fallos</TableHead>
                    <TableHead className="text-right">Intentos</TableHead>
                    <TableHead className="text-right">Efic.</TableHead>
                    <TableHead className="text-right">Reb Rec.</TableHead>
                    <TableHead className="text-right">Reb Perd.</TableHead>
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
                      <TableCell className="text-right tabular-nums">{m.fallos}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.intentos}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{m.eficiencia.toFixed(1)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{m.rebRec}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.rebPer}</TableCell>
                      <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="border-t bg-muted/20 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border bg-card px-2 py-1">
                Eficiencia media: <span className="font-semibold">{avgEff}%</span>
              </span>
            </div>
          </div>
        </div>
      )}
    />
  )
}
