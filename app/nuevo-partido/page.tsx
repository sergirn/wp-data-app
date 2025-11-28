"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Users, Shield, Target, Activity, CheckCircle, XCircle, Minus, Plus } from "lucide-react"
import Link from "next/link"
import type { Player, MatchStats } from "@/lib/types"

interface QuarterScore {
  home: number
  away: number
}

interface PenaltyShooter {
  playerId: number
  playerName: string
  playerNumber: number
  scored: boolean
}

interface OpponentPenalty {
  order: number
  result: "goal" | "miss" | "save"
  goalkeeperId?: number
}

export default function NuevoPartidoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const matchId = searchParams?.get("matchId")
  const isEditing = !!matchId
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [activePlayers, setActivePlayers] = useState<number[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null)
  const [selectedGoalkeeper, setSelectedGoalkeeper] = useState<number | null>(null)

  // Match basic info
  const [matchDate, setMatchDate] = useState("")
  const [opponent, setOpponent] = useState("")
  const [location, setLocation] = useState("")
  const [season, setSeason] = useState("")
  const [jornada, setJornada] = useState("")
  const [notes, setNotes] = useState("")
  const [isHome, setIsHome] = useState(true)
  const [maxPlayers, setMaxPlayers] = useState(13)

  // Quarter scores
  const [quarterScores, setQuarterScores] = useState<Record<number, QuarterScore>>({
    1: { home: 0, away: 0 },
    2: { home: 0, away: 0 },
    3: { home: 0, away: 0 },
    4: { home: 0, away: 0 },
  })

  // Sprint winners
  const [sprintWinners, setSprintWinners] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  })

  // Penalty shootout
  const [showPenaltyTab, setShowPenaltyTab] = useState(false)
  const [penaltyShooters, setPenaltyShooters] = useState<PenaltyShooter[]>([])
  const [opponentPenalties, setOpponentPenalties] = useState<OpponentPenalty[]>([])
  const [showPenaltyShooterDialog, setShowPenaltyShooterDialog] = useState(false)

  // Player stats
  const [playerStats, setPlayerStats] = useState<Record<number, Partial<MatchStats>>>({})

  useEffect(() => {
    loadPlayers()
    if (isEditing && matchId) {
      loadMatchData(matchId)
    }
  }, [isEditing, matchId])

  useEffect(() => {
    // Check if scores are tied to show penalty tab
    const homeTotal = Object.values(quarterScores).reduce((sum, q) => sum + q.home, 0)
    const awayTotal = Object.values(quarterScores).reduce((sum, q) => sum + q.away, 0)
    setShowPenaltyTab(homeTotal === awayTotal && homeTotal > 0)
  }, [quarterScores])

  const loadPlayers = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión",
          variant: "destructive",
        })
        return
      }

      const { data: profile } = await supabase.from("profiles").select("club_id").eq("id", user.id).single()

      if (!profile?.club_id) {
        toast({
          title: "Error",
          description: "No tienes un club asignado",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase.from("players").select("*").eq("club_id", profile.club_id).order("number")

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error("Error loading players:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los jugadores",
        variant: "destructive",
      })
    }
  }

  const loadMatchData = async (id: string) => {
    try {
      const supabase = createClient()

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("*, match_stats(*)")
        .eq("id", id)
        .single()

      if (matchError) throw matchError

      // Load basic info
      setMatchDate(match.match_date)
      setOpponent(match.opponent)
      setLocation(match.location || "")
      setSeason(match.season || "")
      setJornada(match.jornada?.toString() || "")
      setNotes(match.notes || "")
      setIsHome(match.is_home)
      setMaxPlayers(match.max_players_on_field || 13)

      // Load quarter scores
      setQuarterScores({
        1: { home: match.q1_score || 0, away: match.q1_score_rival || 0 },
        2: { home: match.q2_score || 0, away: match.q2_score_rival || 0 },
        3: { home: match.q3_score || 0, away: match.q3_score_rival || 0 },
        4: { home: match.q4_score || 0, away: match.q4_score_rival || 0 },
      })

      // Load sprint winners
      setSprintWinners({
        1: match.sprint1_winner || 0,
        2: match.sprint2_winner || 0,
        3: match.sprint3_winner || 0,
        4: match.sprint4_winner || 0,
      })

      // Load player stats
      const statsMap: Record<number, Partial<MatchStats>> = {}
      const activePlayerIds: number[] = []

      match.match_stats.forEach((stat: any) => {
        statsMap[stat.player_id] = stat
        activePlayerIds.push(stat.player_id)
      })

      setPlayerStats(statsMap)
      setActivePlayers(activePlayerIds)

      // Load penalty shootout data
      if (match.penalty_home_score !== null && match.penalty_away_score !== null) {
        const { data: penalties } = await supabase
          .from("penalty_shootout_players")
          .select("*, players(*)")
          .eq("match_id", id)
          .order("shot_order")

        if (penalties) {
          const shooters: PenaltyShooter[] = []
          const opponents: OpponentPenalty[] = []

          penalties.forEach((p: any) => {
            if (p.player_id) {
              shooters.push({
                playerId: p.player_id,
                playerName: p.players.name,
                playerNumber: p.players.number,
                scored: p.scored,
              })
            } else {
              opponents.push({
                order: p.shot_order,
                result: p.result_type as "goal" | "miss" | "save",
                goalkeeperId: p.goalkeeper_id,
              })
            }
          })

          setPenaltyShooters(shooters)
          setOpponentPenalties(opponents)
          setShowPenaltyTab(true)
        }
      }
    } catch (error) {
      console.error("Error loading match:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el partido",
        variant: "destructive",
      })
    }
  }

  const calculateScores = () => {
    const homeScore = Object.values(quarterScores).reduce((sum, q) => sum + q.home, 0)
    const awayScore = Object.values(quarterScores).reduce((sum, q) => sum + q.away, 0)
    return { homeScore, awayScore }
  }

  const togglePlayerActive = (playerId: number) => {
    if (activePlayers.includes(playerId)) {
      setActivePlayers(activePlayers.filter((id) => id !== playerId))
      const newStats = { ...playerStats }
      delete newStats[playerId]
      setPlayerStats(newStats)
    } else {
      setActivePlayers([...activePlayers, playerId])
      setPlayerStats({
        ...playerStats,
        [playerId]: initializePlayerStats(playerId),
      })
    }
  }

  const initializePlayerStats = (playerId: number): Partial<MatchStats> => {
    const player = players.find((p) => p.id === playerId)
    const isGoalkeeper = player?.is_goalkeeper || false

    if (isGoalkeeper) {
      return {
        player_id: playerId,
        goles_totales: 0,
        tiros_totales: 0,
        portero_gol: 0,
        portero_gol_superioridad: 0,
        portero_fallo_superioridad: 0,
        portero_goles_totales: 0,
        portero_goles_boya: 0,
        portero_goles_hombre_menos: 0,
        portero_goles_dir_mas_5m: 0,
        portero_goles_contraataque: 0,
        portero_goles_penalti: 0,
        portero_goles_lanzamiento: 0,
        portero_goles_penalti_encajado: 0,
        portero_goles_boya_parada: 0,
        portero_paradas_totales: 0,
        portero_paradas_parada_recup: 0,
        portero_paradas_fuera: 0,
        portero_paradas_penalti_parado: 0,
        portero_paradas_hombre_menos: 0,
        portero_paradas_pedida: 0,
        portero_paradas_parada_fuera: 0,
        portero_tiros_parado: 0,
        portero_tiros_parada_recup: 0,
        portero_acciones_asistencias: 0,
        portero_acciones_recuperacion: 0,
        portero_acciones_rebote: 0,
        portero_acciones_perdida_pos: 0,
        portero_acciones_exp_provocada: 0,
        portero_acciones_gol_recibido: 0,
        portero_faltas_exp_3_int: 0,
        portero_exp_provocada: 0,
        portero_penalti_provocado: 0,
        portero_recibir_gol: 0,
      }
    } else {
      return {
        player_id: playerId,
        goles_totales: 0,
        goles_boya_jugada: 0,
        goles_hombre_mas: 0,
        goles_lanzamiento: 0,
        goles_dir_mas_5m: 0,
        goles_contraataque: 0,
        goles_penalti_anotado: 0,
        goles_boya_cada: 0,
        goles_penalti_juego: 0,
        goles_penalti_fallo: 0,
        goles_corner: 0,
        goles_fuera: 0,
        goles_parados: 0,
        goles_bloqueado: 0,
        goles_eficiencia: 0,
        tiros_totales: 0,
        tiros_hombre_mas: 0,
        tiros_penalti_fallado: 0,
        tiros_corner: 0,
        tiros_fuera: 0,
        tiros_parados: 0,
        tiros_bloqueado: 0,
        tiros_eficiencia: 0,
        tiros_boya_cada: 0,
        tiros_lanzamiento: 0,
        tiros_dir_mas_5m: 0,
        tiros_contraataque: 0,
        tiros_penalti_juego: 0,
        tiros_penalti_fallo: 0,
        faltas_exp_20_1c1: 0,
        faltas_exp_20_boya: 0,
        faltas_penalti: 0,
        faltas_contrafaltas: 0,
        faltas_exp_3_int: 0,
        faltas_exp_3_bruta: 0,
        acciones_bloqueo: 0,
        acciones_asistencias: 0,
        acciones_recuperacion: 0,
        acciones_rebote: 0,
        acciones_exp_provocada: 0,
        acciones_penalti_provocado: 0,
        acciones_recibir_gol: 0,
        acciones_perdida_poco: 0,
        acciones_penalti_provocado_new: 0,
      }
    }
  }

  const updatePlayerStat = (playerId: number, field: keyof MatchStats, value: number) => {
    setPlayerStats({
      ...playerStats,
      [playerId]: {
        ...playerStats[playerId],
        [field]: value,
      },
    })
  }

  const addMyTeamPenalty = (playerId: number, scored: boolean) => {
    const player = players.find((p) => p.id === playerId)
    if (!player) return

    setPenaltyShooters([
      ...penaltyShooters,
      {
        playerId: player.id,
        playerName: player.name,
        playerNumber: player.number,
        scored,
      },
    ])
    setShowPenaltyShooterDialog(false)
  }

  const removeMyTeamPenalty = (index: number) => {
    setPenaltyShooters(penaltyShooters.filter((_, i) => i !== index))
  }

  const addOpponentPenalty = (result: "goal" | "miss" | "save", goalkeeperId?: number) => {
    setOpponentPenalties([
      ...opponentPenalties,
      {
        order: opponentPenalties.length + 1,
        result,
        goalkeeperId,
      },
    ])
  }

  const removeOpponentPenalty = (index: number) => {
    setOpponentPenalties(opponentPenalties.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!matchDate || !opponent) {
      toast({
        title: "Error",
        description: "Fecha y rival son obligatorios",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("No user found")

      const { data: profile } = await supabase.from("profiles").select("club_id").eq("id", user.id).single()

      if (!profile?.club_id) throw new Error("No club_id found")

      const { homeScore, awayScore } = calculateScores()

      // Calculate penalty scores
      const penaltyHomeScore = showPenaltyTab ? penaltyShooters.filter((p) => p.scored).length : null
      const penaltyAwayScore = showPenaltyTab ? opponentPenalties.filter((p) => p.result === "goal").length : null

      const matchData = {
        match_date: matchDate,
        opponent,
        location: location || null,
        home_score: homeScore,
        away_score: awayScore,
        is_home: isHome,
        season: season || null,
        jornada: jornada ? Number.parseInt(jornada) : null,
        notes: notes || null,
        club_id: profile.club_id,
        max_players_on_field: maxPlayers,
        q1_score: quarterScores[1].home,
        q1_score_rival: quarterScores[1].away,
        q2_score: quarterScores[2].home,
        q2_score_rival: quarterScores[2].away,
        q3_score: quarterScores[3].home,
        q3_score_rival: quarterScores[3].away,
        q4_score: quarterScores[4].home,
        q4_score_rival: quarterScores[4].away,
        sprint1_winner: sprintWinners[1] || null,
        sprint2_winner: sprintWinners[2] || null,
        sprint3_winner: sprintWinners[3] || null,
        sprint4_winner: sprintWinners[4] || null,
        penalty_home_score: penaltyHomeScore,
        penalty_away_score: penaltyAwayScore,
      }

      let savedMatchId: number

      if (isEditing && matchId) {
        // Update existing match
        const { error: matchError } = await supabase.from("matches").update(matchData).eq("id", matchId)

        if (matchError) throw matchError

        // Delete existing stats and penalties
        await supabase.from("match_stats").delete().eq("match_id", matchId)
        await supabase.from("penalty_shootout_players").delete().eq("match_id", matchId)

        savedMatchId = Number.parseInt(matchId)
      } else {
        // Create new match
        const { data: newMatch, error: matchError } = await supabase.from("matches").insert(matchData).select().single()

        if (matchError) throw matchError
        savedMatchId = newMatch.id
      }

      // Save player stats
      const statsToInsert = activePlayers.map((playerId) => {
        const stats = playerStats[playerId] || initializePlayerStats(playerId)
        const player = players.find((p) => p.id === playerId)

        // Calculate totals for goalkeeper
        if (player?.is_goalkeeper) {
          const totalGoalsReceived =
            (stats.portero_gol || 0) +
            (stats.portero_gol_superioridad || 0) +
            (stats.portero_goles_boya || 0) +
            (stats.portero_goles_hombre_menos || 0) +
            (stats.portero_goles_dir_mas_5m || 0) +
            (stats.portero_goles_contraataque || 0) +
            (stats.portero_goles_penalti || 0) +
            (stats.portero_goles_lanzamiento || 0) +
            (stats.portero_goles_penalti_encajado || 0) +
            (stats.portero_goles_boya_parada || 0)

          return {
            ...stats,
            match_id: savedMatchId,
            player_id: playerId,
            portero_goles_totales: totalGoalsReceived,
          }
        }

        // Calculate totals for field players
        const totalGoals =
          (stats.goles_boya_jugada || 0) +
          (stats.goles_hombre_mas || 0) +
          (stats.goles_lanzamiento || 0) +
          (stats.goles_dir_mas_5m || 0) +
          (stats.goles_contraataque || 0) +
          (stats.goles_penalti_anotado || 0)

        const totalShots =
          (stats.tiros_hombre_mas || 0) +
          (stats.tiros_penalti_fallado || 0) +
          (stats.tiros_corner || 0) +
          (stats.tiros_fuera || 0) +
          (stats.tiros_parados || 0) +
          (stats.tiros_bloqueado || 0)

        return {
          ...stats,
          match_id: savedMatchId,
          player_id: playerId,
          goles_totales: totalGoals,
          tiros_totales: totalGoals + totalShots,
        }
      })

      if (statsToInsert.length > 0) {
        const { error: statsError } = await supabase.from("match_stats").insert(statsToInsert)

        if (statsError) throw statsError
      }

      // Save penalty shootout data
      if (showPenaltyTab) {
        const penaltyData = []

        // Save our team's penalties
        penaltyShooters.forEach((shooter, index) => {
          penaltyData.push({
            match_id: savedMatchId,
            player_id: shooter.playerId,
            shot_order: index + 1,
            scored: shooter.scored,
            result_type: shooter.scored ? "goal" : "miss",
          })
        })

        // Save opponent's penalties
        opponentPenalties.forEach((penalty) => {
          // Update goalkeeper stats for saves
          if (penalty.result === "save" && penalty.goalkeeperId) {
            const gkStats = playerStats[penalty.goalkeeperId] || initializePlayerStats(penalty.goalkeeperId)
            gkStats.portero_paradas_penalti_parado = (gkStats.portero_paradas_penalti_parado || 0) + 1
            setPlayerStats({
              ...playerStats,
              [penalty.goalkeeperId]: gkStats,
            })
          }

          penaltyData.push({
            match_id: savedMatchId,
            player_id: null,
            shot_order: penalty.order,
            scored: penalty.result === "goal",
            result_type: penalty.result,
          })
        })

        if (penaltyData.length > 0) {
          const { error: penaltyError } = await supabase.from("penalty_shootout_players").insert(penaltyData)

          if (penaltyError) throw penaltyError
        }
      }

      toast({
        title: "Éxito",
        description: isEditing ? "Partido actualizado correctamente" : "Partido guardado correctamente",
      })

      router.push(`/partidos/${savedMatchId}`)
    } catch (error: any) {
      console.error("Error saving match:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el partido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fieldPlayers = players.filter((p) => !p.is_goalkeeper)
  const goalkeepers = players.filter((p) => p.is_goalkeeper)
  const activeFieldPlayers = fieldPlayers.filter((p) => activePlayers.includes(p.id))
  const activeGoalkeepers = goalkeepers.filter((p) => activePlayers.includes(p.id))

  const { homeScore, awayScore } = calculateScores()

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
            <CardTitle className="text-2xl">{isEditing ? "Editar Partido" : "Nuevo Partido"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="parciales">Parciales</TabsTrigger>
                {showPenaltyTab && (
                  <TabsTrigger value="penaltis" className="relative">
                    Penaltis
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  </TabsTrigger>
                )}
                <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
                <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                <TabsTrigger value="porteros">Porteros</TabsTrigger>
              </TabsList>

              {/* Info Tab */}
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opponent">Rival *</Label>
                    <Input
                      id="opponent"
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      placeholder="Nombre del equipo rival"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Piscina/Ciudad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ishome">Local/Visitante</Label>
                    <Select value={isHome ? "home" : "away"} onValueChange={(v) => setIsHome(v === "home")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Local</SelectItem>
                        <SelectItem value="away">Visitante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="season">Temporada</Label>
                    <Input
                      id="season"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      placeholder="2024-25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jornada">Jornada</Label>
                    <Input
                      id="jornada"
                      type="number"
                      value={jornada}
                      onChange={(e) => setJornada(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observaciones del partido..."
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Parciales Tab */}
              <TabsContent value="parciales" className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold mb-2">
                    {homeScore} - {awayScore}
                  </div>
                  <p className="text-muted-foreground">Resultado Final</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((quarter) => (
                    <Card key={quarter}>
                      <CardHeader>
                        <CardTitle className="text-lg">Cuarto {quarter}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nuestro equipo</Label>
                          <Input
                            type="number"
                            min="0"
                            value={quarterScores[quarter].home}
                            onChange={(e) =>
                              setQuarterScores({
                                ...quarterScores,
                                [quarter]: {
                                  ...quarterScores[quarter],
                                  home: Number.parseInt(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rival</Label>
                          <Input
                            type="number"
                            min="0"
                            value={quarterScores[quarter].away}
                            onChange={(e) =>
                              setQuarterScores({
                                ...quarterScores,
                                [quarter]: {
                                  ...quarterScores[quarter],
                                  away: Number.parseInt(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ganador del sprint</Label>
                          <Select
                            value={sprintWinners[quarter]?.toString() || "0"}
                            onValueChange={(v) =>
                              setSprintWinners({
                                ...sprintWinners,
                                [quarter]: Number.parseInt(v),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sin ganador" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sin ganador</SelectItem>
                              <SelectItem value="1">Nuestro equipo</SelectItem>
                              <SelectItem value="-1">Rival</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Penalties Tab */}
              {showPenaltyTab && (
                <TabsContent value="penaltis" className="space-y-6">
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <Activity className="h-5 w-5" />
                      <p className="font-medium">El partido está empatado - Registro de tanda de penaltis</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* My Team */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Mi Equipo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button onClick={() => setShowPenaltyShooterDialog(true)} variant="outline" className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Añadir Lanzador
                        </Button>

                        <div className="space-y-2">
                          {penaltyShooters.map((shooter, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                                  {shooter.playerNumber}
                                </div>
                                <span className="font-medium">{shooter.playerName}</span>
                                {shooter.scored ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeMyTeamPenalty(index)}>
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="text-center pt-4 border-t">
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {penaltyShooters.filter((p) => p.scored).length}
                          </div>
                          <p className="text-sm text-muted-foreground">Goles</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Opponent */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Equipo Rival
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => addOpponentPenalty("goal")}
                            variant="outline"
                            className="flex-col h-auto py-3"
                          >
                            <Target className="h-5 w-5 mb-1 text-green-600" />
                            <span className="text-xs">Gol</span>
                          </Button>
                          <Button
                            onClick={() => addOpponentPenalty("miss")}
                            variant="outline"
                            className="flex-col h-auto py-3"
                          >
                            <XCircle className="h-5 w-5 mb-1 text-red-600" />
                            <span className="text-xs">Falla</span>
                          </Button>
                          <Button
                            onClick={() => {
                              const gkId = activeGoalkeepers[0]?.id
                              if (gkId) {
                                addOpponentPenalty("save", gkId)
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Necesitas tener un portero activo",
                                  variant: "destructive",
                                })
                              }
                            }}
                            variant="outline"
                            className="flex-col h-auto py-3"
                          >
                            <Shield className="h-5 w-5 mb-1 text-blue-600" />
                            <span className="text-xs">Parada</span>
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {opponentPenalties.map((penalty, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                                  {penalty.order}
                                </div>
                                {penalty.result === "goal" && (
                                  <Badge variant="default" className="bg-green-500">
                                    Gol
                                  </Badge>
                                )}
                                {penalty.result === "miss" && <Badge variant="destructive">Falla</Badge>}
                                {penalty.result === "save" && (
                                  <Badge variant="default" className="bg-blue-500">
                                    Parada
                                  </Badge>
                                )}
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeOpponentPenalty(index)}>
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="text-center pt-4 border-t">
                          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {opponentPenalties.filter((p) => p.result === "goal").length}
                          </div>
                          <p className="text-sm text-muted-foreground">Goles</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Result Summary */}
                  {penaltyShooters.length > 0 && opponentPenalties.length > 0 && (
                    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Resultado de la Tanda</p>
                          <div className="text-4xl font-bold mb-4">
                            {penaltyShooters.filter((p) => p.scored).length} -{" "}
                            {opponentPenalties.filter((p) => p.result === "goal").length}
                          </div>
                          {penaltyShooters.filter((p) => p.scored).length ===
                          opponentPenalties.filter((p) => p.result === "goal").length ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              Empatado - Añade más lanzamientos
                            </Badge>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}

              {/* Players Tab */}
              <TabsContent value="jugadores" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Jugadores de Campo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {fieldPlayers.map((player) => (
                        <Button
                          key={player.id}
                          variant={activePlayers.includes(player.id) ? "default" : "outline"}
                          onClick={() => togglePlayerActive(player.id)}
                          className="justify-start"
                        >
                          <span className="font-bold mr-2">{player.number}</span>
                          {player.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Porteros</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {goalkeepers.map((player) => (
                        <Button
                          key={player.id}
                          variant={activePlayers.includes(player.id) ? "default" : "outline"}
                          onClick={() => togglePlayerActive(player.id)}
                          className="justify-start"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          <span className="font-bold mr-2">{player.number}</span>
                          {player.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Stats Tab */}
              <TabsContent value="stats" className="space-y-4">
                {activeFieldPlayers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Selecciona jugadores en la pestaña "Jugadores"
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeFieldPlayers.map((player) => {
                      const stats = playerStats[player.id] || initializePlayerStats(player.id)
                      return (
                        <Card key={player.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              #{player.number} {player.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {/* Goles */}
                              <div className="space-y-2">
                                <Label className="text-xs">Goles Boya/Jugada</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.goles_boya_jugada || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "goles_boya_jugada",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles Superioridad</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.goles_hombre_mas || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "goles_hombre_mas",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles Lanzamiento</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.goles_lanzamiento || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "goles_lanzamiento",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles +5m</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.goles_dir_mas_5m || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "goles_dir_mas_5m",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles Contraataque</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.goles_contraataque || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "goles_contraataque",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Penaltis Anotados</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.goles_penalti_anotado || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "goles_penalti_anotado",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>

                              {/* Tiros */}
                              <div className="space-y-2">
                                <Label className="text-xs">Tiros Superioridad</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.tiros_hombre_mas || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "tiros_hombre_mas",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Penaltis Fallados</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.tiros_penalti_fallado || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "tiros_penalti_fallado",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Tiros Fuera</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.tiros_fuera || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(player.id, "tiros_fuera", Number.parseInt(e.target.value) || 0)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Tiros Parados</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.tiros_parados || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(player.id, "tiros_parados", Number.parseInt(e.target.value) || 0)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Tiros Bloqueados</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.tiros_bloqueado || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(player.id, "tiros_bloqueado", Number.parseInt(e.target.value) || 0)
                                  }
                                />
                              </div>

                              {/* Faltas */}
                              <div className="space-y-2">
                                <Label className="text-xs">Exclusiones 20" (1c1)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.faltas_exp_20_1c1 || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "faltas_exp_20_1c1",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Exclusiones 20" (Boya)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.faltas_exp_20_boya || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "faltas_exp_20_boya",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Penaltis Provocados</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.faltas_penalti || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(player.id, "faltas_penalti", Number.parseInt(e.target.value) || 0)
                                  }
                                />
                              </div>

                              {/* Acciones */}
                              <div className="space-y-2">
                                <Label className="text-xs">Bloqueos</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.acciones_bloqueo || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "acciones_bloqueo",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Asistencias</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.acciones_asistencias || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "acciones_asistencias",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Recuperaciones</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.acciones_recuperacion || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "acciones_recuperacion",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Exclusiones Provocadas</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.acciones_exp_provocada || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "acciones_exp_provocada",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Goalkeepers Tab */}
              <TabsContent value="porteros" className="space-y-4">
                {activeGoalkeepers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Selecciona porteros en la pestaña "Jugadores"
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeGoalkeepers.map((player) => {
                      const stats = playerStats[player.id] || initializePlayerStats(player.id)
                      return (
                        <Card key={player.id}>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Shield className="h-5 w-5" />#{player.number} {player.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {/* Goles recibidos */}
                              <div className="space-y-2">
                                <Label className="text-xs">Gol</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_gol || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(player.id, "portero_gol", Number.parseInt(e.target.value) || 0)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Gol Superioridad</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_gol_superioridad || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_gol_superioridad",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Fallo Superioridad</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_fallo_superioridad || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_fallo_superioridad",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles Boya</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_goles_boya || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_goles_boya",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles Inferioridad</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_goles_hombre_menos || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_goles_hombre_menos",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles +5m</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_goles_dir_mas_5m || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_goles_dir_mas_5m",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles Contraataque</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_goles_contraataque || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_goles_contraataque",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Goles Penalti</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_goles_penalti || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_goles_penalti",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>

                              {/* Paradas */}
                              <div className="space-y-2">
                                <Label className="text-xs">Paradas Totales</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_paradas_totales || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_paradas_totales",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Paradas Fuera</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_paradas_fuera || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_paradas_fuera",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Paradas Inferioridad</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_paradas_hombre_menos || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_paradas_hombre_menos",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>

                              {/* Acciones */}
                              <div className="space-y-2">
                                <Label className="text-xs">Asistencias</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_acciones_asistencias || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_acciones_asistencias",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Recuperaciones</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_acciones_recuperacion || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_acciones_recuperacion",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Exclusiones Provocadas</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={stats.portero_acciones_exp_provocada || 0}
                                  onChange={(e) =>
                                    updatePlayerStat(
                                      player.id,
                                      "portero_acciones_exp_provocada",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Guardando..." : isEditing ? "Actualizar" : "Guardar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Penalty Shooter Dialog */}
      {showPenaltyShooterDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>Seleccionar Lanzador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fieldPlayers
                  .filter((p) => activePlayers.includes(p.id))
                  .filter((p) => !penaltyShooters.find((s) => s.playerId === p.id))
                  .map((player) => (
                    <div key={player.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                          {player.number}
                        </div>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => addMyTeamPenalty(player.id, true)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Gol
                        </Button>
                        <Button
                          onClick={() => addMyTeamPenalty(player.id, false)}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Falla
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setShowPenaltyShooterDialog(false)}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
