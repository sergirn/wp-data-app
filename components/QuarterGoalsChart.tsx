"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { BarChart3, Table2, Eye } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { MatchWithQuarterScores } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"


type QuarterKey = "q1" | "q2" | "q3" | "q4"

const QUARTERS = [
  { key: "q1", label: "Q1", for: "q1_score", against: "q1_score_rival" },
  { key: "q2", label: "Q2", for: "q2_score", against: "q2_score_rival" },
  { key: "q3", label: "Q3", for: "q3_score", against: "q3_score_rival" },
  { key: "q4", label: "Q4", for: "q4_score", against: "q4_score_rival" },
] as const

interface Props {
  matches: MatchWithQuarterScores[]
  chartHeightClassName?: string
}

export function QuarterGoalsChart({
  matches,
  chartHeightClassName = "h-[260px] sm:h-[320px] lg:h-[330px]",
}: Props) {
  const [view, setView] = useState<"chart" | "table">("chart")
  const [openQuarter, setOpenQuarter] = useState<QuarterKey | null>(null)

  const games = Math.max(matches?.length ?? 0, 1)

  const data = useMemo(() => {
    return QUARTERS.map((q) => {
      const goalsFor = matches.reduce((sum, m) => sum + (Number((m as any)[q.for]) || 0), 0) / games
      const goalsAgainst = matches.reduce((sum, m) => sum + (Number((m as any)[q.against]) || 0), 0) / games

      const differential = Number((goalsFor - goalsAgainst).toFixed(2))

      return {
        key: q.key as QuarterKey,
        quarter: q.label,
        goalsFor: Number(goalsFor.toFixed(2)),
        goalsAgainst: Number(goalsAgainst.toFixed(2)),
        differential,
        pos: differential > 0 ? differential : 0,
        neg: differential < 0 ? differential : 0, // (negativo)
      }
    })
  }, [matches, games])

  const maxAbs = useMemo(() => {
    const v = Math.max(...data.map((d) => Math.abs(d.differential)), 0.1)
    const pad = Math.max(0.25, v * 0.15)
    return Number((v + pad).toFixed(2))
  }, [data])

  const bestQuarter = useMemo(() => [...data].sort((a, b) => b.differential - a.differential)[0], [data])
  const worstQuarter = useMemo(() => [...data].sort((a, b) => a.differential - b.differential)[0], [data])

  const quarterMatches = useMemo(() => {
    if (!openQuarter) return []
    const q = QUARTERS.find((x) => x.key === openQuarter)!
    return matches.map((m) => {
      const gf = Number((m as any)[q.for]) || 0
      const ga = Number((m as any)[q.against]) || 0
      return {
        id: (m as any).id,
        opponent: (m as any).opponent,
        goalsFor: gf,
        goalsAgainst: ga,
        differential: gf - ga,
      }
    })
  }, [openQuarter, matches])

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Rendimiento por Cuartos</CardTitle>
            <CardDescription className="truncate">
              Diferencial medio por cuarto (media de todos los partidos)
            </CardDescription>
          </div>

          {/* Switch Chart/Table */}
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <BarChart3 className={`h-4 w-4 ${view === "chart" ? "text-foreground" : "text-muted-foreground"}`} />
            <Switch
              checked={view === "table"}
              onCheckedChange={(v) => setView(v ? "table" : "chart")}
              aria-label="Cambiar vista de gráfico a tabla"
            />
            <Table2 className={`h-4 w-4 ${view === "table" ? "text-foreground" : "text-muted-foreground"}`} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 w-full overflow-hidden">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Mejor cuarto</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {bestQuarter?.quarter} ({bestQuarter?.differential > 0 ? "+" : ""}
              {bestQuarter?.differential})
            </p>
          </div>

          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Peor cuarto</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {worstQuarter?.quarter} ({worstQuarter?.differential > 0 ? "+" : ""}
              {worstQuarter?.differential})
            </p>
          </div>
        </div>

        {/* VISTA */}
        {view === "chart" ? (
          <ChartContainer
            config={{
              pos: { label: "DIF +", color: "hsl(142, 71%, 45%)" },
              neg: { label: "DIF −", color: "hsl(0, 84%, 60%)" },
            }}
            className={`w-full ${chartHeightClassName}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                // ✅ márgenes simétricos → centro real
                margin={{ top: 8, right: 18, left: 18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

                <XAxis
                  type="number"
                  domain={[-maxAbs, maxAbs]} // ✅ simétrico
                  allowDataOverflow
                  fontSize={12}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => Math.abs(Number(v)).toFixed(1)}
                />

                <YAxis
                  type="category"
                  dataKey="quarter"
                  fontSize={12}
                  width={42}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                />

                {/* ✅ línea exactamente en el medio */}
                <ReferenceLine
                  x={0}
                  stroke="hsl(var(--border))"
                  strokeWidth={3}
                  ifOverflow="extendDomain"
                />

                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label, payload) => {
                        const p = payload?.[0]?.payload
                        if (!p) return String(label)
                        const dif = p.differential
                        return `${label} · DIF: ${dif > 0 ? "+" : ""}${dif} · GF: ${p.goalsFor} · GC: ${p.goalsAgainst}`
                      }}
                    />
                  }
                />

                <Bar
                  dataKey="neg"
                  name="DIF −"
                  fill="var(--color-neg)"
                  stackId="dif"
                  radius={[8, 0, 0, 8]}
                  barSize={26}
                />
                <Bar
                  dataKey="pos"
                  name="DIF +"
                  fill="var(--color-pos)"
                  stackId="dif"
                  radius={[0, 8, 8, 0]}
                  barSize={26}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="rounded-xl border overflow-hidden bg-card w-full">
            <div className="w-full overflow-x-auto">
              <div className="max-h-[360px] overflow-y-auto">
                <Table className="min-w-[720px]">
                  <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[90px]">Cuarto</TableHead>
                      <TableHead className="text-right">GF</TableHead>
                      <TableHead className="text-right">GC</TableHead>
                      <TableHead className="text-right">DIF</TableHead>
                      <TableHead className="w-10 text-right"></TableHead>
                    </TableRow>
                  </UITableHeader>

                  <TableBody>
                    {data.map((q, idx) => (
                      <TableRow
                        key={q.key}
                        onClick={() => setOpenQuarter(q.key)}
                        className={`cursor-pointer transition-colors ${
                          idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"
                        } hover:bg-muted/40`}
                      >
                        <TableCell className="font-semibold">{q.quarter}</TableCell>
                        <TableCell className="text-right tabular-nums">{q.goalsFor}</TableCell>
                        <TableCell className="text-right tabular-nums">{q.goalsAgainst}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-semibold ${
                            q.differential > 0
                              ? "text-green-600 dark:text-green-400"
                              : q.differential < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {q.differential > 0 ? "+" : ""}
                          {q.differential}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          <Eye className="h-4 w-4 inline-block" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="border-t bg-muted/20 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{matches?.length ?? 0}</span> partidos
                </span>
                <span className="rounded-md border bg-card px-2 py-1">
                  Mejor: <span className="font-semibold text-foreground">{bestQuarter?.quarter}</span>{" "}
                  <span className="font-semibold text-white">
                    ({bestQuarter?.differential > 0 ? "+" : ""}
                    {bestQuarter?.differential})
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* POPUP detalle por partido */}
        <Dialog open={!!openQuarter} onOpenChange={() => setOpenQuarter(null)}>
          <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Detalle de partidos – {openQuarter && QUARTERS.find((q) => q.key === openQuarter)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 rounded-xl border overflow-hidden bg-card">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[640px]">
                  <UITableHeader className="bg-card/95">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Rival</TableHead>
                      <TableHead className="text-right">GF</TableHead>
                      <TableHead className="text-right">GC</TableHead>
                      <TableHead className="text-right">DIF</TableHead>
                    </TableRow>
                  </UITableHeader>

                  <TableBody>
                    {quarterMatches.map((m, idx) => (
                      <TableRow
                        key={m.id}
                        className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                      >
                        <TableCell className="max-w-[360px]">
                          <p className="truncate font-medium">{m.opponent}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.goalsFor}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.goalsAgainst}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-semibold ${
                            m.differential > 0
                              ? "text-green-600 dark:text-green-400"
                              : m.differential < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {m.differential > 0 ? "+" : ""}
                          {m.differential}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
