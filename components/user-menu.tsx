"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Profile } from "@/lib/types"
import { useProfile } from "@/lib/profile-context"

interface UserMenuProps {
  profile: Profile
}

export function UserMenu({ profile }: UserMenuProps) {
  const router = useRouter()
  const { clearProfile } = useProfile()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      if (!supabase) {
        window.location.href = "/"
        return
      }

      await supabase.auth.signOut({ scope: "local" })

      // Clear client-side profile state
      clearProfile()

      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      // Even if there's an error, redirect to home
      window.location.href = "/"
    }
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { label: "Admin", color: "text-red-600 dark:text-red-400" },
      coach: { label: "Entrenador", color: "text-blue-600 dark:text-blue-400" },
      viewer: { label: "Visualizador", color: "text-gray-600 dark:text-gray-400" },
    }
    return badges[role as keyof typeof badges] || badges.viewer
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const roleBadge = getRoleBadge(profile.role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile.full_name || "Usuario"}</p>
            <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Shield className={`h-3 w-3 ${roleBadge.color}`} />
              <p className={`text-xs font-medium ${roleBadge.color}`}>{roleBadge.label}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/ajustes")}>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
