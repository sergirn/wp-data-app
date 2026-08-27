import { describe, expect, it } from "vitest";

import { getObjectiveCurrentValue, isObjectiveMet, normalizeClubObjectives } from "@/lib/analysis/club-objectives";
import type { PerformanceSnapshot } from "@/lib/analysis/performance-insights";

const snapshot: PerformanceSnapshot = {
	matchCount: 2, goals: 20, calculatedGoals: 20, goalsAgainst: 16, calculatedGoalsAgainst: 16,
	shots: 50, shootingEfficiency: 40, powerPlayGoals: 5, powerPlayAttempts: 10,
	powerPlayEfficiency: 50, recoveries: 18, turnovers: 12, possessionBalance: 6,
	blocks: 8, saves: 20, shotsFaced: 36, savePercentage: 56
};

describe("club objectives", () => {
	it("normalizes and limits objectives to nine", () => {
		const rows = Array.from({ length: 12 }, (_, index) => ({ id: String(index), title: `Goal ${index}`, metric: "goalsPerMatch", unit: "number", comparator: "gte", target: 8 }));
		expect(normalizeClubObjectives(rows)).toHaveLength(9);
	});

	it("calculates per-match metrics and both comparison directions", () => {
		expect(getObjectiveCurrentValue(snapshot, "goalsPerMatch")).toBe(10);
		expect(isObjectiveMet(10, { id: "1", title: "Goals", metric: "goalsPerMatch", unit: "number", comparator: "gte", target: 9 })).toBe(true);
		expect(isObjectiveMet(8, { id: "2", title: "Conceded", metric: "goalsAgainstPerMatch", unit: "number", comparator: "lte", target: 9 })).toBe(true);
	});
});
