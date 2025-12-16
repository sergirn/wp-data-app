"use client"

import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Shield, XCircle, Target } from "lucide-react"

interface InferioridadStats {
  evitados: number
  recibidos: number
  paradas: number
  fuera: number
  bloqueo: number
  total: number
  eficiencia: number
}

export function MatchInferiorityChart({ stats }: { stats: InferioridadStats }) {
  return (
    <div className="space-y-4">
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

      {/* Accordion with breakdown */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="breakdown" className="border rounded-lg bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Ver inferioridad
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Paradas */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-emerald-500/20">
                      <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Paradas</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.paradas}</span>
                </div>

                {/* Fuera */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-blue-500/20">
                      <XCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Fuera</span>
                  </div>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.fuera}</span>
                </div>

                {/* Bloqueos */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-purple-500/20">
                      <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Bloqueos</span>
                  </div>
                  <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.bloqueo}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-semibold text-muted-foreground">Total Intentos</span>
                  <span className="text-lg font-bold">{stats.total}</span>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
