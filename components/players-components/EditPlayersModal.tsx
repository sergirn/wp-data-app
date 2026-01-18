"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Player } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

type Props = {
  open: boolean
  players: Player[]
  onClose: () => void

  /**
   * ✅ opcional: si tu página maneja players en state,
   * pásale una función para actualizar el listado en UI sin refresh.
   */
  onSaved?: (updatedPlayers: Player[]) => void
}

type Draft = {
  id: number
  number: string
  name: string
}

export function EditPlayersModal({ open, players, onClose, onSaved }: Props) {
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // draft editable local
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})

  // inicializar drafts al abrir
  useEffect(() => {
    if (!open) return
    const initial: Record<number, Draft> = {}
    players.forEach((p) => {
      initial[p.id] = { id: p.id, number: String(p.number ?? ""), name: p.name ?? "" }
    })
    setDrafts(initial)
    setErrorMsg(null)
  }, [open, players])

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
  }, [players])

  const updateDraft = (id: number, patch: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }))
  }

  const validate = () => {
    // name obligatorio y number entero >= 0
    for (const p of sortedPlayers) {
      const d = drafts[p.id]
      if (!d) continue
      const n = Number.parseInt(d.number, 10)
      if (!d.name.trim()) return "El nombre no puede estar vacío."
      if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) return "Hay algún número inválido."
    }

    // números duplicados
    const seen = new Set<number>()
    for (const p of sortedPlayers) {
      const d = drafts[p.id]
      if (!d) continue
      const n = Number.parseInt(d.number, 10)
      if (seen.has(n)) return "Hay números de gorro duplicados."
      seen.add(n)
    }

    return null
  }

  const handleSave = async () => {
    setErrorMsg(null)

    const v = validate()
    if (v) {
      setErrorMsg(v)
      return
    }

    setSaving(true)
    try {
      // ✅ calcula cambios reales
      const changes = sortedPlayers
        .map((p) => {
          const d = drafts[p.id]
          if (!d) return null
          const newNumber = Number.parseInt(d.number, 10)
          const newName = d.name.trim()
          const changed = newNumber !== p.number || newName !== p.name
          if (!changed) return null
          return { id: p.id, number: newNumber, name: newName }
        })
        .filter(Boolean) as Array<{ id: number; number: number; name: string }>

      if (changes.length === 0) {
        onClose()
        return
      }

      // ✅ updates en paralelo
      const results = await Promise.all(
        changes.map((c) =>
          supabase
            .from("players")
            .update({ number: c.number, name: c.name })
            .eq("id", c.id)
            .select("id, number, name")
            .single(),
        ),
      )

      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error

      // construir players actualizados para UI
      const updatedMap = new Map<number, { number: number; name: string }>()
      results.forEach((r) => {
        if (r.data) updatedMap.set(r.data.id, { number: r.data.number, name: r.data.name })
      })

      const updatedPlayers = players.map((p) => {
        const u = updatedMap.get(p.id)
        return u ? { ...p, number: u.number, name: u.name } : p
      })

      onSaved?.(updatedPlayers)
      onClose()
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Error guardando jugadores")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="w-[92vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Editar jugadores</DialogTitle>
        </DialogHeader>

        {errorMsg ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        ) : null}

        <div className="mt-3 max-h-[560px] overflow-auto rounded-md p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {sortedPlayers.map((p) => {
              const d = drafts[p.id]
              if (!d) return null

              return (
                <div key={p.id} className="rounded-lg border p-2 bg-card">
                  {/* FOTO */}
                  <div className="relative w-full aspect-square overflow-hidden rounded-md">
                    {p.photo_url ? (
                      <img
                        src={p.photo_url || "/placeholder.svg"}
                        alt={p.name}
                        className="h-full w-full object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="font-bold tabular-nums text-base">#{p.number}</span>
                      </div>
                    )}
                  </div>

                  {/* LINEA pegada */}
                  <div className="-mx-2 mt-2 h-px w-[calc(100%+16px)] bg-border/70" />

                  {/* INPUTS */}
                  <div className="pt-2 space-y-2">
                    <div className="flex gap-2">
                      <div className="w-20">
                        <p className="text-[11px] text-muted-foreground mb-1">Gorro</p>
                        <Input
                          value={d.number}
                          inputMode="numeric"
                          onChange={(e) => updateDraft(p.id, { number: e.target.value })}
                          className="h-9 tabular-nums"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted-foreground mb-1">Nombre</p>
                        <Input
                          value={d.name}
                          onChange={(e) => updateDraft(p.id, { name: e.target.value })}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* vista previa truncada */}
                    <div className="text-center">
                      <p className="text-[11px] font-semibold tabular-nums text-muted-foreground truncate">
                        #{Number.parseInt(d.number || "0", 10) || 0}
                      </p>
                      <p className="text-[12px] font-medium truncate">{d.name}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
