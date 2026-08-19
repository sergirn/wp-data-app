export type MatchDraftPayload = Record<string, unknown>;

export type MatchDraftRecord<TPayload extends MatchDraftPayload = MatchDraftPayload> = {
	draftKey: string;
	clubId: number;
	userId: string;
	matchId: number | null;
	payload: TPayload;
	revision: number;
	createdAt: string;
	updatedAt: string;
	expiresAt: string;
};

export const MATCH_DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function pickNewestMatchDraft<TPayload extends MatchDraftPayload>(
	local: MatchDraftRecord<TPayload> | null,
	remote: MatchDraftRecord<TPayload> | null
) {
	if (!local) return remote;
	if (!remote) return local;
	if (local.revision !== remote.revision) return local.revision > remote.revision ? local : remote;
	return Date.parse(local.updatedAt) >= Date.parse(remote.updatedAt) ? local : remote;
}
