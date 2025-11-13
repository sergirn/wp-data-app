"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
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
  const [showAllPlayers, setShowAllPlayers] = useState(false)

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

      console.log("[v0] Fetching home data for club:", currentClub.id, currentClub.short_name)

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
          .limit(5)

        if (matchesError) {
          if (matchesError.message?.includes("Could not find the table")) {
            setTablesNotFound(true)
          } else {
            throw matchesError
          }
        } else {
          setMatches(matchesData || [])
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
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </main>
    )
  }

  const canEdit = profile?.role === "admin" || profile?.role === "coach"
  const displayedPlayers = showAllPlayers ? players : players.slice(0, 10)
  const hasMorePlayers = players.length > 10

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-balance">Sistema de Estadísticas</h1>
        <p className="text-muted-foreground text-lg md:text-xl">
          Waterpolo - {currentClub?.name || "Sistema Multi-Club"}
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          Bienvenido, <span className="font-semibold text-foreground">{profile?.full_name || profile?.email}</span>
        </p>
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
              <li>
                Ejecuta los scripts SQL en este orden:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-sm">
                  <li>001_create_tables.sql</li>
                  <li>006_create_auth_tables.sql</li>
                  <li>010_add_multi_club_support.sql (soporte multi-club)</li>
                  <li>013_update_rls_for_super_admin.sql (permisos admin)</li>
                  <li>015_insert_super_admin_user.sql (crear usuario admin)</li>
                  <li>002_seed_players.sql</li>
                  <li>011_seed_example_clubs.sql (opcional, clubes de ejemplo)</li>
                </ul>
              </li>
              <li>Recarga la página después de ejecutar los scripts</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {connectionError && !tablesNotFound && (
        <Card className="mb-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error de Conexión</CardTitle>
            <CardDescription>
              No se pudo conectar a la base de datos. Por favor, verifica la configuración de Supabase:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              1. Abre el panel lateral y ve a la sección <strong>Connect</strong>
            </p>
            <p>
              2. Verifica que la integración de <strong>Supabase</strong> esté conectada
            </p>
            <p>
              3. Ve a la sección <strong>Vars</strong> y confirma que existen estas variables:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>NEXT_PUBLIC_SUPABASE_URL</li>
              <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {canEdit && (
          <Card className="border-2 hover:border-primary transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Nuevo Partido</CardTitle>
              <CardDescription>Registra las estadísticas de un nuevo partido</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" disabled={tablesNotFound || connectionError}>
                <Link href="/nuevo-partido">Crear Acta</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 hover:border-primary transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Partidos</CardTitle>
            <CardDescription>Ver historial y estadísticas de partidos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full" disabled={tablesNotFound || connectionError}>
              <Link href="/partidos">Ver Partidos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Analytics</CardTitle>
            <CardDescription>Análisis detallado por temporada</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full" disabled={tablesNotFound || connectionError}>
              <Link href="/analytics">Ver Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl">Últimos Partidos</CardTitle>
          </CardHeader>
          <CardContent>
            {matches && matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/partidos/${match.id}`}
                    className="block p-4 rounded-lg border-2 hover:bg-muted hover:border-primary transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">{match.opponent}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(match.match_date).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-2xl">
                          {match.home_score} - {match.away_score}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {connectionError || tablesNotFound
                  ? "No se pueden cargar los partidos"
                  : `No hay partidos registrados para ${currentClub?.short_name}`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Plantilla</CardTitle>
              <Button asChild variant="outline" size="sm" disabled={tablesNotFound || connectionError}>
                <Link href="/jugadores">Ver Todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {players && players.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {displayedPlayers.map((player) => (
                    <Link
                      key={player.id}
                      href={`/jugadores/${player.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 hover:bg-muted hover:border-primary transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-foreground font-bold text-base">{player.number}</span>
                      </div>
                      <span className="text-sm font-medium truncate">{player.name}</span>
                    </Link>
                  ))}
                </div>
                {hasMorePlayers && (
                  <Button variant="ghost" className="w-full mt-2" onClick={() => setShowAllPlayers(!showAllPlayers)}>
                    {showAllPlayers ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Ver {players.length - 10} jugadores más
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {connectionError || tablesNotFound
                  ? "No se pueden cargar los jugadores"
                  : `No hay jugadores registrados para ${currentClub?.short_name}`}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
