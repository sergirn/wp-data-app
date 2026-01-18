"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ShotResult = "goal" | "save"

export type GoalkeeperShotDraft = {
  goalkeeper_player_id: number
  shot_index: number
  result: ShotResult
  x: number
  y: number
}

type Props = {
  goalkeeperPlayerId: number
  shots?: GoalkeeperShotDraft[] // 👈 opcional, porque a veces llega undefined
  onChangeShots?: (next: GoalkeeperShotDraft[]) => void // 👈 opcional para no romper
}

export function GoalkeeperShotsRecorder({ goalkeeperPlayerId, shots, onChangeShots }: Props) {
  const goalRef = React.useRef<HTMLDivElement | null>(null)
  const [result, setResult] = React.useState<ShotResult>("goal")

  // ✅ nunca trabajes con undefined
  const safeShots = React.useMemo(() => (Array.isArray(shots) ? shots : []), [shots])
  const safeOnChange = React.useMemo(() => onChangeShots ?? (() => {}), [onChangeShots])

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

  const nextIndexFor = React.useCallback(
    (prev: GoalkeeperShotDraft[]) => {
      const max = prev
        .filter((s) => s.goalkeeper_player_id === goalkeeperPlayerId)
        .reduce((m, s) => Math.max(m, s.shot_index), 0)
      return max + 1
    },
    [goalkeeperPlayerId],
  )

  const addShotAtClientPoint = React.useCallback(
    (clientX: number, clientY: number) => {
      const el = goalRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const x = clamp01((clientX - rect.left) / rect.width)
      const y = clamp01((clientY - rect.top) / rect.height)

      const shot_index = nextIndexFor(safeShots)

      const next: GoalkeeperShotDraft[] = [
        ...safeShots,
        {
          goalkeeper_player_id: goalkeeperPlayerId,
          shot_index,
          result,
          x,
          y,
        },
      ]

      safeOnChange(next)
    },
    [safeShots, safeOnChange, goalkeeperPlayerId, result, nextIndexFor],
  )

  // ✅ pointer: funciona en móvil/desktop
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addShotAtClientPoint(e.clientX, e.clientY)
  }

  const shotsForThisGK = React.useMemo(
    () => safeShots.filter((s) => s.goalkeeper_player_id === goalkeeperPlayerId),
    [safeShots, goalkeeperPlayerId],
  )

  const removeLast = () => {
    let idx = -1
    for (let i = safeShots.length - 1; i >= 0; i--) {
      const s = safeShots[i]
      if (s.goalkeeper_player_id === goalkeeperPlayerId) {
        idx = i
        break
      }
    }
    if (idx === -1) return
    const next = safeShots.slice(0, idx).concat(safeShots.slice(idx + 1))
    safeOnChange(next)
  }

  const clearThisGK = () => {
    safeOnChange(safeShots.filter((s) => s.goalkeeper_player_id !== goalkeeperPlayerId))
  }

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={result === "goal" ? "default" : "ghost"}
              onClick={() => setResult("goal")}
            >
              Gol
            </Button>
            <Button
              type="button"
              size="sm"
              variant={result === "save" ? "default" : "ghost"}
              onClick={() => setResult("save")}
            >
              Parada
            </Button>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={removeLast} disabled={shotsForThisGK.length === 0} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Deshacer
          </Button>
          <Button type="button" variant="outline" onClick={clearThisGK} disabled={shotsForThisGK.length === 0}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Portería */}
<div className="w-full max-w-full">
  {/* esta caja define la altura máxima real */}
  <div className="w-full max-w-full h-[min(30vh,340px)]">
    <div
      ref={goalRef}
      onPointerDown={onPointerDown}
      role="button"
      aria-label="Portería interactiva"
      className={cn(
        "relative mx-auto h-full",              
        "w-auto max-w-full",                    
        "aspect-[4/3]",                         
        "overflow-hidden select-none cursor-crosshair",
        "rounded-xl border bg-muted/10",
      )}
      style={{ touchAction: "none" }}
    >
      {/* Fondo suave */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 via-background/5 to-background/40" />

      {/* Red (malla) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "8% 8%",
        }}
      />

      {/* Sombra interior (profundidad) */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_-24px_50px_rgba(0,0,0,0.28)]" />

      {/* Marco de la portería */}
      {/* Larguero */}
      <div className="pointer-events-none absolute left-[10%] right-[10%] top-[12%] h-[10px] rounded bg-foreground/80 shadow-md" />
      {/* Poste izquierdo */}
      <div className="pointer-events-none absolute left-[10%] top-[12%] bottom-[18%] w-[10px] rounded bg-foreground/80 shadow-md" />
      {/* Poste derecho */}
      <div className="pointer-events-none absolute right-[10%] top-[12%] bottom-[18%] w-[10px] rounded bg-foreground/80 shadow-md" />

      {/* Línea de gol / suelo */}
      <div className="pointer-events-none absolute left-[9%] right-[9%] bottom-[16%] h-[4px] rounded-full bg-foreground/50" />

      {/* Área interior (boca) */}
      <div className="pointer-events-none absolute left-[12%] right-[12%] top-[14%] bottom-[18%] rounded-lg border border-foreground/35" />

      {/* “Profundidad” detrás de la red (da look 3D) */}
      <div className="pointer-events-none absolute left-[12%] right-[12%] top-[14%] bottom-[18%] bg-black/5" />

      {/* Texto guía (opcional) */}
      <div className="pointer-events-none absolute left-3 top-3 text-[11px] text-muted-foreground">
        Toca dentro para registrar
      </div>

      {/* Puntos */}
      {shotsForThisGK.map((s) => (
        <ShotDot
          key={`${s.goalkeeper_player_id}-${s.shot_index}`}
          x={s.x}
          y={s.y}
          result={s.result}
        />
      ))}
    </div>
  </div>

  <p className="mt-2 text-xs text-muted-foreground">
    Esto se guarda en memoria (array) hasta que pulses <b>Guardar Partido</b>.
  </p>
</div>
    </div>
  )
}

function ShotDot({ x, y, result }: { x: number; y: number; result: ShotResult }) {
  const cls = result === "goal" ? "bg-destructive" : "bg-emerald-600"
  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-background/60 shadow-sm",
        cls,
      )}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      title={result}
    />
  )
}
