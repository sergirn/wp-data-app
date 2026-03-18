const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export type GoalkeeperBreakdownPart = {
	key: string;
	label: string;
	value: number;
	pct: number;
	color: string;
};

export type GoalkeeperBreakdownSummary = {
	parts: GoalkeeperBreakdownPart[];
	total: number;
	topType: GoalkeeperBreakdownPart | null;
};

export type GoalkeeperBreakdownPlayerRow = {
	playerId: number;
	player: { id: number; name: string; number?: number | null; photo_url?: string | null } | null;
	boya: number;
	dir6m: number;
	contra: number;
	penalti: number;
	lanzamiento: number;
	infGol: number;
	infPaloGol: number;
	total: number;
};

export type GoalkeeperSavesPlayerRow = {
	playerId: number;
	player: { id: number; name: string; number?: number | null; photo_url?: string | null } | null;
	paradaRecup: number;
	paradaFuera: number;
	penaltiParado: number;
	infParada: number;
	total: number;
};

const GOALS_AGAINST_COLORS = {
	boya: "hsla(10, 82%, 58%, 1)",
	dir6m: "hsla(215, 85%, 58%, 1)",
	contra: "hsla(345, 78%, 58%, 1)",
	penalti: "hsla(45, 92%, 52%, 1)",
	lanzamiento: "hsla(270, 72%, 60%, 1)",
	infGol: "hsla(0, 76%, 58%, 1)",
	infPaloGol: "hsla(325, 72%, 56%, 1)"
} as const;

const SAVES_COLORS = {
	paradaRecup: "hsla(142, 71%, 45%, 1)",
	paradaFuera: "hsla(190, 78%, 46%, 1)",
	penaltiParado: "hsla(38, 92%, 52%, 1)",
	infParada: "hsla(220, 78%, 58%, 1)"
} as const;

function pct(value: number, total: number) {
	return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
}

function goalkeeperRowsOnly(rows: any[]) {
	return (rows ?? []).filter((s) => s?.players?.is_goalkeeper);
}

export function buildGoalkeeperGoalsAgainstSummary(rows: any[]): GoalkeeperBreakdownSummary {
	const gkRows = goalkeeperRowsOnly(rows);

	const boya = gkRows.reduce((sum, s) => sum + n(s?.portero_goles_boya_parada), 0);
	const dir6m = gkRows.reduce((sum, s) => sum + n(s?.portero_goles_dir_mas_5m), 0);
	const contra = gkRows.reduce((sum, s) => sum + n(s?.portero_goles_contraataque), 0);
	const penalti = gkRows.reduce((sum, s) => sum + n(s?.portero_goles_penalti), 0);
	const lanzamiento = gkRows.reduce((sum, s) => sum + n(s?.portero_goles_lanzamiento), 0);
	const infGol = gkRows.reduce((sum, s) => sum + n(s?.portero_goles_hombre_menos), 0);
	const infPaloGol = gkRows.reduce((sum, s) => sum + n(s?.portero_gol_palo), 0);

	const total = boya + dir6m + contra + penalti + lanzamiento + infGol + infPaloGol;

	const parts: GoalkeeperBreakdownPart[] = [
		{ key: "boya", label: "Boya", value: boya, pct: pct(boya, total), color: GOALS_AGAINST_COLORS.boya },
		{ key: "dir6m", label: "+6m", value: dir6m, pct: pct(dir6m, total), color: GOALS_AGAINST_COLORS.dir6m },
		{ key: "contra", label: "Contraataque", value: contra, pct: pct(contra, total), color: GOALS_AGAINST_COLORS.contra },
		{ key: "penalti", label: "Penalti", value: penalti, pct: pct(penalti, total), color: GOALS_AGAINST_COLORS.penalti },
		{ key: "lanzamiento", label: "Lanzamiento", value: lanzamiento, pct: pct(lanzamiento, total), color: GOALS_AGAINST_COLORS.lanzamiento },
		{ key: "infGol", label: "Gol en inferioridad", value: infGol, pct: pct(infGol, total), color: GOALS_AGAINST_COLORS.infGol },
		{ key: "infPaloGol", label: "Gol del palo (Inf.-)", value: infPaloGol, pct: pct(infPaloGol, total), color: GOALS_AGAINST_COLORS.infPaloGol }
	].filter((p) => p.value > 0 || total === 0);

	const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

	return { parts, total, topType };
}

export function buildGoalkeeperGoalsAgainstPerPlayer(
	rows: any[],
	playersById: Map<number, { id: number; name: string; number?: number | null; photo_url?: string | null }>
): GoalkeeperBreakdownPlayerRow[] {
	const gkRows = goalkeeperRowsOnly(rows);
	const map = new Map<number, Omit<GoalkeeperBreakdownPlayerRow, "playerId" | "player">>();

	for (const s of gkRows) {
		const playerId = Number(s?.player_id);
		if (!playerId) continue;

		const cur = map.get(playerId) ?? {
			boya: 0,
			dir6m: 0,
			contra: 0,
			penalti: 0,
			lanzamiento: 0,
			infGol: 0,
			infPaloGol: 0,
			total: 0
		};

		cur.boya += n(s?.portero_goles_boya_parada);
		cur.dir6m += n(s?.portero_goles_dir_mas_5m);
		cur.contra += n(s?.portero_goles_contraataque);
		cur.penalti += n(s?.portero_goles_penalti);
		cur.lanzamiento += n(s?.portero_goles_lanzamiento);
		cur.infGol += n(s?.portero_goles_hombre_menos);
		cur.infPaloGol += n(s?.portero_gol_palo);

		cur.total = cur.boya + cur.dir6m + cur.contra + cur.penalti + cur.lanzamiento + cur.infGol + cur.infPaloGol;
		map.set(playerId, cur);
	}

	return [...map.entries()]
		.map(([playerId, row]) => ({
			playerId,
			player: playersById.get(playerId) ?? null,
			...row
		}))
		.sort((a, b) => b.total - a.total);
}

export function buildGoalkeeperSavesSummary(rows: any[]): GoalkeeperBreakdownSummary {
	const gkRows = goalkeeperRowsOnly(rows);

	const paradaRecup = gkRows.reduce((sum, s) => sum + n(s?.portero_tiros_parada_recup), 0);
	const paradaFuera = gkRows.reduce((sum, s) => sum + n(s?.portero_paradas_fuera), 0);
	const penaltiParado = gkRows.reduce((sum, s) => sum + n(s?.portero_paradas_penalti_parado), 0);
	const infParada = gkRows.reduce((sum, s) => sum + n(s?.portero_paradas_hombre_menos), 0);

	const total = paradaRecup + paradaFuera + penaltiParado + infParada;

	const parts: GoalkeeperBreakdownPart[] = [
		{ key: "paradaRecup", label: "Parada + Recup", value: paradaRecup, pct: pct(paradaRecup, total), color: SAVES_COLORS.paradaRecup },
		{ key: "paradaFuera", label: "Fuera (parada)", value: paradaFuera, pct: pct(paradaFuera, total), color: SAVES_COLORS.paradaFuera },
		{ key: "penaltiParado", label: "Penalti parado", value: penaltiParado, pct: pct(penaltiParado, total), color: SAVES_COLORS.penaltiParado },
		{ key: "infParada", label: "Paradas inferioridad -", value: infParada, pct: pct(infParada, total), color: SAVES_COLORS.infParada }
	].filter((p) => p.value > 0 || total === 0);

	const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

	return { parts, total, topType };
}

export function buildGoalkeeperSavesPerPlayer(
	rows: any[],
	playersById: Map<number, { id: number; name: string; number?: number | null; photo_url?: string | null }>
): GoalkeeperSavesPlayerRow[] {
	const gkRows = goalkeeperRowsOnly(rows);
	const map = new Map<number, Omit<GoalkeeperSavesPlayerRow, "playerId" | "player">>();

	for (const s of gkRows) {
		const playerId = Number(s?.player_id);
		if (!playerId) continue;

		const cur = map.get(playerId) ?? {
			paradaRecup: 0,
			paradaFuera: 0,
			penaltiParado: 0,
			infParada: 0,
			total: 0
		};

		cur.paradaRecup += n(s?.portero_tiros_parada_recup);
		cur.paradaFuera += n(s?.portero_paradas_fuera);
		cur.penaltiParado += n(s?.portero_paradas_penalti_parado);
		cur.infParada += n(s?.portero_paradas_hombre_menos);

		cur.total = cur.paradaRecup + cur.paradaFuera + cur.penaltiParado + cur.infParada;
		map.set(playerId, cur);
	}

	return [...map.entries()]
		.map(([playerId, row]) => ({
			playerId,
			player: playersById.get(playerId) ?? null,
			...row
		}))
		.sort((a, b) => b.total - a.total);
}
