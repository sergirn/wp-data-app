"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Hand, LayoutGrid, ListTree, MapPinned, Shield, Target } from "lucide-react";
import { useTranslations } from "next-intl";

import { PlayerStatsCard } from "@/components/match-components/players-match-cards/PlayerStatsCard";
import { GoalkeeperStatsCard } from "@/components/match-components/players-match-cards/GoalkeeperStatsCard";

import { MatchSuperiorityChart } from "@/components/match-components/attack-match-analytics/match-superiority-chart";
import { MatchInferiorityChart } from "@/components/match-components/match-inferiority-chart";
import { MatchBlocksChart } from "@/components/match-blocks-chart";
import { MatchPossessionChart } from "@/components/match-components/perd_rec_pos-chart_team";
import { MatchGoalkeepersPieChart } from "@/components/match-components/GoalkeeperMatch-chart";

import { GoalkeeperShotsGoalChartSimple } from "@/components/analytics-goalkeeper/evolution-component/GoalkeepersShotsEvolutions";

import { accumulatePlayerStats, getPlayerSummary } from "@/lib/stats/playerStatsHelpers";
import { accumulateGoalkeeperStats, getGoalkeeperSummary } from "@/lib/stats/goalkeeperStatsHelpers";
import { MatchGoalkeeperGoalsAgainstChart } from "@/components/match-components/GoalkeeperGoalsByTypeMatch";
import { MatchGoalkeeperSavesBreakdownChart } from "@/components/match-components/GoalkeeperSavesByTypeMatch";
import { MatchAttackTotals, MatchDefenseTotals, MatchGoalkeeperTotals } from "@/components/match-components/total-stats-match/MatchTotals";
import { MatchGoalMixChart } from "@/components/match-components/attack-match-analytics/AttackGoalType";
import { ShotMistakesDonutChartMatch } from "@/components/match-components/attack-match-analytics/ShotMistakesDonutChartMatch";
import { MatchShootingEfficiencyChart } from "@/components/match-components/attack-match-analytics/ShootEfficiencyMatch";
import { MatchPhaseOverview } from "@/components/match-components/MatchPhaseOverview";

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
		<section className="space-y-6">
			<div>
				<h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
				{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
			</div>
			{children}
		</section>
	);
}

function ContentBlock({
	icon: Icon,
	title,
	description,
	children,
	muted = false
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description?: string;
	children: React.ReactNode;
	muted?: boolean;
}) {
	return (
		<div className={`space-y-4 ${muted ? "rounded-3xl border bg-muted/15 p-3 sm:p-5" : ""}`}>
			<div className="flex items-start gap-3 px-1">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<Icon className="h-4 w-4" />
				</div>
				<div className="min-w-0">
					<h3 className="text-sm font-semibold sm:text-base">{title}</h3>
					{description ? <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
				</div>
			</div>
			{children}
		</div>
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
	blocksStats,
	allGoalkeeperShots,
	goalkeeperId,
	players,
	hiddenStats = []
}: Props) {
	const t = useTranslations("MatchTabs");
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
						<p className="text-sm font-semibold truncate">{t("summaryTitle", { club: clubName, opponent: opponentName })}</p>
						<p className="text-xs text-muted-foreground truncate">{matchDateLabel}</p>

						<div className="mt-2 flex flex-wrap gap-2">
							<Pill>{t("goalsAttempts", { goals, attempts })}</Pill>
							<Pill>{t("efficiencyShort", { value: shootingEfficiency })}</Pill>
							<Pill>{t("assistsBlocks", { assists, blocks })}</Pill>
							<Pill>{t("recoveriesLosses", { recoveries, losses })}</Pill>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2 sm:w-[340px]">
						<TinyKpi label={t("shots")} value={attempts} />
						<TinyKpi label={t("efficiencyKpiShort")} value={`${shootingEfficiency}%`} />
						<TinyKpi label={t("goalkeeper")} value={`${savePct}%`} />
					</div>
				</div>
			</div>

			<Tabs defaultValue="players" className="w-full">
				<TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/30 p-1.5 sm:grid-cols-4 sm:gap-2">
					<TabsTrigger
						value="players"
						className="min-w-0 rounded-xl px-1.5 py-2.5 text-[10px] font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<LayoutGrid className="h-4 w-4 shrink-0" />
							<span className="truncate">{t("players")}</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="attack"
						className="min-w-0 rounded-xl px-1.5 py-2.5 text-[10px] font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Target className="h-4 w-4 shrink-0" />
							<span className="truncate">{t("attack")}</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="defense"
						className="min-w-0 rounded-xl px-1.5 py-2.5 text-[10px] font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Shield className="h-4 w-4 shrink-0" />
							<span className="truncate">{t("defense")}</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="goalkeeper"
						className="min-w-0 rounded-xl px-1.5 py-2.5 text-[10px] font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Hand className="h-4 w-4 shrink-0" />
							<span className="truncate">{t("goalkeeper")}</span>
						</div>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="players" className="mt-4 space-y-6">
					<div className="space-y-3">
						<p className="text-sm font-semibold text-muted-foreground">{t("fieldPlayers")}</p>

						<div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-5">
							{fieldPlayersStats?.map((stat: any) => (
								<PlayerStatsCard key={stat.id} stat={stat} player={stat.players} hiddenStats={hiddenStats} />
							))}
						</div>
					</div>

					{hasGoalkeepers ? (
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<p className="text-sm font-semibold text-muted-foreground">{t("goalkeepers")}</p>
								<div className="h-px flex-1 bg-border/60" />
							</div>

							<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-5">
								{goalkeepersStats.map((stat: any) => (
									<GoalkeeperStatsCard key={stat.id} stat={stat} player={stat.players} hiddenStats={hiddenStats} />
								))}
							</div>
						</div>
					) : null}
				</TabsContent>

				<TabsContent value="attack" className="mt-5 space-y-8">
					<SectionBlock title={t("attack")} description={t("attackDescription")}>
						<MatchPhaseOverview phase="attack" stats={matchStats} hiddenStats={hiddenStats} />

						<ContentBlock icon={BarChart3} title={t("visualAnalysis")} description={t("visualAnalysisDescription")}>
							<div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-4 xl:gap-5">
								<div className="min-w-0">
									<MatchShootingEfficiencyChart match={match} stats={matchStats} hiddenStats={hiddenStats} />
								</div>
								<div className="min-w-0">
									<MatchSuperiorityChart matchStats={matchStats} />
								</div>

								<div className="min-w-0">
									<MatchGoalMixChart match={match} stats={matchStats} hiddenStats={hiddenStats} />
								</div>
								<div className="min-w-0">
									<ShotMistakesDonutChartMatch match={match} stats={matchStats} players={players} hiddenStats={hiddenStats} />
								</div>
							</div>
						</ContentBlock>

						<ContentBlock icon={ListTree} title={t("statisticalBreakdown")} description={t("statisticalBreakdownDescription")} muted>
							<MatchAttackTotals stats={matchStats} hiddenStats={hiddenStats} showSummary={false} />
						</ContentBlock>
					</SectionBlock>
				</TabsContent>

				<TabsContent value="defense" className="mt-5 space-y-8">
					<SectionBlock title={t("defense")} description={t("defenseDescription")}>
						<MatchPhaseOverview phase="defense" stats={matchStats} hiddenStats={hiddenStats} />

						<ContentBlock icon={BarChart3} title={t("visualAnalysis")} description={t("visualAnalysisDescription")}>
							<div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3 xl:gap-5">
								<div className="min-w-0">
									<MatchInferiorityChart matchStats={matchStats} />
								</div>
								<div className="min-w-0">
									<MatchBlocksChart stats={blocksStats} matchStats={matchStats} clubName={clubName} />
								</div>
								<div className="min-w-0">
									<MatchPossessionChart stats={matchStats} rival={opponentName} matchDateLabel={matchDateLabel} size="sm" />
								</div>
							</div>
						</ContentBlock>

						<ContentBlock icon={ListTree} title={t("statisticalBreakdown")} description={t("statisticalBreakdownDescription")} muted>
							<MatchDefenseTotals stats={matchStats} hiddenStats={hiddenStats} showSummary={false} />
						</ContentBlock>
					</SectionBlock>
				</TabsContent>

				<TabsContent value="goalkeeper" className="mt-5 space-y-8">
					<SectionBlock title={t("goalkeeper")} description={t("goalkeeperDescription")}>
						<MatchPhaseOverview phase="goalkeeper" stats={matchStats} hiddenStats={hiddenStats} />

						<ContentBlock icon={MapPinned} title={t("goalkeeperShotMap")} description={t("goalkeeperShotMapDescription")}>
							<div className="rounded-2xl border bg-background/50 p-3 sm:p-4">
								<div className="mb-3 flex flex-wrap gap-2">
									<Pill>{t("savesConceded", { saves, conceded: goalsConceded })}</Pill>
									<Pill>{t("shotsReceived", { count: shotsReceived })}</Pill>
									<Pill>{t("saveEfficiency", { value: savePct })}</Pill>
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
										<p className="font-medium text-foreground/80">{t("noShotMap")}</p>
										<p className="mt-1">{t("noShotMapDescription")}</p>
										<div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
											<TinyKpi label={t("saves")} value={saves} />
											<TinyKpi label={t("goalsConcededShort")} value={goalsConceded} />
											<TinyKpi label={t("shotsReceivedShort")} value={shotsReceived} />
											<TinyKpi label={t("efficiencyKpiShort")} value={`${savePct}%`} />
										</div>
									</div>
								)}
							</div>
						</ContentBlock>

						<ContentBlock icon={BarChart3} title={t("visualAnalysis")} description={t("visualAnalysisDescription")}>
							<div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3 xl:gap-5">
								<div className="min-w-0">
									<MatchGoalkeepersPieChart stats={matchStats} match={match} />
								</div>
								<div className="min-w-0">
									<MatchGoalkeeperGoalsAgainstChart stats={matchStats} match={match} players={players} />
								</div>
								<div className="min-w-0">
									<MatchGoalkeeperSavesBreakdownChart stats={matchStats} match={match} players={players} />
								</div>
							</div>
						</ContentBlock>

						<ContentBlock icon={ListTree} title={t("statisticalBreakdown")} description={t("statisticalBreakdownDescription")} muted>
							<MatchGoalkeeperTotals stats={matchStats} hiddenStats={hiddenStats} showSummary={false} />
						</ContentBlock>
					</SectionBlock>
				</TabsContent>
			</Tabs>
		</div>
	);
}
