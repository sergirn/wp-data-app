"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Activity,
  AlertTriangle,
  Award,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface GeneralDashboardProps {
  matches: any[]
  stats: any[]
  players: any[]
}

export function GeneralDashboard({ matches, stats, players }: GeneralDashboardProps) {
  const analytics = useMemo(() => {
    const totalMatches = matches?.length ?? 0
    if (totalMatches === 0) return null

    // ===== Totales globales =====
    const totalGoalsFor = (stats ?? []).reduce((sum, s) => sum + (s.goles_totales || 0), 0)
    const totalGoalsAgainst = (matches ?? []).reduce((sum, m) => sum + (m.away_score || 0), 0)
    const totalShots = (stats ?? []).reduce((sum, s) => sum + (s.tiros_totales || 0), 0)
    const totalAssists = (stats ?? []).reduce((sum, s) => sum + (s.acciones_asistencias || 0), 0)
    const totalBlocks = (stats ?? []).reduce((sum, s) => sum + (s.acciones_bloqueo || 0), 0)
    const totalRecoveries = (stats ?? []).reduce((sum, s) => sum + (s.acciones_recuperacion || 0), 0)
    const totalTurnovers = (stats ?? []).reduce((sum, s) => sum + (s.acciones_perdida_poco || 0), 0)

    // Superioridad
    const goalsSuperiority = (stats ?? []).reduce((sum, s) => sum + (s.goles_hombre_mas || 0), 0)
    const shotsSuperiority = (stats ?? []).reduce((sum, s) => sum + (s.tiros_hombre_mas || 0), 0)

    // Inferioridad (porteros)
    const goalkeeperStats = (stats ?? []).filter((s) => {
      const player = (players ?? []).find((p) => p.id === s.player_id)
      return player?.is_goalkeeper
    })
    const savesInferiority = goalkeeperStats.reduce((sum, s) => sum + (s.portero_paradas_hombre_menos || 0), 0)
    const goalsAgainstInferiority = goalkeeperStats.reduce((sum, s) => sum + (s.portero_goles_hombre_menos || 0), 0)
    const totalShotsInferiority = savesInferiority + goalsAgainstInferiority

    // Faltas
    const totalFouls = (stats ?? []).reduce(
      (sum, s) =>
        sum +
        (s.faltas_contrafaltas || 0) +
        (s.faltas_exp_20_1c1 || 0) +
        (s.faltas_exp_20_boya || 0) +
        (s.faltas_exp_3_bruta || 0) +
        (s.faltas_exp_3_int || 0),
      0
    )

    const exclusions = (stats ?? []).reduce(
      (sum, s) =>
        sum +
        (s.faltas_exp_20_1c1 || 0) +
        (s.faltas_exp_20_boya || 0) +
        (s.faltas_exp_3_bruta || 0),
      0
    )

    // Porteros (global)
    const totalSaves = goalkeeperStats.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0)
    const totalShotsAgainst = totalSaves + totalGoalsAgainst

    // Eficiencias
    const shootingEfficiency = totalShots > 0 ? ((totalGoalsFor / totalShots) * 100).toFixed(1) : "0.0"
    const superiorityEfficiency = shotsSuperiority > 0 ? ((goalsSuperiority / shotsSuperiority) * 100).toFixed(1) : "0.0"
    const inferiorityEfficiency = totalShotsInferiority > 0 ? ((savesInferiority / totalShotsInferiority) * 100).toFixed(1) : "0.0"
    const goalkeeperEfficiency = totalShotsAgainst > 0 ? ((totalSaves / totalShotsAgainst) * 100).toFixed(1) : "0.0"

    // Medias por partido
    const avgGoalsFor = (totalGoalsFor / totalMatches).toFixed(1)
    const avgGoalsAgainst = (totalGoalsAgainst / totalMatches).toFixed(1)
    const avgShots = (totalShots / totalMatches).toFixed(1)
    const avgAssists = (totalAssists / totalMatches).toFixed(1)
    const avgBlocks = (totalBlocks / totalMatches).toFixed(1)
    const avgFouls = (totalFouls / totalMatches).toFixed(1)

    // Diferencia de goles
    const goalDifference = totalGoalsFor - totalGoalsAgainst

    return {
      totalMatches,

      shootingEfficiency,
      superiorityEfficiency,
      inferiorityEfficiency,
      goalkeeperEfficiency,

      avgGoalsFor,
      avgGoalsAgainst,
      avgShots,
      avgAssists,
      avgBlocks,
      avgFouls,

      goalDifference,

      totalGoalsFor,
      totalGoalsAgainst,
      totalShots,
      totalAssists,
      totalBlocks,
      totalRecoveries,
      totalTurnovers,
      totalFouls,
      exclusions,
      totalSaves,
      goalsSuperiority,
      shotsSuperiority,
      savesInferiority,
      goalsAgainstInferiority,
    }
  }, [matches, stats, players])

  if (!analytics) {
    return <div className="text-center py-10 text-sm text-muted-foreground">No hay datos disponibles para mostrar estadísticas.</div>
  }

  const gd = analytics.goalDifference
  const gdBadge =
    gd > 0 ? "bg-green-500 text-white" : gd < 0 ? "bg-red-500 text-white" : "bg-muted text-foreground"

  const MetricCard = ({
    title,
    icon,
    value,
    unit,
    subline,
    accent = "blue",
  }: {
    title: string
    icon: React.ReactNode
    value: string | number
    unit?: string
    subline?: string
    accent?: "blue" | "green" | "orange" | "purple"
  }) => {
    const accentMap = {
      blue: "from-blue-500/15 to-cyan-500/10",
      green: "from-green-500/15 to-emerald-500/10",
      orange: "from-orange-500/15 to-amber-500/10",
      purple: "from-purple-500/15 to-fuchsia-500/10",
    }[accent]

    const ringMap = {
      blue: "ring-blue-500/15",
      green: "ring-green-500/15",
      orange: "ring-orange-500/15",
      purple: "ring-purple-500/15",
    }[accent]

    return (
      <Card className={`relative overflow-hidden ring-1 ${ringMap}`}>
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentMap}`} />
        <CardHeader className="relative pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground/90">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background/70 ring-1 ring-border">
              {icon}
            </span>
            <span className="truncate">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-end gap-1.5">
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            {unit ? <div className="pb-1 text-sm font-medium text-muted-foreground">{unit}</div> : null}
          </div>
          {subline ? <p className="mt-1 text-xs text-muted-foreground">{subline}</p> : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ===== Header mini (contexto) ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">
            Indicadores clave y tendencias del equipo · {analytics.totalMatches} partidos
          </p>
        </div>
      </div>

      {/* ===== KPIs (Eficiencias) ===== */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Eficiencia de tiro"
          icon={<Target className="h-4 w-4 text-blue-600 dark:text-blue-300" />}
          value={analytics.shootingEfficiency}
          unit="%"
          subline={`${analytics.totalGoalsFor} goles / ${analytics.totalShots} tiros`}
          accent="blue"
        />

        <MetricCard
          title="Superioridad"
          icon={<TrendingUp className="h-4 w-4 text-green-600 dark:text-green-300" />}
          value={analytics.superiorityEfficiency}
          unit="%"
          subline={`${analytics.goalsSuperiority} goles / ${analytics.shotsSuperiority} tiros`}
          accent="green"
        />

        <MetricCard
          title="Inferioridad"
          icon={<TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-300" />}
          value={analytics.inferiorityEfficiency}
          unit="%"
          subline={`${analytics.savesInferiority} paradas / ${analytics.savesInferiority + analytics.goalsAgainstInferiority} tiros`}
          accent="orange"
        />

        <MetricCard
          title="Eficiencia porteros"
          icon={<Shield className="h-4 w-4 text-purple-600 dark:text-purple-300" />}
          value={analytics.goalkeeperEfficiency}
          unit="%"
          subline={`${analytics.totalSaves} paradas totales`}
          accent="purple"
        />
      </div>

      {/* ===== Medias por partido (más “card-like”) ===== */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Medias por Partido
          </CardTitle>
          <CardDescription>Valores medios para comparar consistencia entre jornadas</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border bg-card p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.avgGoalsFor}</div>
              <p className="text-xs text-muted-foreground">Goles a favor</p>
            </div>

            <div className="rounded-lg border bg-card p-3 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.avgGoalsAgainst}</div>
              <p className="text-xs text-muted-foreground">Goles en contra</p>
            </div>

            <div className="rounded-lg border bg-card p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{analytics.avgShots}</div>
              <p className="text-xs text-muted-foreground">Tiros</p>
            </div>

            <div className="rounded-lg border bg-card p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.avgAssists}</div>
              <p className="text-xs text-muted-foreground">Asistencias</p>
            </div>

            <div className="rounded-lg border bg-card p-3 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.avgBlocks}</div>
              <p className="text-xs text-muted-foreground">Bloqueos</p>
            </div>

            <div className="rounded-lg border bg-card p-3 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analytics.avgFouls}</div>
              <p className="text-xs text-muted-foreground">Faltas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
