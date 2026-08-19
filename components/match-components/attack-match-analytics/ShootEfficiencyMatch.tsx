"use client";

import React, { useMemo } from "react";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchConversionChartTemplate } from "@/components/templates/charts/MatchConversionChartTemplate";
import { useLocale, useTranslations } from "next-intl";


interface MatchShootingEfficiencyChartProps {
	match: any;
	stats: any[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const sumVisibleKeys = (rows: any[], keys: string[], hiddenSet: Set<string>) => {
	return rows.reduce((total, row) => {
		return (
			total +
			keys.reduce((acc, key) => {
				if (hiddenSet.has(key)) return acc;
				return acc + toNum(row?.[key]);
			}, 0)
		);
	}, 0);
};

export function MatchShootingEfficiencyChart({
	match,
	stats,
	hiddenStats = []
}: MatchShootingEfficiencyChartProps) {
	const t = useTranslations("MatchCharts");
	const locale = useLocale();
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const data = useMemo(() => {
		const rows = stats ?? [];

		const generalGoalKeys = [
			"goles_boya_jugada",
			"goles_hombre_mas",
			"goles_lanzamiento",
			"goles_dir_mas_5m",
			"goles_contraataque",
			"goles_penalti_anotado",
			"gol_del_palo_sup"
		];

		const generalMissKeys = [
			"tiros_penalti_fallado",
			"tiros_corner",
			"tiros_fuera",
			"tiros_parados",
			"tiros_bloqueado",
			"tiro_palo",
			"tiros_hombre_mas",
			"portero_paradas_superioridad",
			"jugador_superioridad_bloqueo"
		];

		const goals = sumVisibleKeys(rows, generalGoalKeys, hiddenSet);
		const misses = sumVisibleKeys(rows, generalMissKeys, hiddenSet);
		const attempts = goals + misses;
		const efficiency = attempts > 0 ? Number(((goals / attempts) * 100).toFixed(1)) : 0;

		const goalsSup = hiddenSet.has("goles_hombre_mas") ? 0 : sumVisibleKeys(rows, ["goles_hombre_mas"], hiddenSet);

		const paloSup = hiddenSet.has("gol_del_palo_sup") ? 0 : sumVisibleKeys(rows, ["gol_del_palo_sup"], hiddenSet);

		const missesSupOutside = hiddenSet.has("tiros_hombre_mas") ? 0 : sumVisibleKeys(rows, ["tiros_hombre_mas"], hiddenSet);

		const missesSupSave = hiddenSet.has("portero_paradas_superioridad")
			? 0
			: sumVisibleKeys(rows, ["portero_paradas_superioridad"], hiddenSet);

		const missesSupBlock = hiddenSet.has("jugador_superioridad_bloqueo")
			? 0
			: sumVisibleKeys(rows, ["jugador_superioridad_bloqueo"], hiddenSet);

		const scoredSup = goalsSup + paloSup;
		const attemptsSup = scoredSup + missesSupOutside + missesSupSave + missesSupBlock;
		const efficiencySup = attemptsSup > 0 ? Number(((scoredSup / attemptsSup) * 100).toFixed(1)) : 0;

		const reboundsRecovered = hiddenSet.has("rebote_recup_hombre_mas")
			? 0
			: rows.reduce((sum, s) => sum + toNum(s?.rebote_recup_hombre_mas), 0);

		const reboundsLost = hiddenSet.has("rebote_perd_hombre_mas")
			? 0
			: rows.reduce((sum, s) => sum + toNum(s?.rebote_perd_hombre_mas), 0);

		return {
			goals,
			misses,
			attempts,
			efficiency,
			scoredSup,
			attemptsSup,
			efficiencySup,
			reboundsRecovered,
			reboundsLost
		};
	}, [stats, hiddenSet]);

	if (data.attempts <= 0) return null;

	const rival = match?.opponent ?? "—";
	const jornada = match?.jornada ? `J${match.jornada}` : t("match");
	const fullDate = match?.match_date ? new Date(match.match_date).toLocaleDateString(locale) : "—";

	const extraSummary = (
		<div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm">
			<div className="flex items-center justify-between gap-2 mb-3">
				<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("superiority")}</p>
				<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
					{data.efficiencySup}%
				</Badge>
			</div>

			<div className="grid grid-cols-3 gap-2">
				<div className="rounded-2xl border bg-background/60 p-3">
					<p className="text-[11px] text-muted-foreground">{t("powerPlayGoalsShort")}</p>
					<p className="mt-1 text-base font-semibold tabular-nums">{data.scoredSup}</p>
				</div>

				<div className="rounded-2xl border bg-background/60 p-3">
					<p className="text-[11px] text-muted-foreground">{t("powerPlayShotsShort")}</p>
					<p className="mt-1 text-base font-semibold tabular-nums">{data.attemptsSup}</p>
				</div>

				<div className="rounded-2xl border bg-background/60 p-3">
					<p className="text-[11px] text-muted-foreground">{t("powerPlayEfficiencyShort")}</p>
					<p className="mt-1 text-base font-semibold tabular-nums">{data.efficiencySup}%</p>
				</div>
			</div>
		</div>
	);

	return (
		<MatchConversionChartTemplate
			title={t("shootingEfficiency")}
			description={t("shootingDescription", { round: jornada, opponent: rival, date: fullDate })}
			icon={<Target className="w-5 h-5" />}
			data={{
				scored: data.goals,
				missed: data.misses,
				attempts: data.attempts,
				efficiency: data.efficiency,
				reboundsRecovered: data.reboundsRecovered,
				reboundsLost: data.reboundsLost
			}}
			scoredLabel={t("goals")}
			missedLabel={t("shootingMisses")}
			recoveredLabel={t("reboundsRecoveredShort")}
			lostLabel={t("reboundsLostShort")}
			insightGood={t("shootingGood")}
			insightBad={t("shootingBad")}
			rightHeader={<span className="text-xs text-muted-foreground tabular-nums">{data.efficiency}%</span>}
			okColor="hsla(0, 91%, 60%, 1.00)"
			badColor="hsla(215, 16%, 32%, 0.95)"
			renderExtraChartSummary={extraSummary}
			renderExtraTableSummary={extraSummary}
		/>
	);
}
