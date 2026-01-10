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
import { cn } from "@/lib/utils"

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
  player: Player & {
    totalGoles: number
    totalTiros: number
    totalAsistencias: number
    matchesPlayed: number
  }
}) {
  const eficiencia =
    player.totalTiros > 0
      ? ((player.totalGoles / player.totalTiros) * 100).toFixed(1)
      : "0.0"

  const eficienciaNum = Number(eficiencia)

  return (
    <Link href={`/jugadores/${player.id}`} className="block h-full">
  <Card
    className="
      h-full overflow-hidden p-0 cursor-pointer
      transition-all duration-200
      hover:-translate-y-1 hover:shadow-lg
      flex flex-col
    "
  >
    {/* TOP IMAGE (~30–40%) */}
    <div className="relative h-50 sm:h-40 md:h-65 overflow-hidden">
      {player.photo_url ? (
        <img
      src={player.photo_url}
      alt={player.name}
      loading="lazy"
      className="
        h-full w-full
        object-contain sm:object-cover
        object-center sm:object-top
        bg-muted
      "
    />
  ) : (
    <div className="h-full w-full grid place-items-center bg-muted">
      <div className="text-center">
        <div className="text-3xl font-extrabold text-muted-foreground">
          #{player.number}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Sin foto</div>
      </div>
    </div>
  )}

  {/* Gradient adaptativo al theme */}
  <div
    className="
      absolute inset-0 bg-gradient-to-t
      from-white/75 via-white/10 to-transparent
      dark:from-black/60 dark:via-black/20 dark:to-transparent
    "
  />

  <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
    <h3 className="text-base font-semibold leading-tight truncate text-zinc-900 dark:text-white">
      {player.name}
    </h3>
    <p className="text-xs text-zinc-700/80 dark:text-white/80">
      #{player.number} · Jugador de campo
    </p>
  </div>
</div>


    {/* CONTENT (no se estira, sin margen extra abajo) */}
    
    <CardContent className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Partidos" value={player.matchesPlayed} />

        <StatBox
          label="Goles"
          value={player.totalGoles}
          sub={`${(player.totalGoles / Math.max(player.matchesPlayed, 1)).toFixed(1)} / partido`}
          accent="green"
        />

        <StatBox
          label="Tiros"
          value={player.totalTiros}
          sub={`${(player.totalTiros / Math.max(player.matchesPlayed, 1)).toFixed(1)} / partido`}
          accent="blue"
        />

        <StatBox
          label="Asistencias"
          value={player.totalAsistencias}
          accent="teal"
        />
      </div>

      {/* EFICIENCIA */}
      <div
        className={cn(
          "rounded-lg border p-3 text-center",
          eficienciaNum < 30
            ? "bg-red-500/5 border-red-500/20"
            : eficienciaNum < 50
            ? "bg-yellow-500/5 border-yellow-500/20"
            : "bg-green-500/5 border-green-500/20",
        )}
      >
        <p
          className={cn(
            "text-2xl font-bold",
            eficienciaNum < 30
              ? "text-red-600"
              : eficienciaNum < 50
              ? "text-yellow-600"
              : "text-green-600",
          )}
        >
          {eficiencia}%
        </p>
        <p className="text-xs text-muted-foreground">Eficiencia de tiro</p>
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
  const eficiencia =
    totalShots > 0
      ? ((player.totalParadas / totalShots) * 100).toFixed(1)
      : "0.0"

  const eficienciaNum = Number(eficiencia)

  return (
    <Link href={`/jugadores/${player.id}`} className="block h-full">
  <Card
    className="
      h-full overflow-hidden p-0 cursor-pointer
      transition-all duration-200
      hover:-translate-y-1 hover:shadow-lg
      flex flex-col
    "
  >
    {/* TOP IMAGE */}
     <div className="relative h-50 sm:h-40 md:h-65 overflow-hidden">
      {player.photo_url ? (
        <img
      src={player.photo_url}
      alt={player.name}
      loading="lazy"
      className="
        h-full w-full
        object-contain sm:object-cover
        object-center sm:object-top
        bg-muted
      "
    />
  ) : (
    <div className="h-full w-full grid place-items-center bg-muted">
      <div className="text-center">
        <div className="text-3xl font-extrabold text-muted-foreground">
          #{player.number}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Sin foto</div>
      </div>
    </div>
  )}


      {/* Gradient adaptativo al theme */}
      <div
        className="
          absolute inset-0 bg-gradient-to-t
          from-white/75 via-white/10 to-transparent
          dark:from-black/60 dark:via-black/10 dark:to-transparent
        "
      />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
        <h3 className="text-base font-semibold leading-tight truncate text-zinc-900 dark:text-white">
          {player.name}
        </h3>
        <p className="text-xs text-zinc-700/80 dark:text-white/80">
          #{player.number} · Portero
        </p>
      </div>
    </div>

    {/* CONTENT */}
    <CardContent className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Partidos" value={player.matchesPlayed} />

        <StatBox
          label="Paradas"
          value={player.totalParadas}
          sub={`${(player.totalParadas / Math.max(player.matchesPlayed, 1)).toFixed(1)} / partido`}
          accent="blue"
        />

        <StatBox
          label="Goles recibidos"
          value={player.totalRivalGoles}
          sub={`${(player.totalRivalGoles / Math.max(player.matchesPlayed, 1)).toFixed(1)} / partido`}
        />

        <StatBox
          label="Asistencias"
          value={player.totalAsistencias}
          accent="teal"
        />
      </div>

      <div
        className={cn(
          "rounded-lg border p-3 text-center",
          eficienciaNum < 30
            ? "bg-red-500/5 border-red-500/20"
            : eficienciaNum < 50
            ? "bg-yellow-500/5 border-yellow-500/20"
            : "bg-green-500/5 border-green-500/20",
        )}
      >
        <p
          className={cn(
            "text-2xl font-bold",
            eficienciaNum < 30
              ? "text-red-600"
              : eficienciaNum < 50
              ? "text-yellow-600"
              : "text-green-600",
          )}
        >
          {eficiencia}%
        </p>
        <p className="text-xs text-muted-foreground">
          Eficiencia del portero
        </p>
      </div>
    </CardContent>
  </Card>
</Link>
  )
})

function StatBox({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: "green" | "blue" | "teal"
}) {
  const colors = {
    green: "text-green-600",
    blue: "text-blue-600",
    teal: "text-teal-600",
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <p className={cn("text-xl font-semibold", accent && colors[accent])}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {sub && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {sub}
        </p>
      )}
    </div>
  )
}
