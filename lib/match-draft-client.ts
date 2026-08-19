import { deleteLocalMatchDraft, getLocalMatchDraft, listLocalMatchDrafts, putLocalMatchDraft } from "@/lib/match-draft-storage";
import { pickNewestMatchDraft, type MatchDraftPayload, type MatchDraftRecord } from "@/lib/match-drafts";

type RemoteDraft = {
	draft_key: string;
	club_id: number;
	user_id: string;
	match_id: number | null;
	payload: MatchDraftPayload;
	revision: number;
	created_at: string;
	updated_at: string;
	expires_at: string;
};

function fromRemote<TPayload extends MatchDraftPayload>(draft: RemoteDraft): MatchDraftRecord<TPayload> {
	return {
		draftKey: draft.draft_key,
		clubId: draft.club_id,
		userId: draft.user_id,
		matchId: draft.match_id,
		payload: draft.payload as TPayload,
		revision: draft.revision,
		createdAt: draft.created_at,
		updatedAt: draft.updated_at,
		expiresAt: draft.expires_at
	};
}

export async function getRemoteMatchDraft<TPayload extends MatchDraftPayload>(draftKey: string, clubId: number) {
	const query = new URLSearchParams({ draftKey, clubId: String(clubId) });
	const response = await fetch(`/api/match-drafts?${query}`, { cache: "no-store" });
	if (response.status === 404) return null;
	if (!response.ok) throw new Error("Draft request failed");
	const body = await response.json();
	return body.draft ? fromRemote<TPayload>(body.draft) : null;
}

export async function listMatchDrafts<TPayload extends MatchDraftPayload>(userId: string, clubId: number) {
	const query = new URLSearchParams({ clubId: String(clubId) });
	const [localDrafts, remoteDrafts] = await Promise.all([
		listLocalMatchDrafts<TPayload>(userId, clubId),
		fetch(`/api/match-drafts?${query}`, { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) throw new Error("Draft list request failed");
				const body = await response.json();
				return ((body.drafts ?? []) as RemoteDraft[]).map((draft) => fromRemote<TPayload>(draft));
			})
			.catch(() => [] as MatchDraftRecord<TPayload>[])
	]);

	const draftsByKey = new Map<string, MatchDraftRecord<TPayload>>();
	for (const draft of [...remoteDrafts, ...localDrafts]) {
		const current = draftsByKey.get(draft.draftKey) ?? null;
		draftsByKey.set(draft.draftKey, pickNewestMatchDraft(current, draft) ?? draft);
	}
	return [...draftsByKey.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function loadBestMatchDraft<TPayload extends MatchDraftPayload>(userId: string, draftKey: string, clubId: number) {
	const [local, remote] = await Promise.all([
		getLocalMatchDraft<TPayload>(userId, draftKey),
		getRemoteMatchDraft<TPayload>(draftKey, clubId).catch(() => null)
	]);
	const best = pickNewestMatchDraft(local, remote);
	if (best) await putLocalMatchDraft(best).catch(() => undefined);
	return best;
}

export async function saveRemoteMatchDraft<TPayload extends MatchDraftPayload>(draft: MatchDraftRecord<TPayload>) {
	const response = await fetch("/api/match-drafts", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			draftKey: draft.draftKey,
			clubId: draft.clubId,
			matchId: draft.matchId,
			payload: draft.payload,
			revision: draft.revision
		})
	});
	if (!response.ok) throw new Error("Draft save failed");
	const body = await response.json();
	return fromRemote<TPayload>(body.draft);
}

export async function deleteMatchDraft(userId: string, draftKey: string, clubId: number) {
	const query = new URLSearchParams({ draftKey, clubId: String(clubId) });
	const response = await fetch(`/api/match-drafts?${query}`, { method: "DELETE" });
	if (!response.ok && response.status !== 404) throw new Error("Draft delete failed");
	await deleteLocalMatchDraft(userId, draftKey);
}
