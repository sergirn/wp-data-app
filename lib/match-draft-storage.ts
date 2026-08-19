import { MATCH_DRAFT_TTL_MS, type MatchDraftPayload, type MatchDraftRecord } from "@/lib/match-drafts";

const DATABASE_NAME = "wp-data-app";
const DATABASE_VERSION = 1;
const STORE_NAME = "match-drafts";

type StoredDraft<TPayload extends MatchDraftPayload = MatchDraftPayload> = MatchDraftRecord<TPayload> & {
	storageKey: string;
};

const storageKey = (userId: string, draftKey: string) => `${userId}:${draftKey}`;

function openDatabase() {
	return new Promise<IDBDatabase>((resolve, reject) => {
		if (typeof indexedDB === "undefined") {
			reject(new Error("IndexedDB unavailable"));
			return;
		}

		const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME, { keyPath: "storageKey" });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
	});
}

async function runRequest<TResult>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<TResult>) {
	const database = await openDatabase();
	try {
		return await new Promise<TResult>((resolve, reject) => {
			const transaction = database.transaction(STORE_NAME, mode);
			const request = callback(transaction.objectStore(STORE_NAME));
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
			transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
		});
	} finally {
		database.close();
	}
}

export async function getLocalMatchDraft<TPayload extends MatchDraftPayload>(userId: string, draftKey: string) {
	try {
		const result = await runRequest<StoredDraft<TPayload> | undefined>("readonly", (store) => store.get(storageKey(userId, draftKey)));
		if (!result) return null;
		const createdAt = result.createdAt ?? result.updatedAt;
		return {
			draftKey: result.draftKey,
			clubId: result.clubId,
			userId: result.userId,
			matchId: result.matchId,
			payload: result.payload,
			revision: result.revision,
			createdAt,
			updatedAt: result.updatedAt,
			expiresAt: result.expiresAt ?? new Date(Date.parse(createdAt) + MATCH_DRAFT_TTL_MS).toISOString()
		};
	} catch {
		return null;
	}
}

export async function putLocalMatchDraft<TPayload extends MatchDraftPayload>(draft: MatchDraftRecord<TPayload>) {
	const stored: StoredDraft<TPayload> = { ...draft, storageKey: storageKey(draft.userId, draft.draftKey) };
	await runRequest<IDBValidKey>("readwrite", (store) => store.put(stored));
}

export async function listLocalMatchDrafts<TPayload extends MatchDraftPayload>(userId: string, clubId: number) {
	try {
		const results = await runRequest<StoredDraft<TPayload>[]>("readonly", (store) => store.getAll());
		return results
			.filter((draft) => draft.userId === userId && draft.clubId === clubId)
			.map((draft) => {
				const createdAt = draft.createdAt ?? draft.updatedAt;
				return {
				draftKey: draft.draftKey,
				clubId: draft.clubId,
				userId: draft.userId,
				matchId: draft.matchId,
				payload: draft.payload,
				revision: draft.revision,
				createdAt,
				updatedAt: draft.updatedAt,
				expiresAt: draft.expiresAt ?? new Date(Date.parse(createdAt) + MATCH_DRAFT_TTL_MS).toISOString()
				};
			});
	} catch {
		return [];
	}
}

export async function deleteLocalMatchDraft(userId: string, draftKey: string) {
	try {
		await runRequest<undefined>("readwrite", (store) => store.delete(storageKey(userId, draftKey)));
	} catch {
		// A remote draft can still be deleted when local browser storage is unavailable.
	}
}
