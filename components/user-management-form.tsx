"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import type { Club } from "@/lib/types"

interface UserManagementFormProps {
  clubs: Club[]
}

export function UserManagementForm({ clubs }: UserManagementFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<"admin" | "coach" | "viewer">("viewer")
  const [clubId, setClubId] = useState<string>("")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          role,
          clubId: isSuperAdmin ? null : clubId ? Number.parseInt(clubId) : null,
          isSuperAdmin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear usuario")
      }

      setSuccess(`Usuario ${email} creado exitosamente`)
      // Reset form
      setEmail("")
      setPassword("")
      setFullName("")
      setRole("viewer")
      setClubId("")
      setIsSuperAdmin(false)

      // Refresh the page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña *</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Nombre Completo</Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Rol *</Label>
          <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer (Solo lectura)</SelectItem>
              <SelectItem value="coach">Coach (Puede editar)</SelectItem>
              <SelectItem value="admin">Admin (Control total del club)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isSuperAdmin && (
          <div className="space-y-2">
            <Label htmlFor="club">Club *</Label>
            <Select value={clubId} onValueChange={setClubId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.short_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="superAdmin"
          checked={isSuperAdmin}
          onChange={(e) => setIsSuperAdmin(e.target.checked)}
          disabled={isLoading}
          className="h-4 w-4"
        />
        <Label htmlFor="superAdmin" className="text-sm font-normal cursor-pointer">
          Super Administrador (acceso a todos los clubes)
        </Label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isLoading || (!isSuperAdmin && !clubId)}>
        {isLoading ? "Creando..." : "Crear Usuario"}
      </Button>
    </form>
  )
}
