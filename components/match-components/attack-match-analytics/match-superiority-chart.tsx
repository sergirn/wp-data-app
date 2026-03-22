"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import { buildSuperiorityConversionData } from "@/lib/helpers/chartHelpers";
import { MatchConversionChartTemplate } from "../../templates/charts/MatchConversionChartTemplate";

export function MatchSuperiorityChart({ matchStats }: { matchStats: any[] }) {
	const data = useMemo(() => buildSuperiorityConversionData(matchStats ?? []), [matchStats]);

	return (
		<MatchConversionChartTemplate
			title="Superioridad"
			icon={<Target className="h-5 w-5" />}
			data={data}
			scoredLabel="Anotadas"
			scoredExtraLabel="Gol del palo"
			missedLabel="Falladas"
			recoveredLabel="Recuperados"
			lostLabel="Perdidos"
			insightGood="Superioridad efectiva: buena conversión en H+."
			insightBad="Superioridad mejorable: revisa selección de tiro y rebote tras fallo."
		/>
	);
}
