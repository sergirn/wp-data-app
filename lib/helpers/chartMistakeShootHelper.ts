type ShotMistakePart = {
	key: string;
	label: string;
	value: number;
	pct: number;
	color: string;
};

type ShotMistakesSummary = {
	parts: ShotMistakePart[];
	total: number;
	topType: ShotMistakePart | null;
};

type ShotMistakesPlayerRow = {
	playerId: number;
	player: { id: number; name: string; number?: number | null; photo_url?: string | null } | null;
	pen: number;
	corner: number;
	out: number;
	palo: number;
	saved: number;
	blocked: number;
	sup: number;
	total: number;
};

type ShotMistakesMatchRow = {
	matchId: number;
	jornadaNumber: number;
	jornada: string;
	rival: string;
	fullDate: string;
	pen: number;
	corner: number;
	out: number;
	palo: number;
	saved: number;
	blocked: number;
	sup: number;
	total: number;
	penPct: number;
	cornerPct: number;
	outPct: number;
	paloPct: number;
	savedPct: number;
	blockedPct: number;
	supPct: number;
};

type ShotMistakesChartData = {
	summary: ShotMistakesSummary;
	perPlayer: ShotMistakesPlayerRow[];
	perMatch: ShotMistakesMatchRow[];
	totalMatches: number;
};

const SHOT_MISTAKES_COLORS = {
	pen: "hsla(330, 78%, 58%, 1.00)",
	corner: "hsla(35, 90%, 55%, 1.00)",
	out: "hsla(0, 85%, 60%, 1.00)",
	palo: "hsla(140, 70%, 45%, 1.00)",
	saved: "hsla(205, 90%, 55%, 1.00)",
	blocked: "hsla(270, 75%, 60%, 1.00)",
	sup: "hsla(59, 85%, 45%, 1.00)"
};

export const toNum = (v: any) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

function buildShotMistakesSummary(rows: any[]): ShotMistakesSummary {
	const pen = rows.reduce((sum, s) => sum + toNum(s?.tiros_penalti_fallado), 0);
	const corner = rows.reduce((sum, s) => sum + toNum(s?.tiros_corner), 0);
	const out = rows.reduce((sum, s) => sum + toNum(s?.tiros_fuera), 0);
	const palo = rows.reduce((sum, s) => sum + toNum(s?.tiro_palo), 0);
	const saved = rows.reduce((sum, s) => sum + toNum(s?.tiros_parados) + toNum(s?.portero_paradas_superioridad), 0);
	const blocked = rows.reduce((sum, s) => sum + toNum(s?.tiros_bloqueado) + toNum(s?.jugador_superioridad_bloqueo), 0);
	const sup = rows.reduce(
		(sum, s) => sum + toNum(s?.tiros_hombre_mas) + toNum(s?.portero_paradas_superioridad) + toNum(s?.jugador_superioridad_bloqueo),
		0
	);

	const total = pen + corner + out + palo + saved + blocked + sup;
	const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

	const parts: ShotMistakePart[] = [
		{ key: "pen", label: "Penalti fallado", value: pen, pct: pct(pen), color: SHOT_MISTAKES_COLORS.pen },
		{ key: "corner", label: "Corner", value: corner, pct: pct(corner), color: SHOT_MISTAKES_COLORS.corner },
		{ key: "out", label: "Fuera", value: out, pct: pct(out), color: SHOT_MISTAKES_COLORS.out },
		{ key: "palo", label: "Palo", value: palo, pct: pct(palo), color: SHOT_MISTAKES_COLORS.palo },
		{ key: "saved", label: "Parado", value: saved, pct: pct(saved), color: SHOT_MISTAKES_COLORS.saved },
		{ key: "blocked", label: "Bloqueado", value: blocked, pct: pct(blocked), color: SHOT_MISTAKES_COLORS.blocked },
		{ key: "sup", label: "Fallo Sup.+", value: sup, pct: pct(sup), color: SHOT_MISTAKES_COLORS.sup }
	];

	const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

	return {
		parts,
		total,
		topType
	};
}

export function buildShotMistakesPerPlayer(
	stats: any[],
	playersById: Map<number, { id: number; name: string; number?: number | null; photo_url?: string | null }>
): ShotMistakesPlayerRow[] {
	const m = new Map<number, Omit<ShotMistakesPlayerRow, "playerId" | "player">>();

	(stats ?? []).forEach((s: any) => {
		const pid = Number(s?.player_id);
		if (!pid) return;

		const cur = m.get(pid) ?? {
			pen: 0,
			corner: 0,
			out: 0,
			palo: 0,
			saved: 0,
			blocked: 0,
			sup: 0,
			total: 0
		};

		cur.pen += toNum(s?.tiros_penalti_fallado);
		cur.corner += toNum(s?.tiros_corner);
		cur.out += toNum(s?.tiros_fuera);
		cur.palo += toNum(s?.tiro_palo);
		cur.saved += toNum(s?.tiros_parados) + toNum(s?.portero_paradas_superioridad);
		cur.blocked += toNum(s?.tiros_bloqueado) + toNum(s?.jugador_superioridad_bloqueo);
		cur.sup += toNum(s?.tiros_hombre_mas) + toNum(s?.portero_paradas_superioridad) + toNum(s?.jugador_superioridad_bloqueo);
		cur.total = cur.pen + cur.corner + cur.out + cur.palo + cur.saved + cur.blocked + cur.sup;

		m.set(pid, cur);
	});

	return [...m.entries()]
		.map(([playerId, row]) => ({
			playerId,
			player: playersById.get(playerId) ?? null,
			...row
		}))
		.sort((a, b) => b.total - a.total);
}

export function buildShotMistakesPerMatch(matches: any[], stats: any[]): ShotMistakesMatchRow[] {
	const sorted = [...(matches ?? [])].sort((a, b) => {
		const aj = a?.jornada ?? 9999;
		const bj = b?.jornada ?? 9999;
		if (aj !== bj) return aj - bj;
		return new Date(a?.match_date ?? 0).getTime() - new Date(b?.match_date ?? 0).getTime();
	});

	return sorted.slice(-15).map((match, idx) => {
		const matchStats = (stats ?? []).filter((s: any) => String(s?.match_id) === String(match?.id));

		const pen = matchStats.reduce((sum, s) => sum + toNum(s?.tiros_penalti_fallado), 0);
		const corner = matchStats.reduce((sum, s) => sum + toNum(s?.tiros_corner), 0);
		const out = matchStats.reduce((sum, s) => sum + toNum(s?.tiros_fuera), 0);
		const palo = matchStats.reduce((sum, s) => sum + toNum(s?.tiro_palo), 0);
		const saved = matchStats.reduce((sum, s) => sum + toNum(s?.tiros_parados) + toNum(s?.portero_paradas_superioridad), 0);
		const blocked = matchStats.reduce((sum, s) => sum + toNum(s?.tiros_bloqueado) + toNum(s?.jugador_superioridad_bloqueo), 0);
		const sup = matchStats.reduce(
			(sum, s) => sum + toNum(s?.tiros_hombre_mas) + toNum(s?.portero_paradas_superioridad) + toNum(s?.jugador_superioridad_bloqueo),
			0
		);

		const total = pen + corner + out + palo + saved + blocked + sup;
		const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

		const jornadaNumber = match?.jornada ?? idx + 1;

		return {
			matchId: match?.id,
			jornadaNumber,
			jornada: `J${jornadaNumber}`,
			rival: match?.opponent ?? "—",
			fullDate: match?.match_date ? new Date(match.match_date).toLocaleDateString("es-ES") : "—",
			pen,
			corner,
			out,
			palo,
			saved,
			blocked,
			sup,
			total,
			penPct: Number(pct(pen).toFixed(1)),
			cornerPct: Number(pct(corner).toFixed(1)),
			outPct: Number(pct(out).toFixed(1)),
			paloPct: Number(pct(palo).toFixed(1)),
			savedPct: Number(pct(saved).toFixed(1)),
			blockedPct: Number(pct(blocked).toFixed(1)),
			supPct: Number(pct(sup).toFixed(1))
		};
	});
}

export function buildShotMistakesSeasonData(matches: any[], stats: any[], playersById: Map<number, any>): ShotMistakesChartData {
	return {
		summary: buildShotMistakesSummary(stats ?? []),
		perPlayer: buildShotMistakesPerPlayer(stats ?? [], playersById),
		perMatch: buildShotMistakesPerMatch(matches ?? [], stats ?? []),
		totalMatches: (matches ?? []).length || 0
	};
}

export function buildShotMistakesMatchData(match: any, stats: any[], playersById: Map<number, any>): ShotMistakesChartData {
	const summary = buildShotMistakesSummary(stats ?? []);

	return {
		summary,
		perPlayer: buildShotMistakesPerPlayer(stats ?? [], playersById),
		perMatch: [
			{
				matchId: match?.id,
				jornadaNumber: match?.jornada ?? 1,
				jornada: `J${match?.jornada ?? 1}`,
				rival: match?.opponent ?? "—",
				fullDate: match?.match_date ? new Date(match.match_date).toLocaleDateString("es-ES") : "—",
				pen: summary.parts.find((p) => p.key === "pen")?.value ?? 0,
				corner: summary.parts.find((p) => p.key === "corner")?.value ?? 0,
				out: summary.parts.find((p) => p.key === "out")?.value ?? 0,
				palo: summary.parts.find((p) => p.key === "palo")?.value ?? 0,
				saved: summary.parts.find((p) => p.key === "saved")?.value ?? 0,
				blocked: summary.parts.find((p) => p.key === "blocked")?.value ?? 0,
				sup: summary.parts.find((p) => p.key === "sup")?.value ?? 0,
				total: summary.total,
				penPct: Number((summary.parts.find((p) => p.key === "pen")?.pct ?? 0).toFixed(1)),
				cornerPct: Number((summary.parts.find((p) => p.key === "corner")?.pct ?? 0).toFixed(1)),
				outPct: Number((summary.parts.find((p) => p.key === "out")?.pct ?? 0).toFixed(1)),
				paloPct: Number((summary.parts.find((p) => p.key === "palo")?.pct ?? 0).toFixed(1)),
				savedPct: Number((summary.parts.find((p) => p.key === "saved")?.pct ?? 0).toFixed(1)),
				blockedPct: Number((summary.parts.find((p) => p.key === "blocked")?.pct ?? 0).toFixed(1)),
				supPct: Number((summary.parts.find((p) => p.key === "sup")?.pct ?? 0).toFixed(1))
			}
		],
		totalMatches: 1
	};
}
