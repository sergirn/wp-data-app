"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations("TeamDashboardCards")
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
        <CardTitle>{t("recoveriesCard.title")}</CardTitle>
        <CardDescription>{t("recoveriesCard.description")}</CardDescription>
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
                  statLabel={t("recoveries")}
                  statValue={`${rec}`}
                  gradientColors="from-purple-500 to-fuchsia-500"
                  details={[
                    { label: t("recoveries"), value: rec }, 
                    { label: t("recoveriesPerMatch"), value: recPerMatch.toFixed(1) },
                    { label: t("blocks"), value: toNum(top.acciones_bloqueo) },
                    { label: t("rebounds"), value: toNum(top.acciones_rebote) },
                  ]}
                />
              )
            })()}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" disabled={rest.length === 0}>
                  {t("viewMore")}
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("recoveriesCard.ranking")}</DialogTitle>
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
                        statLabel={t("rankedMetric", { rank: idx + 2, metric: t("recoveries") })}
                        statValue={`${rec}`}
                        gradientColors="from-purple-500 to-fuchsia-500"
                        details={[
                          { label: t("recoveries"), value: rec }, 
                          { label: t("recoveriesPerMatch"), value: recPerMatch.toFixed(1) },
                          { label: t("blocks"), value: toNum(p.acciones_bloqueo) },
                          { label: t("rebounds"), value: toNum(p.acciones_rebote) },
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
