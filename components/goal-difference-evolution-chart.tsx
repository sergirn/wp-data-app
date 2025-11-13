"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Expand, Minimize } from "lucide-react"
import type { Match } from "@/lib/types"

interface GoalDifferenceEvolutionChartProps {
  matches: Match[]
}

export function GoalDifferenceEvolutionChart({ matches }: GoalDifferenceEvolutionChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Sort matches by date (oldest first for evolution)
  const sortedMatches = [...matches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  // Prepare data for the chart
  const chartData = sortedMatches.map((match, index) => ({
    jornada: match.jornada || index + 1,
    golesAnotados: match.home_score,
    golesRecibidos: match.away_score,
    diferencia: match.home_score - match.away_score,
    opponent: match.opponent,
    date: new Date(match.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
  }))

  // Show last 10 matches by default, all when expanded
  const displayData = isExpanded ? chartData : chartData.slice(-10)

  const totalGoalsFor = chartData.reduce((sum, m) => sum + m.golesAnotados, 0)
  const totalGoalsAgainst = chartData.reduce((sum, m) => sum + m.golesRecibidos, 0)
  const totalDifference = totalGoalsFor - totalGoalsAgainst

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Evolución de Diferencia de Goles</CardTitle>
            <CardDescription>
              Goles anotados vs recibidos por jornada - Diferencia total: {totalDifference > 0 ? "+" : ""}
              {totalDifference}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <>
                <Minimize className="h-4 w-4 mr-2" />
                Últimos 10
              </>
            ) : (
              <>
                <Expand className="h-4 w-4 mr-2" />
                Ver Todos
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <p className="text-xs font-medium text-muted-foreground">Goles Anotados</p>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalGoalsFor}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {matches.length > 0 ? (totalGoalsFor / matches.length).toFixed(1) : 0} por partido
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <p className="text-xs font-medium text-muted-foreground">Goles Recibidos</p>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalGoalsAgainst}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {matches.length > 0 ? (totalGoalsAgainst / matches.length).toFixed(1) : 0} por partido
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <p className="text-xs font-medium text-muted-foreground">Diferencia</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalDifference > 0 ? "+" : ""}
              {totalDifference}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {matches.length > 0 ? (totalDifference / matches.length).toFixed(1) : 0} por partido
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="jornada"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{ value: "Jornada", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{ value: "Goles", angle: -90, position: "insideLeft" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  golesAnotados: "Goles Anotados",
                  golesRecibidos: "Goles Recibidos",
                  diferencia: "Diferencia",
                }
                return <span className="text-sm font-medium">{labels[value] || value}</span>
              }}
            />
            <Line
              type="monotone"
              dataKey="golesAnotados"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="golesRecibidos"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="diferencia"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>

        {!isExpanded && chartData.length > 10 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Mostrando los últimos 10 partidos de {chartData.length} totales
          </p>
        )}
      </CardContent>
    </Card>
  )
}
