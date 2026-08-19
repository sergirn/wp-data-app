"use client";

import { useMemo } from "react";
import { Repeat2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MatchStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { MatchConversionChartTemplate } from "../templates/charts/MatchConversionChartTemplate";
import { buildMatchPossessionData } from "@/lib/helpers/chartPossessionHelper";
import { useTranslations } from "next-intl";

type Props = {
	stats: MatchStats[];
	rival?: string;
	matchDateLabel?: string;
	size?: "sm" | "md";
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

export function MatchPossessionChart({ stats, rival, matchDateLabel }: Props) {
	const t = useTranslations("MatchCharts");
	const rivalLabel = rival ?? t("opponent");
	const computed = useMemo(() => buildMatchPossessionData(stats as any[], rivalLabel, matchDateLabel), [stats, rivalLabel, matchDateLabel]);

	if (!stats?.length) return null;

	const balanceSign = computed.balance >= 0 ? "+" : "";

	return (
		<MatchConversionChartTemplate
			title={t("possession")}
			description={t("possessionDescription", { recoveries: computed.recuperaciones, losses: computed.perdidas, balance: `${balanceSign}${computed.balance}` })}
			icon={<Repeat2 className="h-5 w-5" />}
			data={{
				scored: computed.recuperaciones,
				missed: computed.perdidas,
				attempts: computed.totalMov,
				efficiency: computed.pctRec
			}}
			scoredLabel={t("recoveries")}
			missedLabel={t("losses")}
			insightGood={t("possessionGood")}
			insightBad={t("possessionBad")}
			rightHeader={
				<span className="text-xs text-muted-foreground tabular-nums">
					{balanceSign}
					{computed.balance}
				</span>
			}
			okColor="hsl(142 71% 45%)"
			badColor="hsl(0 84% 60%)"
			renderExtraChartSummary={
				<>
					<div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm">
						<div className="flex items-center justify-between gap-3 mb-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("detail")}</p>
							<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
								{t("ratio", { value: computed.ratioRecPer })}
							</Badge>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<Row label={t("recoveriesPercentage")} value={`${computed.pctRec}%`} subtle />
							<Row label={t("lossesPercentage")} value={`${computed.pctPer}%`} subtle />
							<div className="col-span-2">
								<Row label={t("context")} value={computed.context.rival} subtle />
							</div>
						</div>
					</div>
				</>
			}
			renderExtraTableSummary={
				<>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<Row label={t("recoveries")} value={computed.recuperaciones} />
						<Row label={t("losses")} value={computed.perdidas} />
						<Row label={t("balance")} value={`${balanceSign}${computed.balance}`} />
						<Row label={t("totalMovements")} value={computed.totalMov} subtle />
						<Row label={t("recoveriesPercentage")} value={`${computed.pctRec}%`} subtle />
						<Row label={t("lossesPercentage")} value={`${computed.pctPer}%`} subtle />
						<Row label={t("recoveryLossRatio")} value={computed.ratioRecPer} subtle />
						<Row label={t("context")} value={computed.context.rival} subtle />
					</div>

					<div
						className={[
							"rounded-3xl border p-4",
							computed.balance >= 0
								? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800"
								: "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-200 dark:border-red-800"
						].join(" ")}
					>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<div className={["p-2 rounded-full", computed.balance >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"].join(" ")}>
									<Minus className={`h-4 w-4 ${computed.balance >= 0 ? "text-emerald-600" : "text-red-600"}`} />
								</div>
								<span className="text-sm font-medium">{t("finalBalance")}</span>
							</div>

							<span
								className={[
									"text-lg font-bold tabular-nums",
									computed.balance >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
								].join(" ")}
							>
								{balanceSign}
								{computed.balance}
							</span>
						</div>
					</div>
				</>
			}
		/>
	);
}
