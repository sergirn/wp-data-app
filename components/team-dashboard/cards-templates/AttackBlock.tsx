import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TopPlayerCard } from "../TopPlayerCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface AttackBlockProps {
  playerStats: any[]
}

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function AttackBlock({ playerStats }: AttackBlockProps) {
  const bestEfficiency = useMemo(() => {
    return [...(playerStats ?? [])]
      .filter((p) => toNum(p.totalTiros) >= 10)
      .sort((a, b) => toNum(b.eficiencia) - toNum(a.eficiencia))
      .slice(0, 10)
  }, [playerStats])

  const topEfficiencyPlayer = bestEfficiency[0] ?? null
  const restPlayers = bestEfficiency.slice(1)

  const topGoals = toNum(topEfficiencyPlayer?.totalGoles)
  const topShots = toNum(topEfficiencyPlayer?.totalTiros)
  const topMatches = toNum(topEfficiencyPlayer?.matchesPlayed ?? topEfficiencyPlayer?.partidos ?? 0)

  const goalsPerMatch = topMatches > 0 ? topGoals / topMatches : 0
  const shotsPerMatch = topMatches > 0 ? topShots / topMatches : 0
  const eff = toNum(topEfficiencyPlayer?.eficiencia)

  return (
    <div>
      <div>
        <CardTitle>Ataque</CardTitle>
        <CardDescription>Producción y calidad ofensiva</CardDescription>
      </div>

      <div className="mt-4">

        {topEfficiencyPlayer && (
          <div className="space-y-2">
            <TopPlayerCard
              player={{
                id: topEfficiencyPlayer.id,
                name: topEfficiencyPlayer.name,
                number: topEfficiencyPlayer.number,
                photo_url: topEfficiencyPlayer.photo_url,
              }}
              statLabel="Mayor Eficiencia"
              statValue={`${eff.toFixed(1)}%`}
              gradientColors="from-orange-500 to-red-500"
              details={[
                { label: "Goles", value: topGoals },
                { label: "Tiros", value: topShots },
                { label: "G/part", value: goalsPerMatch.toFixed(1) },
                { label: "T/part", value: shotsPerMatch.toFixed(1) },
              ]}
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" disabled={restPlayers.length === 0}>
                  Ver más
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ranking de eficiencia (min. 10 tiros)</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
                  {restPlayers.map((p, idx) => {
                    const goles = toNum(p.totalGoles)
                    const tiros = toNum(p.totalTiros)
                    const partidos = toNum(p.matchesPlayed ?? p.partidos ?? 0)

                    const gPart = partidos > 0 ? goles / partidos : 0
                    const tPart = partidos > 0 ? tiros / partidos : 0
                    const effP = toNum(p.eficiencia)

                    return (
                      <TopPlayerCard
                        key={p.id ?? `${p.name}-${idx}`}
                        player={{
                          id: p.id,
                          name: p.name,
                          number: p.number,
                          photo_url: p.photo_url,
                        }}
                        statLabel={`#${idx + 2} · Eficiencia`}
                        statValue={`${effP.toFixed(1)}%`}
                        gradientColors="from-orange-500 to-red-500"
                        details={[
                          { label: "Goles", value: goles },
                          { label: "Tiros", value: tiros },
                          { label: "G/part", value: gPart.toFixed(1) },
                          { label: "T/part", value: tPart.toFixed(1) },
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
