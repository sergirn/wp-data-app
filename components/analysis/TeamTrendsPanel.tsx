"use client";

import { useMemo } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Gauge, Shield, Target } from "lucide-react";
import { useTranslations } from "next-intl";

import { buildRecentTrendInsights, calculatePerformanceSnapshot } from "@/lib/analysis/performance-insights";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MatchLite = { id: number; match_date?: string | null; home_score?: number | null; away_score?: number | null };
type StatLite = Record<string, unknown> & { match_id?: number; player_id?: number };
type PlayerLite = { id: number; is_goalkeeper?: boolean | null };

export function TeamTrendsPanel({ matches, stats, players = [] }: { matches: MatchLite[]; stats: StatLite[]; players?: PlayerLite[] }) {
	const t = useTranslations("ProductTrends");
	const data = useMemo(() => {
		const roleByPlayer = new Map(players.map((player) => [player.id, player.is_goalkeeper === true]));
		const enrichedStats = stats.map((stat) => ({ ...stat, players: { is_goalkeeper: roleByPlayer.get(Number(stat.player_id)) === true } }));
		const ordered = [...matches].sort((a, b) => Date.parse(b.match_date ?? "") - Date.parse(a.match_date ?? ""));
		const recent = ordered.slice(0, 5);
		const previous = ordered.slice(5, 10);
		const current = calculatePerformanceSnapshot(recent, enrichedStats);
		const baseline = calculatePerformanceSnapshot(previous, enrichedStats);
		const perMatch = (value: number, count: number) => count > 0 ? value / count : 0;
		return {
			recentCount: recent.length,
			previousCount: previous.length,
			insights: buildRecentTrendInsights(ordered, enrichedStats),
			metrics: [
				{ key: "goals", icon: Target, current: perMatch(current.goals, recent.length), previous: perMatch(baseline.goals, previous.length), suffix: "" },
				{ key: "goalsAgainst", icon: Shield, current: perMatch(current.goalsAgainst, recent.length), previous: perMatch(baseline.goalsAgainst, previous.length), suffix: "", inverse: true },
				{ key: "shooting", icon: Gauge, current: current.shootingEfficiency, previous: baseline.shootingEfficiency, suffix: "%" },
				{ key: "saves", icon: Activity, current: current.savePercentage, previous: baseline.savePercentage, suffix: "%" }
			]
		};
	}, [matches, players, stats]);

	if (data.recentCount < 2) return null;
	return (
		<Card className="overflow-hidden rounded-2xl border-border/70">
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Activity className="size-5 text-primary" />{t("title")}</CardTitle>
				<CardDescription>{data.previousCount >= 2 ? t("description", { current: data.recentCount, previous: data.previousCount }) : t("shortDescription", { count: data.recentCount })}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{data.metrics.map((metric) => {
						const rawDelta = metric.current - metric.previous;
						const positive = metric.inverse ? rawDelta < 0 : rawDelta > 0;
						const neutral = data.previousCount < 2 || Math.abs(rawDelta) < 0.5;
						const Icon = metric.icon;
						return <div key={metric.key} className="rounded-xl border bg-muted/[0.12] p-3 sm:p-4">
							<div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{t(`metrics.${metric.key}`)}</p><Icon className="size-4 text-primary" /></div>
							<p className="mt-2 text-xl font-bold tabular-nums">{metric.current.toFixed(metric.suffix ? 0 : 1)}{metric.suffix}</p>
							{data.previousCount >= 2 && <p className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium", neutral ? "text-muted-foreground" : positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
								{neutral ? <ArrowRight className="size-3" /> : rawDelta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
								{t("delta", { value: Math.abs(rawDelta).toFixed(metric.suffix ? 0 : 1) })}
							</p>}
						</div>;
					})}
				</div>
				{data.insights.map((insight) => <div key={insight.code} className={cn("rounded-xl border px-4 py-3 text-sm font-medium", insight.tone === "positive" ? "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300" : "border-amber-500/25 bg-amber-500/[0.07] text-amber-700 dark:text-amber-300")}>{t(`insights.${insight.code}`, { delta: Math.abs(insight.delta ?? 0) })}</div>)}
			</CardContent>
		</Card>
	);
}

