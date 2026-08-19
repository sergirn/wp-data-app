import { describe, expect, it } from "vitest";

import { pickNewestMatchDraft, type MatchDraftRecord } from "./match-drafts";

const draft = (revision: number, updatedAt: string): MatchDraftRecord => ({
	draftKey: "new:7",
	clubId: 7,
	userId: "user-1",
	matchId: null,
	payload: { opponent: "Rival" },
	revision,
	createdAt: "2026-08-19T09:00:00.000Z",
	updatedAt,
	expiresAt: "2026-09-18T09:00:00.000Z"
});

describe("pickNewestMatchDraft", () => {
	it("uses the available draft when only one copy exists", () => {
		const local = draft(1, "2026-08-19T10:00:00.000Z");
		expect(pickNewestMatchDraft(local, null)).toBe(local);
	});

	it("prefers the highest revision", () => {
		const local = draft(4, "2026-08-19T10:00:00.000Z");
		const remote = draft(5, "2026-08-19T09:00:00.000Z");
		expect(pickNewestMatchDraft(local, remote)).toBe(remote);
	});

	it("uses the newest timestamp when revisions match", () => {
		const local = draft(5, "2026-08-19T10:00:00.000Z");
		const remote = draft(5, "2026-08-19T10:01:00.000Z");
		expect(pickNewestMatchDraft(local, remote)).toBe(remote);
	});
});
