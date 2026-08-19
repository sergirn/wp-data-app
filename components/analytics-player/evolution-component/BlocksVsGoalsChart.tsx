"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { Switch } from "@/components/ui/switch"
import { BarChart3, Table2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"

import { buildBlocksVsGoalsData, chartColors, type MatchStatsWithMatch } from "./performance-chart"

type ViewMode = "chart" | "table"

export function BlocksVsGoalsChart({ matchStats }: { matchStats: MatchStatsWithMatch[] }) {
  const t = useTranslations("BlocksVsGoals")
  const [view, setView] = useState<ViewMode>("chart")

  const data = useMemo(() => buildBlocksVsGoalsData(matchStats), [matchStats])

  if (!matchStats?.length) return null

  const totalBloq = data.reduce((s, d) => s + (d.bloqueos ?? 0), 0)
  const totalGR = data.reduce((s, d) => s + (d.golesRecibidos ?? 0), 0)
  const avgBloq = data.length ? (totalBloq / data.length).toFixed(2) : "0.00"
  const avgGR = data.length ? (totalGR / data.length).toFixed(2) : "0.00"
  const localizedChartConfig = {
    bloqueos: { color: chartColors.bloqueos, label: t("blocks") },
    golesRecibidos: { color: chartColors.golesRecibidos, label: t("goalsConceded") },
    mediaBloqueos: { color: chartColors.mediaBloqueos, label: t("averageBlocks") },
    mediaGolesRecibidos: { color: chartColors.mediaGolesRecibidos, label: t("averageGoalsConceded") },
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription className="truncate">
                {t("description")} ·{" "}
                <span className="font-medium text-foreground">
                  {t("averages", { blocks: avgBloq, goals: avgGR })}
                </span>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <BarChart3 className={`h-4 w-4 ${view === "chart" ? "text-foreground" : "text-muted-foreground"}`} />
              <Switch
                checked={view === "table"}
                onCheckedChange={(v) => setView(v ? "table" : "chart")}
                aria-label={t("changeView")}
              />
              <Table2 className={`h-4 w-4 ${view === "table" ? "text-foreground" : "text-muted-foreground"}`} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-w-0 w-full overflow-hidden">
          {view === "chart" ? (
            <ChartContainer config={localizedChartConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="match" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />

                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value, payload) => {
                      const p = payload?.[0]?.payload
                      return p ? `${p.match} - ${p.opponent} (${p.date})` : String(value)
                    }}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="bloqueos"
                    stroke={chartColors.bloqueos}
                    strokeWidth={1}
                    opacity={0.50}
                    dot={false}
                    name={t("blocks")}
                  />
                  <Line
                    type="monotone"
                    dataKey="golesRecibidos"
                    stroke={chartColors.golesRecibidos}
                    strokeWidth={1}
                    opacity={0.50}
                    dot={false}
                    name={t("goalsConceded")}
                  />
                  <Line
                    type="monotone"
                    dataKey="mediaBloqueos"
                    stroke={chartColors.mediaBloqueos}
                    strokeWidth={5}
                    strokeDasharray="5 5"
                    dot={false}
                    name={t("averageBlocks")}
                  />
                  <Line
                    type="monotone"
                    dataKey="mediaGolesRecibidos"
                    stroke={chartColors.mediaGolesRecibidos}
                    strokeWidth={5}
                    strokeDasharray="5 5"
                    dot={false}
                    name={t("averageGoalsConceded")}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="rounded-xl border overflow-hidden bg-card w-full">
              <div className="w-full overflow-x-auto">
                <div className="max-h-[520px] overflow-y-auto">
                  <Table className="min-w-[980px]">
                    <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[90px]">{t("round")}</TableHead>
                        <TableHead>{t("opponent")}</TableHead>
                        <TableHead className="text-right">{t("blocks")}</TableHead>
                        <TableHead className="text-right">{t("goalsConcededShort")}</TableHead>
                        <TableHead className="text-right">{t("averageBlocksShort")}</TableHead>
                        <TableHead className="text-right">{t("averageGoalsConcededShort")}</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">{t("date")}</TableHead>
                      </TableRow>
                    </UITableHeader>

                    <TableBody>
                      {data.map((m, idx) => (
                        <TableRow
                          key={`${m.match}-${m.date}-${idx}`}
                          className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                        >
                          <TableCell className="font-semibold">{m.match}</TableCell>

                          <TableCell className="max-w-[360px]">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{m.opponent}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">{m.date}</p>
                            </div>
                          </TableCell>

                          <TableCell className="text-right tabular-nums">{m.bloqueos ?? 0}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.golesRecibidos ?? 0}</TableCell>

                          <TableCell className="text-right tabular-nums">{Number(m.mediaBloqueos ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(m.mediaGolesRecibidos ?? 0).toFixed(2)}</TableCell>

                          <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {t("matches", { count: data.length })}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border bg-card px-2 py-1">
                      {t("totalBlocks")}: <span className="font-semibold text-foreground">{totalBloq}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      {t("totalGoalsConceded")}: <span className="font-semibold text-foreground">{totalGR}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      {t("averageBlocksShort")}: <span className="font-semibold text-foreground">{avgBloq}</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      {t("averageGoalsConcededShort")}: <span className="font-semibold text-foreground">{avgGR}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
