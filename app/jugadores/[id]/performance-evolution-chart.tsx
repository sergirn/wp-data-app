"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import type { Player } from "@/lib/types"
import { useMemo } from "react"

interface MatchStatsWithMatch {
  id: number
  goles_totales: number
  tiros_totales: number
  acciones_asistencias: number
  acciones_bloqueo: number
  portero_paradas_totales: number
  matches: {
    id: number
    match_date: string
    opponent: string
    home_score: number
    away_score: number
    is_home: boolean
  }
}

interface PerformanceEvolutionChartProps {
  matchStats: MatchStatsWithMatch[]
  player: Player
}

export function PerformanceEvolutionChart({ matchStats, player }: PerformanceEvolutionChartProps) {
  const chartData = useMemo(() => {
    // Sort by date ascending for chronological order
    const sortedStats = [...matchStats].sort(
      (a, b) => new Date(a.matches.match_date).getTime() - new Date(b.matches.match_date).getTime()
    )

    return sortedStats.map((stat, index) => {
      const efficiency = stat.tiros_totales > 0 
        ? Math.round((stat.goles_totales / stat.tiros_totales) * 100) 
        : 0

      const matchDate = new Date(stat.matches.match_date)
      const shortDate = `${matchDate.getDate()}/${matchDate.getMonth() + 1}`

      if (player.is_goalkeeper) {
        const totalShots = stat.portero_paradas_totales + (stat.matches.is_home ? stat.matches.away_score : stat.matches.home_score)
        const savePercentage = totalShots > 0 
          ? Math.round((stat.portero_paradas_totales / totalShots) * 100) 
          : 0
          const cumulativeParadas =
        sortedStats.slice(0, index + 1).reduce((sum, s) => sum + s.portero_paradas_totales, 0)

        const paradasMedia = cumulativeParadas / (index + 1)

        return {
          
          match: `J${index + 1}`,
          date: shortDate,
          opponent: stat.matches.opponent.substring(0, 10),
          paradas: Number(paradasMedia.toFixed(1)),
          eficiencia: savePercentage,
          goles: stat.goles_totales,
        }
      }

      return {
        match: `J${index + 1}`,
        date: shortDate,
        opponent: stat.matches.opponent.substring(0, 10),
        goles: stat.goles_totales,
        tiros: stat.tiros_totales,
        asistencias: stat.acciones_asistencias,
        eficiencia: efficiency,
      }
    })
  }, [matchStats, player.is_goalkeeper])

  if (matchStats.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No hay datos suficientes para mostrar la evolución</p>
        </CardContent>
      </Card>
    )
  }

  if (player.is_goalkeeper) {
    const totalRivalGoals =
      stat.matches.is_home ? stat.matches.away_score : stat.matches.home_score

    const totalShots = stat.portero_paradas_totales + totalRivalGoals

    const savePercentage =
      totalShots > 0 ? Math.round((stat.portero_paradas_totales / totalShots) * 100) : 0

    // --- NUEVO: media acumulada de paradas por partido ---
    const cumulativeParadas = sortedStats
      .slice(0, index + 1)
      .reduce((sum, s) => sum + s.portero_paradas_totales, 0)

    const paradasMedia = cumulativeParadas / (index + 1)

    return {
      match: `J${index + 1}`,
      date: shortDate,
      opponent: stat.matches.opponent.substring(0, 10),

      // NUEVO: media de paradas
      paradas: Number(paradasMedia.toFixed(1)),

      eficiencia: savePercentage,
      goles: totalRivalGoals,
    }
  }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolución del Rendimiento - Portero</CardTitle>
            <CardDescription>Progreso a lo largo de la temporada</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="match" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload
                        return `${data.match} - ${data.opponent} (${data.date})`
                      }
                      return value
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="paradas" 
                    stroke={chartConfig.paradas.color} 
                    strokeWidth={2}
                    dot={{ fill: chartConfig.paradas.color, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Paradas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="eficiencia" 
                    stroke={chartConfig.eficiencia.color} 
                    strokeWidth={2}
                    dot={{ fill: chartConfig.eficiencia.color, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Eficiencia %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="goles" 
                    stroke={chartConfig.goles.color} 
                    strokeWidth={2}
                    dot={{ fill: chartConfig.goles.color, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Goles"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Promedio Paradas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {(chartData.reduce((sum, d) => sum + d.paradas, 0) / chartData.length).toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia Media</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(chartData.reduce((sum, d) => sum + d.eficiencia, 0) / chartData.length).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Goles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {chartData.reduce((sum, d) => sum + d.goles, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Field player chart
  const chartConfig = {
    goles: {
      label: "Goles",
      color: "hsl(200 80% 50%)",
    },
    asistencias: {
      label: "Asistencias",
      color: "hsl(280 70% 60%)",
    },
    eficiencia: {
      label: "Eficiencia %",
      color: "hsl(160 70% 50%)",
    },
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Evolución del Rendimiento</CardTitle>
          <CardDescription>Progreso a lo largo de la temporada</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="match" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload
                      return `${data.match} - ${data.opponent} (${data.date})`
                    }
                    return value
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="goles" 
                  stroke={chartConfig.goles.color} 
                  strokeWidth={2}
                  dot={{ fill: chartConfig.goles.color, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Goles"
                />
                <Line 
                  type="monotone" 
                  dataKey="asistencias" 
                  stroke={chartConfig.asistencias.color} 
                  strokeWidth={2}
                  dot={{ fill: chartConfig.asistencias.color, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Asistencias"
                />
                <Line 
                  type="monotone" 
                  dataKey="eficiencia" 
                  stroke={chartConfig.eficiencia.color} 
                  strokeWidth={2}
                  dot={{ fill: chartConfig.eficiencia.color, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Eficiencia %"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promedio Goles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {(chartData.reduce((sum, d) => sum + d.goles, 0) / chartData.length).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promedio Tiros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(chartData.reduce((sum, d) => sum + d.tiros, 0) / chartData.length).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promedio Asistencias</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {(chartData.reduce((sum, d) => sum + d.asistencias, 0) / chartData.length).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia Media</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {(chartData.reduce((sum, d) => sum + d.eficiencia, 0) / chartData.length).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
