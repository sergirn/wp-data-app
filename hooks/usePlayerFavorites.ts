"use client";

import * as React from "react";

type FavoritesResponse = { keys?: string[] };

export function usePlayerFavorites(playerId?: number) {
	const [keys, setKeys] = React.useState<string[]>([]);
	const favSet = React.useMemo(() => new Set(keys), [keys]);

	const load = React.useCallback(async () => {
		if (!playerId) return;
		const res = await fetch(`/api/favorites?playerId=${playerId}`);
		const json: FavoritesResponse = await res.json();
		setKeys(Array.isArray(json.keys) ? json.keys : []);
	}, [playerId]);

	React.useEffect(() => {
		load();
	}, [load]);

	const toggle = React.useCallback(
		async (statKey: string) => {
			if (!playerId) return;

			// optimistic
			setKeys((prev) => (prev.includes(statKey) ? prev.filter((k) => k !== statKey) : [...prev, statKey]));

			const res = await fetch("/api/favorites", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ playerId, statKey })
			});

			// si falla, recarga
			if (!res.ok) await load();
		},
		[playerId, load]
	);

	return { keys, favSet, toggle, reload: load };
}
