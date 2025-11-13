"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import type { Match } from "@/lib/types"
import { useClub } from "@/lib/club-context"
import { useProfile } from "@/lib/profile-context"
import { useEffect, useState } from "react"

export default function MatchesPage() {
  const { currentClub } = useClub()
  const { profile } = useProfile()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const canEdit = profile?.role === "admin" || profile?.role === "coach"

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setMatches([])

      console.log("[v0] Fetching matches for club:", currentClub?.id, currentClub?.short_name)

      if (!currentClub) {
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        if (!supabase) {
          setLoading(false)
          return
        }

        // Fetch matches filtered by current club
        const { data: matchesData, error } = await supabase
          .from("matches")
          .select("*")
          .eq("club_id", currentClub.id)
          .order("match_date", { ascending: false })

        if (error) throw error

        console.log("[v0] Fetched matches:", matchesData?.length, "matches for", currentClub.short_name)
        setMatches(matchesData || [])
      } catch (error) {
        console.error("[v0] Error fetching matches:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentClub])

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando partidos...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Partidos</h1>
          <p className="text-muted-foreground">Historial de partidos de {currentClub?.short_name || ""}</p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/nuevo-partido">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Partido
            </Link>
          </Button>
        )}
      </div>

      {matches && matches.length > 0 ? (
        <div className="grid gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} clubName={currentClub?.short_name || ""} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No hay partidos registrados para {currentClub?.short_name}</p>
            {canEdit && (
              <Button asChild>
                <Link href="/nuevo-partido">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Partido
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}

function MatchCard({ match, clubName }: { match: Match; clubName: string }) {
  const matchDate = new Date(match.match_date)
  const result =
    match.home_score > match.away_score ? "Victoria" : match.home_score < match.away_score ? "Derrota" : "Empate"
  const resultColor =
    result === "Victoria"
      ? "text-green-600 dark:text-green-400"
      : result === "Derrota"
        ? "text-red-600 dark:text-red-400"
        : "text-yellow-600 dark:text-yellow-400"

  return (
    <Link href={`/partidos/${match.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold">
                  {clubName} vs {match.opponent}
                </h3>
                <span className={`text-sm font-semibold ${resultColor}`}>{result}</span>
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
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{match.home_score}</p>
                <p className="text-xs text-muted-foreground">{clubName}</p>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <div className="text-center">
                <p className="text-3xl font-bold">{match.away_score}</p>
                <p className="text-xs text-muted-foreground">{match.opponent}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
