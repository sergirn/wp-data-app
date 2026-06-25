import { accumulatePlayerStats, getPlayerDerived } from "@/lib/stats/playerStatsHelpers";
import { accumulateGoalkeeperStats, getGoalkeeperDerived } from "@/lib/stats/goalkeeperStatsHelpers";
import type { Match, MatchStats, Player } from "@/lib/types";

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export type GeneralDashboardAnalytics = {
	totalMatches: number;

	shootingEfficiency: string;
	superiorityEfficiency: string;
	inferiorityEfficiency: string;
	goalkeeperEfficiency: string;

	avgGoalsFor: string;
	avgGoalsAgainst: string;
	avgShots: string;
	avgAssists: string;
	avgBlocks: string;
	avgFouls: string;

	avgRecoveries: string;
	avgTurnovers: string;
	avgSaves: string;
	avgExclusions: string;
	avgGoalsSuperiority: string;
	avgShotsSuperiority: string;

	goalDifference: number;

	totalGoalsFor: number;
	totalGoalsAgainst: number;
	totalShots: number;
	totalAssists: number;
	totalBlocks: number;
	totalRecoveries: number;
	totalTurnovers: number;
	totalFouls: number;
	exclusions: number;
	totalSaves: number;

	goalsSuperiority: number;
	shotsSuperiority: number;

	savesInferiority: number;
	goalsAgainstInferiority: number;
};

export function buildGeneralDashboardAnalytics(
	matches: Match[] = [],
	stats: MatchStats[] = [],
	players: Player[] = []
): GeneralDashboardAnalytics | null {
	const totalMatches = matches?.length ?? 0;
	if (totalMatches === 0) return null;

	const playersById = new Map<number, Player>((players ?? []).map((p) => [p.id, p]));

	const fieldStats = (stats ?? []).filter((s) => !playersById.get(s.player_id)?.is_goalkeeper);
	const goalkeeperStatsRows = (stats ?? []).filter((s) => playersById.get(s.player_id)?.is_goalkeeper);

	const playerTotals = accumulatePlayerStats(fieldStats as any[]);
	const playerDerived = getPlayerDerived(playerTotals);

	const goalkeeperTotals = accumulateGoalkeeperStats(goalkeeperStatsRows as any[]);
	const goalkeeperDerived = getGoalkeeperDerived(goalkeeperTotals);

	const totalGoalsFor = playerDerived.goals;
	const totalShots = playerDerived.shots;
	const totalAssists = n(playerTotals.acciones_asistencias);
	const totalBlocks = n(playerTotals.acciones_bloqueo);
	const totalRecoveries = n(playerTotals.acciones_recuperacion) + n(playerTotals.acciones_rebote);
	const totalTurnovers = n(playerTotals.acciones_perdida_poco) + n(playerTotals.pase_boya_fallado);
	const totalFouls = playerDerived.totalFouls;

	const exclusions =
		n(playerTotals.faltas_exp_20_1c1) +
		n(playerTotals.faltas_exp_20_boya) +
		n(playerTotals.faltas_exp_3_bruta) +
		n(playerTotals.faltas_exp_3_int) +
		n(playerTotals.faltas_exp_simple);

	const goalsSuperiority = playerDerived.superiorityGoals;
	const shotsSuperiority = playerDerived.superiorityAttempts;

	const savesInferiority = goalkeeperDerived.inferioritySaves;
	const goalsAgainstInferiority = goalkeeperDerived.inferiorityGoals;

	const totalSaves = goalkeeperDerived.saves;

	// Goles recibidos calculados desde los resultados de los partidos
	const totalGoalsAgainst = (matches ?? []).reduce((sum, match) => {
		return sum + n(match.away_score);
	}, 0);

	const shootingEfficiency = totalShots > 0 ? ((totalGoalsFor / totalShots) * 100).toFixed(1) : "0.0";
	const superiorityEfficiency = shotsSuperiority > 0 ? ((goalsSuperiority / shotsSuperiority) * 100).toFixed(1) : "0.0";
	const inferiorityEfficiency = goalkeeperDerived.inferiorityAttempts > 0 ? goalkeeperDerived.inferiorityEfficiency.toFixed(1) : "0.0";
	const goalkeeperEfficiency = goalkeeperDerived.shotsReceived > 0 ? goalkeeperDerived.savePct.toFixed(1) : "0.0";

	const avgGoalsFor = (totalGoalsFor / totalMatches).toFixed(1);
	const avgGoalsAgainst = (totalGoalsAgainst / totalMatches).toFixed(1);
	const avgShots = (totalShots / totalMatches).toFixed(1);
	const avgAssists = (totalAssists / totalMatches).toFixed(1);
	const avgBlocks = (totalBlocks / totalMatches).toFixed(1);
	const avgFouls = (totalFouls / totalMatches).toFixed(1);

	const avgRecoveries = (totalRecoveries / totalMatches).toFixed(1);
	const avgTurnovers = (totalTurnovers / totalMatches).toFixed(1);
	const avgSaves = (totalSaves / totalMatches).toFixed(1);
	const avgExclusions = (exclusions / totalMatches).toFixed(1);
	const avgGoalsSuperiority = (goalsSuperiority / totalMatches).toFixed(1);
	const avgShotsSuperiority = (shotsSuperiority / totalMatches).toFixed(1);

	const goalDifference = totalGoalsFor - totalGoalsAgainst;

	return {
		totalMatches,

		shootingEfficiency,
		superiorityEfficiency,
		inferiorityEfficiency,
		goalkeeperEfficiency,

		avgGoalsFor,
		avgGoalsAgainst,
		avgShots,
		avgAssists,
		avgBlocks,
		avgFouls,

		avgRecoveries,
		avgTurnovers,
		avgSaves,
		avgExclusions,
		avgGoalsSuperiority,
		avgShotsSuperiority,

		goalDifference,

		totalGoalsFor,
		totalGoalsAgainst,
		totalShots,
		totalAssists,
		totalBlocks,
		totalRecoveries,
		totalTurnovers,
		totalFouls,
		exclusions,
		totalSaves,

		goalsSuperiority,
		shotsSuperiority,

		savesInferiority,
		goalsAgainstInferiority
	};
}