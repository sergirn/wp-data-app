"use client";

import * as React from "react";
import { type PlayerStatCategory } from "@/lib/stats/playerStatsConfig";
import { getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { useTranslations } from "next-intl";

type RowRendererProps = {
	label: string;
	value: React.ReactNode;
	statKey: string;
};

type Props = {
	stats: Record<string, any> | null | undefined;
	renderRow: (props: RowRendererProps) => React.ReactNode;
	mode?: "totals" | "match" | "team";
	categories?: PlayerStatCategory[];
	hiddenStats?: string[];
};

const DEFAULT_CATEGORIES: PlayerStatCategory[] = ["goles", "fallos", "faltas", "acciones"];
const CATEGORY_KEYS = { goles: "playerGoals", fallos: "playerMisses", faltas: "fouls", acciones: "actions" } as const;

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
	return (
		<div className="rounded-2xl border bg-card/40">
			<div className="flex items-start justify-between gap-3 px-4 py-3 border-b">
				<div className="min-w-0">
					<h4 className="text-sm font-semibold leading-tight">{title}</h4>
					{hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
				</div>
			</div>
			<div className="p-2">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">{children}</div>
			</div>
		</div>
	);
}

export function PlayerStatsSections({ stats, renderRow, mode = "totals", categories = DEFAULT_CATEGORIES, hiddenStats = [] }: Props) {
	const t = useTranslations("StatsSections");
	const tStat = useTranslations("StatLabels");
	const isVisible = (statKey: string) => !hiddenStats.includes(statKey);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{categories.map((category) => {
				const items = getPlayerStatsByCategory(category).filter((it) => isVisible(it.key));
				if (!items.length) return null;

				const categoryKey = CATEGORY_KEYS[category];
				const title = t(`categories.${categoryKey}`);
				const baseHint = t(`hints.${categoryKey}`);

				const hint =
					mode === "match"
						? baseHint
							? t("context", { hint: baseHint, scope: t("match") })
							: t("match")
						: mode === "team"
							? baseHint
								? t("context", { hint: baseHint, scope: t("team") })
								: t("team")
							: (baseHint ?? t("totals"));

				return (
					<Section key={category} title={title} hint={hint}>
						{items.map((it) =>
							renderRow({
								label: tStat(it.key),
								value: stats?.[it.key] ?? 0,
								statKey: it.key
							})
						)}
					</Section>
				);
			})}
		</div>
	);
}
