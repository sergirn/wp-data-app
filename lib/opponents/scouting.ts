import { getMatchOutcome, getOpponentScore, getOwnScore } from "@/lib/matches/score";
import { GOALKEEPER_STATS } from "@/lib/stats/goalkeeperStatsConfig";
import { PLAYER_STATS } from "@/lib/stats/playerStatsConfig";

export type ScoutingMatch = {
	id: number;
	match_date: string;
	opponent: string;
	season?: string | null;
	home_score: number | null;
	away_score: number | null;
	is_home?: boolean | null;
	jornada?: number | null;
	location?: string | null;
	competition_id?: number | null;
	competitions?: { id: number; name: string; slug?: string | null; image_url?: string | null } | null;
	stats_enabled?: boolean | null;
	penalty_home_score?: number | null;
	penalty_away_score?: number | null;
	q1_score?: number | null;
	q1_score_rival?: number | null;
	q2_score?: number | null;
	q2_score_rival?: number | null;
	q3_score?: number | null;
	q3_score_rival?: number | null;
	q4_score?: number | null;
	q4_score_rival?: number | null;
};

export type ScoutingStat = Record<string, unknown> & {
	match_id: number;
	player_id: number;
	players?: { id: number; name: string; number: number; is_goalkeeper: boolean; photo_url?: string | null } | null;
};

export type ScoutingAction = {
	match_id: number;
	player_id: number;
	quarter: 1 | 2 | 3 | 4;
	sequence: number;
	action_key: string;
};

const playerGoalKeys = PLAYER_STATS.filter((definition) => definition.countsAsGoal).map((definition) => definition.key);
const goalkeeperScoredKeys = GOALKEEPER_STATS.filter((definition) => definition.category === "ataque" && definition.key.includes("gol") && !definition.key.includes("fallo")).map((definition) => definition.key);
const goalkeeperConcededKeys = GOALKEEPER_STATS.filter((definition) => definition.countsAsGoalConceded).map((definition) => definition.key);
const goalkeeperSaveKeys = GOALKEEPER_STATS.filter((definition) => definition.countsAsSave).map((definition) => definition.key);

const numberValue = (value: unknown) => {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : 0;
};

const sum = (rows: ScoutingStat[], keys: string[]) => rows.reduce(
	(total, row) => total + keys.reduce((subtotal, key) => subtotal + numberValue(row[key]), 0),
	0
);

const percentage = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;
const perMatch = (value: number, matches: number) => matches > 0 ? value / matches : 0;

function venueSummary(matches: ScoutingMatch[]) {
	const outcomes = matches.map(getMatchOutcome);
	const ownGoals = matches.reduce((total, match) => total + getOwnScore(match), 0);
	const opponentGoals = matches.reduce((total, match) => total + getOpponentScore(match), 0);
	return {
		played: matches.length,
		wins: outcomes.filter((outcome) => outcome === "win").length,
		draws: outcomes.filter((outcome) => outcome === "draw").length,
		losses: outcomes.filter((outcome) => outcome === "loss").length,
		averageOwnGoals: perMatch(ownGoals, matches.length),
		averageOpponentGoals: perMatch(opponentGoals, matches.length),
		averageDifference: perMatch(ownGoals - opponentGoals, matches.length)
	};
}

function actionKind(actionKey: string) {
	const key = actionKey.toLowerCase();
	if ((key.startsWith("goles_") || key === "portero_gol" || key === "portero_gol_superioridad") && !key.includes("fallo")) return "goals" as const;
	if (key.startsWith("tiros_") || key.startsWith("tiro_") || key.includes("fallo") || key.includes("_fuera") || key.includes("_palo") || key.includes("bloqueado")) return "misses" as const;
	if (key.includes("recuperacion")) return "recoveries" as const;
	if (key.includes("perdida")) return "turnovers" as const;
	if (key.includes("asistencia")) return "assists" as const;
	return "other" as const;
}

export function buildOpponentScouting(matches: ScoutingMatch[], stats: ScoutingStat[], actions: ScoutingAction[] = []) {
	const orderedMatches = [...matches].sort((a, b) => b.match_date.localeCompare(a.match_date));
	const visibleIds = new Set(orderedMatches.map((match) => match.id));
	const enabledIds = new Set(orderedMatches.filter((match) => match.stats_enabled !== false).map((match) => match.id));
	const enabledStats = stats.filter((stat) => enabledIds.has(stat.match_id));
	const visibleActions = actions.filter((action) => visibleIds.has(action.match_id));
	const fieldStats = enabledStats.filter((stat) => !stat.players?.is_goalkeeper);
	const goalkeeperStats = enabledStats.filter((stat) => stat.players?.is_goalkeeper);
	const statMatchIds = new Set(enabledStats.map((stat) => stat.match_id));
	const actionMatchIds = new Set(visibleActions.map((action) => action.match_id));
	const metricMatchCount = statMatchIds.size;
	const outcomes = orderedMatches.map(getMatchOutcome);
	const ownGoals = orderedMatches.reduce((total, match) => total + getOwnScore(match), 0);
	const opponentGoals = orderedMatches.reduce((total, match) => total + getOpponentScore(match), 0);
	const played = orderedMatches.length;

	const verifiedMatchIds = new Set<number>();
	for (const match of orderedMatches) {
		if (!statMatchIds.has(match.id)) continue;
		const matchStats = enabledStats.filter((stat) => stat.match_id === match.id);
		const matchFieldStats = matchStats.filter((stat) => !stat.players?.is_goalkeeper);
		const matchGoalkeeperStats = matchStats.filter((stat) => stat.players?.is_goalkeeper);
		const calculatedOwnGoals = sum(matchFieldStats, ["goles_totales"]) + sum(matchGoalkeeperStats, goalkeeperScoredKeys);
		const calculatedOpponentGoals = sum(matchGoalkeeperStats, goalkeeperConcededKeys);
		const ownMatches = calculatedOwnGoals === getOwnScore(match);
		const opponentMatches = getOpponentScore(match) === 0 ? calculatedOpponentGoals === 0 : matchGoalkeeperStats.length > 0 && calculatedOpponentGoals === getOpponentScore(match);
		if (ownMatches && opponentMatches) verifiedMatchIds.add(match.id);
	}

	const quarters = ([1, 2, 3, 4] as const).map((quarter) => {
		const ownKey = `q${quarter}_score` as keyof ScoutingMatch;
		const opponentKey = `q${quarter}_score_rival` as keyof ScoutingMatch;
		const completeQuarters = orderedMatches.filter((match) => match[ownKey] != null && match[opponentKey] != null);
		const sampleSize = completeQuarters.length;
		const ownTotal = completeQuarters.reduce((total, match) => total + numberValue(match[ownKey]), 0);
		const opponentTotal = completeQuarters.reduce((total, match) => total + numberValue(match[opponentKey]), 0);
		const won = completeQuarters.filter((match) => numberValue(match[ownKey]) > numberValue(match[opponentKey])).length;
		return {
			quarter,
			own: perMatch(ownTotal, sampleSize),
			opponent: perMatch(opponentTotal, sampleSize),
			difference: perMatch(ownTotal - opponentTotal, sampleSize),
			sampleSize,
			winPercentage: percentage(won, sampleSize)
		};
	});

	const attackingGoals = sum(fieldStats, ["goles_totales"]) + sum(goalkeeperStats, goalkeeperScoredKeys);
	const shots = sum(fieldStats, ["tiros_totales"]);
	const powerPlayGoals = sum(fieldStats, ["goles_hombre_mas"]) + sum(goalkeeperStats, ["portero_gol_superioridad"]);
	const powerPlayMisses = sum(fieldStats, ["tiros_hombre_mas"]) + sum(goalkeeperStats, ["portero_fallo_superioridad"]);
	const assists = sum(fieldStats, ["acciones_asistencias"]) + sum(goalkeeperStats, ["portero_acciones_asistencias"]);
	const recoveries = sum(fieldStats, ["acciones_recuperacion"]) + sum(goalkeeperStats, ["portero_acciones_recuperacion"]);
	const turnovers = sum(fieldStats, ["acciones_perdida_poco"]) + sum(goalkeeperStats, ["portero_acciones_perdida_pos"]);
	const blocks = sum(fieldStats, ["acciones_bloqueo"]);
	const goalkeeperSaves = sum(goalkeeperStats, goalkeeperSaveKeys);
	const calculatedOpponentGoals = sum(goalkeeperStats, goalkeeperConcededKeys);
	const shotsFaced = goalkeeperSaves + calculatedOpponentGoals;
	const opponentPowerPlayGoals = sum(goalkeeperStats, ["portero_goles_hombre_menos"]);
	const opponentPowerPlaySaves = sum(goalkeeperStats, ["portero_paradas_hombre_menos", "portero_parada_fuera_inf", "portero_lanz_palo_inf"]);

	const playerMap = new Map<number, { id: number; name: string; number: number; photoUrl: string | null; goals: number; shots: number; assists: number; recoveries: number; turnovers: number; blocks: number; exclusionsDrawn: number; matches: Set<number> }>();
	for (const stat of fieldStats) {
		if (!stat.players) continue;
		const current = playerMap.get(stat.player_id) ?? { id: stat.player_id, name: stat.players.name, number: stat.players.number, photoUrl: stat.players.photo_url ?? null, goals: 0, shots: 0, assists: 0, recoveries: 0, turnovers: 0, blocks: 0, exclusionsDrawn: 0, matches: new Set<number>() };
		current.goals += numberValue(stat.goles_totales);
		current.shots += numberValue(stat.tiros_totales);
		current.assists += numberValue(stat.acciones_asistencias);
		current.recoveries += numberValue(stat.acciones_recuperacion);
		current.turnovers += numberValue(stat.acciones_perdida_poco);
		current.blocks += numberValue(stat.acciones_bloqueo);
		current.exclusionsDrawn += numberValue(stat.acciones_exp_provocada) + numberValue(stat.acciones_penalti_provocado);
		current.matches.add(stat.match_id);
		playerMap.set(stat.player_id, current);
	}

	const goalkeeperMap = new Map<number, { id: number; name: string; number: number; saves: number; goalsAgainst: number; matches: Set<number> }>();
	for (const stat of goalkeeperStats) {
		if (!stat.players) continue;
		const current = goalkeeperMap.get(stat.player_id) ?? { id: stat.player_id, name: stat.players.name, number: stat.players.number, saves: 0, goalsAgainst: 0, matches: new Set<number>() };
		current.saves += sum([stat], goalkeeperSaveKeys);
		current.goalsAgainst += sum([stat], goalkeeperConcededKeys);
		current.matches.add(stat.match_id);
		goalkeeperMap.set(stat.player_id, current);
	}

	const actionQuarters = ([1, 2, 3, 4] as const).map((quarter) => {
		const quarterActions = visibleActions.filter((action) => action.quarter === quarter);
		const counts = { goals: 0, misses: 0, recoveries: 0, turnovers: 0, assists: 0, other: 0 };
		for (const action of quarterActions) counts[actionKind(action.action_key)] += 1;
		return { quarter, total: quarterActions.length, ...counts };
	});

	const goalBreakdown = playerGoalKeys.map((key) => ({ key, value: sum(fieldStats, [key]) })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
	const opponentGoalBreakdown = goalkeeperConcededKeys.map((key) => ({ key, value: sum(goalkeeperStats, [key]) })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
	const homeMatches = orderedMatches.filter((match) => match.is_home !== false);
	const awayMatches = orderedMatches.filter((match) => match.is_home === false);

	return {
		played,
		wins: outcomes.filter((outcome) => outcome === "win").length,
		draws: outcomes.filter((outcome) => outcome === "draw").length,
		losses: outcomes.filter((outcome) => outcome === "loss").length,
		ownGoals,
		opponentGoals,
		averageOwnGoals: perMatch(ownGoals, played),
		averageOpponentGoals: perMatch(opponentGoals, played),
		goalDifference: ownGoals - opponentGoals,
		averageGoalDifference: perMatch(ownGoals - opponentGoals, played),
		quarters,
		recentForm: outcomes.slice(0, 5),
		venue: { home: venueSummary(homeMatches), away: venueSummary(awayMatches) },
		trend: orderedMatches.map((match) => ({ id: match.id, date: match.match_date, own: getOwnScore(match), opponent: getOpponentScore(match), difference: getOwnScore(match) - getOpponentScore(match), outcome: getMatchOutcome(match), isHome: match.is_home !== false })).reverse(),
		attack: {
			goals: attackingGoals,
			goalsPerMatch: perMatch(attackingGoals, metricMatchCount),
			shots,
			shotsPerMatch: perMatch(shots, metricMatchCount),
			efficiency: percentage(attackingGoals, shots),
			powerPlayGoals,
			powerPlayAttempts: powerPlayGoals + powerPlayMisses,
			powerPlayEfficiency: percentage(powerPlayGoals, powerPlayGoals + powerPlayMisses),
			assists,
			assistsPerMatch: perMatch(assists, metricMatchCount),
			goalBreakdown
		},
		defense: {
			recoveries,
			recoveriesPerMatch: perMatch(recoveries, metricMatchCount),
			turnovers,
			turnoversPerMatch: perMatch(turnovers, metricMatchCount),
			possessionBalance: recoveries - turnovers,
			possessionBalancePerMatch: perMatch(recoveries - turnovers, metricMatchCount),
			blocks,
			blocksPerMatch: perMatch(blocks, metricMatchCount)
		},
		opponentAttack: {
			goals: calculatedOpponentGoals,
			goalsPerMatch: perMatch(calculatedOpponentGoals, metricMatchCount),
			powerPlayGoals: opponentPowerPlayGoals,
			powerPlayDefended: opponentPowerPlayGoals + opponentPowerPlaySaves,
			manDownSavePercentage: percentage(opponentPowerPlaySaves, opponentPowerPlayGoals + opponentPowerPlaySaves),
			goalkeeperSaves,
			shotsFaced,
			savePercentage: percentage(goalkeeperSaves, shotsFaced),
			goalBreakdown: opponentGoalBreakdown
		},
		players: [...playerMap.values()].map((player) => ({
			...player,
			matches: player.matches.size,
			goalsPerMatch: perMatch(player.goals, player.matches.size),
			assistsPerMatch: perMatch(player.assists, player.matches.size),
			recoveriesPerMatch: perMatch(player.recoveries, player.matches.size),
			turnoversPerMatch: perMatch(player.turnovers, player.matches.size),
			shootingEfficiency: percentage(player.goals, player.shots)
		})).sort((a, b) => b.goalsPerMatch - a.goalsPerMatch || b.shootingEfficiency - a.shootingEfficiency || b.assists - a.assists),
		goalkeepers: [...goalkeeperMap.values()].map((goalkeeper) => ({
			...goalkeeper,
			matches: goalkeeper.matches.size,
			savesPerMatch: perMatch(goalkeeper.saves, goalkeeper.matches.size),
			goalsAgainstPerMatch: perMatch(goalkeeper.goalsAgainst, goalkeeper.matches.size),
			savePercentage: percentage(goalkeeper.saves, goalkeeper.saves + goalkeeper.goalsAgainst)
		})).sort((a, b) => b.savePercentage - a.savePercentage || b.saves - a.saves),
		actionQuarters,
		matches: orderedMatches,
		dataQuality: {
			detailedMatches: metricMatchCount,
			verifiedMatches: verifiedMatchIds.size,
			verifiedMatchIds: [...verifiedMatchIds],
			actionMatches: actionMatchIds.size,
			statsCoverage: percentage(metricMatchCount, played),
			verifiedCoverage: percentage(verifiedMatchIds.size, played),
			actionCoverage: percentage(actionMatchIds.size, played)
		},
		confidence: verifiedMatchIds.size >= 4 && played >= 6 ? "high" as const : verifiedMatchIds.size >= 1 && played >= 3 ? "medium" as const : "low" as const
	};
}
