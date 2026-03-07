"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalDifferenceEvolutionChart } from "@/components/goal-difference-evolution-chart";
import { useClub } from "@/lib/club-context";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { MatchComparison } from "@/components/match-comparer";
import { PlayerComparison } from "@/components/playerComparison";
import { QuarterGoalsChart } from "@/components/QuarterGoalsChart";
import type { MatchWithQuarterScores } from "@/lib/types";
import { TeamDashboard } from "@/components/team-dashboard/TeamDashboard";
import { GeneralDashboard } from "@/components/analytics/general-dashboard";
import { ShootingEfficiencyChart } from "@/components/analytics/shoot-analytics/shooting-efficiency-chart";
import { GoalkeeperPerformanceChart } from "@/components/analytics/goalkeeper-analytics/goalkeeper-performance-chart";
import { ManAdvantageChartExpandable } from "@/components/analytics/shoot-analytics/man-advantage-chart";
import { PlayerMatchCompare } from "@/components/analytics/PlayerMatchCompare";
import { SprintEfficiencyChart } from "@/components/analytics/SprintEfficiencyChart";
import { GoalkeeperShotsGoalChart } from "@/components/analytics-goalkeeper/GoalkeeperShotsGoalChart";
import { ShotMistakesDonutChart } from "@/components/analytics/shoot-analytics/quality-shoot-chart";
import { GoalMixChart } from "@/components/analytics/shoot-analytics/offensive-shoot-chart";
import { ChartSwipeCarousel } from "@/components/chartCarousel";
import { SeasonAttackTotals, SeasonDefenseTotals, SeasonGoalkeeperTotals } from "@/components/analytics/SeassonTotalsTabs";
import { AttackGoalTypesByMatchChart } from "@/components/analytics/shoot-analytics/AttackGoalTypesByMatchChart";
import { AttackMistakeTypesByMatchChart } from "@/components/analytics/shoot-analytics/AttackMistakeTypesByMatchChart";
import { AttackCreationVsLossesChart } from "@/components/analytics/shoot-analytics/AttackCreationVsLossesChart";
import { AttackBoyaFlowChart } from "@/components/analytics/shoot-analytics/AttackBoyaFlowChart";
import { TopScorersTable } from "@/components/analytics/shoot-analytics/TopScorersTable";
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
import { GoalkeeperBallImpactChart } from "@/components/analytics/goalkeeper-analytics/GoalkeeperBallImpactChart";
import { GoalkeeperRankingTable } from "@/components/analytics/goalkeeper-analytics/TopGoalkeepersTable";
import { LayoutGrid, Target, Shield, Hand } from "lucide-react";

export default function AnalyticsPage() {
	const { currentClub } = useClub();
	const searchParams = useSearchParams();
	const seasonParam = searchParams.get("season");

	const [seasons, setSeasons] = useState<string[]>([]);
	const [selectedSeason, setSelectedSeason] = useState<string>("");
	const [matches, setMatches] = useState<any[]>([]);
	const [players, setPlayers] = useState<any[]>([]);
	const [allStats, setAllStats] = useState<any[]>([]);
	const [playerStats, setPlayerStats] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const quarterMatches = matches as MatchWithQuarterScores[];
	const [goalkeeperShotsRows, setGoalkeeperShotsRows] = useState<any[]>([]);

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

				const [seasonsResult, playersResult] = await Promise.all([
					supabase
						.from("matches")
						.select("season")
						.eq("club_id", currentClub.id)
						.not("season", "is", null)
						.order("season", { ascending: false }),
					supabase.from("players").select("*").eq("club_id", currentClub.id)
				]);

				if (abortController.signal.aborted || !isMounted) return;

				const uniqueSeasons = [...new Set(seasonsResult.data?.map((m) => m.season).filter(Boolean))] as string[];
				setSeasons(uniqueSeasons);

				const season = seasonParam || uniqueSeasons[0] || "2024-2025";
				setSelectedSeason(season);

				const [matchesResult, statsResult] = await Promise.all([
					supabase.from("matches").select("*").eq("club_id", currentClub.id).eq("season", season).order("match_date", { ascending: false }),
					supabase
						.from("match_stats")
						.select("*")
						.in(
							"match_id",
							(await supabase.from("matches").select("id").eq("club_id", currentClub.id).eq("season", season)).data?.map((m) => m.id) ||
								[]
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

				const calculatedPlayerStats = playersResult.data?.map((player) => {
					const stats = statsResult.data?.filter((s) => s.player_id === player.id) || [];

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

				if (isMounted) setPlayerStats(calculatedPlayerStats || []);
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

	const matchesById = useMemo(() => {
		const m = new Map<number, any>();
		(matches || []).forEach((x) => m.set(x.id, x));
		return m;
	}, [matches]);

	const shots = useMemo(() => {
		return (goalkeeperShotsRows || []).map((s) => {
			const match = matchesById.get(s.match_id);
			return {
				id: s.id,
				match_id: s.match_id,
				goalkeeper_player_id: s.goalkeeper_player_id,
				jornada: match?.jornada ?? null,
				match_date: match?.match_date ?? null,
				x: s.x,
				y: s.y,
				result: s.result as "goal" | "save"
			};
		});
	}, [goalkeeperShotsRows, matchesById]);

	if (loading) {
		return (
			<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
				<div className="text-center py-12">
					<p className="text-muted-foreground">Cargando analytics...</p>
				</div>
			</main>
		);
	}

	return (
		<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
			<div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Analytics</h1>
					<p className="text-sm sm:text-base text-muted-foreground">
						Análisis detallado de {currentClub?.short_name || ""} – Temporada {selectedSeason}
					</p>
				</div>
			</div>

			<section className="mb-8">
				{/* ✅ NUEVA ESTRUCTURA DE TABS */}
				<Tabs defaultValue="overview">
					{/* TabsList scrollable para móvil */}
					<TabsList className="flex w-full max-w-full items-stretch justify-start gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-2xl bg-muted/30 p-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
						<TabsTrigger
							value="overview"
							className="min-w-[56px] sm:min-w-[140px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<LayoutGrid className="h-4 w-4 shrink-0" />
								<span className="hidden sm:inline">Resumen</span>
							</div>
						</TabsTrigger>

						<TabsTrigger
							value="attack"
							className="min-w-[56px] sm:min-w-[140px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<Target className="h-4 w-4 shrink-0" />
								<span className="hidden sm:inline">Ataque</span>
							</div>
						</TabsTrigger>

						<TabsTrigger
							value="defense"
							className="min-w-[56px] sm:min-w-[140px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<Shield className="h-4 w-4 shrink-0" />
								<span className="hidden sm:inline">Defensa</span>
							</div>
						</TabsTrigger>

						<TabsTrigger
							value="goalkeeper"
							className="min-w-[56px] sm:min-w-[140px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground"
						>
							<div className="flex items-center justify-center gap-2 w-full">
								<Hand className="h-4 w-4 shrink-0" />
								<span className="hidden sm:inline">Portero</span>
							</div>
						</TabsTrigger>
					</TabsList>

					{/* ===== TAB: RESUMEN ===== */}
					<TabsContent value="overview" className="mt-4 space-y-10">
						<section>
							<GeneralDashboard matches={matches || []} stats={allStats || []} players={players || []} />
						</section>

						<section>
							<TeamDashboard teamStats={playerStats} />
						</section>

						<section>
							<Tabs defaultValue="compare">
								<TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
									<TabsTrigger className="min-w-[170px] text-xs sm:text-sm" value="compare">
										Comparador partidos
									</TabsTrigger>
									<TabsTrigger className="min-w-[170px] text-xs sm:text-sm" value="players-compare">
										Comparador jugadores
									</TabsTrigger>
									<TabsTrigger className="min-w-[220px] text-xs sm:text-sm" value="players-jornada-compare">
										Jornadas por jugador
									</TabsTrigger>
								</TabsList>

								<TabsContent value="compare">
									<MatchComparison matches={matches || []} stats={allStats || []} />
								</TabsContent>

								<TabsContent value="players-compare">
									<PlayerComparison players={players || []} stats={allStats || []} />
								</TabsContent>

								<TabsContent value="players-jornada-compare">
									<PlayerMatchCompare players={players || []} matches={matches || []} stats={allStats || []} maxSelections={12} />
								</TabsContent>
							</Tabs>
						</section>
					</TabsContent>

					{/* ===== TAB: PARTIDO ===== */}
					{/* <TabsContent value="match" className="mt-4 space-y-10">
						<section>
							<h2 className="text-xl font-bold mb-4">Dinámica del partido</h2>

							<div className="md:hidden">
								<ChartSwipeCarousel
									className="w-full"
									items={[
										<QuarterGoalsChart key="q" matches={quarterMatches || []} />,
										<GoalDifferenceEvolutionChart key="gd" matches={matches || []} />,
										<SprintEfficiencyChart key="sp" matches={matches || []} players={players || []} />
									]}
								/>
							</div>

							<div className="hidden md:grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
								<QuarterGoalsChart matches={quarterMatches || []} />
								<GoalDifferenceEvolutionChart matches={matches || []} />
								<SprintEfficiencyChart matches={matches || []} players={players || []} />
							</div>
						</section>
					</TabsContent> */}

					{/* ===== TAB: ATAQUE ===== */}
					<TabsContent value="attack" className="mt-4 space-y-10">
						<section>
							<div className="mb-4">
								<h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-2">Estadistica ofensiva</h1>
								<p className="text-sm sm:text-base text-muted-foreground">
									Estadistica ofensiva del {currentClub?.short_name || ""} – Temporada {selectedSeason}
								</p>
							</div>

							<SeasonAttackTotals stats={allStats || []} />

							<div className="flex items-center gap-2 mt-4 mb-4">
								<div className="h-px flex-1 bg-border/90" />
							</div>

							<div className="space-y-8">
								{/* BLOQUE 1 */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Eficiencia y resumen ofensivo</h2>
										<p className="text-sm text-muted-foreground">
											Visión general del rendimiento ofensivo, distribución de goles y tipos de fallo.
										</p>
									</div>

									<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
										<div className="lg:col-span-2 h-full">
											<ShootingEfficiencyChart matches={matches || []} stats={allStats || []} />
										</div>

										<div className="lg:col-span-1 h-full">
											<ChartSwipeCarousel
												items={[
													<GoalMixChart key="mix" matches={matches || []} stats={allStats || []} players={players || []} />,
													<ShotMistakesDonutChart
														key="mistakes"
														matches={matches || []}
														stats={allStats || []}
														players={players || []}
													/>
												]}
											/>
										</div>

										<div className="lg:col-span-3">
											<ManAdvantageChartExpandable matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
									</div>
								</div>

								{/* BLOQUE 2 */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Eficienca por jornada</h2>
										<p className="text-sm text-muted-foreground">Goles y fallos por jornada</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<AttackGoalTypesByMatchChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>

										<div className="h-full">
											<AttackMistakeTypesByMatchChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
									</div>
								</div>

								{/* BLOQUE 3 */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Construcción ofensiva</h2>
										<p className="text-sm text-muted-foreground">
											Balance entre generación de ventajas, pérdidas y uso del juego con boya.
										</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<AttackCreationVsLossesChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>

										<div className="h-full">
											<AttackBoyaFlowChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
									</div>
								</div>
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Ranking ofensivo</h2>
										<p className="text-sm text-muted-foreground">
											Jugadores más determinantes en finalización y aportación ofensiva.
										</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<TopScorersTable matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
									</div>
								</div>
							</div>
						</section>
					</TabsContent>

					{/* ===== TAB: DEFENSA ===== */}
					<TabsContent value="defense" className="mt-4 space-y-10">
						<section>
							<div className="mb-4">
								<h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-2">Estadística defensiva</h1>
								<p className="text-sm sm:text-base text-muted-foreground">
									Estadística defensiva del {currentClub?.short_name || ""} – Temporada {selectedSeason}
								</p>
							</div>

							<SeasonDefenseTotals stats={allStats || []} />

							<div className="flex items-center gap-2 mt-4 mb-4">
								<div className="h-px flex-1 bg-border/90" />
							</div>

							<div className="space-y-8">
								{/* BLOQUE 1 */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Resumen defensivo</h2>
										<p className="text-sm text-muted-foreground">
											Visión general de disciplina defensiva, inferioridad y balance del equipo.
										</p>
									</div>

									<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
										<div className="lg:col-span-2 h-full">
											<DefenseActionsByMatchChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>

										{/* Carousel lateral */}
										<div className="lg:col-span-1 h-full">
											<ChartSwipeCarousel
												items={[
													<DefenseFoulsMixChart
														key="def-fouls-mix"
														matches={matches || []}
														stats={allStats || []}
														players={players || []}
													/>,
													<DefenseInferiorityMixChart
														key="def-inf-mix"
														matches={matches || []}
														stats={allStats || []}
														players={players || []}
													/>
												]}
											/>
										</div>
									</div>
								</div>

								{/* BLOQUE 2 */}
								<div className="space-y-4">
									<div className="grid grid-cols-1 xl:grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<DefenseInferiorityEfficiencyChart
												matches={matches || []}
												stats={allStats || []}
												players={players || []}
											/>
										</div>
									</div>
								</div>

								{/* BLOQUE 3 */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Acciones defensivas</h2>
										<p className="text-sm text-muted-foreground">
											Bloqueos, recuperaciones, rebotes y balance neto del trabajo defensivo.
										</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<DefenseFoulsByMatchChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
										<div className="h-full">
											<DefenseBalanceChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
									</div>
								</div>
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Ranking defensivo</h2>
										<p className="text-sm text-muted-foreground">Jugadores más determinantes en defensa.</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<TopDefendersTable matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
									</div>
								</div>
							</div>
						</section>
					</TabsContent>

					{/* ===== TAB: PORTERO ===== */}
					{/* ===== TAB: PORTERO ===== */}
					<TabsContent value="goalkeeper" className="mt-4 space-y-10">
						<section>
							<div className="mb-4">
								<h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-2">Estadística del portero</h1>
								<p className="text-sm sm:text-base text-muted-foreground">
									Rendimiento del portero de {currentClub?.short_name || ""} – Temporada {selectedSeason}
								</p>
							</div>

							<SeasonGoalkeeperTotals stats={allStats || []} />

							<div className="flex items-center gap-2 mt-4 mb-4">
								<div className="h-px flex-1 bg-border/90" />
							</div>

							<div className="space-y-8">
								{/* BLOQUE 1 */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Resumen del portero</h2>
										<p className="text-sm text-muted-foreground">
											Visión general del perfil de goles recibidos, tipo de paradas y rendimiento global.
										</p>
									</div>

									<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch">
										<div className="lg:col-span-2 h-full">
											<GoalkeeperPerformanceChart matches={matches || []} stats={allStats || []} />
										</div>

										<div className="lg:col-span-1 h-full">
											<ChartSwipeCarousel
												items={[
													<GoalkeeperGoalsMixChart
														key="gk-goals-mix"
														matches={matches || []}
														stats={allStats || []}
														players={players || []}
													/>,
													<GoalkeeperSavesMixChart
														key="gk-saves-mix"
														matches={matches || []}
														stats={allStats || []}
														players={players || []}
													/>
												]}
											/>
										</div>
									</div>
								</div>

								{/* BLOQUE 2 */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Rendimiento específico</h2>
										<p className="text-sm text-muted-foreground">
											Comportamiento en inferioridad y distribución del daño recibido por tipo de lanzamiento.
										</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<GoalkeeperInferiorityEfficiencyChart
												matches={matches || []}
												stats={allStats || []}
												players={players || []}
											/>
										</div>

										<div className="h-full">
											<GoalkeeperGoalsByTypeChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
									</div>
								</div>

								{/* BLOQUE 3 */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Juego con balón</h2>
										<p className="text-sm text-muted-foreground">
											Aportación ofensiva del portero, balance de acciones positivas y pérdidas.
										</p>
									</div>

									<div className="grid grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<GoalkeeperBallImpactChart matches={matches || []} stats={allStats || []} players={players || []} />
										</div>
									</div>
								</div>

								{/* BLOQUE 4 - SIEMPRE AL FINAL */}
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Detalle de lanzamientos</h2>
										<p className="text-sm text-muted-foreground">
											Distribución final de tiros recibidos y resultado de cada acción del portero.
										</p>
									</div>

									<div className="grid grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<GoalkeeperShotsGoalChart rows={goalkeeperShotsRows} matches={matches} players={players} />
										</div>
									</div>
								</div>
								<div className="space-y-4">
									<div>
										<h2 className="text-lg sm:text-xl font-semibold">Ranking en porteria</h2>
										<p className="text-sm text-muted-foreground">Portero mas determinante.</p>
									</div>

									<div className="grid grid-cols-1 xl:grid-cols-1 gap-4 lg:gap-6 items-stretch">
										<div className="h-full">
											<GoalkeeperRankingTable matches={matches || []} stats={allStats || []} players={players || []} />
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
					POWERED BY <span className="font-medium">TFT</span> &amp; <span className="font-medium">BWMF</span>
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
