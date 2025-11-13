"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SeasonSelector } from "@/components/season-selector"
import { TopPlayersTable } from "@/components/top-players-table"
import { MatchResultsChart } from "@/components/match-results-chart"
import { ExportButtons } from "@/components/export-buttons"
import { prepareMatchesForExport, preparePlayersForExport } from "@/lib/export-utils"
import { ManAdvantageChart } from "@/components/man-advantage-chart"
import { ManDownGoalkeeperChart } from "@/components/man-down-goalkeeper-chart"
import { GoalDifferenceEvolutionChart } from "@/components/goal-difference-evolution-chart"
import { useClub } from "@/lib/club-context"
import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"

export default function AnalyticsPage() {
  const { currentClub } = useClub()
  const searchParams = useSearchParams()
  const seasonParam = searchParams.get("season")

  const [seasons, setSeasons] = useState<string[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>("")
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [allStats, setAllStats] = useState<any[]>([])
  const [playerStats, setPlayerStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const abortController = new AbortController()
    let isMounted = true

    async function fetchData() {
      if (!currentClub) {
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const supabase = createClient()

        const [seasonsResult, playersResult] = await Promise.all([
          supabase
            .from("matches")
            .select("season")
            .eq("club_id", currentClub.id)
            .not("season", "is", null)
            .order("season", { ascending: false }),
          supabase.from("players").select("*").eq("club_id", currentClub.id),
        ])

        if (abortController.signal.aborted || !isMounted) return

        const uniqueSeasons = [...new Set(seasonsResult.data?.map((m) => m.season).filter(Boolean))] as string[]
        setSeasons(uniqueSeasons)

        const season = seasonParam || uniqueSeasons[0] || "2024-2025"
        setSelectedSeason(season)

        const [matchesResult, statsResult] = await Promise.all([
          supabase
            .from("matches")
            .select("*")
            .eq("club_id", currentClub.id)
            .eq("season", season)
            .order("match_date", { ascending: false }),
          supabase
            .from("match_stats")
            .select("*")
            .in(
              "match_id",
              (
                await supabase.from("matches").select("id").eq("club_id", currentClub.id).eq("season", season)
              ).data?.map((m) => m.id) || [],
            ),
        ])

        if (abortController.signal.aborted || !isMounted) return

        setMatches(matchesResult.data || [])
        setPlayers(playersResult.data || [])
        setAllStats(statsResult.data || [])

        const calculatedPlayerStats = playersResult.data?.map((player) => {
          const stats = statsResult.data?.filter((s) => s.player_id === player.id) || []
          const totalGoles = stats.reduce((sum, s) => sum + (s.goles_totales || 0), 0)
          const totalTiros = stats.reduce((sum, s) => sum + (s.tiros_totales || 0), 0)
          const totalAsistencias = stats.reduce((sum, s) => sum + (s.acciones_asistencias || 0), 0)
          const totalBloqueos = stats.reduce((sum, s) => sum + (s.acciones_bloqueo || 0), 0)
          const totalPerdidas = stats.reduce(
            (sum, s) => sum + (s.acciones_perdida_poco || 0) + (s.portero_acciones_perdida_pos || 0),
            0,
          )
          const eficiencia = totalTiros > 0 ? Math.round((totalGoles / totalTiros) * 100) : 0

          return {
            ...player,
            totalGoles,
            totalTiros,
            totalAsistencias,
            totalBloqueos,
            totalPerdidas,
            eficiencia,
            matchesPlayed: stats.length,
          }
        })

        if (isMounted) {
          setPlayerStats(calculatedPlayerStats || [])
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching analytics:", error)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [currentClub, seasonParam]) // Use currentClub instead of currentClub?.id

  const stats = useMemo(() => {
    const totalMatches = matches?.length || 0
    const wins = matches?.filter((m) => m.home_score > m.away_score).length || 0
    const losses = matches?.filter((m) => m.home_score < m.away_score).length || 0
    const draws = matches?.filter((m) => m.home_score === m.away_score).length || 0
    const totalGoalsFor = matches?.reduce((sum, m) => sum + m.home_score, 0) || 0
    const totalGoalsAgainst = matches?.reduce((sum, m) => sum + m.away_score, 0) || 0

    return { totalMatches, wins, losses, draws, totalGoalsFor, totalGoalsAgainst }
  }, [matches])

  const topPlayers = useMemo(() => {
    return {
      topScorers: [...playerStats].sort((a, b) => b.totalGoles - a.totalGoles).slice(0, 10),
      topAssists: [...playerStats].sort((a, b) => b.totalAsistencias - a.totalAsistencias).slice(0, 10),
      bestEfficiency: [...playerStats]
        .filter((p) => p.totalTiros >= 10)
        .sort((a, b) => b.eficiencia - a.eficiencia)
        .slice(0, 10),
      topBlocks: [...playerStats].sort((a, b) => b.totalBloqueos - a.totalBloqueos).slice(0, 10),
      mostTurnovers: [...playerStats].sort((a, b) => b.totalPerdidas - a.totalPerdidas).slice(0, 10),
    }
  }, [playerStats])

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando analytics...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Análisis detallado de {currentClub?.short_name || ""} - Temporada {selectedSeason}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            data={prepareMatchesForExport(matches || [])}
            filename={`partidos_${selectedSeason}`}
            label="Exportar Partidos"
          />
          <ExportButtons
            data={preparePlayersForExport(playerStats || [])}
            filename={`jugadores_${selectedSeason}`}
            label="Exportar Jugadores"
          />
          <SeasonSelector seasons={seasons} selectedSeason={selectedSeason} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalMatches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Victorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.wins}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.draws}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalMatches > 0 ? Math.round((stats.draws / stats.totalMatches) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Derrotas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.losses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalMatches > 0 ? Math.round((stats.losses / stats.totalMatches) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Diferencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.totalGoalsFor > stats.totalGoalsAgainst ? "+" : ""}
              {stats.totalGoalsFor - stats.totalGoalsAgainst}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalGoalsFor} - {stats.totalGoalsAgainst}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <MatchResultsChart matches={matches || []} />
        <GoalDifferenceEvolutionChart matches={matches || []} />
      </div>

      <Tabs defaultValue="man-advantage" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="man-advantage">Hombre +</TabsTrigger>
          <TabsTrigger value="man-down">Hombre -</TabsTrigger>
        </TabsList>
        <TabsContent value="man-advantage">
          <ManAdvantageChart matches={matches || []} stats={allStats || []} players={players || []} />
        </TabsContent>
        <TabsContent value="man-down">
          <ManDownGoalkeeperChart matches={matches || []} stats={allStats || []} players={players || []} />
        </TabsContent>
      </Tabs>

      <Tabs defaultValue="scorers" className="mt-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="scorers">Goleadores</TabsTrigger>
          <TabsTrigger value="assists">Asistencias</TabsTrigger>
          <TabsTrigger value="efficiency">Eficiencia</TabsTrigger>
          <TabsTrigger value="blocks">Bloqueos</TabsTrigger>
          <TabsTrigger value="turnovers">Pérdidas</TabsTrigger>
        </TabsList>
        <TabsContent value="scorers">
          <TopPlayersTable players={topPlayers.topScorers} statType="goals" />
        </TabsContent>
        <TabsContent value="assists">
          <TopPlayersTable players={topPlayers.topAssists} statType="assists" />
        </TabsContent>
        <TabsContent value="efficiency">
          <TopPlayersTable players={topPlayers.bestEfficiency} statType="efficiency" />
        </TabsContent>
        <TabsContent value="blocks">
          <TopPlayersTable players={topPlayers.topBlocks} statType="blocks" />
        </TabsContent>
        <TabsContent value="turnovers">
          <TopPlayersTable players={topPlayers.mostTurnovers} statType="turnovers" />
        </TabsContent>
      </Tabs>
    </main>
  )
}
