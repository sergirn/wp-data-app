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

type ShotMistakesBuildOptions = {
	hiddenStats?: string[];
	hiddenSet?: Set<string>;
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

function resolveHiddenSet(options?: ShotMistakesBuildOptions) {
	if (options?.hiddenSet) return options.hiddenSet;
	return new Set(options?.hiddenStats ?? []);
}

function isVisible(hiddenSet: Set<string>, key: string) {
	return !hiddenSet.has(key);
}

function getShotMistakeBuckets(rows: any[], hiddenSet: Set<string>) {
	const pen = isVisible(hiddenSet, "tiros_penalti_fallado") ? rows.reduce((sum, s) => sum + toNum(s?.tiros_penalti_fallado), 0) : 0;

	const corner = isVisible(hiddenSet, "tiros_corner") ? rows.reduce((sum, s) => sum + toNum(s?.tiros_corner), 0) : 0;

	const out = isVisible(hiddenSet, "tiros_fuera") ? rows.reduce((sum, s) => sum + toNum(s?.tiros_fuera), 0) : 0;

	const palo = isVisible(hiddenSet, "tiro_palo") ? rows.reduce((sum, s) => sum + toNum(s?.tiro_palo), 0) : 0;

	const saved = isVisible(hiddenSet, "tiros_parados") ? rows.reduce((sum, s) => sum + toNum(s?.tiros_parados), 0) : 0;

	const blocked = isVisible(hiddenSet, "tiros_bloqueado") ? rows.reduce((sum, s) => sum + toNum(s?.tiros_bloqueado), 0) : 0;

	const sup =
		(isVisible(hiddenSet, "tiros_hombre_mas") ? rows.reduce((sum, s) => sum + toNum(s?.tiros_hombre_mas), 0) : 0) +
		(isVisible(hiddenSet, "portero_paradas_superioridad") ? rows.reduce((sum, s) => sum + toNum(s?.portero_paradas_superioridad), 0) : 0) +
		(isVisible(hiddenSet, "jugador_superioridad_bloqueo") ? rows.reduce((sum, s) => sum + toNum(s?.jugador_superioridad_bloqueo), 0) : 0);

	const total = pen + corner + out + palo + saved + blocked + sup;

	return {
		pen,
		corner,
		out,
		palo,
		saved,
		blocked,
		sup,
		total
	};
}

function buildShotMistakesSummary(rows: any[], options?: ShotMistakesBuildOptions): ShotMistakesSummary {
	const hiddenSet = resolveHiddenSet(options);
	const { pen, corner, out, palo, saved, blocked, sup, total } = getShotMistakeBuckets(rows, hiddenSet);

	const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

	const parts: ShotMistakePart[] = [
		isVisible(hiddenSet, "tiros_penalti_fallado")
			? { key: "pen", label: "Penalti fallado", value: pen, pct: pct(pen), color: SHOT_MISTAKES_COLORS.pen }
			: null,
		isVisible(hiddenSet, "tiros_corner")
			? { key: "corner", label: "Corner", value: corner, pct: pct(corner), color: SHOT_MISTAKES_COLORS.corner }
			: null,
		isVisible(hiddenSet, "tiros_fuera") ? { key: "out", label: "Fuera", value: out, pct: pct(out), color: SHOT_MISTAKES_COLORS.out } : null,
		isVisible(hiddenSet, "tiro_palo") ? { key: "palo", label: "Palo", value: palo, pct: pct(palo), color: SHOT_MISTAKES_COLORS.palo } : null,
		isVisible(hiddenSet, "tiros_parados")
			? { key: "saved", label: "Parado", value: saved, pct: pct(saved), color: SHOT_MISTAKES_COLORS.saved }
			: null,
		isVisible(hiddenSet, "tiros_bloqueado")
			? { key: "blocked", label: "Bloqueado", value: blocked, pct: pct(blocked), color: SHOT_MISTAKES_COLORS.blocked }
			: null,
		isVisible(hiddenSet, "tiros_hombre_mas") ||
		isVisible(hiddenSet, "portero_paradas_superioridad") ||
		isVisible(hiddenSet, "jugador_superioridad_bloqueo")
			? { key: "sup", label: "Fallo Sup.+", value: sup, pct: pct(sup), color: SHOT_MISTAKES_COLORS.sup }
			: null
	].filter(Boolean) as ShotMistakePart[];

	const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

	return {
		parts,
		total,
		topType
	};
}

export function buildShotMistakesPerPlayer(
	stats: any[],
	playersById: Map<number, { id: number; name: string; number?: number | null; photo_url?: string | null }>,
	options?: ShotMistakesBuildOptions
): ShotMistakesPlayerRow[] {
	const hiddenSet = resolveHiddenSet(options);

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

		if (isVisible(hiddenSet, "tiros_penalti_fallado")) cur.pen += toNum(s?.tiros_penalti_fallado);
		if (isVisible(hiddenSet, "tiros_corner")) cur.corner += toNum(s?.tiros_corner);
		if (isVisible(hiddenSet, "tiros_fuera")) cur.out += toNum(s?.tiros_fuera);
		if (isVisible(hiddenSet, "tiro_palo")) cur.palo += toNum(s?.tiro_palo);
		if (isVisible(hiddenSet, "tiros_parados")) cur.saved += toNum(s?.tiros_parados);
		if (isVisible(hiddenSet, "tiros_bloqueado")) cur.blocked += toNum(s?.tiros_bloqueado);

		if (isVisible(hiddenSet, "tiros_hombre_mas")) cur.sup += toNum(s?.tiros_hombre_mas);
		if (isVisible(hiddenSet, "portero_paradas_superioridad")) cur.sup += toNum(s?.portero_paradas_superioridad);
		if (isVisible(hiddenSet, "jugador_superioridad_bloqueo")) cur.sup += toNum(s?.jugador_superioridad_bloqueo);

		cur.total = cur.pen + cur.corner + cur.out + cur.palo + cur.saved + cur.blocked + cur.sup;

		m.set(pid, cur);
	});

	return [...m.entries()]
		.map(([playerId, row]) => ({
			playerId,
			player: playersById.get(playerId) ?? null,
			...row
		}))
		.filter((row) => row.total > 0)
		.sort((a, b) => b.total - a.total);
}

export function buildShotMistakesPerMatch(matches: any[], stats: any[], options?: ShotMistakesBuildOptions): ShotMistakesMatchRow[] {
	const hiddenSet = resolveHiddenSet(options);

	const sorted = [...(matches ?? [])].sort((a, b) => {
		const aj = a?.jornada ?? 9999;
		const bj = b?.jornada ?? 9999;
		if (aj !== bj) return aj - bj;
		return new Date(a?.match_date ?? 0).getTime() - new Date(b?.match_date ?? 0).getTime();
	});

	return sorted
		.slice(-15)
		.map((match, idx) => {
			const matchStats = (stats ?? []).filter((s: any) => String(s?.match_id) === String(match?.id));
			const { pen, corner, out, palo, saved, blocked, sup, total } = getShotMistakeBuckets(matchStats, hiddenSet);

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
		})
		.filter((row) => row.total > 0);
}

export function buildShotMistakesSeasonData(
	matches: any[],
	stats: any[],
	playersById: Map<number, any>,
	options?: ShotMistakesBuildOptions
): ShotMistakesChartData {
	return {
		summary: buildShotMistakesSummary(stats ?? [], options),
		perPlayer: buildShotMistakesPerPlayer(stats ?? [], playersById, options),
		perMatch: buildShotMistakesPerMatch(matches ?? [], stats ?? [], options),
		totalMatches: (matches ?? []).length || 0
	};
}

export function buildShotMistakesMatchData(
	match: any,
	stats: any[],
	playersById: Map<number, any>,
	options?: ShotMistakesBuildOptions
): ShotMistakesChartData {
	const summary = buildShotMistakesSummary(stats ?? [], options);

	return {
		summary,
		perPlayer: buildShotMistakesPerPlayer(stats ?? [], playersById, options),
		perMatch:
			summary.total > 0
				? [
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
					]
				: [],
		totalMatches: 1
	};
}
