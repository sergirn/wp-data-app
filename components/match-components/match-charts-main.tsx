"use client";

import React, { useMemo } from "react";

import { MatchSuperiorityChart } from "@/components/match-components/match-superiority-chart";
import { MatchInferiorityChart } from "@/components/match-components/match-inferiority-chart";
import { MatchBlocksChart } from "@/components/match-blocks-chart";
import { MatchPossessionChart } from "@/components/match-components/perd_rec_pos-chart_team";
import { MatchGoalkeepersPieChart } from "@/components/match-components/GoalkeeperMatch-chart";

import { ShotMistakesDonutChartMatch } from "@/components/match-components/ShotMistakesDonutChartMatch";
import { GoalkeeperShotsGoalChartSimple } from "../analytics-goalkeeper/evolution-component/GoalkeepersShotsEvolutions";

type PlayerLite = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
};

type Props = {
	matchId: number;
	clubName: string;
	opponentName: string;
	matchDateLabel: string;

	match: any;
	matchStats: any[];

	superioridadStats: any;
	inferioridadStats: any;
	blocksStats: any;

	allGoalkeeperShots: any[];
	goalkeeperId: number | null;

	players: PlayerLite[];
};

export function MatchChartsGrid({
	matchId,
	clubName,
	opponentName,
	matchDateLabel,
	match,
	matchStats,
	superioridadStats,
	inferioridadStats,
	blocksStats,
	allGoalkeeperShots,
	goalkeeperId,
	players
}: Props) {
	const canShowGoalkeeperShots = useMemo(() => Boolean(goalkeeperId) && (allGoalkeeperShots?.length ?? 0) > 0, [goalkeeperId, allGoalkeeperShots]);

	return (
		<div className="space-y-3">
			<div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				<MatchSuperiorityChart stats={superioridadStats} />
				<MatchInferiorityChart stats={inferioridadStats} />
				<MatchBlocksChart stats={blocksStats} matchStats={matchStats} clubName={clubName} />

				<MatchPossessionChart stats={matchStats} rival={opponentName} matchDateLabel={matchDateLabel} size="sm" />

				<ShotMistakesDonutChartMatch match={match} stats={matchStats} players={players} />
				<MatchGoalkeepersPieChart stats={matchStats} match={match} />

				<div className="sm:col-span-2 lg:col-span-3">
					{canShowGoalkeeperShots ? (
						<GoalkeeperShotsGoalChartSimple shots={allGoalkeeperShots} goalkeeperPlayerId={goalkeeperId!} matchId={matchId} />
					) : (
						<div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
							No hay datos suficientes para mostrar el mapa/evolución de tiros del portero.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
