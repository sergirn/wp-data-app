"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; alreadyExists?: boolean } | null>(null)
  const router = useRouter()

  const createAdminUser = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/setup-admin", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create admin user",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuración Inicial</CardTitle>
          <CardDescription>Crea el usuario administrador para comenzar a usar la aplicación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Este proceso creará un usuario super administrador con las siguientes credenciales:
            </p>
            <div className="rounded-lg bg-muted p-3 font-mono text-sm">
              <div>
                <strong>Email:</strong> admin@waterpolostats.com
              </div>
              <div>
                <strong>Contraseña:</strong> Admin123!
              </div>
            </div>
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={createAdminUser}
              disabled={loading || (result?.success && !result?.alreadyExists)}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando usuario...
                </>
              ) : (
                "Crear Usuario Administrador"
              )}
            </Button>

            {result?.success && (
              <Button variant="outline" onClick={() => router.push("/auth/login")} className="w-full">
                Ir a Login
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Nota: Solo necesitas hacer esto una vez. Si el usuario ya existe, verás un mensaje de confirmación.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
