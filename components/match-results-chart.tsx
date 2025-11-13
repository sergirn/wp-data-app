"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Cell, Pie, PieChart, ResponsiveContainer, Legend } from "recharts"
import type { Match } from "@/lib/types"

interface MatchResultsChartProps {
  matches: Match[]
}

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"] // Green, Orange, Red

export function MatchResultsChart({ matches }: MatchResultsChartProps) {
  const wins = matches.filter((m) => m.home_score > m.away_score).length
  const draws = matches.filter((m) => m.home_score === m.away_score).length
  const losses = matches.filter((m) => m.home_score < m.away_score).length

  const data = [
    { name: "Victorias", value: wins },
    { name: "Empates", value: draws },
    { name: "Derrotas", value: losses },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados</CardTitle>
        <CardDescription>Distribución de victorias, empates y derrotas</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              stroke="#ffffff"
              strokeWidth={3}
              label={({ name, value, percent }) =>
                value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : null
              }
              labelLine={true}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} style={{ outline: "none" }} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[0] }} />
              <p className="text-xs font-medium text-muted-foreground">Victorias</p>
            </div>
            <p className="text-2xl font-bold">{wins}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[1] }} />
              <p className="text-xs font-medium text-muted-foreground">Empates</p>
            </div>
            <p className="text-2xl font-bold">{draws}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[2] }} />
              <p className="text-xs font-medium text-muted-foreground">Derrotas</p>
            </div>
            <p className="text-2xl font-bold">{losses}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
