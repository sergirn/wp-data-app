"use client"

import { useMemo } from "react"
import { CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { LucideIcon } from "lucide-react"
import { TopPlayerCard } from "./TopPlayerCard"

interface PlayerLite {
  id: number
  name: string
  number: number
  photo_url?: string
}

interface PlayerStatCardProps {
  title: string
  icon: LucideIcon // (lo dejamos por compatibilidad; si no lo usas aquí, puedes quitarlo)
  player: PlayerLite

  statLabel: string
  statValue: string | number
  details?: Array<{ label: string; value: string | number }>

  /** ✅ para igualarlo al resto */
  description?: string
  gradientColors?: string

  /** ✅ si quieres "Ver más" como Ataque */
  ranking?: Array<{
    player: PlayerLite
    statLabel: string
    statValue: string | number
    details?: Array<{ label: string; value: string | number }>
  }>
  dialogTitle?: string
}

const toStr = (v: any) => (v === null || v === undefined ? "" : String(v))

export function PlayerStatCard({
  title,
  // icon: Icon, // si quieres mostrar icono en el header, lo activamos abajo
  icon,
  player,
  statLabel,
  statValue,
  details = [],

  description = "Ranking y detalle del líder",
  gradientColors = "from-slate-500 to-zinc-500",

  ranking = [],
  dialogTitle,
}: PlayerStatCardProps) {
  const rest = useMemo(() => {
    // Si el ranking incluye el top también, lo quitamos por id
    return (ranking ?? []).filter((r) => r.player?.id !== player?.id)
  }, [ranking, player?.id])

  const DialogHeaderTitle = dialogTitle ?? `Ranking · ${title}`

  return (
    <div>
      {/* ✅ Header igual que AttackBlock */}
      <div>
        <CardTitle className="flex items-center gap-2">
          {icon ? <span className="[&>svg]:h-4 [&>svg]:w-4 text-muted-foreground">{/* icon opcional */}</span> : null}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>

      <div className="mt-4 ">
        <div className="space-y-2">
          {/* ✅ Top card igual que las demás */}
          <TopPlayerCard
            player={{
              id: player.id,
              name: player.name,
              number: player.number,
              photo_url: player.photo_url,
            }}
            statLabel={statLabel}
            statValue={toStr(statValue)}
            gradientColors={gradientColors}
            details={(details ?? []).map((d) => ({ label: d.label, value: d.value }))}
          />

          {/* ✅ Ver más (si hay ranking) */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="w-full" disabled={rest.length === 0}>
                Ver más
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{DialogHeaderTitle}</DialogTitle>
              </DialogHeader>

              <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
                {rest.map((r, idx) => (
                  <TopPlayerCard
                    key={r.player.id ?? `${r.player.name}-${idx}`}
                    player={{
                      id: r.player.id,
                      name: r.player.name,
                      number: r.player.number,
                      photo_url: r.player.photo_url,
                    }}
                    statLabel={r.statLabel || `#${idx + 2} · ${statLabel}`}
                    statValue={toStr(r.statValue)}
                    gradientColors={gradientColors}
                    details={(r.details ?? []).map((d) => ({ label: d.label, value: d.value }))}
                  />
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
