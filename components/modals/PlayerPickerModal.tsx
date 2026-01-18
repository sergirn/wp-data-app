"use client"

import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Player } from "@/lib/types"

type Props = {
  open: boolean
  title?: string
  players: Player[]
  // filtro opcional (por ejemplo titulares)
  allowedPlayerIds?: number[]
  initialSelectedId?: number | null
  onClose: () => void
  onConfirm: (playerId: number) => void
}

export function PlayerPickerModal({
  open,
  title = "Seleccionar jugador",
  players,
  allowedPlayerIds,
  initialSelectedId = null,
  onClose,
  onConfirm,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId)

  useEffect(() => {
    if (open) setSelectedId(initialSelectedId ?? null)
  }, [open, initialSelectedId])

  const available = useMemo(() => {
    const base = Array.isArray(players) ? players : []
    const filtered = allowedPlayerIds?.length
      ? base.filter((p) => allowedPlayerIds.includes(p.id))
      : base

    return filtered.slice().sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
  }, [players, allowedPlayerIds])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="mt-3 max-h-[70vh] overflow-auto rounded-md p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {available.map((p) => {
              const selected = selectedId === p.id

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`group flex flex-col items-center rounded-lg border p-2 transition
                    ${selected ? "bg-muted ring-2 ring-primary/40" : "hover:bg-muted/60"}
                  `}
                >
                  {/* FOTO */}
                  <div className="relative w-full aspect-square overflow-hidden rounded-md bg-muted/30">
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

                  {/* LINEA pegada al pie de la foto */}
                  <div className="-mx-2 h-px w-[calc(100%+16px)] bg-border/70" />

                  {/* TEXTO */}
                  <div className="w-full min-w-0 pt-2">
                    <p className="text-[11px] font-semibold tabular-nums text-muted-foreground truncate text-center">
                      #{p.number}
                    </p>
                    <p className="text-[12px] font-medium truncate text-center">{p.name}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            disabled={!selectedId}
            onClick={() => {
              if (!selectedId) return
              onConfirm(selectedId)
              onClose()
            }}
          >
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
