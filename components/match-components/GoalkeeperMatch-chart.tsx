"use client";

import { useMemo } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { buildMatchGoalkeeperConversionData } from "@/lib/helpers/chartGoalkeeperMatchHelper";
import { MatchConversionChartTemplate } from "../templates/charts/MatchConversionChartTemplate";
import { useTranslations } from "next-intl";

type Props = {
	match: any;
	stats: any[];
};

function Row({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"flex items-center justify-between gap-3 rounded-xl px-3 py-2 border transition-colors",
				subtle ? "bg-muted/30 border-transparent" : "bg-card/40 border-border/60"
			].join(" ")}
		>
			<span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}

export function MatchGoalkeepersPieChart({ match, stats }: Props) {
	const t = useTranslations("MatchCharts");
	const computed = useMemo(() => buildMatchGoalkeeperConversionData(match, stats ?? []), [match, stats]);

	if (!match) return null;

	const { derived, extra } = computed;

	const hasExtras = extra.inferioritySaves > 0 || extra.penaltySaves > 0 || extra.inferiorityOutside > 0 || extra.inferiorityBlocks > 0;

	return (
		<MatchConversionChartTemplate
			title={t("goalkeepers")}
			description={t("goalkeeperDescription", { saves: derived.saves, shots: derived.shotsReceived, efficiency: derived.savePct, conceded: derived.goalsConceded })}
			icon={<Shield className="h-5 w-5" />}
			data={{
				scored: derived.saves,
				missed: derived.goalsConceded,
				attempts: derived.shotsReceived,
				efficiency: derived.savePct
			}}
			scoredLabel={t("saves")}
			missedLabel={t("goalsConceded")}
			insightGood={t("goalkeeperGood")}
			insightBad={t("goalkeeperBad")}
			rightHeader={<span className="text-xs text-muted-foreground tabular-nums">{derived.savePct}%</span>}
			okColor="hsla(142, 71%, 45%, 0.95)"
			badColor="hsla(45, 90%, 45%, 0.90)"
			renderExtraChartSummary={
				hasExtras ? (
					<div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm">
						<div className="flex items-center justify-between gap-3 mb-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("specialSituations")}</p>
							<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
								{t("detail")}
							</Badge>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<Row label={t("inferioritySavesShort")} value={extra.inferioritySaves} />
							<Row label={t("penaltySaves")} value={extra.penaltySaves} />
							<Row label={t("inferiorityOutShort")} value={extra.inferiorityOutside} subtle />
							<Row label={t("inferiorityBlockShort")} value={extra.inferiorityBlocks} subtle />
						</div>
					</div>
				) : null
			}
			renderExtraTableSummary={
				<>
					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
						<Row label={t("saves")} value={derived.saves} />
						<Row label={t("goalsConceded")} value={derived.goalsConceded} />
						<Row label={t("shotsReceived")} value={derived.shotsReceived} subtle />
						<Row label={t("savePercentage")} value={`${derived.savePct}%`} subtle />
						<Row label={t("penaltiesReceived")} value={derived.penaltyAttempts} subtle />
						<Row label={t("penaltySavePercentage")} value={`${derived.penaltySavePct}%`} subtle />
					</div>

					{hasExtras ? (
						<div className="rounded-3xl border border-border/60 bg-muted/15 p-4">
							<div className="flex items-center justify-between gap-2 mb-3">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("extraDetail")}</p>
								<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
									{t("inferiorityAndPenalties")}
								</Badge>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<Row label={t("inferioritySaves")} value={extra.inferioritySaves} />
								<Row label={t("penaltySaves")} value={extra.penaltySaves} />
								<Row label={t("inferiorityOutShort")} value={extra.inferiorityOutside} subtle />
								<Row label={t("inferiorityBlockShort")} value={extra.inferiorityBlocks} subtle />
								<Row label={t("inferiorityAttemptsShort")} value={derived.inferiorityAttempts} subtle />
								<Row label={t("inferiorityEfficiencyShort")} value={`${derived.inferiorityEfficiency}%`} subtle />
							</div>
						</div>
					) : null}
				</>
			}
		/>
	);
}
