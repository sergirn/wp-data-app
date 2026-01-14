"use client"

import { useMemo } from "react"
import { Activity } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"

import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"
import { ExpandableChartCard } from "../../analytics-player/ExpandableChartCard"

export function GK_ParticipationChart({ matches, stats }: { matches: any[]; stats: any[] }) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    const statsArr = Array.isArray(stats) ? stats : []

    return sorted.slice(-15).map((match, idx) => {
      const mid = String(match.id)
      const ms = statsArr.filter((s) => String(s.match_id) === mid)

      return {
        ...formatMatchRow(match, idx),
        asist: sumField(ms, "acciones_asistencias"),
        recup: sumField(ms, "acciones_recuperacion"),
        perd: sumField(ms, "portero_acciones_perdida_pos"),
        expProv: sumField(ms, "acciones_exp_provocada"),
      }
    })
  }, [matches, stats])

  return (
    <ExpandableChartCard
      title="Acciones / Participación"
      description="Últimos 15 · impacto"
      icon={<Activity className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-orange-500/5 to-red-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            asist: { label: "Asistencias", color: "hsl(210 85% 55%)" },
            recup: { label: "Recuperaciones", color: "hsl(190 85% 50%)" },
            perd: { label: "Pérdidas", color: "hsl(28 90% 55%)" },
            expProv: { label: "Exp Provocadas", color: "hsl(260 80% 60%)" },
          }}
          className={`w-full ${compact ? "h-[200px]" : "h-[420px]"}`}
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
                      return p ? `${label} · vs ${p.rival} · ${p.fullDate}` : label
                    }}
                  />
                }
              />
              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

              <Bar dataKey="asist" name="Asistencias" fill="var(--color-asist)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="recup" name="Recuperaciones" fill="var(--color-recup)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="perd" name="Pérdidas" fill="var(--color-perd)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expProv" name="Exp Provocadas" fill="var(--color-expProv)" radius={[6, 6, 0, 0]} />
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
                    <TableHead className="text-right">Asist.</TableHead>
                    <TableHead className="text-right">Recup.</TableHead>
                    <TableHead className="text-right">Pérdidas</TableHead>
                    <TableHead className="text-right">Exp Prov.</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {data.map((m, idx) => (
                    <TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/40`}>
                      <TableCell className="font-semibold">{m.jornada}</TableCell>
                      <TableCell className="truncate max-w-[340px]">{m.rival}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.asist}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.recup}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.perd}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.expProv}</TableCell>
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
