"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { deleteMatchDraft, saveRemoteMatchDraft } from "@/lib/match-draft-client";
import { putLocalMatchDraft } from "@/lib/match-draft-storage";
import { MATCH_DRAFT_TTL_MS, type MatchDraftPayload, type MatchDraftRecord } from "@/lib/match-drafts";

export type MatchAutosaveStatus = "idle" | "pending" | "saving" | "saved" | "offline" | "error";

type UseMatchAutosaveOptions<TPayload extends MatchDraftPayload> = {
	enabled: boolean;
	draftKey: string | null;
	clubId: number | null;
	userId: string | null;
	matchId: number | null;
	payload: TPayload;
	initialRevision?: number;
	initialCreatedAt?: string | null;
	initialExpiresAt?: string | null;
	remoteIntervalMs?: number;
};

const RETRY_DELAYS = [5_000, 15_000, 30_000, 60_000];

export function useMatchAutosave<TPayload extends MatchDraftPayload>({
	enabled,
	draftKey,
	clubId,
	userId,
	matchId,
	payload,
	initialRevision = 0,
	initialCreatedAt = null,
	initialExpiresAt = null,
	remoteIntervalMs = 20_000
}: UseMatchAutosaveOptions<TPayload>) {
	const serializedPayload = useMemo(() => JSON.stringify(payload), [payload]);
	const [status, setStatus] = useState<MatchAutosaveStatus>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
	const identityRef = useRef<string | null>(null);
	const baselineRef = useRef(serializedPayload);
	const payloadRef = useRef(payload);
	const revisionRef = useRef(initialRevision);
	const createdAtRef = useRef(initialCreatedAt ?? "");
	const expiresAtRef = useRef(initialExpiresAt ?? "");
	const dirtyRef = useRef(false);
	const savingRef = useRef(false);
	const retryRef = useRef(0);
	const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const remoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		payloadRef.current = payload;
	}, [payload]);

	const getRecord = useCallback((): MatchDraftRecord<TPayload> | null => {
		if (!draftKey || !clubId || !userId) return null;
		return {
			draftKey,
			clubId,
			userId,
			matchId,
			payload: payloadRef.current,
			revision: revisionRef.current,
			createdAt: createdAtRef.current,
			updatedAt: new Date().toISOString(),
			expiresAt: expiresAtRef.current
		};
	}, [clubId, draftKey, matchId, userId]);

	const scheduleRemote = useCallback(
		(delay = remoteIntervalMs, callback?: () => void) => {
			if (remoteTimerRef.current) return;
			remoteTimerRef.current = setTimeout(() => {
				remoteTimerRef.current = null;
				callback?.();
			}, delay);
		},
		[remoteIntervalMs]
	);

	const flushRemoteRef = useRef<() => Promise<void>>(async () => undefined);

	const flushRemote = useCallback(async () => {
		if (!enabled || savingRef.current || !dirtyRef.current) return;
		const record = getRecord();
		if (!record) return;
		if (typeof navigator !== "undefined" && !navigator.onLine) {
			setStatus("offline");
			return;
		}

		savingRef.current = true;
		setStatus("saving");
		try {
			const saved = await saveRemoteMatchDraft(record);
			createdAtRef.current = saved.createdAt;
			expiresAtRef.current = saved.expiresAt;
			await putLocalMatchDraft(saved);
			retryRef.current = 0;
			setLastSavedAt(saved.updatedAt);
			if (revisionRef.current === record.revision) {
				dirtyRef.current = false;
				setStatus("saved");
			} else {
				setStatus("pending");
				scheduleRemote(remoteIntervalMs, () => void flushRemoteRef.current());
			}
		} catch {
			setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
			const retryDelay = RETRY_DELAYS[Math.min(retryRef.current, RETRY_DELAYS.length - 1)];
			retryRef.current += 1;
			scheduleRemote(retryDelay, () => void flushRemoteRef.current());
		} finally {
			savingRef.current = false;
		}
	}, [enabled, getRecord, remoteIntervalMs, scheduleRemote]);

	useEffect(() => {
		flushRemoteRef.current = flushRemote;
	}, [flushRemote]);

	useEffect(() => {
		if (!enabled || !draftKey || !clubId || !userId) return;
		const identity = `${userId}:${draftKey}`;
		if (identityRef.current === identity) return;

		identityRef.current = identity;
		baselineRef.current = serializedPayload;
		revisionRef.current = initialRevision;
		const createdAt = initialCreatedAt ?? new Date().toISOString();
		createdAtRef.current = createdAt;
		expiresAtRef.current = initialExpiresAt ?? new Date(Date.parse(createdAt) + MATCH_DRAFT_TTL_MS).toISOString();
		dirtyRef.current = false;
		retryRef.current = 0;
		setStatus(initialRevision > 0 ? "saved" : "idle");
	}, [clubId, draftKey, enabled, initialCreatedAt, initialExpiresAt, initialRevision, serializedPayload, userId]);

	useEffect(() => {
		if (!enabled || !identityRef.current || serializedPayload === baselineRef.current) return;
		baselineRef.current = serializedPayload;
		revisionRef.current += 1;
		dirtyRef.current = true;
		setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "pending");

		if (localTimerRef.current) clearTimeout(localTimerRef.current);
		localTimerRef.current = setTimeout(() => {
			const record = getRecord();
			if (record) void putLocalMatchDraft(record);
		}, 750);

		scheduleRemote(remoteIntervalMs, () => void flushRemoteRef.current());
	}, [enabled, getRecord, remoteIntervalMs, scheduleRemote, serializedPayload]);

	useEffect(() => {
		if (!enabled) return;
		const handleOnline = () => {
			if (dirtyRef.current) {
				if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
				remoteTimerRef.current = null;
				void flushRemoteRef.current();
			}
		};
		const persistLocally = () => {
			if (!dirtyRef.current) return;
			const record = getRecord();
			if (record) void putLocalMatchDraft(record);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("pagehide", persistLocally);
		document.addEventListener("visibilitychange", persistLocally);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("pagehide", persistLocally);
			document.removeEventListener("visibilitychange", persistLocally);
		};
	}, [enabled, getRecord]);

	useEffect(() => {
		if (enabled && dirtyRef.current && !savingRef.current) {
			scheduleRemote(remoteIntervalMs, () => void flushRemoteRef.current());
		}
	}, [enabled, remoteIntervalMs, scheduleRemote]);

	useEffect(
		() => () => {
			if (localTimerRef.current) clearTimeout(localTimerRef.current);
			if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
		},
		[]
	);

	const clearDraft = useCallback(async () => {
		if (!draftKey || !clubId || !userId) return;
		if (localTimerRef.current) clearTimeout(localTimerRef.current);
		if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
		localTimerRef.current = null;
		remoteTimerRef.current = null;
		dirtyRef.current = false;
		await deleteMatchDraft(userId, draftKey, clubId);
		setStatus("idle");
		setLastSavedAt(null);
	}, [clubId, draftKey, userId]);

	return { status, lastSavedAt, clearDraft, flushRemote };
}
