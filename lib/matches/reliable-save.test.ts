import { describe, expect, it } from "vitest";

import { createSaveId, matchSavePayloadSchema, stripManagedStatFields, type MatchSavePayload } from "./reliable-save";

const payload: MatchSavePayload = {
	draft_key: "new:1:8c8d6e48-492b-4d6a-8db1-bc2a45150788",
	match: {
		id: null,
		club_id: 1,
		match_date: "2026-08-25",
		opponent: "CN Example",
		location: null,
		home_score: 1,
		away_score: 0,
		is_home: true,
		season: "2026-2027",
		jornada: 1,
		notes: null,
		q1_score: 1,
		q2_score: 0,
		q3_score: 0,
		q4_score: 0,
		q1_score_rival: 0,
		q2_score_rival: 0,
		q3_score_rival: 0,
		q4_score_rival: 0,
		sprint1_winner: 1,
		sprint2_winner: -1,
		sprint3_winner: -1,
		sprint4_winner: -1,
		sprint1_winner_player_id: 3,
		sprint2_winner_player_id: null,
		sprint3_winner_player_id: null,
		sprint4_winner_player_id: null,
		max_players_on_field: 12,
		penalty_home_score: null,
		penalty_away_score: null,
		competition_id: null,
		stats_enabled: true
	},
	stats: [{ player_id: 3, goles_totales: 1 }],
	actions: [{ client_id: "735d8735-e1b3-4758-9504-06157529ce25", player_id: 3, quarter: 1, sequence: 1, action_key: "goles_lanzamiento" }],
	penalties: [],
	goalkeeper_shots: []
};

describe("reliable match save", () => {
	it("creates the same id for an identical retry", async () => {
		expect(await createSaveId(payload)).toBe(await createSaveId(structuredClone(payload)));
	});

	it("changes the id when the payload changes", async () => {
		const changed = structuredClone(payload);
		changed.match.notes = "Changed";
		expect(await createSaveId(payload)).not.toBe(await createSaveId(changed));
	});

	it("removes database-managed fields from statistics", () => {
		expect(stripManagedStatFields({ id: 10, match_id: 20, created_at: "date", player_id: 3, goles_totales: 1 })).toEqual({
			player_id: 3,
			goles_totales: 1
		});
	});

	it("rejects structurally invalid actions before calling Supabase", () => {
		const invalid = structuredClone(payload);
		invalid.actions[0].quarter = 5;
		expect(matchSavePayloadSchema.safeParse(invalid).success).toBe(false);
	});
});
