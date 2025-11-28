"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatInput } from "@/components/stat-input"
import type { Player, MatchStats, Profile, Match } from "@/lib/types"
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Users,
  CheckCircle,
  XCircle,
  Trophy,
  X,
  Shield,
  Target,
  Save,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PlayerSubstitutionDialog } from "@/components/player-substitution-dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface MatchEditParams {
  matchId?: number
  isEditing?: boolean
}

export default function NewMatchPage({ searchParams }: { searchParams: Promise<MatchEditParams> }) {
  // ADD STATE FOR QUARTERLY SCORES
  const [closedQuarters, setClosedQuarters] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  })
  const [quarterScores, setQuarterScores] = useState<Record<number, { home: number; away: number }>>({
    1: { home: 0, away: 0 },
    2: { home: 0, away: 0 },
    3: { home: 0, away: 0 },
    4: { home: 0, away: 0 },
  })

  const [sprintWinners, setSprintWinners] = useState({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  })

  // ADD STATE FOR PENALTY SHOOTOUT
  const [penaltyHomeScore, setPenaltyHomeScore] = useState<number | null>(null)
  const [penaltyAwayScore, setPenaltyAwayScore] = useState<number | null>(null)
  const [penaltyShooters, setPenaltyShooters] = useState<Array<{ playerId: number; scored: boolean }>>([])
  const [showPenaltyShooterDialog, setShowPenaltyShooterDialog] = useState(false)

  const [rivalPenalties, setRivalPenalties] = useState<Array<{ id: number; result: "scored" | "missed" | "saved" }>>([])

  const router = useRouter()
  const supabase = createClient()
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [activePlayerIds, setActivePlayerIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [substitutionPlayer, setSubstitutionPlayer] = useState<Player | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const [previousMatches, setPreviousMatches] = useState<Match[]>([])
  const [loadingLineup, setLoadingLineup] = useState(false)
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null)
  const [existingMatch, setExistingMatch] = useState<Match | null>(null)

  // ADD STATE FOR THE ADDPLAYER DIALOG
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false)
  const [selectedAddPlayer, setSelectedAddPlayer] = useState<Player | null>(null)

  const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0])
  const [opponent, setOpponent] = useState("")
  const [location, setLocation] = useState("")
  const [isHome, setIsHome] = useState(true)
  const [season, setSeason] = useState(getCurrentSeason())
  const [jornada, setJornada] = useState(1)
  const [notes, setNotes] = useState("")

  const [stats, setStats] = useState<Record<number, Partial<MatchStats>>>({})

  const { toast } = useToast()

  // Fetch club name for display
  const [myClub, setMyClub] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    const fetchClub = async () => {
      if (!profile?.club_id) return
      const { data } = await supabase.from("clubs").select("id, name").eq("id", profile.club_id).single()
      if (data) setMyClub(data)
    }
    if (profile) fetchClub()
  }, [profile, supabase])

  const calculateQuarterScores = (playerStats: Record<number, Partial<MatchStats>>) => {
    let homeGoals = 0
    let awayGoals = 0

    Object.entries(playerStats).forEach(([playerId, playerStat]) => {
      const player = allPlayers.find((p) => p.id === Number(playerId))

      if (player?.is_goalkeeper) {
        const goalkeeperGoals =
          (playerStat.portero_goles_boya_parada || 0) +
          (playerStat.portero_goles_hombre_menos || 0) +
          (playerStat.portero_goles_dir_mas_5m || 0) +
          (playerStat.portero_goles_contraataque || 0) +
          (playerStat.portero_goles_penalti || 0)

        awayGoals += goalkeeperGoals
      } else {
        homeGoals += playerStat.goles_totales || 0
      }
    })

    return { homeGoals, awayGoals }
  }

  const calculateScores = (playerStats: Record<number, Partial<MatchStats>>) => {
    let homeGoals = 0
    let awayGoals = 0

    Object.entries(playerStats).forEach(([playerId, playerStat]) => {
      const player = allPlayers.find((p) => p.id === Number(playerId))

      if (player?.is_goalkeeper) {
        // Goles que recibe el portero
        const goalkeeperGoals =
          (playerStat.portero_goles_boya_parada || 0) +
          (playerStat.portero_goles_hombre_menos || 0) +
          (playerStat.portero_goles_dir_mas_5m || 0) +
          (playerStat.portero_goles_contraataque || 0) +
          (playerStat.portero_goles_penalti || 0)

        awayGoals += goalkeeperGoals
      } else {
        // Goles que marca el jugador de campo
        homeGoals += playerStat.goles_totales || 0
      }
    })

    return { homeGoals, awayGoals }
  }

  useEffect(() => {
    async function initializeFromParams() {
      const params = await searchParams

      // 1. Detectamos si estamos editando o creando nuevo
      if (params.matchId) {
        setEditingMatchId(Number(params.matchId))
      }

      // 2. Carga todo lo necesario (permisos + jugadores + datos del partido si existe)
      await checkPermissions() // ← establece profile
      await loadPlayers() // ← ahora carga jugadores + convocatoria por defecto (solo si es nuevo)
      await loadPreviousMatches()

      // 3. Si estamos editando → cargamos los datos reales del partido (sobrescribe la convocatoria por defecto)
      if (params.matchId) {
        await loadExistingMatch(Number(params.matchId))
      }

      // 4. Todo listo
      setLoading(false)
    }

    initializeFromParams()
  }, [searchParams]) // ← importante: depende de searchParams

  const checkPermissions = async () => {
    if (!supabase) {
      setPermissionError(true)
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

      if (!profileData || (profileData.role !== "admin" && profileData.role !== "coach")) {
        setPermissionError(true)
        return
      }

      setProfile(profileData)
    } catch (error) {
      console.error("[v0] Auth error:", error)
      setPermissionError(true)
    }
  }

  const loadPreviousMatches = async () => {
    if (!supabase) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      if (!profileData?.club_id) return

      const { data: matches } = await supabase
        .from("matches")
        .select("id, match_date, opponent, season")
        .eq("club_id", profileData.club_id)
        .order("match_date", { ascending: false })
        .limit(10)

      if (matches) {
        setPreviousMatches(matches)
      }
    } catch (error) {
      console.error("[v0] Error loading previous matches:", error)
    }
  }

  const loadLineupFromMatch = async (matchId: number) => {
    if (!supabase) return

    setLoadingLineup(true)
    try {
      const { data: matchStats } = await supabase.from("match_stats").select("player_id").eq("match_id", matchId)

      if (matchStats && matchStats.length > 0) {
        const playerIds = matchStats.map((stat) => stat.player_id)
        const validPlayerIds = playerIds.filter((id) => allPlayers.some((p) => p.id === id))

        setActivePlayerIds(validPlayerIds)

        const initialStats: Record<number, Partial<MatchStats>> = {}
        validPlayerIds.forEach((playerId) => {
          initialStats[playerId] = createEmptyStats(playerId)
        })
        setStats(initialStats)
      }
    } catch (error) {
      console.error("Error loading lineup:", error)
      alert("Error al cargar la convocatoria")
    } finally {
      setLoadingLineup(false)
    }
  }

  const loadPlayers = async () => {
    if (!supabase) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

      if (!profileData?.club_id) return

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("club_id", profileData.club_id)
        .order("number")

      if (error || !data) {
        console.error("[v0] Error loading players:", error)
        setAllPlayers([])
        return
      }

      setAllPlayers(data)

      // Solo inicializamos los 14 primeros jugadores si estamos creando un partido NUEVO
      if (!editingMatchId) {
        const initialActiveIds = data.slice(0, 14).map((p) => p.id)
        setActivePlayerIds(initialActiveIds)

        const initialStats: Record<number, Partial<MatchStats>> = {}
        initialActiveIds.forEach((playerId) => {
          initialStats[playerId] = createEmptyStats(playerId)
        })
        setStats(initialStats)
      }
      // Si estamos editando, la convocatoria se carga después en loadExistingMatch()
    } catch (error) {
      console.error("[v0] Error loading players:", error)
      setLoading(false)
    }
  }

  const createEmptyStats = (playerId: number): Partial<MatchStats> => ({
    player_id: playerId,
    match_id: 0,
    goles_totales: 0,
    goles_boya_jugada: 0,
    goles_hombre_mas: 0,
    goles_lanzamiento: 0,
    goles_dir_mas_5m: 0,
    goles_contraataque: 0,
    goles_penalti_anotado: 0,
    tiros_totales: 0,
    tiros_penalti_fallado: 0,
    tiros_corner: 0,
    tiros_fuera: 0,
    tiros_parados: 0,
    tiros_bloqueado: 0,
    tiros_eficiencia: 0,
    faltas_exp_20_1c1: 0,
    faltas_exp_20_boya: 0,
    faltas_penalti: 0,
    faltas_contrafaltas: 0,
    acciones_bloqueo: 0,
    acciones_asistencias: 0,
    acciones_recuperacion: 0,
    acciones_rebote: 0,
    acciones_exp_provocada: 0,
    acciones_penalti_provocado: 0,
    acciones_recibir_gol: 0,
    portero_goles_boya_parada: 0,
    portero_goles_hombre_menos: 0,
    portero_goles_dir_mas_5m: 0,
    portero_goles_contraataque: 0,
    portero_goles_penalti: 0,
    portero_paradas_totales: 0,
    portero_tiros_parada_recup: 0,
    portero_paradas_fuera: 0,
    portero_paradas_penalti_parado: 0,
    portero_acciones_perdida_pos: 0,
    goles_boya_cada: 0,
    goles_penalti_juego: 0,
    goles_penalti_fallo: 0,
    goles_corner: 0,
    goles_fuera: 0,
    goles_parados: 0,
    goles_bloqueado: 0,
    goles_eficiencia: 0,
    tiros_boya_cada: 0,
    tiros_hombre_mas: 0,
    tiros_lanzamiento: 0,
    tiros_dir_mas_5m: 0,
    tiros_contraataque: 0,
    tiros_penalti_juego: 0,
    faltas_exp_3_int: 0,
    faltas_exp_3_bruta: 0,
    acciones_perdida_poco: 0, // AÑADIDO ESTO
    portero_goles_lanzamiento: 0,
    portero_goles_penalti_encajado: 0,
    portero_tiros_parado: 0,
    portero_faltas_exp_3_int: 0,
    portero_acciones_rebote: 0,
    portero_acciones_gol_recibido: 0,
    portero_paradas_pedida: 0,
    portero_exp_provocada: 0,
    portero_penalti_provocado: 0,
    portero_recibir_gol: 0,
  })

  const hasStats = (playerId: number): boolean => {
    const playerStats = stats[playerId]
    if (!playerStats) return false

    return Object.entries(playerStats).some(([key, value]) => {
      if (key === "player_id" || key === "match_id") return false
      return typeof value === "number" && value > 0
    })
  }

  const getAvailablePlayers = (isGoalkeeper: boolean): Player[] => {
    return allPlayers.filter((player) => player.is_goalkeeper === isGoalkeeper && !activePlayerIds.includes(player.id))
  }

  // ADD FUNCTION TO ADD PLAYER TO THE FIELD (MAX 12 FIELD PLAYERS)
  const handleAddPlayer = (playerId: number) => {
    const player = allPlayers.find((p) => p.id === playerId)

    if (!player) return

    // Check if adding would exceed 12 field players
    const currentFieldPlayers = activePlayerIds.filter((id) => {
      const p = allPlayers.find((pl) => pl.id === id)
      return p && !p.is_goalkeeper
    }).length

    if (!player.is_goalkeeper && currentFieldPlayers >= 12) {
      alert("No se pueden añadir más de 12 jugadores de campo")
      return
    }

    setActivePlayerIds((prev) => [...prev, playerId])
    setStats((prev) => ({
      ...prev,
      [playerId]: createEmptyStats(playerId),
    }))
    setShowAddPlayerDialog(false)
    setSelectedAddPlayer(null)
  }

  const handleSubstitution = (oldPlayerId: number, newPlayerId: number) => {
    setActivePlayerIds((prev) => prev.filter((id) => id !== oldPlayerId).concat(newPlayerId))

    setStats((prev) => {
      const newStats = { ...prev }
      delete newStats[oldPlayerId]
      newStats[newPlayerId] = createEmptyStats(newPlayerId)
      return newStats
    })
  }

  const handleRemovePlayer = (playerId: number) => {
    setActivePlayerIds((prev) => prev.filter((id) => id !== playerId))

    setStats((prev) => {
      const newStats = { ...prev }
      delete newStats[playerId]
      return newStats
    })
  }

  const loadExistingMatch = async (matchId: number) => {
    if (!supabase) return

    try {
      const { data: match, error } = await supabase.from("matches").select("*").eq("id", matchId).single()

      if (error || !match) {
        console.error("Error loading match:", error)
        return
      }

      setExistingMatch(match)
      setMatchDate(match.match_date)
      setOpponent(match.opponent)
      setLocation(match.location || "")
      setIsHome(match.is_home)
      setSeason(match.season || getCurrentSeason())
      setJornada(match.jornada || 1)
      setNotes(match.notes || "")

      // LOAD PENALTY SCORES IF THEY EXIST
      setPenaltyHomeScore(match.penalty_home_score ?? null)
      setPenaltyAwayScore(match.penalty_away_score ?? null)

      setQuarterScores({
        1: { home: match.q1_score || 0, away: match.q1_score_rival || 0 },
        2: { home: match.q2_score || 0, away: match.q2_score_rival || 0 },
        3: { home: match.q3_score || 0, away: match.q3_score_rival || 0 },
        4: { home: match.q4_score || 0, away: match.q4_score_rival || 0 },
      })

      // ALSO SET CLOSED QUARTERS BASED ON MATCH DATA
      setClosedQuarters({
        1: match.q1_score !== undefined && match.q1_score_rival !== undefined,
        2: match.q2_score !== undefined && match.q2_score_rival !== undefined,
        3: match.q3_score !== undefined && match.q3_score_rival !== undefined,
        4: match.q4_score !== undefined && match.q4_score_rival !== undefined,
      })

      const { data: matchStats, error: statsError } = await supabase
        .from("match_stats")
        .select("*")
        .eq("match_id", matchId)

      if (statsError) {
        console.error("Error loading match stats:", statsError)
        return
      }

      if (matchStats && matchStats.length > 0) {
        const playerIds = matchStats.map((stat) => stat.player_id)
        setActivePlayerIds(playerIds)

        const statsMap: Record<number, Partial<MatchStats>> = {}
        matchStats.forEach((stat) => {
          const emptyTemplate = createEmptyStats(stat.player_id)
          // Merge: keep loaded values, fill missing fields with template
          statsMap[stat.player_id] = { ...emptyTemplate, ...stat }
          console.log(`[v0] Loaded stats for player ${stat.player_id}:`, statsMap[stat.player_id])
        })

        setStats(statsMap)
        console.log("[v0] All match stats loaded successfully")
      }

      // LOAD PENALTY SHOOTERS IF THEY EXIST
      const { data: penaltyPlayers, error: penaltyError } = await supabase
        .from("penalty_shootout_players")
        .select("*")
        .eq("match_id", matchId)
        .order("shot_order")

      if (penaltyError) {
        console.error("Error loading penalty shooters:", penaltyError)
      } else if (penaltyPlayers) {
        setPenaltyShooters(penaltyPlayers.map((p) => ({ playerId: p.player_id, scored: p.scored })))
      }
    } catch (error) {
      console.error("Error loading existing match:", error)
    }
  }

  const updateStat = (playerId: number, field: keyof MatchStats, value: number) => {
    setStats((prev) => {
      const currentStats = prev[playerId] || createEmptyStats(playerId)
      const safeValue = safeNumber(value)
      const newStats = { ...currentStats, [field]: safeValue }

      const player = allPlayers.find((p) => p.id === playerId)

      if (player?.is_goalkeeper) {
        const goalkeeperSaveCategories: (keyof MatchStats)[] = [
          "portero_tiros_parada_recup",
          "portero_paradas_fuera",
          "portero_paradas_penalti_parado",
          "portero_paradas_hombre_menos",
        ]

        if (field.startsWith("portero_") && (field.includes("parada") || field.includes("paradas"))) {
          newStats.portero_paradas_totales = goalkeeperSaveCategories.reduce((sum, cat) => {
            return sum + safeNumber(newStats[cat] as number)
          }, 0) as any
        }
      } else {
        const goalCategories: (keyof MatchStats)[] = [
          "goles_boya_jugada",
          "goles_hombre_mas",
          "goles_lanzamiento",
          "goles_dir_mas_5m",
          "goles_contraataque",
          "goles_penalti_anotado",
        ]

        const shotCategories: (keyof MatchStats)[] = [
          "tiros_hombre_mas",
          "tiros_penalti_fallado",
          "tiros_corner",
          "tiros_fuera",
          "tiros_parados",
          "tiros_bloqueado",
        ]

        if (field.startsWith("goles_") || field.startsWith("tiros_")) {
          newStats.goles_totales = goalCategories.reduce((sum, cat) => {
            return sum + safeNumber(newStats[cat] as number)
          }, 0) as any

          const totalMissedShots = shotCategories.reduce((sum, cat) => {
            return sum + safeNumber(newStats[cat] as number)
          }, 0)

          newStats.tiros_totales = (safeNumber(newStats.goles_totales as number) + totalMissedShots) as any

          const totalShots = safeNumber(newStats.tiros_totales as number)
          const totalGoals = safeNumber(newStats.goles_totales as number)

          if (totalShots > 0) {
            newStats.tiros_eficiencia = Math.round((totalGoals / totalShots) * 100) as any
            newStats.goles_eficiencia = newStats.tiros_eficiencia as any
          } else {
            newStats.tiros_eficiencia = 0 as any
            newStats.goles_eficiencia = 0 as any
          }
        }
      }

      const updatedAllStats = {
        ...prev,
        [playerId]: newStats,
      }

      setQuarterScores((prev) => {
        const updated = { ...prev }

        // encuentra el primer cuarto que NO está cerrado
        const activeQuarter = [1, 2, 3, 4].find((q) => !closedQuarters[q])
        if (!activeQuarter) return updated

        // recalcula solo el ACTIVO desde cero
        const { homeGoals, awayGoals } = calculateScores(updatedAllStats)

        // diferencia respecto al total del cuarto anterior
        const previousQuartersTotal = Object.values(prev)
          .slice(0, activeQuarter - 1)
          .reduce(
            (acc, q) => ({
              home: acc.home + q.home,
              away: acc.away + q.away,
            }),
            { home: 0, away: 0 },
          )

        updated[activeQuarter] = {
          home: homeGoals - previousQuartersTotal.home,
          away: awayGoals - previousQuartersTotal.away,
        }

        return updated
      })

      return updatedAllStats
    })
  }

  const handleSave = async () => {
    if (!opponent.trim()) {
      alert("Por favor, introduce el nombre del rival")
      return
    }

    if (!profile || !profile.club_id) {
      alert("Error: No se pudo obtener la información del club")
      return
    }

    const { homeGoals, awayGoals } = calculateScores(stats)
    // VALIDATE PENALTY SHOOTOUT IF THERE'S A TIE
    if (homeGoals === awayGoals) {
      if (penaltyHomeScore === null || penaltyAwayScore === null) {
        alert("El partido está empatado. Debes registrar el resultado de los penaltis.")
        return
      }
      if (penaltyHomeScore === penaltyAwayScore) {
        alert("La tanda de penaltis no puede terminar en empate. Debe haber un ganador.")
        return
      }
    }

    if (homeGoals === awayGoals && penaltyHomeScore !== null && penaltyShooters.length === 0) {
      toast({
        title: "Atención",
        description: "No has seleccionado los lanzadores de penaltis de tu equipo",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const { homeQ1, homeQ2, homeQ3, homeQ4, awayQ1, awayQ2, awayQ3, awayQ4 } = quarterScores
      const { sprint1Winner, sprint2Winner, sprint3Winner, sprint4Winner } = sprintWinners
      const maxPlayers = fieldPlayers.length

      if (editingMatchId && existingMatch) {
        const { error: matchError } = await supabase
          .from("matches")
          .update({
            match_date: matchDate,
            opponent,
            location: location || null,
            home_score: homeGoals,
            away_score: awayGoals,
            is_home: isHome,
            season: season || null,
            jornada: jornada || null,
            notes: notes || null,
            q1_score: homeQ1,
            q2_score: homeQ2,
            q3_score: homeQ3,
            q4_score: homeQ4,
            q1_score_rival: awayQ1,
            q2_score_rival: awayQ2,
            q3_score_rival: awayQ3,
            q4_score_rival: awayQ4,
            sprint1_winner: sprint1Winner === 1 ? 1 : sprint1Winner === 2 ? 2 : null,
            sprint2_winner: sprint2Winner === 1 ? 1 : sprint2Winner === 2 ? 2 : null,
            sprint3_winner: sprint3Winner === 1 ? 1 : sprint3Winner === 2 ? 2 : null,
            sprint4_winner: sprint4Winner === 1 ? 1 : sprint4Winner === 2 ? 2 : null,
            max_players_on_field: maxPlayers,
            // ADD PENALTY SHOOTOUT SCORES
            penalty_home_score: homeGoals === awayGoals ? penaltyHomeScore : null,
            penalty_away_score: homeGoals === awayGoals ? penaltyAwayScore : null,
          })
          .eq("id", editingMatchId)

        if (matchError) throw matchError

        await supabase.from("match_stats").delete().eq("match_id", editingMatchId)

        const statsToInsert = activePlayerIds.map((playerId) => ({
          ...stats[playerId],
          match_id: editingMatchId,
        }))

        const { error: statsError } = await supabase.from("match_stats").insert(statsToInsert)

        if (statsError) throw statsError

        // Update penalty shootout players if applicable
        if (homeGoals === awayGoals) {
          await supabase.from("penalty_shootout_players").delete().eq("match_id", editingMatchId)
          if (penaltyShooters.length > 0) {
            const penaltyPlayers = penaltyShooters.map((shooter, index) => ({
              match_id: editingMatchId,
              player_id: shooter.playerId,
              shot_order: index + 1,
              scored: shooter.scored,
            }))
            const { error: penaltyError } = await supabase.from("penalty_shootout_players").insert(penaltyPlayers)
            if (penaltyError) throw penaltyError
          }
          if (rivalPenalties.length > 0) {
            const { error: rivalError } = await supabase.from("penalty_shootout_players").insert(
              rivalPenalties.map((penalty, index) => ({
                match_id: editingMatchId,
                player_id: null, // No specific player ID for rival
                scored: penalty.result === "scored",
                is_home_team: false,
                // Store result type in a custom field if needed, e.g., 'result_type': penalty.result
              })),
            )
            if (rivalError) throw rivalError
          }
        } else {
          await supabase.from("penalty_shootout_players").delete().eq("match_id", editingMatchId)
        }

        router.push(`/partidos/${editingMatchId}`)
      } else {
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .insert({
            club_id: profile.club_id,
            match_date: matchDate,
            opponent,
            is_home: isHome,
            location: location || null,
            season: season || null,
            jornada: jornada || null,
            home_score: homeGoals,
            away_score: awayGoals,
            q1_score: homeQ1,
            q2_score: homeQ2,
            q3_score: homeQ3,
            q4_score: homeQ4,
            q1_score_rival: awayQ1,
            q2_score_rival: awayQ2,
            q3_score_rival: awayQ3,
            q4_score_rival: awayQ4,
            sprint1_winner: sprint1Winner === 1 ? 1 : sprint1Winner === 2 ? 2 : null,
            sprint2_winner: sprint2Winner === 1 ? 1 : sprint2Winner === 2 ? 2 : null,
            sprint3_winner: sprint3Winner === 1 ? 1 : sprint3Winner === 2 ? 2 : null,
            sprint4_winner: sprint4Winner === 1 ? 1 : sprint4Winner === 2 ? 2 : null,
            max_players_on_field: maxPlayers,
            notes: notes || null,
            penalty_home_score: homeGoals === awayGoals ? penaltyHomeScore : null,
            penalty_away_score: homeGoals === awayGoals ? penaltyAwayScore : null,
          })
          .select()
          .single()

        if (matchError) throw matchError

        const statsToInsert = activePlayerIds.map((playerId) => ({
          ...stats[playerId],
          match_id: matchData.id,
        }))

        const { error: statsError } = await supabase.from("match_stats").insert(statsToInsert)

        if (statsError) throw statsError

        if (matchData && penaltyShooters.length > 0) {
          const penaltyPlayers = penaltyShooters.map((shooter, index) => ({
            match_id: matchData.id,
            player_id: shooter.playerId,
            shot_order: index + 1,
            scored: shooter.scored,
          }))

          const { error: penaltyError } = await supabase.from("penalty_shootout_players").insert(penaltyPlayers)

          if (penaltyError) {
            console.error("[v0] Error saving penalty shooters:", penaltyError)
            // Non-fatal error, we still have the match saved
          }
        }

        if (matchData && rivalPenalties.length > 0) {
          const { error: rivalError } = await supabase.from("penalty_shootout_players").insert(
            rivalPenalties.map((penalty, index) => ({
              match_id: matchData.id,
              player_id: null, // No specific player ID for rival
              scored: penalty.result === "scored",
              is_home_team: false,
              // Store result type in a custom field if needed, e.g., 'result_type': penalty.result
            })),
          )
          if (rivalError) {
            console.error("[v0] Error saving rival penalty shooters:", rivalError)
            // Non-fatal error
          }
        }

        router.push(`/partidos/${matchData.id}`)
      }
    } catch (error) {
      console.error("Error saving match:", error)
      alert("Error al guardar el partido")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (permissionError) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para crear partidos. Solo los administradores y entrenadores pueden acceder a esta
            página.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.back()}>Volver al Inicio</Button>
        </div>
      </main>
    )
  }

  const activePlayers = allPlayers.filter((p) => activePlayerIds.includes(p.id))
  const fieldPlayers = activePlayers.filter((p) => !p.is_goalkeeper)
  const goalkeepers = activePlayers.filter((p) => p.is_goalkeeper)

  const { homeGoals, awayGoals } = calculateScores(stats)
  // CHECK IF MATCH IS TIED
  const isTied = homeGoals === awayGoals

  const selectedPlayersForPenalty = activePlayerIds.map((id) => {
    const player = allPlayers.find((p) => p.id === id)
    return {
      playerId: id,
      played: true, // Assuming 'played' status is determined elsewhere or implicitly
      is_goalkeeper: player?.is_goalkeeper || false,
      jersey_number: player?.number,
      name: player?.name,
      status: player?.status, // Assuming status indicates if they are available/played
    }
  })

  const players = allPlayers // Use allPlayers for the dialog
  const homeTeamName = myClub?.name || "Mi Equipo"
  const awayTeamName = opponent || "Rival"

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{editingMatchId ? "Editar Partido" : "Nuevo Partido"}</h1>
        <p className="text-muted-foreground text-lg">
          {editingMatchId ? "Actualiza las estadísticas del partido" : "Registra las estadísticas del partido"}
        </p>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <Badge variant="secondary" className="text-sm">
            Convocatoria: {activePlayerIds.length} jugadores
          </Badge>
          {previousMatches.length > 0 && (
            <Select onValueChange={(value) => loadLineupFromMatch(Number(value))} disabled={loadingLineup}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Cargar convocatoria anterior" />
              </SelectTrigger>
              <SelectContent>
                {previousMatches.map((match) => (
                  <SelectItem key={match.id} value={match.id.toString()}>
                    {new Date(match.match_date).toLocaleDateString()} - {match.opponent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {loadingLineup && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className={`grid w-full ${isTied ? "grid-cols-4" : "grid-cols-3"} mb-6 h-auto`}>
          {/* TAB: Información */}
          <TabsTrigger value="info" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            {/* Móvil */}
            <span className="sm:hidden block truncate">Info</span>
            {/* Desktop */}
            <span className="hidden sm:inline block truncate">Información de Partido</span>
          </TabsTrigger>

          {/* TAB: Jugadores de Campo */}
          <TabsTrigger value="field" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            {/* Móvil */}
            <span className="sm:hidden block truncate">Campo ({fieldPlayers.length})</span>
            {/* Desktop */}
            <span className="hidden sm:inline block truncate">Jugadores de Campo ({fieldPlayers.length})</span>
          </TabsTrigger>

          {/* TAB: Porteros */}
          <TabsTrigger value="goalkeepers" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            {/* Móvil */}
            <span className="sm:hidden block truncate">Porteros ({goalkeepers.length})</span>
            {/* Desktop */}
            <span className="hidden sm:inline block truncate">Porteros ({goalkeepers.length})</span>
          </TabsTrigger>

          {isTied && (
            <TabsTrigger value="penalties" className="text-xs sm:text-sm px-2 sm:px-4 py-2 relative">
              <span className="sm:hidden block truncate">Penaltis</span>
              <span className="hidden sm:inline block truncate">Tanda de Penaltis</span>
              {isTied && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información del Partido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input id="date" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opponent">Rival *</Label>
                  <Input
                    id="opponent"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    placeholder="Nombre del equipo rival"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Piscina o ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="home-score">Goles Propios</Label>
                  <Input
                    id="home-score"
                    type="number"
                    value={homeGoals}
                    readOnly
                    className="bg-muted text-center text-lg font-bold"
                    title="Se calcula automáticamente sumando los goles de los jugadores"
                  />
                  <p className="text-xs text-muted-foreground">Se calcula automáticamente</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="away-score">Goles Rival</Label>
                  <Input
                    id="away-score"
                    type="number"
                    value={awayGoals}
                    readOnly
                    className="bg-muted text-center text-lg font-bold"
                    title="Se calcula automáticamente desde las estadísticas del portero"
                  />
                  <p className="text-xs text-muted-foreground">Se calcula desde goles del portero</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season">Temporada</Label>
                  <Input id="season" value={season} onChange={(e) => setSeason(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jornada">Jornada</Label>
                  <Input
                    id="jornada"
                    type="number"
                    value={jornada}
                    onChange={(e) => setJornada(Number.parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-3 border-t pt-4 mt-4">
                <h3 className="font-semibold text-sm mb-3">Puntuación por Parciales</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((q) => (
                    <div
                      key={q}
                      className={`space-y-2 p-3 border rounded ${
                        closedQuarters[q] ? "bg-gray-200/50 opacity-60 dark:bg-gray-800/50" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Parcial {q}</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Propios</Label>
                          <Input
                            type="number"
                            value={quarterScores[q].home}
                            onChange={(e) => {
                              if (!closedQuarters[q]) {
                                setQuarterScores((prev) => ({
                                  ...prev,
                                  [q]: { ...prev[q], home: Number.parseInt(e.target.value) || 0 },
                                }))
                              }
                            }}
                            disabled={closedQuarters[q]}
                            min={0}
                            className="text-center font-bold text-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rival</Label>
                          <Input
                            type="number"
                            value={quarterScores[q].away}
                            onChange={(e) => {
                              if (!closedQuarters[q]) {
                                setQuarterScores((prev) => ({
                                  ...prev,
                                  [q]: { ...prev[q], away: Number.parseInt(e.target.value) || 0 },
                                }))
                              }
                            }}
                            disabled={closedQuarters[q]}
                            min={0}
                            className="text-center font-bold text-lg"
                          />
                        </div>
                      </div>
                      {/* SPRINT WINNER CHECKBOX */}
                      <button
                        type="button"
                        onClick={() =>
                          setSprintWinners((prev) => ({
                            ...prev,
                            [q]: prev[q] === 1 ? 0 : 1,
                          }))
                        }
                        className={`w-full mt-2 py-2 rounded-md text-xs font-semibold transition-all border
														${
                              sprintWinners[q] === 1
                                ? "bg-green-500 text-white border-green-600"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600"
                            }`}
                      >
                        {sprintWinners[q] === 1 ? "Sprint ganado" : "Sprint NO ganado"}
                      </button>
                      <Button
                        size="sm"
                        variant={closedQuarters[q] ? "default" : "destructive"}
                        onClick={() => setClosedQuarters((prev) => ({ ...prev, [q]: !prev[q] }))}
                        className="w-full mt-2 text-xs"
                      >
                        {closedQuarters[q] ? "Abrir Parcial" : "Cerrar Parcial"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones del partido..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="field">
          <Card>
            <CardHeader>
              <CardTitle>Jugadores de Campo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {fieldPlayers.map((player) => (
                  <div key={player.id} className="relative">
                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-primary/10 bg-transparent w-full border-2 hover:border-primary transition-all"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url || "/placeholder.svg"}
                            alt={player.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <span className="text-primary-foreground font-bold text-lg">{player.number}</span>
                        )}
                      </div>
                      <span className="font-medium text-sm text-center w-full truncate px-1">{player.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {safeNumber(stats[player.id]?.goles_totales)} goles
                      </span>
                    </Button>
                    {!hasStats(player.id) && getAvailablePlayers(false).length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSubstitutionPlayer(player)
                        }}
                        title="Sustituir jugador"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {/* ADD "CONVOCAR" BUTTON TO ADD NEW FIELD PLAYERS */}
                {getAvailablePlayers(false).length > 0 && fieldPlayers.length < 12 && (
                  <Button
                    variant="outline"
                    className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-green-500/10 bg-transparent w-full border-2 border-dashed hover:border-green-500 transition-all"
                    onClick={() => setShowAddPlayerDialog(true)}
                  >
                    <Plus className="h-8 w-8 text-green-500" />
                    <span className="font-medium text-sm text-center">Convocar Jugador</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goalkeepers">
          <Card>
            <CardHeader>
              <CardTitle>Porteros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {goalkeepers.map((player) => (
                  <div key={player.id} className="relative">
                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-primary/10 bg-transparent w-full border-2 hover:border-primary transition-all"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url || "/placeholder.svg"}
                            alt={player.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <span className="text-primary-foreground font-bold">{player.number}</span>
                        )}
                      </div>
                      <span className="font-medium text-sm text-center w-full truncate px-1">{player.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {safeNumber(stats[player.id]?.portero_paradas_totales)} paradas
                      </span>
                    </Button>
                    {!hasStats(player.id) && getAvailablePlayers(true).length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSubstitutionPlayer(player)
                        }}
                        title="Sustituir jugador"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isTied && (
          <TabsContent value="penalties">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg">
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Target className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl sm:text-2xl font-bold">Tanda de Penaltis</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      El marcador está {homeGoals}-{awayGoals}. Registra los lanzamientos para determinar el ganador.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* My Team Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg sm:text-xl">{myClub?.name || "Mi Equipo"}</h3>
                          <p className="text-xs text-muted-foreground">Lanzadores</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-bold text-primary">
                          {penaltyShooters.filter((s) => s.scored).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Goles</p>
                      </div>
                    </div>

                    {/* Players Grid */}
                    <div className="space-y-3">
                      {penaltyShooters.map((shooter) => {
                        const player = fieldPlayers.find((p) => p.id === shooter.playerId)
                        if (!player) return null

                        return (
                          <div
                            key={shooter.playerId}
                            className={`relative p-4 rounded-xl border-2 transition-all duration-200 shadow-md ${
                              shooter.scored
                                ? "border-green-500 bg-gradient-to-br from-green-500/15 to-green-500/5 shadow-green-500/20"
                                : "border-red-500 bg-gradient-to-br from-red-500/15 to-red-500/5 shadow-red-500/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                                  shooter.scored
                                    ? "bg-gradient-to-br from-green-500 to-green-600 text-white"
                                    : "bg-gradient-to-br from-red-500 to-red-600 text-white"
                                }`}
                              >
                                {player.number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base truncate">{player.name}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPenaltyShooters((prev) =>
                                      prev.map((s) =>
                                        s.playerId === shooter.playerId ? { ...s, scored: !s.scored } : s,
                                      ),
                                    )
                                  }}
                                  className={`text-sm font-medium transition-colors hover:underline ${
                                    shooter.scored
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {shooter.scored ? "⚽ Gol marcado" : "✕ Penalti fallado"}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPenaltyShooters((prev) => prev.filter((s) => s.playerId !== shooter.playerId))
                                }}
                                className="flex-shrink-0 p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}

                      {/* Add Player Button */}
                      <Dialog open={showPenaltyShooterDialog} onOpenChange={setShowPenaltyShooterDialog}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed border-2 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all bg-transparent"
                          >
                            <Plus className="mr-2 h-5 w-5" />
                            <span className="font-semibold">Añadir Lanzador</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Seleccionar Lanzador</DialogTitle>
                            <DialogDescription>Elige el jugador y marca si anotó o falló el penalti</DialogDescription>
                          </DialogHeader>

                          {/* Lista filtrada una sola vez */}
                          {(() => {
                            const availablePenaltyPlayers = fieldPlayers.filter(
                              (p) => !penaltyShooters.some((s) => s.playerId === p.id),
                            )

                            return (
                              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {availablePenaltyPlayers.length > 0 ? (
                                  availablePenaltyPlayers.map((player) => (
                                    <div
                                      key={player.id}
                                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                                    >
                                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {player.number}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{player.name}</p>
                                      </div>

                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="border-green-500 text-green-600 hover:bg-green-500/10 bg-transparent"
                                          onClick={() => {
                                            setPenaltyShooters((prev) => [
                                              ...prev,
                                              { playerId: player.id, scored: true },
                                            ])
                                            setShowPenaltyShooterDialog(false)
                                          }}
                                        >
                                          ⚽ Gol
                                        </Button>

                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="border-red-500 text-red-600 hover:bg-red-500/10 bg-transparent"
                                          onClick={() => {
                                            setPenaltyShooters((prev) => [
                                              ...prev,
                                              { playerId: player.id, scored: false },
                                            ])
                                            setShowPenaltyShooterDialog(false)
                                          }}
                                        >
                                          ✕ Falla
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-center text-sm text-muted-foreground py-4">
                                    Todos los jugadores han sido añadidos
                                  </p>
                                )}
                              </div>
                            )
                          })()}
                        </DialogContent>
                      </Dialog>

                      {penaltyShooters.length === 0 && (
                        <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-xl bg-muted/30">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Añade los jugadores que lanzaron penaltis
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rival Team Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border-2 border-destructive/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-destructive/20">
                          <Users className="h-6 w-6 text-destructive" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg sm:text-xl">{opponent || "Rival"}</h3>
                          <p className="text-xs text-muted-foreground">Lanzadores</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-bold text-destructive">
                          {rivalPenalties.filter((p) => p.result === "scored").length}
                        </div>
                        <p className="text-xs text-muted-foreground">Goles</p>
                      </div>
                    </div>

                    {/* Rival Penalties */}
                    <div className="space-y-3">
                      {rivalPenalties.map((penalty, index) => (
                        <div
                          key={penalty.id}
                          className={`p-4 rounded-xl border-2 transition-all shadow-md ${
                            penalty.result === "scored"
                              ? "border-red-500 bg-gradient-to-br from-red-500/15 to-red-500/5 shadow-red-500/20"
                              : penalty.result === "saved"
                                ? "border-blue-500 bg-gradient-to-br from-blue-500/15 to-blue-500/5 shadow-blue-500/20"
                                : "border-orange-500 bg-gradient-to-br from-orange-500/15 to-orange-500/5 shadow-orange-500/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg ${
                                penalty.result === "scored"
                                  ? "bg-gradient-to-br from-red-500 to-red-600"
                                  : penalty.result === "saved"
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                    : "bg-gradient-to-br from-orange-500 to-orange-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={penalty.result === "scored" ? "default" : "outline"}
                                onClick={() =>
                                  setRivalPenalties((prev) =>
                                    prev.map((p) => (p.id === penalty.id ? { ...p, result: "scored" } : p)),
                                  )
                                }
                                className={
                                  penalty.result === "scored"
                                    ? "bg-red-500 hover:bg-red-600 text-white shadow-md"
                                    : "border-red-500 text-red-600 hover:bg-red-500/10"
                                }
                              >
                                ⚽ Gol
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
                                className={
                                  penalty.result === "missed"
                                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                                    : "border-orange-500 text-orange-600 hover:bg-orange-500/10"
                                }
                              >
                                ✕ Falla
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={penalty.result === "saved" ? "default" : "outline"}
                                onClick={() =>
                                  setRivalPenalties((prev) =>
                                    prev.map((p) => (p.id === penalty.id ? { ...p, result: "saved" } : p)),
                                  )
                                }
                                className={
                                  penalty.result === "saved"
                                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                                    : "border-blue-500 text-blue-600 hover:bg-blue-500/10"
                                }
                              >
                                🧤 Parada
                              </Button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRivalPenalties((prev) => prev.filter((p) => p.id !== penalty.id))}
                              className="flex-shrink-0 p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRivalPenalties((prev) => [...prev, { id: Date.now(), result: "missed" }])}
                        className="w-full border-dashed border-2 h-auto py-4 hover:border-destructive hover:bg-destructive/5 transition-all"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        <span className="font-semibold">Añadir Lanzamiento Rival</span>
                      </Button>

                      {rivalPenalties.length === 0 && (
                        <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-xl bg-muted/30">
                          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Añade los lanzamientos del equipo rival
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Result Summary - Full Width Below Columns */}
                {penaltyShooters.length > 0 && rivalPenalties.length > 0 && (
                  <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 shadow-lg">
                    <div className="flex items-center justify-center gap-8 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2 font-medium">{homeTeamName}</p>
                        <p className="text-5xl sm:text-6xl font-bold text-primary tabular-nums">
                          {penaltyShooters.filter((s) => s.scored).length}
                        </p>
                      </div>
                      <div className="text-4xl font-bold text-muted-foreground">-</div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2 font-medium">{awayTeamName}</p>
                        <p className="text-5xl sm:text-6xl font-bold text-destructive tabular-nums">
                          {rivalPenalties.filter((p) => p.result === "scored").length}
                        </p>
                      </div>
                    </div>

                    {penaltyShooters.filter((s) => s.scored).length !==
                      rivalPenalties.filter((p) => p.result === "scored").length && (
                      <div
                        className={`p-4 rounded-xl text-center font-bold text-lg flex items-center justify-center gap-3 shadow-md ${
                          penaltyShooters.filter((s) => s.scored).length >
                          rivalPenalties.filter((p) => p.result === "scored").length
                            ? "bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-600 dark:text-green-400 border-2 border-green-500/30"
                            : "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-600 dark:text-red-400 border-2 border-red-500/30"
                        }`}
                      >
                        {penaltyShooters.filter((s) => s.scored).length >
                        rivalPenalties.filter((p) => p.result === "scored").length ? (
                          <>
                            <Trophy className="h-6 w-6" />
                            Victoria en la Tanda de Penaltis
                          </>
                        ) : (
                          <>
                            <XCircle className="h-6 w-6" />
                            Derrota en la Tanda de Penaltis
                          </>
                        )}
                      </div>
                    )}

                    {penaltyShooters.filter((s) => s.scored).length ===
                      rivalPenalties.filter((p) => p.result === "scored").length && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-600 dark:text-amber-400 text-center font-bold text-lg flex items-center justify-center gap-3 border-2 border-amber-500/30 shadow-md">
                        <AlertCircle className="h-6 w-6" />
                        Los penaltis no pueden terminar en empate
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {substitutionPlayer && (
        <PlayerSubstitutionDialog
          open={!!substitutionPlayer}
          onOpenChange={(open) => !open && setSubstitutionPlayer(null)}
          currentPlayer={substitutionPlayer}
          availablePlayers={getAvailablePlayers(substitutionPlayer.is_goalkeeper)}
          onSubstitute={(newPlayerId) => {
            handleSubstitution(substitutionPlayer.id, newPlayerId)
            setSubstitutionPlayer(null)
          }}
          onRemove={(playerId) => {
            handleRemovePlayer(playerId)
            setSubstitutionPlayer(null)
          }}
        />
      )}

      {/* ADD DIALOG TO SELECT PLAYER TO ADD */}
      {showAddPlayerDialog && (
        <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Convocar Jugador
              </DialogTitle>
              <DialogDescription>
                Selecciona un jugador de campo para añadir a la convocatoria (máximo 12)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-player">Selecciona el jugador</Label>
                <Select
                  value={selectedAddPlayer?.id.toString() || ""}
                  onValueChange={(value) => {
                    const player = allPlayers.find((p) => p.id === Number(value))
                    setSelectedAddPlayer(player || null)
                  }}
                >
                  <SelectTrigger id="add-player">
                    <SelectValue placeholder="Elige un jugador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePlayers(false).length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">No hay jugadores disponibles</div>
                    ) : (
                      getAvailablePlayers(false).map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          #{player.number} - {player.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddPlayerDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedAddPlayer) {
                      handleAddPlayer(selectedAddPlayer.id)
                    }
                  }}
                  disabled={!selectedAddPlayer}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Convocar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedPlayer && (
        <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedPlayer.photo_url ? (
                    <img
                      src={selectedPlayer.photo_url || "/placeholder.svg"}
                      alt={selectedPlayer.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-primary-foreground font-bold">{selectedPlayer.number}</span>
                  )}
                </div>
                {selectedPlayer.name}
              </DialogTitle>
            </DialogHeader>

            {selectedPlayer.is_goalkeeper ? (
              <GoalkeeperStatsDialog
                player={selectedPlayer}
                stats={stats[selectedPlayer.id] || createEmptyStats(selectedPlayer.id)}
                onUpdate={(field, value) => updateStat(selectedPlayer.id, field, value)}
              />
            ) : (
              <FieldPlayerStatsDialog
                player={selectedPlayer}
                stats={stats[selectedPlayer.id] || createEmptyStats(selectedPlayer.id)}
                onUpdate={(field, value) => updateStat(selectedPlayer.id, field, value)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {showPenaltyShooterDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border-2 border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Seleccionar Lanzador</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Elige el jugador y marca si anotó o falló el penalti
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPenaltyShooterDialog(false)}
                  className="h-10 w-10 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {(() => {
                  const availablePlayers = fieldPlayers.filter((p) => !penaltyShooters.some((s) => s.playerId === p.id))

                  if (availablePlayers.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-semibold text-foreground mb-1">Todos los jugadores añadidos</p>
                        <p className="text-sm text-muted-foreground">
                          No hay más jugadores disponibles para lanzar penaltis
                        </p>
                      </div>
                    )
                  }

                  return availablePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="group flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
                    >
                      {/* Player Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center font-bold text-lg text-primary">
                          {player.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.is_goalkeeper ? "Portero" : "Jugador"}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setPenaltyShooters((prev) => [...prev, { playerId: player.id, scored: true }])
                            setShowPenaltyShooterDialog(false)
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Gol
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setPenaltyShooters((prev) => [...prev, { playerId: player.id, scored: false }])
                            setShowPenaltyShooterDialog(false)
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Falla
                        </Button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-muted/30">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPenaltyShooterDialog(false)}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-40">
        <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              {editingMatchId ? "Actualizar Partido" : "Guardar Partido"}
            </>
          )}
        </Button>
      </div>
    </main>
  )
}

function FieldPlayerStatsDialog({
  player,
  stats,
  onUpdate,
}: {
  player: Player
  stats: Partial<MatchStats>
  onUpdate: (field: keyof MatchStats, value: number) => void
}) {
  return (
    <Tabs defaultValue="goles" className="w-full">
      <TabsList className="grid w-full grid-cols-5 h-auto">
        <TabsTrigger value="goles" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
          Goles
        </TabsTrigger>
        <TabsTrigger value="tiros" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
          Tiros
        </TabsTrigger>
        <TabsTrigger value="superioridad" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
          <span className="sm:hidden block truncate">Sup.</span>
          <span className="hidden sm:inline block truncate">Superioridad</span>
        </TabsTrigger>
        <TabsTrigger value="faltas" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
          Faltas
        </TabsTrigger>
        <TabsTrigger value="acciones" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
          Acciones
        </TabsTrigger>
      </TabsList>

      <TabsContent value="goles" className="space-y-4 mt-4">
        <p className="text-sm text-muted-foreground mb-4">
          El total se calcula automáticamente sumando todos los tipos de goles.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField label="Totales" value={safeNumber(stats.goles_totales)} onChange={() => {}} readOnly />
          <StatField
            label="Boya/Jugada"
            value={safeNumber(stats.goles_boya_jugada)}
            onChange={(v) => onUpdate("goles_boya_jugada", v)}
          />
          <StatField
            label="Lanzamiento"
            value={safeNumber(stats.goles_lanzamiento)}
            onChange={(v) => onUpdate("goles_lanzamiento", v)}
          />
          <StatField
            label="Dir +5m"
            value={safeNumber(stats.goles_dir_mas_5m)}
            onChange={(v) => onUpdate("goles_dir_mas_5m", v)}
          />
          <StatField
            label="Contraataque"
            value={safeNumber(stats.goles_contraataque)}
            onChange={(v) => onUpdate("goles_contraataque", v)}
          />
          <StatField
            label="Penalti Anotado"
            value={safeNumber(stats.goles_penalti_anotado)}
            onChange={(v) => onUpdate("goles_penalti_anotado", v)}
          />
        </div>
      </TabsContent>

      <TabsContent value="tiros" className="space-y-4 mt-4">
        <p className="text-sm text-muted-foreground mb-4">
          El total incluye goles + tiros fallados. La eficiencia se calcula automáticamente.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField label="Totales" value={safeNumber(stats.tiros_totales)} onChange={() => {}} readOnly />
          <StatField
            label="Penalti Fallado"
            value={safeNumber(stats.tiros_penalti_fallado)}
            onChange={(v) => onUpdate("tiros_penalti_fallado", v)}
          />
          <StatField
            label="Corner"
            value={safeNumber(stats.tiros_corner)}
            onChange={(v) => onUpdate("tiros_corner", v)}
          />
          <StatField label="Fuera" value={safeNumber(stats.tiros_fuera)} onChange={(v) => onUpdate("tiros_fuera", v)} />
          <StatField
            label="Parados"
            value={safeNumber(stats.tiros_parados)}
            onChange={(v) => onUpdate("tiros_parados", v)}
          />
          <StatField
            label="Bloqueado"
            value={safeNumber(stats.tiros_bloqueado)}
            onChange={(v) => onUpdate("tiros_bloqueado", v)}
          />
          <StatField
            label="Eficiencia %"
            value={safeNumber(stats.tiros_eficiencia)}
            onChange={() => {}}
            readOnly
            suffix="%"
          />
        </div>
      </TabsContent>

      <TabsContent value="superioridad" className="space-y-4 mt-4">
        <p className="text-sm text-muted-foreground mb-4">Estadísticas específicas de superioridad (Hombre +).</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField
            label="Goles Hombre +"
            value={safeNumber(stats.goles_hombre_mas)}
            onChange={(v) => onUpdate("goles_hombre_mas", v)}
          />

          <StatField
            label="Fallos Hombre +"
            value={safeNumber(stats.tiros_hombre_mas)}
            onChange={(v) => onUpdate("tiros_hombre_mas", v)}
          />

          <StatField
            label="Eficiencia %"
            value={(() => {
              const g = safeNumber(stats.goles_hombre_mas)
              const t = safeNumber(stats.tiros_hombre_mas)
              return g + t > 0 ? Math.round((g / (g + t)) * 100) : 0
            })()}
            onChange={() => {}}
            readOnly
            suffix="%"
          />
        </div>
      </TabsContent>

      <TabsContent value="faltas" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField
            label="Exp 18'' 1c1"
            value={safeNumber(stats.faltas_exp_20_1c1)}
            onChange={(v) => onUpdate("faltas_exp_20_1c1", v)}
          />
          <StatField
            label="Exp 18'' Boya"
            value={safeNumber(stats.faltas_exp_20_boya)}
            onChange={(v) => onUpdate("faltas_exp_20_boya", v)}
          />
          <StatField
            label="Penalti"
            value={safeNumber(stats.faltas_penalti)}
            onChange={(v) => onUpdate("faltas_penalti", v)}
          />
          <StatField
            label="Contrafaltas"
            value={safeNumber(stats.faltas_contrafaltas)}
            onChange={(v) => onUpdate("faltas_contrafaltas", v)}
          />
        </div>
      </TabsContent>

      <TabsContent value="acciones" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField
            label="Bloqueo"
            value={safeNumber(stats.acciones_bloqueo)}
            onChange={(v) => onUpdate("acciones_bloqueo", v)}
          />
          <StatField
            label="Asistencias"
            value={safeNumber(stats.acciones_asistencias)}
            onChange={(v) => onUpdate("acciones_asistencias", v)}
          />
          <StatField
            label="Recuperación"
            value={safeNumber(stats.acciones_recuperacion)}
            onChange={(v) => onUpdate("acciones_recuperacion", v)}
          />
          <StatField
            label="Rebote"
            value={safeNumber(stats.acciones_rebote)}
            onChange={(v) => onUpdate("acciones_rebote", v)}
          />
          <StatField
            label="Exp Provocada"
            value={safeNumber(stats.acciones_exp_provocada)}
            onChange={(v) => onUpdate("acciones_exp_provocada", v)}
          />
          <StatField
            label="Penalti Provocado"
            value={safeNumber(stats.acciones_penalti_provocado)}
            onChange={(v) => onUpdate("acciones_penalti_provocado", v)}
          />
          <StatField
            label="Recibe Gol"
            value={safeNumber(stats.acciones_recibir_gol)}
            onChange={(v) => onUpdate("acciones_recibir_gol", v)}
          />
          <StatField
            label="Pérdida Posesión"
            value={safeNumber(stats.acciones_perdida_poco)}
            onChange={(v) => onUpdate("acciones_perdida_poco", v)}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}

function GoalkeeperStatsDialog({
  player,
  stats,
  onUpdate,
}: {
  player: Player
  stats: Partial<MatchStats>
  onUpdate: (field: keyof MatchStats, value: number) => void
}) {
  const totalGoalsConceded =
    safeNumber(stats.portero_goles_boya_parada) +
    safeNumber(stats.portero_goles_hombre_menos) +
    safeNumber(stats.portero_goles_dir_mas_5m) +
    safeNumber(stats.portero_goles_contraataque) +
    safeNumber(stats.portero_goles_penalti)

  return (
    <Tabs defaultValue="goles" className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-auto">
        <TabsTrigger value="goles" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
          Goles
        </TabsTrigger>
        <TabsTrigger value="paradas" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
          Paradas
        </TabsTrigger>
        <TabsTrigger value="inferioridad" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
          <span className="sm:hidden block truncate">Inf.</span>
          <span className="hidden sm:inline block truncate">Inferioridad</span>
        </TabsTrigger>
        <TabsTrigger value="acciones" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
          Acciones
        </TabsTrigger>
      </TabsList>

      <TabsContent value="goles" className="space-y-4 mt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Registra los goles encajados del equipo rival. Se suman automáticamente a "Goles Rival".
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField label="Totales" value={totalGoalsConceded} onChange={() => {}} readOnly />
          <StatField
            label="Boya"
            value={safeNumber(stats.portero_goles_boya_parada)}
            onChange={(v) => onUpdate("portero_goles_boya_parada", v)}
          />
          <StatField
            label="Dir +5m"
            value={safeNumber(stats.portero_goles_dir_mas_5m)}
            onChange={(v) => onUpdate("portero_goles_dir_mas_5m", v)}
          />
          <StatField
            label="Contraataque"
            value={safeNumber(stats.portero_goles_contraataque)}
            onChange={(v) => onUpdate("portero_goles_contraataque", v)}
          />
          <StatField
            label="Penalti"
            value={safeNumber(stats.portero_goles_penalti)}
            onChange={(v) => onUpdate("portero_goles_penalti", v)}
          />
        </div>
      </TabsContent>

      <TabsContent value="paradas" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField label="Totales" value={safeNumber(stats.portero_paradas_totales)} onChange={() => {}} readOnly />
          <StatField
            label="Parada Recup"
            value={safeNumber(stats.portero_tiros_parada_recup)}
            onChange={(v) => onUpdate("portero_tiros_parada_recup", v)}
          />
          <StatField
            label="Parada Fuera"
            value={safeNumber(stats.portero_paradas_fuera)}
            onChange={(v) => onUpdate("portero_paradas_fuera", v)}
          />
          <StatField
            label="Penalti Parado"
            value={safeNumber(stats.portero_paradas_penalti_parado)}
            onChange={(v) => onUpdate("portero_paradas_penalti_parado", v)}
          />
        </div>
      </TabsContent>

      <TabsContent value="inferioridad" className="space-y-4 mt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Estadísticas de inferioridad numérica (Hombre -). Se suman automáticamente al marcador del rival.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField
            label="Goles Hombre -"
            value={safeNumber(stats.portero_goles_hombre_menos)}
            onChange={(v) => onUpdate("portero_goles_hombre_menos", v)}
          />

          <StatField
            label="Paradas/defensa Hombre -"
            value={safeNumber(stats.portero_paradas_hombre_menos)}
            onChange={(v) => onUpdate("portero_paradas_hombre_menos", v)}
          />

          <StatField
            label="Eficiencia %"
            value={(() => {
              const goles = safeNumber(stats.portero_goles_hombre_menos)
              const paradas = safeNumber(stats.portero_paradas_hombre_menos)
              const total = goles + paradas
              return total > 0 ? Math.round((paradas / total) * 100) : 0
            })()}
            onChange={() => {}}
            readOnly
            suffix="%"
          />
        </div>
      </TabsContent>

      <TabsContent value="acciones" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatField
            label="Asistencias"
            value={safeNumber(stats.acciones_asistencias)}
            onChange={(v) => onUpdate("acciones_asistencias", v)}
          />
          <StatField
            label="Recuperación"
            value={safeNumber(stats.acciones_recuperacion)}
            onChange={(v) => onUpdate("acciones_recuperacion", v)}
          />
          <StatField
            label="Pérdida Posesión"
            value={safeNumber(stats.portero_acciones_perdida_pos)}
            onChange={(v) => onUpdate("portero_acciones_perdida_pos", v)}
          />
          <StatField
            label="Expulsión Provocada"
            value={safeNumber(stats.acciones_exp_provocada)}
            onChange={(v) => onUpdate("acciones_exp_provocada", v)}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}

function StatField({
  label,
  value,
  onChange,
  readOnly = false,
  suffix,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  readOnly?: boolean
  suffix?: string
}) {
  const displayValue = safeNumber(value)

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {readOnly ? (
        <Input value={suffix ? `${displayValue}${suffix}` : displayValue} readOnly className="bg-muted" />
      ) : (
        <StatInput value={displayValue} onChange={onChange} />
      )}
    </div>
  )
}

const safeNumber = (value: number | undefined | null): number => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0
  }
  return value
}

const getCurrentSeason = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // JavaScript months are 0-indexed

  // If it's September (9) or later, we're in the new season
  if (month >= 9) {
    return `${year}-${year + 1}`
  } else {
    return `${year - 1}-${year}`
  }
}
