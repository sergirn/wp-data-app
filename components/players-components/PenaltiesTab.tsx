"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { AlertCircle, Plus, Shield, Target, Trophy, Users, X, XCircle } from "lucide-react"

type Player = { id: number; name: string; number: number; is_goalkeeper?: boolean }

type PenaltyShooter = { playerId: number; scored: boolean }
type RivalPenalty = { id: number; result: "scored" | "saved" | "missed" }

type Props = {
  homeGoals: number
  awayGoals: number
  homeTeamName: string
  awayTeamName: string

  myClubName?: string | null
  opponent?: string

  fieldPlayers: Player[]
  goalkeepers: Player[]

  penaltyShooters: PenaltyShooter[]
  setPenaltyShooters: React.Dispatch<React.SetStateAction<PenaltyShooter[]>>

  rivalPenalties: RivalPenalty[]
  setRivalPenalties: React.Dispatch<React.SetStateAction<RivalPenalty[]>>

  penaltyGoalkeeperMap: Record<number, number>
  setPenaltyGoalkeeperMap: React.Dispatch<React.SetStateAction<Record<number, number>>>

  setShowPenaltyShooterDialog: React.Dispatch<React.SetStateAction<boolean>>
}

export function PenaltiesTab({
  homeGoals,
  awayGoals,
  homeTeamName,
  awayTeamName,
  myClubName,
  opponent,

  fieldPlayers,
  goalkeepers,

  penaltyShooters,
  setPenaltyShooters,

  rivalPenalties,
  setRivalPenalties,

  penaltyGoalkeeperMap,
  setPenaltyGoalkeeperMap,

  setShowPenaltyShooterDialog,
}: Props) {
  const myGoals = penaltyShooters.filter((s) => s.scored).length
  const rivalGoals = rivalPenalties.filter((p) => p.result === "scored").length

  return (
    <TabsContent value="penalties">
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>

              <div>
                <CardTitle className="text-lg sm:text-xl">Tanda de Penaltis</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Marcador: <span className="font-medium text-foreground tabular-nums">{homeGoals}-{awayGoals}</span>. Registra
                  los lanzamientos para determinar el ganador.
                </p>
              </div>
            </div>

            <Badge variant="secondary" className="mt-1">
              Obligatorio por empate
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Mi equipo */}
            <section className="rounded-xl border bg-card">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-none truncate">{myClubName || "Mi Equipo"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lanzadores</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Goles</p>
                  <p className="text-2xl font-bold tabular-nums">{myGoals}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {penaltyShooters.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center bg-muted/20">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Añade los jugadores que lanzaron penaltis
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {penaltyShooters.map((shooter, idx) => {
                      const player = fieldPlayers.find((p) => p.id === shooter.playerId)
                      if (!player) return null

                      const stateStyles = shooter.scored
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-destructive/30 bg-destructive/5"

                      return (
                        <div key={shooter.playerId} className={`rounded-lg border ${stateStyles}`}>
                          <div className="flex items-center gap-3 p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted font-bold tabular-nums">
                              {idx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                #{player.number} · {player.name}
                              </p>

                              <div className="mt-1 flex items-center gap-2">
                                <Badge variant={shooter.scored ? "default" : "destructive"} className="text-[11px]">
                                  {shooter.scored ? "Gol" : "Fallado"}
                                </Badge>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setPenaltyShooters((prev) =>
                                      prev.map((s) =>
                                        s.playerId === shooter.playerId ? { ...s, scored: !s.scored } : s,
                                      ),
                                    )
                                  }
                                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                >
                                  Cambiar resultado
                                </button>
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setPenaltyShooters((prev) => prev.filter((s) => s.playerId !== shooter.playerId))
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setShowPenaltyShooterDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir lanzador
                </Button>
              </div>
            </section>

            {/* Rival */}
            <section className="rounded-xl border bg-card">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-none truncate">{opponent || "Rival"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lanzamientos</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Goles</p>
                  <p className="text-2xl font-bold tabular-nums">{rivalGoals}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {rivalPenalties.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center bg-muted/20">
                    <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Añade los lanzamientos del equipo rival</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rivalPenalties.map((penalty, index) => {
                      const isScored = penalty.result === "scored"
                      const isSaved = penalty.result === "saved"

                      const wrapStyles =
                        penalty.result === "scored"
                          ? "border-destructive/30 bg-destructive/5"
                          : isSaved
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-amber-500/30 bg-amber-500/5"

                      return (
                        <div key={penalty.id} className={`rounded-lg border ${wrapStyles}`}>
                          <div className="flex items-start gap-3 p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted font-bold tabular-nums">
                              {index + 1}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">Lanzamiento #{index + 1}</p>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setRivalPenalties((prev) => prev.filter((p) => p.id !== penalty.id))
                                    setPenaltyGoalkeeperMap((prev) => {
                                      const next = { ...prev }
                                      delete next[penalty.id]
                                      return next
                                    })
                                  }}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isScored ? "default" : "outline"}
                                  onClick={() =>
                                    setRivalPenalties((prev) =>
                                      prev.map((p) => (p.id === penalty.id ? { ...p, result: "scored" } : p)),
                                    )
                                  }
                                >
                                  <Target className="mr-2 h-4 w-4" />
                                  Gol
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={penalty.result === "missed" ? "default" : "outline"}
                                  onClick={() =>
                                    setRivalPenalties((prev) =>
                                      prev.map((p) => (p.id === penalty.id ? { ...p, result: "missed" } : p)),
                                    )
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Falla
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isSaved ? "default" : "outline"}
                                  onClick={() =>
                                    setRivalPenalties((prev) =>
                                      prev.map((p) => (p.id === penalty.id ? { ...p, result: "saved" } : p)),
                                    )
                                  }
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Parada
                                </Button>

                                <Badge variant="secondary" className="ml-auto text-[11px]">
                                  {isScored ? "Gol" : isSaved ? "Parada" : "Fallado"}
                                </Badge>
                              </div>

                              {isSaved && (
                                <div className="mt-3 rounded-md border bg-background p-3">
                                  <Label className="text-xs text-muted-foreground">Portero que paró</Label>
                                  <select
                                    value={penaltyGoalkeeperMap[penalty.id] || ""}
                                    onChange={(e) => {
                                      const gkId = Number(e.target.value)
                                      if (gkId) setPenaltyGoalkeeperMap((prev) => ({ ...prev, [penalty.id]: gkId }))
                                    }}
                                    className="mt-2 w-full h-10 px-3 rounded-md border bg-background text-sm"
                                  >
                                    <option value="">Seleccionar portero...</option>
                                    {goalkeepers.map((gk) => (
                                      <option key={gk.id} value={gk.id}>
                                        #{gk.number} - {gk.name}
                                      </option>
                                    ))}
                                  </select>

                                  {penaltyGoalkeeperMap[penalty.id] && (
                                    <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <Shield className="h-3 w-3" />
                                      Se sumará a las estadísticas del portero
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setRivalPenalties((prev) => [...prev, { id: Date.now(), result: "missed" }])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir lanzamiento rival
                </Button>
              </div>
            </section>
          </div>

          {/* Resumen */}
          {penaltyShooters.length > 0 && rivalPenalties.length > 0 && (
            <div className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Resultado tanda</p>
                  <p className="text-lg font-semibold">
                    {homeTeamName}{" "}
                    <span className="tabular-nums">
                      {myGoals} - {rivalGoals}
                    </span>{" "}
                    {awayTeamName}
                  </p>
                </div>

                {myGoals !== rivalGoals ? (
                  <Badge className="text-sm px-3 py-1" variant={myGoals > rivalGoals ? "default" : "destructive"}>
                    {myGoals > rivalGoals ? (
                      <span className="inline-flex items-center gap-2">
                        <Trophy className="h-4 w-4" /> Victoria
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <XCircle className="h-4 w-4" /> Derrota
                      </span>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <span className="inline-flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> No puede acabar en empate
                    </span>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}
