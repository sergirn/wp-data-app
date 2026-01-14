"use client"

import { useMemo } from "react"
import { Shield } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"

import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils"
import { ExpandableChartCard } from "../../analytics-player/ExpandableChartCard"

export function GK_SavesBreakdownChart({ matches, stats }: { matches: any[]; stats: any[] }) {
  const data = useMemo(() => {
    const sorted = sortMatches(matches)
    const statsArr = Array.isArray(stats) ? stats : []

    return sorted.slice(-15).map((match, idx) => {
      const mid = String(match.id)
      const ms = statsArr.filter((s) => String(s.match_id) === mid)

      return {
        ...formatMatchRow(match, idx),
        paradaRecup: sumField(ms, "portero_tiros_parada_recup"),
        fuera: sumField(ms, "portero_paradas_fuera"),
        penaltiParado: sumField(ms, "portero_paradas_penalti_parado"),
        hombreMenos: sumField(ms, "portero_paradas_hombre_menos"),
      }
    })
  }, [matches, stats])

  return (
    <ExpandableChartCard
      title="Paradas y Defensas"
      description="Últimos 15 · desglose"
      icon={<Shield className="w-5 h-5 text-white-600" />}
      className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
      renderChart={({ compact }) => (
        <ChartContainer
          config={{
            paradaRecup: { label: "Parada+Recup", color: "hsl(210 85% 55%)" },
            fuera: { label: "Fuera", color: "hsl(190 85% 50%)" },
            penaltiParado: { label: "Penalti parado", color: "hsl(142 70% 45%)" },
            hombreMenos: { label: "Hombre -", color: "hsl(260 80% 60%)" },
          }}
          className={`w-full ${compact ? "h-[200px]" : "h-[420px]"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
              <XAxis dataKey="jornada" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="paradaRecup" name="Parada+Recup" fill="var(--color-paradaRecup)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="fuera" name="Fuera" fill="var(--color-fuera)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="penaltiParado" name="Penalti parado" fill="var(--color-penaltiParado)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="hombreMenos" name="Hombre -" fill="var(--color-hombreMenos)" radius={[6, 6, 0, 0]} />
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
                  <TableRow>
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">Parada+Recup</TableHead>
                    <TableHead className="text-right">Fuera</TableHead>
                    <TableHead className="text-right">Pen. Parado</TableHead>
                    <TableHead className="text-right">Hombre -</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>
                <TableBody>
                  {data.map((m) => (
                    <TableRow key={m.matchId}>
                      <TableCell className="font-semibold">{m.jornada}</TableCell>
                      <TableCell className="truncate max-w-[360px]">{m.rival}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.paradaRecup}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.fuera}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.penaltiParado}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.hombreMenos}</TableCell>
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
