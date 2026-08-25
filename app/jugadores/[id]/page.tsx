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
import { ExportPlayerPdfButton } from "@/components/export-buttons/export-player-pdf-button";
import { ExportPlayerExcelButton } from "@/components/export-buttons/export-player-excel-button";
import { getCurrentProfile } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { getOpponentScore } from "@/lib/matches/score";
import { SeasonSelector } from "@/components/season-selector";

interface MatchStatsWithMatch extends MatchStats {
	matches: Match;
}

export default async function PlayerDetailPage({
	params,
	searchParams
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ season?: string | string[] }>;
}) {
	const { id } = await params;
	const requestedSeasonValue = (await searchParams).season;
	const requestedSeason = Array.isArray(requestedSeasonValue) ? requestedSeasonValue[0] : requestedSeasonValue;
	const supabase = await createClient();
	const profile = await getCurrentProfile();
	if (!supabase || !profile) notFound();

	const hiddenStatsSet = await getHiddenStatsSet(supabase, profile.id);

	let playerQuery = supabase.from("players").select("*").eq("id", id);
	if (!profile.is_super_admin) {
		if (!profile.club_id) notFound();
		playerQuery = playerQuery.eq("club_id", profile.club_id);
	}
	const { data: player, error: playerError } = await playerQuery.single();
	if (playerError || !player) notFound();

	const { data: managedSeasons } = await supabase
		.from("club_seasons")
		.select("id, name, status, start_year")
		.eq("club_id", player.club_id)
		.order("start_year", { ascending: false });
	let seasonRows = managedSeasons ?? [];
	if (seasonRows.length === 0) {
		const { data: historicalSeasons } = await supabase
			.from("matches")
			.select("season")
			.eq("club_id", player.club_id)
			.not("season", "is", null)
			.order("match_date", { ascending: false });
		seasonRows = Array.from(new Set((historicalSeasons ?? []).map((row) => String(row.season)))).map((name, index) => ({ id: 0, name, status: index === 0 ? "active" : "archived", start_year: 0 }));
	}
	const seasons = seasonRows.map((season) => String(season.name));
	const activeSeason = seasonRows.find((season) => season.status === "active")?.name ?? seasons[0];
	const selectedSeason = requestedSeason && seasons.includes(requestedSeason) ? requestedSeason : activeSeason;
	const selectedSeasonRow = seasonRows.find((season) => season.name === selectedSeason);

	let seasonalPlayer = player;
	if (selectedSeasonRow?.id) {
		const { data: rosterEntry } = await supabase
			.from("player_seasons")
			.select("number, is_goalkeeper")
			.eq("club_season_id", selectedSeasonRow.id)
			.eq("player_id", player.id)
			.maybeSingle();
		if (rosterEntry) seasonalPlayer = { ...player, number: rosterEntry.number, is_goalkeeper: rosterEntry.is_goalkeeper };
	}

	let matchStatsQuery = supabase
		.from("match_stats")
		.select(`*, matches!inner (*)`)
		.eq("player_id", id)
		.eq("matches.stats_enabled", true);
	if (selectedSeason) matchStatsQuery = matchStatsQuery.eq("matches.season", selectedSeason);
	const { data: matchStats } = await matchStatsQuery.order("matches(match_date)", { ascending: false });

	const enabledMatchIds = (matchStats ?? []).map((stat) => stat.match_id);
	const { data: goalkeeperShots } = seasonalPlayer.is_goalkeeper && enabledMatchIds.length > 0
		? await supabase.from("goalkeeper_shots").select("*").eq("goalkeeper_player_id", id).in("match_id", enabledMatchIds).order("shot_index", { ascending: true })
		: { data: [] as any[] };

	if (seasonalPlayer.is_goalkeeper) {
		return <GoalkeeperPage player={seasonalPlayer} matchStats={matchStats || []} goalkeeperShots={goalkeeperShots || []} hiddenStats={hiddenStatsSet} seasons={seasons} selectedSeason={selectedSeason ?? ""} />;
	}

	return <FieldPlayerPage player={seasonalPlayer} matchStats={matchStats || []} hiddenStats={hiddenStatsSet} seasons={seasons} selectedSeason={selectedSeason ?? ""} />;
}

async function getHiddenStatsSet(supabase: Awaited<ReturnType<typeof createClient>>, profileId?: string) {
	if (!supabase || !profileId) return new Set<string>();

	const { data, error } = await supabase.from("profile_hidden_stats").select("stat_key").eq("profile_id", profileId);

	if (error || !data) return new Set<string>();

	return new Set(data.map((row) => row.stat_key));
}

async function FieldPlayerPage({ player, matchStats, hiddenStats, seasons, selectedSeason }: { player: Player; matchStats: MatchStatsWithMatch[]; hiddenStats: Set<string>; seasons: string[]; selectedSeason: string }) {
	const t = await getTranslations("PlayerDetail");
	const matchCount = matchStats.length;
	const fieldPlayerStats = calculateFieldPlayerStats(matchStats, hiddenStats);

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Button variant="ghost" asChild>
						<Link href="/jugadores">
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("backToPlayers")}
						</Link>
					</Button>

					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						{seasons.length > 0 && <SeasonSelector seasons={seasons} selectedSeason={selectedSeason} />}
						<ExportPlayerPdfButton playerId={player.id} season={selectedSeason} />
						<ExportPlayerExcelButton playerId={player.id} season={selectedSeason} />
					</div>
				</div>

				<PlayerHeroHeader player={player} roleLabel={t("fieldPlayer")} statTotals={fieldPlayerStats as Record<string, number>} />
			</div>

			<Tabs defaultValue="resumen" className="space-y-6">
				<TabsList className="grid w-full grid-cols-3 md:grid-cols-3 h-auto gap-1">
					<TabsTrigger value="resumen" className="text-xs md:text-sm py-2">
						{t("summary")}
					</TabsTrigger>
					<TabsTrigger value="partidos" className="text-xs md:text-sm py-2">
						{t("matchPerformance")}
					</TabsTrigger>
					<TabsTrigger value="evolucion" className="text-xs md:text-sm py-2">
						{t("evolution")}
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
					<ChartSwipeCarousel className="w-full" items={[<PerformanceEvolutionChart key="performance" matchStats={matchStats} player={player} />]} />
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
			<div className="space-y-6 mb-6">
				<FieldPlayerTotalsCard stats={stats} matchCount={matchCount} playerId={playerId} hiddenStats={hiddenStats} />
			</div>
		</div>
	);
}

async function GoalkeeperPage({
	player,
	matchStats,
	goalkeeperShots,
	hiddenStats,
	seasons,
	selectedSeason
}: {
	player: Player;
	matchStats: MatchStatsWithMatch[];
	goalkeeperShots: any[];
	hiddenStats: Set<string>;
	seasons: string[];
	selectedSeason: string;
}) {
	const t = await getTranslations("PlayerDetail");
	const matchCount = matchStats.length;

	const goalkeeperStats = calculateGoalkeeperStats(matchStats, hiddenStats);
	const chartShots: GoalkeeperShotForChart[] = (goalkeeperShots ?? []).map((s: any) => ({
		id: s.id,
		match_id: s.match_id,
		goalkeeper_player_id: Number(s.goalkeeper_player_id),
		x: Number(s.x),
		y: Number(s.y),
		result: s.result === "save" ? "save" : "goal"
	}));

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Button variant="ghost" asChild>
						<Link href="/jugadores">
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("backToPlayers")}
						</Link>
					</Button>

					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						{seasons.length > 0 && <SeasonSelector seasons={seasons} selectedSeason={selectedSeason} />}
						<ExportPlayerPdfButton playerId={player.id} season={selectedSeason} />
						<ExportPlayerExcelButton playerId={player.id} season={selectedSeason} />
					</div>
				</div>

				<PlayerHeroHeader player={player} roleLabel={t("goalkeeper")} statTotals={goalkeeperStats as Record<string, number>} />
			</div>

			<Tabs defaultValue="resumen" className="space-y-6">
				<TabsList className="grid w-full grid-cols-3 md:grid-cols-3 h-auto gap-1">
					<TabsTrigger value="resumen" className="text-xs md:text-sm py-2">
						{t("performance")}
					</TabsTrigger>
					<TabsTrigger value="partidos" className="text-xs md:text-sm py-2">
						{t("matchPerformance")}
					</TabsTrigger>
					<TabsTrigger value="evolucion" className="text-xs md:text-sm py-2">
						{t("evolution")}
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
							<GoalkeeperShotsGoalChartSimple key="shots" shots={chartShots} goalkeeperPlayerId={player.id} />,
							<PerformanceEvolutionChart key="performance" matchStats={matchStats} player={player} />
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
				const rivalGoals = match ? getOpponentScore(match) : 0;
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
			<div className="space-y-6 mb-6">
				<GoalkeeperTotalsCard stats={stats} matchCount={matchCount} playerId={playerId} hiddenStats={hiddenStats} />
			</div>
		</div>
	);
}
