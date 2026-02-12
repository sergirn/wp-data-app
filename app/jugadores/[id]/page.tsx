import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Player, MatchStats, Match } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ArrowLeft } from "lucide-react";

import { StatsCharts6x6 } from "@/components/analytics-player/summary-components/StatsChartsPlayer";
import { buildFieldPlayerKpis } from "@/lib/PlayerKpis";
import { KpiGrid } from "@/components/analytics-player/summary-components/KpiGrid";
import { StatsChartsGoalkeeper } from "@/components/analytics-goalkeeper/summary-components/StatsChartsGoalkeeper";
import { buildGoalkeeperKpis } from "@/lib/GoalkeeperKpis";
import { KpiGridGoalkeeper } from "@/components/analytics-goalkeeper/summary-components/KpiGridGoalkeeper";
import { GoalkeeperEvolutionChart } from "@/components/analytics-goalkeeper/evolution-component/GK_EvolutionChart";
import { PlayerHeroHeader } from "./playerHeader";
import { BlocksVsGoalsChart } from "@/components/analytics-player/evolution-component/BlocksVsGoalsChart";
import { PerformanceEvolutionChart } from "@/components/analytics-player/evolution-component/PerformanceEvolutionChart";
import { GoalkeeperShotForChart, GoalkeeperShotsGoalChart } from "@/components/analytics-goalkeeper/evolution-component/GoalkeepersShotsEvolutions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion";
import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";
import { FieldPlayerMatchStatsClient } from "./FieldPlayerMatchStatsClient";
import { GoalkeeperMatchStatsClient } from "./GoalkeeperMatchStatsClient";

interface MatchStatsWithMatch extends MatchStats {
	matches: Match;
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createClient();

	const { data: player, error: playerError } = await supabase.from("players").select("*").eq("id", id).single();
	if (playerError || !player) notFound();

	const { data: matchStats } = await supabase
		.from("match_stats")
		.select(`*, matches (*)`)
		.eq("player_id", id)
		.order("matches(match_date)", { ascending: false });

	// ✅ tiros del portero (solo si es portero)
	const { data: goalkeeperShots } = player.is_goalkeeper
		? await supabase
				.from("goalkeeper_shots") // <-- cambia si tu tabla se llama distinto
				.select("*")
				.eq("goalkeeper_player_id", id)
				.order("shot_index", { ascending: true })
		: { data: [] as any[] };

	if (player.is_goalkeeper) {
		return <GoalkeeperPage player={player} matchStats={matchStats || []} goalkeeperShots={goalkeeperShots || []} />;
	}

	return <FieldPlayerPage player={player} matchStats={matchStats || []} />;
}

function FieldPlayerPage({ player, matchStats }: { player: Player; matchStats: MatchStatsWithMatch[] }) {
	const matchCount = matchStats.length;
	const fieldPlayerStats = calculateFieldPlayerStats(matchStats);

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/jugadores">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a Jugadores
					</Link>
				</Button>

				<PlayerHeroHeader player={player} roleLabel="Jugador de Campo" statTotals={fieldPlayerStats} />
			</div>

			<Tabs defaultValue="resumen" className="space-y-6">
				<TabsList className="grid w-full grid-cols-3 md:grid-cols-3 h-auto gap-1">
					<TabsTrigger value="resumen" className="text-xs md:text-sm py-2">
						Resumen
					</TabsTrigger>
					<TabsTrigger value="partidos" className="text-xs md:text-sm py-2">
						Rendimiento por Partido
					</TabsTrigger>
					<TabsTrigger value="evolucion" className="text-xs md:text-sm py-2">
						Evolución
					</TabsTrigger>
				</TabsList>

				<TabsContent value="resumen" className="space-y-6">
					<FieldPlayerSummary stats={fieldPlayerStats} matchCount={matchCount} matchStats={matchStats} />
				</TabsContent>

				<TabsContent value="evolucion" className="space-y-6">
					<PerformanceEvolutionChart matchStats={matchStats} player={player} />
					{!player.is_goalkeeper ? <BlocksVsGoalsChart matchStats={matchStats} /> : null}
				</TabsContent>

				<TabsContent value="partidos" className="space-y-6">
					<FieldPlayerMatchStatsClient matchStats={matchStats} player={player} />
				</TabsContent>
			</Tabs>
		</main>
	);
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
				gol_del_palo_sup: acc.gol_del_palo_sup + (stat.gol_del_palo_sup || 0),

				// Tiros
				tiros_totales: acc.tiros_totales + (stat.tiros_totales || 0),
				tiros_hombre_mas: acc.tiros_hombre_mas + (stat.tiros_hombre_mas || 0),
				tiros_penalti_fallado: acc.tiros_penalti_fallado + (stat.tiros_penalti_fallado || 0),
				tiros_corner: acc.tiros_corner + (stat.tiros_corner || 0),
				tiros_fuera: acc.tiros_fuera + (stat.tiros_fuera || 0),
				tiros_parados: acc.tiros_parados + (stat.tiros_parados || 0),
				tiros_bloqueado: acc.tiros_bloqueado + (stat.tiros_bloqueado || 0),
				tiro_palo: acc.tiro_palo + (stat.tiro_palo || 0),

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

				// Nuevas métricas para el cálculo de las nuevas cards
				faltas_exp_3_bruta: acc.faltas_exp_3_bruta + (stat.faltas_exp_3_bruta || 0),
				faltas_exp_3_int: acc.faltas_exp_3_int + (stat.faltas_exp_3_int || 0),
				rebote_recup_hombre_mas: acc.rebote_recup_hombre_mas + (stat.rebote_recup_hombre_mas || 0),
				rebote_perd_hombre_mas: acc.rebote_perd_hombre_mas + (stat.rebote_perd_hombre_mas || 0)
			};
		},
		{
			goles_totales: 0,
			goles_boya_jugada: 0,
			goles_hombre_mas: 0,
			goles_lanzamiento: 0,
			goles_dir_mas_5m: 0,
			goles_contraataque: 0,
			goles_penalti_anotado: 0,
			gol_del_palo_sup: 0,
			tiro_palo: 0,
			tiros_totales: 0,
			tiros_hombre_mas: 0,
			tiros_penalti_fallado: 0,
			tiros_corner: 0,
			tiros_fuera: 0,
			tiros_parados: 0,
			tiros_bloqueado: 0,
			faltas_exp_20_1c1: 0,
			faltas_exp_20_boya: 0,
			faltas_exp_simple: 0,
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
			faltas_exp_3_bruta: 0,
			faltas_exp_3_int: 0,
			rebote_recup_hombre_mas: 0,
			rebote_perd_hombre_mas: 0
		}
	);
}

function FieldPlayerSummary({
	stats,
	matchCount,
	matchStats
}: {
	stats: any;
	matchCount: number;
	matchStats: MatchStatsWithMatch[];
}) {
	const golesPerMatch = matchCount > 0 ? (stats.goles_totales / matchCount).toFixed(1) : "0.0";
	const tirosPerMatch = matchCount > 0 ? (stats.tiros_totales / matchCount).toFixed(1) : "0.0";
	const eficienciaGeneral = stats.tiros_totales > 0 ? ((stats.goles_totales / stats.tiros_totales) * 100).toFixed(1) : "0.0";
	const asistPerMatch = matchCount > 0 ? (stats.acciones_asistencias / matchCount).toFixed(1) : "0.0";

	const totalExclusiones =
		stats.faltas_exp_20_1c1 +
		stats.faltas_exp_20_boya +
		(stats.faltas_exp_3_bruta || 0) +
		(stats.faltas_exp_3_int || 0) +
		(stats.faltas_exp_simple || 0);

	const totalRebotes = (stats.rebote_recup_hombre_mas || 0) + (stats.rebote_perd_hombre_mas || 0);
	const totalPenaltis = stats.goles_penalti_anotado + stats.tiros_penalti_fallado;
	const eficienciaPenaltis = totalPenaltis > 0 ? ((stats.goles_penalti_anotado / totalPenaltis) * 100).toFixed(1) : "0.0";

	const items = buildFieldPlayerKpis({
		matchCount,
		stats,
		eficienciaGeneral,
		totalExclusiones,
		golesPerMatch
	});

	const matches = Array.isArray(matchStats)
		? matchStats
				.map((s) => s.matches)
				.filter(Boolean)
				.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
		: [];

	const statsPerMatch = Array.isArray(matchStats) ? matchStats.map(({ matches, ...rest }) => rest) : [];

	return (
		<div className="space-y-6 mb-6">
			<KpiGrid items={items} />
			<StatsCharts6x6 matches={matches} stats={statsPerMatch} />
		</div>
	);
}

function GoalkeeperPage({ player, matchStats, goalkeeperShots }: { player: Player; matchStats: MatchStatsWithMatch[]; goalkeeperShots: any[] }) {
	const matchCount = matchStats.length;

	const goalkeeperStats = calculateGoalkeeperStats(matchStats);
	const chartShots: GoalkeeperShotForChart[] = (goalkeeperShots ?? []).map((s: any) => ({
		id: s.id,
		goalkeeper_player_id: Number(s.goalkeeper_player_id),
		x: Number(s.x),
		y: Number(s.y),
		result: s.result === "save" ? "save" : "goal"
	}));

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/jugadores">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a Jugadores
					</Link>
				</Button>

				<PlayerHeroHeader player={player} roleLabel="Portero" statTotals={goalkeeperStats} />
			</div>

			<Tabs defaultValue="resumen" className="space-y-6">
				<TabsList className="grid w-full grid-cols-3 md:grid-cols-3 h-auto gap-1">
					<TabsTrigger value="resumen" className="text-xs md:text-sm py-2">
						Rendimiento
					</TabsTrigger>
					<TabsTrigger value="partidos" className="text-xs md:text-sm py-2">
						Rendimiento por Partido
					</TabsTrigger>
					<TabsTrigger value="evolucion" className="text-xs md:text-sm py-2">
						Evolución
					</TabsTrigger>
				</TabsList>

				<TabsContent value="resumen" className="space-y-6">
					<GoalkeeperSummary stats={goalkeeperStats} matchCount={matchCount} matchStats={matchStats} />
				</TabsContent>

				<TabsContent value="partidos" className="space-y-6">
					<GoalkeeperMatchStatsClient matchStats={matchStats} player={player} />
				</TabsContent>

				<TabsContent value="evolucion" className="space-y-6">
					<GoalkeeperShotsGoalChart shots={chartShots} goalkeeperPlayerId={player.id} />
					<GoalkeeperEvolutionChart matchStats={matchStats} />
				</TabsContent>
			</Tabs>
		</main>
	);
}

function calculateGoalkeeperStats(matchStats: MatchStatsWithMatch[]) {
	return matchStats.reduce(
		(acc, stat) => {
			const match = stat.matches;
			// Real goals received from match score
			const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0;

			return {
				// Goles encajados
				portero_goles_boya_parada: acc.portero_goles_boya_parada + (stat.portero_goles_boya_parada || 0),
				portero_goles_hombre_menos: acc.portero_goles_hombre_menos + (stat.portero_goles_hombre_menos || 0),
				portero_goles_dir_mas_5m: acc.portero_goles_dir_mas_5m + (stat.portero_goles_dir_mas_5m || 0),
				portero_goles_contraataque: acc.portero_goles_contraataque + (stat.portero_goles_contraataque || 0),
				portero_goles_penalti: acc.portero_goles_penalti + (stat.portero_goles_penalti || 0),
				portero_gol: acc.portero_gol + (stat.portero_gol || 0),
				portero_gol_superioridad: acc.portero_gol_superioridad + (stat.portero_gol_superioridad || 0),
				portero_fallo_superioridad: acc.portero_fallo_superioridad + (stat.portero_fallo_superioridad || 0),

				// Paradas
				portero_paradas_totales: acc.portero_paradas_totales + (stat.portero_paradas_totales || 0),
				portero_tiros_parada_recup: acc.portero_tiros_parada_recup + (stat.portero_tiros_parada_recup || 0),
				portero_paradas_fuera: acc.portero_paradas_fuera + (stat.portero_paradas_fuera || 0),
				portero_paradas_penalti_parado: acc.portero_paradas_penalti_parado + (stat.portero_paradas_penalti_parado || 0),
				portero_paradas_hombre_menos: acc.portero_paradas_hombre_menos + (stat.portero_paradas_hombre_menos || 0),

				lanz_recibido_fuera: acc.lanz_recibido_fuera + (stat.lanz_recibido_fuera || 0),

				// Acciones
				acciones_asistencias: acc.acciones_asistencias + (stat.acciones_asistencias || 0),
				acciones_recuperacion: acc.acciones_recuperacion + (stat.acciones_recuperacion || 0),
				portero_acciones_perdida_pos: acc.portero_acciones_perdida_pos + (stat.portero_acciones_perdida_pos || 0),
				acciones_exp_provocada: acc.acciones_exp_provocada + (stat.acciones_exp_provocada || 0),

				// Goles recibidos reales del marcador del partido
				goles_recibidos_reales: acc.goles_recibidos_reales + rivalGoals
			};
		},
		{
			portero_goles_boya_parada: 0,
			portero_goles_hombre_menos: 0,
			portero_goles_dir_mas_5m: 0,
			portero_goles_contraataque: 0,
			portero_goles_penalti: 0,
			portero_gol: 0,
			portero_gol_superioridad: 0,
			portero_fallo_superioridad: 0,

			portero_paradas_totales: 0,
			portero_tiros_parada_recup: 0,
			portero_paradas_fuera: 0,
			portero_paradas_penalti_parado: 0,
			portero_paradas_hombre_menos: 0,
			lanz_recibido_fuera: 0,

			acciones_asistencias: 0,
			acciones_recuperacion: 0,
			portero_acciones_perdida_pos: 0,
			acciones_exp_provocada: 0,

			goles_recibidos_reales: 0
		}
	);
}

function GoalkeeperSummary({ stats, matchCount, matchStats }: { stats: any; matchCount: number; matchStats: MatchStatsWithMatch[] }) {
	const totalShots = stats.portero_paradas_totales + stats.goles_recibidos_reales;
	const savePercentage = totalShots > 0 ? ((stats.portero_paradas_totales / totalShots) * 100).toFixed(1) : "0.0";
	const paradasPerMatch = matchCount > 0 ? (stats.portero_paradas_totales / matchCount).toFixed(1) : "0.0";
	const golesPerMatch = matchCount > 0 ? (stats.goles_recibidos_reales / matchCount).toFixed(1) : "0.0";

	const penaltiesAttempted = stats.portero_paradas_penalti_parado + stats.portero_goles_penalti;
	const penaltySaveRate = penaltiesAttempted > 0 ? ((stats.portero_paradas_penalti_parado / penaltiesAttempted) * 100).toFixed(1) : "0.0";

	const items = buildGoalkeeperKpis({
		matchCount,
		stats,
		savePercentage,
		paradasPerMatch,
		golesPerMatch
	});

	const matches = Array.isArray(matchStats)
		? matchStats
				.map((s) => s.matches)
				.filter((m) => m?.id != null)
				.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
		: [];

	const statsPerMatch = Array.isArray(matchStats) ? matchStats.map(({ matches, ...rest }) => rest) : [];

	return (
		<div className="space-y-6 mb-6">
			<KpiGridGoalkeeper items={items} className="xl:grid-cols-6" />
			<StatsChartsGoalkeeper matches={matches} stats={statsPerMatch} />
		</div>
	);
}
