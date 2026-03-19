import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Player, MatchStats, Match } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { PlayerHeroHeader } from "./playerHeader";
import { PerformanceEvolutionChart } from "@/components/analytics-player/evolution-component/PerformanceEvolutionChart";
import {
	GoalkeeperShotForChart,
	GoalkeeperShotsGoalChartSimple
} from "@/components/analytics-goalkeeper/evolution-component/GoalkeepersShotsEvolutions";
import { FieldPlayerMatchStatsClient } from "./FieldPlayerMatchStatsClient";
import { GoalkeeperMatchStatsClient } from "./GoalkeeperMatchStatsClient";
import { ChartSwipeCarousel } from "@/components/chartCarousel";
import { FieldPlayerTotalsCard } from "@/components/analytics-player/total-stats-player/PlayerTotals";
import { GoalkeeperTotalsCard } from "@/components/analytics-goalkeeper/total-stats-goalkeeper/GoalkeeperTotals";

import { accumulatePlayerStats, getPlayerDerived } from "@/lib/stats/playerStatsHelpers";
import { accumulateGoalkeeperStats, getGoalkeeperDerived, n as gkN } from "@/lib/stats/goalkeeperStatsHelpers";

interface MatchStatsWithMatch extends MatchStats {
	matches: Match;
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createClient();

	const {
		data: { user }
	} = await supabase.auth.getUser();

	const hiddenStatsSet = await getHiddenStatsSet(supabase, user?.id);

	const { data: player, error: playerError } = await supabase.from("players").select("*").eq("id", id).single();
	if (playerError || !player) notFound();

	const { data: matchStats } = await supabase
		.from("match_stats")
		.select(`*, matches (*)`)
		.eq("player_id", id)
		.order("matches(match_date)", { ascending: false });

	const { data: goalkeeperShots } = player.is_goalkeeper
		? await supabase.from("goalkeeper_shots").select("*").eq("goalkeeper_player_id", id).order("shot_index", { ascending: true })
		: { data: [] as any[] };

	if (player.is_goalkeeper) {
		return <GoalkeeperPage player={player} matchStats={matchStats || []} goalkeeperShots={goalkeeperShots || []} hiddenStats={hiddenStatsSet} />;
	}

	return <FieldPlayerPage player={player} matchStats={matchStats || []} hiddenStats={hiddenStatsSet} />;
}

async function getHiddenStatsSet(supabase: Awaited<ReturnType<typeof createClient>>, profileId?: string) {
	if (!profileId) return new Set<string>();

	const { data, error } = await supabase.from("profile_hidden_stats").select("stat_key").eq("profile_id", profileId);

	if (error || !data) return new Set<string>();

	return new Set(data.map((row) => row.stat_key));
}

function FieldPlayerPage({ player, matchStats, hiddenStats }: { player: Player; matchStats: MatchStatsWithMatch[]; hiddenStats: Set<string> }) {
	const matchCount = matchStats.length;
	const fieldPlayerStats = calculateFieldPlayerStats(matchStats, hiddenStats);

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/jugadores">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a Jugadores
					</Link>
				</Button>

				<PlayerHeroHeader player={player} roleLabel="Jugador de Campo" statTotals={fieldPlayerStats as Record<string, number>} />
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
					<FieldPlayerSummary
						stats={fieldPlayerStats}
						matchCount={matchCount}
						matchStats={matchStats}
						playerId={player.id}
						hiddenStats={hiddenStats}
					/>
				</TabsContent>

				<TabsContent value="partidos" className="space-y-6">
					<FieldPlayerMatchStatsClient matchStats={matchStats} player={player} hiddenStats={hiddenStats} />
				</TabsContent>

				<TabsContent value="evolucion" className="space-y-6">
					<ChartSwipeCarousel className="w-full" items={[<PerformanceEvolutionChart matchStats={matchStats} player={player} />]} />
				</TabsContent>
			</Tabs>
		</main>
	);
}

function calculateFieldPlayerStats(matchStats: MatchStatsWithMatch[], hiddenStats: Set<string>) {
	return accumulatePlayerStats(matchStats as Array<Record<string, any>>, hiddenStats);
}

function FieldPlayerSummary({
	stats,
	matchCount,
	matchStats,
	playerId,
	hiddenStats
}: {
	stats: Record<string, any>;
	matchCount: number;
	matchStats: MatchStatsWithMatch[];
	playerId: number;
	hiddenStats: Set<string>;
}) {
	const derived = getPlayerDerived(stats, hiddenStats);

	const golesPerMatch = matchCount > 0 ? (derived.goals / matchCount).toFixed(1) : "0.0";
	const tirosPerMatch = matchCount > 0 ? (derived.shots / matchCount).toFixed(1) : "0.0";
	const eficienciaGeneral = derived.efficiency.toFixed(1);
	const asistPerMatch = matchCount > 0 ? (derived.assists / matchCount).toFixed(1) : "0.0";

	const totalExclusiones =
		(hiddenStats.has("faltas_exp_20_1c1") ? 0 : stats.faltas_exp_20_1c1 || 0) +
		(hiddenStats.has("faltas_exp_20_boya") ? 0 : stats.faltas_exp_20_boya || 0) +
		(hiddenStats.has("faltas_exp_3_bruta") ? 0 : stats.faltas_exp_3_bruta || 0) +
		(hiddenStats.has("faltas_exp_3_int") ? 0 : stats.faltas_exp_3_int || 0) +
		(hiddenStats.has("faltas_exp_simple") ? 0 : stats.faltas_exp_simple || 0) +
		(hiddenStats.has("exp_trans_def") ? 0 : stats.exp_trans_def || 0);

	const totalRebotes =
		(hiddenStats.has("rebote_recup_hombre_mas") ? 0 : stats.rebote_recup_hombre_mas || 0) +
		(hiddenStats.has("rebote_perd_hombre_mas") ? 0 : stats.rebote_perd_hombre_mas || 0);

	const totalPenaltis =
		(hiddenStats.has("goles_penalti_anotado") ? 0 : stats.goles_penalti_anotado || 0) +
		(hiddenStats.has("tiros_penalti_fallado") ? 0 : stats.tiros_penalti_fallado || 0);

	const eficienciaPenaltis =
		totalPenaltis > 0
			? (((hiddenStats.has("goles_penalti_anotado") ? 0 : stats.goles_penalti_anotado || 0) / totalPenaltis) * 100).toFixed(1)
			: "0.0";

	const matches = Array.isArray(matchStats)
		? matchStats
				.map((s) => s.matches)
				.filter(Boolean)
				.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
		: [];

	const statsPerMatch = Array.isArray(matchStats) ? matchStats.map(({ matches, ...rest }) => rest) : [];

	return (
		<div className="space-y-6 mb-6">
			<FieldPlayerTotalsCard stats={stats} matchCount={matchCount} playerId={playerId} hiddenStats={hiddenStats} />
		</div>
	);
}

function GoalkeeperPage({
	player,
	matchStats,
	goalkeeperShots,
	hiddenStats
}: {
	player: Player;
	matchStats: MatchStatsWithMatch[];
	goalkeeperShots: any[];
	hiddenStats: Set<string>;
}) {
	const matchCount = matchStats.length;

	const goalkeeperStats = calculateGoalkeeperStats(matchStats, hiddenStats);
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

				<PlayerHeroHeader player={player} roleLabel="Portero" statTotals={goalkeeperStats as Record<string, number>} />
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
					<GoalkeeperSummary
						stats={goalkeeperStats}
						matchCount={matchCount}
						matchStats={matchStats}
						playerId={player.id}
						hiddenStats={hiddenStats}
					/>
				</TabsContent>

				<TabsContent value="partidos" className="space-y-6">
					<GoalkeeperMatchStatsClient matchStats={matchStats} player={player} hiddenStats={hiddenStats} />
				</TabsContent>

				<TabsContent value="evolucion" className="space-y-6">
					<ChartSwipeCarousel
						className="w-full"
						items={[
							<GoalkeeperShotsGoalChartSimple shots={chartShots} goalkeeperPlayerId={player.id} />,
							<PerformanceEvolutionChart matchStats={matchStats} player={player} />
						]}
					/>
				</TabsContent>
			</Tabs>
		</main>
	);
}

function calculateGoalkeeperStats(matchStats: MatchStatsWithMatch[], hiddenStats: Set<string>) {
	const base = accumulateGoalkeeperStats(matchStats as Array<Record<string, any>>, hiddenStats);

	const goles_recibidos_reales = hiddenStats.has("goles_recibidos_reales")
		? 0
		: matchStats.reduce((acc, stat) => {
				const match = stat.matches;
				const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0;
				return acc + gkN(rivalGoals);
			}, 0);

	return {
		...base,
		goles_recibidos_reales
	};
}

function GoalkeeperSummary({
	stats,
	matchCount,
	matchStats,
	playerId,
	hiddenStats
}: {
	stats: Record<string, any>;
	matchCount: number;
	matchStats: MatchStatsWithMatch[];
	playerId: number;
	hiddenStats: Set<string>;
}) {
	const derived = getGoalkeeperDerived(stats, hiddenStats);

	const totalShots = derived.shotsReceived;
	const savePercentage = derived.savePct.toFixed(1);
	const paradasPerMatch = matchCount > 0 ? (derived.saves / matchCount).toFixed(1) : "0.0";
	const golesPerMatch = matchCount > 0 ? (derived.goalsConceded / matchCount).toFixed(1) : "0.0";
	const penaltiesAttempted = derived.penaltyAttempts;
	const penaltySaveRate = derived.penaltySavePct.toFixed(1);

	const matches = Array.isArray(matchStats)
		? matchStats
				.map((s) => s.matches)
				.filter((m) => m?.id != null)
				.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
		: [];

	const statsPerMatch = Array.isArray(matchStats) ? matchStats.map(({ matches, ...rest }) => rest) : [];

	return (
		<div className="space-y-6 mb-6">
			<GoalkeeperTotalsCard stats={stats} matchCount={matchCount} playerId={playerId} hiddenStats={hiddenStats} />
		</div>
	);
}
