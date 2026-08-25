import type { MatchStats, Player } from "@/lib/types";

export const FIELD_GOAL_ACTIONS = new Set<keyof MatchStats>([
	"goles_boya_jugada",
	"goles_hombre_mas",
	"goles_lanzamiento",
	"goles_dir_mas_5m",
	"goles_contraataque",
	"goles_penalti_anotado",
	"gol_del_palo_sup"
]);

export const GOALKEEPER_CONCEDED_ACTIONS = new Set<keyof MatchStats>([
	"portero_goles_boya_parada",
	"portero_goles_hombre_menos",
	"portero_goles_dir_mas_5m",
	"portero_goles_contraataque",
	"portero_goles_penalti",
	"portero_goles_lanzamiento",
	"portero_gol_palo"
]);

export const GOALKEEPER_SCORED_ACTIONS = new Set<keyof MatchStats>([
	"portero_gol",
	"portero_gol_superioridad"
]);

function counter(value: unknown) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Scores are based on source counters, never on visibility or derived totals. */
export function calculateMatchScore(
	playerStats: Record<number, Partial<MatchStats>>,
	playersById: ReadonlyMap<number, Pick<Player, "is_goalkeeper">>
) {
	let ownGoals = 0;
	let opponentGoals = 0;

	for (const [playerId, stats] of Object.entries(playerStats)) {
		const player = playersById.get(Number(playerId));
		if (!player) continue;

		if (player.is_goalkeeper) {
			for (const key of GOALKEEPER_SCORED_ACTIONS) ownGoals += counter(stats[key]);
			for (const key of GOALKEEPER_CONCEDED_ACTIONS) opponentGoals += counter(stats[key]);
		} else {
			for (const key of FIELD_GOAL_ACTIONS) ownGoals += counter(stats[key]);
		}
	}

	return { ownGoals, opponentGoals };
}
