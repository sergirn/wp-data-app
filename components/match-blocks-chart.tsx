"use client"

import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts"

interface BlocksStats {
  bloqueos: number
  golesRecibidos: number
  eficacia: number
}

export function MatchBlocksChart({ stats }: { stats: BlocksStats }) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-around gap-4">
      {/* Pie Chart */}
      <div className="w-full md:w-1/2 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: "Bloqueos", value: stats.bloqueos },
                { name: "Goles", value: stats.golesRecibidos },
              ]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#3b82f6" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="w-full md:w-1/2 space-y-2">
        <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg">
          <span className="text-xs font-medium text-muted-foreground">Bloqueos</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.bloqueos}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
          <span className="text-xs font-medium text-muted-foreground">Goles Recibidos</span>
          <span className="text-xl font-bold text-red-700 dark:text-red-300">{stats.golesRecibidos}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
          <span className="text-xs font-medium text-muted-foreground">Eficacia</span>
          <span className="text-xl font-bold text-green-700 dark:text-green-300">{stats.eficacia}%</span>
        </div>
      </div>
    </div>
  )
}
