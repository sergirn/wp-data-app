"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { CardTitle, CardDescription } from "@/components/ui/card"
import { TopPlayerCard } from "../TopPlayerCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface MostAssistsFeaturedCardProps {
  playerStats: any[]
}

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function MostAssistsFeaturedCard({ playerStats }: MostAssistsFeaturedCardProps) {
  const t = useTranslations("TeamDashboardCards")
  const ranking = useMemo(() => {
    return [...(playerStats ?? [])]
      .filter((p) => toNum(p.acciones_asistencias) > 0)
      .sort((a, b) => toNum(b.acciones_asistencias) - toNum(a.acciones_asistencias))
      .slice(0, 10)
  }, [playerStats])

  const top = ranking[0] ?? null
  const rest = ranking.slice(1)

  const getMatches = (p: any) => toNum(p.matchesPlayed ?? p.partidos ?? 0)

  return (
    <div>
      <div>
        <CardTitle>{t("assistsCard.title")}</CardTitle>
        <CardDescription>{t("assistsCard.description")}</CardDescription>
      </div>

      <div className="mt-4">
        {top && (
          <div className="space-y-2">
            <TopPlayerCard
              player={{ id: top.id, name: top.name, number: top.number, photo_url: top.photo_url }}
              statLabel={t("assists")}
              statValue={`${toNum(top.acciones_asistencias)}`}
              gradientColors="from-lime-500 to-green-500"
              details={[
                { label: t("assistsShort"), value: toNum(top.acciones_asistencias) },
                {
                  label: t("assistsPerMatch"),
                  value: (getMatches(top) > 0 ? toNum(top.acciones_asistencias) / getMatches(top) : 0).toFixed(1),
                },
                { label: t("matches"), value: getMatches(top) },
              ]}
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" disabled={rest.length === 0}>
                  {t("viewMore")}
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("assistsCard.ranking")}</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1">
                  {rest.map((p, idx) => {
                    const matches = getMatches(p)
                    const assists = toNum(p.acciones_asistencias)
                    const apm = matches > 0 ? assists / matches : 0

                    return (
                      <TopPlayerCard
                        key={p.id ?? `${p.name}-${idx}`}
                        player={{ id: p.id, name: p.name, number: p.number, photo_url: p.photo_url }}
                        statLabel={t("rankedMetric", { rank: idx + 2, metric: t("assists") })}
                        statValue={`${assists}`}
                        gradientColors="from-lime-500 to-green-500"
                        details={[
                          { label: t("assistsShort"), value: assists },
                          { label: t("assistsPerMatch"), value: apm.toFixed(1) },
                          { label: t("matches"), value: matches },
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
