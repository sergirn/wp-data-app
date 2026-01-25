"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Player } from "@/lib/types"

type Quarter = 1 | 2 | 3 | 4

type Props = {
  open: boolean
  quarter: Quarter | null
  players: Player[]
  activePlayerIds: number[]
  onClose: () => void
  onConfirm: (playerId: number) => void
}

export function SprintWinnerModal({
  open,
  quarter,
  players,
  activePlayerIds,
  onClose,
  onConfirm,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const available = useMemo(
    () => players.filter((p) => activePlayerIds.includes(p.id)),
    [players, activePlayerIds],
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setSelectedId(null)
          onClose()
        }
      }}
    >
      <DialogContent className="w-[90vw] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ganador del sprint {quarter ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="mt-3 max-h-[520px] overflow-auto rounded-md p-3">
          <div className="grid grid-cols-4 gap-2">
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
          <Button
            variant="outline"
            onClick={() => {
              setSelectedId(null)
              onClose()
            }}
          >
            Cancelar
          </Button>

          <Button
            disabled={!selectedId || !quarter}
            onClick={() => {
              if (!selectedId) return
              onConfirm(selectedId)
              setSelectedId(null)
            }}
          >
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
