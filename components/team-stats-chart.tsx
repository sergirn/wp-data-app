"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts"
import type { Match } from "@/lib/types"

interface TeamStatsChartProps {
  matches: Match[]
}

export function TeamStatsChart({ matches }: TeamStatsChartProps) {
  // Group matches by month
  const monthlyData = matches.reduce(
    (acc, match) => {
      const date = new Date(match.match_date)
      const monthKey = date.toLocaleDateString("es-ES", { month: "short", year: "numeric" })

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, golesAFavor: 0, golesEnContra: 0, partidos: 0 }
      }

      acc[monthKey].golesAFavor += match.home_score
      acc[monthKey].golesEnContra += match.away_score
      acc[monthKey].partidos += 1

      return acc
    },
    {} as Record<string, { month: string; golesAFavor: number; golesEnContra: number; partidos: number }>,
  )

  const chartData = Object.values(monthlyData).reverse()

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Evolución Mensual</CardTitle>
        <CardDescription>Goles a favor y en contra por mes</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis />
            <Legend />
            <Bar dataKey="golesAFavor" fill="#3b82f6" name="Goles a Favor" radius={[8, 8, 0, 0]} />
            <Bar dataKey="golesEnContra" fill="#f97316" name="Goles en Contra" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
