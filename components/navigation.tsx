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
import {
  Shield,
  Users,
  Building2,
  ChevronDown,
  Menu,
  Home,
  PlusCircle,
  Calendar,
  UsersRound,
  BarChart3,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { memo, useState } from "react"

interface NavigationProps {
  profile?: Profile | null
}

export const Navigation = memo(function Navigation({ profile }: NavigationProps) {
  const pathname = usePathname()
  const { currentClub } = useClub()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const links = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/nuevo-partido", label: "Nuevo Partido", icon: PlusCircle, requiresEdit: true },
    { href: "/partidos", label: "Partidos", icon: Calendar },
    { href: "/jugadores", label: "Jugadores", icon: UsersRound },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ]

  const canEdit = profile?.role === "admin" || profile?.role === "coach"
  const isAdminPath = pathname?.startsWith("/admin")

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-border/50 group-hover:border-primary/50 transition-colors shadow-lg">
                <Image
                  src={currentClub?.logo_url || "/cn-sant-andreu.png"}
                  alt={`${currentClub?.short_name || "Club"} Logo`}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {currentClub?.short_name || "WaterpoloStats"}
              </h1>
              <p className="text-xs text-muted-foreground">Estadísticas</p>
            </div>
          </Link>

          <div className="hidden lg:flex gap-1 items-center">
            {links.map((link) => {
              if (link.requiresEdit && !canEdit) return null
              const Icon = link.icon

              return (
                <Button
                  key={link.href}
                  asChild
                  variant={pathname === link.href ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 transition-all hover:scale-105"
                >
                  <Link href={link.href}>
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{link.label}</span>
                  </Link>
                </Button>
              )
            })}
            {profile?.is_super_admin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isAdminPath ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-1.5 transition-all hover:scale-105"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="hidden xl:inline">Admin</span>
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
            <div className="ml-3 flex items-center gap-2 pl-3 border-l">
              <ClubSelector />
              <ThemeToggle />
              {profile && <UserMenu profile={profile} />}
            </div>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden hover:scale-105 transition-transform">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[340px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menú</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* User Info */}
                  {profile && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold shadow-lg">
                        {profile.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{profile.full_name || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      </div>
                    </div>
                  )}

                  {/* Club Selector Mobile */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Club</p>
                    <ClubSelector />
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navegación</p>
                    <div className="flex flex-col gap-1">
                      {links.map((link) => {
                        if (link.requiresEdit && !canEdit) return null
                        const Icon = link.icon

                        return (
                          <Button
                            key={link.href}
                            asChild
                            variant={pathname === link.href ? "default" : "ghost"}
                            className="justify-start gap-3"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Link href={link.href}>
                              <Icon className="h-4 w-4" />
                              {link.label}
                            </Link>
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Admin Section for Mobile */}
                  {profile?.is_super_admin && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Administración
                      </p>
                      <div className="flex flex-col gap-1">
                        <Button
                          asChild
                          variant={pathname === "/admin" ? "default" : "ghost"}
                          className="justify-start gap-3"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Link href="/admin">
                            <Shield className="h-4 w-4" />
                            Panel General
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant={pathname === "/admin/users" ? "default" : "ghost"}
                          className="justify-start gap-3"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Link href="/admin/users">
                            <Users className="h-4 w-4" />
                            Gestión de Usuarios
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant={pathname === "/admin/clubs" ? "default" : "ghost"}
                          className="justify-start gap-3"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Link href="/admin/clubs">
                            <Building2 className="h-4 w-4" />
                            Gestión de Clubes
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* User Actions */}
                  {profile && (
                    <div className="space-y-2 mt-auto pt-4 border-t">
                      <Button
                        asChild
                        variant="ghost"
                        className="justify-start w-full"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/ajustes">PERFIL Y AJUSTES</Link>
                      </Button>
                      <UserMenu profile={profile} />
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
})
