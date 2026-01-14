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

export function GoalsAndShotsChart({ matches, stats }: Props) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    return sorted.slice(-15).map((match, idx) => {
      const statsArr = Array.isArray(stats) ? stats : []
      const matchStats = statsArr.filter((s) => s.match_id === match.id)

      const goles = {
        boya_jugada: sumField(matchStats, "goles_boya_jugada"),
        hombre_mas: sumField(matchStats, "goles_hombre_mas"),
        lanzamiento: sumField(matchStats, "goles_lanzamiento"),
        dir_mas_5m: sumField(matchStats, "goles_dir_mas_5m"),
        contraataque: sumField(matchStats, "goles_contraataque"),
        penalti: sumField(matchStats, "goles_penalti_anotado"),
      }

      const tirosFallados = {
        hombre_mas: sumField(matchStats, "tiros_hombre_mas"),
        penalti_fallado: sumField(matchStats, "tiros_penalti_fallado"),
        corner: sumField(matchStats, "tiros_corner"),
        fuera: sumField(matchStats, "tiros_fuera"),
        parados: sumField(matchStats, "tiros_parados"),
        bloqueados: sumField(matchStats, "tiros_bloqueado"),
      }

      const totalGoles = Object.values(goles).reduce((a, b) => a + b, 0)
      const totalFallos = Object.values(tirosFallados).reduce((a, b) => a + b, 0)
      const intentos = totalGoles + totalFallos
      const eficiencia = intentos > 0 ? (totalGoles / intentos) * 100 : 0

      const base = formatMatchRow(match, idx)

      return {
        ...base,
        totalGoles,
        totalFallos,
        intentos,
        eficiencia: Number(eficiencia.toFixed(1)),
        ...goles,
        ...tirosFallados,
      }
    })
  }, [matches, stats])

  const avgEficiencia = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.eficiencia, 0) / data.length).toFixed(1)
  }, [data])

  return (
    <ExpandableChartCard
      title="Goles + Tiros"
      description={`Últimos 15 · Eficiencia media: ${avgEficiencia}%`}
      icon={<Target className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      rightHeader={<span className="text-xs text-muted-foreground">{data.length} partidos</span>}
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            totalGoles: { label: "Goles", color: "hsl(142 70% 45%)" },
            totalFallos: { label: "Tiros fallados", color: "hsl(0 80% 55%)" },
          }}
          className={`w-full ${compact ? "h-[160px]" : "h-[360px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillGoles" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-totalGoles)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-totalGoles)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillFallos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-totalFallos)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-totalFallos)" stopOpacity={0.08} />
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

              <Area
                type="monotone"
                dataKey="totalGoles"
                name="Goles"
                stroke="var(--color-totalGoles)"
                fill="url(#fillGoles)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="totalFallos"
                name="Tiros fallados"
                stroke="var(--color-totalFallos)"
                fill="url(#fillFallos)"
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
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">Goles</TableHead>
                    <TableHead className="text-right">Fallos</TableHead>
                    <TableHead className="text-right">Intentos</TableHead>
                    <TableHead className="text-right">Eficiencia</TableHead>
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
                      <TableCell className="text-right tabular-nums">{m.totalGoles}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.totalFallos}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.intentos}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{m.eficiencia.toFixed(1)}%</TableCell>
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
              <span className="rounded-md border bg-card px-2 py-1">
                Eficiencia media: <span className="font-semibold">{avgEficiencia}%</span>
              </span>
            </div>
          </div>
        </div>
      )}
    />
  )
}
