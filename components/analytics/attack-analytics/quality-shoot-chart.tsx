"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Target } from "lucide-react";
import { buildShotMistakesSeasonData } from "@/lib/helpers/chartMistakeShootHelper";
import { ShotMistakesChartBase } from "@/components/templates/charts/ShotMistakesChartTemplate";

type PlayerLite = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
};

interface ShotMistakesDonutChartProps {
	matches: any[];
	stats: any[];
	players: PlayerLite[];
	hiddenStats?: string[];
}

function playerLabelShort(p: { id: number; name: string; number?: number | null; photo_url?: string | null } | null, value: number) {
	if (!p) return "—";
	const num = p.number != null ? `#${p.number}` : "#-";
	return `${num} (${value})`;
}

function playerLabelFull(p: { id: number; name: string; number?: number | null; photo_url?: string | null } | null, value: number) {
	if (!p) return "—";
	const num = p.number != null ? `#${p.number}` : "#-";
	return `${num} ${p.name} (${value})`;
}

export function ShotMistakesDonutChart({ matches, stats, players, hiddenStats = [] }: ShotMistakesDonutChartProps) {
	const t = useTranslations("ShotMistakesTemplate")
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

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

	const data = useMemo(
		() =>
			buildShotMistakesSeasonData(matches ?? [], stats ?? [], playersById, {
				hiddenStats,
				hiddenSet
			}),
		[matches, stats, playersById, hiddenStats, hiddenSet]
	);

	if (!data?.summary?.total) return null;

	const labelByKey: Record<string, string> = {
		pen: t("penaltyShort"), corner: t("corner"), out: t("out"), palo: t("post"),
		saved: t("saved"), blocked: t("blockedShort"), sup: t("powerPlayShort")
	}
	const parts = data.summary.parts.map((part) => ({ ...part, label: labelByKey[part.key] ?? part.label }))
	const topType = data.summary.topType
		? { ...data.summary.topType, label: labelByKey[data.summary.topType.key] ?? data.summary.topType.label }
		: null
	const localizedSummary = { ...data.summary, parts, topType }

	const getTopPlayerByKey = (key: "pen" | "corner" | "out" | "palo" | "saved" | "blocked" | "sup") => {
		let best = data.perPlayer[0] ?? null;

		for (const row of data.perPlayer ?? []) {
			if ((row[key] ?? 0) > ((best?.[key] as number) ?? 0)) {
				best = row;
			}
		}

		return {
			player: best?.player ?? null,
			value: (best?.[key] as number) ?? 0
		};
	};

	const topPlayers = {
		pen: getTopPlayerByKey("pen"),
		corner: getTopPlayerByKey("corner"),
		out: getTopPlayerByKey("out"),
		palo: getTopPlayerByKey("palo"),
		saved: getTopPlayerByKey("saved"),
		blocked: getTopPlayerByKey("blocked"),
		sup: getTopPlayerByKey("sup")
	};

	const topLineCompact =
		data.summary.total > 0
			? t("topCompact", {
				out: playerLabelShort(topPlayers.out.player, topPlayers.out.value),
				saved: playerLabelShort(topPlayers.saved.player, topPlayers.saved.value),
				blocked: playerLabelShort(topPlayers.blocked.player, topPlayers.blocked.value)
			})
			: t("noData");

	const topLineFull =
		data.summary.total > 0
			? t("topSeason", {
				penalty: playerLabelFull(topPlayers.pen.player, topPlayers.pen.value),
				corner: playerLabelFull(topPlayers.corner.player, topPlayers.corner.value),
				out: playerLabelFull(topPlayers.out.player, topPlayers.out.value),
				post: playerLabelFull(topPlayers.palo.player, topPlayers.palo.value),
				saved: playerLabelFull(topPlayers.saved.player, topPlayers.saved.value),
				blocked: playerLabelFull(topPlayers.blocked.player, topPlayers.blocked.value),
				powerPlay: playerLabelFull(topPlayers.sup.player, topPlayers.sup.value)
			})
			: t("topSeasonEmpty");

	const mostFrequentText = data.summary.total > 0 && topType ? topType.label : t("noMissData");

	return (
		<ShotMistakesChartBase
			title={t("title")}
			description={`${mostFrequentText} · ${topLineCompact}`}
			icon={<Target className="w-5 h-5" />}
			summary={localizedSummary}
			perPlayer={data.perPlayer}
			perMatch={data.perMatch}
			mode="season"
			topLineCompact={topLineCompact}
			topLineFull={topLineFull}
			rightHeader={<span className="text-xs text-muted-foreground">{data.summary.total ? topType?.label ?? "—" : "—"}</span>}
		/>
	);
}
