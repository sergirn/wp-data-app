"use client";

import * as React from "react";

type FavoritesResponse = { keys?: string[] };

type SaveFavoritesPayload = { playerId: number; keys: string[] };

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  for (const k of b) if (!s.has(k)) return false;
  return true;
}

export function usePlayerFavorites(playerId?: number) {

  const [keys, setKeys] = React.useState<string[]>([]);

  const [draftKeys, setDraftKeys] = React.useState<string[]>([]);

  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const favSet = React.useMemo(() => new Set(draftKeys), [draftKeys]);

  const dirty = React.useMemo(() => !sameSet(keys, draftKeys), [keys, draftKeys]);

  const load = React.useCallback(async () => {
    if (!playerId) return;
    setError(null);

    const res = await fetch(`/api/favorites?playerId=${playerId}`, { method: "GET" });
    const json: FavoritesResponse = await res.json();

    const next = Array.isArray(json.keys) ? json.keys : [];
    setKeys(next);
    setDraftKeys(next);
    setLoaded(true);
  }, [playerId]);

  React.useEffect(() => {
    setLoaded(false);
    setKeys([]);
    setDraftKeys([]);
    if (!playerId) return;
    load();
  }, [playerId, load]);

  const toggleLocal = React.useCallback((statKey: string) => {
    setDraftKeys((prev) => (prev.includes(statKey) ? prev.filter((k) => k !== statKey) : [...prev, statKey]));
  }, []);

  const discard = React.useCallback(() => {
    setDraftKeys(keys);
    setError(null);
  }, [keys]);

  const save = React.useCallback(async () => {
    if (!playerId) return;
    setSaving(true);
    setError(null);

    const payload: SaveFavoritesPayload = { playerId, keys: draftKeys };

    const res = await fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      await load();
      setSaving(false);
      setError("No se pudo guardar favoritos");
      return;
    }

    setKeys(draftKeys);
    setSaving(false);
  }, [playerId, draftKeys, load]);

  return {
    keys,
    draftKeys,
    favSet,
    loaded,
    dirty,
    saving,
    error,

    toggleLocal,
    discard,
    save,
    reload: load,
  };
}
