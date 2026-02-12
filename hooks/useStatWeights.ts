"use client";

import * as React from "react";

type WeightsMap = Record<string, number>;

function mapsEqual(a: WeightsMap, b: WeightsMap): boolean {
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const k of keysA) {
		if (a[k] !== b[k]) return false;
	}
	return true;
}

export function useStatWeights() {
	const [weights, setWeights] = React.useState<WeightsMap>({});
	const [draftWeights, setDraftWeights] = React.useState<WeightsMap>({});
	const [loaded, setLoaded] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const dirty = React.useMemo(() => !mapsEqual(weights, draftWeights), [weights, draftWeights]);

	const load = React.useCallback(async () => {
		setError(null);
		try {
			const res = await fetch("/api/stat-weights", { method: "GET" });
			const json = await res.json();
			const w: WeightsMap = json.weights ?? {};
			setWeights(w);
			setDraftWeights(w);
			setLoaded(true);
		} catch {
			setError("Error al cargar las valoraciones");
			setLoaded(true);
		}
	}, []);

	React.useEffect(() => {
		load();
	}, [load]);

	const setWeight = React.useCallback((statKey: string, value: number) => {
		setDraftWeights((prev) => {
			const next = { ...prev };
			if (value === 0) {
				delete next[statKey];
			} else {
				next[statKey] = value;
			}
			return next;
		});
	}, []);

	const getWeight = React.useCallback(
		(statKey: string): number => {
			return draftWeights[statKey] ?? 0;
		},
		[draftWeights]
	);

	const discard = React.useCallback(() => {
		setDraftWeights(weights);
		setError(null);
	}, [weights]);

	const save = React.useCallback(async () => {
		setSaving(true);
		setError(null);
		try {
			// Build payload: include draft values + explicitly send 0 for keys
			// that were saved before but removed from draft (so the API deletes them)
			const payload: WeightsMap = { ...draftWeights };
			for (const key of Object.keys(weights)) {
				if (!(key in payload)) {
					payload[key] = 0;
				}
			}

			const res = await fetch("/api/stat-weights", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ weights: payload })
			});

			if (!res.ok) {
				const json = await res.json();
				setError(json.error || "Error al guardar");
				setSaving(false);
				return;
			}

			const json = await res.json();
			const saved: WeightsMap = json.weights ?? draftWeights;
			setWeights(saved);
			setDraftWeights(saved);
		} catch {
			setError("Error al guardar las valoraciones");
		}
		setSaving(false);
	}, [draftWeights]);

	return {
		weights,
		draftWeights,
		loaded,
		dirty,
		saving,
		error,
		setWeight,
		getWeight,
		discard,
		save,
		reload: load
	};
}
