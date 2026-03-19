import { GOALKEEPER_STATS, type GoalkeeperStatCategory, type GoalkeeperStatDef } from "./goalkeeperStatsConfig";

export const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

type HiddenStatsInput = string[] | Set<string> | undefined;

function isVisibleStat(key: string, hiddenStats?: HiddenStatsInput) {
	if (!hiddenStats) return true;
	if (hiddenStats instanceof Set) return !hiddenStats.has(key);
	return !hiddenStats.includes(key);
}

export function getGoalkeeperStatValue(stats: Record<string, any> | null | undefined, key: string, hiddenStats?: HiddenStatsInput) {
	if (!isVisibleStat(key, hiddenStats)) return 0;
	return n(stats?.[key]);
}

export function getGoalkeeperStatsByCategory(category: GoalkeeperStatCategory, hiddenStats?: HiddenStatsInput): GoalkeeperStatDef[] {
	return GOALKEEPER_STATS.filter((s) => s.category === category && isVisibleStat(s.key, hiddenStats));
}

export function sumGoalkeeperStatsByFlag(
	stats: Record<string, any> | null | undefined,
	flag: "countsAsSave" | "countsAsGoalConceded" | "countsAsShotReceived" | "countsAsPenaltyAttempt",
	hiddenStats?: HiddenStatsInput
) {
	return GOALKEEPER_STATS.filter((s) => s[flag] && isVisibleStat(s.key, hiddenStats)).reduce((acc, s) => acc + n(stats?.[s.key]), 0);
}

export function sumGoalkeeperCategory(
	stats: Record<string, any> | null | undefined,
	category: GoalkeeperStatCategory,
	hiddenStats?: HiddenStatsInput
) {
	return GOALKEEPER_STATS.filter((s) => s.category === category && isVisibleStat(s.key, hiddenStats)).reduce(
		(acc, s) => acc + n(stats?.[s.key]),
		0
	);
}

export function getGoalkeeperDerived(stats: Record<string, any> | null | undefined, hiddenStats?: HiddenStatsInput) {
	const saves =
		isVisibleStat("portero_paradas_totales", hiddenStats) && n(stats?.portero_paradas_totales) > 0
			? n(stats?.portero_paradas_totales)
			: sumGoalkeeperStatsByFlag(stats, "countsAsSave", hiddenStats);

	const goalsConceded =
		isVisibleStat("goles_recibidos_reales", hiddenStats) && n(stats?.goles_recibidos_reales) > 0
			? n(stats?.goles_recibidos_reales)
			: isVisibleStat("portero_goles_totales", hiddenStats) && n(stats?.portero_goles_totales) > 0
				? n(stats?.portero_goles_totales)
				: sumGoalkeeperStatsByFlag(stats, "countsAsGoalConceded", hiddenStats);

	const shotsReceived = GOALKEEPER_STATS.filter((s) => s.countsAsShotReceived && isVisibleStat(s.key, hiddenStats)).reduce((acc, s) => {
		if (s.key === "portero_paradas_totales") return acc;
		return acc + n(stats?.[s.key]);
	}, 0);

	const penaltyAttempts = sumGoalkeeperStatsByFlag(stats, "countsAsPenaltyAttempt", hiddenStats);
	const penaltySaves = isVisibleStat("portero_paradas_penalti_parado", hiddenStats) ? n(stats?.portero_paradas_penalti_parado) : 0;

	const savePct = shotsReceived > 0 ? Number(((saves / shotsReceived) * 100).toFixed(1)) : 0;
	const penaltySavePct = penaltyAttempts > 0 ? Number(((penaltySaves / penaltyAttempts) * 100).toFixed(1)) : 0;

	const goalsByCategory = sumGoalkeeperCategory(stats, "goles", hiddenStats);
	const savesByCategory = sumGoalkeeperCategory(stats, "paradas", hiddenStats);
	const penaltySavesCategory = sumGoalkeeperCategory(stats, "paradas_penalti", hiddenStats);
	const otherShots = sumGoalkeeperCategory(stats, "otros_tiros", hiddenStats);
	const actions = sumGoalkeeperCategory(stats, "acciones", hiddenStats);
	const attack = sumGoalkeeperCategory(stats, "ataque", hiddenStats);

	const inferiorityGoals =
		(isVisibleStat("portero_goles_hombre_menos", hiddenStats) ? n(stats?.portero_goles_hombre_menos) : 0) +
		(isVisibleStat("portero_gol_palo", hiddenStats) ? n(stats?.portero_gol_palo) : 0);

	const inferioritySaves = isVisibleStat("portero_paradas_hombre_menos", hiddenStats) ? n(stats?.portero_paradas_hombre_menos) : 0;
	const inferiorityOutside = isVisibleStat("portero_inferioridad_fuera", hiddenStats) ? n(stats?.portero_inferioridad_fuera) : 0;
	const inferiorityBlocks = isVisibleStat("portero_inferioridad_bloqueo", hiddenStats) ? n(stats?.portero_inferioridad_bloqueo) : 0;

	const inferiorityAttempts = inferiorityGoals + inferioritySaves + inferiorityOutside + inferiorityBlocks;
	const inferiorityResolved = inferioritySaves + inferiorityOutside + inferiorityBlocks;
	const inferiorityEfficiency = inferiorityAttempts > 0 ? Number(((inferiorityResolved / inferiorityAttempts) * 100).toFixed(1)) : 0;

	return {
		saves,
		goalsConceded,
		shotsReceived,
		penaltyAttempts,
		penaltySaves,
		savePct,
		penaltySavePct,

		goalsByCategory,
		savesByCategory,
		penaltySavesCategory,
		otherShots,
		actions,
		attack,

		inferiorityGoals,
		inferioritySaves,
		inferiorityOutside,
		inferiorityBlocks,
		inferiorityAttempts,
		inferiorityResolved,
		inferiorityEfficiency
	};
}

export function getGoalkeeperSummary(stats: Record<string, any> | null | undefined, hiddenStats?: HiddenStatsInput) {
	const derived = getGoalkeeperDerived(stats, hiddenStats);

	return {
		...derived,
		topBar: {
			saves: derived.saves,
			goalsConceded: derived.goalsConceded,
			shotsReceived: derived.shotsReceived,
			savePct: derived.savePct
		},
		penalties: {
			attempts: derived.penaltyAttempts,
			saves: derived.penaltySaves,
			savePct: derived.penaltySavePct
		},
		inferiority: {
			goals: derived.inferiorityGoals,
			saves: derived.inferioritySaves,
			outside: derived.inferiorityOutside,
			blocks: derived.inferiorityBlocks,
			attempts: derived.inferiorityAttempts,
			resolved: derived.inferiorityResolved,
			efficiency: derived.inferiorityEfficiency
		}
	};
}

export function accumulateGoalkeeperStats(rows: Array<Record<string, any>>, hiddenStats?: HiddenStatsInput) {
	const acc: Record<string, number> = {};

	for (const def of GOALKEEPER_STATS) {
		acc[def.key] = 0;
	}

	acc.portero_goles_totales = 0;
	acc.goles_recibidos_reales = 0;
	acc.portero_goles_penalti_encajado = 0;

	for (const row of rows ?? []) {
		for (const def of GOALKEEPER_STATS) {
			if (!isVisibleStat(def.key, hiddenStats)) continue;
			acc[def.key] += n(row?.[def.key]);
		}

		if (isVisibleStat("portero_goles_totales", hiddenStats)) acc.portero_goles_totales += n(row?.portero_goles_totales);
		if (isVisibleStat("goles_recibidos_reales", hiddenStats)) acc.goles_recibidos_reales += n(row?.goles_recibidos_reales);
		if (isVisibleStat("portero_goles_penalti_encajado", hiddenStats)) {
			acc.portero_goles_penalti_encajado += n(row?.portero_goles_penalti_encajado);
		}
	}

	return acc;
}
