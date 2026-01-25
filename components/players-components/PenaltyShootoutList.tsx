"use client"

import { CheckCircle, Shield, XCircle, Target, User } from "lucide-react"

type LocalShooter = {
  id: number
  scored: boolean
  players?: {
    name?: string | null
    number?: number | null
    photo_url?: string | null
  } | null
}

type RivalShot = {
  id: number
  scored: boolean
  result_type?: "scored" | "missed" | "saved" | null
}

function ResultPill({ variant }: { variant: "scored" | "missed" | "saved" }) {
  const styles =
    variant === "scored"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
      : variant === "saved"
        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
        : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${styles}`}>
      {variant === "scored" ? (
        <>
          <CheckCircle className="h-3.5 w-3.5" /> Gol
        </>
      ) : variant === "saved" ? (
        <>
          <Shield className="h-3.5 w-3.5" /> Parada
        </>
      ) : (
        <>
          <XCircle className="h-3.5 w-3.5" /> Fallo
        </>
      )}
    </span>
  )
}

function PenaltyHeroRow({
  order,
  title,
  subtitle,
  photoUrl,
  number,
  teamLabel,
  result,
}: {
  order: number
  title: string
  subtitle?: string
  photoUrl?: string | null
  number?: number | null
  teamLabel: string
  result: "scored" | "missed" | "saved"
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />

      <div className="relative flex items-stretch">
        <div className="absolute left-2.5 top-2.5 z-10">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted/70 text-[12px] font-bold tabular-nums border">
            {order}
          </span>
        </div>

        <div className="shrink-0 w-[84px] sm:w-[104px] h-[84px] sm:h-[92px] overflow-hidden">
          {photoUrl ? (
            <img
              src={photoUrl || "/placeholder.svg"}
              alt={title}
              className="h-[140%] w-full object-cover object-top"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-muted/40 border-r border-border/60">
              <span className="text-foreground/70 font-extrabold text-xl tabular-nums">
                {number ?? "—"}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] sm:text-base font-semibold leading-tight truncate">{title}</p>

            <span className="inline-flex items-center rounded-md border bg-card/60 backdrop-blur px-2 py-1 text-[11px] text-muted-foreground">
              {teamLabel}
            </span>

            {number != null ? (
              <span className="inline-flex items-center rounded-md bg-muted/50 backdrop-blur px-2 py-1 text-[11px] font-semibold tabular-nums">
                #{number}
              </span>
            ) : null}
          </div>

          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p> : null}

          <div className="mt-2 flex items-center justify-between gap-3">
            <ResultPill variant={result} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function PenaltyShootoutList({
  clubName,
  opponentName,
  homePenaltyShooters,
  rivalPenaltyShots,
}: {
  clubName: string
  opponentName: string
  homePenaltyShooters: LocalShooter[]
  rivalPenaltyShots: RivalShot[]
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Local */}
      <div className="space-y-3">

        {homePenaltyShooters.length > 0 ? (
          <div className="space-y-3">
            {homePenaltyShooters.map((shooter, idx) => (
              <PenaltyHeroRow
                key={shooter.id}
                order={idx + 1}
                title={shooter.players?.name ? shooter.players.name : `Jugador ${idx + 1}`}
                subtitle={clubName}
                photoUrl={shooter.players?.photo_url ?? null}
                number={shooter.players?.number ?? null}
                teamLabel="Lanzador"
                result={shooter.scored ? "scored" : "missed"}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No hay lanzadores registrados
          </div>
        )}
      </div>

      {/* Rival */}
      <div className="space-y-3">

        {rivalPenaltyShots.length > 0 ? (
          <div className="space-y-3">
            {rivalPenaltyShots.map((shot, idx) => {
              const result: "scored" | "saved" | "missed" =
                shot.scored ? "scored" : shot.result_type === "saved" ? "saved" : "missed"

              return (
                <PenaltyHeroRow
                  key={shot.id}
                  order={idx + 1}
                  title={`Lanzamiento ${idx + 1}`}
                  subtitle={opponentName}
                  photoUrl={null}
                  number={null}
                  teamLabel="Rival"
                  result={result}
                />
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No hay lanzamientos registrados
          </div>
        )}
      </div>
    </div>
  )
}
