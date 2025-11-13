"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  clearProfile: () => void
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({
  children,
  initialProfile,
}: {
  children: ReactNode
  initialProfile: Profile | null
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [loading, setLoading] = useState(!initialProfile)

  const clearProfile = () => {
    setProfile(null)
  }

  useEffect(() => {
    // If we already have a profile from server, don't fetch again
    if (initialProfile) {
      setProfile(initialProfile)
      setLoading(false)
      return
    }

    async function fetchProfile() {
      try {
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: profileData } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

          setProfile(profileData)
        }
      } catch (error) {
        console.error("[v0] Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [initialProfile])

  return <ProfileContext.Provider value={{ profile, loading, clearProfile }}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider")
  }
  return context
}
