"use client"

import { memo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Home,
  PlusCircle,
  Calendar,
  UsersRound,
  BarChart3,
  Shield,
  Users,
  Building2,
  Menu,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { ClubSelector } from "@/components/club-selector"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useClub } from "@/lib/club-context"
import type { Profile } from "@/lib/types"

interface NavigationProps {
  profile?: Profile | null
}

const NAV_LINKS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/nuevo-partido", label: "Nuevo Partido", icon: PlusCircle, requiresEdit: true },
  { href: "/partidos", label: "Partidos", icon: Calendar },
  { href: "/jugadores", label: "Jugadores", icon: UsersRound },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export const Navigation = memo(function Navigation({ profile }: NavigationProps) {
  const pathname = usePathname()
  const { currentClub } = useClub()
  const [open, setOpen] = useState(false)

  const canEdit = profile?.role === "admin" || profile?.role === "coach"
  const isActive = (href: string) => pathname === href

  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-full overflow-hidden border shadow-sm">
              <Image
                src={currentClub?.logo_url || "/none"}
                alt="Club Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <span className="hidden sm:block font-semibold tracking-tight">
              {currentClub?.short_name || "WaterpoloStats"}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon, requiresEdit }) =>
              requiresEdit && !canEdit ? null : (
                <Button
                  key={href}
                  asChild
                  size="sm"
                  variant={isActive(href) ? "secondary" : "ghost"}
                  className="gap-2 rounded-full px-3"
                >
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{label}</span>
                  </Link>
                </Button>
              )
            )}

            {profile?.is_super_admin && (
              <Button
                asChild
                size="sm"
                variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
                className="gap-2 rounded-full px-3"
              >
                <Link href="/admin">
                  <Shield className="h-4 w-4" />
                  <span className="hidden xl:inline">Admin</span>
                </Link>
              </Button>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ClubSelector className="hidden md:flex" />
            {profile && <UserMenu profile={profile} />}

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="lg:hidden">
                  <Menu />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[320px]">
                <div className="flex flex-col gap-6 mt-6">

                  {/* User */}
                  {profile && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {profile.full_name?.[0] ?? "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{profile.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="space-y-1">
                    {NAV_LINKS.map(({ href, label, icon: Icon, requiresEdit }) =>
                      requiresEdit && !canEdit ? null : (
                        <Button
                          key={href}
                          asChild
                          variant={isActive(href) ? "secondary" : "ghost"}
                          className="w-full justify-between rounded-lg"
                          onClick={() => setOpen(false)}
                        >
                          <Link href={href}>
                            <span className="flex items-center gap-3">
                              <Icon className="h-4 w-4" />
                              {label}
                            </span>
                            <ChevronRight className="h-4 w-4 opacity-50" />
                          </Link>
                        </Button>
                      )
                    )}
                  </div>

                  {profile?.is_super_admin && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground px-1">
                        Administración
                      </p>
                      <Button asChild variant="ghost" className="w-full justify-start gap-3">
                        <Link href="/admin">
                          <Shield className="h-4 w-4" />
                          Panel Admin
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
})
