"use client"

import { useMemo } from "react"
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { Badge } from "@/components/ui/badge"
import { Shield, XCircle, Target, TrendingUp, TrendingDown } from "lucide-react"

interface InferioridadStats {
  evitados: number
  recibidos: number
  paradas: number
  fuera: number
  bloqueo: number
  total: number
  eficiencia: number
}

export function MatchInferiorityChart({ stats }: { stats: InferioridadStats }) {
  const computed = useMemo(() => {
    const evitados = stats?.evitados ?? 0
    const recibidos = stats?.recibidos ?? 0
    const total = stats?.total ?? (evitados + recibidos)

    const paradas = stats?.paradas ?? 0
    const fuera = stats?.fuera ?? 0
    const bloqueo = stats?.bloqueo ?? 0

    // ✅ recalculamos eficiencia (no fiarse del campo)
    const eficiencia = total > 0 ? Math.round((evitados / total) * 1000) / 10 : 0
    const pctEvitados = total > 0 ? Math.round((evitados / total) * 1000) / 10 : 0
    const pctRecibidos = total > 0 ? Math.round((recibidos / total) * 1000) / 10 : 0

    // distribución interna de evitados (por si paradas+fuera+bloqueo no cuadra)
    const evitadosBreak = paradas + fuera + bloqueo
    const deltaEvitados = evitados - evitadosBreak // puede ser 0 o no, según tus datos

    return {
      evitados,
      recibidos,
      total,
      eficiencia,
      pctEvitados,
      pctRecibidos,
      paradas,
      fuera,
      bloqueo,
      evitadosBreak,
      deltaEvitados,
    }
  }, [stats])

  if (!stats) return null

  return (
    <ExpandableChartCard
      title="Inferioridad"
      description={`${computed.evitados}/${computed.total} · ${computed.eficiencia}% · Par ${computed.paradas} · Fuera ${computed.fuera} · Bloq ${computed.bloqueo}`}
      icon={<Target className="h-5 w-5" />}
      className="from-transparent"
      rightHeader={<span className="text-xs text-muted-foreground">{computed.eficiencia}%</span>}
      renderChart={({ compact }) => (
        <div className="w-full">
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {/* Pie Chart */}
            <div className={`${compact ? "h-[220px]" : "h-[320px]"} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Evitados", value: computed.evitados },
                      { name: "Recibidos", value: computed.recibidos },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={compact ? 85 : 110}
                    dataKey="value"
                  >
                  <Cell fill="#3a6bbbc4" />
                  <Cell fill="#ac2020c7" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary (igual que superioridad: solo badges) */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="bg-muted/30">
                  Total: <span className="ml-1 font-semibold text-foreground">{computed.total}</span>
                </Badge>
                <Badge variant="outline" className="bg-muted/30">
                  % Evitados: <span className="ml-1 font-semibold text-foreground">{computed.pctEvitados}%</span>
                </Badge>
                <Badge variant="outline" className="bg-muted/30">
                  % Recibidos: <span className="ml-1 font-semibold text-foreground">{computed.pctRecibidos}%</span>
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-muted/30">
                  Paradas: <span className="ml-1 font-semibold text-foreground">{computed.paradas}</span>
                </Badge>
                <Badge variant="outline" className="bg-muted/30">
                  Fuera: <span className="ml-1 font-semibold text-foreground">{computed.fuera}</span>
                </Badge>
                <Badge variant="outline" className="bg-muted/30">
                  Bloqueos: <span className="ml-1 font-semibold text-foreground">{computed.bloqueo}</span>
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
              <p className="text-sm font-semibold">Detalle de Inferioridad</p>
              <p className="text-xs text-muted-foreground">
                Eficiencia recalculada · {computed.evitados}/{computed.total} · {computed.eficiencia}%
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30">
                Evitados: <span className="ml-1 font-semibold text-foreground">{computed.evitados}</span>
              </Badge>
              <Badge variant="outline" className="bg-muted/30">
                Recibidos: <span className="ml-1 font-semibold text-foreground">{computed.recibidos}</span>
              </Badge>
            </div>
          </div>

          {/* Cards detalle */}
          <div className="p-4 space-y-4">
            {/* Fila 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Evitados</span>
                </div>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                  {computed.evitados}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">Recibidos</span>
                </div>
                <span className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">
                  {computed.recibidos}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Eficiencia</span>
                </div>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {computed.eficiencia}%
                </span>
              </div>
            </div>

            {/* Desglose evitados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Paradas</span>
                </div>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {computed.paradas}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <XCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Fuera</span>
                </div>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                  {computed.fuera}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Bloqueos</span>
                </div>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-300 tabular-nums">
                  {computed.bloqueo}
                </span>
              </div>
            </div>

            {/* Totales + sanity */}
            <div className="pt-2 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <span className="text-sm font-semibold text-muted-foreground">Total intentos</span>
                  <span className="text-lg font-bold tabular-nums">{computed.total}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <span className="text-sm font-semibold text-muted-foreground">Evitados (par+fuera+bloq)</span>
                  <span className="text-lg font-bold tabular-nums">{computed.evitadosBreak}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <span className="text-sm font-semibold text-muted-foreground">Diferencia</span>
                  <span className="text-lg font-bold tabular-nums">
                    {computed.deltaEvitados >= 0 ? "+" : ""}
                    {computed.deltaEvitados}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}
