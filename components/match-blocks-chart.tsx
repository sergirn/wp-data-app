"use client"

import { useMemo } from "react"
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"

type BlocksStats = {
  bloqueos: number
  golesRecibidos: number
  eficacia: number // (no nos fiamos, recalculamos)
}

// Ajusta el tipo a tu MatchStats real si lo tienes tipado
type MatchStatRow = {
  id?: number
  acciones_bloqueo?: number | null
  players: {
    id: number
    name: string
    number?: number | null
    photo_url?: string | null
  }
}

export function MatchBlocksChart({
  stats,
  matchStats,
  clubName = "Equipo",
}: {
  stats: BlocksStats
  matchStats: MatchStatRow[]
  clubName?: string
}) {
  const computed = useMemo(() => {
    const bloqueos = stats?.bloqueos ?? 0
    const golesRecibidos = stats?.golesRecibidos ?? 0
    const total = bloqueos + golesRecibidos
    const eficacia = total > 0 ? Math.round((bloqueos / total) * 1000) / 10 : 0

    const playersWithBlocks = (matchStats ?? [])
      .filter((s) => (s.acciones_bloqueo ?? 0) > 0)
      .sort((a, b) => (b.acciones_bloqueo ?? 0) - (a.acciones_bloqueo ?? 0))

    return {
      bloqueos,
      golesRecibidos,
      total,
      eficacia,
      playersWithBlocks,
      playersCount: playersWithBlocks.length,
    }
  }, [stats, matchStats])

  if (!stats) return null

  return (
    <ExpandableChartCard
      title="Bloqueos"
      description="Detalle del partido"
      icon={<Shield className="h-5 w-5" />}
      className="from-transparent"
      rightHeader={<span className="text-xs text-muted-foreground">{computed.eficacia}%</span>}
      renderChart={({ compact }) => (
        <div className="w-full">
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {/* Pie */}
            <div className={`${compact ? "h-[220px]" : "h-[320px]"} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Bloqueos", value: computed.bloqueos },
                      { name: "Goles", value: computed.golesRecibidos },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={compact ? 85 : 110}
                    dataKey="value"
                  >
                  <Cell fill="#3a6bbbc4" />
                  <Cell fill="#ac2020c7" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* ✅ Preview “clean”: sin números grandes ni tarjetas */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="bg-muted/30">
                  Total: <span className="ml-1 font-semibold text-foreground">{computed.total}</span>
                </Badge>
                <Badge variant="outline" className="bg-muted/30">
                  Jugadores:{" "}
                  <span className="ml-1 font-semibold text-foreground">{computed.playersCount}</span>
                </Badge>
              </div>

              {/* Si quieres, esto ayuda al usuario */}
              {/* <p className="text-xs text-muted-foreground">Pulsa para ver detalle</p> */}
            </div>
          </div>
        </div>
      )}
      renderTable={() => (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Header detalle */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Detalle de Bloqueos</p>
              <p className="text-xs text-muted-foreground">
                Eficacia recalculada · {computed.bloqueos}/{computed.total} · {computed.eficacia}%
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30">
                Bloqueos: <span className="ml-1 font-semibold text-foreground">{computed.bloqueos}</span>
              </Badge>
              <Badge variant="outline" className="bg-muted/30">
                Goles: <span className="ml-1 font-semibold text-foreground">{computed.golesRecibidos}</span>
              </Badge>
              <Badge variant="outline" className="bg-muted/30">
                Jugadores: <span className="ml-1 font-semibold text-foreground">{computed.playersCount}</span>
              </Badge>
            </div>
          </div>

          {/* Listado jugadores con bloqueos */}
          <div className="p-4">
            {computed.playersWithBlocks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {computed.playersWithBlocks.map((stat) => {
                  const player = stat.players
                  const blocks = stat.acciones_bloqueo ?? 0

                  return (
                    <div
                      key={stat.id ?? player.id}
                      className="p-3 rounded-lg border bg-background/60 hover:bg-background/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={player.name}
                              className="w-full h-full object-cover object-top"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <span className="font-bold tabular-nums">{player.number ?? "—"}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {player.number != null ? `#${player.number} · ` : ""}
                            {player.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{clubName}</p>
                        </div>

                        <Badge
                          variant="outline"
                          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {blocks}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No hay bloqueos registrados en este partido</p>
              </div>
            )}
          </div>
        </div>
      )}
    />
  )
}
