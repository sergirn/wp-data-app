import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TopPlayerCard } from "../TopPlayerCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface GoalkeeperBlockProps {
  playerStats: any[] // SOLO PORTEROS
}

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function GoalkeeperBlock({ playerStats }: GoalkeeperBlockProps) {
  const t = useTranslations("TeamDashboardCards")
  const topGoalkeepers = useMemo(() => {
    return [...(playerStats ?? [])]
      .sort((a, b) => toNum(b.portero_paradas_totales) - toNum(a.portero_paradas_totales))
      .slice(0, 10)
  }, [playerStats])

  const topKeeper = topGoalkeepers[0] ?? null
  const restKeepers = topGoalkeepers.slice(1)

  const totalSaves = toNum(topKeeper?.portero_paradas_totales)
  const penSaved = toNum(topKeeper?.portero_paradas_penalti_parado)

  const matches = toNum(topKeeper?.matchesPlayed ?? topKeeper?.partidos ?? 0)
  const savesPerMatch = matches > 0 ? totalSaves / matches : 0
  const pensPerMatch = matches > 0 ? penSaved / matches : 0

  return (
    <div>
      <div>
        <CardTitle>{t("goalkeeper.title")}</CardTitle>
        <CardDescription>{t("goalkeeper.description")}</CardDescription>
      </div>

      <div className="space-y-4">

        {(!playerStats || playerStats.length === 0) && (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            {t("goalkeeper.noData")}
          </div>
        )}

        {topKeeper && (
          <div className="mt-4">
            <TopPlayerCard
              player={{
                id: topKeeper.id, // o player_id si lo usas
                name: topKeeper.name,
                number: topKeeper.number,
                photo_url: topKeeper.photo_url,
              }}
              statLabel={t("goalkeeper.mostSaves")}
              statValue={totalSaves}
              gradientColors="from-blue-500 to-cyan-500"
              details={[
                { label: t("saves"), value: totalSaves },
                { label: t("penaltiesSaved"), value: penSaved },
                { label: t("savesPerMatch"), value: savesPerMatch.toFixed(1) },
                { label: t("penaltiesPerMatch"), value: pensPerMatch.toFixed(2) },
              ]}
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full mt-2" disabled={restKeepers.length === 0}>
                  {t("viewMore")}
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("goalkeeper.ranking")}</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
                  {restKeepers.map((p, idx) => {
                    const s = toNum(p.portero_paradas_totales)
                    const ps = toNum(p.portero_paradas_penalti_parado)
                    const m = toNum(p.matchesPlayed ?? p.partidos ?? 0)
                    const spm = m > 0 ? s / m : 0
                    const ppm = m > 0 ? ps / m : 0

                    return (
                      <TopPlayerCard
                        key={p.id ?? `${p.name}-${idx}`}
                        player={{
                          id: p.id,
                          name: p.name,
                          number: p.number,
                          photo_url: p.photo_url,
                        }}
                        statLabel={t("rankedMetric", { rank: idx + 2, metric: t("saves") })}
                        statValue={s}
                        gradientColors="from-blue-500 to-cyan-500"
                        details={[
                          { label: t("saves"), value: s },
                          { label: t("penaltiesSaved"), value: ps },
                          { label: t("savesPerMatch"), value: spm.toFixed(1) },
                          { label: t("penaltiesPerMatch"), value: ppm.toFixed(2) },
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
