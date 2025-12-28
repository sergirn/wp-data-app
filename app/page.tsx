"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  Trophy,
  Users,
  BarChart3,
  PlusCircle,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  Award,
} from "lucide-react"
import { LandingPage } from "@/components/landing-page"
import { useClub } from "@/lib/club-context"
import { useProfile } from "@/lib/profile-context"
import { useEffect, useState } from "react"

export default function HomePage() {
  const { currentClub } = useClub()
  const { profile, loading: profileLoading } = useProfile()
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [tablesNotFound, setTablesNotFound] = useState(false)
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    totalPlayers: 0,
    recentForm: [] as string[],
  })

  useEffect(() => {
    async function fetchData() {
      if (profileLoading) {
        return
      }

      if (!currentClub || !profile) {
        setLoading(false)
        return
      }

      setLoading(true)
      setMatches([])
      setPlayers([])
      setConnectionError(false)
      setTablesNotFound(false)

      try {
        const supabase = createClient()
        if (!supabase) {
          setConnectionError(true)
          setLoading(false)
          return
        }

        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("*")
          .eq("club_id", currentClub.id)
          .order("match_date", { ascending: false })
          .limit(4)

        if (matchesError) {
          if (matchesError.message?.includes("Could not find the table")) {
            setTablesNotFound(true)
          } else {
            throw matchesError
          }
        } else {
          setMatches(matchesData || [])
        }

        const { data: allMatchesData, error: allMatchesError } = await supabase
          .from("matches")
          .select("*")
          .eq("club_id", currentClub.id)
          .order("match_date", { ascending: false })

        if (allMatchesError) {
          console.error("[v0] Error fetching all matches:", allMatchesError)
        } else {
          const allMatches = allMatchesData || []
          const wins = allMatches.filter((m) => m.home_score > m.away_score).length
          const recentForm = allMatches.slice(0, 5).map((m) => {
            if (m.home_score > m.away_score) return "W"
            if (m.home_score < m.away_score) return "L"
            return "D"
          })

          setStats({
            totalMatches: allMatches.length,
            wins,
            totalPlayers: 0,
            recentForm,
          })
        }

        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("*")
          .eq("club_id", currentClub.id)
          .order("number")

        if (playersError) {
          if (playersError.message?.includes("Could not find the table")) {
            setTablesNotFound(true)
          } else {
            throw playersError
          }
        } else {
          setPlayers(playersData || [])
          setStats((prev) => ({ ...prev, totalPlayers: playersData?.length || 0 }))
        }
      } catch (error) {
        console.error("[v0] Error fetching home data:", error)
        setConnectionError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentClub, profile, profileLoading])

  if (!profile && !profileLoading) {
    return <LandingPage />
  }

  if (profileLoading || loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground mt-4">Cargando...</p>
        </div>
      </main>
    )
  }

  const canEdit = profile?.role === "admin" || profile?.role === "coach"
  const winRate = stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="relative overflow-hidden pb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

        <div className="container mx-auto px-4 relative">
          {currentClub?.logo_url && (
            <div className="absolute -right-20 -top-20 w-[600px] h-[600px] opacity-[0.08] dark:opacity-[0.08] pointer-events-none">
              <img src={currentClub.logo_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="py-8 sm:py-12 lg:py-16 relative">
            <div className="max-w-4xl">
              <Badge
                variant="secondary"
                className="mb-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              >
                <Trophy className="w-3 h-3 mr-1" />
                Sistema de Estadísticas
              </Badge>
              <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold mb-4 dark:text-white">
                {currentClub?.name || "Mi Club"}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">Análisis profesional de waterpolo</p>
            </div>
          </div>

          {tablesNotFound && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Base de datos no inicializada</AlertTitle>
              <AlertDescription className="space-y-3 mt-2">
                <p>Las tablas de la base de datos aún no se han creado. Sigue estos pasos:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Abre el panel lateral haciendo clic en el icono de menú</li>
                  <li>
                    Ve a la pestaña de <strong>Scripts</strong>
                  </li>
                  <li>Ejecuta los scripts SQL en orden</li>
                  <li>Recarga la página después de ejecutar los scripts</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {connectionError && !tablesNotFound && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error de Conexión</AlertTitle>
              <AlertDescription>
                No se pudo conectar a la base de datos. Verifica la configuración de Supabase en el panel lateral.
              </AlertDescription>
            </Alert>
          )}

          {!tablesNotFound && !connectionError && (
            <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-8">
              {/* Partidos */}
              <Card className="aspect-square border-2 bg-gradient-to-br from-background to-blue-500/5 hover:shadow-lg transition-all">
                <CardContent className="h-full flex flex-col items-center justify-center p-2 sm:p-4 text-center">
                  <div className="p-2 rounded-lg bg-blue-500/10 mb-1 sm:mb-2">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-lg sm:text-3xl font-bold leading-none">
                    {stats.totalMatches}
                  </p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">
                    Partidos
                  </p>
                </CardContent>
              </Card>

              {/* Victorias */}
              <Card className="aspect-square border-2 bg-gradient-to-br from-background to-green-500/5 hover:shadow-lg transition-all">
                <CardContent className="h-full flex flex-col items-center justify-center p-2 sm:p-4 text-center">
                  <div className="p-2 rounded-lg bg-green-500/10 mb-1 sm:mb-2">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg sm:text-3xl font-bold leading-none">
                    {winRate}%
                  </p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">
                    Victorias
                  </p>
                </CardContent>
              </Card>

              {/* Jugadores */}
              <Card className="aspect-square border-2 bg-gradient-to-br from-background to-purple-500/5 hover:shadow-lg transition-all">
                <CardContent className="h-full flex flex-col items-center justify-center p-2 sm:p-4 text-center">
                  <div className="p-2 rounded-lg bg-purple-500/10 mb-1 sm:mb-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-lg sm:text-3xl font-bold leading-none">
                    {stats.totalPlayers}
                  </p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">
                    Jugadores
                  </p>
                </CardContent>
              </Card>

              {/* Forma reciente */}
              <Card className="aspect-square border-2 bg-gradient-to-br from-background to-amber-500/5 hover:shadow-lg transition-all">
                <CardContent className="h-full flex flex-col items-center justify-center p-2 sm:p-4 text-center">
                  <div className="p-2 rounded-lg bg-amber-500/10 mb-1 sm:mb-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                  </div>

                  {/* MOBILE: últimos 3 */}
                  <div className="flex gap-1 sm:hidden">
                    {stats.recentForm.slice(-3).map((result, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                          result === "W"
                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                            : result === "L"
                            ? "bg-red-500/20 text-red-600 dark:text-red-400"
                            : "bg-gray-500/20 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP: todos */}
                  <div className="hidden sm:flex gap-1">
                    {stats.recentForm.map((result, i) => (
                      <div
                        key={i}
                        className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                          result === "W"
                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                            : result === "L"
                            ? "bg-red-500/20 text-red-600 dark:text-red-400"
                            : "bg-gray-500/20 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">
                    Forma
                  </p>
                </CardContent>
              </Card>
            </div>

          )}

          <div className="container mx-auto space-y-8 pb-8">
            <div className="hidden lg:grid lg:grid-cols-3 gap-6">
              {canEdit && (
                <Card className="group relative overflow-hidden border-2 hover:border-primary transition-all hover:shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="relative">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <PlusCircle className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Nuevo Partido</CardTitle>
                    <CardDescription>Registra las estadísticas de un nuevo partido</CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <Button asChild className="w-full" disabled={tablesNotFound || connectionError}>
                      <Link href="/nuevo-partido">Crear Acta</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="group relative overflow-hidden border-2 hover:border-blue-500 transition-all hover:shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">Partidos</CardTitle>
                  <CardDescription>Ver historial y estadísticas de partidos</CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <Button asChild variant="secondary" className="w-full" disabled={tablesNotFound || connectionError}>
                    <Link href="/partidos">Ver Partidos</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-2 hover:border-purple-500 transition-all hover:shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-xl">Analytics</CardTitle>
                  <CardDescription>Análisis detallado por temporada</CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <Button asChild variant="secondary" className="w-full" disabled={tablesNotFound || connectionError}>
                    <Link href="/analytics">Ver Analytics</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Recent Matches */}
              <Card className="border-2 bg-gradient-to-br from-background to-background">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <CardTitle className="text-xl">Últimos Partidos</CardTitle>
                    </div>
                    {matches.length > 0 && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/partidos">Ver todos</Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {matches && matches.length > 0 ? (
                    <div className="space-y-3">
                      {matches.map((match) => {
                        const isTied = match.home_score === match.away_score
                        const hasPenalties =
                          isTied && match.penalty_home_score !== null && match.penalty_away_score !== null

                        let isWin: boolean
                        let isDraw: boolean
                        let resultLabel: string

                        if (hasPenalties) {
                          isWin = match.penalty_home_score! > match.penalty_away_score!
                          isDraw = false
                          resultLabel = isWin ? "Victoria (Penaltis)" : "Derrota (Penaltis)"
                        } else {
                          isWin = match.home_score > match.away_score
                          isDraw = match.home_score === match.away_score
                          resultLabel = isWin ? "Victoria" : isDraw ? "Empate" : "Derrota"
                        }

                        return (
                          <Link
                            key={match.id}
                            href={`/partidos/${match.id}`}
                            className="group block p-4 rounded-xl border-2 hover:bg-muted/50 hover:border-primary transition-all"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant={isWin ? "default" : isDraw ? "secondary" : "destructive"}
                                    className="text-xs"
                                  >
                                    {resultLabel}
                                  </Badge>
                                </div>
                                <p className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                                  {match.opponent}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(match.match_date).toLocaleDateString("es-ES", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-2xl">
                                  {match.home_score} - {match.away_score}
                                </p>
                                {hasPenalties && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Pen: {match.penalty_home_score} - {match.penalty_away_score}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {connectionError || tablesNotFound
                          ? "No se pueden cargar los partidos"
                          : `No hay partidos registrados para ${currentClub?.short_name}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Players Squad */}
              <Card className="border-2 bg-gradient-to-br from-background to-background">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <CardTitle className="text-xl">Plantilla</CardTitle>
                    </div>
                    {players.length > 0 && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/jugadores">Ver todos</Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  {players && players.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {players.map((player) => (
                        <Link
                          key={player.id}
                          href={`/jugadores/${player.id}`}
                          className="group flex flex-col items-center gap-2 p-3 rounded-xl border-2 hover:bg-muted/50 hover:border-primary transition-all"
                        >
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            {player.photo_url ? (
                              <img
                                src={player.photo_url || "/placeholder.svg"}
                                alt={player.name}
                                className="w-full h-full object-cover object-top"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-primary-foreground font-bold text-lg">{player.number}</span>
                            )}
                          </div>
                          <div className="text-center w-full">
                            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                              {player.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              #{player.number}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                        <Users className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {connectionError || tablesNotFound
                          ? "No se pueden cargar los jugadores"
                          : `No hay jugadores registrados para ${currentClub?.short_name}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
