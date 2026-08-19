"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import { buildSuperiorityConversionData } from "@/lib/helpers/chartHelpers";
import { MatchConversionChartTemplate } from "../../templates/charts/MatchConversionChartTemplate";
import { useTranslations } from "next-intl";

export function MatchSuperiorityChart({ matchStats }: { matchStats: any[] }) {
	const t = useTranslations("MatchCharts");
	const data = useMemo(() => buildSuperiorityConversionData(matchStats ?? []), [matchStats]);

	return (
		<MatchConversionChartTemplate
			title={t("superiority")}
			icon={<Target className="h-5 w-5" />}
			data={data}
			scoredLabel={t("scored")}
			scoredExtraLabel={t("postGoal")}
			missedLabel={t("missed")}
			recoveredLabel={t("recovered")}
			lostLabel={t("lost")}
			insightGood={t("superiorityGood")}
			insightBad={t("superiorityBad")}
		/>
	);
}
