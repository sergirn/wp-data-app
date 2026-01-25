"use client"

import { useMemo } from "react"
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { Badge } from "@/components/ui/badge"
import { Shield, TrendingUp, TrendingDown, Target } from "lucide-react"

type Props = {
  match: any
  stats: any[] // match.match_stats
}

export function MatchGoalkeepersPieChart({ match, stats }: Props) {
  const computed = useMemo(() => {
    const rows = (stats ?? []).filter((s) => s?.players?.is_goalkeeper && s?.portero_paradas_totales != null)

    const saves = rows.reduce((sum, s) => sum + (s?.portero_paradas_totales || 0), 0)

    // ⚠️ misma lógica que tu chart de rendimiento: goles recibidos = marcador rival
    const golesRecibidos = match?.away_score || 0

    const tirosRecibidos = saves + golesRecibidos
    const percentage = tirosRecibidos > 0 ? Math.round((saves / tirosRecibidos) * 1000) / 10 : 0

    const savesInf = rows.reduce((sum, s) => sum + (s?.portero_paradas_hombre_menos || 0), 0)
    const pensSaved = rows.reduce((sum, s) => sum + (s?.portero_paradas_penalti_parado || 0), 0)

    const pctParadas = tirosRecibidos > 0 ? Math.round((saves / tirosRecibidos) * 1000) / 10 : 0
    const pctGoles = tirosRecibidos > 0 ? Math.round((golesRecibidos / tirosRecibidos) * 1000) / 10 : 0

    return {
      saves,
      golesRecibidos,
      tirosRecibidos,
      percentage,
      savesInf,
      pensSaved,
      pctParadas,
      pctGoles,
    }
  }, [match, stats])

  if (!match) return null

  return (
    <ExpandableChartCard
      title="Porteros"
      description={`${computed.saves}/${computed.tirosRecibidos} · ${computed.percentage}% · GC ${computed.golesRecibidos}`}
      icon={<Shield className="h-5 w-5" />}
      className="from-transparent"
      rightHeader={<span className="text-xs text-muted-foreground">{computed.percentage}%</span>}
      renderChart={({ compact }) => (
        <div className="w-full">
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {/* Pie Chart (calcado) */}
            <div className={`${compact ? "h-[220px]" : "h-[320px]"} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Paradas", value: computed.saves },
                      { name: "Goles recibidos", value: computed.golesRecibidos },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={compact ? 85 : 110}
                    dataKey="value"
                  >
                    <Cell fill="#3abb4fda" />
                    <Cell fill="#ac9220e3" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary (solo badges, calcado) */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="bg-muted/30">
                  Tiros: <span className="ml-1 font-semibold text-foreground">{computed.tirosRecibidos}</span>
                </Badge>
                <Badge variant="outline" className="bg-muted/30">
                  % Paradas: <span className="ml-1 font-semibold text-foreground">{computed.pctParadas}%</span>
                </Badge>
                <Badge variant="outline" className="bg-muted/30">
                  % Goles: <span className="ml-1 font-semibold text-foreground">{computed.pctGoles}%</span>
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
      renderTable={() => (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Header detalle (calcado) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Detalle de Porteros</p>
              <p className="text-xs text-muted-foreground">
                Efectividad recalculada · {computed.saves}/{computed.tirosRecibidos} · {computed.percentage}%
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30">
                Par. Inf.: <span className="ml-1 font-semibold text-foreground">{computed.savesInf}</span>
              </Badge>
              <Badge variant="outline" className="bg-muted/30">
                Pen. Par.: <span className="ml-1 font-semibold text-foreground">{computed.pensSaved}</span>
              </Badge>
            </div>
          </div>

          {/* Cards detalle (calcadas) */}
          <div className="p-4 space-y-4">
            {/* Fila 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Paradas</span>
                </div>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                  {computed.saves}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <Target className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">Goles recibidos</span>
                </div>
                <span className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">
                  {computed.golesRecibidos}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Efectividad</span>
                </div>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {computed.percentage}%
                </span>
              </div>
            </div>

            {/* Fila 2 (opcional si hay campos) */}
            {(stats?.some((s) => s?.portero_paradas_hombre_menos != null) ||
              stats?.some((s) => s?.portero_paradas_penalti_parado != null)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-emerald-500/20">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Paradas inf.</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {computed.savesInf}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-orange-500/20">
                      <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-100">Penaltis par.</span>
                  </div>
                  <span className="text-lg font-bold text-orange-700 dark:text-orange-300 tabular-nums">
                    {computed.pensSaved}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <span className="text-sm font-semibold text-muted-foreground">Total tiros</span>
                <span className="text-lg font-bold tabular-nums">{computed.tirosRecibidos}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}
