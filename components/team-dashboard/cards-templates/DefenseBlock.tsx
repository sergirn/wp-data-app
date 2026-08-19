import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TopPlayerCard } from "../TopPlayerCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface DefenseBlockProps {
  playerStats: any[]
}

const toNum = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const getId = (p: any) => p?.id ?? p?.player_id ?? p?.playerId

const getBloqueos = (p: any) =>
  toNum(p?.totalBloqueos ?? p?.acciones_bloqueo ?? p?.accionesBloqueo ?? 0)

const getRecuperaciones = (p: any) =>
  toNum(p?.acciones_recuperacion ?? p?.accionesRecuperacion ?? 0)

const getMatches = (p: any) => toNum(p?.matchesPlayed ?? p?.partidos ?? 0)

export function DefenseBlock({ playerStats }: DefenseBlockProps) {
  const t = useTranslations("TeamDashboardCards")
  // Rankings (para el popup)
  const topBlocks = useMemo(() => {
    return [...(playerStats ?? [])]
      .sort((a, b) => getBloqueos(b) - getBloqueos(a))
      .slice(0, 10)
  }, [playerStats])

  const topRecoveries = useMemo(() => {
    return [...(playerStats ?? [])]
      .sort((a, b) => getRecuperaciones(b) - getRecuperaciones(a))
      .slice(0, 10)
  }, [playerStats])

  // ✅ Top único: impacto = bloqueos + recuperaciones
  const topDefender = useMemo(() => {
    return (
      [...(playerStats ?? [])].sort((a, b) => {
        const aScore = getBloqueos(a) + getRecuperaciones(a)
        const bScore = getBloqueos(b) + getRecuperaciones(b)
        return bScore - aScore
      })[0] ?? null
    )
  }, [playerStats])

  const blocks = getBloqueos(topDefender)
  const rec = getRecuperaciones(topDefender)
  const matches = getMatches(topDefender)
  const bPart = matches > 0 ? blocks / matches : 0
  const rPart = matches > 0 ? rec / matches : 0
  const impact = blocks + rec

  // Evitar repetir el top dentro del popup
  const topId = topDefender ? getId(topDefender) : null
  const restBlocks = topId ? topBlocks.filter((p) => getId(p) !== topId) : topBlocks
  const restRecoveries = topId ? topRecoveries.filter((p) => getId(p) !== topId) : topRecoveries

  return (
    <div>
      <div>
        <CardTitle>{t("defense.title")}</CardTitle>
        <CardDescription>{t("defense.description")}</CardDescription>
      </div>

      <div className="mt-4">

        {(!playerStats || playerStats.length === 0) && (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            {t("defense.noData")}
          </div>
        )}

        {topDefender && (
          <div className="space-y-2">
            <TopPlayerCard
              player={{
                id: topDefender.id,
                name: topDefender.name,
                number: topDefender.number,
                photo_url: topDefender.photo_url,
              }}
              statLabel={t("defense.bestDefender")}
              statValue={impact}
              gradientColors="from-indigo-500 to-sky-500"
              details={[
                { label: t("blocks"), value: blocks },
                { label: t("recoveriesShort"), value: rec },
                { label: t("blocksPerMatch"), value: bPart.toFixed(1) },
                { label: t("recoveriesPerMatch"), value: rPart.toFixed(1) },
              ]}
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full">
                  {t("viewMore")}
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("defense.ranking")}</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
                  {/* Ranking bloqueos */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">{t("blocks")}</p>
                    {restBlocks.map((p, idx) => {
                      const b = getBloqueos(p)
                      const r = getRecuperaciones(p)
                      const m = getMatches(p)
                      const bp = m > 0 ? b / m : 0
                      const rp = m > 0 ? r / m : 0

                      return (
                        <TopPlayerCard
                          key={`b-${getId(p) ?? `${p.name}-${idx}`}`}
                          player={{
                            id: p.id,
                            name: p.name,
                            number: p.number,
                            photo_url: p.photo_url,
                          }}
                          statLabel={t("rankedMetric", { rank: idx + 1, metric: t("blocks") })}
                          statValue={b}
                          gradientColors="from-indigo-500 to-sky-500"
                          details={[
                            { label: t("blocks"), value: b },
                            { label: t("recoveriesShort"), value: r },
                            { label: t("blocksPerMatch"), value: bp.toFixed(1) },
                            { label: t("recoveriesPerMatch"), value: rp.toFixed(1) },
                          ]}
                        />
                      )
                    })}
                  </div>

                  {/* Ranking recuperaciones */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">{t("recoveries")}</p>
                    {restRecoveries.map((p, idx) => {
                      const r = getRecuperaciones(p)
                      const b = getBloqueos(p)
                      const m = getMatches(p)
                      const rp = m > 0 ? r / m : 0
                      const bp = m > 0 ? b / m : 0

                      return (
                        <TopPlayerCard
                          key={`r-${getId(p) ?? `${p.name}-${idx}`}`}
                          player={{
                            id: p.id,
                            name: p.name,
                            number: p.number,
                            photo_url: p.photo_url,
                          }}
                          statLabel={t("rankedMetric", { rank: idx + 1, metric: t("recoveries") })}
                          statValue={r}
                          gradientColors="from-emerald-500 to-teal-500"
                          details={[
                            { label: t("recoveriesShort"), value: r },
                            { label: t("blocks"), value: b },
                            { label: t("recoveriesPerMatch"), value: rp.toFixed(1) },
                            { label: t("blocksPerMatch"), value: bp.toFixed(1) },
                          ]}
                        />
                      )
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}
