import type { AnalysisThresholds, PerformanceSnapshot } from "@/lib/analysis/performance-insights";

export const MAX_CLUB_OBJECTIVES = 9;

export const OBJECTIVE_METRICS = [
	"shootingEfficiency",
	"powerPlayEfficiency",
	"turnoversPerMatch",
	"savePercentage",
	"goalsAgainstPerMatch",
	"goalsPerMatch",
	"recoveriesPerMatch",
	"possessionBalancePerMatch",
	"blocksPerMatch"
] as const;

export type ObjectiveMetric = (typeof OBJECTIVE_METRICS)[number];
export type ObjectiveUnit = "percentage" | "number";
export type ObjectiveComparator = "gte" | "lte";

export type ClubObjective = {
	id: string;
	title: string;
	metric: ObjectiveMetric;
	unit: ObjectiveUnit;
	comparator: ObjectiveComparator;
	target: number;
};

const isMetric = (value: unknown): value is ObjectiveMetric => OBJECTIVE_METRICS.includes(value as ObjectiveMetric);

export function normalizeClubObjectives(value: unknown): ClubObjective[] {
	if (!Array.isArray(value)) return [];

	return value.slice(0, MAX_CLUB_OBJECTIVES).flatMap((item, index) => {
		if (!item || typeof item !== "object") return [];
		const row = item as Record<string, unknown>;
		const target = Number(row.target);
		if (!isMetric(row.metric) || !Number.isFinite(target)) return [];

		return [{
			id: typeof row.id === "string" && row.id ? row.id : `objective-${index}-${row.metric}`,
			title: typeof row.title === "string" ? row.title.slice(0, 80) : "",
			metric: row.metric,
			unit: row.unit === "number" ? "number" : "percentage",
			comparator: row.comparator === "lte" ? "lte" : "gte",
			target: Math.max(0, Math.min(row.unit === "number" ? 9999 : 100, target))
		}];
	});
}

export function createDefaultClubObjectives(
	thresholds: AnalysisThresholds,
	getTitle: (metric: ObjectiveMetric) => string
): ClubObjective[] {
	return [
		{ id: "default-shooting", title: getTitle("shootingEfficiency"), metric: "shootingEfficiency", unit: "percentage", comparator: "gte", target: thresholds.shootingEfficiencyTarget },
		{ id: "default-power-play", title: getTitle("powerPlayEfficiency"), metric: "powerPlayEfficiency", unit: "percentage", comparator: "gte", target: thresholds.powerPlayTarget },
		{ id: "default-turnovers", title: getTitle("turnoversPerMatch"), metric: "turnoversPerMatch", unit: "number", comparator: "lte", target: thresholds.turnoverWarning },
		{ id: "default-saves", title: getTitle("savePercentage"), metric: "savePercentage", unit: "percentage", comparator: "gte", target: thresholds.savePercentageTarget },
		{ id: "default-goals-against", title: getTitle("goalsAgainstPerMatch"), metric: "goalsAgainstPerMatch", unit: "number", comparator: "lte", target: thresholds.maxGoalsAgainst }
	];
}

export function getObjectiveCurrentValue(snapshot: PerformanceSnapshot, metric: ObjectiveMetric) {
	const matchCount = Math.max(1, snapshot.matchCount);
	const values: Record<ObjectiveMetric, number> = {
		shootingEfficiency: snapshot.shootingEfficiency,
		powerPlayEfficiency: snapshot.powerPlayEfficiency,
		turnoversPerMatch: snapshot.turnovers / matchCount,
		savePercentage: snapshot.savePercentage,
		goalsAgainstPerMatch: snapshot.goalsAgainst / matchCount,
		goalsPerMatch: snapshot.goals / matchCount,
		recoveriesPerMatch: snapshot.recoveries / matchCount,
		possessionBalancePerMatch: snapshot.possessionBalance / matchCount,
		blocksPerMatch: snapshot.blocks / matchCount
	};
	return values[metric];
}

export const isObjectiveMet = (current: number, objective: ClubObjective) =>
	objective.comparator === "lte" ? current <= objective.target : current >= objective.target;

export function getObjectiveProgress(current: number, objective: ClubObjective) {
	if (objective.target === 0) return isObjectiveMet(current, objective) ? 100 : 0;
	const progress = objective.comparator === "lte"
		? (objective.target / Math.max(current, 0.01)) * 100
		: (current / objective.target) * 100;
	return Math.max(0, Math.min(100, progress));
}
