import { GOALKEEPER_STATS } from "@/lib/stats/goalkeeperStatsConfig";
import { FIELD_GOAL_ACTIONS, GOALKEEPER_SCORED_ACTIONS } from "@/lib/matches/calculate-match-score";
import { getOpponentScore, getOwnScore } from "@/lib/matches/score";

export type AnalysisThresholds = {
	shootingEfficiencyTarget: number;
	powerPlayTarget: number;
	turnoverWarning: number;
	savePercentageTarget: number;
	maxGoalsAgainst: number;
};

export const DEFAULT_ANALYSIS_THRESHOLDS: AnalysisThresholds = {
	shootingEfficiencyTarget: 40,
	powerPlayTarget: 45,
	turnoverWarning: 10,
	savePercentageTarget: 50,
	maxGoalsAgainst: 10
};

type MatchLike = {
	id?: number;
	match_date?: string | null;
	home_score?: number | null;
	away_score?: number | null;
	q1_score?: number | null;
	q2_score?: number | null;
	q3_score?: number | null;
	q4_score?: number | null;
	q1_score_rival?: number | null;
	q2_score_rival?: number | null;
	q3_score_rival?: number | null;
	q4_score_rival?: number | null;
};

type StatLike = Record<string, unknown> & {
	match_id?: number;
	players?: { is_goalkeeper?: boolean | null } | Array<{ is_goalkeeper?: boolean | null }> | null;
};

export type PerformanceSnapshot = {
	matchCount: number;
	goals: number;
	calculatedGoals: number;
	goalsAgainst: number;
	calculatedGoalsAgainst: number;
	shots: number;
	shootingEfficiency: number;
	powerPlayGoals: number;
	powerPlayAttempts: number;
	powerPlayEfficiency: number;
	recoveries: number;
	turnovers: number;
	possessionBalance: number;
	blocks: number;
	saves: number;
	shotsFaced: number;
	savePercentage: number;
};

export type MatchReviewIssue = {
	code:
		| "missing_stats"
		| "own_score_mismatch"
		| "opponent_score_mismatch"
		| "own_quarters_mismatch"
		| "opponent_quarters_mismatch"
		| "missing_goalkeeper"
		| "empty_chronology";
	severity: "error" | "warning" | "info";
	expected?: number;
	actual?: number;
};

export type PerformanceInsight = {
	code:
		| "shooting_above_target"
		| "shooting_below_target"
		| "power_play_above_target"
		| "power_play_below_target"
		| "turnovers_high"
		| "possession_positive"
		| "save_above_target"
		| "save_below_target"
		| "goals_against_high"
		| "best_quarter"
		| "worst_quarter"
		| "recent_improvement"
		| "recent_decline";
	tone: "positive" | "warning" | "negative" | "neutral";
	value?: number;
	target?: number;
	delta?: number;
	quarter?: number;
};

const numberValue = (value: unknown) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const percentage = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

const playerRelation = (stat: StatLike) => {
	if (Array.isArray(stat.players)) return stat.players[0] ?? null;
	return stat.players ?? null;
};

const sum = (stats: StatLike[], keys: string[]) =>
	stats.reduce((total, stat) => total + keys.reduce((subtotal, key) => subtotal + numberValue(stat[key]), 0), 0);

const goalkeeperSaveKeys = GOALKEEPER_STATS.filter((definition) => definition.countsAsSave).map((definition) => definition.key);
const goalkeeperConcededKeys = GOALKEEPER_STATS.filter((definition) => definition.countsAsGoalConceded).map((definition) => definition.key);

export function calculatePerformanceSnapshot(matches: MatchLike[], stats: StatLike[]): PerformanceSnapshot {
	const matchIds = new Set(matches.map((match) => match.id).filter((id): id is number => typeof id === "number"));
	const scopedStats = matchIds.size > 0 ? stats.filter((stat) => stat.match_id != null && matchIds.has(stat.match_id)) : stats;
	const fieldStats = scopedStats.filter((stat) => !playerRelation(stat)?.is_goalkeeper);
	const goalkeeperStats = scopedStats.filter((stat) => playerRelation(stat)?.is_goalkeeper);

	const fieldGoalKeys = [...FIELD_GOAL_ACTIONS] as string[];
	const goalkeeperScoredKeys = [...GOALKEEPER_SCORED_ACTIONS] as string[];
	const calculatedGoals = sum(fieldStats, fieldGoalKeys) + sum(goalkeeperStats, goalkeeperScoredKeys);
	const calculatedGoalsAgainst = sum(goalkeeperStats, goalkeeperConcededKeys);
	const goals = matches.reduce((total, match) => total + getOwnScore({ home_score: match.home_score, away_score: match.away_score }), 0);
	const goalsAgainst = matches.reduce((total, match) => total + getOpponentScore({ home_score: match.home_score, away_score: match.away_score }), 0);
	const shots = sum(fieldStats, ["tiros_totales"]);
	const powerPlayGoals = sum(fieldStats, ["goles_hombre_mas"]) + sum(goalkeeperStats, ["portero_gol_superioridad"]);
	const powerPlayMisses = sum(fieldStats, ["tiros_hombre_mas"]) + sum(goalkeeperStats, ["portero_fallo_superioridad"]);
	const recoveries = sum(fieldStats, ["acciones_recuperacion"]) + sum(goalkeeperStats, ["portero_acciones_recuperacion"]);
	const turnovers = sum(fieldStats, ["acciones_perdida_poco"]) + sum(goalkeeperStats, ["portero_acciones_perdida_pos"]);
	const saves = sum(goalkeeperStats, goalkeeperSaveKeys);

	return {
		matchCount: matches.length,
		goals,
		calculatedGoals,
		goalsAgainst,
		calculatedGoalsAgainst,
		shots,
		shootingEfficiency: percentage(calculatedGoals, shots),
		powerPlayGoals,
		powerPlayAttempts: powerPlayGoals + powerPlayMisses,
		powerPlayEfficiency: percentage(powerPlayGoals, powerPlayGoals + powerPlayMisses),
		recoveries,
		turnovers,
		possessionBalance: recoveries - turnovers,
		blocks: sum(fieldStats, ["acciones_bloqueo"]),
		saves,
		shotsFaced: saves + calculatedGoalsAgainst,
		savePercentage: percentage(saves, saves + calculatedGoalsAgainst)
	};
}

export function validateMatchData(match: MatchLike, stats: StatLike[], actionCount = 0): MatchReviewIssue[] {
	const snapshot = calculatePerformanceSnapshot([match], stats);
	const issues: MatchReviewIssue[] = [];
	const goalkeeperStats = stats.filter((stat) => playerRelation(stat)?.is_goalkeeper);
	const ownQuarterTotal = [match.q1_score, match.q2_score, match.q3_score, match.q4_score].reduce<number>((total, score) => total + numberValue(score), 0);
	const opponentQuarterTotal = [match.q1_score_rival, match.q2_score_rival, match.q3_score_rival, match.q4_score_rival].reduce<number>((total, score) => total + numberValue(score), 0);

	if (stats.length === 0) issues.push({ code: "missing_stats", severity: "error" });
	if (stats.length > 0 && snapshot.calculatedGoals !== snapshot.goals) {
		issues.push({ code: "own_score_mismatch", severity: "error", expected: snapshot.goals, actual: snapshot.calculatedGoals });
	}
	if (snapshot.goalsAgainst > 0 && goalkeeperStats.length === 0) issues.push({ code: "missing_goalkeeper", severity: "warning" });
	if (goalkeeperStats.length > 0 && snapshot.calculatedGoalsAgainst !== snapshot.goalsAgainst) {
		issues.push({ code: "opponent_score_mismatch", severity: "error", expected: snapshot.goalsAgainst, actual: snapshot.calculatedGoalsAgainst });
	}
	if (ownQuarterTotal !== snapshot.goals) {
		issues.push({ code: "own_quarters_mismatch", severity: "error", expected: snapshot.goals, actual: ownQuarterTotal });
	}
	if (opponentQuarterTotal !== snapshot.goalsAgainst) {
		issues.push({ code: "opponent_quarters_mismatch", severity: "error", expected: snapshot.goalsAgainst, actual: opponentQuarterTotal });
	}
	if (actionCount === 0) issues.push({ code: "empty_chronology", severity: "info" });
	return issues;
}

export function buildMatchInsights(
	match: MatchLike,
	stats: StatLike[],
	thresholds: AnalysisThresholds = DEFAULT_ANALYSIS_THRESHOLDS
): PerformanceInsight[] {
	const snapshot = calculatePerformanceSnapshot([match], stats);
	const insights: PerformanceInsight[] = [];
	if (snapshot.shots > 0) {
		insights.push({
			code: snapshot.shootingEfficiency >= thresholds.shootingEfficiencyTarget ? "shooting_above_target" : "shooting_below_target",
			tone: snapshot.shootingEfficiency >= thresholds.shootingEfficiencyTarget ? "positive" : "warning",
			value: snapshot.shootingEfficiency,
			target: thresholds.shootingEfficiencyTarget
		});
	}
	if (snapshot.powerPlayAttempts > 0) {
		insights.push({
			code: snapshot.powerPlayEfficiency >= thresholds.powerPlayTarget ? "power_play_above_target" : "power_play_below_target",
			tone: snapshot.powerPlayEfficiency >= thresholds.powerPlayTarget ? "positive" : "warning",
			value: snapshot.powerPlayEfficiency,
			target: thresholds.powerPlayTarget
		});
	}
	if (snapshot.turnovers > thresholds.turnoverWarning) {
		insights.push({ code: "turnovers_high", tone: "negative", value: snapshot.turnovers, target: thresholds.turnoverWarning });
	} else if (snapshot.possessionBalance > 0) {
		insights.push({ code: "possession_positive", tone: "positive", value: snapshot.possessionBalance });
	}
	if (snapshot.shotsFaced > 0) {
		insights.push({
			code: snapshot.savePercentage >= thresholds.savePercentageTarget ? "save_above_target" : "save_below_target",
			tone: snapshot.savePercentage >= thresholds.savePercentageTarget ? "positive" : "warning",
			value: snapshot.savePercentage,
			target: thresholds.savePercentageTarget
		});
	}
	if (snapshot.goalsAgainst > thresholds.maxGoalsAgainst) {
		insights.push({ code: "goals_against_high", tone: "negative", value: snapshot.goalsAgainst, target: thresholds.maxGoalsAgainst });
	}

	const quarters = [1, 2, 3, 4].map((quarter) => ({
		quarter,
		difference: numberValue(match[`q${quarter}_score` as keyof MatchLike]) - numberValue(match[`q${quarter}_score_rival` as keyof MatchLike])
	}));
	const best = [...quarters].sort((a, b) => b.difference - a.difference)[0];
	const worst = [...quarters].sort((a, b) => a.difference - b.difference)[0];
	if (best?.difference > 0) insights.push({ code: "best_quarter", tone: "positive", quarter: best.quarter, value: best.difference });
	if (worst?.difference < 0) insights.push({ code: "worst_quarter", tone: "negative", quarter: worst.quarter, value: worst.difference });
	return insights.slice(0, 6);
}

function averageSnapshot(matches: MatchLike[], stats: StatLike[]) {
	const snapshot = calculatePerformanceSnapshot(matches, stats);
	const divisor = Math.max(1, snapshot.matchCount);
	return {
		...snapshot,
		goals: snapshot.goals / divisor,
		goalsAgainst: snapshot.goalsAgainst / divisor,
		turnovers: snapshot.turnovers / divisor,
		recoveries: snapshot.recoveries / divisor
	};
}

export function buildRecentTrendInsights(matches: MatchLike[], stats: StatLike[]): PerformanceInsight[] {
	const ordered = [...matches].sort((a, b) => Date.parse(b.match_date ?? "") - Date.parse(a.match_date ?? ""));
	const recent = ordered.slice(0, 5);
	const previous = ordered.slice(5, 10);
	if (recent.length < 2 || previous.length < 2) return [];
	const current = averageSnapshot(recent, stats);
	const baseline = averageSnapshot(previous, stats);
	const indicators = [
		{ current: current.shootingEfficiency, previous: baseline.shootingEfficiency },
		{ current: current.powerPlayEfficiency, previous: baseline.powerPlayEfficiency },
		{ current: current.savePercentage, previous: baseline.savePercentage }
	];
	const averageDelta = Math.round(indicators.reduce((total, indicator) => total + indicator.current - indicator.previous, 0) / indicators.length);
	if (Math.abs(averageDelta) < 3) return [];
	return [{
		code: averageDelta > 0 ? "recent_improvement" : "recent_decline",
		tone: averageDelta > 0 ? "positive" : "warning",
		delta: averageDelta
	}];
}
