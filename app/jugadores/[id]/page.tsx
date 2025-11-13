"use client"

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import type { Player, MatchStats, Match } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts"

interface MatchStatsWithMatch extends MatchStats {
  matches: Match
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: player, error: playerError } = await supabase.from("players").select("*").eq("id", id).single()

  if (playerError || !player) {
    notFound()
  }

  const { data: matchStats } = await supabase
    .from("match_stats")
    .select(
      `
      *,
      matches (*)
    `,
    )
    .eq("player_id", id)
    .order("matches(match_date)", { ascending: false })

  // Calculate total stats
  const totalStats = calculateTotalStats(matchStats || [], player.is_goalkeeper)

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/jugadores">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Jugadores
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">{player.number}</span>
              </div>
              <div>
                <CardTitle className="text-3xl">{player.name}</CardTitle>
                <p className="text-muted-foreground">{player.is_goalkeeper ? "Portero" : "Jugador de Campo"}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="totals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="totals">Estadísticas Totales</TabsTrigger>
          <TabsTrigger value="matches">Por Partido</TabsTrigger>
          <TabsTrigger value="efficiency">Eficiencia</TabsTrigger>
        </TabsList>

        <TabsContent value="totals">
          <TotalStatsView player={player} stats={totalStats} matchCount={matchStats?.length || 0} />
        </TabsContent>

        <TabsContent value="matches">
          <MatchStatsView matchStats={matchStats || []} player={player} />
        </TabsContent>

        <TabsContent value="efficiency">
          <EfficiencyView player={player} stats={totalStats} />
        </TabsContent>
      </Tabs>
    </main>
  )
}

function calculateTotalStats(stats: any[], isGoalkeeper = false) {
  const baseStats = stats.reduce(
    (acc, stat) => ({
      goles_totales: acc.goles_totales + (stat.goles_totales || 0),
      goles_boya_jugada: acc.goles_boya_jugada + (stat.goles_boya_jugada || 0),
      goles_hombre_mas: acc.goles_hombre_mas + (stat.goles_hombre_mas || 0),
      goles_lanzamiento: acc.goles_lanzamiento + (stat.goles_lanzamiento || 0),
      goles_dir_mas_5m: acc.goles_dir_mas_5m + (stat.goles_dir_mas_5m || 0),
      goles_contraataque: acc.goles_contraataque + (stat.goles_contraataque || 0),
      goles_penalti_anotado: acc.goles_penalti_anotado + (stat.goles_penalti_anotado || 0),

      tiros_totales: acc.tiros_totales + (stat.tiros_totales || 0),
      tiros_hombre_mas: acc.tiros_hombre_mas + (stat.tiros_hombre_mas || 0),
      tiros_penalti_fallado: acc.tiros_penalti_fallado + (stat.tiros_penalti_fallado || 0),
      tiros_corner: acc.tiros_corner + (stat.tiros_corner || 0),
      tiros_fuera: acc.tiros_fuera + (stat.tiros_fuera || 0),
      tiros_parados: acc.tiros_parados + (stat.tiros_parados || 0),
      tiros_bloqueado: acc.tiros_bloqueado + (stat.tiros_bloqueado || 0),

      faltas_exp_20_1c1: acc.faltas_exp_20_1c1 + (stat.faltas_exp_20_1c1 || 0),
      faltas_exp_20_boya: acc.faltas_exp_20_boya + (stat.faltas_exp_20_boya || 0),
      faltas_penalti: acc.faltas_penalti + (stat.faltas_penalti || 0),
      faltas_contrafaltas: acc.faltas_contrafaltas + (stat.faltas_contrafaltas || 0),

      acciones_bloqueo: acc.acciones_bloqueo + (stat.acciones_bloqueo || 0),
      acciones_asistencias: acc.acciones_asistencias + (stat.acciones_asistencias || 0),
      acciones_recuperacion: acc.acciones_recuperacion + (stat.acciones_recuperacion || 0),
      acciones_rebote: acc.acciones_rebote + (stat.acciones_rebote || 0),
      acciones_exp_provocada: acc.acciones_exp_provocada + (stat.acciones_exp_provocada || 0),
      acciones_penalti_provocado: acc.acciones_penalti_provocado + (stat.acciones_penalti_provocado || 0),
      acciones_recibir_gol: acc.acciones_recibir_gol + (stat.acciones_recibir_gol || 0),

      portero_goles_totales: acc.portero_goles_totales + (stat.portero_goles_totales || 0),
      portero_goles_boya: acc.portero_goles_boya + (stat.portero_goles_boya || 0),
      portero_goles_hombre_menos: acc.portero_goles_hombre_menos + (stat.portero_goles_hombre_menos || 0),
      portero_goles_dir_mas_5m: acc.portero_goles_dir_mas_5m + (stat.portero_goles_dir_mas_5m || 0),
      portero_goles_contraataque: acc.portero_goles_contraataque + (stat.portero_goles_contraataque || 0),
      portero_goles_penalti: acc.portero_goles_penalti + (stat.portero_goles_penalti || 0),

      portero_paradas_totales: acc.portero_paradas_totales + (stat.portero_paradas_totales || 0),
      portero_paradas_parada_recup: acc.portero_paradas_parada_recup + (stat.portero_paradas_parada_recup || 0),
      portero_paradas_fuera: acc.portero_paradas_fuera + (stat.portero_paradas_fuera || 0),
      portero_paradas_penalti_parado: acc.portero_paradas_penalti_parado + (stat.portero_paradas_penalti_parado || 0),
      portero_paradas_hombre_menos: acc.portero_paradas_hombre_menos + (stat.portero_paradas_hombre_menos || 0),

      portero_acciones_asistencias: acc.portero_acciones_asistencias + (stat.portero_acciones_asistencias || 0),
      portero_acciones_recuperacion: acc.portero_acciones_recuperacion + (stat.portero_acciones_recuperacion || 0),
      portero_acciones_perdida_pos: acc.portero_acciones_perdida_pos + (stat.portero_acciones_perdida_pos || 0),
      portero_acciones_exp_provocada: acc.portero_acciones_exp_provocada + (stat.portero_acciones_exp_provocada || 0),
    }),
    {
      goles_totales: 0,
      goles_boya_jugada: 0,
      goles_hombre_mas: 0,
      goles_lanzamiento: 0,
      goles_dir_mas_5m: 0,
      goles_contraataque: 0,
      goles_penalti_anotado: 0,

      tiros_totales: 0,
      tiros_hombre_mas: 0,
      tiros_penalti_fallado: 0,
      tiros_corner: 0,
      tiros_fuera: 0,
      tiros_parados: 0,
      tiros_bloqueado: 0,

      faltas_exp_20_1c1: 0,
      faltas_exp_20_boya: 0,
      faltas_penalti: 0,
      faltas_contrafaltas: 0,

      acciones_bloqueo: 0,
      acciones_asistencias: 0,
      acciones_recuperacion: 0,
      acciones_rebote: 0,
      acciones_exp_provocada: 0,
      acciones_penalti_provocado: 0,
      acciones_recibir_gol: 0,

      portero_goles_totales: 0,
      portero_goles_boya: 0,
      portero_goles_hombre_menos: 0,
      portero_goles_dir_mas_5m: 0,
      portero_goles_contraataque: 0,
      portero_goles_penalti: 0,

      portero_paradas_totales: 0,
      portero_paradas_parada_recup: 0,
      portero_paradas_fuera: 0,
      portero_paradas_penalti_parado: 0,
      portero_paradas_hombre_menos: 0,

      portero_acciones_asistencias: 0,
      portero_acciones_recuperacion: 0,
      portero_acciones_perdida_pos: 0,
      portero_acciones_exp_provocada: 0,
    },
  )

  if (isGoalkeeper) {
    const totalRivalGoles = stats.reduce((sum, stat) => {
      const match = stat.matches
      if (!match) return sum
      // If home team, rival goals = away_score; if away team, rival goals = home_score
      const rivalGoals = match.is_home ? match.away_score : match.home_score
      return sum + rivalGoals
    }, 0)

    return {
      ...baseStats,
      portero_rival_goles_totales: totalRivalGoles,
    }
  }

  return baseStats
}

function TotalStatsView({ player, stats, matchCount }: { player: Player; stats: any; matchCount: number }) {
  const golesPerMatch = matchCount > 0 ? (stats.goles_totales / matchCount).toFixed(1) : "0.0"
  const tirosPerMatch = matchCount > 0 ? (stats.tiros_totales / matchCount).toFixed(1) : "0.0"
  const eficiencia = stats.tiros_totales > 0 ? ((stats.goles_totales / stats.tiros_totales) * 100).toFixed(1) : "0.0"

  if (player.is_goalkeeper) {
    const paradasPerMatch = matchCount > 0 ? (stats.portero_paradas_totales / matchCount).toFixed(1) : "0.0"
    const golesRivalPerMatch = matchCount > 0 ? (stats.portero_rival_goles_totales / matchCount).toFixed(1) : "0.0"
    const totalShots = stats.portero_paradas_totales + stats.portero_rival_goles_totales
    const eficienciaPortero = totalShots > 0 ? ((stats.portero_paradas_totales / totalShots) * 100).toFixed(1) : "0.0"

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold">{matchCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Partidos Jugados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{stats.portero_paradas_totales}</p>
                <p className="text-sm text-muted-foreground mt-1">Paradas Totales</p>
                <p className="text-xs text-muted-foreground mt-1">{paradasPerMatch} por partido</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-700 dark:text-green-300">
                  {stats.portero_rival_goles_totales}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Goles Totales</p>
                <p className="text-xs text-muted-foreground mt-1">{golesRivalPerMatch} por partido</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-purple-700 dark:text-purple-300">{eficienciaPortero}%</p>
                <p className="text-sm text-muted-foreground mt-1">Eficiencia</p>
                <p className="text-xs text-muted-foreground mt-1">Paradas / Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <GoalkeeperTotalStats stats={stats} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{matchCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Partidos Jugados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{stats.goles_totales}</p>
              <p className="text-sm text-muted-foreground mt-1">Goles Totales</p>
              <p className="text-xs text-muted-foreground mt-1">{golesPerMatch} por partido</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-700 dark:text-green-300">{stats.tiros_totales}</p>
              <p className="text-sm text-muted-foreground mt-1">Tiros Totales</p>
              <p className="text-xs text-muted-foreground mt-1">{tirosPerMatch} por partido</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-700 dark:text-purple-300">{eficiencia}%</p>
              <p className="text-sm text-muted-foreground mt-1">Eficiencia</p>
              <p className="text-xs text-muted-foreground mt-1">Goles / Tiros</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <FieldPlayerTotalStats stats={stats} />
    </div>
  )
}

function FieldPlayerTotalStats({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      {/* Goals Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desglose de Goles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Boya/Jugada" value={stats.goles_boya_jugada} />
            <StatItem label="Hombre +" value={stats.goles_hombre_mas} />
            <StatItem label="Lanzamiento" value={stats.goles_lanzamiento} />
            <StatItem label="Dir +5m" value={stats.goles_dir_mas_5m} />
            <StatItem label="Contraataque" value={stats.goles_contraataque} />
            <StatItem label="Penalti Anotado" value={stats.goles_penalti_anotado} />
          </div>
        </CardContent>
      </Card>

      {/* Shots Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desglose de Tiros (Fallados)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Penalti Fallado" value={stats.tiros_penalti_fallado} />
            <StatItem label="Corner" value={stats.tiros_corner} />
            <StatItem label="Fuera" value={stats.tiros_fuera} />
            <StatItem label="Parados" value={stats.tiros_parados} />
            <StatItem label="Bloqueados" value={stats.tiros_bloqueado} />
          </div>
        </CardContent>
      </Card>

      {/* Fouls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Faltas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Exp 20\" value={stats.faltas_exp_20_1c1} />
            <StatItem label="Exp 20 Boya" value={stats.faltas_exp_20_boya} />
            <StatItem label="Penalti" value={stats.faltas_penalti} />
            <StatItem label="Contrafaltas" value={stats.faltas_contrafaltas} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Bloqueo" value={stats.acciones_bloqueo} />
            <StatItem label="Asistencias" value={stats.acciones_asistencias} />
            <StatItem label="Recuperación" value={stats.acciones_recuperacion} />
            <StatItem label="Rebote" value={stats.acciones_rebote} />
            <StatItem label="Exp Provocada" value={stats.acciones_exp_provocada} />
            <StatItem label="Penalti Provocado" value={stats.acciones_penalti_provocado} />
            <StatItem label="Recibe Gol" value={stats.acciones_recibir_gol} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GoalkeeperTotalStats({ stats }: { stats: any }) {
  const savePercentage =
    stats.portero_paradas_totales + stats.portero_goles_totales > 0
      ? ((stats.portero_paradas_totales / (stats.portero_paradas_totales + stats.portero_goles_totales)) * 100).toFixed(
          1,
        )
      : "0.0"

  return (
    <div className="space-y-6">
      {/* Goalkeeper Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de Portero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Paradas" value={stats.portero_paradas_totales} />
            <StatItem label="Goles Recibidos" value={stats.portero_goles_totales} />
            <StatItem label="% Paradas" value={`${savePercentage}%`} />
            <StatItem label="Penalti Parado" value={stats.portero_paradas_penalti_parado} />
          </div>
        </CardContent>
      </Card>

      {/* Goals Conceded */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Goles Encajados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Boya" value={stats.portero_goles_boya} />
            <StatItem label="Hombre -" value={stats.portero_goles_hombre_menos} />
            <StatItem label="Dir +5m" value={stats.portero_goles_dir_mas_5m} />
            <StatItem label="Contraataque" value={stats.portero_goles_contraataque} />
            <StatItem label="Penalti" value={stats.portero_goles_penalti} />
          </div>
        </CardContent>
      </Card>

      {/* Saves */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Parada Recup" value={stats.portero_paradas_parada_recup} />
            <StatItem label="Parada Fuera" value={stats.portero_paradas_fuera} />
            <StatItem label="Penalti Parado" value={stats.portero_paradas_penalti_parado} />
            <StatItem label="Parada Hombre -" value={stats.portero_paradas_hombre_menos} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Asistencias" value={stats.portero_acciones_asistencias} />
            <StatItem label="Recuperación" value={stats.portero_acciones_recuperacion} />
            <StatItem label="Pérdida de Pos" value={stats.portero_acciones_perdida_pos} />
            <StatItem label="Exp Provocada" value={stats.portero_acciones_exp_provocada} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center p-4 bg-muted rounded-lg">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function MatchStatsView({ matchStats, player }: { matchStats: MatchStatsWithMatch[]; player: Player }) {
  if (matchStats.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No hay estadísticas de partidos registradas</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {matchStats.map((stat) => (
        <Card key={stat.id}>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <CardTitle className="text-lg">CN Sant Andreu vs {stat.matches.opponent}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(stat.matches.match_date).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {stat.matches.home_score} - {stat.matches.away_score}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/partidos/${stat.matches.id}`}>Ver Partido</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{stat.goles_totales}</p>
                <p className="text-xs text-muted-foreground">Goles</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{stat.tiros_totales}</p>
                <p className="text-xs text-muted-foreground">Tiros</p>
              </div>
              <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{stat.acciones_asistencias}</p>
                <p className="text-xs text-muted-foreground">Asistencias</p>
              </div>
              {player.is_goalkeeper ? (
                <>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">{stat.tiros_parados}</p>
                    <p className="text-xs text-muted-foreground">Paradas</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">{stat.portero_recibir_gol}</p>
                    <p className="text-xs text-muted-foreground">Goles Recibidos</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">{stat.acciones_bloqueo}</p>
                    <p className="text-xs text-muted-foreground">Bloqueos</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold">{stat.acciones_recuperacion}</p>
                    <p className="text-xs text-muted-foreground">Recuperaciones</p>
                  </div>
                </>
              )}
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xl font-bold">
                  {stat.tiros_totales > 0 ? ((stat.goles_totales / stat.tiros_totales) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Eficiencia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EfficiencyView({ player, stats }: { player: Player; stats: any }) {
  if (player.is_goalkeeper) {
    return <GoalkeeperEfficiencyView stats={stats} />
  }

  const overallEfficiency =
    stats.tiros_totales > 0 ? ((stats.goles_totales / stats.tiros_totales) * 100).toFixed(1) : "0.0"

  const categories = [
    { name: "Boya/Jugada", goles: stats.goles_boya_jugada, tiros: stats.goles_boya_jugada },
    { name: "Hombre +", goles: stats.goles_hombre_mas, tiros: stats.goles_hombre_mas + stats.tiros_hombre_mas },
    { name: "Lanzamiento", goles: stats.goles_lanzamiento, tiros: stats.goles_lanzamiento },
    { name: "Dir +5m", goles: stats.goles_dir_mas_5m, tiros: stats.goles_dir_mas_5m },
    { name: "Contraataque", goles: stats.goles_contraataque, tiros: stats.goles_contraataque },
    {
      name: "Penalti",
      goles: stats.goles_penalti_anotado,
      tiros: stats.goles_penalti_anotado + stats.tiros_penalti_fallado,
    },
  ]

  const chartColors = [
    "hsl(200 80% 50%)", // Blue for goals
    "hsl(0 70% 60%)", // Red for misses
    "hsl(160 70% 50%)", // Teal
    "hsl(280 70% 60%)", // Purple
    "hsl(40 90% 55%)", // Orange
  ]

  // Overall efficiency donut data with distinct colors
  const overallData = [
    { name: "Goles", value: stats.goles_totales, fill: chartColors[0] },
    { name: "Fallados", value: stats.tiros_totales - stats.goles_totales, fill: chartColors[1] },
  ]

  const overallConfig = {
    goles: { label: "Goles", color: chartColors[0] },
    fallados: { label: "Fallados", color: chartColors[1] },
  }

  return (
    <div className="space-y-6">
      {/* Overall Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle>Eficiencia General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col items-center justify-center">
              <ChartContainer config={overallConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={overallData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {overallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-4">
              <div className="text-center md:text-left">
                <p className="text-5xl font-bold text-primary">{overallEfficiency}%</p>
                <p className="text-muted-foreground mt-2">Eficiencia Total</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.goles_totales}</p>
                  <p className="text-sm text-muted-foreground">Goles</p>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.tiros_totales - stats.goles_totales}
                  </p>
                  <p className="text-sm text-muted-foreground">Fallados</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Efficiency by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Eficiencia por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => {
              const efficiency = category.tiros > 0 ? ((category.goles / category.tiros) * 100).toFixed(1) : "0.0"

              const categoryData = [
                { name: "Goles", value: category.goles, fill: chartColors[0] },
                { name: "Fallados", value: category.tiros - category.goles, fill: chartColors[1] },
              ]

              const categoryConfig = {
                goles: { label: "Goles", color: chartColors[0] },
                fallados: { label: "Fallados", color: chartColors[1] },
              }

              if (category.tiros === 0) return null

              return (
                <Card key={category.name} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={categoryConfig} className="h-[180px] w-full">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {categoryData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                    <div className="text-center mt-2">
                      <p className="text-2xl font-bold text-primary">{efficiency}%</p>
                      <p className="text-xs text-muted-foreground">
                        {category.goles} / {category.tiros} tiros
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GoalkeeperEfficiencyView({ stats }: { stats: any }) {
  const chartColors = [
    "hsl(160 70% 50%)", // Teal for saves
    "hsl(0 70% 60%)", // Red for goals conceded
    "hsl(200 80% 50%)", // Blue
    "hsl(280 70% 60%)", // Purple
  ]

  const totalRivalGoles = stats.portero_rival_goles_totales || stats.portero_goles_totales

  return (
    <div className="space-y-6">
      {/* Goalkeeper Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle>Eficiencia de Portero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {(() => {
              const totalShots = stats.portero_paradas_totales + totalRivalGoles
              const savePercentage =
                totalShots > 0 ? ((stats.portero_paradas_totales / totalShots) * 100).toFixed(1) : "0.0"

              const goalkeeperData = [
                { name: "Paradas", value: stats.portero_paradas_totales, fill: chartColors[0] },
                { name: "Goles Recibidos", value: totalRivalGoles, fill: chartColors[1] },
              ]

              const goalkeeperConfig = {
                paradas: { label: "Paradas", color: chartColors[0] },
                recibidos: { label: "Goles Recibidos", color: chartColors[1] },
              }

              return (
                <>
                  <div className="flex flex-col items-center justify-center">
                    <ChartContainer config={goalkeeperConfig} className="h-[250px] w-full">
                      <PieChart>
                        <Pie
                          data={goalkeeperData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                        >
                          {goalkeeperData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                  <div className="space-y-4">
                    <div className="text-center md:text-left">
                      <p className="text-5xl font-bold text-primary">{savePercentage}%</p>
                      <p className="text-muted-foreground mt-2">Porcentaje de Paradas</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-teal-500/10 rounded-lg">
                        <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                          {stats.portero_paradas_totales}
                        </p>
                        <p className="text-sm text-muted-foreground">Paradas</p>
                      </div>
                      <div className="text-center p-4 bg-red-500/10 rounded-lg">
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">{totalRivalGoles}</p>
                        <p className="text-sm text-muted-foreground">Recibidos</p>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>

          {/* Penalty Efficiency */}
          {(stats.portero_paradas_penalti_parado > 0 || stats.portero_goles_penalti > 0) && (
            <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
              {(() => {
                const penaltyTotal = stats.portero_paradas_penalti_parado + stats.portero_goles_penalti
                const penaltyPercentage =
                  penaltyTotal > 0 ? ((stats.portero_paradas_penalti_parado / penaltyTotal) * 100).toFixed(1) : "0.0"

                const penaltyData = [
                  { name: "Penaltis Parados", value: stats.portero_paradas_penalti_parado, fill: chartColors[0] },
                  { name: "Penaltis Encajados", value: stats.portero_goles_penalti, fill: chartColors[1] },
                ]

                const penaltyConfig = {
                  parados: { label: "Penaltis Parados", color: chartColors[0] },
                  encajados: { label: "Penaltis Encajados", color: chartColors[1] },
                }

                return (
                  <>
                    <div className="flex flex-col items-center justify-center">
                      <ChartContainer config={penaltyConfig} className="h-[250px] w-full">
                        <PieChart>
                          <Pie
                            data={penaltyData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                          >
                            {penaltyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                    </div>
                    <div className="space-y-4">
                      <div className="text-center md:text-left">
                        <p className="text-5xl font-bold text-primary">{penaltyPercentage}%</p>
                        <p className="text-muted-foreground mt-2">Eficiencia en Penaltis</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-teal-500/10 rounded-lg">
                          <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                            {stats.portero_paradas_penalti_parado}
                          </p>
                          <p className="text-sm text-muted-foreground">Parados</p>
                        </div>
                        <div className="text-center p-4 bg-red-500/10 rounded-lg">
                          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {stats.portero_goles_penalti}
                          </p>
                          <p className="text-sm text-muted-foreground">Encajados</p>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
