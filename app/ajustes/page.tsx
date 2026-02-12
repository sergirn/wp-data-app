"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { Loader2, Shield, User, Mail } from "lucide-react"
import { StatWeightsConfig } from "@/components/StatWeightsConfig"

export default function AjustesPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const supabase = createClient()
    if (!supabase) {
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setProfile(profileData)
    }
    setLoading(false)
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { label: "Administrador", variant: "destructive" as const },
      coach: { label: "Entrenador", variant: "default" as const },
      viewer: { label: "Visualizador", variant: "secondary" as const },
    }
    return badges[role as keyof typeof badges] || badges.viewer
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Ajustes</h1>
            <p className="text-muted-foreground">Configura las preferencias de la aplicación</p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : profile ? (
            <Card>
              <CardHeader>
                <CardTitle>Perfil de Usuario</CardTitle>
                <CardDescription>Información de tu cuenta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{profile.full_name || "Usuario"}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {profile.email}
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Rol:</span>
                    </div>
                    <Badge variant={getRoleBadge(profile.role).variant}>{getRoleBadge(profile.role).label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {profile.role === "admin" && "Tienes acceso completo a todas las funciones del sistema."}
                    {profile.role === "coach" && "Puedes crear y editar partidos y estadísticas."}
                    {profile.role === "viewer" && "Puedes visualizar todas las estadísticas pero no editarlas."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
              <CardDescription>Personaliza el aspecto visual de la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Tema</Label>
                  <p className="text-sm text-muted-foreground">
                    {mounted ? (theme === "dark" ? "Modo oscuro activado" : "Modo claro activado") : "Cargando..."}
                  </p>
                </div>
                <ThemeToggle />
              </div>
              <p className="text-sm text-muted-foreground">
                El modo oscuro reduce el brillo de la pantalla y es más cómodo para la vista en ambientes con poca luz.
              </p>
            </CardContent>
          </Card>

          <StatWeightsConfig />

          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
              <CardDescription>Detalles sobre la aplicación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versión:</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Club:</span>
                  <span className="font-medium">CN Sant Andreu</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deporte:</span>
                  <span className="font-medium">Waterpolo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
