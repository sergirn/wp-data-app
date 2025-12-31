"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Bar,
  Line,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { TrendingDown } from "lucide-react"
import type { Match, MatchStats } from "@/lib/types"

interface TurnoversRecoveriesChartProps {
  matches: Match[]
  stats: MatchStats[]
}

export function TurnoversRecoveriesChart({
  matches,
  stats,
}: TurnoversRecoveriesChartProps) {
  const matchData = matches.map((match, index) => {
    const matchStats = stats.filter((s) => s.match_id === match.id)

    const perdidas = matchStats.reduce(
      (sum, s) => sum + (s.acciones_perdida_poco || 0),
      0,
    )

    const recuperaciones = matchStats.reduce(
      (sum, s) => sum + (s.acciones_recuperacion || 0),
      0,
    )

    return {
      index,
      matchId: match.id,
      jornada: `J${match.jornada || index + 1}`,
      fullOpponent: match.opponent,
      fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
      perdidas,
      recuperaciones,
      balance: recuperaciones - perdidas,
    }
  })

  let balanceAcumulado = 0
  const chartData = matchData.map((m) => {
    balanceAcumulado += m.balance
    return {
      jornada: m.jornada,
      perdidas: m.perdidas,
      recuperaciones: m.recuperaciones,
      balance: balanceAcumulado,
    }
  })

  const totalPerdidas = matchData.reduce((s, m) => s + m.perdidas, 0)
  const totalRecuperaciones = matchData.reduce(
    (s, m) => s + m.recuperaciones,
    0,
  )

  const avgPerdidas =
    matchData.length > 0 ? (totalPerdidas / matchData.length).toFixed(1) : "0.0"
  const avgRecuperaciones =
    matchData.length > 0
      ? (totalRecuperaciones / matchData.length).toFixed(1)
      : "0.0"

  const balanceTotal = totalRecuperaciones - totalPerdidas

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control de Posesión</CardTitle>
        <CardDescription>
          Pérdidas y recuperaciones por partido
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* ===== RESUMEN ===== */}
        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
              Pérdidas
            </div>
            <div className="text-lg md:text-2xl font-bold text-red-600">
              {totalPerdidas}
            </div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              Media: {avgPerdidas}/partido
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
              Recuperaciones
            </div>
            <div className="text-lg md:text-2xl font-bold text-green-600">
              {totalRecuperaciones}
            </div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              Media: {avgRecuperaciones}/partido
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2 md:p-4 text-center col-span-2">
            <div className="text-[10px] md:text-sm font-medium text-muted-foreground mb-0.5">
              Balance Total
            </div>
            <div
              className={`text-lg md:text-2xl font-bold ${
                balanceTotal >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {balanceTotal >= 0 ? "+" : ""}
              {balanceTotal}
            </div>
            <div className="hidden md:block text-xs text-muted-foreground mt-1">
              Recuperaciones − Pérdidas
            </div>
          </div>
        </div>

        {/* ===== CHART ===== */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Evolución por Partido</h3>

          <ChartContainer
            config={{
              perdidas: { label: "Pérdidas", color: "hsl(0, 84%, 60%)" },
              recuperaciones: {
                label: "Recuperaciones",
                color: "hsl(142, 71%, 45%)",
              },
              balance: { label: "Balance", color: "hsl(217, 91%, 60%)" },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="jornada" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />

                <Bar
                  dataKey="perdidas"
                  fill="var(--color-perdidas)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="recuperaciones"
                  fill="var(--color-recuperaciones)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-balance)"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* ===== DETALLE ===== */}
        <Accordion type="single" collapsible>
          <AccordionItem value="detalle-partidos">
            <AccordionTrigger className="px-4 py-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors hover:no-underline">
              <span className="flex w-full items-center justify-center gap-2 text-lg font-semibold">
                <TrendingDown className="h-5 w-5 text-green-600" />
                Estadística por Partido
              </span>
            </AccordionTrigger>

            <AccordionContent className="px-2 sm:px-4 pb-4 mt-2">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {matchData.map((m) => (
                  <Card key={m.matchId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{m.jornada}</CardTitle>
                      <CardDescription>{m.fullOpponent}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Pérdidas
                        </span>
                        <Badge variant="destructive">−{m.perdidas}</Badge>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Recuperaciones
                        </span>
                        <Badge className="bg-green-500 text-white">
                          +{m.recuperaciones}
                        </Badge>
                      </div>

                      <div className="flex justify-between pt-1 border-t">
                        <span className="text-sm font-medium">Balance</span>
                        <span
                          className={`font-bold ${
                            m.balance >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {m.balance >= 0 ? "+" : ""}
                          {m.balance}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
