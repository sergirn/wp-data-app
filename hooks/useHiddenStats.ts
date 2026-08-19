"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

type HiddenMap = Record<string, boolean>;

function mapsEqual(a: HiddenMap, b: HiddenMap): boolean {
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const k of keysA) {
		if (a[k] !== b[k]) return false;
	}
	return true;
}

export function useHiddenStats() {
	const t = useTranslations("SettingsErrors");
	const [hiddenStats, setHiddenStats] = React.useState<HiddenMap>({});
	const [draftHiddenStats, setDraftHiddenStats] = React.useState<HiddenMap>({});
	const [loaded, setLoaded] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const dirty = React.useMemo(() => !mapsEqual(hiddenStats, draftHiddenStats), [hiddenStats, draftHiddenStats]);

	const load = React.useCallback(async () => {
		setError(null);
		try {
			const res = await fetch("/api/hidden-stats", { method: "GET" });

			if (!res.ok) {
				const json = await res.json().catch(() => null);
				throw new Error(json?.error || t("loadHidden"));
			}

			const json = await res.json();
			const hiddenKeys: string[] = json.hiddenStats ?? [];
			const map: HiddenMap = Object.fromEntries(hiddenKeys.map((key) => [key, true]));

			setHiddenStats(map);
			setDraftHiddenStats(map);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("loadHidden"));
		} finally {
			setLoaded(true);
		}
	}, [t]);

	React.useEffect(() => {
		load();
	}, [load]);

	const isHidden = React.useCallback(
		(statKey: string): boolean => {
			return !!draftHiddenStats[statKey];
		},
		[draftHiddenStats]
	);

	const setHidden = React.useCallback((statKey: string, hidden: boolean) => {
		setDraftHiddenStats((prev) => {
			const next = { ...prev };
			if (hidden) {
				next[statKey] = true;
			} else {
				delete next[statKey];
			}
			return next;
		});
	}, []);

	const discard = React.useCallback(() => {
		setDraftHiddenStats(hiddenStats);
		setError(null);
	}, [hiddenStats]);

	const save = React.useCallback(async () => {
		setSaving(true);
		setError(null);

		try {
			const hiddenKeys = Object.keys(draftHiddenStats);

			const res = await fetch("/api/hidden-stats", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hiddenStats: hiddenKeys })
			});

			if (!res.ok) {
				const json = await res.json().catch(() => null);
				throw new Error(json?.error || t("save"));
			}

			const json = await res.json();
			const savedKeys: string[] = json.hiddenStats ?? hiddenKeys;
			const savedMap: HiddenMap = Object.fromEntries(savedKeys.map((key) => [key, true]));

			setHiddenStats(savedMap);
			setDraftHiddenStats(savedMap);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("saveHidden"));
		} finally {
			setSaving(false);
		}
	}, [draftHiddenStats, t]);

	return {
		hiddenStats,
		draftHiddenStats,
		loaded,
		dirty,
		saving,
		error,
		isHidden,
		setHidden,
		discard,
		save,
		reload: load
	};
}
