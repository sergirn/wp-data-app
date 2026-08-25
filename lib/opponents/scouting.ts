import { getMatchOutcome, getOpponentScore, getOwnScore } from "@/lib/matches/score";

export type ScoutingMatch = {
	id: number;
	match_date: string;
	opponent: string;
	season?: string | null;
	home_score: number | null;
	away_score: number | null;
	is_home?: boolean | null;
	jornada?: number | null;
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
	players?: { id: number; name: string; number: number; is_goalkeeper: boolean } | null;
};

const numberValue = (value: unknown) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
};

const sum = (rows: ScoutingStat[], keys: string[]) => rows.reduce(
	(total, row) => total + keys.reduce((subtotal, key) => subtotal + numberValue(row[key]), 0),
	0
);

export function buildOpponentScouting(matches: ScoutingMatch[], stats: ScoutingStat[]) {
	const orderedMatches = [...matches].sort((a, b) => b.match_date.localeCompare(a.match_date));
	const enabledIds = new Set(orderedMatches.filter((match) => match.stats_enabled !== false).map((match) => match.id));
	const enabledStats = stats.filter((stat) => enabledIds.has(stat.match_id));
	const fieldStats = enabledStats.filter((stat) => !stat.players?.is_goalkeeper);
	const goalkeeperStats = enabledStats.filter((stat) => stat.players?.is_goalkeeper);
	const outcomes = orderedMatches.map(getMatchOutcome);
	const ownGoals = orderedMatches.reduce((total, match) => total + getOwnScore(match), 0);
	const opponentGoals = orderedMatches.reduce((total, match) => total + getOpponentScore(match), 0);
	const played = orderedMatches.length;
	const quarterKeys = [1, 2, 3, 4] as const;

	const quarters = quarterKeys.map((quarter) => {
		const ownKey = `q${quarter}_score` as keyof ScoutingMatch;
		const opponentKey = `q${quarter}_score_rival` as keyof ScoutingMatch;
		const own = orderedMatches.reduce((total, match) => total + numberValue(match[ownKey]), 0);
		const opponent = orderedMatches.reduce((total, match) => total + numberValue(match[opponentKey]), 0);
		return { quarter, own, opponent, difference: own - opponent };
	});

	const shots = sum(fieldStats, ["tiros_totales"]);
	const attackingGoals = sum(fieldStats, ["goles_totales"]);
	const powerPlayGoals = sum(fieldStats, ["goles_hombre_mas"]);
	const powerPlayMisses = sum(fieldStats, ["tiros_hombre_mas"]);
	// This is the goalkeeper's man-down category. `portero_gol_superioridad`
	// belongs to the goalkeeper's own attacking actions in the current UI.
	const opponentPowerPlayGoals = sum(goalkeeperStats, ["portero_goles_hombre_menos"]);
	const goalkeeperSaves = sum(goalkeeperStats, ["portero_paradas_totales"]);

	const playerMap = new Map<number, { id: number; name: string; number: number; goals: number; assists: number; matches: Set<number> }>();
	for (const stat of fieldStats) {
		if (!stat.players) continue;
		const current = playerMap.get(stat.player_id) ?? {
			id: stat.player_id,
			name: stat.players.name,
			number: stat.players.number,
			goals: 0,
			assists: 0,
			matches: new Set<number>()
		};
		current.goals += numberValue(stat.goles_totales);
		current.assists += numberValue(stat.acciones_asistencias);
		current.matches.add(stat.match_id);
		playerMap.set(stat.player_id, current);
	}

	return {
		played,
		wins: outcomes.filter((outcome) => outcome === "win").length,
		draws: outcomes.filter((outcome) => outcome === "draw").length,
		losses: outcomes.filter((outcome) => outcome === "loss").length,
		ownGoals,
		opponentGoals,
		averageOwnGoals: played ? ownGoals / played : 0,
		averageOpponentGoals: played ? opponentGoals / played : 0,
		goalDifference: ownGoals - opponentGoals,
		quarters,
		recentForm: outcomes.slice(0, 5),
		attack: {
			goals: attackingGoals,
			shots,
			efficiency: shots > 0 ? Math.round((attackingGoals / shots) * 100) : 0,
			powerPlayGoals,
			powerPlayAttempts: powerPlayGoals + powerPlayMisses,
			assists: sum(fieldStats, ["acciones_asistencias"]),
			recoveries: sum(fieldStats, ["acciones_recuperacion"])
		},
		opponentAttack: {
			goals: opponentGoals,
			powerPlayGoals: opponentPowerPlayGoals,
			goalkeeperSaves
		},
		players: [...playerMap.values()]
			.map((player) => ({ ...player, matches: player.matches.size }))
			.sort((a, b) => b.goals - a.goals || b.assists - a.assists),
		matches: orderedMatches,
		confidence: played >= 6 ? "high" as const : played >= 3 ? "medium" as const : "low" as const
	};
}
