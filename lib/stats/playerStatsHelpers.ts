import { PLAYER_STATS, type PlayerStatCategory, type PlayerStatDef } from "./playerStatsConfig";

export const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function getPlayerStatValue(stats: Record<string, any> | null | undefined, key: string) {
	return n(stats?.[key]);
}

export function getPlayerStatsByCategory(category: PlayerStatCategory): PlayerStatDef[] {
	return PLAYER_STATS.filter((s) => s.category === category);
}

export function sumPlayerStatsByFlag(
	stats: Record<string, any> | null | undefined,
	flag: "countsAsGoal" | "countsAsShot" | "countsAsMiss" | "countsAsAssist"
) {
	return PLAYER_STATS.filter((s) => s[flag]).reduce((acc, s) => acc + n(stats?.[s.key]), 0);
}

export function sumPlayerCategory(stats: Record<string, any> | null | undefined, category: PlayerStatCategory) {
	return PLAYER_STATS.filter((s) => s.category === category).reduce((acc, s) => acc + n(stats?.[s.key]), 0);
}

export function getPlayerDerived(stats: Record<string, any> | null | undefined) {
	const goals = n(stats?.goles_totales) > 0 ? n(stats?.goles_totales) : sumPlayerStatsByFlag(stats, "countsAsGoal");

	const shots = n(stats?.tiros_totales) > 0 ? n(stats?.tiros_totales) : sumPlayerStatsByFlag(stats, "countsAsShot");

	const misses = sumPlayerStatsByFlag(stats, "countsAsMiss");
	const assists = n(stats?.acciones_asistencias);

	const efficiency = shots > 0 ? Number(((goals / shots) * 100).toFixed(1)) : 0;

	const superiorityGoals = n(stats?.goles_hombre_mas) + n(stats?.gol_del_palo_sup);

	const superiorityAttempts =
		n(stats?.goles_hombre_mas) +
		n(stats?.gol_del_palo_sup) +
		n(stats?.tiros_hombre_mas) +
		n(stats?.portero_paradas_superioridad) +
		n(stats?.jugador_superioridad_bloqueo);

	const superiorityEfficiency = superiorityAttempts > 0 ? Number(((superiorityGoals / superiorityAttempts) * 100).toFixed(1)) : 0;

	const totalActions =
		n(stats?.acciones_asistencias) +
		n(stats?.acciones_bloqueo) +
		n(stats?.acciones_recuperacion) +
		n(stats?.acciones_rebote) +
		n(stats?.acciones_exp_provocada) +
		n(stats?.acciones_penalti_provocado) +
		n(stats?.acciones_recibir_gol) +
		n(stats?.pase_boya) +
		n(stats?.pase_boya_fallado) +
		n(stats?.acciones_perdida_poco);

	const totalFouls =
		n(stats?.faltas_exp_20_1c1) +
		n(stats?.faltas_exp_20_boya) +
		n(stats?.faltas_exp_simple) +
		n(stats?.faltas_penalti) +
		n(stats?.faltas_contrafaltas) +
		n(stats?.faltas_exp_3_int) +
		n(stats?.faltas_exp_3_bruta) +
		n(stats?.exp_trans_def);

	const blocks = n(stats?.acciones_bloqueo);
	const recoveries = n(stats?.acciones_recuperacion);
	const rebounds = n(stats?.acciones_rebote);
	const losses = n(stats?.acciones_perdida_poco);
	const provokedExclusions = n(stats?.acciones_exp_provocada);
	const provokedPenalties = n(stats?.acciones_penalti_provocado);

	const boyaPasses = n(stats?.pase_boya);
	const boyaPassesMissed = n(stats?.pase_boya_fallado);

	const reboundRecoveredHM = n(stats?.rebote_recup_hombre_mas);
	const reboundLostHM = n(stats?.rebote_perd_hombre_mas);
	const reboundBalanceHM = reboundRecoveredHM - reboundLostHM;

	const superioritySaves = n(stats?.portero_paradas_superioridad);
	const superiorityBlocks = n(stats?.jugador_superioridad_bloqueo);
	const superiorityMisses = n(stats?.tiros_hombre_mas) + superioritySaves + superiorityBlocks;

	const goalsByCategory = sumPlayerCategory(stats, "goles");
	const missesByCategory = sumPlayerCategory(stats, "fallos");
	const foulsByCategory = sumPlayerCategory(stats, "faltas");
	const actionsByCategory = sumPlayerCategory(stats, "acciones");

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

export function getPlayerSummary(stats: Record<string, any> | null | undefined) {
	const derived = getPlayerDerived(stats);

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

export function accumulatePlayerStats(rows: Array<Record<string, any>>) {
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
			acc[def.key] += n(row?.[def.key]);
		}

		acc.goles_totales += n(row?.goles_totales);
		acc.tiros_totales += n(row?.tiros_totales);
		acc.faltas_exp_3_int += n(row?.faltas_exp_3_int);
		acc.faltas_exp_3_bruta += n(row?.faltas_exp_3_bruta);
		acc.rebote_recup_hombre_mas += n(row?.rebote_recup_hombre_mas);
		acc.rebote_perd_hombre_mas += n(row?.rebote_perd_hombre_mas);
	}

	return acc;
}
