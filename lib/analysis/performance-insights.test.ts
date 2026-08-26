import { describe, expect, it } from "vitest";

import { buildMatchInsights, calculatePerformanceSnapshot, validateMatchData } from "./performance-insights";

const match = {
	id: 1,
	match_date: "2026-08-01",
	home_score: 3,
	away_score: 2,
	q1_score: 1,
	q2_score: 1,
	q3_score: 1,
	q4_score: 0,
	q1_score_rival: 0,
	q2_score_rival: 1,
	q3_score_rival: 1,
	q4_score_rival: 0
};

const stats = [
	{
		match_id: 1,
		players: { is_goalkeeper: false },
		goles_boya_jugada: 1,
		goles_hombre_mas: 2,
		tiros_hombre_mas: 1,
		tiros_totales: 6,
		acciones_recuperacion: 4,
		acciones_perdida_poco: 2
	},
	{
		match_id: 1,
		players: { is_goalkeeper: true },
		portero_goles_lanzamiento: 1,
		portero_goles_extremo: 1,
		portero_tiros_parada_recup: 3,
		portero_paradas_fuera: 1
	}
];

describe("performance insights", () => {
	it("calculates source-based team performance without duplicating goalkeeper totals", () => {
		const result = calculatePerformanceSnapshot([match], stats);
		expect(result.calculatedGoals).toBe(3);
		expect(result.calculatedGoalsAgainst).toBe(2);
		expect(result.shootingEfficiency).toBe(50);
		expect(result.savePercentage).toBe(67);
	});

	it("detects score and quarter inconsistencies", () => {
		const issues = validateMatchData({ ...match, q4_score: 1 }, stats, 2);
		expect(issues.map((issue) => issue.code)).toContain("own_quarters_mismatch");
		expect(issues.map((issue) => issue.code)).not.toContain("own_score_mismatch");
	});

	it("creates actionable insights from configured targets", () => {
		const insights = buildMatchInsights(match, stats);
		expect(insights.map((insight) => insight.code)).toContain("shooting_above_target");
		expect(insights.map((insight) => insight.code)).toContain("power_play_above_target");
	});
});
