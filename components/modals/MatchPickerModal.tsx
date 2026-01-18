"use client"

import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Match } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  title?: string
  description?: string
  matches: Match[]
  maxSelections?: number
  initialSelectedIds?: number[]
  onClose: () => void
  onConfirm: (matchIds: number[]) => void
}

export function MatchPickerModal({
  open,
  title = "Seleccionar jornadas",
  description = "Pulsa sobre las jornadas que quieras comparar",
  matches,
  maxSelections = 4,
  initialSelectedIds = [],
  onClose,
  onConfirm,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds)

  useEffect(() => {
    if (open) setSelectedIds(initialSelectedIds ?? [])
  }, [open, initialSelectedIds])

  const sorted = useMemo(() => {
    return [...(matches ?? [])]
      .filter((m: any) => m != null)
      .sort((a: any, b: any) => {
        const aj = a?.jornada ?? 9999
        const bj = b?.jornada ?? 9999
        if (aj !== bj) return aj - bj
        return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      })
  }, [matches])

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id)
      if (exists) return prev.filter((x) => x !== id)
      if (prev.length >= maxSelections) return prev
      return [...prev, id]
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description} · <span className="font-medium">{selectedIds.length}</span>/{maxSelections}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 max-h-[70vh] overflow-auto rounded-md border p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sorted.map((m: any) => {
              const id = Number(m.id)
              const checked = selectedIds.includes(id)
              const disabled = !checked && selectedIds.length >= maxSelections
              const dateStr = new Date(m.match_date).toLocaleDateString("es-ES")

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => !disabled && toggle(id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition",
                    checked ? "bg-muted ring-2 ring-primary/40" : "hover:bg-muted/60",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      J{m.jornada ?? "-"} · {m.opponent}
                    </p>
                    <p className="text-xs text-muted-foreground">{dateStr}</p>
                  </div>

                  <Badge variant={checked ? "default" : "secondary"} className="shrink-0">
                    {checked ? "✓" : " "}
                  </Badge>
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
            onClick={() => {
              onConfirm(selectedIds)
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
