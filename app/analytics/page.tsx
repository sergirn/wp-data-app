"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClub } from "@/lib/club-context";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TeamDashboard } from "@/components/team-dashboard/TeamDashboard";
import { GeneralDashboard } from "@/components/analytics/general-analytics/general-dashboard";
import { ShootingEfficiencyChart } from "@/components/analytics/attack-analytics/shooting-efficiency-chart";
import { GoalkeeperPerformanceChart } from "@/components/analytics/goalkeeper-analytics/goalkeeper-performance-chart";
import { ManAdvantageChartExpandable } from "@/components/analytics/attack-analytics/man-advantage-chart";
import { GoalkeeperShotsGoalChart } from "@/components/analytics-goalkeeper/GoalkeeperShotsGoalChart";
import { ShotMistakesDonutChart } from "@/components/analytics/attack-analytics/quality-shoot-chart";
import { GoalMixChart } from "@/components/analytics/attack-analytics/offensive-shoot-chart";
import { SeasonAttackTotals, SeasonDefenseTotals, SeasonGoalkeeperTotals } from "@/components/analytics/general-analytics/SeassonTotalsTabs";
import { AttackGoalTypesByMatchChart } from "@/components/analytics/attack-analytics/AttackGoalTypesByMatchChart";
import { AttackMistakeTypesByMatchChart } from "@/components/analytics/attack-analytics/AttackMistakeTypesByMatchChart";
import { AttackCreationVsLossesChart } from "@/components/analytics/attack-analytics/AttackCreationVsLossesChart";
import { AttackBoyaFlowChart } from "@/components/analytics/attack-analytics/AttackBoyaFlowChart";
import { TopScorersTable } from "@/components/analytics/attack-analytics/TopScorersTable";
import { DefenseFoulsMixChart } from "@/components/analytics/defense-analytics/DefenseFoulsMixChart";
import { DefenseInferiorityMixChart } from "@/components/analytics/defense-analytics/DefenseInferiorityMixChart";
import { DefenseFoulsByMatchChart } from "@/components/analytics/defense-analytics/DefenseFoulsByMatchChart";
import { DefenseInferiorityEfficiencyChart } from "@/components/analytics/defense-analytics/DefenseInferiorityEfficiencyChart";
import { DefenseActionsByMatchChart } from "@/components/analytics/defense-analytics/DefenseActionsByMatchChart";
import { DefenseBalanceChart } from "@/components/analytics/defense-analytics/DefenseBalanceChart";
import { TopDefendersTable } from "@/components/analytics/defense-analytics/TopDefenseTable";
import { GoalkeeperGoalsMixChart } from "@/components/analytics/goalkeeper-analytics/GoalkeeperGoalsMixChart";
import { GoalkeeperSavesMixChart } from "@/components/analytics/goalkeeper-analytics/GoalkeeperSavesMixChart";
import { GoalkeeperInferiorityEfficiencyChart } from "@/components/analytics/goalkeeper-analytics/GoalkeeperInferiorityEfficiencyChart";
import { GoalkeeperGoalsByTypeChart } from "@/components/analytics/goalkeeper-analytics/GoalkeeperGoalsByTypeChart";
import { GoalkeeperRankingTable } from "@/components/analytics/goalkeeper-analytics/TopGoalkeepersTable";
import { GitCompareArrows, LayoutGrid, Target, Shield, Hand } from "lucide-react";
import { useHiddenStats } from "@/hooks/useHiddenStats";
import { useTranslations } from "next-intl";
import { SeasonSelector } from "@/components/season-selector";
import { TeamTrendsPanel } from "@/components/analysis/TeamTrendsPanel";
import { SeasonObjectivesPanel } from "@/components/analysis/SeasonObjectivesPanel";
import { DEFAULT_ANALYSIS_THRESHOLDS, type AnalysisThresholds } from "@/lib/analysis/performance-insights";
import { SeasonPlayerComparator } from "@/components/analytics/player-comparator/SeasonPlayerComparator";
import { SeasonMatchComparator } from "@/components/analytics/match-comparator/SeasonMatchComparator";
import { PlayerMatchComparator } from "@/components/analytics/player-match-comparator/PlayerMatchComparator";

type GoalkeeperShotRow = {
	id: number;
	match_id: number;
	goalkeeper_player_id: number;
	result: "goal" | "save" | "out";
	x: number;
	y: number;
	created_at: string;
};

export default function AnalyticsPage() {
	const t = useTranslations("Pages");
	const a = useTranslations("AnalyticsPage");
	const { currentClub } = useClub();
	const searchParams = useSearchParams();
	const seasonParam = searchParams.get("season");

	const [seasons, setSeasons] = useState<string[]>([]);
	const [selectedSeason, setSelectedSeason] = useState<string>("");
	const [matches, setMatches] = useState<any[]>([]);
	const [players, setPlayers] = useState<any[]>([]);
	const [allStats, setAllStats] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [goalkeeperShotsRows, setGoalkeeperShotsRows] = useState<GoalkeeperShotRow[]>([]);
	const [analysisThresholds, setAnalysisThresholds] = useState<AnalysisThresholds>(DEFAULT_ANALYSIS_THRESHOLDS);

	const hiddenStatsState = useHiddenStats();
	const hiddenStats = useMemo(() => Object.keys(hiddenStatsState.hiddenStats), [hiddenStatsState.hiddenStats]);

	useEffect(() => {
		const abortController = new AbortController();
		let isMounted = true;

		async function fetchData() {
			if (!currentClub) {
				setLoading(false);
				return;
			}

			setLoading(true);

			try {
				const supabase = createClient();

				const [seasonsResult, managedSeasonsResult, playersResult, settingsResult] = await Promise.all([
					supabase
						.from("matches")
						.select("season")
						.eq("club_id", currentClub.id)
						.not("season", "is", null)
						.order("season", { ascending: false }),
					supabase.from("club_seasons").select("name, status, start_year").eq("club_id", currentClub.id).order("start_year", { ascending: false }),
					supabase.from("players").select("*").eq("club_id", currentClub.id),
					supabase.from("club_analysis_settings").select("shooting_efficiency_target, power_play_target, turnover_warning, save_percentage_target, max_goals_against").eq("club_id", currentClub.id).maybeSingle()
				]);

				if (abortController.signal.aborted || !isMounted) return;

				const legacySeasons = [...new Set(seasonsResult.data?.map((m) => m.season).filter(Boolean))] as string[];
				const managedSeasons = managedSeasonsResult.error ? [] : (managedSeasonsResult.data ?? []).map((season) => season.name);
				const uniqueSeasons = [...new Set([...managedSeasons, ...legacySeasons])];
				setSeasons(uniqueSeasons);

				const activeSeason = managedSeasonsResult.error ? null : managedSeasonsResult.data?.find((season) => season.status === "active")?.name;
				const season = seasonParam && uniqueSeasons.includes(seasonParam) ? seasonParam : activeSeason || uniqueSeasons[0] || "2024-2025";
				setSelectedSeason(season);
				if (settingsResult.data) setAnalysisThresholds({
					shootingEfficiencyTarget: Number(settingsResult.data.shooting_efficiency_target),
					powerPlayTarget: Number(settingsResult.data.power_play_target),
					turnoverWarning: Number(settingsResult.data.turnover_warning),
					savePercentageTarget: Number(settingsResult.data.save_percentage_target),
					maxGoalsAgainst: Number(settingsResult.data.max_goals_against)
				});

				const [matchesResult, statsResult] = await Promise.all([
					supabase.from("matches").select("*").eq("club_id", currentClub.id).eq("season", season).order("match_date", { ascending: false }),
					supabase
						.from("match_stats")
						.select("*")
						.in(
							"match_id",
							(await supabase.from("matches").select("id").eq("club_id", currentClub.id).eq("season", season)).data?.map((m) => m.id) || []
						)
				]);

				if (abortController.signal.aborted || !isMounted) return;

				const matchIds = (matchesResult.data || []).map((m) => m.id);

				const { data: gkShotsData, error: gkShotsError } = await supabase
					.from("goalkeeper_shots")
					.select("id, match_id, goalkeeper_player_id, result, x, y, created_at")
					.in("match_id", matchIds)
					.order("created_at", { ascending: true });

				if (gkShotsError) console.error("Error fetching goalkeeper_shots:", gkShotsError);

				setMatches(matchesResult.data || []);
				setPlayers(playersResult.data || []);
				setAllStats(statsResult.data || []);
				setGoalkeeperShotsRows(gkShotsData || []);
			} catch (error) {
				if (!abortController.signal.aborted) console.error("Error fetching analytics:", error);
			} finally {
				if (isMounted) setLoading(false);
			}
		}

		fetchData();

		return () => {
			isMounted = false;
			abortController.abort();
		};
	}, [currentClub, seasonParam]);

	const enabledMatches = useMemo(() => {
		return (matches || []).filter((match) => match.stats_enabled !== false);
	}, [matches]);

	const enabledMatchIds = useMemo(() => {
		return new Set(enabledMatches.map((match) => match.id));
	}, [enabledMatches]);

	const enabledStats = useMemo(() => {
		return (allStats || []).filter((stat) => enabledMatchIds.has(stat.match_id));
	}, [allStats, enabledMatchIds]);

	const enabledGoalkeeperShotsRows = useMemo(() => {
		return (goalkeeperShotsRows || []).filter((row) => enabledMatchIds.has(row.match_id));
	}, [goalkeeperShotsRows, enabledMatchIds]);

	const enabledPlayerStats = useMemo(() => {
		return (players || []).map((player) => {
			const stats = enabledStats.filter((s) => s.player_id === player.id);

			const goles_totales = stats.reduce((sum, s) => sum + (s.goles_totales || 0), 0);
			const tiros_totales = stats.reduce((sum, s) => sum + (s.tiros_totales || 0), 0);
			const acciones_asistencias = stats.reduce((sum, s) => sum + (s.acciones_asistencias || 0), 0);
			const acciones_bloqueo = stats.reduce((sum, s) => sum + (s.acciones_bloqueo || 0), 0);
			const acciones_recuperacion = stats.reduce((sum, s) => sum + (s.acciones_recuperacion || 0), 0);
			const acciones_rebote = stats.reduce((sum, s) => sum + (s.acciones_rebote || 0), 0);

			const faltas_exp_3_bruta = stats.reduce((sum, s) => sum + (s.faltas_exp_3_bruta || 0), 0);
			const faltas_exp_3_int = stats.reduce((sum, s) => sum + (s.faltas_exp_3_int || 0), 0);
			const faltas_exp_20_1c1 = stats.reduce((sum, s) => sum + (s.faltas_exp_20_1c1 || 0), 0);
			const faltas_exp_20_boya = stats.reduce((sum, s) => sum + (s.faltas_exp_20_boya || 0), 0);
			const faltas_penalti = stats.reduce((sum, s) => sum + (s.faltas_penalti || 0), 0);

			const goles_penalti_anotado = stats.reduce((sum, s) => sum + (s.goles_penalti_anotado || 0), 0);
			const tiros_penalti_fallado = stats.reduce((sum, s) => sum + (s.tiros_penalti_fallado || 0), 0);

			const totalPerdidas = stats.reduce((sum, s) => sum + (s.acciones_perdida_poco || 0) + (s.portero_acciones_perdida_pos || 0), 0);
			const eficiencia = tiros_totales > 0 ? Math.round((goles_totales / tiros_totales) * 100) : 0;

			const portero_paradas_totales = stats.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0);
			const portero_paradas_penalti_parado = stats.reduce((sum, s) => sum + (s.portero_paradas_penalti_parado || 0), 0);
			const portero_goles_totales = stats.reduce((sum, s) => sum + (s.portero_goles_totales || 0), 0);
			const portero_paradas_hombre_menos = stats.reduce((sum, s) => sum + (s.portero_paradas_hombre_menos || 0), 0);
			const portero_goles_hombre_menos = stats.reduce((sum, s) => sum + (s.portero_goles_hombre_menos || 0), 0);
			const portero_inferioridad_fuera = stats.reduce((sum, s) => sum + (s.portero_inferioridad_fuera || 0), 0);
			const portero_inferioridad_bloqueo = stats.reduce((sum, s) => sum + (s.portero_inferioridad_bloqueo || 0), 0);

			return {
				...player,
				goles_totales,
				tiros_totales,
				acciones_asistencias,
				acciones_bloqueo,
				acciones_recuperacion,
				acciones_rebote,
				faltas_exp_3_bruta,
				faltas_exp_3_int,
				faltas_exp_20_1c1,
				faltas_exp_20_boya,
				faltas_penalti,
				goles_penalti_anotado,
				tiros_penalti_fallado,
				totalGoles: goles_totales,
				totalTiros: tiros_totales,
				totalAsistencias: acciones_asistencias,
				totalBloqueos: acciones_bloqueo,
				totalPerdidas,
				eficiencia,
				matchesPlayed: stats.length,
				partidos: stats.length,
				portero_paradas_totales,
				portero_paradas_penalti_parado,
				portero_goles_totales,
				portero_paradas_hombre_menos,
				portero_goles_hombre_menos,
				portero_inferioridad_fuera,
				portero_inferioridad_bloqueo
			};
		});
	}, [players, enabledStats]);

	if (loading || !hiddenStatsState.loaded) {
		return (
			<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
				<div className="text-center py-12">
					<p className="text-muted-foreground">{a("loading")}</p>
				</div>
			</main>
		);
	}

	return (
		<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
			<div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{t("analytics")}</h1>
					<p className="text-sm sm:text-base text-muted-foreground">
					{a("seasonDescription", { club: currentClub?.short_name || "", season: selectedSeason })}
					</p>
				</div>
				{seasons.length > 0 && <SeasonSelector seasons={seasons} selectedSeason={selectedSeason} />}
			</div>

			<section className="mb-8">
				<Tabs defaultValue="overview">
					<TabsList className="grid h-auto w-full grid-cols-5 gap-1 rounded-2xl border-border/85 bg-secondary/85 p-1 sm:gap-1.5 sm:p-1.5">
						<TabsTrigger
							value="overview"
							className="min-w-0 rounded-xl px-1.5 py-2.5 text-xs font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm md:px-3 md:py-3 md:text-sm"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<LayoutGrid className="h-4 w-4 shrink-0" />
								<span className="hidden md:inline">{a("overview")}</span>
							</div>
						</TabsTrigger>

						<TabsTrigger
							value="comparator"
							className="min-w-0 rounded-xl px-1.5 py-2.5 text-xs font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm md:px-3 md:py-3 md:text-sm"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<GitCompareArrows className="h-4 w-4 shrink-0" />
								<span className="hidden md:inline">{a("comparator")}</span>
							</div>
						</TabsTrigger>

						<TabsTrigger
							value="attack"
							className="min-w-0 rounded-xl px-1.5 py-2.5 text-xs font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm md:px-3 md:py-3 md:text-sm"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<Target className="h-4 w-4 shrink-0" />
							<span className="hidden md:inline">{a("attack")}</span>
							</div>
						</TabsTrigger>

						<TabsTrigger
							value="defense"
							className="min-w-0 rounded-xl px-1.5 py-2.5 text-xs font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm md:px-3 md:py-3 md:text-sm"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<Shield className="h-4 w-4 shrink-0" />
							<span className="hidden md:inline">{a("defense")}</span>
							</div>
						</TabsTrigger>

						<TabsTrigger
							value="goalkeeper"
							className="min-w-0 rounded-xl px-1.5 py-2.5 text-xs font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm md:px-3 md:py-3 md:text-sm"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<Hand className="h-4 w-4 shrink-0" />
							<span className="hidden md:inline">{a("goalkeeper")}</span>
							</div>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="mt-4 space-y-10">
						<section>
							<GeneralDashboard matches={enabledMatches} stats={enabledStats} players={players || []} />
						</section>

						<TeamTrendsPanel matches={enabledMatches} stats={enabledStats} players={players || []} />

						<SeasonObjectivesPanel matches={enabledMatches} stats={enabledStats} players={players || []} thresholds={analysisThresholds} clubId={currentClub?.id ?? 0} />

						<section>
							<TeamDashboard teamStats={enabledPlayerStats} />
						</section>

					</TabsContent>

					<TabsContent value="comparator" className="mt-4">
						<Tabs defaultValue="players" className="space-y-4">
							<TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-secondary/85 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:w-fit lg:min-w-[600px] lg:grid-cols-3">
								<TabsTrigger value="players" className="min-w-40 flex-none rounded-lg px-4 py-2.5 text-xs sm:text-sm lg:min-w-0">
									{a("playerComparator")}
								</TabsTrigger>
								<TabsTrigger value="matches" className="min-w-40 flex-none rounded-lg px-4 py-2.5 text-xs sm:text-sm lg:min-w-0">
									{a("matchComparator")}
								</TabsTrigger>
								<TabsTrigger value="player-matches" className="min-w-44 flex-none rounded-lg px-2 py-2.5 text-xs sm:px-4 sm:text-sm lg:min-w-0">
									{a("playerMatchComparator")}
								</TabsTrigger>
							</TabsList>
							<TabsContent value="players" className="mt-0">
								<SeasonPlayerComparator players={players || []} stats={enabledStats} season={selectedSeason} hiddenStats={hiddenStats} />
							</TabsContent>
							<TabsContent value="matches" className="mt-0">
								<SeasonMatchComparator matches={enabledMatches} stats={enabledStats} season={selectedSeason} />
							</TabsContent>
							<TabsContent value="player-matches" className="mt-0">
								<PlayerMatchComparator players={players || []} matches={enabledMatches} stats={enabledStats} season={selectedSeason} hiddenStats={hiddenStats} />
							</TabsContent>
						</Tabs>
					</TabsContent>

					<TabsContent value="attack" className="mt-4">
						<section>
							<div className="mb-5 rounded-2xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-4 sm:p-6">
								<div className="mb-2 flex items-center gap-2 text-primary"><Target className="size-5" /><span className="text-xs font-semibold uppercase tracking-[0.12em]">{a("attack")}</span></div>
								<h1 className="text-2xl font-bold sm:text-3xl">{a("attackTitle")}</h1>
								<p className="text-sm sm:text-base text-muted-foreground">
									{a("attackSeason", { club: currentClub?.short_name || "", season: selectedSeason })}
								</p>
							</div>

							<div className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4">
								<SeasonAttackTotals stats={enabledStats} hiddenStats={hiddenStats} />
							</div>

							<div className="mt-8 space-y-8 sm:mt-10">
								<div className="space-y-3 sm:space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("attackSummary")}</h2>
										<p className="text-sm text-muted-foreground">
											{a("attackSummaryDescription")}
										</p>
									</div>

									<div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-12">
										<div className="min-w-0 md:col-span-12 xl:col-span-8">
											<ShootingEfficiencyChart matches={enabledMatches} stats={enabledStats} hiddenStats={hiddenStats} />
										</div>
										<div className="min-w-0 md:col-span-6 xl:col-span-4">
											<GoalMixChart matches={enabledMatches} stats={enabledStats} players={players || []} hiddenStats={hiddenStats} />
										</div>
										<div className="min-w-0 md:col-span-6 xl:col-span-4">
											<ShotMistakesDonutChart matches={enabledMatches} stats={enabledStats} players={players || []} hiddenStats={hiddenStats} />
										</div>
										<div className="min-w-0 md:col-span-12 xl:col-span-8">
											<ManAdvantageChartExpandable
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("efficiencyByRound")}</h2>
										<p className="text-sm text-muted-foreground">{a("goalsAndMissesByRound")}</p>
									</div>

									<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
										<div className="h-full">
											<AttackGoalTypesByMatchChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>

										<div className="h-full">
											<AttackMistakeTypesByMatchChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("attackBuildUp")}</h2>
										<p className="text-sm text-muted-foreground">
											{a("attackBuildUpDescription")}
										</p>
									</div>

									<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
										<div className="h-full">
											<AttackCreationVsLossesChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>

										<div className="h-full">
											<AttackBoyaFlowChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("attackRanking")}</h2>
										<p className="text-sm text-muted-foreground">
											{a("attackRankingDescription")}
										</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<TopScorersTable
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>
							</div>
						</section>
					</TabsContent>

					<TabsContent value="defense" className="mt-4">
						<section>
							<div className="mb-5 rounded-2xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-4 sm:p-6">
								<div className="mb-2 flex items-center gap-2 text-primary"><Shield className="size-5" /><span className="text-xs font-semibold uppercase tracking-[0.12em]">{a("defense")}</span></div>
								<h1 className="text-2xl font-bold sm:text-3xl">{a("defenseTitle")}</h1>
								<p className="text-sm sm:text-base text-muted-foreground">
									{a("defenseSeason", { club: currentClub?.short_name || "", season: selectedSeason })}
								</p>
							</div>

							<div className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4">
								<SeasonDefenseTotals stats={enabledStats} hiddenStats={hiddenStats} />
							</div>

							<div className="mt-8 space-y-8 sm:mt-10">
								<div className="space-y-3 sm:space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("defenseSummary")}</h2>
										<p className="text-sm text-muted-foreground">
											{a("defenseSummaryDescription")}
										</p>
									</div>

									<div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-12">
										<div className="min-w-0 md:col-span-12 xl:col-span-8">
											<DefenseActionsByMatchChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>

										<div className="min-w-0 md:col-span-6 xl:col-span-4">
											<DefenseFoulsMixChart matches={enabledMatches} stats={enabledStats} players={players || []} hiddenStats={hiddenStats} />
										</div>
										<div className="min-w-0 md:col-span-6 xl:col-span-4">
											<DefenseInferiorityMixChart matches={enabledMatches} stats={enabledStats} players={players || []} hiddenStats={hiddenStats} />
										</div>
										<div className="min-w-0 md:col-span-12 xl:col-span-8">
											<DefenseInferiorityEfficiencyChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("defenseActions")}</h2>
										<p className="text-sm text-muted-foreground">
											{a("defenseActionsDescription")}
										</p>
									</div>

									<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
										<div className="h-full">
											<DefenseFoulsByMatchChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
										<div className="h-full">
											<DefenseBalanceChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("defenseRanking")}</h2>
										<p className="text-sm text-muted-foreground">{a("defenseRankingDescription")}</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<TopDefendersTable
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>
							</div>
						</section>
					</TabsContent>

					<TabsContent value="goalkeeper" className="mt-4">
						<section>
							<div className="mb-5 rounded-2xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-4 sm:p-6">
								<div className="mb-2 flex items-center gap-2 text-primary"><Hand className="size-5" /><span className="text-xs font-semibold uppercase tracking-[0.12em]">{a("goalkeeper")}</span></div>
								<h1 className="text-2xl font-bold sm:text-3xl">{a("goalkeeperTitle")}</h1>
								<p className="text-sm sm:text-base text-muted-foreground">
									{a("goalkeeperSeason", { club: currentClub?.short_name || "", season: selectedSeason })}
								</p>
							</div>

							<div className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4">
								<SeasonGoalkeeperTotals stats={enabledStats} hiddenStats={hiddenStats} />
							</div>

							<div className="mt-8 space-y-8 sm:mt-10">
								<div className="space-y-3 sm:space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("goalkeeperSummary")}</h2>
										<p className="text-sm text-muted-foreground">
											{a("goalkeeperSummaryDescription")}
										</p>
									</div>

									<div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-12">
										<div className="min-w-0 md:col-span-12 xl:col-span-8">
											<GoalkeeperPerformanceChart matches={enabledMatches} stats={enabledStats} hiddenStats={hiddenStats} />
										</div>
										<div className="min-w-0 md:col-span-6 xl:col-span-4">
											<GoalkeeperGoalsMixChart matches={enabledMatches} stats={enabledStats} players={players || []} hiddenStats={hiddenStats} />
										</div>
										<div className="min-w-0 md:col-span-6 xl:col-span-4">
											<GoalkeeperSavesMixChart matches={enabledMatches} stats={enabledStats} players={players || []} hiddenStats={hiddenStats} />
										</div>
										<div className="min-w-0 md:col-span-12 xl:col-span-8">
											<GoalkeeperInferiorityEfficiencyChart matches={enabledMatches} stats={enabledStats} players={players || []} hiddenStats={hiddenStats} />
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("specificPerformance")}</h2>
										<p className="text-sm text-muted-foreground">
											{a("specificPerformanceDescription")}
										</p>
									</div>

									<div className="grid grid-cols-1 gap-4">
										<div className="min-w-0">
											<GoalkeeperGoalsByTypeChart
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("shotDetails")}</h2>
										<p className="text-sm text-muted-foreground">
											{a("shotDetailsDescription")}
										</p>
									</div>

									<div className="grid grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<GoalkeeperShotsGoalChart rows={enabledGoalkeeperShotsRows} matches={enabledMatches} players={players} />
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">{a("goalkeeperRanking")}</h2>
										<p className="text-sm text-muted-foreground">{a("goalkeeperRankingDescription")}</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<GoalkeeperRankingTable
												matches={enabledMatches}
												stats={enabledStats}
												players={players || []}
												hiddenStats={hiddenStats}
											/>
										</div>
									</div>
								</div>
							</div>
						</section>
					</TabsContent>
				</Tabs>
			</section>

			<div className="mt-6 flex flex-col items-center gap-2 text-center">
				<p className="text-xs text-muted-foreground">
					{a("poweredBy")} <span className="font-medium">TFT</span> &amp; <span className="font-medium">BWMF</span>
				</p>

				<div className="flex items-center gap-4 opacity-70">
					<Image
						src="/images/logo-sponsor/TFT_LOGO.webp"
						alt="TFT"
						width={30}
						height={18}
						className="h-[60px] w-auto dark:invert dark:brightness-0 dark:contrast-200"
					/>

					<Image src="/images/logo-sponsor/bwmf.svg" alt="BWMF" width={86} height={38} className="h-[40px] w-auto" />
				</div>
			</div>
		</main>
	);
}
