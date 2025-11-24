import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import type { Player, MatchStats, Match } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "./chartSection"
import { PerformanceEvolutionChart } from "./performance-evolution-chart"

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

  if (player.is_goalkeeper) {
    return <GoalkeeperPage player={player} matchStats={matchStats || []} />
  }

  // Calculate total stats for field players
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
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                {player.photo_url ? (
                  <img
                    src={player.photo_url || "/placeholder.svg"}
                    alt={player.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="text-primary-foreground font-bold text-2xl">{player.number}</span>
                )}
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
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="totals">Estadísticas Totales</TabsTrigger>
          <TabsTrigger value="evolution">Evolución</TabsTrigger>
          <TabsTrigger value="matches">Por Partido</TabsTrigger>
          <TabsTrigger value="efficiency">Eficiencia</TabsTrigger>
        </TabsList>

        <TabsContent value="totals">
          <TotalStatsView player={player} stats={totalStats} matchCount={matchStats?.length || 0} />
        </TabsContent>

        <TabsContent value="evolution">
          <PerformanceEvolutionChart matchStats={matchStats || []} player={player} />
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

function GoalkeeperPage({ player, matchStats }: { player: Player; matchStats: MatchStatsWithMatch[] }) {
  const matchCount = matchStats.length
  const goalkeeperStats = calculateGoalkeeperStats(matchStats)

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
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                {player.photo_url ? (
                  <img
                    src={player.photo_url || "/placeholder.svg"}
                    alt={player.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="text-primary-foreground font-bold text-2xl">{player.number}</span>
                )}
              </div>
              <div>
                <CardTitle className="text-3xl">{player.name}</CardTitle>
                <p className="text-muted-foreground">Portero</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="categorias">Por Categorías</TabsTrigger>
          <TabsTrigger value="evolucion">Evolución</TabsTrigger>
          <TabsTrigger value="partidos">Por Partido</TabsTrigger>
          <TabsTrigger value="eficiencia">Eficiencia</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <GoalkeeperSummary stats={goalkeeperStats} matchCount={matchCount} />
        </TabsContent>

        <TabsContent value="categorias">
          <GoalkeeperCategoriesStats stats={goalkeeperStats} />
        </TabsContent>

        <TabsContent value="evolucion">
          <GoalkeeperEvolutionChart matchStats={matchStats} />
        </TabsContent>

        <TabsContent value="partidos">
          <GoalkeeperMatchStats matchStats={matchStats} player={player} />
        </TabsContent>

        <TabsContent value="eficiencia">
          <GoalkeeperAdvancedEfficiency stats={goalkeeperStats} />
        </TabsContent>
      </Tabs>
    </main>
  )
}

function calculateGoalkeeperStats(matchStats: MatchStatsWithMatch[]) {
  return matchStats.reduce(
    (acc, stat) => {
      return {
        // Goles encajados - Using exact DB field names
        portero_goles_boya_parada: acc.portero_goles_boya_parada + (stat.portero_goles_boya_parada || 0),
        portero_goles_hombre_menos: acc.portero_goles_hombre_menos + (stat.portero_goles_hombre_menos || 0),
        portero_goles_dir_mas_5m: acc.portero_goles_dir_mas_5m + (stat.portero_goles_dir_mas_5m || 0),
        portero_goles_contraataque: acc.portero_goles_contraataque + (stat.portero_goles_contraataque || 0),
        portero_goles_penalti: acc.portero_goles_penalti + (stat.portero_goles_penalti || 0),
        portero_goles_lanzamiento: acc.portero_goles_lanzamiento + (stat.portero_goles_lanzamiento || 0),
        portero_goles_penalti_encajado: acc.portero_goles_penalti_encajado + (stat.portero_goles_penalti_encajado || 0),
        portero_goles_totales: acc.portero_goles_totales + (stat.portero_goles_totales || 0),
        portero_goles_boya: acc.portero_goles_boya + (stat.portero_goles_boya || 0),

        // Paradas - Using exact DB field names from nuevo-partido
        portero_paradas_totales: acc.portero_paradas_totales + (stat.portero_paradas_totales || 0),
        portero_tiros_parada_recup: acc.portero_tiros_parada_recup + (stat.portero_tiros_parada_recup || 0),
        portero_paradas_fuera: acc.portero_paradas_fuera + (stat.portero_paradas_fuera || 0),
        portero_paradas_penalti_parado: acc.portero_paradas_penalti_parado + (stat.portero_paradas_penalti_parado || 0),
        portero_paradas_hombre_menos: acc.portero_paradas_hombre_menos + (stat.portero_paradas_hombre_menos || 0),
        portero_paradas_parada_fuera: acc.portero_paradas_parada_fuera + (stat.portero_paradas_parada_fuera || 0),
        portero_paradas_pedida: acc.portero_paradas_pedida + (stat.portero_paradas_pedida || 0),
        portero_tiros_parado: acc.portero_tiros_parado + (stat.portero_tiros_parado || 0),

        // Acciones
        portero_acciones_asistencias: acc.portero_acciones_asistencias + (stat.portero_acciones_asistencias || 0),
        portero_acciones_recuperacion: acc.portero_acciones_recuperacion + (stat.portero_acciones_recuperacion || 0),
        portero_acciones_rebote: acc.portero_acciones_rebote + (stat.portero_acciones_rebote || 0),
        portero_acciones_perdida_pos: acc.portero_acciones_perdida_pos + (stat.portero_acciones_perdida_pos || 0),
        portero_acciones_gol_recibido: acc.portero_acciones_gol_recibido + (stat.portero_acciones_gol_recibido || 0),
        portero_acciones_exp_provocada: acc.portero_acciones_exp_provocada + (stat.portero_acciones_exp_provocada || 0),
        portero_exp_provocada: acc.portero_exp_provocada + (stat.portero_exp_provocada || 0),
        portero_penalti_provocado: acc.portero_penalti_provocado + (stat.portero_penalti_provocado || 0),
        portero_recibir_gol: acc.portero_recibir_gol + (stat.portero_recibir_gol || 0),

        // Faltas
        portero_faltas_exp_3_int: acc.portero_faltas_exp_3_int + (stat.portero_faltas_exp_3_int || 0),
      }
    },
    {
      portero_goles_boya_parada: 0,
      portero_goles_hombre_menos: 0,
      portero_goles_dir_mas_5m: 0,
      portero_goles_contraataque: 0,
      portero_goles_penalti: 0,
      portero_goles_lanzamiento: 0,
      portero_goles_penalti_encajado: 0,
      portero_goles_totales: 0,
      portero_goles_boya: 0,
      portero_paradas_totales: 0,
      portero_tiros_parada_recup: 0,
      portero_paradas_fuera: 0,
      portero_paradas_penalti_parado: 0,
      portero_paradas_hombre_menos: 0,
      portero_paradas_parada_fuera: 0,
      portero_paradas_pedida: 0,
      portero_tiros_parado: 0,
      portero_acciones_asistencias: 0,
      portero_acciones_recuperacion: 0,
      portero_acciones_rebote: 0,
      portero_acciones_perdida_pos: 0,
      portero_acciones_gol_recibido: 0,
      portero_acciones_exp_provocada: 0,
      portero_exp_provocada: 0,
      portero_penalti_provocado: 0,
      portero_recibir_gol: 0,
      portero_faltas_exp_3_int: 0,
    },
  )
}

function GoalkeeperSummary({ stats, matchCount }: { stats: any; matchCount: number }) {
  const totalSaves = stats.portero_paradas_totales
  const totalGoalsReceived = stats.portero_goles_totales
  const savePercentage =
    totalSaves + totalGoalsReceived > 0 ? ((totalSaves / (totalSaves + totalGoalsReceived)) * 100).toFixed(1) : "0.0"

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Resumen Global</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partidos Jugados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{matchCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paradas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{totalSaves}</p>
            <p className="text-sm text-muted-foreground">
              Promedio: {matchCount > 0 ? (totalSaves / matchCount).toFixed(1) : 0} por partido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Goles Recibidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{totalGoalsReceived}</p>
            <p className="text-sm text-muted-foreground">
              Promedio: {matchCount > 0 ? (totalGoalsReceived / matchCount).toFixed(1) : 0} por partido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% de Paradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{savePercentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Asistencias</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.portero_acciones_asistencias}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recuperaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.portero_acciones_recuperacion}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GoalkeeperCategoriesStats({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Totales por Categorías</h2>

      {/* Goles Encajados */}
      <Card>
        <CardHeader>
          <CardTitle>Goles Encajados por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatItem label="Boya con Parada" value={stats.portero_goles_boya_parada} />
            <StatItem label="Hombre Menos" value={stats.portero_goles_hombre_menos} />
            <StatItem label="Dir. +5m" value={stats.portero_goles_dir_mas_5m} />
            <StatItem label="Contraataque" value={stats.portero_goles_contraataque} />
            <StatItem label="Penalti" value={stats.portero_goles_penalti} />
            <StatItem label="Lanzamiento" value={stats.portero_goles_lanzamiento} />
          </div>
        </CardContent>
      </Card>

      {/* Paradas */}
      <Card>
        <CardHeader>
          <CardTitle>Paradas por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatItem label="Parada Recup." value={stats.portero_tiros_parada_recup} />
            <StatItem label="Fuera" value={stats.portero_paradas_fuera} />
            <StatItem label="Penalti Parado" value={stats.portero_paradas_penalti_parado} />
            <StatItem label="Hombre Menos" value={stats.portero_paradas_hombre_menos} />
            <StatItem label="Parada Fuera" value={stats.portero_paradas_parada_fuera} />
            <StatItem label="Perdida" value={stats.portero_paradas_pedida} />
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatItem label="Asistencias" value={stats.portero_acciones_asistencias} />
            <StatItem label="Recuperaciones" value={stats.portero_acciones_recuperacion} />
            <StatItem label="Rebotes" value={stats.portero_acciones_rebote} />
            <StatItem label="Pérdidas Pos." value={stats.portero_acciones_perdida_pos} />
            <StatItem label="Exp. Provocadas" value={stats.portero_acciones_exp_provocada} />
            <StatItem label="Penalti Provocado" value={stats.portero_penalti_provocado} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function GoalkeeperEvolutionChart({ matchStats }: { matchStats: MatchStatsWithMatch[] }) {
  const chartData = matchStats
    .slice()
    .reverse()
    .map((stat, index) => {
      const totalSaves = stat.portero_paradas_totales || 0
      const totalGoals = stat.portero_goles_totales || 0
      const efficiency = totalSaves + totalGoals > 0 ? ((totalSaves / (totalSaves + totalGoals)) * 100).toFixed(1) : 0

      return {
        partido: `P${index + 1}`,
        paradas: totalSaves,
        goles: totalGoals,
        eficiencia: Number(efficiency),
      }
    })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Evolución de Rendimiento</h2>
      <Card>
        <CardHeader>
          <CardTitle>Paradas y Goles por Partido</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              paradas: { label: "Paradas", color: "hsl(var(--chart-1))" },
              goles: { label: "Goles Recibidos", color: "hsl(var(--chart-2))" },
              eficiencia: { label: "Eficiencia %", color: "hsl(var(--chart-3))" },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partido" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="paradas" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Paradas" />
                <Line
                  type="monotone"
                  dataKey="goles"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Goles Recibidos"
                />
                <Line
                  type="monotone"
                  dataKey="eficiencia"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Eficiencia %"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function GoalkeeperMatchStats({ matchStats, player }: { matchStats: MatchStatsWithMatch[]; player: Player }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Estadísticas por Partido</h2>
      <div className="grid gap-4">
        {matchStats.map((stat) => {
          const match = stat.matches
          const totalSaves = stat.portero_paradas_totales || 0
          const totalGoals = stat.portero_goles_totales || 0
          const efficiency =
            totalSaves + totalGoals > 0 ? ((totalSaves / (totalSaves + totalGoals)) * 100).toFixed(1) : "0.0"

          return (
            <Card key={stat.id}>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      {match.is_home ? "vs" : "@"} {match.opponent}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(match.match_date).toLocaleDateString("es-ES")} - Jornada {match.jornada}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {match.home_score} - {match.away_score}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Paradas</p>
                    <p className="text-2xl font-bold text-green-600">{totalSaves}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Goles Recibidos</p>
                    <p className="text-2xl font-bold text-red-600">{totalGoals}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Eficiencia</p>
                    <p className="text-2xl font-bold text-blue-600">{efficiency}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Asistencias</p>
                    <p className="text-2xl font-bold">{stat.portero_acciones_asistencias || 0}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-sm">Desglose de Paradas:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <span>Recup: {stat.portero_tiros_parada_recup || 0}</span>
                    <span>Fuera: {stat.portero_paradas_fuera || 0}</span>
                    <span>Penalti: {stat.portero_paradas_penalti_parado || 0}</span>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <p className="font-semibold text-sm">Desglose de Goles Encajados:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <span>Boya: {stat.portero_goles_boya_parada || 0}</span>
                    <span>Hombre -: {stat.portero_goles_hombre_menos || 0}</span>
                    <span>Penalti: {stat.portero_goles_penalti || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function GoalkeeperAdvancedEfficiency({ stats }: { stats: any }) {
  const totalSaves = stats.portero_paradas_totales
  const totalGoals = stats.portero_goles_totales

  const paradasVsGoles = [
    { name: "Paradas", value: totalSaves, color: "hsl(var(--chart-1))" },
    { name: "Goles Recibidos", value: totalGoals, color: "hsl(var(--chart-2))" },
  ]

  const penaltyData = [
    { name: "Parados", value: stats.portero_paradas_penalti_parado, color: "hsl(var(--chart-3))" },
    { name: "Encajados", value: stats.portero_goles_penalti, color: "hsl(var(--chart-4))" },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Eficiencia Avanzada</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Paradas vs Goles Recibidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                paradas: { label: "Paradas", color: "hsl(var(--chart-1))" },
                goles: { label: "Goles Recibidos", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paradasVsGoles} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {paradasVsGoles.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eficiencia en Penaltis</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                parados: { label: "Parados", color: "hsl(var(--chart-3))" },
                encajados: { label: "Encajados", color: "hsl(var(--chart-4))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={penaltyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {penaltyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// existing code ...

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

      portero_goles_totales:
        acc.portero_goles_totales +
        ((stat.portero_goles_boya || 0) +
          (stat.portero_goles_hombre_menos || 0) +
          (stat.portero_goles_dir_mas_5m || 0) +
          (stat.portero_goles_contraataque || 0) +
          (stat.portero_goles_penalti || 0)),
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
            <StatCard label="Boya/Jugada" value={stats.goles_boya_jugada} />
            <StatCard label="Hombre +" value={stats.goles_hombre_mas} />
            <StatCard label="Lanzamiento" value={stats.goles_lanzamiento} />
            <StatCard label="Dir +6m" value={stats.goles_dir_mas_5m} />
            <StatCard label="Contraataque" value={stats.goles_contraataque} />
            <StatCard label="Penalti Anotado" value={stats.goles_penalti_anotado} />
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
            <StatCard label="Penalti Fallado" value={stats.tiros_penalti_fallado} />
            <StatCard label="Corner" value={stats.tiros_corner} />
            <StatCard label="Fuera" value={stats.tiros_fuera} />
            <StatCard label="Parados" value={stats.tiros_parados} />
            <StatCard label="Bloqueados" value={stats.tiros_bloqueado} />
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
            <StatCard label='Exp 18"' value={stats.faltas_exp_20_1c1} />
            <StatCard label="Exp 18 Boya" value={stats.faltas_exp_20_boya} />
            <StatCard label="Penalti" value={stats.faltas_penalti} />
            <StatCard label="Contrafaltas" value={stats.faltas_contrafaltas} />
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
            <StatCard label="Bloqueo" value={stats.acciones_bloqueo} />
            <StatCard label="Asistencias" value={stats.acciones_asistencias} />
            <StatCard label="Recuperación" value={stats.acciones_recuperacion} />
            <StatCard label="Rebote" value={stats.acciones_rebote} />
            <StatCard label="Exp Provocada" value={stats.acciones_exp_provocada} />
            <StatCard label="Perdida Pos." value={stats.acciones_penalti_provocado} />
            <StatCard label="Recibe Gol" value={stats.acciones_recibir_gol} />
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
            <StatCard label="Paradas" value={stats.portero_paradas_totales} />
            <StatCard label="Goles Recibidos" value={stats.portero_goles_totales} />
            <StatCard label="% Paradas" value={`${savePercentage}%`} />
            <StatCard label="Penalti Parado" value={stats.portero_paradas_penalti_parado} />
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
            <StatCard label="Boya" value={stats.portero_goles_boya} />
            <StatCard label="Hombre -" value={stats.portero_goles_hombre_menos} />
            <StatCard label="Dir +6m" value={stats.portero_goles_dir_mas_5m} />
            <StatCard label="Contraataque" value={stats.portero_goles_contraataque} />
            <StatCard label="Penalti" value={stats.portero_goles_penalti} />
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
            <StatCard label="Parada Recup" value={stats.portero_paradas_parada_recup} />
            <StatCard label="Parada Fuera" value={stats.portero_paradas_fuera} />
            <StatCard label="Penalti Parado" value={stats.portero_paradas_penalti_parado} />
            <StatCard label="Parada Hombre -" value={stats.portero_paradas_hombre_menos} />
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
            <StatCard label="Asistencias" value={stats.portero_acciones_asistencias} />
            <StatCard label="Recuperación" value={stats.portero_acciones_recuperacion} />
            <StatCard label="Pérdida de Pos" value={stats.portero_acciones_perdida_pos} />
            <StatCard label="Exp Provocada" value={stats.portero_acciones_exp_provocada} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className={`text-center p-4 rounded-lg ${color || "bg-muted"}`}>
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
                    <p className="text-xl font-bold">{stat.portero_goles_totales}</p>
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
