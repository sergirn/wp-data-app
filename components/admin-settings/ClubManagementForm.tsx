"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Competition } from "@/lib/admin"


interface ClubManagementFormProps {
  competitions: Competition[]
}

export function ClubManagementForm({ competitions }: ClubManagementFormProps) {
  const [name, setName] = useState("")
  const [shortName, setShortName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#1e40af")
  const [secondaryColor, setSecondaryColor] = useState("#3b82f6")

  const [selectedCompetitionIds, setSelectedCompetitionIds] = useState<number[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const competitionIdSet = useMemo(() => new Set(selectedCompetitionIds), [selectedCompetitionIds])

  const toggleCompetition = (id: number) => {
    setSelectedCompetitionIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/create-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shortName,
          logoUrl: logoUrl.trim() || null,
          primaryColor: primaryColor.trim() || null,
          secondaryColor: secondaryColor.trim() || null,
          competitionIds: selectedCompetitionIds, // <---
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear club")
      }

      setSuccess(`Club "${shortName || name}" creado exitosamente`)

      // Reset
      setName("")
      setShortName("")
      setLogoUrl("")
      setPrimaryColor("#1e40af")
      setSecondaryColor("#3b82f6")
      setSelectedCompetitionIds([])

      setTimeout(() => window.location.reload(), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear club")
    } finally {
      setIsLoading(false)
    }
  }

  const isValid = name.trim().length > 0 && shortName.trim().length > 0 && selectedCompetitionIds.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortName">Nombre corto *</Label>
          <Input
            id="shortName"
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input
          id="logoUrl"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Color primario</Label>
          <Input
            id="primaryColor"
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryColor">Color secundario</Label>
          <Input
            id="secondaryColor"
            type="text"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Multi-select competiciones */}
      <div className="space-y-2">
        <Label>Competiciones *</Label>
        <div className="rounded-md border p-3 space-y-2">
          {competitions.map((c) => (
            <label key={c.id} className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={competitionIdSet.has(c.id)}
                onChange={() => toggleCompetition(c.id)}
                disabled={isLoading}
                className="h-4 w-4"
              />
              <span className="flex items-center gap-2">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="rounded object-cover" />
                ) : null}
              </span>
            </label>
          ))}
          {competitions.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay competiciones creadas.</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Selecciona al menos una (por ejemplo: Liga, Amistoso).
        </p>
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

      <Button type="submit" disabled={isLoading || !isValid}>
        {isLoading ? "Creando..." : "Crear Club"}
      </Button>
    </form>
  )
}
