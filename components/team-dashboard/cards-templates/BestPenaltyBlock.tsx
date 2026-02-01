"use client"

import { useMemo } from "react"
import { CardTitle, CardDescription } from "@/components/ui/card"
import { TopPlayerCard } from "../TopPlayerCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface BestPenaltyFeaturedCardProps {
  playerStats: any[]
}

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function BestPenaltyFeaturedCard({ playerStats }: BestPenaltyFeaturedCardProps) {
  const ranking = useMemo(() => {
    return [...(playerStats ?? [])]
      .map((p) => {
        const scored = toNum(p.goles_penalti_anotado)
        const missed = toNum(p.goles_penalti_fallo)
        const total = scored + missed
        const eff = total > 0 ? (scored / total) * 100 : 0
        return { ...p, _penEff: eff, _scored: scored, _missed: missed, _total: total }
      })
      .filter((p) => toNum(p._total) > 0)
      .sort((a, b) => toNum(b._penEff) - toNum(a._penEff))
      .slice(0, 10)
  }, [playerStats])

  const top = ranking[0] ?? null
  const rest = ranking.slice(1)

  return (
    <div>
      <div>
        <CardTitle>Mejor en penaltis</CardTitle>
        <CardDescription>Eficiencia (anotados/total)</CardDescription>
      </div>

      <div className="mt-4">
        {top && (
          <div className="space-y-2">
            <TopPlayerCard
              player={{ id: top.id, name: top.name, number: top.number, photo_url: top.photo_url }}
              statLabel="Eficiencia"
              statValue={`${toNum(top._penEff).toFixed(0)}%`}
              gradientColors="from-amber-500 to-orange-500"
              details={[
                { label: "Anotados", value: toNum(top._scored) },
                { label: "Fallados", value: toNum(top._missed) },
                { label: "Total", value: toNum(top._total) },
              ]}
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" disabled={rest.length === 0}>
                  Ver más
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ranking · Penaltis</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
                  {rest.map((p, idx) => (
                    <TopPlayerCard
                      key={p.id ?? `${p.name}-${idx}`}
                      player={{ id: p.id, name: p.name, number: p.number, photo_url: p.photo_url }}
                      statLabel={`#${idx + 2} · Eficiencia`}
                      statValue={`${toNum(p._penEff).toFixed(0)}%`}
                      gradientColors="from-amber-500 to-orange-500"
                      details={[
                        { label: "Anotados", value: toNum(p._scored) },
                        { label: "Fallados", value: toNum(p._missed) },
                        { label: "Total", value: toNum(p._total) },
                      ]}
                    />
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}
