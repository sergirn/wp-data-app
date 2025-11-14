"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import type { Player } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'
import { useClub } from "@/lib/club-context"
import { useEffect, useState, memo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PlayersPage() {
  const { currentClub } = useClub()
  const [players, setPlayers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const abortController = new AbortController()
    let isMounted = true

    async function fetchPlayers() {
      setLoading(true)
      setPlayers([])
      setError(null)

      if (!currentClub) {
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()

        const [playersResult, statsResult, matchesResult] = await Promise.all([
          supabase.from("players").select("*").eq("club_id", currentClub.id).order("number"),
          supabase
            .from("match_stats")
            .select("*")
            .in(
              "player_id",
              (await supabase.from("players").select("id").eq("club_id", currentClub.id)).data?.map((p) => p.id) || [],
            ),
          supabase.from("matches").select("*").eq("club_id", currentClub.id),
        ])

        if (abortController.signal.aborted || !isMounted) return

        if (playersResult.error) throw playersResult.error

        const playersWithStats = playersResult.data?.map((player) => {
          const playerStatsData = statsResult.data?.filter((s) => s.player_id === player.id) || []

          if (player.is_goalkeeper) {
            const totalParadas = playerStatsData.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0)
            const totalAsistencias = playerStatsData.reduce((sum, s) => sum + (s.portero_acciones_asistencias || 0), 0)
            const matchesPlayed = playerStatsData.length

            const totalRivalGoles = playerStatsData.reduce((sum, stat) => {
              const match = matchesResult.data?.find((m) => m.id === stat.match_id)
              if (!match) return sum
              const rivalGoals = match.is_home ? match.away_score : match.home_score
              return sum + rivalGoals
            }, 0)

            return {
              ...player,
              totalParadas,
              totalRivalGoles,
              totalAsistencias,
              matchesPlayed,
            }
          } else {
            const totalGoles = playerStatsData.reduce((sum, s) => sum + (s.goles_totales || 0), 0)
            const totalTiros = playerStatsData.reduce((sum, s) => sum + (s.tiros_totales || 0), 0)
            const totalAsistencias = playerStatsData.reduce((sum, s) => sum + (s.acciones_asistencias || 0), 0)
            const matchesPlayed = playerStatsData.length

            return {
              ...player,
              totalGoles,
              totalTiros,
              totalAsistencias,
              matchesPlayed,
            }
          }
        })

        if (isMounted) {
          setPlayers(playersWithStats || [])
        }
      } catch (e) {
        if (!abortController.signal.aborted && isMounted) {
          const errorMsg = e instanceof Error ? e.message : "Error al conectar con la base de datos"
          setError(errorMsg)
          console.error("Error fetching players:", errorMsg)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchPlayers()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [currentClub])

  if (error) {
    return (
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de Conexión</AlertTitle>
          <AlertDescription>
            {error}
            <br />
            <br />
            Por favor, configura la integración de Supabase desde la sección Connect en el panel lateral.
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando jugadores...</p>
        </div>
      </main>
    )
  }

  const fieldPlayers = players.filter((p) => !p.is_goalkeeper)
  const goalkeepers = players.filter((p) => p.is_goalkeeper)

  return (
    <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Jugadores</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Estadísticas individuales de {currentClub?.short_name || "la plantilla"}
        </p>
      </div>

      {players.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay jugadores</AlertTitle>
          <AlertDescription>
            No se encontraron jugadores para {currentClub?.short_name}.
            {currentClub?.short_name === "CN Sant Andreu"
              ? " Los jugadores de ejemplo están disponibles para este club."
              : " Puedes agregar jugadores desde el panel de administración."}
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="field-players" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="field-players" className="text-xs sm:text-sm">
              Jugadores ({fieldPlayers.length})
            </TabsTrigger>
            <TabsTrigger value="goalkeepers" className="text-xs sm:text-sm">
              Porteros ({goalkeepers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="field-players">
            {fieldPlayers.length > 0 ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {fieldPlayers.map((player) => (
                  <FieldPlayerCard key={player.id} player={player} />
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No hay jugadores de campo</AlertTitle>
                <AlertDescription>
                  No se encontraron jugadores de campo para {currentClub?.short_name}.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="goalkeepers">
            {goalkeepers.length > 0 ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {goalkeepers.map((player) => (
                  <GoalkeeperCard key={player.id} player={player} />
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No hay porteros</AlertTitle>
                <AlertDescription>No se encontraron porteros para {currentClub?.short_name}.</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      )}
    </main>
  )
}

const FieldPlayerCard = memo(function FieldPlayerCard({
  player,
}: {
  player: Player & { totalGoles: number; totalTiros: number; totalAsistencias: number; matchesPlayed: number }
}) {
  const eficiencia = player.totalTiros > 0 ? ((player.totalGoles / player.totalTiros) * 100).toFixed(1) : "0.0"

  return (
    <Link href={`/jugadores/${player.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-base sm:text-lg">{player.number}</span>
            </div>
            <CardTitle className="text-base sm:text-xl truncate">{player.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-xl sm:text-2xl font-bold">{player.matchesPlayed}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Partidos</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">{player.totalGoles}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Goles</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">
                {(player.totalGoles / Math.max(player.matchesPlayed, 1)).toFixed(1)} x partido
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-500/10 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">{player.totalTiros}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Tiros</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">
                {(player.totalTiros / Math.max(player.matchesPlayed, 1)).toFixed(1)} x partido
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-purple-500/10 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">{eficiencia}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Eficiencia</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">Goles / Tiros</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
})

const GoalkeeperCard = memo(function GoalkeeperCard({
  player,
}: {
  player: Player & {
    totalParadas: number
    totalRivalGoles: number
    totalAsistencias: number
    matchesPlayed: number
  }
}) {
  const totalShots = player.totalParadas + player.totalRivalGoles
  const eficiencia = totalShots > 0 ? ((player.totalParadas / totalShots) * 100).toFixed(1) : "0.0"

  return (
    <Link href={`/jugadores/${player.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-base sm:text-lg">{player.number}</span>
            </div>
            <CardTitle className="text-base sm:text-xl truncate">{player.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-xl sm:text-2xl font-bold">{player.matchesPlayed}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Partidos</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">{player.totalParadas}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Paradas</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">
                {(player.totalParadas / Math.max(player.matchesPlayed, 1)).toFixed(1)} x partido
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-500/10 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">
                {player.totalRivalGoles}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Goles</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">
                {(player.totalRivalGoles / Math.max(player.matchesPlayed, 1)).toFixed(1)} x partido
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-purple-500/10 rounded-lg">
              <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">{eficiencia}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Eficiencia</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">Paradas / Total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
})
