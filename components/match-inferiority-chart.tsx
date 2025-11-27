"use client"

import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts"

interface InferioridadStats {
  evitados: number
  recibidos: number
  eficiencia: number
}

export function MatchInferiorityChart({ stats }: { stats: InferioridadStats }) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-around gap-4">
      {/* Pie Chart */}
      <div className="w-full md:w-1/2 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: "Evitados", value: stats.evitados },
                { name: "Recibidos", value: stats.recibidos },
              ]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#10b981" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="w-full md:w-1/2 space-y-2">
        <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
          <span className="text-xs font-medium text-muted-foreground">Evitados</span>
          <span className="text-xl font-bold text-green-700 dark:text-green-300">{stats.evitados}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
          <span className="text-xs font-medium text-muted-foreground">Recibidos</span>
          <span className="text-xl font-bold text-red-700 dark:text-red-300">{stats.recibidos}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg">
          <span className="text-xs font-medium text-muted-foreground">Eficiencia</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.eficiencia}%</span>
        </div>
      </div>
    </div>
  )
}
