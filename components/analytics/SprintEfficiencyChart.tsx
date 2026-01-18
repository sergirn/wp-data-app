"use client"

import { useMemo } from "react"
import type { Match, Player } from "@/lib/types"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table"
import { Flag } from "lucide-react"

type PlayerMini = Pick<Player, "id" | "name" | "number" | "photo_url" | "is_goalkeeper">

function pct(n: number, d: number) {
  if (d <= 0) return 0
  return Math.round((n / d) * 100)
}


function isZeroish(v: any) {
  if (v === null || v === undefined) return true
  if (v === 0 || v === false) return true
  const s = String(v).trim().toLowerCase()
  if (s === "" || s === "0" || s === "null" || s === "undefined") return true
  return false
}

function isSprintWonByRule(sprintWinner: any, winnerPlayerId: any) {
  return !isZeroish(sprintWinner) || !isZeroish(winnerPlayerId)
}

interface SprintEfficiencyChartProps {
  matches: Match[]
  players: Player[]
}

export function SprintEfficiencyChart({ matches, players }: SprintEfficiencyChartProps) {
  const playersById = useMemo(() => {
    const m = new Map<number, PlayerMini>()
    ;(players ?? []).forEach((p: any) => m.set(Number(p.id), p))
    return m
  }, [players])

  const getSprintWinnerPlayer = (playerId: number | null | undefined): PlayerMini | null => {
    if (!playerId) return null
    return playersById.get(Number(playerId)) ?? null
  }

  const sortedMatches = useMemo(() => {
    return [...(matches ?? [])]
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aj = a?.jornada ?? 9999
        const bj = b?.jornada ?? 9999
        if (aj !== bj) return aj - bj
        return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      })
  }, [matches])

  const matchRows = useMemo(() => {
    const winsByQuarter = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<1 | 2 | 3 | 4, number>
    const playedByQuarter = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<1 | 2 | 3 | 4, number>
    const winsByPlayer = new Map<number, number>()

    const rows = sortedMatches.map((match: any, idx: number) => {
      const quarters = [
        { q: 1 as const, sprint: match.sprint1_winner, winnerPlayerId: match.sprint1_winner_player_id },
        { q: 2 as const, sprint: match.sprint2_winner, winnerPlayerId: match.sprint2_winner_player_id },
        { q: 3 as const, sprint: match.sprint3_winner, winnerPlayerId: match.sprint3_winner_player_id },
        { q: 4 as const, sprint: match.sprint4_winner, winnerPlayerId: match.sprint4_winner_player_id },
      ]

      let won = 0
      let lost = 0
      let played = 0

      const perQ: Record<1 | 2 | 3 | 4, { r: "W" | "L" }> = {
        1: { r: "L" },
        2: { r: "L" },
        3: { r: "L" },
        4: { r: "L" },
      }

      quarters.forEach(({ q, sprint, winnerPlayerId }) => {
        played += 1
        playedByQuarter[q] += 1

        const isWon = isSprintWonByRule(sprint, winnerPlayerId)

        if (isWon) {
          won += 1
          winsByQuarter[q] += 1
          perQ[q] = { r: "W" }

          if (!isZeroish(winnerPlayerId)) {
            const pl = getSprintWinnerPlayer(Number(winnerPlayerId))
            if (pl) winsByPlayer.set(pl.id, (winsByPlayer.get(pl.id) ?? 0) + 1)
          }
        } else {
          lost += 1
          perQ[q] = { r: "L" }
        }
      })

      const jornadaNum = match.jornada ?? idx + 1

      return {
        matchId: Number(match.id),
        jornadaNumber: jornadaNum,
        jornada: `J${jornadaNum}`,
        rival: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        won,
        lost,
        played,
        pctWon: pct(won, played),

        q1: perQ[1].r,
        q2: perQ[2].r,
        q3: perQ[3].r,
        q4: perQ[4].r,
      }
    })

    // Totales
    const totalWon = rows.reduce((s, r) => s + r.won, 0)
    const totalLost = rows.reduce((s, r) => s + r.lost, 0)
    const totalPlayed = rows.reduce((s, r) => s + r.played, 0)

    // Top jugador (más sprints ganados con player_id válido)
    let topPlayerId: number | null = null
    let topPlayerWins = 0
    for (const [pid, w] of winsByPlayer.entries()) {
      if (w > topPlayerWins) {
        topPlayerWins = w
        topPlayerId = pid
      }
    }
    const topPlayer = topPlayerId ? getSprintWinnerPlayer(topPlayerId) : null

    // Mejor cuarto(s) (donde más ganamos)
    const qWins = [
      { q: 1 as const, wins: winsByQuarter[1], played: playedByQuarter[1] },
      { q: 2 as const, wins: winsByQuarter[2], played: playedByQuarter[2] },
      { q: 3 as const, wins: winsByQuarter[3], played: playedByQuarter[3] },
      { q: 4 as const, wins: winsByQuarter[4], played: playedByQuarter[4] },
    ]
    const maxWins = Math.max(...qWins.map((x) => x.wins), 0)
    const bestQuarters = qWins.filter((x) => x.wins === maxWins && maxWins > 0)

    return {
      rows,
      totals: {
        totalWon,
        totalLost,
        totalPlayed,
        pctWon: pct(totalWon, totalPlayed),
        pctLost: pct(totalLost, totalPlayed),
      },
      topPlayer,
      topPlayerWins,
      bestQuarters,
    }
  }, [sortedMatches, playersById])

  const chartData = useMemo(() => {
    return matchRows.rows.map((m, index) => {
      const prev = matchRows.rows.slice(0, index + 1)
      const cumWon = prev.reduce((s, x) => s + x.won, 0)
      const cumPlayed = prev.reduce((s, x) => s + x.played, 0)
      const avgPct = pct(cumWon, cumPlayed)

      return {
        matchId: m.matchId,
        jornada: m.jornada,
        rival: m.rival,
        fullDate: m.fullDate,

        ganados: m.won,
        perdidos: m.lost,
        pctGanados: m.pctWon,

        promedioPctGanados: avgPct,
      }
    })
  }, [matchRows.rows])

  if (!matchRows.rows.length) return null

  const { totals, topPlayer, topPlayerWins, bestQuarters } = matchRows
  const bestQLabel = bestQuarters.length ? bestQuarters.map((x) => `Q${x.q}`).join(", ") : "—"
  const bestQWins = bestQuarters.length ? bestQuarters[0].wins : 0

  return (
    <ExpandableChartCard
      title="Sprints"
      description={`Últ. ${matchRows.rows.length} · % Ganados: ${totals.pctWon}% · % Perdidos: ${totals.pctLost}%`}
      icon={<Flag className="w-5 h-5" />}
      rightHeader={null}
      renderChart={({ compact }) => (
        <div className="space-y-3">
          {/* resumen: % ganados, top jugador, mejor cuarto */}
          <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-3 md:gap-4"}`}>
            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">% Ganados</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                {totals.pctWon}%
              </div>
              {!compact ? (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {totals.totalWon}/{totals.totalPlayed} sprints
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Top sprint</div>
              <div className="text-sm font-bold tabular-nums">{topPlayer ? `#${topPlayer.number}` : "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{topPlayer ? topPlayer.name : "Sin datos"}</div>
              {!compact ? (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {topPlayer ? `${topPlayerWins} ganados` : ""}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-[10px] font-medium text-muted-foreground">Mejor cuarto</div>
              <div className="text-lg font-bold tabular-nums">{bestQLabel}</div>
              {!compact ? (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {bestQuarters.length ? `${bestQWins} ganados` : "Sin datos"}
                </div>
              ) : null}
            </div>
          </div>

          {/* chart */}
          <ChartContainer
            config={{
              ganados: { label: "Ganados", color: "hsl(142, 71%, 45%)" },
              perdidos: { label: "Perdidos", color: "hsl(0, 84%, 60%)" },
              pctGanados: { label: "% Ganados", color: "hsl(217, 91%, 60%)" },
              promedioPctGanados: { label: "Promedio %", color: "hsl(262, 85%, 65%)" },
            }}
            className={`w-full ${compact ? "h-[190px]" : "h-[420px]"}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

                <XAxis
                  dataKey="jornada"
                  fontSize={12}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />

                {/* eje izq: counts */}
                <YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />

                {/* eje der: % */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  fontSize={12}
                  width={40}
                  tickMargin={6}
                  axisLine={false}
                  tickLine={false}
                />

                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label, payload) => {
                        const p = payload?.[0]?.payload as any
                        if (!p) return String(label)
                        return `${label} · vs ${p.rival} · ${p.fullDate} · ${p.pctGanados}%`
                      }}
                    />
                  }
                />

                <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

                <Bar dataKey="ganados" name="Ganados" fill="var(--color-ganados)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="perdidos" name="Perdidos" fill="var(--color-perdidos)" radius={[4, 4, 0, 0]} />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pctGanados"
                  name="% Ganados"
                  stroke="var(--color-pctGanados)"
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="promedioPctGanados"
                  name="Promedio %"
                  stroke="var(--color-promedioPctGanados)"
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* tabla SOLO expandido */}
          {!compact && (
            <div className="rounded-xl border overflow-hidden bg-card w-full">
              <div className="w-full overflow-x-auto">
                <div className="max-h-[520px] overflow-y-auto">
                  <Table className="min-w-[980px]">
                    <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[90px]">Jornada</TableHead>
                        <TableHead>Rival</TableHead>
                        <TableHead className="text-center">Q1</TableHead>
                        <TableHead className="text-center">Q2</TableHead>
                        <TableHead className="text-center">Q3</TableHead>
                        <TableHead className="text-center">Q4</TableHead>
                        <TableHead className="text-center">Gan.</TableHead>
                        <TableHead className="text-center">Per.</TableHead>
                        <TableHead className="text-right">% Gan.</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                      </TableRow>
                    </UITableHeader>

                    <TableBody>
                      {matchRows.rows.map((m, idx) => (
                        <TableRow
                          key={m.matchId}
                          className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                        >
                          <TableCell className="font-semibold">{m.jornada}</TableCell>

                          <TableCell className="max-w-[360px]">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{m.rival}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                            </div>
                          </TableCell>

                          {(["q1", "q2", "q3", "q4"] as const).map((k) => {
                            const v = (m as any)[k] as "W" | "L"
                            const cls = v === "W" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                            return (
                              <TableCell key={k} className="text-center">
                                <Badge className={`${cls} tabular-nums`}>{v}</Badge>
                              </TableCell>
                            )
                          })}

                          <TableCell className="text-center">
                            <Badge className="bg-green-500 text-white tabular-nums">{m.won}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-500 text-white tabular-nums">{m.lost}</Badge>
                          </TableCell>

                          <TableCell className="text-right tabular-nums">{m.pctWon}%</TableCell>
                          <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{sortedMatches.length}</span> partidos
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border bg-card px-2 py-1">
                      % Ganados: <span className="font-semibold text-foreground tabular-nums">{totals.pctWon}%</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      % Perdidos: <span className="font-semibold text-foreground tabular-nums">{totals.pctLost}%</span>
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Top:{" "}
                      <span className="font-semibold text-foreground">{topPlayer ? `#${topPlayer.number}` : "—"}</span>
                      {topPlayer ? <span className="text-muted-foreground"> ({topPlayerWins})</span> : null}
                    </span>
                    <span className="rounded-md border bg-card px-2 py-1">
                      Mejor Q: <span className="font-semibold text-foreground">{bestQLabel}</span>
                      {bestQuarters.length ? <span className="text-muted-foreground"> ({bestQWins})</span> : null}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      renderTable={() => null}
    />
  )
}
