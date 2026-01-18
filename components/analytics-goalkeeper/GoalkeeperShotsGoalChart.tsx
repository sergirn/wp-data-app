"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type Shot = {
  id: number | string
  x: number // 0..1
  y: number // 0..1
  result: "goal" | "save"
}

function Dot({ x, y, result }: { x: number; y: number; result: "goal" | "save" }) {
  // x,y normalizados (0..1) -> %
  const left = `${x * 100}%`
  const top = `${y * 100}%`

  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border",
        "h-3 w-3 sm:h-3.5 sm:w-3.5",
        result === "goal"
          ? "bg-red-500/90 border-red-700"
          : "bg-emerald-500/90 border-emerald-700"
      )}
      style={{ left, top }}
      title={result === "goal" ? "Gol" : "Parada"}
    />
  )
}

export function GoalkeeperShotsGoalChart({
  shots,
  className,
}: {
  shots: Shot[]
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Mapa de tiros</div>
        <div className="text-xs text-muted-foreground">
          Total: {shots.length} · Goles: {shots.filter(s => s.result === "goal").length} · Paradas: {shots.filter(s => s.result === "save").length}
        </div>
      </div>

      {/* ✅ wrapper que NO desborda */}
      <div className="w-full max-w-full">
        <div className="w-full h-[min(45vh,360px)]">
          <div
            className={cn(
              "relative mx-auto h-full",
              "w-auto max-w-full",
              "aspect-[4/3]",
              "overflow-hidden rounded-xl border bg-muted/10"
            )}
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

            {/* Sombra interior */}
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_-24px_50px_rgba(0,0,0,0.28)]" />

            {/* Marco portería */}
            <div className="pointer-events-none absolute left-[10%] right-[10%] top-[12%] h-[10px] rounded bg-foreground/80 shadow-md" />
            <div className="pointer-events-none absolute left-[10%] top-[12%] bottom-[18%] w-[10px] rounded bg-foreground/80 shadow-md" />
            <div className="pointer-events-none absolute right-[10%] top-[12%] bottom-[18%] w-[10px] rounded bg-foreground/80 shadow-md" />

            {/* Línea suelo */}
            <div className="pointer-events-none absolute left-[9%] right-[9%] bottom-[16%] h-[4px] rounded-full bg-foreground/50" />

            {/* Área interior */}
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-[14%] bottom-[18%] rounded-lg border border-foreground/35" />

            {/* Puntos */}
            {shots.map((s) => (
              <Dot key={s.id} x={s.x} y={s.y} result={s.result} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Rojo = gol · Verde = parada
      </div>
    </div>
  )
}
