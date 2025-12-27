"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bar,
  Line,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { Expand, Minimize } from "lucide-react"
import type { Match } from "@/lib/types"

interface GoalDifferenceEvolutionChartProps {
  matches: Match[]
}

export function GoalDifferenceEvolutionChart({
  matches,
}: GoalDifferenceEvolutionChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Ordenar partidos por fecha (antiguo → reciente)
  const sortedMatches = [...matches].sort(
    (a, b) =>
      new Date(a.match_date).getTime() -
      new Date(b.match_date).getTime()
  )

  // Datos del gráfico (con diferencia acumulada)
  const chartData = sortedMatches.map((match, index) => {
    const diff = match.home_score - match.away_score
    const acumulada =
      index === 0
        ? diff
        : diff +
          sortedMatches
            .slice(0, index)
            .reduce(
              (sum, m) => sum + (m.home_score - m.away_score),
              0
            )

    return {
      jornada: match.jornada || index + 1,
      anotados: match.home_score,
      recibidos: match.away_score,
      diferenciaAcumulada: acumulada,
    }
  })

  // Mostrar últimos 10 o todos
  const displayData = isExpanded
    ? chartData
    : chartData.slice(-10)

  // Totales
  const totalFor = chartData.reduce(
    (sum, m) => sum + m.anotados,
    0
  )
  const totalAgainst = chartData.reduce(
    (sum, m) => sum + m.recibidos,
    0
  )
  const totalDiff = totalFor - totalAgainst

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Evolución de Diferencia de Goles</CardTitle>
            <CardDescription>
              Balance acumulado jornada a jornada · Total:{" "}
              <span
                className={
                  totalDiff >= 0
                    ? "text-green-600 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {totalDiff > 0 ? "+" : ""}
                {totalDiff}
              </span>
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <Minimize className="h-4 w-4 mr-2" />
                Últimos 10
              </>
            ) : (
              <>
                <Expand className="h-4 w-4 mr-2" />
                Ver todos
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* RESUMEN */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">
              Goles Anotados
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {totalFor}
            </p>
            <p className="text-xs text-muted-foreground">
              {(totalFor / matches.length || 0).toFixed(1)} / partido
            </p>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">
              Goles Recibidos
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {totalAgainst}
            </p>
            <p className="text-xs text-muted-foreground">
              {(totalAgainst / matches.length || 0).toFixed(1)} / partido
            </p>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">
              Diferencia Total
            </p>
            <p
              className={`text-2xl font-bold ${
                totalDiff >= 0
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {totalDiff > 0 ? "+" : ""}
              {totalDiff}
            </p>
            <p className="text-xs text-muted-foreground">
              {(totalDiff / matches.length || 0).toFixed(1)} / partido
            </p>
          </div>
        </div>

        {/* GRÁFICO */}
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={displayData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />

            <XAxis
              dataKey="jornada"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="hsl(var(--muted-foreground))"
            />

            <YAxis
              yAxisId="left"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{
                value: "Goles",
                angle: -90,
                position: "insideLeft",
              }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{
                value: "Diferencia",
                angle: 90,
                position: "insideRight",
              }}
            />

            <Tooltip
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  anotados: "Goles anotados",
                  recibidos: "Goles recibidos",
                  diferenciaAcumulada: "Diferencia acumulada",
                }
                return [value, labels[name] || name]
              }}
            />

            <Legend />

            {/* BARRAS */}
            <Bar
              yAxisId="left"
              dataKey="anotados"
              name="Goles anotados"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="recibidos"
              name="Goles recibidos"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />

            {/* LÍNEA */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="diferenciaAcumulada"
              name="Diferencia acumulada"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {!isExpanded && chartData.length > 10 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Mostrando los últimos 10 partidos de {chartData.length}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
