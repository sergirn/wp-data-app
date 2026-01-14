import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { LucideIcon } from "lucide-react"

interface PlayerStatCardProps {
  title: string
  icon: LucideIcon
  player: {
    id: number
    name: string
    number: number
    photo_url?: string
  }
  statLabel: string
  statValue: string | number
  details?: Array<{ label: string; value: string | number }>
}

export function PlayerStatCard({ title, icon: Icon, player, statLabel, statValue, details = [] }: PlayerStatCardProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground overflow-hidden">
      {/* Header */}
      <div className="border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
      </div>

      {/* Player Card */}
      <div className="p-4">
        <Link href={`/jugadores/${player.id}`} className="block">
          <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br opacity-[0.10] dark:opacity-[0.14]" />
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-foreground/5 blur-2xl pointer-events-none" />

            <div className="relative flex items-stretch">
              {/* FOTO IZQUIERDA */}
              <div className="relative w-[32%] sm:w-[28%] min-w-[90px] overflow-hidden bg-muted">
                {player.photo_url ? (
                  <img
                    src={player.photo_url || "/placeholder.svg"}
                    alt={player.name}
                    className="h-full w-full object-cover object-top group-hover:scale-[1.03] transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center">
                    <span className="font-extrabold text-muted-foreground">#{player.number}</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/85 dark:to-background/75 pointer-events-none" />

                <div className="absolute top-2 left-2 rounded-md bg-background/70 px-2 py-0.5 text-[10px] text-foreground/80 backdrop-blur-sm border border-border/60">
                  #{player.number}
                </div>
              </div>

              {/* INFO DERECHA */}
              <div className="flex-1 min-w-0 p-3">
                <p className="text-xs font-medium text-muted-foreground truncate mb-1">{statLabel}</p>

                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold truncate">{player.name}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {statValue}
                  </Badge>
                </div>

                {/* MINI STATS */}
                {details.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {details.slice(0, 4).map((d, idx) => (
                      <div key={idx} className="rounded-lg border bg-background/40 px-2 py-1.5">
                        <p className="text-[10px] text-muted-foreground leading-none">{d.label}</p>
                        <p className="text-xs font-semibold leading-tight">{d.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
