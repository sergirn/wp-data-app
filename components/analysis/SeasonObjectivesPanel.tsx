"use client";

import { CheckCircle2, CircleDashed, Flag, Target } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { calculatePerformanceSnapshot, type AnalysisThresholds } from "@/lib/analysis/performance-insights";

import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
	matches: Array<Record<string, unknown> & { id: number }>;
	stats: Array<Record<string, unknown> & { player_id?: number }>;
	players: Array<{
		id: number;
		is_goalkeeper?: boolean | null;
	}>;
	thresholds: AnalysisThresholds;
};

export function SeasonObjectivesPanel({ matches, stats, players, thresholds }: Props) {
	const t = useTranslations("SeasonObjectives");

	const objectives = useMemo(() => {
		const roles = new Map(players.map((player) => [player.id, player.is_goalkeeper === true]));

		const snapshot = calculatePerformanceSnapshot(
			matches,
			stats.map((stat) => ({
				...stat,
				players: {
					is_goalkeeper: roles.get(Number(stat.player_id)) === true
				}
			}))
		);

		const count = Math.max(1, snapshot.matchCount);

		return [
			{
				key: "shooting",
				current: snapshot.shootingEfficiency,
				target: thresholds.shootingEfficiencyTarget,
				suffix: "%",
				met: snapshot.shootingEfficiency >= thresholds.shootingEfficiencyTarget,
				inverse: false
			},
			{
				key: "powerPlay",
				current: snapshot.powerPlayEfficiency,
				target: thresholds.powerPlayTarget,
				suffix: "%",
				met: snapshot.powerPlayEfficiency >= thresholds.powerPlayTarget,
				inverse: false
			},
			{
				key: "turnovers",
				current: snapshot.turnovers / count,
				target: thresholds.turnoverWarning,
				suffix: "",
				met: snapshot.turnovers / count <= thresholds.turnoverWarning,
				inverse: true
			},
			{
				key: "saves",
				current: snapshot.savePercentage,
				target: thresholds.savePercentageTarget,
				suffix: "%",
				met: snapshot.savePercentage >= thresholds.savePercentageTarget,
				inverse: false
			},
			{
				key: "goalsAgainst",
				current: snapshot.goalsAgainst / count,
				target: thresholds.maxGoalsAgainst,
				suffix: "",
				met: snapshot.goalsAgainst / count <= thresholds.maxGoalsAgainst,
				inverse: true
			}
		];
	}, [matches, players, stats, thresholds]);

	const achieved = objectives.filter((objective) => objective.met).length;

	if (matches.length === 0) return null;

	return (
		<Card className="@container min-w-0 overflow-hidden rounded-2xl border-border/70">
			<CardHeader className="border-b bg-muted/10 px-4 py-3 sm:px-5 ">
				<div className="flex min-w-0 flex-wrap items-start gap-3 -mb-1">
					{/* Título */}
					<div className="min-w-[180px] flex-1">
						<CardTitle className="flex min-w-0 items-center gap-2 text-base">
							<Flag className="size-5 shrink-0 text-primary" />

							<span className="truncate">{t("title")}</span>
						</CardTitle>

						<CardDescription className="mt-1 hidden text-md @[720px]:block sm:text-sm">
							{t("description", {
								count: matches.length
							})}
						</CardDescription>
					</div>

					{/* Objetivos conseguidos */}
					<div
						className={cn(
							"shrink-0 whitespace-nowrap rounded-full border",
							"bg-background px-3 py-1.5",
							"text-xs font-semibold tabular-nums"
						)}
					>
						{t("achieved", {
							achieved,
							total: objectives.length
						})}
					</div>
				</div>
			</CardHeader>

			<CardContent className="p-3 sm:p-4">
				<div
					className="
						grid gap-3
						[grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr))]
					"
				>
					{objectives.map((objective) => {
						const progress = objective.inverse
							? Math.min(100, objective.target > 0 ? (objective.target / Math.max(objective.current, 0.01)) * 100 : 100)
							: Math.min(100, objective.target > 0 ? (objective.current / objective.target) * 100 : 100);

						return (
							<div
								key={objective.key}
								className={cn(
									"min-w-0 rounded-xl border p-3",
									"transition-colors",
									objective.met ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "bg-muted/[0.12]"
								)}
							>
								{/* Nombre + estado */}
								<div className="flex min-w-0 items-start justify-between gap-2">
									<p className="min-w-0 truncate text-xs font-medium text-muted-foreground">{t(`metrics.${objective.key}`)}</p>

									{objective.met ? (
										<CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
									) : (
										<CircleDashed className="size-4 shrink-0 text-muted-foreground" />
									)}
								</div>

								{/* Valor */}
								<div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
									<span className="text-xl font-bold tabular-nums">
										{objective.current.toFixed(objective.suffix ? 0 : 1)}
										{objective.suffix}
									</span>

									<span className="text-[10px] text-muted-foreground">
										/ {objective.inverse ? "≤" : "≥"} {objective.target}
										{objective.suffix}
									</span>
								</div>

								{/* Progreso */}
								<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
									<div
										className={cn("h-full rounded-full transition-[width]", objective.met ? "bg-emerald-500" : "bg-primary/70")}
										style={{
											width: `${Math.max(4, progress)}%`
										}}
									/>
								</div>

								{/* Estado */}
								<p className="mt-2 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
									<Target className="size-3 shrink-0" />

									<span className="truncate">{objective.met ? t("met") : t("inProgress")}</span>
								</p>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
