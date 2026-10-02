"use client"

import type React from "react"
import { Suspense, ViewTransition } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { ClubProvider } from "@/lib/club-context"
import { ProfileProvider } from "@/lib/profile-context"
import { Navigation } from "@/components/navigation"
import type { Club, Profile } from "@/lib/types"
import { AnimatedBackground } from "@/components/background";
import { Toaster } from "@/components/ui/toaster";

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
  const pathname = usePathname()

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ProfileProvider initialProfile={profile}>
        <ClubProvider initialClub={currentClub} initialClubs={allClubs}>
          <AnimatedBackground />
          {/* Top + Bottom navigation */}
          {profile && <Navigation profile={profile} />}

          {/* 👇 AQUÍ ESTÁ LA CLAVE */}
          <ViewTransition
            key={pathname}
            enter={{ "mobile-nav-forward": "mobile-nav-forward", "mobile-nav-back": "mobile-nav-back", default: "none" }}
            exit={{ "mobile-nav-forward": "mobile-nav-forward", "mobile-nav-back": "mobile-nav-back", default: "none" }}
            default="none"
          >
            <main className="min-w-0 overflow-x-clip pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
              <Suspense fallback={null}>{children}</Suspense>
            </main>
          </ViewTransition>
          <Toaster />
        </ClubProvider>
      </ProfileProvider>
    </ThemeProvider>
  )
}
