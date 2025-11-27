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
import { ExportPDFButton } from "./export-pdf-button"

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

  return <FieldPlayerPage player={player} matchStats={matchStats || []} />
}

function FieldPlayerPage({ player, matchStats }: { player: Player; matchStats: MatchStatsWithMatch[] }) {
  const matchCount = matchStats.length
  const fieldPlayerStats = calculateFieldPlayerStats(matchStats)

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  <CardTitle className="text-2xl md:text-3xl">{player.name}</CardTitle>
                  <p className="text-sm md:text-base text-muted-foreground">Jugador de Campo</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="resumen" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="resumen" className="text-xs md:text-sm py-2">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="categorias" className="text-xs md:text-sm py-2">
            Por Categorías
          </TabsTrigger>
          <TabsTrigger value="evolucion" className="text-xs md:text-sm py-2">
            Evolución
          </TabsTrigger>
          <TabsTrigger value="partidos" className="text-xs md:text-sm py-2">
            Por Partido
          </TabsTrigger>
          <TabsTrigger value="eficiencia" className="text-xs md:text-sm py-2">
            Eficiencia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6">
          <FieldPlayerSummary stats={fieldPlayerStats} matchCount={matchCount} />
        </TabsContent>

        <TabsContent value="categorias" className="space-y-6">
          <FieldPlayerCategoriesStats stats={fieldPlayerStats} />
        </TabsContent>

        <TabsContent value="evolucion" className="space-y-6">
          <PerformanceEvolutionChart matchStats={matchStats} player={player} />
        </TabsContent>

        <TabsContent value="partidos" className="space-y-6">
          <FieldPlayerMatchStats matchStats={matchStats} player={player} />
        </TabsContent>

        <TabsContent value="eficiencia" className="space-y-6">
          <FieldPlayerAdvancedEfficiency stats={fieldPlayerStats} />
        </TabsContent>
      </Tabs>

      <footer className="mt-12 pt-6 border-t">
        <div className="flex justify-center">
          <ExportPDFButton player={player} matchStats={matchStats} />
        </div>
      </footer>
    </main>
  )
}

function calculateFieldPlayerStats(matchStats: MatchStatsWithMatch[]) {
  return matchStats.reduce(
    (acc, stat) => {
      return {
        // Goles
        goles_totales: acc.goles_totales + (stat.goles_totales || 0),
        goles_boya_jugada: acc.goles_boya_jugada + (stat.goles_boya_jugada || 0),
        goles_hombre_mas: acc.goles_hombre_mas + (stat.goles_hombre_mas || 0),
        goles_lanzamiento: acc.goles_lanzamiento + (stat.goles_lanzamiento || 0),
        goles_dir_mas_5m: acc.goles_dir_mas_5m + (stat.goles_dir_mas_5m || 0),
        goles_contraataque: acc.goles_contraataque + (stat.goles_contraataque || 0),
        goles_penalti_anotado: acc.goles_penalti_anotado + (stat.goles_penalti_anotado || 0),

        // Tiros
        tiros_totales: acc.tiros_totales + (stat.tiros_totales || 0),
        tiros_hombre_mas: acc.tiros_hombre_mas + (stat.tiros_hombre_mas || 0),
        tiros_penalti_fallado: acc.tiros_penalti_fallado + (stat.tiros_penalti_fallado || 0),
        tiros_corner: acc.tiros_corner + (stat.tiros_corner || 0),
        tiros_fuera: acc.tiros_fuera + (stat.tiros_fuera || 0),
        tiros_parados: acc.tiros_parados + (stat.tiros_parados || 0),
        tiros_bloqueado: acc.tiros_bloqueado + (stat.tiros_bloqueado || 0),

        // Faltas
        faltas_exp_20_1c1: acc.faltas_exp_20_1c1 + (stat.faltas_exp_20_1c1 || 0),
        faltas_exp_20_boya: acc.faltas_exp_20_boya + (stat.faltas_exp_20_boya || 0),
        faltas_penalti: acc.faltas_penalti + (stat.faltas_penalti || 0),
        faltas_contrafaltas: acc.faltas_contrafaltas + (stat.faltas_contrafaltas || 0),

        // Acciones
        acciones_bloqueo: acc.acciones_bloqueo + (stat.acciones_bloqueo || 0),
        acciones_asistencias: acc.acciones_asistencias + (stat.acciones_asistencias || 0),
        acciones_recuperacion: acc.acciones_recuperacion + (stat.acciones_recuperacion || 0),
        acciones_rebote: acc.acciones_rebote + (stat.acciones_rebote || 0),
        acciones_exp_provocada: acc.acciones_exp_provocada + (stat.acciones_exp_provocada || 0),
        acciones_penalti_provocado: acc.acciones_penalti_provocado + (stat.acciones_penalti_provocado || 0),
        acciones_recibir_gol: acc.acciones_recibir_gol + (stat.acciones_recibir_gol || 0),
        acciones_perdida_poco: acc.acciones_perdida_poco + (stat.acciones_perdida_poco || 0),
      }
    },
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
      acciones_perdida_poco: 0,
    },
  )
}

function FieldPlayerSummary({ stats, matchCount }: { stats: any; matchCount: number }) {
  const golesPerMatch = matchCount > 0 ? (stats.goles_totales / matchCount).toFixed(1) : "0.0"
  const tirosPerMatch = matchCount > 0 ? (stats.tiros_totales / matchCount).toFixed(1) : "0.0"
  const eficiencia = stats.tiros_totales > 0 ? ((stats.goles_totales / stats.tiros_totales) * 100).toFixed(1) : "0.0"
  const asistPerMatch = matchCount > 0 ? (stats.acciones_asistencias / matchCount).toFixed(1) : "0.0"

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold">{matchCount}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Partidos</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{stats.goles_totales}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Goles</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.tiros_totales}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Tiros</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">{eficiencia}%</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Eficiencia</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">{golesPerMatch}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Goles/Partido</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-teal-600 dark:text-teal-400">
              {stats.acciones_asistencias}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Asistencias</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FieldPlayerCategoriesStats({ stats }: { stats: any }) {
  return (
    <div className="space-y-6 mb-6">
      {/* Goles por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Goles por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            <StatItem
              label="Boya/Jugada"
              value={stats.goles_boya_jugada}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatItem
              label="Hombre +"
              value={stats.goles_hombre_mas}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatItem
              label="Lanzamiento"
              value={stats.goles_lanzamiento}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatItem
              label="+6m"
              value={stats.goles_dir_mas_5m}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatItem
              label="Contraataque"
              value={stats.goles_contraataque}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatItem
              label="Penalti"
              value={stats.goles_penalti_anotado}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tiros Fallados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Tiros Fallados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            <StatItem
              label="Hombre +"
              value={stats.tiros_hombre_mas}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatItem
              label="Penalti"
              value={stats.tiros_penalti_fallado}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatItem label="Corner" value={stats.tiros_corner} color="bg-red-500/10 text-red-600 dark:text-red-400" />
            <StatItem label="Fuera" value={stats.tiros_fuera} color="bg-red-500/10 text-red-600 dark:text-red-400" />
            <StatItem
              label="Parados"
              value={stats.tiros_parados}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatItem
              label="Bloqueados"
              value={stats.tiros_bloqueado}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Faltas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Faltas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* CHANGE: Fixed string literal with embedded quotes */}
            <StatItem
              label='Exp 20" 1c1'
              value={stats.faltas_exp_20_1c1}
              color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            />
            <StatItem
              label='Exp 20" Boya'
              value={stats.faltas_exp_20_boya}
              color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            />
            <StatItem
              label="Penalti"
              value={stats.faltas_penalti}
              color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            />
            <StatItem
              label="Contrafaltas"
              value={stats.faltas_contrafaltas}
              color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatItem
              label="Bloqueos"
              value={stats.acciones_bloqueo}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatItem
              label="Asistencias"
              value={stats.acciones_asistencias}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatItem
              label="Recuperaciones"
              value={stats.acciones_recuperacion}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatItem
              label="Rebotes"
              value={stats.acciones_rebote}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatItem
              label="Exp Provocadas"
              value={stats.acciones_exp_provocada}
              color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
            <StatItem
              label="Penalti Provocado"
              value={stats.acciones_penalti_provocado}
              color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
            <StatItem
              label="Gol Recibido"
              value={stats.acciones_recibir_gol}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatItem
              label="Pérdida Posición"
              value={stats.acciones_perdida_poco}
              color="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FieldPlayerMatchStats({ matchStats, player }: { matchStats: MatchStatsWithMatch[]; player: Player }) {
  if (matchStats.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No hay estadísticas de partidos registradas</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      <h2 className="text-xl md:text-2xl font-bold">Estadísticas por Partido</h2>
      {matchStats.map((stat) => {
        const match = stat.matches
        const goles = stat.goles_totales || 0
        const tiros = stat.tiros_totales || 0
        const eficiencia = tiros > 0 ? ((goles / tiros) * 100).toFixed(1) : "0.0"

        return (
          <Card key={stat.id}>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <CardTitle className="text-base md:text-lg">{match?.opponent}</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {match?.match_date
                      ? new Date(match.match_date).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg md:text-2xl font-bold">
                    {match?.home_score} - {match?.away_score}
                  </span>
                  <Button asChild variant="outline" size="sm" className="text-xs bg-transparent">
                    <Link href={`/partidos/${match?.id}`}>Ver Partido</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                <div className="text-center p-3 md:p-4 bg-green-500/10 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{goles}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Goles</p>
                </div>
                <div className="text-center p-3 md:p-4 bg-blue-500/10 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{tiros}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Tiros</p>
                </div>
                <div className="text-center p-3 md:p-4 bg-purple-500/10 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{eficiencia}%</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Eficiencia</p>
                </div>
                <div className="text-center p-3 md:p-4 bg-teal-500/10 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {stat.acciones_asistencias || 0}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Asistencias</p>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Goles por Tipo */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs md:text-sm text-muted-foreground">Goles por Tipo</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Boya:</span>
                      <span className="font-semibold">{stat.goles_boya_jugada || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Hombre +:</span>
                      <span className="font-semibold">{stat.goles_hombre_mas || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Lanz:</span>
                      <span className="font-semibold">{stat.goles_lanzamiento || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>+6m:</span>
                      <span className="font-semibold">{stat.goles_dir_mas_5m || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Contra:</span>
                      <span className="font-semibold">{stat.goles_contraataque || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Penalti:</span>
                      <span className="font-semibold">{stat.goles_penalti_anotado || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Tiros Fallados */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs md:text-sm text-muted-foreground">Tiros Fallados</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Hombre +:</span>
                      <span className="font-semibold">{stat.tiros_hombre_mas || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Penalti:</span>
                      <span className="font-semibold">{stat.tiros_penalti_fallado || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Corner:</span>
                      <span className="font-semibold">{stat.tiros_corner || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Fuera:</span>
                      <span className="font-semibold">{stat.tiros_fuera || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Parados:</span>
                      <span className="font-semibold">{stat.tiros_parados || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Bloq:</span>
                      <span className="font-semibold">{stat.tiros_bloqueado || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Faltas */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs md:text-sm text-muted-foreground">Faltas</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Exp 20" 1c1:</span>
                      <span className="font-semibold">{stat.faltas_exp_20_1c1 || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Exp 20" Boya:</span>
                      <span className="font-semibold">{stat.faltas_exp_20_boya || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Penalti:</span>
                      <span className="font-semibold">{stat.faltas_penalti || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Contrafalta:</span>
                      <span className="font-semibold">{stat.faltas_contrafaltas || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs md:text-sm text-muted-foreground">Acciones</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Bloqueos:</span>
                      <span className="font-semibold">{stat.acciones_bloqueo || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Recuperaciones:</span>
                      <span className="font-semibold">{stat.acciones_recuperacion || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Rebotes:</span>
                      <span className="font-semibold">{stat.acciones_rebote || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Exp Prov:</span>
                      <span className="font-semibold">{stat.acciones_exp_provocada || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Pen Prov:</span>
                      <span className="font-semibold">{stat.acciones_penalti_provocado || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Gol Recibido:</span>
                      <span className="font-semibold">{stat.acciones_recibir_gol || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function FieldPlayerAdvancedEfficiency({ stats }: { stats: any }) {
  const totalTiros = stats.tiros_totales + stats.goles_totales
  const eficienciaGeneral = totalTiros > 0 ? ((stats.goles_totales / totalTiros) * 100).toFixed(1) : "0.0"

  // Goles vs Tiros Fallados
  const golesVsTirosData = [
    { name: "Goles", value: stats.goles_totales, fill: "hsl(160, 70%, 50%)" },
    { name: "Tiros Fallados", value: stats.tiros_totales, fill: "hsl(0, 70%, 60%)" },
  ]

  // Eficiencia por tipo de gol
  const eficienciaPorTipo = [
    {
      name: "Boya/Jugada",
      goles: stats.goles_boya_jugada,
    },
    {
      name: "Hombre +",
      goles: stats.goles_hombre_mas,
    },
    {
      name: "Lanzamiento",
      goles: stats.goles_lanzamiento,
    },
    {
      name: "+6m",
      goles: stats.goles_dir_mas_5m,
    },
    {
      name: "Contraataque",
      goles: stats.goles_contraataque,
    },
    {
      name: "Penalti",
      goles: stats.goles_penalti_anotado,
    },
  ]

  // Eficiencia ofensiva/defensiva
  const accionesPositivas = stats.acciones_asistencias + stats.acciones_recuperacion + stats.acciones_bloqueo
  const accionesNegativas = stats.acciones_recibir_gol + stats.acciones_perdida_poco

  const chartConfig = {
    goles: { label: "Goles", color: "hsl(160, 70%, 50%)" },
    tiros: { label: "Tiros Fallados", color: "hsl(0, 70%, 60%)" },
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Eficiencia Avanzada</h2>

      {/* Goles vs Tiros Fallados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Goles vs Tiros Fallados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col items-center justify-center">
              <ChartContainer config={chartConfig} className="h-[250px] md:h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={golesVsTirosData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {golesVsTirosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-4">
              <div className="text-center md:text-left">
                <p className="text-4xl md:text-6xl font-bold text-primary">{eficienciaGeneral}%</p>
                <p className="text-muted-foreground mt-2 text-base md:text-lg">Eficiencia General</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 md:p-6 bg-teal-500/10 rounded-lg">
                  <p className="text-2xl md:text-4xl font-bold text-teal-600 dark:text-teal-400">
                    {stats.goles_totales}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Goles</p>
                </div>
                <div className="text-center p-4 md:p-6 bg-red-500/10 rounded-lg">
                  <p className="text-2xl md:text-4xl font-bold text-red-600 dark:text-red-400">{stats.tiros_totales}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Fallados</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribución de Goles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Distribución de Goles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {eficienciaPorTipo.map((tipo) => {
              const porcentaje = stats.goles_totales > 0 ? ((tipo.goles / stats.goles_totales) * 100).toFixed(0) : "0"

              return (
                <div key={tipo.name} className="text-center p-3 md:p-4 bg-muted rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{porcentaje}%</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">{tipo.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tipo.goles} goles</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Balance Ofensivo/Defensivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Balance Ofensivo/Defensivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-green-600 dark:text-green-400">
                Acciones Positivas
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.acciones_asistencias}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Asistencias</p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.acciones_recuperacion}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Recuperaciones</p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.acciones_bloqueo}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Bloqueos</p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                    {accionesPositivas}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Total</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-red-600 dark:text-red-400">Acciones Negativas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.acciones_recibir_gol}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Goles Recibidos</p>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.acciones_perdida_poco}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Pérdidas</p>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.faltas_exp_20_1c1 + stats.faltas_exp_20_boya}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Expulsiones</p>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">{accionesNegativas}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Total</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GoalkeeperPage({ player, matchStats }: { player: Player; matchStats: MatchStatsWithMatch[] }) {
  const matchCount = matchStats.length

  // Calculate goalkeeper stats
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  <CardTitle className="text-2xl md:text-3xl">{player.name}</CardTitle>
                  <p className="text-sm md:text-base text-muted-foreground">Portero</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="resumen" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="resumen" className="text-xs md:text-sm py-2">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="categorias" className="text-xs md:text-sm py-2">
            Por Categorías
          </TabsTrigger>
          <TabsTrigger value="evolucion" className="text-xs md:text-sm py-2">
            Evolución
          </TabsTrigger>
          <TabsTrigger value="partidos" className="text-xs md:text-sm py-2">
            Por Partido
          </TabsTrigger>
          <TabsTrigger value="eficiencia" className="text-xs md:text-sm py-2">
            Eficiencia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6">
          <GoalkeeperSummary stats={goalkeeperStats} matchCount={matchCount} />
        </TabsContent>

        <TabsContent value="categorias" className="space-y-6">
          <GoalkeeperCategoriesStats stats={goalkeeperStats} />
        </TabsContent>

        <TabsContent value="evolucion" className="space-y-6">
          <GoalkeeperEvolutionChart matchStats={matchStats} />
        </TabsContent>

        <TabsContent value="partidos" className="space-y-6">
          <GoalkeeperMatchStats matchStats={matchStats} player={player} />
        </TabsContent>

        <TabsContent value="eficiencia" className="space-y-6">
          <GoalkeeperAdvancedEfficiency stats={goalkeeperStats} />
        </TabsContent>
      </Tabs>

      <footer className="mt-12 pt-6 border-t">
        <div className="flex justify-center">
          <ExportPDFButton player={player} matchStats={matchStats} />
        </div>
      </footer>
    </main>
  )
}

function calculateGoalkeeperStats(matchStats: MatchStatsWithMatch[]) {
  return matchStats.reduce(
    (acc, stat) => {
      const match = stat.matches
      // Real goals received from match score
      const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0

      return {
        // Goles encajados
        portero_goles_boya_parada: acc.portero_goles_boya_parada + (stat.portero_goles_boya_parada || 0),
        portero_goles_hombre_menos: acc.portero_goles_hombre_menos + (stat.portero_goles_hombre_menos || 0),
        portero_goles_dir_mas_5m: acc.portero_goles_dir_mas_5m + (stat.portero_goles_dir_mas_5m || 0),
        portero_goles_contraataque: acc.portero_goles_contraataque + (stat.portero_goles_contraataque || 0),
        portero_goles_penalti: acc.portero_goles_penalti + (stat.portero_goles_penalti || 0),

        // Paradas
        portero_paradas_totales: acc.portero_paradas_totales + (stat.portero_paradas_totales || 0),
        portero_tiros_parada_recup: acc.portero_tiros_parada_recup + (stat.portero_tiros_parada_recup || 0),
        portero_paradas_fuera: acc.portero_paradas_fuera + (stat.portero_paradas_fuera || 0),
        portero_paradas_penalti_parado: acc.portero_paradas_penalti_parado + (stat.portero_paradas_penalti_parado || 0),
        portero_paradas_hombre_menos: acc.portero_paradas_hombre_menos + (stat.portero_paradas_hombre_menos || 0),

        // Acciones
        acciones_asistencias: acc.acciones_asistencias + (stat.acciones_asistencias || 0),
        acciones_recuperacion: acc.acciones_recuperacion + (stat.acciones_recuperacion || 0),
        portero_acciones_perdida_pos: acc.portero_acciones_perdida_pos + (stat.portero_acciones_perdida_pos || 0),
        acciones_exp_provocada: acc.acciones_exp_provocada + (stat.acciones_exp_provocada || 0),

        // Goles recibidos reales del marcador del partido
        goles_recibidos_reales: acc.goles_recibidos_reales + rivalGoals,
      }
    },
    {
      portero_goles_boya_parada: 0,
      portero_goles_hombre_menos: 0,
      portero_goles_dir_mas_5m: 0,
      portero_goles_contraataque: 0,
      portero_goles_penalti: 0,

      portero_paradas_totales: 0,
      portero_tiros_parada_recup: 0,
      portero_paradas_fuera: 0,
      portero_paradas_penalti_parado: 0,
      portero_paradas_hombre_menos: 0,

      acciones_asistencias: 0,
      acciones_recuperacion: 0,
      portero_acciones_perdida_pos: 0,
      acciones_exp_provocada: 0,

      goles_recibidos_reales: 0,
    },
  )
}

function GoalkeeperSummary({ stats, matchCount }: { stats: any; matchCount: number }) {
  const totalShots = stats.portero_paradas_totales + stats.goles_recibidos_reales
  const savePercentage = totalShots > 0 ? ((stats.portero_paradas_totales / totalShots) * 100).toFixed(1) : "0.0"
  const paradasPerMatch = matchCount > 0 ? (stats.portero_paradas_totales / matchCount).toFixed(1) : "0.0"
  const golesPerMatch = matchCount > 0 ? (stats.goles_recibidos_reales / matchCount).toFixed(1) : "0.0"

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{matchCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Partidos Jugados</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.portero_paradas_totales}</p>
            <p className="text-sm text-muted-foreground mt-1">Paradas Totales</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.goles_recibidos_reales}</p>
            <p className="text-sm text-muted-foreground mt-1">Goles Recibidos</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{savePercentage}%</p>
            <p className="text-sm text-muted-foreground mt-1">% de Paradas</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{paradasPerMatch}</p>
            <p className="text-sm text-muted-foreground mt-1">Paradas / Partido</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{golesPerMatch}</p>
            <p className="text-sm text-muted-foreground mt-1">Goles Rec. / Partido</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GoalkeeperCategoriesStats({ stats }: { stats: any }) {
  return (
    <div className="space-y-6 mb-6">
      {/* Goles Encajados */}
      <Card>
        <CardHeader>
          <CardTitle>Goles Encajados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatItem
              label="Boya/Parada"
              value={stats.portero_goles_boya_parada}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatItem
              label="Hombre -"
              value={stats.portero_goles_hombre_menos}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatItem
              label="+6m"
              value={stats.portero_goles_dir_mas_5m}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatItem
              label="Contraataque"
              value={stats.portero_goles_contraataque}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <StatItem
              label="Penalti"
              value={stats.portero_goles_penalti}
              color="bg-red-500/10 text-red-600 dark:text-red-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Paradas */}
      <Card>
        <CardHeader>
          <CardTitle>Paradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem
              label="Parada + Recup"
              value={stats.portero_tiros_parada_recup}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatItem
              label="+6m"
              value={stats.portero_paradas_fuera}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatItem
              label="Penalti"
              value={stats.portero_paradas_penalti_parado}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatItem
              label="Hombre -"
              value={stats.portero_paradas_hombre_menos}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem
              label="Asistencias"
              value={stats.acciones_asistencias}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatItem
              label="Recuperaciones"
              value={stats.acciones_recuperacion}
              color="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <StatItem
              label="Pérdidas"
              value={stats.portero_acciones_perdida_pos}
              color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            />
            <StatItem
              label="Exp. Provocadas"
              value={stats.acciones_exp_provocada}
              color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GoalkeeperEvolutionChart({ matchStats }: { matchStats: MatchStatsWithMatch[] }) {
  // Sort matches by date (oldest first for evolution)
  const sortedMatches = [...matchStats].reverse()

  // Calculate cumulative stats
  let cumulativeParadas = 0
  let cumulativeGoles = 0
  let matchesPlayed = 0

  const evolutionData = sortedMatches.map((stat, index) => {
    const match = stat.matches
    const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0
    const paradas = stat.portero_paradas_totales || 0

    cumulativeParadas += paradas
    cumulativeGoles += rivalGoals
    matchesPlayed = index + 1

    const totalShots = paradas + rivalGoals
    const eficiencia = totalShots > 0 ? (paradas / totalShots) * 100 : 0
    const mediaParadas = cumulativeParadas / matchesPlayed

    return {
      partido: `J${match?.jornada || index + 1}`,
      fecha: match?.match_date
        ? new Date(match.match_date).toLocaleDateString("es-ES", { month: "short", day: "numeric" })
        : "",
      mediaParadas: Number.parseFloat(mediaParadas.toFixed(1)),
      eficiencia: Number.parseFloat(eficiencia.toFixed(1)),
      golesRecibidos: rivalGoals,
      paradas: paradas,
    }
  })

  const chartConfig = {
    mediaParadas: { label: "Media Paradas", color: "hsl(200, 80%, 50%)" },
    eficiencia: { label: "Eficiencia (%)", color: "hsl(160, 70%, 50%)" },
    golesRecibidos: { label: "Goles Recibidos", color: "hsl(0, 70%, 60%)" },
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Evolución del Rendimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="partido" className="text-xs" tick={{ fontSize: 12 }} />
              <YAxis className="text-xs" tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: "14px" }} />
              <Line
                type="monotone"
                dataKey="mediaParadas"
                stroke="hsl(200, 80%, 50%)"
                strokeWidth={2}
                name="Media Paradas"
              />
              <Line
                type="monotone"
                dataKey="eficiencia"
                stroke="hsl(160, 70%, 50%)"
                strokeWidth={2}
                name="Eficiencia (%)"
              />
              <Line
                type="monotone"
                dataKey="golesRecibidos"
                stroke="hsl(0, 70%, 60%)"
                strokeWidth={2}
                name="Goles Recibidos"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function GoalkeeperMatchStats({ matchStats, player }: { matchStats: MatchStatsWithMatch[]; player: Player }) {
  if (matchStats.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No hay estadísticas de partidos registradas</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      <h2 className="text-2xl font-bold">Estadísticas por Partido</h2>
      {matchStats.map((stat) => {
        const match = stat.matches
        const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0
        const paradas = stat.portero_paradas_totales || 0
        const totalShots = paradas + rivalGoals
        const eficiencia = totalShots > 0 ? ((paradas / totalShots) * 100).toFixed(1) : "0.0"

        return (
          <Card key={stat.id}>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{match?.opponent}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {match?.match_date
                      ? new Date(match.match_date).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">
                    {match?.home_score} - {match?.away_score}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/partidos/${match?.id}`}>Ver Partido</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{paradas}</p>
                  <p className="text-sm text-muted-foreground">Paradas</p>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rivalGoals}</p>
                  <p className="text-sm text-muted-foreground">Goles Recibidos</p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{eficiencia}%</p>
                  <p className="text-sm text-muted-foreground">Eficiencia</p>
                </div>
                <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalShots}</p>
                  <p className="text-sm text-muted-foreground">Tiros Totales</p>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Paradas por Tipo */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Paradas por Tipo</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Recup:</span>
                      <span className="font-semibold">{stat.portero_tiros_parada_recup || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>+6m:</span>
                      <span className="font-semibold">{stat.portero_paradas_fuera || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Penalti:</span>
                      <span className="font-semibold">{stat.portero_paradas_penalti_parado || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Hombre -:</span>
                      <span className="font-semibold">{stat.portero_paradas_hombre_menos || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Goles Encajados por Tipo */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Goles Encajados por Tipo</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Boya/Parada:</span>
                      <span className="font-semibold">{stat.portero_goles_boya_parada || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Hombre -:</span>
                      <span className="font-semibold">{stat.portero_goles_hombre_menos || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>+6m:</span>
                      <span className="font-semibold">{stat.portero_goles_dir_mas_5m || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Contra:</span>
                      <span className="font-semibold">{stat.portero_goles_contraataque || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Penalti:</span>
                      <span className="font-semibold">{stat.portero_goles_penalti || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function GoalkeeperAdvancedEfficiency({ stats }: { stats: any }) {
  const totalShots = stats.portero_paradas_totales + stats.goles_recibidos_reales
  const savePercentage = totalShots > 0 ? ((stats.portero_paradas_totales / totalShots) * 100).toFixed(1) : "0.0"

  // Paradas vs Goles Recibidos
  const paradasVsGolesData = [
    { name: "Paradas", value: stats.portero_paradas_totales, fill: "hsl(160, 70%, 50%)" },
    { name: "Goles Recibidos", value: stats.goles_recibidos_reales, fill: "hsl(0, 70%, 60%)" },
  ]

  // Eficiencia por tipo de tiro
  const eficienciaByType = [
    {
      name: "Boya/Parada",
      paradas: 0, // Not tracked separately
      goles: stats.portero_goles_boya_parada,
    },
    {
      name: "Hombre -",
      paradas: stats.portero_paradas_hombre_menos,
      goles: stats.portero_goles_hombre_menos,
    },
    {
      name: "+6m",
      paradas: stats.portero_paradas_fuera,
      goles: stats.portero_goles_dir_mas_5m,
    },
    {
      name: "Contraataque",
      paradas: 0, // Not tracked separately
      goles: stats.portero_goles_contraataque,
    },
  ]

  // Eficiencia en penaltis
  const penaltiTotal = stats.portero_paradas_penalti_parado + stats.portero_goles_penalti
  const penaltiPercentage =
    penaltiTotal > 0 ? ((stats.portero_paradas_penalti_parado / penaltiTotal) * 100).toFixed(1) : "0.0"

  const penaltiData = [
    { name: "Penaltis Parados", value: stats.portero_paradas_penalti_parado, fill: "hsl(160, 70%, 50%)" },
    { name: "Penaltis Encajados", value: stats.portero_goles_penalti, fill: "hsl(0, 70%, 60%)" },
  ]

  const chartConfig = {
    paradas: { label: "Paradas", color: "hsl(160, 70%, 50%)" },
    goles: { label: "Goles Recibidos", color: "hsl(0, 70%, 60%)" },
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Eficiencia Avanzada</h2>

      {/* Paradas vs Goles Recibidos */}
      <Card>
        <CardHeader>
          <CardTitle>Paradas vs Goles Recibidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col items-center justify-center">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={paradasVsGolesData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {paradasVsGolesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-4">
              <div className="text-center md:text-left">
                <p className="text-6xl font-bold text-primary">{savePercentage}%</p>
                <p className="text-muted-foreground mt-2 text-lg">Eficiencia General</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-6 bg-teal-500/10 rounded-lg">
                  <p className="text-4xl font-bold text-teal-600 dark:text-teal-400">{stats.portero_paradas_totales}</p>
                  <p className="text-sm text-muted-foreground mt-1">Paradas</p>
                </div>
                <div className="text-center p-6 bg-red-500/10 rounded-lg">
                  <p className="text-4xl font-bold text-red-600 dark:text-red-400">{stats.goles_recibidos_reales}</p>
                  <p className="text-sm text-muted-foreground mt-1">Recibidos</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eficiencia por Tipo de Tiro */}
      <Card>
        <CardHeader>
          <CardTitle>Eficiencia por Tipo de Tiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {eficienciaByType.map((tipo) => {
              const total = tipo.paradas + tipo.goles
              const percentage = total > 0 ? ((tipo.paradas / total) * 100).toFixed(0) : "N/A"

              return (
                <div key={tipo.name} className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{total > 0 ? `${percentage}%` : "N/A"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{tipo.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tipo.paradas}P / {tipo.goles}G
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Eficiencia en Penaltis */}
      {penaltiTotal > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eficiencia en Penaltis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="flex flex-col items-center justify-center">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={penaltiData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={2}
                    >
                      {penaltiData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
              <div className="space-y-4">
                <div className="text-center md:text-left">
                  <p className="text-6xl font-bold text-primary">{penaltiPercentage}%</p>
                  <p className="text-muted-foreground mt-2 text-lg">Eficiencia en Penaltis</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-6 bg-teal-500/10 rounded-lg">
                    <p className="text-4xl font-bold text-teal-600 dark:text-teal-400">
                      {stats.portero_paradas_penalti_parado}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Parados</p>
                  </div>
                  <div className="text-center p-6 bg-red-500/10 rounded-lg">
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">{stats.portero_goles_penalti}</p>
                    <p className="text-sm text-muted-foreground mt-1">Encajados</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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

      portero_goles_totales:
        acc.portero_goles_totales +
        ((stat.portero_goles_boya_parada || 0) + // Updated field
          (stat.portero_goles_hombre_menos || 0) +
          (stat.portero_goles_dir_mas_5m || 0) +
          (stat.portero_goles_contraataque || 0) +
          (stat.portero_goles_penalti || 0)),
      portero_goles_boya_parada: acc.portero_goles_boya_parada + (stat.portero_goles_boya_parada || 0), // Updated field
      portero_goles_hombre_menos: acc.portero_goles_hombre_menos + (stat.portero_goles_hombre_menos || 0),
      portero_goles_dir_mas_5m: acc.portero_goles_dir_mas_5m + (stat.portero_goles_dir_mas_5m || 0),
      portero_goles_contraataque: acc.portero_goles_contraataque + (stat.portero_goles_contraataque || 0),
      portero_goles_penalti: acc.portero_goles_penalti + (stat.portero_goles_penalti || 0),

      portero_paradas_totales: acc.portero_paradas_totales + (stat.portero_paradas_totales || 0),
      portero_tiros_parada_recup: acc.portero_tiros_parada_recup + (stat.portero_tiros_parada_recup || 0), // Updated field
      portero_paradas_fuera: acc.portero_paradas_fuera + (stat.portero_paradas_fuera || 0),
      portero_paradas_penalti_parado: acc.portero_paradas_penalti_parado + (stat.portero_paradas_penalti_parado || 0),
      portero_paradas_hombre_menos: acc.portero_paradas_hombre_menos + (stat.portero_paradas_hombre_menos || 0),

      portero_acciones_asistencias: acc.portero_acciones_asistencias + (stat.acciones_asistencias || 0), // Updated field
      portero_acciones_recuperacion: acc.portero_acciones_recuperacion + (stat.acciones_recuperacion || 0), // Updated field
      portero_acciones_perdida_pos: acc.portero_acciones_perdida_pos + (stat.portero_acciones_perdida_pos || 0), // Updated field
      portero_acciones_exp_provocada: acc.portero_acciones_exp_provocada + (stat.acciones_exp_provocada || 0), // Updated field
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
      portero_goles_boya_parada: 0, // Updated field
      portero_goles_hombre_menos: 0,
      portero_goles_dir_mas_5m: 0,
      portero_goles_contraataque: 0,
      portero_goles_penalti: 0,

      portero_paradas_totales: 0,
      portero_tiros_parada_recup: 0, // Updated field
      portero_paradas_fuera: 0,
      portero_paradas_penalti_parado: 0,
      portero_paradas_hombre_menos: 0,

      portero_acciones_asistencias: 0, // Updated field
      portero_acciones_recuperacion: 0, // Updated field
      portero_acciones_perdida_pos: 0, // Updated field
      portero_acciones_exp_provocada: 0, // Updated field
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
            <StatItem label="Boya/Jugada" value={stats.goles_boya_jugada} />
            <StatItem label="Hombre +" value={stats.goles_hombre_mas} />
            <StatItem label="Lanzamiento" value={stats.goles_lanzamiento} />
            <StatItem label="Dir +6m" value={stats.goles_dir_mas_5m} />
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
            <StatItem label='Exp 18"' value={stats.faltas_exp_20_1c1} />
            <StatItem label="Exp 18 Boya" value={stats.faltas_exp_20_boya} />
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
            <StatItem label="Perdida Pos." value={stats.acciones_penalti_provocado} />
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
            <StatItem label="Boya" value={stats.portero_goles_boya_parada} /> {/* Updated field */}
            <StatItem label="Hombre -" value={stats.portero_goles_hombre_menos} />
            <StatItem label="Dir +6m" value={stats.portero_goles_dir_mas_5m} />
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
            <StatItem label="Parada Recup" value={stats.portero_tiros_parada_recup} /> {/* Updated field */}
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
            <StatItem label="Asistencias" value={stats.portero_acciones_asistencias} /> {/* Updated field */}
            <StatItem label="Recuperación" value={stats.portero_acciones_recuperacion} /> {/* Updated field */}
            <StatItem label="Pérdida de Pos" value={stats.portero_acciones_perdida_pos} /> {/* Updated field */}
            <StatItem label="Exp Provocada" value={stats.portero_acciones_exp_provocada} /> {/* Updated field */}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className={`text-center p-3 md:p-4 rounded-lg ${color || "bg-muted"}`}>
      <p className="text-xl md:text-2xl font-bold">{value}</p>
      <p className="text-xs md:text-sm text-muted-foreground mt-1">{label}</p>
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
