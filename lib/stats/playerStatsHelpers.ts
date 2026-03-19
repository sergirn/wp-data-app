import { PLAYER_STATS, type PlayerStatCategory, type PlayerStatDef } from "./playerStatsConfig";

export const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

type HiddenStatsInput = string[] | Set<string> | undefined;

function isVisibleStat(key: string, hiddenStats?: HiddenStatsInput) {
	if (!hiddenStats) return true;
	if (hiddenStats instanceof Set) return !hiddenStats.has(key);
	return !hiddenStats.includes(key);
}

export function getPlayerStatValue(stats: Record<string, any> | null | undefined, key: string, hiddenStats?: HiddenStatsInput) {
	if (!isVisibleStat(key, hiddenStats)) return 0;
	return n(stats?.[key]);
}

export function getPlayerStatsByCategory(category: PlayerStatCategory, hiddenStats?: HiddenStatsInput): PlayerStatDef[] {
	return PLAYER_STATS.filter((s) => s.category === category && isVisibleStat(s.key, hiddenStats));
}

export function sumPlayerStatsByFlag(
	stats: Record<string, any> | null | undefined,
	flag: "countsAsGoal" | "countsAsShot" | "countsAsMiss" | "countsAsAssist",
	hiddenStats?: HiddenStatsInput
) {
	return PLAYER_STATS.filter((s) => s[flag] && isVisibleStat(s.key, hiddenStats)).reduce((acc, s) => acc + n(stats?.[s.key]), 0);
}

export function sumPlayerCategory(stats: Record<string, any> | null | undefined, category: PlayerStatCategory, hiddenStats?: HiddenStatsInput) {
	return PLAYER_STATS.filter((s) => s.category === category && isVisibleStat(s.key, hiddenStats)).reduce((acc, s) => acc + n(stats?.[s.key]), 0);
}

export function getPlayerDerived(stats: Record<string, any> | null | undefined, hiddenStats?: HiddenStatsInput) {
	const goals =
		isVisibleStat("goles_totales", hiddenStats) && n(stats?.goles_totales) > 0
			? n(stats?.goles_totales)
			: sumPlayerStatsByFlag(stats, "countsAsGoal", hiddenStats);

	const shots =
		isVisibleStat("tiros_totales", hiddenStats) && n(stats?.tiros_totales) > 0
			? n(stats?.tiros_totales)
			: sumPlayerStatsByFlag(stats, "countsAsShot", hiddenStats);

	const misses = sumPlayerStatsByFlag(stats, "countsAsMiss", hiddenStats);
	const assists = isVisibleStat("acciones_asistencias", hiddenStats) ? n(stats?.acciones_asistencias) : 0;

	const efficiency = shots > 0 ? Number(((goals / shots) * 100).toFixed(1)) : 0;

	const superiorityGoals =
		(isVisibleStat("goles_hombre_mas", hiddenStats) ? n(stats?.goles_hombre_mas) : 0) +
		(isVisibleStat("gol_del_palo_sup", hiddenStats) ? n(stats?.gol_del_palo_sup) : 0);

	const superiorityAttempts =
		(isVisibleStat("goles_hombre_mas", hiddenStats) ? n(stats?.goles_hombre_mas) : 0) +
		(isVisibleStat("gol_del_palo_sup", hiddenStats) ? n(stats?.gol_del_palo_sup) : 0) +
		(isVisibleStat("tiros_hombre_mas", hiddenStats) ? n(stats?.tiros_hombre_mas) : 0) +
		(isVisibleStat("portero_paradas_superioridad", hiddenStats) ? n(stats?.portero_paradas_superioridad) : 0) +
		(isVisibleStat("jugador_superioridad_bloqueo", hiddenStats) ? n(stats?.jugador_superioridad_bloqueo) : 0);

	const superiorityEfficiency = superiorityAttempts > 0 ? Number(((superiorityGoals / superiorityAttempts) * 100).toFixed(1)) : 0;

	const totalActions =
		(isVisibleStat("acciones_asistencias", hiddenStats) ? n(stats?.acciones_asistencias) : 0) +
		(isVisibleStat("acciones_bloqueo", hiddenStats) ? n(stats?.acciones_bloqueo) : 0) +
		(isVisibleStat("acciones_recuperacion", hiddenStats) ? n(stats?.acciones_recuperacion) : 0) +
		(isVisibleStat("acciones_rebote", hiddenStats) ? n(stats?.acciones_rebote) : 0) +
		(isVisibleStat("acciones_exp_provocada", hiddenStats) ? n(stats?.acciones_exp_provocada) : 0) +
		(isVisibleStat("acciones_penalti_provocado", hiddenStats) ? n(stats?.acciones_penalti_provocado) : 0) +
		(isVisibleStat("acciones_recibir_gol", hiddenStats) ? n(stats?.acciones_recibir_gol) : 0) +
		(isVisibleStat("pase_boya", hiddenStats) ? n(stats?.pase_boya) : 0) +
		(isVisibleStat("pase_boya_fallado", hiddenStats) ? n(stats?.pase_boya_fallado) : 0) +
		(isVisibleStat("acciones_perdida_poco", hiddenStats) ? n(stats?.acciones_perdida_poco) : 0);

	const totalFouls =
		(isVisibleStat("faltas_exp_20_1c1", hiddenStats) ? n(stats?.faltas_exp_20_1c1) : 0) +
		(isVisibleStat("faltas_exp_20_boya", hiddenStats) ? n(stats?.faltas_exp_20_boya) : 0) +
		(isVisibleStat("faltas_exp_simple", hiddenStats) ? n(stats?.faltas_exp_simple) : 0) +
		(isVisibleStat("faltas_penalti", hiddenStats) ? n(stats?.faltas_penalti) : 0) +
		(isVisibleStat("faltas_contrafaltas", hiddenStats) ? n(stats?.faltas_contrafaltas) : 0) +
		(isVisibleStat("faltas_exp_3_int", hiddenStats) ? n(stats?.faltas_exp_3_int) : 0) +
		(isVisibleStat("faltas_exp_3_bruta", hiddenStats) ? n(stats?.faltas_exp_3_bruta) : 0) +
		(isVisibleStat("exp_trans_def", hiddenStats) ? n(stats?.exp_trans_def) : 0);

	const blocks = isVisibleStat("acciones_bloqueo", hiddenStats) ? n(stats?.acciones_bloqueo) : 0;
	const recoveries = isVisibleStat("acciones_recuperacion", hiddenStats) ? n(stats?.acciones_recuperacion) : 0;
	const rebounds = isVisibleStat("acciones_rebote", hiddenStats) ? n(stats?.acciones_rebote) : 0;
	const losses = isVisibleStat("acciones_perdida_poco", hiddenStats) ? n(stats?.acciones_perdida_poco) : 0;
	const provokedExclusions = isVisibleStat("acciones_exp_provocada", hiddenStats) ? n(stats?.acciones_exp_provocada) : 0;
	const provokedPenalties = isVisibleStat("acciones_penalti_provocado", hiddenStats) ? n(stats?.acciones_penalti_provocado) : 0;

	const boyaPasses = isVisibleStat("pase_boya", hiddenStats) ? n(stats?.pase_boya) : 0;
	const boyaPassesMissed = isVisibleStat("pase_boya_fallado", hiddenStats) ? n(stats?.pase_boya_fallado) : 0;

	const reboundRecoveredHM = isVisibleStat("rebote_recup_hombre_mas", hiddenStats) ? n(stats?.rebote_recup_hombre_mas) : 0;
	const reboundLostHM = isVisibleStat("rebote_perd_hombre_mas", hiddenStats) ? n(stats?.rebote_perd_hombre_mas) : 0;
	const reboundBalanceHM = reboundRecoveredHM - reboundLostHM;

	const superioritySaves = isVisibleStat("portero_paradas_superioridad", hiddenStats) ? n(stats?.portero_paradas_superioridad) : 0;
	const superiorityBlocks = isVisibleStat("jugador_superioridad_bloqueo", hiddenStats) ? n(stats?.jugador_superioridad_bloqueo) : 0;
	const superiorityMisses =
		(isVisibleStat("tiros_hombre_mas", hiddenStats) ? n(stats?.tiros_hombre_mas) : 0) + superioritySaves + superiorityBlocks;

	const goalsByCategory = sumPlayerCategory(stats, "goles", hiddenStats);
	const missesByCategory = sumPlayerCategory(stats, "fallos", hiddenStats);
	const foulsByCategory = sumPlayerCategory(stats, "faltas", hiddenStats);
	const actionsByCategory = sumPlayerCategory(stats, "acciones", hiddenStats);

	return {
		goals,
		shots,
		misses,
		assists,
		efficiency,

		superiorityGoals,
		superiorityAttempts,
		superiorityEfficiency,
		superioritySaves,
		superiorityBlocks,
		superiorityMisses,

		totalActions,
		totalFouls,

		blocks,
		recoveries,
		rebounds,
		losses,
		provokedExclusions,
		provokedPenalties,

		boyaPasses,
		boyaPassesMissed,

		reboundRecoveredHM,
		reboundLostHM,
		reboundBalanceHM,

		goalsByCategory,
		missesByCategory,
		foulsByCategory,
		actionsByCategory
	};
}

export function getPlayerSummary(stats: Record<string, any> | null | undefined, hiddenStats?: HiddenStatsInput) {
	const derived = getPlayerDerived(stats, hiddenStats);

	return {
		...derived,
		topBar: {
			goals: derived.goals,
			shots: derived.shots,
			efficiency: derived.efficiency,
			assists: derived.assists
		},
		superiority: {
			goals: derived.superiorityGoals,
			attempts: derived.superiorityAttempts,
			efficiency: derived.superiorityEfficiency,
			saves: derived.superioritySaves,
			blocks: derived.superiorityBlocks,
			misses: derived.superiorityMisses
		},
		defense: {
			fouls: derived.totalFouls,
			blocks: derived.blocks,
			recoveries: derived.recoveries,
			rebounds: derived.rebounds
		},
		actions: {
			total: derived.totalActions,
			losses: derived.losses,
			provokedExclusions: derived.provokedExclusions,
			provokedPenalties: derived.provokedPenalties,
			boyaPasses: derived.boyaPasses,
			boyaPassesMissed: derived.boyaPassesMissed
		},
		reboundsHM: {
			recovered: derived.reboundRecoveredHM,
			lost: derived.reboundLostHM,
			balance: derived.reboundBalanceHM
		}
	};
}

export function accumulatePlayerStats(rows: Array<Record<string, any>>, hiddenStats?: HiddenStatsInput) {
	const acc: Record<string, number> = {};

	for (const def of PLAYER_STATS) {
		acc[def.key] = 0;
	}

	acc.goles_totales = 0;
	acc.tiros_totales = 0;
	acc.faltas_exp_3_int = 0;
	acc.faltas_exp_3_bruta = 0;
	acc.rebote_recup_hombre_mas = 0;
	acc.rebote_perd_hombre_mas = 0;

	for (const row of rows ?? []) {
		for (const def of PLAYER_STATS) {
			if (!isVisibleStat(def.key, hiddenStats)) continue;
			acc[def.key] += n(row?.[def.key]);
		}

		if (isVisibleStat("goles_totales", hiddenStats)) acc.goles_totales += n(row?.goles_totales);
		if (isVisibleStat("tiros_totales", hiddenStats)) acc.tiros_totales += n(row?.tiros_totales);
		if (isVisibleStat("faltas_exp_3_int", hiddenStats)) acc.faltas_exp_3_int += n(row?.faltas_exp_3_int);
		if (isVisibleStat("faltas_exp_3_bruta", hiddenStats)) acc.faltas_exp_3_bruta += n(row?.faltas_exp_3_bruta);
		if (isVisibleStat("rebote_recup_hombre_mas", hiddenStats)) acc.rebote_recup_hombre_mas += n(row?.rebote_recup_hombre_mas);
		if (isVisibleStat("rebote_perd_hombre_mas", hiddenStats)) acc.rebote_perd_hombre_mas += n(row?.rebote_perd_hombre_mas);
	}

	return acc;
}
