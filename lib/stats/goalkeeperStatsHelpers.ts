import { GOALKEEPER_STATS, type GoalkeeperStatCategory, type GoalkeeperStatDef } from "./goalkeeperStatsConfig";

export const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function getGoalkeeperStatValue(stats: Record<string, any> | null | undefined, key: string) {
	return n(stats?.[key]);
}

export function getGoalkeeperStatsByCategory(category: GoalkeeperStatCategory): GoalkeeperStatDef[] {
	return GOALKEEPER_STATS.filter((s) => s.category === category);
}

export function sumGoalkeeperStatsByFlag(
	stats: Record<string, any> | null | undefined,
	flag: "countsAsSave" | "countsAsGoalConceded" | "countsAsShotReceived" | "countsAsPenaltyAttempt"
) {
	return GOALKEEPER_STATS.filter((s) => s[flag]).reduce((acc, s) => acc + n(stats?.[s.key]), 0);
}

export function sumGoalkeeperCategory(stats: Record<string, any> | null | undefined, category: GoalkeeperStatCategory) {
	return GOALKEEPER_STATS.filter((s) => s.category === category).reduce((acc, s) => acc + n(stats?.[s.key]), 0);
}

export function getGoalkeeperDerived(stats: Record<string, any> | null | undefined) {
	const saves = n(stats?.portero_paradas_totales) > 0 ? n(stats?.portero_paradas_totales) : sumGoalkeeperStatsByFlag(stats, "countsAsSave");

	const goalsConceded =
		n(stats?.goles_recibidos_reales) > 0
			? n(stats?.goles_recibidos_reales)
			: n(stats?.portero_goles_totales) > 0
				? n(stats?.portero_goles_totales)
				: sumGoalkeeperStatsByFlag(stats, "countsAsGoalConceded");

	const shotsReceived = GOALKEEPER_STATS.filter((s) => s.countsAsShotReceived).reduce((acc, s) => {
		if (s.key === "portero_paradas_totales") return acc;
		return acc + n(stats?.[s.key]);
	}, 0);

	const penaltyAttempts = sumGoalkeeperStatsByFlag(stats, "countsAsPenaltyAttempt");
	const penaltySaves = n(stats?.portero_paradas_penalti_parado);

	const savePct = shotsReceived > 0 ? Number(((saves / shotsReceived) * 100).toFixed(1)) : 0;
	const penaltySavePct = penaltyAttempts > 0 ? Number(((penaltySaves / penaltyAttempts) * 100).toFixed(1)) : 0;

	const goalsByCategory = sumGoalkeeperCategory(stats, "goles");
	const savesByCategory = sumGoalkeeperCategory(stats, "paradas");
	const penaltySavesCategory = sumGoalkeeperCategory(stats, "paradas_penalti");
	const otherShots = sumGoalkeeperCategory(stats, "otros_tiros");
	const actions = sumGoalkeeperCategory(stats, "acciones");
	const attack = sumGoalkeeperCategory(stats, "ataque");

	const inferiorityGoals = n(stats?.portero_goles_hombre_menos);
	const inferioritySaves = n(stats?.portero_paradas_hombre_menos);
	const inferiorityOutside = n(stats?.portero_inferioridad_fuera);
	const inferiorityBlocks = n(stats?.portero_inferioridad_bloqueo);

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

export function getGoalkeeperSummary(stats: Record<string, any> | null | undefined) {
	const derived = getGoalkeeperDerived(stats);

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

export function accumulateGoalkeeperStats(rows: Array<Record<string, any>>) {
	const acc: Record<string, number> = {};

	for (const def of GOALKEEPER_STATS) {
		acc[def.key] = 0;
	}

	acc.portero_goles_totales = 0;
	acc.goles_recibidos_reales = 0;
	acc.portero_goles_penalti_encajado = 0;

	for (const row of rows ?? []) {
		for (const def of GOALKEEPER_STATS) {
			acc[def.key] += n(row?.[def.key]);
		}

		acc.portero_goles_totales += n(row?.portero_goles_totales);
		acc.goles_recibidos_reales += n(row?.goles_recibidos_reales);
		acc.portero_goles_penalti_encajado += n(row?.portero_goles_penalti_encajado);
	}

	return acc;
}
