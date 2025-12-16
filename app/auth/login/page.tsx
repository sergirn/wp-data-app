"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { AlertCircle, Eye, EyeOff, Trophy } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.session) {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; ${
          remember ? "max-age=2592000" : ""
        }`
        window.location.href = "/"
      }
    } catch {
      setError("Email o contraseña incorrectos")
      setIsLoading(false)
    }
  }

  return (
    <div
      className="
        min-h-screen flex items-center justify-center px-4
        bg-dashboard-gradient
        bg-gradient-to-br from-background via-background to-blue-500/10
      "
    >
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-25 h-25 rounded-full bg-blue-500/10 flex items-center justify-center overflow-hidden">
            <Image
              src="/icons/icon-192.png"
              alt="WaterpoloStats"
              width={100}
              height={100}
              priority
              className="object-cover"
            />
          </div>

          <h1 className="text-2xl font-bold">
            WaterpoloStats
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de Estadísticas Deportivas
          </p>
        </div>

        {/* Card */}
        <Card className="border-2 bg-gradient-to-br from-background to-blue-500/5 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold">
                Acceso al sistema
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gestiona el rendimiento de tu equipo
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={() => setRemember(!remember)}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span className="text-muted-foreground">
                    Recordar sesión
                  </span>
                </label>

                <Link href="/auth/forgot-password" className="text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? "Entrando…" : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              ¿No tienes cuenta?{" "}
              <Link href="/auth/signup" className="font-medium text-primary underline underline-offset-4">
                Registrarse
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
