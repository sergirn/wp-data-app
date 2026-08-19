"use client";

import React, { useMemo } from "react";
import { CardContent } from "@/components/ui/card";

import { getPlayerDerived, getPlayerStatsByCategory, accumulatePlayerStats } from "@/lib/stats/playerStatsHelpers";
import { type PlayerStatCategory } from "@/lib/stats/playerStatsConfig";

import { getGoalkeeperDerived, getGoalkeeperStatsByCategory, accumulateGoalkeeperStats } from "@/lib/stats/goalkeeperStatsHelpers";
import { type GoalkeeperStatCategory } from "@/lib/stats/goalkeeperStatsConfig";
import { useTranslations } from "next-intl";

function MiniKpi({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-2xl border bg-background/60 p-3">
			<p className="text-lg font-bold tabular-nums leading-none">{value}</p>
			<p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
		</div>
	);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
			<span className="truncate text-sm text-foreground">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	if (!children) return null;

	return (
		<div className="rounded-2xl border bg-card/40">
			<div className="border-b px-4 py-3">
				<p className="text-sm font-semibold">{title}</p>
			</div>
			<div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">{children}</div>
		</div>
	);
}

function PlayerCategorySection({
	title,
	category,
	stats,
	hiddenStats
}: {
	title: string;
	category: PlayerStatCategory;
	stats: Record<string, any>;
	hiddenStats?: string[] | Set<string>;
}) {
	const tStat = useTranslations("StatLabels");
	const defs = getPlayerStatsByCategory(category, hiddenStats);
	if (!defs.length) return null;

	return (
		<Section title={title}>
			{defs.map((def) => (
				<Row key={def.key} label={tStat(def.key)} value={stats?.[def.key] ?? 0} />
			))}
		</Section>
	);
}

function GoalkeeperCategorySection({
	title,
	category,
	stats,
	hiddenStats
}: {
	title: string;
	category: GoalkeeperStatCategory;
	stats: Record<string, any>;
	hiddenStats?: string[] | Set<string>;
}) {
	const tStat = useTranslations("StatLabels");
	const defs = getGoalkeeperStatsByCategory(category, hiddenStats);
	if (!defs.length) return null;

	return (
		<Section title={title}>
			{defs.map((def) => (
				<Row key={def.key} label={tStat(def.key)} value={stats?.[def.key] ?? 0} />
			))}
		</Section>
	);
}

type MatchTotalsProps = {
	stats: any[];
	hiddenStats?: string[] | Set<string>;
	showSummary?: boolean;
};

export function MatchAttackTotals({ stats, hiddenStats, showSummary = true }: MatchTotalsProps) {
	const t = useTranslations("MatchDetails");
	const totals = useMemo(() => accumulatePlayerStats(stats as any[], hiddenStats), [stats, hiddenStats]);
	const derived = useMemo(() => getPlayerDerived(totals, hiddenStats), [totals, hiddenStats]);

	return (
		<div className="bg-transparent shadow-none">
			<CardContent className="space-y-3 p-0">
				{showSummary ? <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
					<MiniKpi label={t("goals")} value={derived.goals} />
					<MiniKpi label={t("shots")} value={derived.shots} />
					<MiniKpi label={t("effectiveness")} value={`${derived.efficiency}%`} />
					<MiniKpi label={t("assists")} value={derived.assists} />
				</div> : null}

				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					<PlayerCategorySection title={t("categories.playerGoals")} category="goles" stats={totals} hiddenStats={hiddenStats} />
					<PlayerCategorySection title={t("categories.playerMisses")} category="fallos" stats={totals} hiddenStats={hiddenStats} />
					<PlayerCategorySection title={t("categories.fouls")} category="faltas" stats={totals} hiddenStats={hiddenStats} />
					<PlayerCategorySection title={t("categories.actions")} category="acciones" stats={totals} hiddenStats={hiddenStats} />
				</div>
			</CardContent>
		</div>
	);
}

export function MatchDefenseTotals({ stats, hiddenStats, showSummary = true }: MatchTotalsProps) {
	const t = useTranslations("MatchDetails");
	const totals = useMemo(() => accumulatePlayerStats(stats as any[], hiddenStats), [stats, hiddenStats]);
	const derived = useMemo(() => getPlayerDerived(totals, hiddenStats), [totals, hiddenStats]);

	return (
		<div className="bg-transparent shadow-none">
			<CardContent className="space-y-3 p-0">
				{showSummary ? <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
					<MiniKpi label={t("fouls")} value={derived.totalFouls} />
					<MiniKpi label={t("blocks")} value={derived.blocks} />
					<MiniKpi label={t("recoveries")} value={derived.recoveries} />
					<MiniKpi label={t("rebounds")} value={derived.rebounds} />
				</div> : null}

				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					<PlayerCategorySection title={t("categories.fouls")} category="faltas" stats={totals} hiddenStats={hiddenStats} />
					<PlayerCategorySection title={t("categories.actions")} category="acciones" stats={totals} hiddenStats={hiddenStats} />
				</div>
			</CardContent>
		</div>
	);
}

export function MatchGoalkeeperTotals({ stats, hiddenStats, showSummary = true }: MatchTotalsProps) {
	const t = useTranslations("MatchDetails");
	const totals = useMemo(() => accumulateGoalkeeperStats(stats as any[], hiddenStats), [stats, hiddenStats]);
	const derived = useMemo(() => getGoalkeeperDerived(totals, hiddenStats), [totals, hiddenStats]);

	return (
		<div className="bg-transparent shadow-none">
			<CardContent className="space-y-3 p-0">
				{showSummary ? <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
					<MiniKpi label={t("saves")} value={derived.saves} />
					<MiniKpi label={t("goalsConceded")} value={derived.goalsConceded} />
					<MiniKpi label={t("shotsReceived")} value={derived.shotsReceived} />
					<MiniKpi label={t("savePercentage")} value={`${derived.savePct}%`} />
				</div> : null}

				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					<GoalkeeperCategorySection title={t("categories.goalkeeperGoals")} category="goles" stats={totals} hiddenStats={hiddenStats} />
					<GoalkeeperCategorySection
						title={t("categories.saves")}
						category="paradas"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection
						title={t("categories.penalties")}
						category="paradas_penalti"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection
						title={t("categories.otherShots")}
						category="otros_tiros"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection
						title={t("categories.inferiority")}
						category="inferioridad"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection
						title={t("categories.actions")}
						category="acciones"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection title={t("categories.goalkeeperAttack")} category="ataque" stats={totals} hiddenStats={hiddenStats} />
				</div>
			</CardContent>
		</div>
	);
}
