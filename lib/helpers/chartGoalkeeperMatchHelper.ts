import { accumulateGoalkeeperStats, getGoalkeeperDerived } from "@/lib/stats/goalkeeperStatsHelpers";

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function buildMatchGoalkeeperConversionData(match: any, stats: any[]) {
	const goalkeeperRows = (stats ?? []).filter((s) => s?.players?.is_goalkeeper);

	const totals = accumulateGoalkeeperStats(goalkeeperRows);
	const derived = getGoalkeeperDerived(totals);

	const goalsConceded = derived.goalsConceded > 0 ? derived.goalsConceded : n(match?.away_score);

	return {
		totals,
		derived: {
			...derived,
			goalsConceded
		},
		extra: {
			inferioritySaves: derived.inferioritySaves,
			penaltySaves: derived.penaltySaves,
			inferiorityOutside: derived.inferiorityOutside,
			inferiorityBlocks: derived.inferiorityBlocks
		}
	};
}
