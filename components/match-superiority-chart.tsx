"use client"

import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { TrendingUp, TrendingDown, Target } from "lucide-react"

interface SuperioridadStats {
  anotadas: number
  falladas: number
  eficiencia: number
  rebotesRecuperados?: number
  rebotesPerdidos?: number
}

export function MatchSuperiorityChart({ stats }: { stats: SuperioridadStats }) {
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
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="breakdown" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4" />
                Ver Desglose Detallado
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Rebotes Recuperados */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-emerald-500/20">
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                        Rebotes Recuperados
                      </span>
                    </div>
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {stats.rebotesRecuperados || 0}
                    </span>
                  </div>

                  {/* Rebotes Perdidos */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-orange-500/20">
                        <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-sm font-medium text-orange-900 dark:text-orange-100">Rebotes Perdidos</span>
                    </div>
                    <span className="text-lg font-bold text-orange-700 dark:text-orange-300">
                      {stats.rebotesPerdidos || 0}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-semibold text-muted-foreground">Total Rebotes</span>
                    <span className="text-lg font-bold">
                      {(stats.rebotesRecuperados || 0) + (stats.rebotesPerdidos || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}
