"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-muted/30 to-muted/50">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
              <svg
                className="w-12 h-12 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold">WaterpoloStats</h1>
            <p className="text-muted-foreground">Sistema de Gestión Deportiva</p>
          </div>

          <Card className="border-2 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Registro Deshabilitado</CardTitle>
              <CardDescription>Solo los administradores pueden crear nuevas cuentas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  El registro público está deshabilitado. Para obtener acceso al sistema, contacta con el administrador
                  de tu club.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Si ya tienes una cuenta, puedes iniciar sesión:</p>
                <Button asChild className="w-full h-11">
                  <Link href="/auth/login">Iniciar Sesión</Link>
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Los administradores pueden crear usuarios desde el panel de administración
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
