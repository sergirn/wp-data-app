"use client"

import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface SuperioridadStats {
  anotadas: number
  falladas: number
  eficiencia: number
  rebotesRecuperados?: number
  rebotesPerdidos?: number
}

export function MatchSuperiorityChart({ stats }: { stats: SuperioridadStats }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-around gap-4">
        {/* Pie Chart */}
        <div className="w-full md:w-1/2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: "Anotadas", value: stats.anotadas },
                  { name: "Falladas", value: stats.falladas },
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
            <span className="text-xs font-medium text-muted-foreground">Anotadas</span>
            <span className="text-xl font-bold text-green-700 dark:text-green-300">{stats.anotadas}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground">Falladas</span>
            <span className="text-xl font-bold text-red-700 dark:text-red-300">{stats.falladas}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground">Eficiencia</span>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.eficiencia}%</span>
          </div>
        </div>
      </div>

      {(stats.rebotesRecuperados !== undefined || stats.rebotesPerdidos !== undefined) && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-colors">
              <span className="text-sm font-medium">Desglose de Superioridad</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-2 p-4 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-lg border border-green-500/20">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Rebotes Recuperados</p>
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300"
                  >
                    {stats.rebotesRecuperados || 0}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Rebotes Perdidos</p>
                  <Badge
                    variant="outline"
                    className="bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300"
                  >
                    {stats.rebotesPerdidos || 0}
                  </Badge>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
