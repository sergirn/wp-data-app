"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Club } from "./types"

interface ClubContextType {
  currentClub: Club | null
  setCurrentClub: (club: Club | null) => void
  availableClubs: Club[]
  setAvailableClubs: (clubs: Club[]) => void
  isLoading: boolean
}

const ClubContext = createContext<ClubContextType | undefined>(undefined)

export function ClubProvider({
  children,
  initialClub,
  initialClubs,
}: {
  children: ReactNode
  initialClub?: Club | null
  initialClubs?: Club[]
}) {
  const [currentClub, setCurrentClub] = useState<Club | null>(initialClub || null)
  const [availableClubs, setAvailableClubs] = useState<Club[]>(initialClubs || [])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (initialClub) {
      setCurrentClub(initialClub)
      setIsLoading(false)
      return
    }

    // Load club from localStorage if available
    const savedClubId = localStorage.getItem("currentClubId")
    if (savedClubId && availableClubs.length > 0) {
      const club = availableClubs.find((c) => c.id === Number.parseInt(savedClubId))
      if (club) {
        setCurrentClub(club)
      } else if (availableClubs.length > 0) {
        setCurrentClub(availableClubs[0])
      }
    } else if (availableClubs.length > 0 && !currentClub) {
      setCurrentClub(availableClubs[0])
    }
    setIsLoading(false)
  }, [availableClubs, initialClub])

  const handleSetCurrentClub = (club: Club | null) => {
    setCurrentClub(club)
    if (club) {
      localStorage.setItem("currentClubId", club.id.toString())
    } else {
      localStorage.removeItem("currentClubId")
    }
  }

  return (
    <ClubContext.Provider
      value={{
        currentClub,
        setCurrentClub: handleSetCurrentClub,
        availableClubs,
        setAvailableClubs,
        isLoading,
      }}
    >
      {children}
    </ClubContext.Provider>
  )
}

export function useClub() {
  const context = useContext(ClubContext)
  if (context === undefined) {
    throw new Error("useClub must be used within a ClubProvider")
  }
  return context
}
