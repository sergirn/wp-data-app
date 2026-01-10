"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Cell, Pie, PieChart, ResponsiveContainer, Legend } from "recharts"
import type { Match } from "@/lib/types"

interface MatchResultsChartProps {
  matches: Match[]
}

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"] // Green, Orange, Red

export function MatchResultsChart({ matches }: MatchResultsChartProps) {
  const wins = matches.filter(m => m.home_score > m.away_score).length
  const draws = matches.filter(m => m.home_score === m.away_score).length
  const losses = matches.filter(m => m.home_score < m.away_score).length

  const total = matches.length || 0

  const stats = [
    { label: "Victorias", value: wins, color: "#22c55e" },
    { label: "Empates", value: draws, color: "#f59e0b" },
    { label: "Derrotas", value: losses, color: "#ef4444" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados</CardTitle>
        <CardDescription>Balance de partidos</CardDescription>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={stats}
              dataKey="value"
              innerRadius={70}
              outerRadius={100}
              stroke="none"
            >
              {stats.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>

            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              <tspan className="text-2xl font-bold fill-foreground">
                {total}
              </tspan>
              <tspan
                x="50%"
                dy="2em"
                className="text-xs fill-muted-foreground"
              >
                Partidos
              </tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border p-3 text-center"
              style={{ backgroundColor: `${stat.color}10` }}
            >
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round((stat.value / total) * 100)}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
