"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { ClubSelector } from "@/components/club-selector"
import { useClub } from "@/lib/club-context"
import type { Profile } from "@/lib/types"
import { Shield, Users, Building2, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { memo } from "react"

interface NavigationProps {
  profile?: Profile | null
}

export const Navigation = memo(function Navigation({ profile }: NavigationProps) {
  const pathname = usePathname()
  const { currentClub } = useClub()

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/nuevo-partido", label: "Nuevo Partido", requiresEdit: true },
    { href: "/partidos", label: "Partidos" },
    { href: "/jugadores", label: "Jugadores" },
    { href: "/analytics", label: "Analytics" },
  ]

  const canEdit = profile?.role === "admin" || profile?.role === "coach"
  const isAdminPath = pathname?.startsWith("/admin")

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border">
              <Image
                src={currentClub?.logo_url || "/cn-sant-andreu.png"}
                alt={`${currentClub?.short_name || "Club"} Logo`}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{currentClub?.short_name || "WaterpoloStats"}</h1>
              <p className="text-xs text-muted-foreground">Waterpolo</p>
            </div>
          </Link>
          <div className="flex gap-1 items-center">
            {links.map((link) => {
              // Hide edit-only links for viewers
              if (link.requiresEdit && !canEdit) return null

              return (
                <Button key={link.href} asChild variant={pathname === link.href ? "default" : "ghost"} size="sm">
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              )
            })}
            {profile?.is_super_admin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={isAdminPath ? "default" : "ghost"} size="sm" className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Admin
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Administración</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Shield className="h-4 w-4 mr-2" />
                      Panel General
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users" className="cursor-pointer">
                      <Users className="h-4 w-4 mr-2" />
                      Gestión de Usuarios
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/clubs" className="cursor-pointer">
                      <Building2 className="h-4 w-4 mr-2" />
                      Gestión de Clubes
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="ml-2 flex items-center gap-2">
              <ClubSelector />
              <ThemeToggle />
              {profile && <UserMenu profile={profile} />}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
})
