"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SeasonSelectorProps {
  seasons: string[]
  selectedSeason: string
}

export function SeasonSelector({ seasons, selectedSeason }: SeasonSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSeasonChange = (season: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("season", season)
    router.push(`/analytics?${params.toString()}`)
  }

  return (
    <Select value={selectedSeason} onValueChange={handleSeasonChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecciona temporada" />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((season) => (
          <SelectItem key={season} value={season}>
            {season}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
