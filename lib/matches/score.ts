export type StoredMatchScore = {
	home_score: number | null | undefined;
	away_score: number | null | undefined;
	is_home?: boolean | null;
	penalty_home_score?: number | null;
	penalty_away_score?: number | null;
};

function scoreNumber(value: number | null | undefined) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Database convention used by this application:
 * - home_score / penalty_home_score: our club's score.
 * - away_score / penalty_away_score: the opponent's score.
 * - is_home: venue only; it never changes the stored score semantics.
 */
export function getOwnScore(match: StoredMatchScore) {
	return scoreNumber(match.home_score);
}

export function getOpponentScore(match: StoredMatchScore) {
	return scoreNumber(match.away_score);
}

export function getOwnPenaltyScore(match: StoredMatchScore) {
	return match.penalty_home_score == null ? null : scoreNumber(match.penalty_home_score);
}

export function getOpponentPenaltyScore(match: StoredMatchScore) {
	return match.penalty_away_score == null ? null : scoreNumber(match.penalty_away_score);
}

export function getVenueScore(match: StoredMatchScore) {
	const own = getOwnScore(match);
	const opponent = getOpponentScore(match);
	const ownPenalties = getOwnPenaltyScore(match);
	const opponentPenalties = getOpponentPenaltyScore(match);
	const isClubHome = match.is_home !== false;

	return {
		local: isClubHome ? own : opponent,
		visitor: isClubHome ? opponent : own,
		localPenalties: isClubHome ? ownPenalties : opponentPenalties,
		visitorPenalties: isClubHome ? opponentPenalties : ownPenalties
	};
}

export function getMatchOutcome(match: StoredMatchScore): "win" | "loss" | "draw" {
	const own = getOwnScore(match);
	const opponent = getOpponentScore(match);
	const ownPenalties = getOwnPenaltyScore(match);
	const opponentPenalties = getOpponentPenaltyScore(match);

	if (own === opponent && ownPenalties != null && opponentPenalties != null && ownPenalties !== opponentPenalties) {
		return ownPenalties > opponentPenalties ? "win" : "loss";
	}
	if (own > opponent) return "win";
	if (own < opponent) return "loss";
	return "draw";
}
