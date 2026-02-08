"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PenaltyShootoutList } from "@/components/players-components/PenaltyShootoutList"

type PlayerMini = { id: number; name: string; number: number; photo_url?: string | null }

type LocalShooter = {
  id: number
  shot_order: number
  scored: boolean
  player_id: number
  players: PlayerMini | null
}

type RivalShot = {
  id: number
  shot_order: number
  scored: boolean
  result_type: "scored" | "missed" | "saved" | null
  goalkeeper_id: number | null
  goalkeeper: PlayerMini | null
}

type Period = {
  q: 1 | 2 | 3 | 4
  home: number | null | undefined
  away: number | null | undefined
  winner: PlayerMini | null
}

type Props = {
  clubName: string
  opponentName: string
  hasPenalties: boolean
  periods: Period[]
  penaltyHomeScore?: number | null
  penaltyAwayScore?: number | null
  homePenaltyShooters: LocalShooter[]
  rivalPenaltyShots: RivalShot[]
}

export function MatchPeriodsAndPenaltiesCard({
  clubName,
  opponentName,
  hasPenalties,
  periods,
  penaltyHomeScore,
  penaltyAwayScore,
  homePenaltyShooters,
  rivalPenaltyShots,
}: Props) {
  const hasPeriods = periods.some((p) => (p.home ?? 0) > 0 || (p.away ?? 0) > 0)

  if (!hasPeriods && !hasPenalties) return null

  return (
    <div className="mb-6 border-0 bg-transparent">
      <div>
        <Tabs defaultValue="parciales" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parciales">Parciales</TabsTrigger>
            <TabsTrigger value="penaltis" hidden={!hasPenalties}>
              Tanda de Penaltis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parciales" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {periods.map(({ q, home, away, winner }) => {
                const player = winner

                return (
                  <div key={q} className="space-y-3">
                  {/* Parcial */}
                  <div className="p-4 bg-muted/30 rounded-lg text-center border">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Parcial {q}</p>

                    <div className="flex items-center justify-between gap-3">
                      {/* Home */}
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-bold tabular-nums">{home ?? 0}</p>
                        {/* ✅ truncate real */}
                        <p className="text-xs text-muted-foreground truncate">{clubName}</p>
                      </div>

                      <p className="text-muted-foreground font-bold shrink-0">-</p>

                      {/* Away */}
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-bold tabular-nums">{away ?? 0}</p>
                        {/* ✅ truncate real */}
                        <p className="text-xs text-muted-foreground truncate">{opponentName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sprint */}
                  <div className="p-3 rounded-lg border bg-card/60">
                    {player ? (
                      <div className="mx-auto w-full max-w-[520px]">
                        {/* ✅ Mobile: vertical / sm+: horizontal */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Photo / number */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-18 h-12 sm:w-20 sm:h-14 overflow-hidden rounded-md flex items-center justify-center shrink-0">
                              {player.photo_url ? (
                                <img
                                  src={player.photo_url}
                                  alt={player.name}
                                  className="h-full w-full object-cover object-top"
                                  loading="lazy"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    img.src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <span className="font-bold text-lg tabular-nums">{player.number ?? "—"}</span>
                              )}
                            </div>

                            {/* ✅ In móvil, pone el label al lado y no rompe */}
                            <div className="min-w-0">
                              <span className="block text-xs font-semibold text-green-600 dark:text-green-400">
                                Sprint ganado
                              </span>

                              {/* ✅ no overflow: min-w-0 + truncate */}
                              <span className="block text-sm font-medium truncate">
                                <span className="tabular-nums">#{player.number}</span>
                                <span className="text-muted-foreground"> · </span>
                                {player.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <span className="text-sm font-semibold text-red-500 dark:text-red-400">
                          Sprint perdido
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          </TabsContent>
            <TabsContent value="penaltis" className="mt-6">
            {hasPenalties ? (
                <div className="space-y-6">

                <PenaltyShootoutList
                    clubName={clubName}
                    opponentName={opponentName}
                    homePenaltyShooters={homePenaltyShooters}
                    rivalPenaltyShots={rivalPenaltyShots}
                />
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-8">
                No hubo tanda de penaltis en este partido
                </p>
            )}
            </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
