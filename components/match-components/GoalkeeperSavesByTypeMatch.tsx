"use client";

import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { buildGoalkeeperSavesSummary, buildGoalkeeperSavesPerPlayer } from "@/lib/helpers/chartGoalkeeperBreakdownHelper";
import { GoalkeeperBreakdownChartBase } from "../templates/charts/GoalkeeperBreakdownChartTemplate";
import { useTranslations } from "next-intl";

type PlayerLiteInput = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
};

type Props = {
	match: any;
	stats: any[];
	players: PlayerLiteInput[];
};

export function MatchGoalkeeperSavesBreakdownChart({ match, stats, players }: Props) {
	const t = useTranslations("MatchCharts");
	const tStat = useTranslations("StatLabels");
	const playersById = useMemo(() => {
		const m = new Map<number, { id: number; name: string; number?: number | null; photo_url?: string | null }>();

		(players ?? []).forEach((p) => {
			const candidate = (p.name ?? p.full_name ?? "").trim();

			m.set(p.id, {
				id: p.id,
				name: candidate.length ? candidate : t("playerFallback", { id: p.id }),
				number: p.number ?? null,
				photo_url: p.photo_url ?? null
			});
		});

		return m;
	}, [players, t]);

	const summary = useMemo(() => buildGoalkeeperSavesSummary(stats ?? [], (key) => tStat(key)), [stats, tStat]);
	const perPlayer = useMemo(() => buildGoalkeeperSavesPerPlayer(stats ?? [], playersById), [stats, playersById]);

	if (!summary.total) return null;

	const matchTitle = match?.opponent ? t("versus", { opponent: match.opponent }) : t("match");
	const topLabel = summary.topType?.label ?? t("noData");

	return (
		<GoalkeeperBreakdownChartBase
			title={t("savesDistribution")}
			description={t("breakdownDescription", { match: matchTitle, top: topLabel, total: summary.total })}
			icon={<ShieldCheck className="h-5 w-5" />}
			summary={summary}
			perPlayer={perPlayer}
			topLineCompact={t("primary", { label: summary.topType?.label ?? "—" })}
			topLineFull={t("primaryWithTotal", { label: summary.topType?.label ?? "—", value: summary.topType?.value ?? 0, total: summary.total })}
		/>
	);
}
