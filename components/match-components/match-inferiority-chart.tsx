"use client";

import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buildInferiorityBreakdown, buildInferiorityConversionData } from "@/lib/helpers/chartHelpers";
import { MatchConversionChartTemplate } from "../templates/charts/MatchConversionChartTemplate";
import { useTranslations } from "next-intl";

function Row({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"flex items-center justify-between gap-3",
				"rounded-xl px-3 py-2 border transition-colors",
				subtle ? "bg-muted/30 border-transparent" : "bg-card/40 border-border/60"
			].join(" ")}
		>
			<span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}

export function MatchInferiorityChart({ matchStats }: { matchStats: any[] }) {
	const t = useTranslations("MatchCharts");
	const data = useMemo(() => buildInferiorityConversionData(matchStats ?? []), [matchStats]);
	const breakdown = useMemo(() => buildInferiorityBreakdown(matchStats ?? []), [matchStats]);

	const avoided = data.missed;
	const received = data.scored + (data.scoredExtra ?? 0);
	const deltaAvoided = avoided - breakdown.avoidedBreakdown;

	return (
		<MatchConversionChartTemplate
			title={t("inferiority")}
			icon={<ShieldAlert className="h-5 w-5" />}
			data={data}
			scoredLabel={t("received")}
			scoredExtraLabel={t("postGoal")}
			missedLabel={t("avoided")}
			insightGood={t("inferiorityGood")}
			insightBad={t("inferiorityBad")}
			description={t("inferiorityDescription", { avoided, attempts: data.attempts, efficiency: data.efficiency, saves: breakdown.saves, out: breakdown.out, blocks: breakdown.blocks })}
			renderExtraChartSummary={
				<div className="rounded-2xl border bg-card/40 p-3">
					<div className="flex items-center justify-between gap-2">
						<p className="text-xs font-semibold text-muted-foreground">{t("avoidedDetail")}</p>
						<Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
							{breakdown.avoidedBreakdown}/{avoided}
						</Badge>
					</div>

					<div className="mt-2 grid grid-cols-2 gap-2">
						<Row label={t("saves")} value={breakdown.saves} />
						<Row label={t("out")} value={breakdown.out} />
						<div className="col-span-2">
							<Row label={t("blocks")} value={breakdown.blocks} />
						</div>

						{deltaAvoided !== 0 ? (
							<div className="col-span-2">
								<Row
								label={t("adjustment")}
									value={
										<span className="tabular-nums">
											{deltaAvoided >= 0 ? "+" : ""}
											{deltaAvoided}
										</span>
									}
									subtle
								/>
							</div>
						) : null}
					</div>
				</div>
			}
			renderExtraTableSummary={
				<div className="rounded-2xl border bg-muted/20 p-3">
					<div className="flex items-center justify-between gap-2">
						<p className="text-xs font-semibold text-muted-foreground">{t("avoidedDetail")}</p>
						<Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
							{breakdown.avoidedBreakdown}/{avoided}
						</Badge>
					</div>

					<div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
						<Row label={t("saves")} value={breakdown.saves} />
						<Row label={t("out")} value={breakdown.out} />
						<Row label={t("blocks")} value={breakdown.blocks} />
						<Row label={t("avoidedBreakdown")} value={breakdown.avoidedBreakdown} subtle />

						{deltaAvoided !== 0 ? (
							<Row
							label={t("avoidedDifference")}
								value={
									<span className="tabular-nums">
										{deltaAvoided >= 0 ? "+" : ""}
										{deltaAvoided}
									</span>
								}
								subtle
							/>
						) : null}
					</div>
				</div>
			}
		/>
	);
}
