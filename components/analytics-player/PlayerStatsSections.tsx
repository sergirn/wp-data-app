"use client";

import * as React from "react";
import { PLAYER_CATEGORY_HINTS, PLAYER_CATEGORY_TITLES, type PlayerStatCategory } from "@/lib/stats/playerStatsConfig";
import { getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";

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
	const isVisible = (statKey: string) => !hiddenStats.includes(statKey);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{categories.map((category) => {
				const items = getPlayerStatsByCategory(category).filter((it) => isVisible(it.key));
				if (!items.length) return null;

				const title = PLAYER_CATEGORY_TITLES[category];
				const baseHint = PLAYER_CATEGORY_HINTS[category];

				const hint =
					mode === "match"
						? baseHint
							? `${baseHint} · Partido`
							: "Partido"
						: mode === "team"
							? baseHint
								? `${baseHint} · Equipo`
								: "Equipo"
							: (baseHint ?? "Totales");

				return (
					<Section key={category} title={title} hint={hint}>
						{items.map((it) =>
							renderRow({
								label: it.label,
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
