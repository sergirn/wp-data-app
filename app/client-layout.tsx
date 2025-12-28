"use client"

import type React from "react"
import { Suspense } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { ClubProvider } from "@/lib/club-context"
import { ProfileProvider } from "@/lib/profile-context"
import { Navigation } from "@/components/navigation"
import type { Club, Profile } from "@/lib/types"

interface ClientLayoutProps {
  children: React.ReactNode
  profile: Profile | null
  currentClub: Club | null
  allClubs: Club[]
}

export default function ClientLayout({
  children,
  profile,
  currentClub,
  allClubs,
}: ClientLayoutProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ProfileProvider initialProfile={profile}>
        <ClubProvider initialClub={currentClub} initialClubs={allClubs}>
          {/* Top + Bottom navigation */}
          {profile && <Navigation profile={profile} />}

          {/* 👇 AQUÍ ESTÁ LA CLAVE */}
          <main className="pb-[80px] lg:pb-0">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </ClubProvider>
      </ProfileProvider>
    </ThemeProvider>
  )
}
