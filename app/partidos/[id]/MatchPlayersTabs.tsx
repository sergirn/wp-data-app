"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Target, Shield, Hand } from "lucide-react";

import { PlayerStatsCard } from "@/components/match-components/players-match-cards/PlayerStatsCard";
import { GoalkeeperStatsCard } from "@/components/match-components/players-match-cards/GoalkeeperStatsCard";

import { MatchSuperiorityChart } from "@/components/match-components/match-superiority-chart";
import { MatchInferiorityChart } from "@/components/match-components/match-inferiority-chart";
import { MatchBlocksChart } from "@/components/match-blocks-chart";
import { MatchPossessionChart } from "@/components/match-components/perd_rec_pos-chart_team";
import { MatchGoalkeepersPieChart } from "@/components/match-components/GoalkeeperMatch-chart";
import { ShotMistakesDonutChartMatch } from "@/components/match-components/ShotMistakesDonutChartMatch";
import { GoalkeeperShotsGoalChartSimple } from "@/components/analytics-goalkeeper/evolution-component/GoalkeepersShotsEvolutions";

import { accumulatePlayerStats, getPlayerSummary } from "@/lib/stats/playerStatsHelpers";
import { accumulateGoalkeeperStats, getGoalkeeperSummary } from "@/lib/stats/goalkeeperStatsHelpers";
import { MatchGoalkeeperGoalsAgainstChart } from "@/components/match-components/GoalkeeperGoalsByTypeMatch";
import { MatchGoalkeeperSavesBreakdownChart } from "@/components/match-components/GoalkeeperSavesByTypeMatch";
import { MatchAttackTotals, MatchDefenseTotals, MatchGoalkeeperTotals } from "@/components/match-components/total-stats-match/MatchTotals";

type PlayerLite = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
};

type Props = {
	fieldPlayersStats: any[];
	goalkeepersStats: any[];

	matchId: number;
	clubName: string;
	opponentName: string;
	matchDateLabel: string;

	match: any;
	matchStats: any[];

	superioridadStats: any;
	inferioridadStats: any;
	blocksStats: any;

	allGoalkeeperShots: any[];
	goalkeeperId: number | null;
	players: PlayerLite[];
	hiddenStats?: string[];
};

function Pill({ children }: { children: React.ReactNode }) {
	return <span className="inline-flex items-center rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">{children}</span>;
}

function TinyKpi({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-xl border bg-card/40 px-3 py-2">
			<p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
			<p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
		</div>
	);
}

function SectionBlock({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
	return (
		<section className="space-y-4">
			<div>
				<h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
				{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
			</div>
			{children}
		</section>
	);
}

export function MatchPlayersTabs({
	fieldPlayersStats,
	goalkeepersStats,
	matchId,
	clubName,
	opponentName,
	matchDateLabel,
	match,
	matchStats,
	superioridadStats,
	inferioridadStats,
	blocksStats,
	allGoalkeeperShots,
	goalkeeperId,
	players,
	hiddenStats = []
}: Props) {
	const hasGoalkeepers = (goalkeepersStats?.length ?? 0) > 0;
	const canShowGoalkeeperShots = Boolean(goalkeeperId) && (allGoalkeeperShots?.length ?? 0) > 0;

	const playerTotals = accumulatePlayerStats(matchStats ?? [], hiddenStats);
	const playerSummary = getPlayerSummary(playerTotals, hiddenStats);

	const goalkeeperTotals = accumulateGoalkeeperStats(matchStats ?? [], hiddenStats);
	const goalkeeperSummary = getGoalkeeperSummary(goalkeeperTotals, hiddenStats);

	const goals = playerSummary.goals;
	const attempts = playerSummary.shots;
	const shootingEfficiency = playerSummary.efficiency;

	const assists = playerSummary.assists;
	const blocks = playerSummary.blocks;
	const recoveries = playerSummary.recoveries;
	const losses = playerSummary.losses;

	const saves = goalkeeperSummary.saves;
	const goalsConceded = goalkeeperSummary.goalsConceded;
	const shotsReceived = goalkeeperSummary.shotsReceived;
	const savePct = goalkeeperSummary.savePct;

	return (
		<div className="mb-6 space-y-6">
			<div className="rounded-2xl border bg-card/40 p-3 sm:p-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<p className="text-sm font-semibold truncate">
							{clubName} vs {opponentName}
						</p>
						<p className="text-xs text-muted-foreground truncate">{matchDateLabel}</p>

						<div className="mt-2 flex flex-wrap gap-2">
							<Pill>
								{goals} goles · {attempts} intentos
							</Pill>
							<Pill>{shootingEfficiency}% efect.</Pill>
							<Pill>
								{assists} asist · {blocks} bloq
							</Pill>
							<Pill>
								{recoveries} recup · {losses} pérdidas
							</Pill>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2 sm:w-[340px]">
						<TinyKpi label="Tiros" value={attempts} />
						<TinyKpi label="Efect." value={`${shootingEfficiency}%`} />
						<TinyKpi label="Portero" value={`${savePct}%`} />
					</div>
				</div>
			</div>

			<Tabs defaultValue="players" className="w-full">
				<TabsList className="flex w-full max-w-full items-stretch justify-start gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-2xl bg-muted/30 p-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					<TabsTrigger
						value="players"
						className="min-w-[56px] sm:min-w-[140px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<LayoutGrid className="h-4 w-4 shrink-0" />
							<span className="hidden sm:inline">Jugadores</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="attack"
						className="min-w-[56px] sm:min-w-[140px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Target className="h-4 w-4 shrink-0" />
							<span className="hidden sm:inline">Ataque</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="defense"
						className="min-w-[56px] sm:min-w-[140px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Shield className="h-4 w-4 shrink-0" />
							<span className="hidden sm:inline">Defensa</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="goalkeeper"
						className="min-w-[56px] sm:min-w-[140px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Hand className="h-4 w-4 shrink-0" />
							<span className="hidden sm:inline">Portero</span>
						</div>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="players" className="mt-4 space-y-6">
					<div className="space-y-3">
						<p className="text-sm font-semibold text-muted-foreground">Jugadores de campo</p>

						<div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4">
							{fieldPlayersStats?.map((stat: any) => (
								<PlayerStatsCard key={stat.id} stat={stat} player={stat.players} hiddenStats={hiddenStats} />
							))}
						</div>
					</div>

					{hasGoalkeepers ? (
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<p className="text-sm font-semibold text-muted-foreground">Porteros</p>
								<div className="h-px flex-1 bg-border/60" />
							</div>

							<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
								{goalkeepersStats.map((stat: any) => (
									<GoalkeeperStatsCard key={stat.id} stat={stat} player={stat.players} hiddenStats={hiddenStats} />
								))}
							</div>
						</div>
					) : null}
				</TabsContent>

				<TabsContent value="attack" className="mt-4 space-y-8">
					<SectionBlock title="Ataque" description="Producción ofensiva y eficiencia del equipo en este partido.">
						<MatchAttackTotals stats={matchStats} hiddenStats={hiddenStats} />

						<div className="flex items-center gap-2">
							<div className="h-px flex-1 bg-border/90" />
						</div>

						<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 items-stretch">
							<div className="h-full">
								<MatchSuperiorityChart matchStats={matchStats} />
							</div>

							<div className="h-full">
								<ShotMistakesDonutChartMatch match={match} stats={matchStats} players={players} />
							</div>
						</div>
					</SectionBlock>
				</TabsContent>

				<TabsContent value="defense" className="mt-4 space-y-8">
					<SectionBlock title="Defensa" description="Inferioridad, bloqueos y acciones defensivas del equipo.">
						<MatchDefenseTotals stats={matchStats} hiddenStats={hiddenStats} />

						<div className="flex items-center gap-2">
							<div className="h-px flex-1 bg-border/90" />
						</div>

						<div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 items-stretch">
							<div className="h-full">
								<MatchInferiorityChart matchStats={matchStats} />
							</div>

							<div className="h-full">
								<MatchBlocksChart stats={blocksStats} matchStats={matchStats} clubName={clubName} />
							</div>

							<div className="h-full">
								<MatchPossessionChart stats={matchStats} rival={opponentName} matchDateLabel={matchDateLabel} size="sm" />
							</div>
						</div>
					</SectionBlock>
				</TabsContent>

				<TabsContent value="goalkeeper" className="mt-4 space-y-8">
					<SectionBlock title="Portero" description="Rendimiento del portero y detalle de tiros recibidos.">
						<MatchGoalkeeperTotals stats={matchStats} hiddenStats={hiddenStats} />

						<div className="flex items-center gap-2">
							<div className="h-px flex-1 bg-border/90" />
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-1 gap-4 lg:gap-6 items-stretch">
							<div className="rounded-2xl border bg-card/40 p-3">
								<div className="mb-3 flex flex-wrap gap-2">
									<Pill>
										{saves} paradas · {goalsConceded} GC
									</Pill>
									<Pill>{shotsReceived} tiros recibidos</Pill>
									<Pill>{savePct}% eficacia</Pill>
								</div>

								{canShowGoalkeeperShots ? (
									<GoalkeeperShotsGoalChartSimple
										shots={allGoalkeeperShots}
										goalkeeperPlayerId={null}
										matchId={matchId}
										players={players}
									/>
								) : (
									<div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
										<p className="font-medium text-foreground/80">Sin mapa de tiros del portero</p>
										<p className="mt-1">No hay datos suficientes para mostrar el mapa/evolución de tiros del portero.</p>

										<div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
											<TinyKpi label="Paradas" value={saves} />
											<TinyKpi label="GC" value={goalsConceded} />
											<TinyKpi label="Tiros recib." value={shotsReceived} />
											<TinyKpi label="Efic." value={`${savePct}%`} />
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4 lg:gap-6 items-stretch">
							<div className="h-full">
								<MatchGoalkeepersPieChart stats={matchStats} match={match} />
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-stretch">
							<div className="h-full">
								<MatchGoalkeeperGoalsAgainstChart stats={matchStats} match={match} players={players} />
							</div>
							<div className="h-full">
								<MatchGoalkeeperSavesBreakdownChart stats={matchStats} match={match} players={players} />
							</div>
						</div>
					</SectionBlock>
				</TabsContent>
			</Tabs>
		</div>
	);
}
