import { describe, expect, it } from "vitest";

import { calculateMatchScore } from "./calculate-match-score";

describe("calculateMatchScore", () => {
	it("separates field and goalkeeper goals from rival goals", () => {
		const players = new Map([
			[1, { is_goalkeeper: false }],
			[13, { is_goalkeeper: true }]
		]);
		const score = calculateMatchScore({
			1: { goles_boya_jugada: 2, goles_hombre_mas: 1, goles_totales: 99 },
			13: { portero_gol: 1, portero_gol_superioridad: 1, portero_goles_lanzamiento: 3, portero_goles_totales: 99 }
		}, players);

		expect(score).toEqual({ ownGoals: 5, opponentGoals: 3 });
	});

	it("adds conceded goals from every goalkeeper without counting saves or derived totals", () => {
		const players = new Map([
			[1, { is_goalkeeper: true }],
			[2, { is_goalkeeper: true }]
		]);
		const score = calculateMatchScore({
			1: { portero_goles_penalti: 2, portero_paradas_penalti_parado: 3, portero_goles_totales: 20 },
			2: { portero_goles_contraataque: 1, portero_goles_hombre_menos: 2, portero_goles_extremo: 2 }
		}, players);

		expect(score).toEqual({ ownGoals: 0, opponentGoals: 7 });
	});
});
