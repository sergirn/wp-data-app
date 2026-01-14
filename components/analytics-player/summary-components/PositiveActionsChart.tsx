"use client"

import { useMemo } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ThumbsUp } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"
import { ExpandableChartCard } from "../ExpandableChartCard"
import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"

interface Props {
  matches: any[]
  stats: any[]
}

export function PositiveActionsChart({ matches, stats }: Props) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    return sorted.slice(-15).map((match, idx) => {
      const statsArr = Array.isArray(stats) ? stats : []
      const ms = statsArr.filter((s) => s.match_id === match.id)

      const bloqueos = sumField(ms, "acciones_bloqueo")
      const asistencias = sumField(ms, "acciones_asistencias")
      const recuperaciones = sumField(ms, "acciones_recuperacion")
      const rebotes = sumField(ms, "acciones_rebote")
      const expProv = sumField(ms, "acciones_exp_provocada")
      const penProv = sumField(ms, "acciones_penalti_provocado")

      const total = bloqueos + asistencias + recuperaciones + rebotes + expProv + penProv

      return {
        ...formatMatchRow(match, idx),
        bloqueos,
        asistencias,
        recuperaciones,
        rebotes,
        expProv,
        penProv,
        total,
      }
    })
  }, [matches, stats])

  const avgTotal = useMemo(() => {
    if (!data.length) return "0.0"
    return (data.reduce((s, d) => s + d.total, 0) / data.length).toFixed(1)
  }, [data])

  return (
    <ExpandableChartCard
      title="Acciones Positivas"
      description={`Últimos 15 · Media total: ${avgTotal}`}
      icon={<ThumbsUp className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            total: { label: "Total", color: "hsl(210 85% 55%)" },
            asistencias: { label: "Asistencias", color: "hsl(260 80% 60%)" },
          }}
          className={`w-full ${compact ? "h-[160px]" : "h-[360px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillPosTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillPosAst" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-asistencias)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-asistencias)" stopOpacity={0.08} />
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
                      return `${label} · vs ${p.rival} · ${p.fullDate}`
                    }}
                  />
                }
              />
              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

              <Area type="monotone" dataKey="total" name="Total" stroke="var(--color-total)" fill="url(#fillPosTotal)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="asistencias" name="Asistencias" stroke="var(--color-asistencias)" fill="url(#fillPosAst)" strokeWidth={2} dot={false} />
            </AreaChart>
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
                    <TableHead className="text-right">Bloqueos</TableHead>
                    <TableHead className="text-right">Asist.</TableHead>
                    <TableHead className="text-right">Recup.</TableHead>
                    <TableHead className="text-right">Rebotes</TableHead>
                    <TableHead className="text-right">Exp Prov.</TableHead>
                    <TableHead className="text-right">Pen Prov.</TableHead>
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
                      <TableCell className="text-right tabular-nums">{m.bloqueos}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.asistencias}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.recuperaciones}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.rebotes}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.expProv}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.penProv}</TableCell>
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
