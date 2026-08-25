import { describe, expect, it } from "vitest";

import { buildOpponentScouting } from "./scouting";

describe("buildOpponentScouting", () => {
	it("summarizes head-to-head results and quarters from our club perspective", () => {
		const scouting = buildOpponentScouting([
			{ id: 1, match_date: "2026-01-01", opponent: "CNB", home_score: 10, away_score: 8, q1_score: 3, q1_score_rival: 1 },
			{ id: 2, match_date: "2026-02-01", opponent: "CN Barcelona", home_score: 7, away_score: 9, q1_score: 1, q1_score_rival: 3 }
		], []);

		expect(scouting).toMatchObject({ played: 2, wins: 1, losses: 1, ownGoals: 17, opponentGoals: 17 });
		expect(scouting.quarters[0]).toEqual({ quarter: 1, own: 4, opponent: 4, difference: 0 });
	});

	it("ranks our players using enabled matches only", () => {
		const scouting = buildOpponentScouting([
			{ id: 1, match_date: "2026-01-01", opponent: "CNB", home_score: 10, away_score: 8, stats_enabled: true },
			{ id: 2, match_date: "2026-02-01", opponent: "CNB", home_score: 8, away_score: 8, stats_enabled: false }
		], [
			{ match_id: 1, player_id: 4, goles_totales: 3, acciones_asistencias: 2, players: { id: 4, name: "Player", number: 4, is_goalkeeper: false } },
			{ match_id: 2, player_id: 4, goles_totales: 20, acciones_asistencias: 10, players: { id: 4, name: "Player", number: 4, is_goalkeeper: false } }
		]);

		expect(scouting.players[0]).toMatchObject({ id: 4, goals: 3, assists: 2, matches: 1 });
	});

	it("infers the opponent power play only from goalkeeper man-down goals", () => {
		const scouting = buildOpponentScouting([
			{ id: 1, match_date: "2026-01-01", opponent: "CNB", home_score: 8, away_score: 9 }
		], [
			{
				match_id: 1,
				player_id: 1,
				portero_goles_hombre_menos: 3,
				portero_gol_superioridad: 1,
				players: { id: 1, name: "Goalkeeper", number: 1, is_goalkeeper: true }
			}
		]);

		expect(scouting.opponentAttack.powerPlayGoals).toBe(3);
	});
});
