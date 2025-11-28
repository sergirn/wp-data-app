"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Users, TrendingUp, X, Plus, Shield, Target, XCircle, Trophy } from "lucide-react"
import Link from "next/link"

interface Player {
  id: string
  name: string
  number: number
  position: string
}

interface PlayerStats {
  playerId: string
  goles: number
  goles_boya: number
  goles_centro: number
  goles_contraataque: number
  goles_penalti: number
  goles_superioridad: number
  asistencias: number
  robos: number
  pérdidas: number
  exclusiones: number
  exclusiones_por_3: number
  penalty_provocado: number
  penalty_fallado: number
  bloqueos: number
  minutos_jugados: number
}

interface GoalkeeperStats {
  playerId: string
  paradas: number
  goles_totales: number
  paradas_boya: number
  goles_boya: number
  paradas_centro: number
  goles_centro: number
  paradas_contraataque: number
  goles_contraataque: number
  paradas_penalti: number
  goles_penalti: number
  paradas_superioridad: number
  goles_superioridad: number
  paradas_inferioridad: number
  goles_inferioridad: number
  portero_gol: number
  portero_gol_superioridad: number
  portero_fallo_superioridad: number
  exclusiones: number
  exclusiones_por_3: number
  minutos_jugados: number
}

interface PenaltyShooter {
  playerId: string
  playerName: string
  playerNumber: number
  scored: boolean
}

interface OpponentPenalty {
  order: number
  result: "goal" | "miss" | "save"
  goalkeeperPlayerId?: string
}

export default function NuevoPartidoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const matchId = searchParams?.get("matchId")
  const { toast } = useToast()
  const supabase = createClient()

  // Estado del partido
  const [opponent, setOpponent] = useState("")
  const [matchDate, setMatchDate] = useState("")
  const [isHome, setIsHome] = useState(true)
  const [players, setPlayers] = useState<Player[]>([])
  const [activePlayers, setActivePlayers] = useState<Set<string>>(new Set())
  const [playerStats, setPlayerStats] = useState<Map<string, PlayerStats>>(new Map())
  const [goalkeeperStats, setGoalkeeperStats] = useState<Map<string, GoalkeeperStats>>(new Map())
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedGoalkeeper, setSelectedGoalkeeper] = useState<Player | null>(null)
  const [showStatsDialog, setShowStatsDialog] = useState(false)
  const [showGoalkeeperDialog, setShowGoalkeeperDialog] = useState(false)
  const [clubName, setClubName] = useState("")
  const [loading, setLoading] = useState(true)

  // Penaltis
  const [penaltyShooters, setPenaltyShooters] = useState<PenaltyShooter[]>([])
  const [opponentPenalties, setOpponentPenalties] = useState<OpponentPenalty[]>([])
  const [showPenaltyShooterDialog, setShowPenaltyShooterDialog] = useState(false)
  const [penaltyHomeScore, setPenaltyHomeScore] = useState(0)
  const [penaltyAwayScore, setPenaltyAwayScore] = useState(0)

  // Cálculo de marcadores por cuartos
  const calculateQuarterScores = () => {
    const quarters = {
      1: { home: 0, away: 0 },
      2: { home: 0, away: 0 },
      3: { home: 0, away: 0 },
      4: { home: 0, away: 0 },
    }

    playerStats.forEach((stats) => {
      const totalGoals =
        stats.goles +
        stats.goles_boya +
        stats.goles_centro +
        stats.goles_contraataque +
        stats.goles_penalti +
        stats.goles_superioridad

      // Distribuir goles equitativamente por cuartos
      const goalsPerQuarter = Math.floor(totalGoals / 4)
      const remainingGoals = totalGoals % 4

      for (let q = 1; q <= 4; q++) {
        quarters[q as 1 | 2 | 3 | 4].home += goalsPerQuarter
        if (q <= remainingGoals) quarters[q as 1 | 2 | 3 | 4].home += 1
      }
    })

    goalkeeperStats.forEach((stats) => {
      const totalGoalsConceded = stats.goles_totales

      // Distribuir goles del rival equitativamente
      const goalsPerQuarter = Math.floor(totalGoalsConceded / 4)
      const remainingGoals = totalGoalsConceded % 4

      for (let q = 1; q <= 4; q++) {
        quarters[q as 1 | 2 | 3 | 4].away += goalsPerQuarter
        if (q <= remainingGoals) quarters[q as 1 | 2 | 3 | 4].away += 1
      }
    })

    return quarters
  }

  // Cálculo de marcador total
  const calculateScores = () => {
    let homeGoals = 0
    let awayGoals = 0

    playerStats.forEach((stats) => {
      homeGoals +=
        stats.goles +
        stats.goles_boya +
        stats.goles_centro +
        stats.goles_contraataque +
        stats.goles_penalti +
        stats.goles_superioridad
    })

    goalkeeperStats.forEach((stats) => {
      homeGoals += stats.portero_gol // Añadir goles del portero al marcador
      awayGoals += stats.goles_totales
    })

    return { homeGoals, awayGoals }
  }

  const quarterScores = calculateQuarterScores()
  const { homeGoals, awayGoals } = calculateScores()
  const isTie = homeGoals === awayGoals

  // Cargar datos al iniciar
  useEffect(() => {
    loadInitialData()
  }, [matchId])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError

      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", profile.club_id)
        .single()

      if (clubError) throw clubError
      setClubName(club.name)

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("club_id", profile.club_id)
        .order("number")

      if (playersError) throw playersError
      setPlayers(playersData || [])

      // Si hay matchId, cargar datos del partido
      if (matchId) {
        await loadMatchData(matchId)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMatchData = async (id: string) => {
    try {
      const { data: match, error: matchError } = await supabase.from("matches").select("*").eq("id", id).single()

      if (matchError) throw matchError

      setOpponent(match.opponent)
      setMatchDate(match.date)
      setIsHome(match.is_home)
      setPenaltyHomeScore(match.penalty_home_score || 0)
      setPenaltyAwayScore(match.penalty_away_score || 0)

      const { data: stats, error: statsError } = await supabase.from("match_stats").select("*").eq("match_id", id)

      if (statsError) throw statsError

      const newActivePlayers = new Set<string>()
      const newPlayerStats = new Map<string, PlayerStats>()
      const newGoalkeeperStats = new Map<string, GoalkeeperStats>()

      stats?.forEach((stat: any) => {
        newActivePlayers.add(stat.player_id)

        const player = players.find((p) => p.id === stat.player_id)
        if (player?.position === "Portero") {
          newGoalkeeperStats.set(stat.player_id, {
            playerId: stat.player_id,
            paradas: stat.portero_paradas || 0,
            goles_totales: stat.portero_goles_totales || 0,
            paradas_boya: stat.portero_paradas_boya || 0,
            goles_boya: stat.portero_goles_boya || 0,
            paradas_centro: stat.portero_paradas_centro || 0,
            goles_centro: stat.portero_goles_centro || 0,
            paradas_contraataque: stat.portero_paradas_contraataque || 0,
            goles_contraataque: stat.portero_goles_contraataque || 0,
            paradas_penalti: stat.portero_paradas_penalti || 0,
            goles_penalti: stat.portero_goles_penalti || 0,
            paradas_superioridad: stat.portero_paradas_superioridad || 0,
            goles_superioridad: stat.portero_goles_superioridad || 0,
            paradas_inferioridad: stat.portero_paradas_inferioridad || 0,
            goles_inferioridad: stat.portero_goles_inferioridad || 0,
            portero_gol: stat.portero_gol || 0,
            portero_gol_superioridad: stat.portero_gol_superioridad || 0,
            portero_fallo_superioridad: stat.portero_fallo_superioridad || 0,
            exclusiones: stat.exclusiones || 0,
            exclusiones_por_3: stat.exclusiones_por_3 || 0,
            minutos_jugados: stat.minutos_jugados || 0,
          })
        } else {
          newPlayerStats.set(stat.player_id, {
            playerId: stat.player_id,
            goles: stat.goles || 0,
            goles_boya: stat.goles_boya || 0,
            goles_centro: stat.goles_centro || 0,
            goles_contraataque: stat.goles_contraataque || 0,
            goles_penalti: stat.goles_penalti || 0,
            goles_superioridad: stat.goles_superioridad || 0,
            asistencias: stat.asistencias || 0,
            robos: stat.robos || 0,
            pérdidas: stat.pérdidas || 0,
            exclusiones: stat.exclusiones || 0,
            exclusiones_por_3: stat.exclusiones_por_3 || 0,
            penalty_provocado: stat.penalty_provocado || 0,
            penalty_fallado: stat.penalty_fallado || 0,
            bloqueos: stat.bloqueos || 0,
            minutos_jugados: stat.minutos_jugados || 0,
          })
        }
      })

      setActivePlayers(newActivePlayers)
      setPlayerStats(newPlayerStats)
      setGoalkeeperStats(newGoalkeeperStats)

      // Cargar penaltis si existen
      const { data: penaltiesData } = await supabase
        .from("penalty_shootout_players")
        .select("*")
        .eq("match_id", id)
        .order("order")

      if (penaltiesData) {
        const myTeamPenalties: PenaltyShooter[] = []
        const rivalPenalties: OpponentPenalty[] = []

        penaltiesData.forEach((penalty: any) => {
          if (penalty.is_own_team) {
            myTeamPenalties.push({
              playerId: penalty.player_id,
              playerName: penalty.player_name || "",
              playerNumber: penalty.player_number || 0,
              scored: penalty.scored,
            })
          } else {
            rivalPenalties.push({
              order: penalty.order,
              result: penalty.result as "goal" | "miss" | "save",
              goalkeeperPlayerId: penalty.goalkeeper_player_id,
            })
          }
        })

        setPenaltyShooters(myTeamPenalties)
        setOpponentPenalties(rivalPenalties)
      }
    } catch (error) {
      console.error("Error loading match data:", error)
    }
  }

  const togglePlayer = (playerId: string) => {
    const newActive = new Set(activePlayers)
    if (newActive.has(playerId)) {
      newActive.delete(playerId)
      playerStats.delete(playerId)
      goalkeeperStats.delete(playerId)
    } else {
      newActive.add(playerId)
    }
    setActivePlayers(newActive)
  }

  const openStatsDialog = (player: Player) => {
    setSelectedPlayer(player)
    if (!playerStats.has(player.id)) {
      playerStats.set(player.id, {
        playerId: player.id,
        goles: 0,
        goles_boya: 0,
        goles_centro: 0,
        goles_contraataque: 0,
        goles_penalti: 0,
        goles_superioridad: 0,
        asistencias: 0,
        robos: 0,
        pérdidas: 0,
        exclusiones: 0,
        exclusiones_por_3: 0,
        penalty_provocado: 0,
        penalty_fallado: 0,
        bloqueos: 0,
        minutos_jugados: 0,
      })
    }
    setShowStatsDialog(true)
  }

  const openGoalkeeperDialog = (player: Player) => {
    setSelectedGoalkeeper(player)
    if (!goalkeeperStats.has(player.id)) {
      goalkeeperStats.set(player.id, {
        playerId: player.id,
        paradas: 0,
        goles_totales: 0,
        paradas_boya: 0,
        goles_boya: 0,
        paradas_centro: 0,
        goles_centro: 0,
        paradas_contraataque: 0,
        goles_contraataque: 0,
        paradas_penalti: 0,
        goles_penalti: 0,
        paradas_superioridad: 0,
        goles_superioridad: 0,
        paradas_inferioridad: 0,
        goles_inferioridad: 0,
        portero_gol: 0,
        portero_gol_superioridad: 0,
        portero_fallo_superioridad: 0,
        exclusiones: 0,
        exclusiones_por_3: 0,
        minutos_jugados: 0,
      })
    }
    setShowGoalkeeperDialog(true)
  }

  const updatePlayerStat = (field: keyof PlayerStats, value: number) => {
    if (!selectedPlayer) return
    const stats = playerStats.get(selectedPlayer.id)!
    stats[field] = value as never
    setPlayerStats(new Map(playerStats))
  }

  const updateGoalkeeperStat = (field: keyof GoalkeeperStats, value: number) => {
    if (!selectedGoalkeeper) return
    const stats = goalkeeperStats.get(selectedGoalkeeper.id)!
    stats[field] = value as never

    // Recalcular goles totales y paradas totales
    if (field.startsWith("goles_") && field !== "goles_totales") {
      stats.goles_totales =
        stats.goles_boya +
        stats.goles_centro +
        stats.goles_contraataque +
        stats.goles_penalti +
        stats.goles_superioridad +
        stats.goles_inferioridad
    }
    if (field.startsWith("paradas_") && field !== "paradas") {
      stats.paradas =
        stats.paradas_boya +
        stats.paradas_centro +
        stats.paradas_contraataque +
        stats.paradas_penalti +
        stats.paradas_superioridad +
        stats.paradas_inferioridad
    }

    setGoalkeeperStats(new Map(goalkeeperStats))
  }

  const addMyTeamPenalty = (playerId: string, playerName: string, playerNumber: number, scored: boolean) => {
    setPenaltyShooters([...penaltyShooters, { playerId, playerName, playerNumber, scored }])
    if (scored) {
      setPenaltyHomeScore(penaltyHomeScore + 1)
    }
    setShowPenaltyShooterDialog(false)
  }

  const removeMyTeamPenalty = (index: number) => {
    const penalty = penaltyShooters[index]
    if (penalty.scored) {
      setPenaltyHomeScore(Math.max(0, penaltyHomeScore - 1))
    }
    setPenaltyShooters(penaltyShooters.filter((_, i) => i !== index))
  }

  const addOpponentPenalty = (result: "goal" | "miss" | "save", goalkeeperPlayerId?: string) => {
    setOpponentPenalties([
      ...opponentPenalties,
      {
        order: opponentPenalties.length + 1,
        result,
        goalkeeperPlayerId,
      },
    ])
    if (result === "goal") {
      setPenaltyAwayScore(penaltyAwayScore + 1)
    }
  }

  const removeOpponentPenalty = (index: number) => {
    const penalty = opponentPenalties[index]
    if (penalty.result === "goal") {
      setPenaltyAwayScore(Math.max(0, penaltyAwayScore - 1))
    }

    // Si era una parada, restar del portero
    if (penalty.result === "save" && penalty.goalkeeperPlayerId) {
      const gkStats = goalkeeperStats.get(penalty.goalkeeperPlayerId)
      if (gkStats) {
        gkStats.paradas_penalti = Math.max(0, (gkStats.paradas_penalti || 0) - 1)
        setGoalkeeperStats(new Map(goalkeeperStats))
      }
    }

    setOpponentPenalties(opponentPenalties.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    try {
      if (!opponent || !matchDate || activePlayers.size === 0) {
        toast({
          title: "Error",
          description: "Por favor completa todos los campos obligatorios",
          variant: "destructive",
        })
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      const { data: profile } = await supabase.from("profiles").select("club_id").eq("id", user.id).single()

      if (!profile) throw new Error("No profile found")

      const q1_home = quarterScores[1]?.home || 0
      const q1_away = quarterScores[1]?.away || 0
      const q2_home = quarterScores[2]?.home || 0
      const q2_away = quarterScores[2]?.away || 0
      const q3_home = quarterScores[3]?.home || 0
      const q3_away = quarterScores[3]?.away || 0
      const q4_home = quarterScores[4]?.home || 0
      const q4_away = quarterScores[4]?.away || 0

      const matchData = {
        club_id: profile.club_id,
        opponent,
        date: matchDate,
        home_score: homeGoals,
        away_score: awayGoals,
        is_home: isHome,
        q1_home,
        q1_away,
        q2_home,
        q2_away,
        q3_home,
        q3_away,
        q4_home,
        q4_away,
        penalty_home_score: isTie ? penaltyHomeScore : null,
        penalty_away_score: isTie ? penaltyAwayScore : null,
      }

      let savedMatchId = matchId

      if (matchId) {
        // Actualizar partido existente
        const { error: updateError } = await supabase.from("matches").update(matchData).eq("id", matchId)

        if (updateError) throw updateError

        // Eliminar estadísticas y penaltis anteriores
        await supabase.from("match_stats").delete().eq("match_id", matchId)
        await supabase.from("penalty_shootout_players").delete().eq("match_id", matchId)
      } else {
        // Crear nuevo partido
        const { data: newMatch, error: insertError } = await supabase
          .from("matches")
          .insert(matchData)
          .select()
          .single()

        if (insertError) throw insertError
        savedMatchId = newMatch.id
      }

      // Guardar estadísticas de jugadores
      const statsToInsert: any[] = []

      playerStats.forEach((stats) => {
        statsToInsert.push({
          match_id: savedMatchId,
          player_id: stats.playerId,
          goles: stats.goles,
          goles_boya: stats.goles_boya,
          goles_centro: stats.goles_centro,
          goles_contraataque: stats.goles_contraataque,
          goles_penalti: stats.goles_penalti,
          goles_superioridad: stats.goles_superioridad,
          asistencias: stats.asistencias,
          robos: stats.robos,
          pérdidas: stats.pérdidas,
          exclusiones: stats.exclusiones,
          exclusiones_por_3: stats.exclusiones_por_3,
          penalty_provocado: stats.penalty_provocado,
          penalty_fallado: stats.penalty_fallado,
          bloqueos: stats.bloqueos,
          minutos_jugados: stats.minutos_jugados,
        })
      })

      goalkeeperStats.forEach((stats) => {
        statsToInsert.push({
          match_id: savedMatchId,
          player_id: stats.playerId,
          portero_paradas: stats.paradas,
          portero_goles_totales: stats.goles_totales,
          portero_paradas_boya: stats.paradas_boya,
          portero_goles_boya: stats.goles_boya,
          portero_paradas_centro: stats.paradas_centro,
          portero_goles_centro: stats.goles_centro,
          portero_paradas_contraataque: stats.paradas_contraataque,
          portero_goles_contraataque: stats.goles_contraataque,
          portero_paradas_penalti: stats.paradas_penalti,
          portero_goles_penalti: stats.goles_penalti,
          portero_paradas_superioridad: stats.paradas_superioridad,
          portero_goles_superioridad: stats.goles_superioridad,
          portero_paradas_inferioridad: stats.paradas_inferioridad,
          portero_goles_inferioridad: stats.goles_inferioridad,
          portero_gol: stats.portero_gol,
          portero_gol_superioridad: stats.portero_gol_superioridad,
          portero_fallo_superioridad: stats.portero_fallo_superioridad,
          exclusiones: stats.exclusiones,
          exclusiones_por_3: stats.exclusiones_por_3,
          minutos_jugados: stats.minutos_jugados,
        })
      })

      if (statsToInsert.length > 0) {
        const { error: statsError } = await supabase.from("match_stats").insert(statsToInsert)

        if (statsError) throw statsError
      }

      // Guardar penaltis
      if (isTie && (penaltyShooters.length > 0 || opponentPenalties.length > 0)) {
        const penaltiesToInsert: any[] = []

        penaltyShooters.forEach((shooter, index) => {
          penaltiesToInsert.push({
            match_id: savedMatchId,
            player_id: shooter.playerId,
            player_name: shooter.playerName,
            player_number: shooter.playerNumber,
            is_own_team: true,
            scored: shooter.scored,
            order: index + 1,
          })
        })

        opponentPenalties.forEach((penalty) => {
          penaltiesToInsert.push({
            match_id: savedMatchId,
            is_own_team: false,
            result: penalty.result,
            goalkeeper_player_id: penalty.goalkeeper_player_id,
            order: penalty.order,
          })
        })

        if (penaltiesToInsert.length > 0) {
          const { error: penaltiesError } = await supabase.from("penalty_shootout_players").insert(penaltiesToInsert)

          if (penaltiesError) throw penaltiesError
        }
      }

      toast({
        title: "Éxito",
        description: matchId ? "Partido actualizado correctamente" : "Partido guardado correctamente",
      })

      router.push("/partidos")
    } catch (error: any) {
      console.error("Error saving match:", error)
      toast({
        title: "Error",
        description: `Error al guardar el partido: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const goalkeepers = players.filter((p) => p.position === "Portero")
  const fieldPlayers = players.filter((p) => p.position !== "Portero" && activePlayers.has(p.id))

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{matchId ? "Editar Partido" : "Nuevo Partido"}</h1>
          <p className="text-muted-foreground">{clubName}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/partidos">Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Partido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="opponent">Rival</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Nombre del equipo rival"
              />
            </div>
            <div>
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label>Ubicación</Label>
            <div className="flex gap-2">
              <Button variant={isHome ? "default" : "outline"} onClick={() => setIsHome(true)}>
                Local
              </Button>
              <Button variant={!isHome ? "default" : "outline"} onClick={() => setIsHome(false)}>
                Visitante
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Marcador</span>
            <Badge variant="secondary" className="text-2xl px-4 py-2">
              {homeGoals} - {awayGoals}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Q1</div>
              <div className="text-lg font-semibold">
                {quarterScores[1]?.home || 0} - {quarterScores[1]?.away || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Q2</div>
              <div className="text-lg font-semibold">
                {quarterScores[2]?.home || 0} - {quarterScores[2]?.away || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Q3</div>
              <div className="text-lg font-semibold">
                {quarterScores[3]?.home || 0} - {quarterScores[3]?.away || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Q4</div>
              <div className="text-lg font-semibold">
                {quarterScores[4]?.home || 0} - {quarterScores[4]?.away || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="jugadores">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
          {isTie && (
            <TabsTrigger value="penaltis" className="relative">
              Tanda de Penaltis
              <Badge variant="destructive" className="ml-2 animate-pulse">
                ¡Empate!
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="jugadores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Jugadores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {players.map((player) => (
                  <Button
                    key={player.id}
                    variant={activePlayers.has(player.id) ? "default" : "outline"}
                    onClick={() => togglePlayer(player.id)}
                    className="justify-start"
                  >
                    <Users className="mr-2 h-4 w-4" />#{player.number} {player.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {activePlayers.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Jugadores Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players
                    .filter((p) => activePlayers.has(p.id))
                    .map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            #{player.number} {player.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{player.position}</div>
                        </div>
                        <Button
                          onClick={() =>
                            player.position === "Portero" ? openGoalkeeperDialog(player) : openStatsDialog(player)
                          }
                        >
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Estadísticas
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isTie && (
          <TabsContent value="penaltis" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Mi Equipo */}
              <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-blue-600 dark:text-blue-400">{clubName}</span>
                    <Badge variant="secondary" className="text-2xl px-4 py-2">
                      {penaltyHomeScore}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => setShowPenaltyShooterDialog(true)} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Lanzador
                  </Button>

                  <div className="space-y-2">
                    {penaltyShooters.map((shooter, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          shooter.scored
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                            : "border-red-500 bg-red-50 dark:bg-red-950/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-lg">#{shooter.playerNumber}</div>
                          <div>
                            <div className="font-medium">{shooter.playerName}</div>
                            <Badge variant={shooter.scored ? "default" : "destructive"} className="mt-1">
                              {shooter.scored ? "⚽ Gol" : "❌ Falla"}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeMyTeamPenalty(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Equipo Rival */}
              <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-amber-600 dark:text-amber-400">{opponent}</span>
                    <Badge variant="secondary" className="text-2xl px-4 py-2">
                      {penaltyAwayScore}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => addOpponentPenalty("goal")}
                      variant="outline"
                      className="w-full bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/30 hover:from-green-500/20 hover:to-green-600/20"
                    >
                      <Target className="mr-2 h-4 w-4 text-green-600" />
                      Gol
                    </Button>
                    <Button
                      onClick={() => addOpponentPenalty("miss")}
                      variant="outline"
                      className="w-full bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/30 hover:from-red-500/20 hover:to-red-600/20"
                    >
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Falla
                    </Button>
                    <Button
                      onClick={() => {
                        if (goalkeepers.length === 1) {
                          addOpponentPenalty("save", goalkeepers[0].id)
                        } else {
                          // Mostrar selector de portero
                          const gkId = prompt("Selecciona portero (escribe el ID)")
                          if (gkId) addOpponentPenalty("save", gkId)
                        }
                      }}
                      variant="outline"
                      className="w-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30 hover:from-blue-500/20 hover:to-blue-600/20"
                    >
                      <Shield className="mr-2 h-4 w-4 text-blue-600" />
                      Parada
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {opponentPenalties.map((penalty, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          penalty.result === "goal"
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                            : penalty.result === "miss"
                              ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                              : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        }`}
                      >
                        <Badge
                          variant={
                            penalty.result === "goal"
                              ? "default"
                              : penalty.result === "miss"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {penalty.result === "goal" ? "⚽ Gol" : penalty.result === "miss" ? "❌ Falla" : "🧤 Parada"}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => removeOpponentPenalty(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumen */}
            {(penaltyHomeScore > 0 || penaltyAwayScore > 0) && penaltyHomeScore === penaltyAwayScore && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Trophy className="h-12 w-12 mx-auto mb-2 text-amber-600" />
                    <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                      ⚠️ Los penaltis están empatados
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Debe haber un ganador en la tanda de penaltis</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/partidos">Cancelar</Link>
        </Button>
        <Button onClick={handleSave} disabled={penaltyHomeScore === penaltyAwayScore && isTie}>
          <Calendar className="mr-2 h-4 w-4" />
          {matchId ? "Actualizar Partido" : "Guardar Partido"}
        </Button>
      </div>

      {/* Diálogo de estadísticas de jugador */}
      {showStatsDialog && selectedPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  Estadísticas - #{selectedPlayer.number} {selectedPlayer.name}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowStatsDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Tabs defaultValue="goles">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="goles">Goles</TabsTrigger>
                  <TabsTrigger value="acciones">Acciones</TabsTrigger>
                  <TabsTrigger value="faltas">Faltas</TabsTrigger>
                </TabsList>

                <TabsContent value="goles" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Goles", field: "goles" as const },
                      { label: "Goles Boya", field: "goles_boya" as const },
                      { label: "Goles Centro", field: "goles_centro" as const },
                      { label: "Goles Contraataque", field: "goles_contraataque" as const },
                      { label: "Goles Penalti", field: "goles_penalti" as const },
                      { label: "Goles Superioridad", field: "goles_superioridad" as const },
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={playerStats.get(selectedPlayer.id)?.[field] || 0}
                          onChange={(e) => updatePlayerStat(field, Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="acciones" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Asistencias", field: "asistencias" as const },
                      { label: "Robos", field: "robos" as const },
                      { label: "Pérdidas", field: "pérdidas" as const },
                      { label: "Bloqueos", field: "bloqueos" as const },
                      { label: "Minutos Jugados", field: "minutos_jugados" as const },
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={playerStats.get(selectedPlayer.id)?.[field] || 0}
                          onChange={(e) => updatePlayerStat(field, Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="faltas" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Exclusiones", field: "exclusiones" as const },
                      { label: "Exclusiones por 3 faltas", field: "exclusiones_por_3" as const },
                      { label: "Penalty Provocado", field: "penalty_provocado" as const },
                      { label: "Penalty Fallado", field: "penalty_fallado" as const },
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={playerStats.get(selectedPlayer.id)?.[field] || 0}
                          onChange={(e) => updatePlayerStat(field, Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button onClick={() => setShowStatsDialog(false)}>Cerrar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de estadísticas de portero */}
      {showGoalkeeperDialog && selectedGoalkeeper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  Estadísticas Portero - #{selectedGoalkeeper.number} {selectedGoalkeeper.name}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowGoalkeeperDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Tabs defaultValue="acciones">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="acciones">Acciones</TabsTrigger>
                  <TabsTrigger value="paradas">Paradas</TabsTrigger>
                  <TabsTrigger value="goles">Goles Recibidos</TabsTrigger>
                </TabsList>

                <TabsContent value="acciones" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Gol", field: "portero_gol" as const },
                      { label: "Gol Superioridad", field: "portero_gol_superioridad" as const },
                      { label: "Fallo Superioridad", field: "portero_fallo_superioridad" as const },
                      { label: "Exclusiones", field: "exclusiones" as const },
                      { label: "Exclusiones por 3 faltas", field: "exclusiones_por_3" as const },
                      { label: "Minutos Jugados", field: "minutos_jugados" as const },
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={goalkeeperStats.get(selectedGoalkeeper.id)?.[field] || 0}
                          onChange={(e) => updateGoalkeeperStat(field, Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="paradas" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Paradas Boya", field: "paradas_boya" as const },
                      { label: "Paradas Centro", field: "paradas_centro" as const },
                      { label: "Paradas Contraataque", field: "paradas_contraataque" as const },
                      { label: "Paradas Penalti", field: "paradas_penalti" as const },
                      { label: "Paradas Superioridad", field: "paradas_superioridad" as const },
                      { label: "Paradas Inferioridad", field: "paradas_inferioridad" as const },
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={goalkeeperStats.get(selectedGoalkeeper.id)?.[field] || 0}
                          onChange={(e) => updateGoalkeeperStat(field, Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="goles" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Goles Boya", field: "goles_boya" as const },
                      { label: "Goles Centro", field: "goles_centro" as const },
                      { label: "Goles Contraataque", field: "goles_contraataque" as const },
                      { label: "Goles Penalti", field: "goles_penalti" as const },
                      { label: "Goles Superioridad", field: "goles_superioridad" as const },
                      { label: "Goles Inferioridad", field: "goles_inferioridad" as const },
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={goalkeeperStats.get(selectedGoalkeeper.id)?.[field] || 0}
                          onChange={(e) => updateGoalkeeperStat(field, Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button onClick={() => setShowGoalkeeperDialog(false)}>Cerrar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de selección de lanzadores de penaltis */}
      {showPenaltyShooterDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Seleccionar Lanzador de Penalti</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPenaltyShooterDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              {fieldPlayers.filter((p) => !penaltyShooters.find((s) => s.playerId === p.id)).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Todos los jugadores han sido añadidos</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fieldPlayers
                    .filter((p) => !penaltyShooters.find((s) => s.playerId === p.id))
                    .map((player) => (
                      <Card
                        key={player.id}
                        className="hover:shadow-lg transition-shadow border-2 hover:border-blue-500/50"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-lg font-bold">
                                  #{player.number}
                                </Badge>
                                <span className="font-semibold">{player.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{player.position}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => addMyTeamPenalty(player.id, player.name, player.number, true)}
                              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            >
                              ⚽ Gol
                            </Button>
                            <Button
                              onClick={() => addMyTeamPenalty(player.id, player.name, player.number, false)}
                              variant="outline"
                              className="w-full border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              ❌ Falla
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
