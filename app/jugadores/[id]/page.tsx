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

				<PlayerHeroHeader player={player} roleLabel="Jugador de Campo" />
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
					<FieldPlayerMatchStats matchStats={matchStats} player={player} />
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

function FieldPlayerSummary({ stats, matchCount, matchStats }: { stats: any; matchCount: number; matchStats: MatchStatsWithMatch[] }) {
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
				// unique by id
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

function FieldPlayerMatchStats({ matchStats }: { matchStats: MatchStatsWithMatch[]; player: Player }) {
	if (!matchStats?.length) {
		return (
			<Card className="mb-6">
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">No hay estadísticas de partidos registradas</p>
				</CardContent>
			</Card>
		);
	}

	const formatDate = (d?: string) =>
		d
			? new Date(d).toLocaleDateString("es-ES", {
					year: "numeric",
					month: "long",
					day: "numeric"
				})
			: "";

	const KpiBox = ({ label, value, className }: { label: string; value: React.ReactNode; className: string }) => (
		<div className={`rounded-xl p-4 text-center border ${className}`}>
			<p className="text-2xl font-bold tabular-nums">{value}</p>
			<p className="text-xs text-muted-foreground mt-1">{label}</p>
		</div>
	);

	const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
		<div className="space-y-2">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
			<div className="grid grid-cols-2 gap-2">{children}</div>
		</div>
	);

	const KV = ({ label, value }: { label: string; value: React.ReactNode }) => (
		<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);

	const goalsItems = [
		{ label: "Boya/Jugada", key: "goles_boya_jugada" as const },
		{ label: "Hombre +", key: "goles_hombre_mas" as const },
		{ label: "Lanzamiento", key: "goles_lanzamiento" as const },
		{ label: "+6m", key: "goles_dir_mas_5m" as const },
		{ label: "Contraataque", key: "goles_contraataque" as const },
		{ label: "Penalti", key: "goles_penalti_anotado" as const },
		{ label: "Gol del palo (H+)", key: "gol_del_palo_sup" as const }
	];

	const missesItems = [
		{ label: "Hombre +", key: "tiros_hombre_mas" as const },
		{ label: "Penalti", key: "tiros_penalti_fallado" as const },
		{ label: "Corner", key: "tiros_corner" as const },
		{ label: "Fuera", key: "tiros_fuera" as const },
		{ label: "Parados", key: "tiros_parados" as const },
		{ label: "Bloqueados", key: "tiros_bloqueado" as const },
		{ label: "Tiro al palo", key: "tiro_palo" as const }
	];

	const foulsItems = [
		{ label: 'Exp 20" 1c1', key: "faltas_exp_20_1c1" as const },
		{ label: 'Exp 20" Boya', key: "faltas_exp_20_boya" as const },
		{ label: "Exp Simple", key: "faltas_exp_simple" as const },
		{ label: "Penalti", key: "faltas_penalti" as const },
		{ label: "Contrafaltas", key: "faltas_contrafaltas" as const }
	];

	const actionsItems = [
		{ label: "Bloqueos", key: "acciones_bloqueo" as const },
		{ label: "Recuperaciones", key: "acciones_recuperacion" as const },
		{ label: "Rebotes", key: "acciones_rebote" as const },
		{ label: "Exp. Prov.", key: "acciones_exp_provocada" as const },
		{ label: "Pen. Prov.", key: "acciones_penalti_provocado" as const },
		{ label: "Gol recibido", key: "acciones_recibir_gol" as const },
		{ label: "Pase al boya", key: "pase_boya" as const },
		{ label: "Pase al boya fallado", key: "pase_boya_fallado" as const }
	];

	return (
		<div className="space-y-4 mb-6">
			<div className="space-y-4">
				{matchStats.map((stat) => {
					const match = stat.matches;
					const goles = stat.goles_totales ?? 0;
					const tiros = stat.tiros_totales ?? 0;
					const eficiencia = tiros > 0 ? ((goles / tiros) * 100).toFixed(1) : "0.0";
					const asist = stat.acciones_asistencias ?? 0;

					return (
						<Card key={stat.id} className="overflow-hidden">
							<CardHeader className="pb-3">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div className="min-w-0">
										<CardTitle className="text-base md:text-lg truncate">{match?.opponent ?? "—"}</CardTitle>
										<p className="text-xs md:text-sm text-muted-foreground truncate">{formatDate(match?.match_date)}</p>
									</div>

									<div className="flex items-center justify-between md:justify-end gap-3">
										<span className="text-xl md:text-2xl font-bold tabular-nums">
											{match?.home_score ?? 0} - {match?.away_score ?? 0}
										</span>
										<Button asChild variant="outline" size="sm" className="bg-transparent">
											<Link href={`/partidos/${match?.id}`}>Ver Partido</Link>
										</Button>
									</div>
								</div>
							</CardHeader>

							<CardContent className="space-y-3 sm:space-y-4">
								{/* KPIs */}
								<div className="grid grid-cols-4 md:grid-cols-4 gap-2 sm:gap-3">
									<KpiBox
										label="Goles"
										value={goles}
										className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
									/>
									<KpiBox
										label="Tiros"
										value={tiros}
										className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
									/>
									<KpiBox
										label="Eficiencia"
										value={`${eficiencia}%`}
										className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
									/>
									<KpiBox
										label="Asistencias"
										value={asist}
										className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
									/>
								</div>

								{/* ✅ DETALLE: Desktop/Tablet visible, móvil en dropdown */}
								{/* Desktop/Tablet */}
								<div className="hidden sm:block">
									<div className="grid md:grid-cols-2 gap-4">
										<Section title="Goles por tipo">
											{goalsItems.map((it) => (
												<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
											))}
										</Section>

										<Section title="Tiros fallados">
											{missesItems.map((it) => (
												<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
											))}
										</Section>

										<Section title="Faltas">
											{foulsItems.map((it) => (
												<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
											))}
										</Section>

										<Section title="Acciones">
											{actionsItems.map((it) => (
												<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
											))}
										</Section>
									</div>
								</div>

								{/* Mobile */}
								<div className="sm:hidden">
									<Accordion type="single" collapsible className="w-full">
										<AccordionItem value={`detail-${stat.id}`} className="border rounded-xl overflow-hidden">
											{/* ✅ Trigger con área clicable completa */}
											<AccordionTrigger
												className="
						w-full px-3 py-2
						bg-muted/20 hover:bg-muted/30
						text-sm font-semibold
						flex items-center justify-between
						[&>svg]:shrink-0
						[&>svg]:transition-transform
						data-[state=open]:[&>svg]:rotate-180
						"
											>
												<div className="flex w-full items-center justify-between gap-2">
													<span className="inline-flex items-center gap-2">Ver detalle</span>

													{/* “pill” visual para que parezca botón */}
													<span
														className="
							shrink-0 rounded-lg border bg-background/60
							px-2.5 py-1 text-xs font-semibold opacity-80
							"
													>
														Abrir
													</span>
												</div>
											</AccordionTrigger>

											<AccordionContent className="px-3 pb-3 pt-2">
												<div className="grid gap-3">
													<Section title="Goles por tipo">
														{goalsItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
														))}
													</Section>

													<Section title="Tiros fallados">
														{missesItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
														))}
													</Section>

													<Section title="Faltas">
														{foulsItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
														))}
													</Section>

													<Section title="Acciones">
														{actionsItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
														))}
													</Section>
												</div>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
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

				<PlayerHeroHeader player={player} roleLabel="Portero" />
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
					<GoalkeeperMatchStats matchStats={matchStats} player={player} />
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

function GoalkeeperMatchStats({ matchStats }: { matchStats: MatchStatsWithMatch[]; player: Player }) {
	if (!matchStats?.length) {
		return (
			<Card className="mb-6">
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">No hay estadísticas de partidos registradas</p>
				</CardContent>
			</Card>
		);
	}

	const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "");

	const KpiBox = ({ label, value, className }: { label: string; value: React.ReactNode; className: string }) => (
		<div className={`rounded-xl p-4 text-center border ${className}`}>
			<p className="text-2xl font-bold tabular-nums">{value}</p>
			<p className="text-xs text-muted-foreground mt-1">{label}</p>
		</div>
	);

	const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
		<div className="space-y-2">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
			<div className="grid grid-cols-2 gap-2">{children}</div>
		</div>
	);

	const KV = ({ label, value }: { label: string; value: React.ReactNode }) => (
		<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);

	return (
		<div className="space-y-4 mb-6">
			<div className="space-y-4">
				{matchStats.map((stat) => {
					const match = stat.matches;
					const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0;

					const paradas = stat.portero_paradas_totales ?? 0;
					const totalShots = paradas + (rivalGoals ?? 0);
					const eficiencia = totalShots > 0 ? ((paradas / totalShots) * 100).toFixed(1) : "0.0";

					const savesItems = [
						{ label: "Parada + Recup", key: "portero_tiros_parada_recup" as const },
						{ label: "Fuera", key: "portero_paradas_fuera" as const },
						{ label: "Penalti parado", key: "portero_paradas_penalti_parado" as const },
						{ label: "Hombre -", key: "portero_paradas_hombre_menos" as const },
						{ label: "Lanz. recibido fuera", key: "lanz_recibido_fuera" as const }
					];

					const goalsItems = [
						{ label: "Boya/Parada", key: "portero_goles_boya_parada" as const },
						{ label: "Hombre -", key: "portero_goles_hombre_menos" as const },
						{ label: "+6m", key: "portero_goles_dir_mas_5m" as const },
						{ label: "Contraataque", key: "portero_goles_contraataque" as const },
						{ label: "Penalti", key: "portero_goles_penalti" as const }
					];

					return (
						<Card key={stat.id} className="overflow-hidden">
							<CardHeader className="pb-3">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div className="min-w-0">
										<CardTitle className="text-base md:text-lg truncate">{match?.opponent ?? "—"}</CardTitle>
										<p className="text-xs md:text-sm text-muted-foreground truncate">{formatDate(match?.match_date)}</p>
									</div>

									<div className="flex items-center justify-between md:justify-end gap-3">
										<span className="text-xl md:text-2xl font-bold tabular-nums">
											{match?.home_score ?? 0} - {match?.away_score ?? 0}
										</span>
										<Button asChild variant="outline" size="sm" className="bg-transparent">
											<Link href={`/partidos/${match?.id}`}>Ver Partido</Link>
										</Button>
									</div>
								</div>
							</CardHeader>

							<CardContent className="space-y-4">
								{/* KPIs */}
								<div className="grid grid-cols-4 md:grid-cols-4 gap-3">
									<KpiBox
										label="Paradas"
										value={paradas}
										className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
									/>
									<KpiBox
										label="Goles Recibidos"
										value={rivalGoals ?? 0}
										className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
									/>
									<KpiBox
										label="Eficiencia"
										value={`${eficiencia}%`}
										className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
									/>
									<KpiBox
										label="Tiros Totales"
										value={totalShots}
										className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
									/>
								</div>

								{/* ✅ MOBILE: Detalle en acordeón */}
								<div className="sm:hidden">
									<Accordion type="single" collapsible className="w-full">
										<AccordionItem value={`detail-${stat.id}`} className="border rounded-xl overflow-hidden">
											{/* Trigger 100% clicable */}
											<AccordionTrigger
												className="
                          w-full !flex !justify-between
                          px-3 py-2
                          bg-muted/20 hover:bg-muted/30
                          text-sm font-semibold
                          [&>svg]:shrink-0
                          [&>svg]:transition-transform
                          data-[state=open]:[&>svg]:rotate-180
                        "
											>
												<div className="flex w-full items-center justify-between gap-2">
													<span>Ver detalle</span>
													<span className="shrink-0 rounded-lg border bg-background/60 px-2.5 py-1 text-xs font-semibold opacity-80">
														Abrir
													</span>
												</div>
											</AccordionTrigger>

											<AccordionContent className="px-3 pb-3 pt-2">
												<div className="grid gap-3">
													<Section title="Paradas por tipo">
														{savesItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
														))}
													</Section>

													<Section title="Goles encajados por tipo">
														{goalsItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
														))}
													</Section>
												</div>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								</div>

								{/* ✅ TABLET/DESKTOP: detalle normal */}
								<div className="hidden sm:grid sm:grid-cols-2 gap-4">
									<Section title="Paradas por tipo">
										{savesItems.map((it) => (
											<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
										))}
									</Section>

									<Section title="Goles encajados por tipo">
										{goalsItems.map((it) => (
											<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} />
										))}
									</Section>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
