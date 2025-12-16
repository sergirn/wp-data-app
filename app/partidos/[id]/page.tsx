import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Edit, TrendingUp, Target, Activity, Shield, CheckCircle, XCircle, User } from "lucide-react"
import { notFound } from "next/navigation"
import type { Match, MatchStats, Player, Club } from "@/lib/types"
import { DeleteMatchButton } from "@/components/delete-match-button"
import { MatchExportButton } from "@/components/match-export-button"
import { getCurrentProfile } from "@/lib/auth"
import { MatchSuperiorityChart } from "@/components/match-superiority-chart"
import { MatchInferiorityChart } from "@/components/match-inferiority-chart"

interface MatchWithStats extends Match {
  match_stats: (MatchStats & { players: Player })[]
  clubs: Club
}

interface PenaltyShootoutPlayer {
  id: number
  match_id: number
  player_id: number
  shot_order: number
  scored: boolean
  players: Player
}

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: match, error } = await supabase
    .from("matches")
    .select(
      `
      *,
      clubs (*),
      match_stats (
        *,
        players (*)
      )
    `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !match) {
    notFound()
  }

  const { data: penaltyShooters } = await supabase
    .from("penalty_shootout_players")
    .select(
      `
      id,
      shot_order,
      scored,
      player_id,
      goalkeeper_id,
      players:player_id (
        id,
        name,
        number
      )
    `,
    )
    .eq("match_id", params.id)
    .order("shot_order")

  // Fetch rival penalty shots (those without player_id)
  const { data: rivalPenaltyShots } = await supabase
    .from("penalty_shootout_players")
    .select("*")
    .eq("match_id", params.id)
    .is("player_id", null)
    .order("shot_order")

  const isTied = match.home_score === match.away_score
  const hasPenalties = isTied && (match.penalty_home_score != null || match.penalty_away_score != null)

  const homePenaltyShooters = penaltyShooters?.filter((s: any) => s.player_id !== null) || []
  const rivalPenaltyCount = rivalPenaltyShots?.length || 0
  // </CHANGE>

  let result: string
  let resultColor: string

  if (hasPenalties) {
    // Determine winner by penalties
    result = match.penalty_home_score! > match.penalty_away_score! ? "Victoria (Penaltis)" : "Derrota (Penaltis)"
    resultColor =
      match.penalty_home_score! > match.penalty_away_score!
        ? "bg-green-500/10 text-green-700 dark:text-green-300"
        : "bg-red-500/10 text-red-700 dark:text-red-300"
  } else {
    result =
      match.home_score > match.away_score ? "Victoria" : match.home_score < match.away_score ? "Derrota" : "Empate"
    resultColor =
      result === "Victoria"
        ? "bg-green-500/10 text-green-700 dark:text-green-300"
        : result === "Derrota"
          ? "bg-red-500/10 text-red-700 dark:text-red-300"
          : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
  }

  const fieldPlayersStats = match.match_stats
    .filter((stat: any) => !stat.players.is_goalkeeper)
    .sort((a: any, b: any) => a.players.number - b.players.number)

  const goalkeepersStats = match.match_stats
    .filter((stat: any) => stat.players.is_goalkeeper)
    .sort((a: any, b: any) => a.players.number - b.players.number)

  const teamTotals = calculateTeamTotals(match.match_stats)
  const superioridadStats = calculateSuperioridadStats(match.match_stats)
  const inferioridadStats = calculateInferioridadStats(match.match_stats) // Added

  const players = match.match_stats.map((s: any) => s.players)
  const stats = match.match_stats // Rename for clarity in the block section

  const canEdit = profile?.role === "admin" || profile?.role === "coach"

  const clubName = match.clubs?.short_name || match.clubs?.name || "Nuestro Equipo"
  // Define matchDate here
  const matchDate = new Date(match.date)

  // Renamed from 'stats' to 'matchStats' for clarity in the new section
  const matchStats = match.match_stats

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/partidos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Partidos
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">
                    {clubName} vs {match.opponent}
                  </CardTitle>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    {matchDate.toLocaleDateString("es-ES", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  {match.location && <span>• {match.location}</span>}
                  {match.season && <span>• {match.season}</span>}
                  {match.jornada && <span>• Jornada {match.jornada}</span>}
                </div>
              </div>
              <div className="text-center">
                <Badge className={`${resultColor} mb-4 text-sm font-semibold px-4 py-1.5`}>{result}</Badge>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold">{match.home_score}</p>
                    <p className="text-xs text-muted-foreground">{clubName}</p>
                  </div>
                  <div className="text-3xl font-bold text-muted-foreground">-</div>
                  <div className="text-center">
                    <p className="text-4xl font-bold">{match.away_score}</p>
                    <p className="text-xs text-muted-foreground">{match.opponent}</p>
                  </div>
                </div>
                {hasPenalties && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">Penaltis:</span>
                    <span className="text-lg font-bold">
                      {match.penalty_home_score} - {match.penalty_away_score}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {hasPenalties && penaltyShooters && penaltyShooters.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-3 text-center">Lanzadores de {clubName}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {penaltyShooters.map((shooter: PenaltyShootoutPlayer) => (
                    <Badge
                      key={shooter.id}
                      variant={shooter.scored ? "default" : "destructive"}
                      className="text-xs flex items-center gap-1.5 px-3 py-1"
                    >
                      {shooter.scored ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {shooter.players?.number && `#${shooter.players.number} `}
                      {shooter.players?.name || "Jugador rival"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>
          {match.notes && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Notas:</span> {match.notes}
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      <div className="grid gap-6 mb-6">
        {/* Totales del Equipo - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle>Totales del Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{teamTotals.goles}</p>
                <p className="text-sm text-muted-foreground">Goles</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{teamTotals.tiros}</p>
                <p className="text-sm text-muted-foreground">Tiros</p>
              </div>
              <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{teamTotals.faltas}</p>
                <p className="text-sm text-muted-foreground">Faltas</p>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{teamTotals.asistencias}</p>
                <p className="text-sm text-muted-foreground">Asistencias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Análisis de Superioridad/Inferioridad con Tabs */}
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="superioridad" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="superioridad" className="text-xs sm:text-sm">
                    Superioridad
                  </TabsTrigger>
                  <TabsTrigger value="inferioridad" className="text-xs sm:text-sm">
                    Inferioridad
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="superioridad" className="mt-4">
                  <MatchSuperiorityChart stats={superioridadStats} />
                </TabsContent>

                <TabsContent value="inferioridad" className="mt-4">
                  <MatchInferiorityChart stats={inferioridadStats} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bloqueos del Partido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stats summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {matchStats.reduce((sum, s) => sum + (s.acciones_bloqueo || 0), 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Bloqueos</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-lg">
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">{match.away_score}</p>
                    <p className="text-sm text-muted-foreground">Goles Recibidos</p>
                  </div>
                </div>

                {/* Players who blocked */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Jugadores con Bloqueos</h4>
                  <div className="space-y-2">
                    {matchStats
                      .filter((stat) => (stat.acciones_bloqueo || 0) > 0)
                      .map((stat) => {
                        const player = stat.players
                        return (
                          <div key={stat.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                {player?.number || "?"}
                              </div>
                              <span className="text-sm font-medium">{player?.name || "Desconocido"}</span>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10">
                              {stat.acciones_bloqueo} bloqueos
                            </Badge>
                          </div>
                        )
                      })}
                    {matchStats.filter((stat) => (stat.acciones_bloqueo || 0) > 0).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay bloqueos registrados</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {(match.q1_score || match.q2_score || match.q3_score || match.q4_score || hasPenalties) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalles del Partido</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="parciales" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="parciales">Parciales</TabsTrigger>
                <TabsTrigger value="penaltis" disabled={!hasPenalties}>
                  Tanda de Penaltis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="parciales" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { q: 1, home: match.q1_score, away: match.q1_score_rival, sprint: match.sprint1_winner },
                    { q: 2, home: match.q2_score, away: match.q2_score_rival, sprint: match.sprint2_winner },
                    { q: 3, home: match.q3_score, away: match.q3_score_rival, sprint: match.sprint3_winner },
                    { q: 4, home: match.q4_score, away: match.q4_score_rival, sprint: match.sprint4_winner },
                  ].map(({ q, home, away, sprint }) => (
                    <div key={q} className="p-4 bg-muted/30 rounded-lg text-center border">
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Parcial {q}</p>

                      <div className="flex justify-around items-center gap-2">
                        <div>
                          <p className="text-2xl font-bold">{home || 0}</p>
                          <p className="text-xs text-muted-foreground">{clubName}</p>
                        </div>

                        <p className="text-muted-foreground font-bold">-</p>

                        <div>
                          <p className="text-2xl font-bold">{away || 0}</p>
                          <p className="text-xs text-muted-foreground">{match.opponent}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        {sprint === 1 ? (
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            Sprint ganado
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-red-500 dark:text-red-400">Sprint perdido</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="penaltis" className="mt-6">
                {hasPenalties ? (
                  <div className="space-y-6">
                    {/* Resultado Final de Penaltis */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 rounded-lg p-6 border border-blue-500/20">
                      <p className="text-center text-sm text-muted-foreground mb-2">Resultado de Penaltis</p>
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                            {match.penalty_home_score}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{clubName}</p>
                        </div>
                        <p className="text-2xl font-bold text-muted-foreground">-</p>
                        <div className="text-center">
                          <p className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
                            {match.penalty_away_score}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{match.opponent}</p>
                        </div>
                      </div>
                    </div>

                    {/* Lanzadores */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Equipo Local */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-lg font-semibold">{clubName}</h3>
                        </div>
                        <div className="space-y-3">
                          {homePenaltyShooters.length > 0 ? (
                            homePenaltyShooters.map((shooter: any, idx: number) => (
                              <div
                                key={shooter.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                  shooter.scored
                                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                                    : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      #{shooter.players?.number} {shooter.players?.name}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  {shooter.scored ? (
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No hay lanzadores registrados
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Equipo Rival */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                          <h3 className="text-lg font-semibold">{match.opponent}</h3>
                        </div>
                        <div className="space-y-3">
                          {rivalPenaltyShots && rivalPenaltyShots.length > 0 ? (
                            rivalPenaltyShots.map((shot: any, idx: number) => (
                              <div
                                key={shot.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                  shot.scored
                                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                                    : shot.result_type === "saved"
                                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                                      : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium">Lanzamiento {idx + 1}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {shot.scored ? "Gol" : shot.result_type === "saved" ? "Parada" : "Fallo"}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  {shot.scored ? (
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                  ) : shot.result_type === "saved" ? (
                                    <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No hay lanzamientos registrados
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No hubo tanda de penaltis en este partido</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      {/* </CHANGE> */}

      {/* Field Players Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estadísticas - Jugadores de Campo</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {fieldPlayersStats.map((stat: any) => (
              <PlayerStatsAccordion key={stat.id} stat={stat} player={stat.players} />
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Goalkeepers Stats */}
      {goalkeepersStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Estadísticas - Porteros</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {goalkeepersStats.map((stat: any) => (
                <GoalkeeperStatsAccordion key={stat.id} stat={stat} player={stat.players} />
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
        <div className="w-full sm:w-auto">
          <MatchExportButton match={match} players={players} stats={stats} />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {canEdit && (
            <Button asChild>
              <Link href={`/nuevo-partido?matchId=${match.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Partido
              </Link>
            </Button>
          )}

          {canEdit && (
            <div className="flex items-center gap-2">
              <DeleteMatchButton matchId={match.id} />

              <span className="hidden sm:inline text-sm text-red-600 dark:text-red-400">Eliminar Partido</span>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function calculateTeamTotals(stats: any[]) {
  return stats.reduce(
    (acc, stat) => ({
      goles: acc.goles + (stat.goles_totales || 0),
      tiros: acc.tiros + (stat.tiros_totales || 0),
      faltas:
        acc.faltas +
        (stat.faltas_exp_20_1c1 || 0) +
        (stat.faltas_exp_20_boya || 0) +
        (stat.faltas_penalti || 0) +
        (stat.faltas_contrafaltas || 0),
      asistencias: acc.asistencias + (stat.acciones_asistencias || 0),
    }),
    { goles: 0, tiros: 0, faltas: 0, asistencias: 0 },
  )
}

function calculateSuperioridadStats(stats: any[]) {
  const anotadas = stats.reduce((acc, stat) => acc + (stat.goles_hombre_mas || 0), 0)
  const falladas = stats.reduce((acc, stat) => acc + (stat.tiros_hombre_mas || 0), 0)
  const total = anotadas + falladas
  const eficiencia = total > 0 ? ((anotadas / total) * 100).toFixed(1) : "0.0"

  return {
    anotadas,
    falladas,
    total,
    eficiencia: Number.parseFloat(eficiencia),
  }
}

function calculateInferioridadStats(stats: any[]) {
  const evitados = stats.reduce((acc, stat) => acc + (stat.portero_paradas_hombre_menos || 0), 0)
  const recibidos = stats.reduce((acc, stat) => acc + (stat.portero_goles_hombre_menos || 0), 0)
  const total = evitados + recibidos
  const eficiencia = total > 0 ? ((evitados / total) * 100).toFixed(1) : "0.0"

  return {
    evitados,
    recibidos,
    total,
    eficiencia: Number.parseFloat(eficiencia),
  }
}

function PlayerStatsAccordion({ stat, player }: { stat: MatchStats; player: Player }) {
  const hasStats =
    stat.goles_totales > 0 ||
    stat.tiros_totales > 0 ||
    stat.faltas_exp_20_1c1 > 0 ||
    stat.faltas_exp_20_boya > 0 ||
    stat.faltas_penalti > 0 ||
    stat.faltas_contrafaltas > 0 ||
    stat.acciones_asistencias > 0 ||
    stat.acciones_bloqueo > 0 ||
    stat.acciones_recuperacion > 0 ||
    stat.acciones_rebote > 0 ||
    stat.acciones_exp_provocada > 0 ||
    stat.acciones_penalti_provocado > 0 ||
    stat.acciones_recibir_gol > 0 ||
    stat.acciones_perdida_poco > 0

  // Calculated metrics
  const totalShots = stat.goles_totales + stat.tiros_totales
  const shootingEfficiency = totalShots > 0 ? ((stat.goles_totales / totalShots) * 100).toFixed(1) : "0.0"
  const superiorityGoals = stat.goles_hombre_mas || 0
  const superiorityAttempts = superiorityGoals + (stat.tiros_hombre_mas || 0)
  const superiorityEfficiency =
    superiorityAttempts > 0 ? ((superiorityGoals / superiorityAttempts) * 100).toFixed(1) : "0.0"
  const totalActions =
    (stat.acciones_asistencias || 0) +
    (stat.acciones_bloqueo || 0) +
    (stat.acciones_recuperacion || 0) +
    (stat.acciones_rebote || 0)
  const totalFouls =
    (stat.faltas_exp_20_1c1 || 0) +
    (stat.faltas_exp_20_boya || 0) +
    (stat.faltas_penalti || 0) +
    (stat.faltas_contrafaltas || 0)

  if (!hasStats) {
    return (
      <AccordionItem value={`player-${stat.id}`} className="border rounded-lg px-4 bg-muted/30">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 w-full">
            {player.photo_url ? (
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-muted">
                <img
                  src={player.photo_url || "/placeholder.svg"}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-muted-foreground font-bold text-lg">{player.number}</span>
              </div>
            )}
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-lg">{player.name}</h3>
              <p className="text-sm text-muted-foreground">Sin estadísticas registradas</p>
            </div>
          </div>
        </AccordionTrigger>
      </AccordionItem>
    )
  }

  return (
    <AccordionItem value={`player-${stat.id}`} className="border rounded-lg px-4 bg-card">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 w-full">
          {player.photo_url ? (
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary shadow-sm">
              <img
                src={player.photo_url || "/placeholder.svg"}
                alt={player.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-primary-foreground font-bold text-xl">{player.number}</span>
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{player.name}</h3>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                Jugador
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                <Target className="w-3 h-3 mr-1" />
                {stat.goles_totales} goles
              </Badge>
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300">
                <TrendingUp className="w-3 h-3 mr-1" />
                {shootingEfficiency}% efic.
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300">
                <Activity className="w-3 h-3 mr-1" />
                {totalActions} acciones
              </Badge>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Tabs defaultValue="overview" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs md:text-sm">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs md:text-sm">
              Goles
            </TabsTrigger>
            <TabsTrigger value="shots" className="text-xs md:text-sm">
              Tiros
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs md:text-sm">
              Acciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Eficiencia de Tiro"
                value={`${shootingEfficiency}%`}
                subtitle={`${stat.goles_totales}/${totalShots} tiros`}
                color="blue"
              />
              <MetricCard
                label="Superioridad"
                value={`${superiorityEfficiency}%`}
                subtitle={`${superiorityGoals} goles en sup.`}
                color="green"
              />
              <MetricCard
                label="Total Acciones"
                value={totalActions.toString()}
                subtitle="Acciones positivas"
                color="purple"
              />
              <MetricCard
                label="Faltas Cometidas"
                value={totalFouls.toString()}
                subtitle="Faltas totales"
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Desglose de Goles ({stat.goles_totales})
                  </h4>
                  <div className="space-y-2 text-sm">
                    <StatRow label="Boya/Jugada" value={stat.goles_boya_jugada} />
                    <StatRow label="Hombre +" value={stat.goles_hombre_mas} />
                    <StatRow label="Lanzamiento" value={stat.goles_lanzamiento} />
                    <StatRow label="Dir +5m" value={stat.goles_dir_mas_5m} />
                    <StatRow label="Contraataque" value={stat.goles_contraataque} />
                    <StatRow label="Penalti Anotado" value={stat.goles_penalti_anotado} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Acciones Destacadas
                  </h4>
                  <div className="space-y-2 text-sm">
                    <StatRow label="Asistencias" value={stat.acciones_asistencias} />
                    <StatRow label="Bloqueos" value={stat.acciones_bloqueo} />
                    <StatRow label="Recuperaciones" value={stat.acciones_recuperacion} />
                    <StatRow label="Rebotes" value={stat.acciones_rebote} />
                    <StatRow label="Exp. Provocadas" value={stat.acciones_exp_provocada} />
                    <StatRow label="Penaltis Provocados" value={stat.acciones_penalti_provocado} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stat.goles_boya_jugada > 0 && (
                <StatCard label="Boya/Jugada" value={stat.goles_boya_jugada} color="blue" />
              )}
              {stat.goles_hombre_mas > 0 && <StatCard label="Hombre +" value={stat.goles_hombre_mas} color="green" />}
              {stat.goles_lanzamiento > 0 && (
                <StatCard label="Lanzamiento" value={stat.goles_lanzamiento} color="blue" />
              )}
              {stat.goles_dir_mas_5m > 0 && <StatCard label="Dir +5m" value={stat.goles_dir_mas_5m} color="purple" />}
              {stat.goles_contraataque > 0 && (
                <StatCard label="Contraataque" value={stat.goles_contraataque} color="green" />
              )}
              {stat.goles_penalti_anotado > 0 && (
                <StatCard label="Penalti Anotado" value={stat.goles_penalti_anotado} color="blue" />
              )}
            </div>
            {stat.goles_totales === 0 && (
              <p className="text-center text-muted-foreground py-8">Sin goles en este partido</p>
            )}
          </TabsContent>

          <TabsContent value="shots" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stat.tiros_hombre_mas > 0 && (
                <StatCard label="Hombre + (fallado)" value={stat.tiros_hombre_mas} color="orange" />
              )}
              {stat.tiros_penalti_fallado > 0 && (
                <StatCard label="Penalti Fallado" value={stat.tiros_penalti_fallado} color="red" />
              )}
              {stat.tiros_corner > 0 && <StatCard label="Corner" value={stat.tiros_corner} color="blue" />}
              {stat.tiros_fuera > 0 && <StatCard label="Fuera" value={stat.tiros_fuera} color="gray" />}
              {stat.tiros_parados > 0 && <StatCard label="Parados" value={stat.tiros_parados} color="orange" />}
              {stat.tiros_bloqueado > 0 && <StatCard label="Bloqueado" value={stat.tiros_bloqueado} color="red" />}
            </div>
            {stat.tiros_totales === 0 && (
              <p className="text-center text-muted-foreground py-8">Sin tiros fallados en este partido</p>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stat.acciones_asistencias > 0 && (
                <StatCard label="Asistencias" value={stat.acciones_asistencias} color="green" />
              )}
              {stat.acciones_recuperacion > 0 && (
                <StatCard label="Recuperación" value={stat.acciones_recuperacion} color="blue" />
              )}
              {stat.portero_acciones_perdida_pos > 0 && (
                <StatCard label="Pérdida de Pos" value={stat.portero_acciones_perdida_pos} color="orange" />
              )}
              {stat.acciones_exp_provocada > 0 && (
                <StatCard label="Exp Provocada" value={stat.acciones_exp_provocada} color="green" />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  )
}

function GoalkeeperStatsAccordion({ stat, player }: { stat: MatchStats; player: Player }) {
  const hasStats =
    stat.portero_paradas_totales > 0 ||
    stat.portero_goles_boya_parada > 0 ||
    stat.portero_goles_hombre_menos > 0 ||
    stat.portero_goles_dir_mas_5m > 0 ||
    stat.portero_goles_contraataque > 0 ||
    stat.portero_goles_penalti > 0 ||
    stat.acciones_asistencias > 0 ||
    stat.acciones_recuperacion > 0 ||
    stat.portero_acciones_perdida_pos > 0

  const totalGoalsReceived =
    (stat.portero_goles_boya_parada || 0) +
    (stat.portero_goles_hombre_menos || 0) +
    (stat.portero_goles_dir_mas_5m || 0) +
    (stat.portero_goles_contraataque || 0) +
    (stat.portero_goles_penalti || 0)

  // Calculated metrics for goalkeepers
  const totalShotsReceived = (stat.portero_paradas_totales || 0) + totalGoalsReceived
  const savePercentage =
    totalShotsReceived > 0 ? (((stat.portero_paradas_totales || 0) / totalShotsReceived) * 100).toFixed(1) : "0.0"
  const goalsPerMatch = totalGoalsReceived
  const savesPerMatch = stat.portero_paradas_totales || 0
  const penaltySaves = stat.portero_paradas_penalti_parado || 0
  const penaltyReceived = (stat.portero_paradas_penalti_parado || 0) + (stat.portero_goles_penalti || 0)
  const penaltySaveRate = penaltyReceived > 0 ? ((penaltySaves / penaltyReceived) * 100).toFixed(1) : "0.0"

  if (!hasStats) {
    return (
      <AccordionItem value={`goalkeeper-${stat.id}`} className="border rounded-lg px-4 bg-muted/30">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 w-full">
            {player.photo_url ? (
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-muted">
                <img
                  src={player.photo_url || "/placeholder.svg"}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-muted-foreground font-bold text-lg">{player.number}</span>
              </div>
            )}
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-lg">{player.name}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  Portero
                </Badge>
                <p className="text-sm text-muted-foreground">Sin estadísticas registradas</p>
              </div>
            </div>
          </div>
        </AccordionTrigger>
      </AccordionItem>
    )
  }

  return (
    <AccordionItem value={`goalkeeper-${stat.id}`} className="border rounded-lg px-4 bg-card">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 w-full">
          {player.photo_url ? (
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary shadow-sm">
              <img
                src={player.photo_url || "/placeholder.svg"}
                alt={player.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-primary-foreground font-bold text-xl">{player.number}</span>
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{player.name}</h3>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                Portero
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300">
                <Shield className="w-3 h-3 mr-1" />
                {stat.portero_paradas_totales} paradas
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                <TrendingUp className="w-3 h-3 mr-1" />
                {savePercentage}% efic.
              </Badge>
              <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-300">
                {goalsPerMatch} goles recib.
              </Badge>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Tabs defaultValue="overview" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs md:text-sm">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="saves" className="text-xs md:text-sm">
              Paradas
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs md:text-sm">
              Goles
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs md:text-sm">
              Acciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Rendimiento General
                  </h4>
                  <div className="space-y-2 text-sm">
                    <StatRow label="Paradas Totales" value={stat.portero_paradas_totales} />
                    <StatRow label="% Eficiencia" value={`${savePercentage}%`} />
                    <StatRow label="Goles Recibidos" value={totalGoalsReceived} highlight />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Paradas Detalladas
                  </h4>
                  <div className="space-y-2 text-sm">
                    <StatRow label="Parada + Recup" value={stat.portero_tiros_parada_recup} />
                    <StatRow label="+6m" value={stat.portero_paradas_fuera} />
                    <StatRow label="Penalti Parado" value={stat.portero_paradas_penalti_parado} />
                    <StatRow label="Paradas Hombre -" value={stat.portero_paradas_hombre_menos} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="saves" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stat.portero_tiros_parada_recup > 0 && (
                <StatCard label="Parada + Recup" value={stat.portero_tiros_parada_recup} color="green" />
              )}
              {stat.portero_paradas_fuera > 0 && (
                <StatCard label="+6m" value={stat.portero_paradas_fuera} color="blue" />
              )}
              {stat.portero_paradas_penalti_parado > 0 && (
                <StatCard label="Penalti Parado" value={stat.portero_paradas_penalti_parado} color="green" />
              )}
              {stat.portero_paradas_hombre_menos > 0 && (
                <StatCard label="Hombre -" value={stat.portero_paradas_hombre_menos} color="purple" />
              )}
            </div>
            {(stat.portero_paradas_totales || 0) === 0 && (
              <p className="text-center text-muted-foreground py-8">Sin paradas en este partido</p>
            )}
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <Card className="bg-red-500/5">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-sm mb-3 text-red-700 dark:text-red-300">
                  Goles Encajados ({totalGoalsReceived})
                </h4>
                <div className="space-y-2 text-sm">
                  <StatRow label="Boya/Parada" value={stat.portero_goles_boya_parada} />
                  <StatRow label="Hombre Menos" value={stat.portero_goles_hombre_menos} />
                  <StatRow label="Dir +5m" value={stat.portero_goles_dir_mas_5m} />
                  <StatRow label="Contraataque" value={stat.portero_goles_contraataque} />
                  <StatRow label="Penalti" value={stat.portero_goles_penalti} />
                </div>
              </CardContent>
            </Card>
            {totalGoalsReceived === 0 && (
              <p className="text-center text-muted-foreground py-8">Sin goles encajados en este partido</p>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stat.acciones_asistencias > 0 && (
                <StatCard label="Asistencias" value={stat.acciones_asistencias} color="green" />
              )}
              {stat.acciones_recuperacion > 0 && (
                <StatCard label="Recuperación" value={stat.acciones_recuperacion} color="blue" />
              )}
              {stat.portero_acciones_perdida_pos > 0 && (
                <StatCard label="Pérdida de Pos" value={stat.portero_acciones_perdida_pos} color="orange" />
              )}
              {stat.acciones_exp_provocada > 0 && (
                <StatCard label="Exp Provocada" value={stat.acciones_exp_provocada} color="green" />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  )
}

function MetricCard({
  label,
  value,
  subtitle,
  color,
}: { label: string; value: string; subtitle: string; color: string }) {
  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/20",
    green: "bg-green-500/10 border-green-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
    orange: "bg-orange-500/10 border-orange-500/20",
    red: "bg-red-500/10 border-red-500/20",
    gray: "bg-gray-500/10 border-gray-500/20",
  }

  const textColorClasses = {
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-green-700 dark:text-green-300",
    purple: "text-purple-700 dark:text-purple-300",
    orange: "text-orange-700 dark:text-orange-300",
    red: "text-red-700 dark:text-red-300",
    gray: "text-gray-700 dark:text-gray-300",
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColorClasses[color as keyof typeof textColorClasses]}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
    green: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300",
    red: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300",
    gray: "bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-300",
  }

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <p className="text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function StatRow({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  if (!value || value === 0) return null

  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className={`text-muted-foreground ${highlight ? "font-semibold" : ""}`}>{label}</span>
      <span className={`font-semibold ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  )
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted px-3 py-1.5 rounded">
      <span className="text-muted-foreground">{label}:</span> <span className="font-semibold ml-1">{value}</span>
    </div>
  )
}
