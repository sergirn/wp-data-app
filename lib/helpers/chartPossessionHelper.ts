import { PLAYER_STATS } from "@/lib/stats/playerStatsConfig";
import { GOALKEEPER_STATS } from "@/lib/stats/goalkeeperStatsConfig";

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function sumKeys(rows: Array<Record<string, any>>, keys: string[]) {
	return (rows ?? []).reduce((acc, row) => {
		return acc + keys.reduce((s, key) => s + n(row?.[key]), 0);
	}, 0);
}

function playerHasKey(key: string) {
	return PLAYER_STATS.some((s) => s.key === key);
}

function goalkeeperHasKey(key: string) {
	return GOALKEEPER_STATS.some((s) => s.key === key);
}

export function buildMatchPossessionData(stats: Array<Record<string, any>>, rival?: string, matchDateLabel?: string) {
	const arr = Array.isArray(stats) ? stats : [];

	const recoveryKeys = [
		playerHasKey("acciones_recuperacion") ? "acciones_recuperacion" : null,
		playerHasKey("acciones_rebote") ? "acciones_rebote" : null,
		goalkeeperHasKey("portero_acciones_recuperacion") ? "portero_acciones_recuperacion" : null
	].filter(Boolean) as string[];

	const lossKeys = [
		playerHasKey("acciones_perdida_poco") ? "acciones_perdida_poco" : null,
		playerHasKey("pase_boya_fallado") ? "pase_boya_fallado" : null,
		goalkeeperHasKey("portero_acciones_perdida_pos") ? "portero_acciones_perdida_pos" : null
	].filter(Boolean) as string[];

	const recuperaciones = sumKeys(arr, recoveryKeys);
	const perdidas = sumKeys(arr, lossKeys);

	const balance = recuperaciones - perdidas;
	const totalMov = recuperaciones + perdidas;
	const ratioRecPer = perdidas > 0 ? Number((recuperaciones / perdidas).toFixed(2)) : recuperaciones;
	const pctRec = totalMov > 0 ? Number(((recuperaciones / totalMov) * 100).toFixed(1)) : 0;
	const pctPer = totalMov > 0 ? Number(((perdidas / totalMov) * 100).toFixed(1)) : 0;

	return {
		recuperaciones,
		perdidas,
		balance,
		totalMov,
		ratioRecPer,
		pctRec,
		pctPer,
		recoveryKeys,
		lossKeys,
		context: {
			rival: rival ?? "Rival",
			fullDate: matchDateLabel ?? ""
		}
	};
}
