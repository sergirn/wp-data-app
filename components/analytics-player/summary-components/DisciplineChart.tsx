"use client"

import { useMemo } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { AlertTriangle } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"
import { ExpandableChartCard } from "../ExpandableChartCard"
import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"

interface Props {
  matches: any[]
  stats: any[]
}

export function DisciplineChart({ matches, stats }: Props) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    return sorted.slice(-15).map((match, idx) => {
      const statsArr = Array.isArray(stats) ? stats : []
      const ms = statsArr.filter((s) => s.match_id === match.id)

      const exp20_1c1 = sumField(ms, "faltas_exp_20_1c1")
      const exp20_boya = sumField(ms, "faltas_exp_20_boya")
      const exp3_bruta = sumField(ms, "faltas_exp_3_bruta")
      const exp3_int = sumField(ms, "faltas_exp_3_int")
      const penalti = sumField(ms, "faltas_penalti")
      const contrafaltas = sumField(ms, "faltas_contrafaltas")

      const totalExclusiones = exp20_1c1 + exp20_boya + exp3_bruta + exp3_int

      return {
        ...formatMatchRow(match, idx),
        exp20_1c1,
        exp20_boya,
        exp3_bruta,
        exp3_int,
        penalti,
        contrafaltas,
        totalExclusiones,
      }
    })
  }, [matches, stats])

  const avgExcl = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.totalExclusiones, 0) / data.length).toFixed(1)
  }, [data])

  return (
    <ExpandableChartCard
      title="Faltas y Expulsiones"
      description={`Últimos 15 · Exclusiones medias: ${avgExcl}`}
      icon={<AlertTriangle className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-orange-500/5 to-red-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            totalExclusiones: { label: "Total exclusiones", color: "hsl(35 90% 55%)" },
            penalti: { label: "Penaltis", color: "hsl(0 80% 55%)" },
            contrafaltas: { label: "Contrafaltas", color: "hsl(48 90% 50%)" },
          }}
          className={`w-full ${compact ? "h-[160px]" : "h-[360px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
              <XAxis dataKey="jornada" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                      const p = payload?.[0]?.payload
                      if (!p) return label
                      return `${label} · vs ${p.rival} · ${p.fullDate}`
                    }}
                  />
                }
              />
              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

              <Bar dataKey="totalExclusiones" name="Total exclusiones" fill="var(--color-totalExclusiones)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="penalti" name="Penaltis" fill="var(--color-penalti)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="contrafaltas" name="Contrafaltas" fill="var(--color-contrafaltas)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[1040px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">Exp 20" 1c1</TableHead>
                    <TableHead className="text-right">Exp 20" Boya</TableHead>
                    <TableHead className="text-right">Exp 3 Bruta</TableHead>
                    <TableHead className="text-right">Exp 3 Int</TableHead>
                    <TableHead className="text-right">Penalti</TableHead>
                    <TableHead className="text-right">Contrafaltas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
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
                      <TableCell className="text-right tabular-nums">{m.exp20_1c1}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.exp20_boya}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.exp3_bruta}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.exp3_int}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.penalti}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.contrafaltas}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{m.totalExclusiones}</TableCell>
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
