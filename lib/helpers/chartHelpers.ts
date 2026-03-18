import { PLAYER_STATS } from "@/lib/stats/playerStatsConfig";

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export type MatchConversionData = {
	scored: number;
	scoredExtra?: number;
	missed: number;
	attempts: number;
	efficiency: number;
	reboundsRecovered?: number;
	reboundsLost?: number;
};

function pct(numer: number, denom: number) {
	if (!denom) return 0;
	return Math.round((numer / denom) * 1000) / 10;
}

function asRows(stats: unknown): Array<Record<string, any>> {
	if (Array.isArray(stats)) return stats;
	if (stats && typeof stats === "object") return [stats as Record<string, any>];
	return [];
}

function hasPlayerKey(key: string) {
	return PLAYER_STATS.some((s) => s.key === key);
}

function sumRows(rows: Array<Record<string, any>>, keys: string[]) {
	return rows.reduce((acc, row) => {
		return acc + keys.reduce((sum, key) => sum + n(row?.[key]), 0);
	}, 0);
}

export function buildSuperiorityConversionData(stats: unknown): MatchConversionData {
	const rows = asRows(stats);

	const scoredKeys = ["goles_hombre_mas"].filter(hasPlayerKey);
	const scoredExtraKeys = ["gol_del_palo_sup"].filter(hasPlayerKey);

	const missedKeys = ["tiros_hombre_mas", "portero_paradas_superioridad", "jugador_superioridad_bloqueo"].filter(hasPlayerKey);

	const reboundRecoveredKeys = ["rebote_recup_hombre_mas"];
	const reboundLostKeys = ["rebote_perd_hombre_mas"];

	const scored = sumRows(rows, scoredKeys);
	const scoredExtra = sumRows(rows, scoredExtraKeys);
	const missed = sumRows(rows, missedKeys);
	const reboundsRecovered = sumRows(rows, reboundRecoveredKeys);
	const reboundsLost = sumRows(rows, reboundLostKeys);

	const attempts = scored + scoredExtra + missed;
	const efficiency = pct(scored + scoredExtra, attempts);

	return {
		scored,
		scoredExtra,
		missed,
		attempts,
		efficiency,
		reboundsRecovered,
		reboundsLost
	};
}

export function buildInferiorityConversionData(stats: unknown): MatchConversionData {
	const rows = asRows(stats);

	const scored = rows.reduce((acc, row) => acc + n(row?.portero_goles_hombre_menos), 0);
	const scoredExtra = rows.reduce((acc, row) => acc + n(row?.portero_gol_palo), 0);

	const saves = rows.reduce((acc, row) => acc + n(row?.portero_paradas_hombre_menos), 0);
	const out = rows.reduce((acc, row) => acc + n(row?.portero_inferioridad_fuera), 0);
	const blocks = rows.reduce((acc, row) => acc + n(row?.portero_inferioridad_bloqueo), 0);

	const missed = saves + out + blocks;
	const attempts = scored + scoredExtra + missed;
	const efficiency = attempts > 0 ? pct(missed, attempts) : 0;

	return {
		scored,
		scoredExtra,
		missed,
		attempts,
		efficiency
	};
}

export function buildInferiorityBreakdown(stats: unknown) {
	const rows = asRows(stats);

	const saves = rows.reduce((acc, row) => acc + n(row?.portero_paradas_hombre_menos), 0);
	const out = rows.reduce((acc, row) => acc + n(row?.portero_inferioridad_fuera), 0);
	const blocks = rows.reduce((acc, row) => acc + n(row?.portero_inferioridad_bloqueo), 0);

	return {
		saves,
		out,
		blocks,
		avoidedBreakdown: saves + out + blocks
	};
}

export type MatchBlocksChartData = {
	ok: number;
	bad: number;
	total: number;
	efficiency: number;
	playersWithBlocks: Array<Record<string, any>>;
	top3: Array<Record<string, any>>;
	playersCount: number;
};

export function buildBlocksChartData(stats: unknown, matchStats: unknown): MatchBlocksChartData {
	const rows = Array.isArray(matchStats) ? matchStats : [];
	const statsObj = stats && typeof stats === "object" ? (stats as Record<string, any>) : {};

	const ok = n(statsObj?.bloqueos);
	const bad = n(statsObj?.golesRecibidos);
	const total = ok + bad;
	const efficiency = total > 0 ? pct(ok, total) : 0;

	const playersWithBlocks = rows
		.filter((row) => n((row as any)?.acciones_bloqueo) > 0)
		.sort((a, b) => n((b as any)?.acciones_bloqueo) - n((a as any)?.acciones_bloqueo));

	const top3 = playersWithBlocks.slice(0, 3);

	return {
		ok,
		bad,
		total,
		efficiency,
		playersWithBlocks,
		top3,
		playersCount: playersWithBlocks.length
	};
}
