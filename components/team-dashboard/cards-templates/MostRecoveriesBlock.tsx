"use client"

import { useMemo } from "react"
import { CardTitle, CardDescription } from "@/components/ui/card"
import { TopPlayerCard } from "../TopPlayerCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface MostRecoveriesFeaturedCardProps {
  playerStats: any[]
}

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function MostRecoveriesFeaturedCard({ playerStats }: MostRecoveriesFeaturedCardProps) {
  const ranking = useMemo(() => {
    return [...(playerStats ?? [])]
      .filter((p) => toNum(p.acciones_recuperacion) > 0)
      .sort((a, b) => toNum(b.acciones_recuperacion) - toNum(a.acciones_recuperacion))
      .slice(0, 10)
  }, [playerStats])

  const top = ranking[0] ?? null
  const rest = ranking.slice(1)

  const getMatches = (p: any) => toNum(p.matchesPlayed ?? p.partidos ?? 0)

  return (
    <div>
      <div>
        <CardTitle>Más recuperaciones</CardTitle>
        <CardDescription>Ranking por recuperaciones</CardDescription>
      </div>

      <div className="mt-4">
        {top && (
          <div className="space-y-2">
            {(() => {
              const matches = getMatches(top)
              const rec = toNum(top.acciones_recuperacion)
              const recPerMatch = matches > 0 ? rec / matches : 0

              return (
                <TopPlayerCard
                  player={{ id: top.id, name: top.name, number: top.number, photo_url: top.photo_url }}
                  statLabel="Recuperaciones"
                  statValue={`${rec}`}
                  gradientColors="from-purple-500 to-fuchsia-500"
                  details={[
                    { label: "Recuperaciones", value: rec }, 
                    { label: "Rec/part", value: recPerMatch.toFixed(1) },
                    { label: "Bloqueos", value: toNum(top.acciones_bloqueo) },
                    { label: "Rebotes", value: toNum(top.acciones_rebote) },
                  ]}
                />
              )
            })()}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" disabled={rest.length === 0}>
                  Ver más
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ranking · Recuperaciones</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
                  {rest.map((p, idx) => {
                    const matches = getMatches(p)
                    const rec = toNum(p.acciones_recuperacion)
                    const recPerMatch = matches > 0 ? rec / matches : 0

                    return (
                      <TopPlayerCard
                        key={p.id ?? `${p.name}-${idx}`}
                        player={{ id: p.id, name: p.name, number: p.number, photo_url: p.photo_url }}
                        statLabel={`#${idx + 2} · Recuperaciones`}
                        statValue={`${rec}`}
                        gradientColors="from-purple-500 to-fuchsia-500"
                        details={[
                          { label: "Recuperaciones", value: rec }, 
                          { label: "Rec/part", value: recPerMatch.toFixed(1) },
                          { label: "Bloqueos", value: toNum(p.acciones_bloqueo) },
                          { label: "Rebotes", value: toNum(p.acciones_rebote) },
                        ]}
                      />
                    )
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}
