"use client"

import { useClub } from "@/lib/club-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import Image from "next/image"

export function ClubSelector() {
  const { currentClub, availableClubs, setCurrentClub } = useClub()

  if (availableClubs.length <= 1) {
    // Don't show selector if only one club
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          {currentClub?.logo_url && (
            <div className="relative w-5 h-5">
              <Image
                src={currentClub.logo_url || "/placeholder.svg"}
                alt={currentClub.short_name}
                fill
                className="object-contain"
              />
            </div>
          )}
          <span className="max-w-[120px] truncate">{currentClub?.short_name || "Seleccionar club"}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Cambiar de club</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableClubs.map((club) => (
          <DropdownMenuItem
            key={club.id}
            onClick={() => {
              console.log("[v0] Switching to club:", club.short_name, club.id)
              setCurrentClub(club)
            }}
            className="gap-2"
          >
            {club.logo_url && (
              <div className="relative w-5 h-5">
                <Image
                  src={club.logo_url || "/placeholder.svg"}
                  alt={club.short_name}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <span className="flex-1">{club.short_name}</span>
            {currentClub?.id === club.id && <span className="text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
