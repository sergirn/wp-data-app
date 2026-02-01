"use client"

import { useMemo } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ThumbsDown } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"
import { ExpandableChartCard } from "../ExpandableChartCard"
import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"

interface Props {
  matches: any[]
  stats: any[]
}

export function NegativeActionsChart({ matches, stats }: Props) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    return sorted.slice(-15).map((match, idx) => {
      const statsArr = Array.isArray(stats) ? stats : []
      const ms = statsArr.filter((s) => s.match_id === match.id)

      const golRecibido = sumField(ms, "acciones_recibir_gol")
      const perdidaPos = sumField(ms, "acciones_perdida_poco")
      const rebotesPerd = sumField(ms, "rebote_perd_hombre_mas") // lo usabas en negativas
      const exp20_1c1 = sumField(ms, "faltas_exp_20_1c1")
      const exp20_boya = sumField(ms, "faltas_exp_20_boya")
      const exp3_bruta = sumField(ms, "faltas_exp_3_bruta")
      const exp3_int = sumField(ms, "faltas_exp_3_int")
      const totalExclusiones = exp20_1c1 + exp20_boya + exp3_bruta + exp3_int

      const total = golRecibido + perdidaPos + rebotesPerd + totalExclusiones

      return {
        ...formatMatchRow(match, idx),
        golRecibido,
        perdidaPos,
        rebotesPerd,
        totalExclusiones,
        total,
      }
    })
  }, [matches, stats])

  return (
    <ExpandableChartCard
      title="Acciones Negativas"
      description="Últimos 15 · Resumen de errores y exclusiones"
      icon={<ThumbsDown className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-orange-500/5 to-red-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            perdidaPos: { label: "Pérdida posición", color: "hsl(28 90% 55%)" },
            totalExclusiones: { label: "Exclusiones", color: "hsl(0 80% 55%)" },
            golRecibido: { label: "Goles recibidos", color: "hsl(10 85% 55%)" },
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

              <Bar dataKey="golRecibido" name="Goles recibidos" fill="var(--color-golRecibido)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="perdidaPos" name="Pérdida posición" fill="var(--color-perdidaPos)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="totalExclusiones" name="Exclusiones" fill="var(--color-totalExclusiones)" radius={[6, 6, 0, 0]} />
            </BarChart>
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
                    <TableHead className="text-right">Gol Rec.</TableHead>
                    <TableHead className="text-right">Pérdida Pos.</TableHead>
                    <TableHead className="text-right">Rebotes Perd.</TableHead>
                    <TableHead className="text-right">Exclusiones</TableHead>
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
                      <TableCell className="text-right tabular-nums">{m.golRecibido}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.perdidaPos}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.rebotesPerd}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.totalExclusiones}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
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
