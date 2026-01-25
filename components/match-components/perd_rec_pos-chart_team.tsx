"use client"

import { useMemo } from "react"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Repeat2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { MatchStats } from "@/lib/types"

type Props = {
  stats: MatchStats[] // stats del partido (match.match_stats)
  rival?: string
  matchDateLabel?: string // opcional para tooltip/tabla
  size?: "sm" | "md"
}

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0)

function pct(numer: number, denom: number) {
  if (!denom) return 0
  return Math.round((numer / denom) * 1000) / 10
}

export function MatchPossessionChart({ stats, rival = "Rival", matchDateLabel, size = "md" }: Props) {
  const computed = useMemo(() => {
    const arr = Array.isArray(stats) ? stats : []

    const recuperaciones = arr.reduce((sum, s) => sum + n(s.acciones_recuperacion) + n(s.acciones_rebote), 0)
    const perdidas = arr.reduce((sum, s) => sum + n(s.acciones_perdida_poco) + n(s.pase_boya_fallado), 0)
    const balance = recuperaciones - perdidas

    const totalMov = recuperaciones + perdidas
    const ratioRecPer = perdidas > 0 ? Number((recuperaciones / perdidas).toFixed(2)) : recuperaciones
    const pctRec = pct(recuperaciones, totalMov)
    const pctPer = pct(perdidas, totalMov)

    const chartData = [
      {
        key: "Partido",
        label: "P",
        rival,
        fullDate: matchDateLabel ?? "",
        perdidas,
        recuperaciones,
        balance,
      },
    ]

    return {
      recuperaciones,
      perdidas,
      balance,
      totalMov,
      ratioRecPer,
      pctRec,
      pctPer,
      chartData,
    }
  }, [stats, rival, matchDateLabel])

  if (!stats?.length) return null

  const compactH = size === "sm" ? "h-[280px]" : "h-[230px]"
  const fullH = size === "sm" ? "h-[290px]" : "h-[380px]"

  return (
    <ExpandableChartCard
      title="Posesión"
      description={`Rec ${computed.recuperaciones} · Pérd ${computed.perdidas} · Bal ${computed.balance >= 0 ? "+" : ""}${computed.balance}`}
      icon={<Repeat2 className="h-5 w-5" />}
      className="from-transparent"
      rightHeader={
        <span className="text-xs text-muted-foreground">
          {computed.balance >= 0 ? "+" : ""}
          {computed.balance}
        </span>
      }
      renderChart={({ compact }) => (
        <div className="w-full">
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {/* Chart */}
            <ChartContainer
              config={{
                perdidas: { label: "Pérdidas", color: "hsl(0, 84%, 60%)" },
                recuperaciones: { label: "Recuperaciones", color: "hsl(142, 71%, 45%)" },
                balance: { label: "Balance", color: "hsl(217, 91%, 60%)" },
              }}
              className={`w-full ${compact ? compactH : fullH}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={computed.chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

                  <XAxis
                    dataKey="label"
                    fontSize={12}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />

                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label, payload) => {
                          const p = payload?.[0]?.payload
                          if (!p) return String(label)
                          return `${label} · vs ${p.rival}${p.fullDate ? ` · ${p.fullDate}` : ""} · Bal: ${
                            p.balance >= 0 ? "+" : ""
                          }${p.balance}`
                        }}
                      />
                    }
                  />

                  <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

                  <Bar dataKey="perdidas" fill="var(--color-perdidas)" name="Pérdidas" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="recuperaciones"
                    fill="var(--color-recuperaciones)"
                    name="Recuperaciones"
                    radius={[4, 4, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Preview limpio: solo badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="bg-muted/30">
                  Total mov: <span className="ml-1 font-semibold text-foreground">{computed.totalMov}</span>
                </Badge>

                <Badge variant="outline" className="bg-muted/30">
                  Ratio Rec/Pérd: <span className="ml-1 font-semibold text-foreground">{computed.ratioRecPer}</span>
                </Badge>

                <Badge variant="outline" className="bg-muted/30">
                  % Rec: <span className="ml-1 font-semibold text-foreground">{computed.pctRec}%</span>
                </Badge>

                <Badge variant="outline" className="bg-muted/30">
                  % Pérd: <span className="ml-1 font-semibold text-foreground">{computed.pctPer}%</span>
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
      renderTable={() => (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Header detalle */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Detalle Posesión</p>
              <p className="text-xs text-muted-foreground">
                Rec {computed.recuperaciones} · Pérd {computed.perdidas} · Bal {computed.balance >= 0 ? "+" : ""}
                {computed.balance}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30">
                % Rec: <span className="ml-1 font-semibold text-foreground">{computed.pctRec}%</span>
              </Badge>
              <Badge variant="outline" className="bg-muted/30">
                % Pérd: <span className="ml-1 font-semibold text-foreground">{computed.pctPer}%</span>
              </Badge>
              <Badge variant="outline" className="bg-muted/30">
                Ratio: <span className="ml-1 font-semibold text-foreground">{computed.ratioRecPer}</span>
              </Badge>
            </div>
          </div>

          {/* Cards detalle (como los otros) */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">Pérdidas</span>
                </div>
                <span className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">{computed.perdidas}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Recuperaciones</span>
                </div>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {computed.recuperaciones}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  computed.balance >= 0
                    ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800"
                    : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-full ${
                      computed.balance >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
                    }`}
                  >
                    <Minus className={`h-4 w-4 ${computed.balance >= 0 ? "text-emerald-600" : "text-red-600"}`} />
                  </div>
                  <span className="text-sm font-medium">Balance</span>
                </div>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    computed.balance >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {computed.balance >= 0 ? "+" : ""}
                  {computed.balance}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}
