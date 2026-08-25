import { describe, expect, it } from "vitest";

import { getMatchOutcome, getOpponentScore, getOwnScore, getVenueScore } from "./score";

describe("stored match score convention", () => {
	it("keeps own and opponent goals unchanged when playing at home", () => {
		const match = { home_score: 11, away_score: 8, is_home: true };
		expect(getOwnScore(match)).toBe(11);
		expect(getOpponentScore(match)).toBe(8);
		expect(getVenueScore(match)).toMatchObject({ local: 11, visitor: 8 });
	});

	it("keeps own and opponent goals unchanged but swaps the venue display when playing away", () => {
		const match = { home_score: 9, away_score: 12, is_home: false };
		expect(getOwnScore(match)).toBe(9);
		expect(getOpponentScore(match)).toBe(12);
		expect(getVenueScore(match)).toMatchObject({ local: 12, visitor: 9 });
	});

	it("uses our penalty score to resolve a tied match regardless of venue", () => {
		const match = {
			home_score: 10,
			away_score: 10,
			is_home: false,
			penalty_home_score: 5,
			penalty_away_score: 4
		};
		expect(getMatchOutcome(match)).toBe("win");
		expect(getVenueScore(match)).toMatchObject({ localPenalties: 4, visitorPenalties: 5 });
	});
});
