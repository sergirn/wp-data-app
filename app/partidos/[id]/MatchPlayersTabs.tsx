"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Hand, LayoutGrid, ListTree, Shield, Target } from "lucide-react";
import { useTranslations } from "next-intl";

import { PlayerStatsCard } from "@/components/match-components/players-match-cards/PlayerStatsCard";
import { GoalkeeperStatsCard } from "@/components/match-components/players-match-cards/GoalkeeperStatsCard";

import { GoalkeeperShotsGoalChart } from "@/components/analytics-goalkeeper/GoalkeeperShotsGoalChart";

import { accumulatePlayerStats, getPlayerSummary } from "@/lib/stats/playerStatsHelpers";
import { accumulateGoalkeeperStats, getGoalkeeperSummary } from "@/lib/stats/goalkeeperStatsHelpers";
import { MatchAttackTotals, MatchDefenseTotals, MatchGoalkeeperTotals } from "@/components/match-components/total-stats-match/MatchTotals";
import { MatchPhaseOverview } from "@/components/match-components/MatchPhaseOverview";
import { MatchPhaseVisualDashboard } from "@/components/match-components/MatchVisualDashboard";

type PlayerLite = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
};

type Props = {
	section?: "all" | "analysis" | "players";
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
	section = "all",
	fieldPlayersStats,
	goalkeepersStats,
	matchId,
	clubName,
	opponentName,
	matchDateLabel,
	match,
	matchStats,
	allGoalkeeperShots,
	players,
	hiddenStats = []
}: Props) {
	const t = useTranslations("MatchTabs");
	const hasGoalkeepers = (goalkeepersStats?.length ?? 0) > 0;
	const showPlayers = section !== "analysis";
	const showAnalysis = section !== "players";

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

	const savePct = goalkeeperSummary.savePct;

	return (
		<div className="space-y-6">
			{showPlayers ? <div className="rounded-2xl border bg-card/40 p-3 sm:p-4">
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
			</div> : null}

			<Tabs defaultValue={showPlayers ? "players" : "attack"} className="w-full">
				{section === "all" ? <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/30 p-1.5 sm:grid-cols-4 sm:gap-2">
					<TabsTrigger
						value="players"
						className="min-w-0 rounded-xl px-1.5 py-2.5 text-[10px] font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<LayoutGrid className="h-4 w-4 shrink-0" />
							<span className="truncate">{t("players")}</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="attack"
						className="min-w-0 rounded-xl px-1.5 py-2.5 text-[10px] font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Target className="h-4 w-4 shrink-0" />
							<span className="truncate">{t("attack")}</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="defense"
						className="min-w-0 rounded-xl px-1.5 py-2.5 text-[10px] font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Shield className="h-4 w-4 shrink-0" />
							<span className="truncate">{t("defense")}</span>
						</div>
					</TabsTrigger>

					<TabsTrigger
						value="goalkeeper"
						className="min-w-0 rounded-xl px-1.5 py-2.5 text-[10px] font-medium transition-all data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
					>
						<div className="flex items-center justify-center gap-2 w-full">
							<Hand className="h-4 w-4 shrink-0" />
							<span className="truncate">{t("goalkeeper")}</span>
						</div>
					</TabsTrigger>
				</TabsList> : showAnalysis ? <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-muted/30 p-1.5 sm:gap-2">
					<TabsTrigger value="attack" className="rounded-xl px-2 py-2.5 text-xs data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-4 sm:text-sm">
						<Target className="size-4" /> {t("attack")}
					</TabsTrigger>
					<TabsTrigger value="defense" className="rounded-xl px-2 py-2.5 text-xs data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-4 sm:text-sm">
						<Shield className="size-4" /> {t("defense")}
					</TabsTrigger>
					<TabsTrigger value="goalkeeper" className="rounded-xl px-2 py-2.5 text-xs data-[state=active]:border-primary/35 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-4 sm:text-sm">
						<Hand className="size-4" /> {t("goalkeeper")}
					</TabsTrigger>
				</TabsList> : null}

				{showPlayers ? <TabsContent value="players" className="mt-4 space-y-6">
					<div className="space-y-3">
						<p className="text-sm font-semibold text-muted-foreground">{t("fieldPlayers")}</p>

						<div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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

							<div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
								{goalkeepersStats.map((stat: any) => (
									<GoalkeeperStatsCard key={stat.id} stat={stat} player={stat.players} hiddenStats={hiddenStats} />
								))}
							</div>
						</div>
					) : null}
				</TabsContent> : null}

				{showAnalysis ? <TabsContent value="attack" className="mt-5 space-y-8">
					<SectionBlock title={t("attack")} description={t("attackDescription")}>
						<MatchPhaseOverview phase="attack" stats={matchStats} hiddenStats={hiddenStats} />

						<ContentBlock icon={BarChart3} title={t("visualAnalysis")} description={t("visualAnalysisDescription")}>
							<MatchPhaseVisualDashboard phase="attack" matchStats={matchStats} players={players} hiddenStats={hiddenStats} />
						</ContentBlock>

						<ContentBlock icon={ListTree} title={t("statisticalBreakdown")} description={t("statisticalBreakdownDescription")} muted>
							<MatchAttackTotals stats={matchStats} hiddenStats={hiddenStats} showSummary={false} />
						</ContentBlock>
					</SectionBlock>
				</TabsContent> : null}

				{showAnalysis ? <TabsContent value="defense" className="mt-5 space-y-8">
					<SectionBlock title={t("defense")} description={t("defenseDescription")}>
						<MatchPhaseOverview phase="defense" stats={matchStats} hiddenStats={hiddenStats} />

						<ContentBlock icon={BarChart3} title={t("visualAnalysis")} description={t("visualAnalysisDescription")}>
							<MatchPhaseVisualDashboard phase="defense" matchStats={matchStats} players={players} hiddenStats={hiddenStats} />
						</ContentBlock>

						<ContentBlock icon={ListTree} title={t("statisticalBreakdown")} description={t("statisticalBreakdownDescription")} muted>
							<MatchDefenseTotals stats={matchStats} hiddenStats={hiddenStats} showSummary={false} />
						</ContentBlock>
					</SectionBlock>
				</TabsContent> : null}

				{showAnalysis ? <TabsContent value="goalkeeper" className="mt-5 space-y-8">
					<SectionBlock title={t("goalkeeper")} description={t("goalkeeperDescription")}>
						<MatchPhaseOverview phase="goalkeeper" stats={matchStats} hiddenStats={hiddenStats} />

						<GoalkeeperShotsGoalChart
							rows={allGoalkeeperShots}
							matches={[{ id: matchId, jornada: match?.jornada, match_date: match?.match_date }]}
							players={players}
						/>

						<ContentBlock icon={BarChart3} title={t("visualAnalysis")} description={t("visualAnalysisDescription")}>
							<MatchPhaseVisualDashboard phase="goalkeeper" matchStats={matchStats} players={players} hiddenStats={hiddenStats} />
						</ContentBlock>

						<ContentBlock icon={ListTree} title={t("statisticalBreakdown")} description={t("statisticalBreakdownDescription")} muted>
							<MatchGoalkeeperTotals stats={matchStats} hiddenStats={hiddenStats} showSummary={false} />
						</ContentBlock>
					</SectionBlock>
				</TabsContent> : null}
			</Tabs>
		</div>
	);
}
