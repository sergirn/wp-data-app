"use client";

import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalDifferenceEvolutionChart } from "@/components/goal-difference-evolution-chart";
import { useClub } from "@/lib/club-context";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { BlocksChart } from "@/components/analytics/blocks-chart";
import { MatchComparison } from "@/components/match-comparer";
import { PlayerComparison } from "@/components/playerComparison";
import { QuarterGoalsChart } from "@/components/QuarterGoalsChart";
import type { MatchWithQuarterScores } from "@/lib/types";
import { TeamDashboard } from "@/components/team-dashboard/TeamDashboard";
import { GeneralDashboard } from "@/components/analytics/general-dashboard";
import { DisciplineChart } from "@/components/analytics/discipline-chart";
import { ShootingEfficiencyChart } from "@/components/analytics/shoot-analytics/shooting-efficiency-chart";
import { GoalkeeperPerformanceChart } from "@/components/analytics/goalkeeper-performance-chart";
import { ManAdvantageChartExpandable } from "@/components/analytics/man-advantage-chart";
import { ManDownGoalkeeperChart } from "@/components/analytics/man-down-goalkeeper-chart";
import { TurnoversRecoveriesChart } from "@/components/analytics/perd_rec_pos_chart";
import { PlayerMatchCompare } from "@/components/analytics/PlayerMatchCompare";
import { SprintEfficiencyChart } from "@/components/analytics/SprintEfficiencyChart";
import { GoalkeeperShotsGoalChart } from "@/components/analytics-goalkeeper/GoalkeeperShotsGoalChart";
import { ShotMistakesDonutChart } from "@/components/analytics/shoot-analytics/quality-shoot-chart";
import { GoalMixChart } from "@/components/analytics/shoot-analytics/offensive-shoot-chart";
import { ChartSwipeCarousel } from "@/components/chartCarousel";

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

				if (gkShotsError) {
					console.error("Error fetching goalkeeper_shots:", gkShotsError);
				}

				setMatches(matchesResult.data || []);
				setPlayers(playersResult.data || []);
				setAllStats(statsResult.data || []);
				setGoalkeeperShotsRows(gkShotsData || []);

				const calculatedPlayerStats = playersResult.data?.map((player) => {
					const stats = statsResult.data?.filter((s) => s.player_id === player.id) || [];

					// Campos agregados
					const goles_totales = stats.reduce((sum, s) => sum + (s.goles_totales || 0), 0);
					const tiros_totales = stats.reduce((sum, s) => sum + (s.tiros_totales || 0), 0);
					const acciones_asistencias = stats.reduce((sum, s) => sum + (s.acciones_asistencias || 0), 0);
					const acciones_bloqueo = stats.reduce((sum, s) => sum + (s.acciones_bloqueo || 0), 0);
					const acciones_recuperacion = stats.reduce((sum, s) => sum + (s.acciones_recuperacion || 0), 0);
					const acciones_rebote = stats.reduce((sum, s) => sum + (s.acciones_rebote || 0), 0);

					// Exclusiones individuales
					const faltas_exp_3_bruta = stats.reduce((sum, s) => sum + (s.faltas_exp_3_bruta || 0), 0);
					const faltas_exp_3_int = stats.reduce((sum, s) => sum + (s.faltas_exp_3_int || 0), 0);
					const faltas_exp_20_1c1 = stats.reduce((sum, s) => sum + (s.faltas_exp_20_1c1 || 0), 0);
					const faltas_exp_20_boya = stats.reduce((sum, s) => sum + (s.faltas_exp_20_boya || 0), 0);

					// Penaltis
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
						// Campos agregados
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
						// Portero
						portero_paradas_totales,
						portero_paradas_penalti_parado,
						portero_goles_totales,
						portero_paradas_hombre_menos,
						portero_goles_hombre_menos,
						portero_inferioridad_fuera,
						portero_inferioridad_bloqueo
					};
				});

				if (isMounted) {
					setPlayerStats(calculatedPlayerStats || []);
				}
			} catch (error) {
				if (!abortController.signal.aborted) {
					console.error("Error fetching analytics:", error);
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		}

		fetchData();

		return () => {
			isMounted = false;
			abortController.abort();
		};
	}, [currentClub, seasonParam]); // Use currentClub instead of currentClub?.id

	const stats = useMemo(() => {
		const totalMatches = matches?.length || 0;
		const wins = matches?.filter((m) => m.home_score > m.away_score).length || 0;
		const losses = matches?.filter((m) => m.home_score < m.away_score).length || 0;
		const draws = matches?.filter((m) => m.home_score === m.away_score).length || 0;
		const totalGoalsFor = matches?.reduce((sum, m) => sum + m.home_score, 0) || 0;
		const totalGoalsAgainst = matches?.reduce((sum, m) => sum + m.away_score, 0) || 0;

		return { totalMatches, wins, losses, draws, totalGoalsFor, totalGoalsAgainst };
	}, [matches]);

	const topPlayers = useMemo(() => {
		return {
			topScorers: [...playerStats].sort((a, b) => b.totalGoles - a.totalGoles).slice(0, 10),
			topAssists: [...playerStats].sort((a, b) => b.totalAsistencias - a.totalAsistencias).slice(0, 10),
			bestEfficiency: [...playerStats]
				.filter((p) => p.totalTiros >= 10)
				.sort((a, b) => b.eficiencia - a.eficiencia)
				.slice(0, 10),
			topBlocks: [...playerStats].sort((a, b) => b.totalBloqueos - a.totalBloqueos).slice(0, 10),
			mostTurnovers: [...playerStats].sort((a, b) => b.totalPerdidas - a.totalPerdidas).slice(0, 10)
		};
	}, [playerStats]);

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

				{/* <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
					<ExportButtons data={prepareMatchesForExport(matches || [])} filename={`partidos_${selectedSeason}`} label="Exportar Partidos" />
					<ExportButtons
						data={preparePlayersForExport(playerStats || [])}
						filename={`jugadores_${selectedSeason}`}
						label="Exportar Jugadores"
					/>
					<SeasonSelector seasons={seasons} selectedSeason={selectedSeason} />
				</div> */}
			</div>

			<section className="mb-8">
				<Tabs defaultValue="overview">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="overview" className="text-xs sm:text-sm">
							General
						</TabsTrigger>
						<TabsTrigger value="quarters" className="text-xs sm:text-sm">
							Detalles
						</TabsTrigger>
					</TabsList>

					{/* ===== TAB 1: VISIÓN GLOBAL ===== */}
					<TabsContent value="overview" className="mt-4 space-y-10">
						<section>
							<GeneralDashboard matches={matches || []} stats={allStats || []} players={players || []} />
						</section>

						{/* ===== BLOQUE 1: VISIÓN GLOBAL ===== */}
						<section className="mt-10">
							<TeamDashboard teamStats={playerStats} />
						</section>

						{/* ===== BLOQUE 2: COMPARADORES ===== */}
						<section>
							<Tabs defaultValue="compare">
								<TabsList className="grid w-full grid-cols-3">
									<TabsTrigger value="compare" className="text-xs sm:text-sm">
										Comparador de partidos
									</TabsTrigger>
									<TabsTrigger value="players-compare" className="text-xs sm:text-sm">
										Comparador de jugadores
									</TabsTrigger>
									<TabsTrigger value="players-jornada-compare" className="text-xs sm:text-sm">
										Comparador de jornadas por jugador
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

					{/* ===== TAB 2: CUARTOS ===== */}
					<TabsContent value="quarters" className="mt-4 space-y-10">
						{/* ===== BLOQUE 1: DINÁMICA DEL PARTIDO ===== */}
						<section>
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

							{/* TABLET+ : grid normal */}
							<div className="hidden md:grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
								<QuarterGoalsChart matches={quarterMatches || []} />
								<GoalDifferenceEvolutionChart matches={matches || []} />
								<SprintEfficiencyChart matches={matches || []} players={players || []} />
							</div>
						</section>

						<section>
							<h2 className="text-xl font-bold mb-4">Rendimiento</h2>

							<div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-3 items-stretch">
								{/* IZQUIERDA: 2 filas (shoot + gk) */}
								<div className="md:col-span-2 grid gap-4 lg:gap-6 grid-rows-2 items-stretch">
									<div className="h-full min-h-0">
										<ShootingEfficiencyChart matches={matches || []} stats={allStats || []} />
									</div>

									<div className="h-full min-h-0">
										<GoalkeeperPerformanceChart matches={matches || []} stats={allStats || []} />
									</div>
								</div>

								{/* DERECHA: ocupa las 2 filas => mismo alto total */}
								<div className="md:col-span-1 md:row-span-2 h-full min-h-0">
									<ChartSwipeCarousel
										items={[
											<ShotMistakesDonutChart
												key="mistakes"
												matches={matches || []}
												stats={allStats || []}
												players={players || []}
											/>,
											<GoalMixChart key="mix" matches={matches || []} stats={allStats || []} players={players || []} />
										]}
									/>
								</div>
							</div>
						</section>

						{/* ===== BLOQUE 2: SITUACIONES DE JUEGO ===== */}
						<section>
							<h2 className="text-xl font-bold mb-4">Rendimiento en Superioridad e Inferioridad</h2>
							<div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-1 md:grid-cols-2 auto-rows-fr items-stretch">
								<ChartSwipeCarousel
									items={[
										<ManAdvantageChartExpandable matches={matches || []} stats={allStats || []} players={players || []} />,
										<ManDownGoalkeeperChart matches={matches || []} stats={allStats || []} players={players || []} />
									]}
								/>
							</div>
						</section>

						<section>
							<h2 className="text-xl font-bold mb-4">Rendimiento del juego</h2>
							<div className="md:hidden">
								<ChartSwipeCarousel
									className="w-full"
									items={[
										<BlocksChart key="bl" matches={matches || []} stats={allStats || []} players={players || []} />,
										<TurnoversRecoveriesChart key="to" matches={matches || []} stats={allStats || []} />,
										<DisciplineChart key="di" matches={matches || []} stats={allStats || []} />
									]}
								/>
							</div>
							<div className="hidden md:grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr items-stretch">
								<BlocksChart matches={matches || []} stats={allStats || []} players={players || []} />
								<TurnoversRecoveriesChart matches={matches || []} stats={allStats || []} />
								<DisciplineChart matches={matches || []} stats={allStats || []} />
							</div>
						</section>

						<section>
							<h2 className="text-xl font-bold mb-4">Rendimiento del portero</h2>
							<div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-1 auto-rows-fr items-stretch">
								<GoalkeeperShotsGoalChart rows={goalkeeperShotsRows} matches={matches} players={players} />
							</div>
						</section>
					</TabsContent>
				</Tabs>
			</section>
		</main>
	);
}
