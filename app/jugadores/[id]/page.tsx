// app/jugadores/[id]/page.tsx
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import PlayerClientPage from "./PlayerClientPage"
import type { Player, MatchStats, Match } from "@/lib/types"

interface MatchStatsWithMatch extends MatchStats {
  matches: Match
}

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params

  const supabase = createClient()

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single()

  if (playerError || !player) notFound()

  const { data: matchStats } = await supabase
    .from("match_stats")
    .select(`
      *,
      matches(*)
    `)
    .eq("player_id", id)
    .order("matches.match_date", { ascending: false })

  return (
    <PlayerClientPage
      player={player as Player}
      matchStats={(matchStats || []) as MatchStatsWithMatch[]}
    />
  )
}
