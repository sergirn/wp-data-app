import { useMemo } from "react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations("TeamDashboardCards")
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
        <CardTitle>{t("attack.title")}</CardTitle>
        <CardDescription>{t("attack.description")}</CardDescription>
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
              statLabel={t("attack.highestEfficiency")}
              statValue={`${eff.toFixed(1)}%`}
              gradientColors="from-orange-500 to-red-500"
              details={[
                { label: t("goals"), value: topGoals },
                { label: t("shots"), value: topShots },
                { label: t("goalsPerMatch"), value: goalsPerMatch.toFixed(1) },
                { label: t("shotsPerMatch"), value: shotsPerMatch.toFixed(1) },
              ]}
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" disabled={restPlayers.length === 0}>
                  {t("viewMore")}
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("attack.ranking")}</DialogTitle>
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
                        statLabel={t("rankedMetric", { rank: idx + 2, metric: t("efficiency") })}
                        statValue={`${effP.toFixed(1)}%`}
                        gradientColors="from-orange-500 to-red-500"
                        details={[
                          { label: t("goals"), value: goles },
                          { label: t("shots"), value: tiros },
                          { label: t("goalsPerMatch"), value: gPart.toFixed(1) },
                          { label: t("shotsPerMatch"), value: tPart.toFixed(1) },
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
