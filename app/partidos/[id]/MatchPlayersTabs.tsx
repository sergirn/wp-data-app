"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PlayerStatsCard } from "@/components/match-components/PlayerStatsAccordion";
import { GoalkeeperStatsCard } from "@/components/match-components/GoalkeeperStatsCard";
import { MatchChartsGrid } from "@/components/match-components/match-charts-main";


type PlayerLite = {
  id: number;
  name?: string | null;
  full_name?: string | null;
  number?: number | null;
  photo_url?: string | null;
};

type Props = {
  fieldPlayersStats: any[];
  goalkeepersStats: any[];

  // props para los gráficos
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

export function MatchPlayersTabs({
  fieldPlayersStats,
  goalkeepersStats,

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
  players,
}: Props) {
  const hasGoalkeepers = (goalkeepersStats?.length ?? 0) > 0;

  return (
    <div className="mb-6">
      <div className="space-y-3">

        <Tabs defaultValue="players" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="players">Jugadores</TabsTrigger>
            <TabsTrigger value="charts">Estadistica</TabsTrigger>
          </TabsList>

          <div className="pt-4">
            {/* TAB: Jugadores */}
            <TabsContent value="players" className="m-0 space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Jugadores de Campo</p>

                <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
                  {fieldPlayersStats?.map((stat: any) => (
                    <PlayerStatsCard key={stat.id} stat={stat} player={stat.players} />
                  ))}
                </div>
              </div>

              {hasGoalkeepers ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-muted-foreground">Porteros</p>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
                    {goalkeepersStats.map((stat: any) => (
                      <GoalkeeperStatsCard key={stat.id} stat={stat} player={stat.players} />
                    ))}
                  </div>
                </div>
              ) : null}
            </TabsContent>

            {/* TAB: Gráficos (antes vacío) */}
            <TabsContent value="charts" className="m-0">
              <MatchChartsGrid
                matchId={matchId}
                clubName={clubName}
                opponentName={opponentName}
                matchDateLabel={matchDateLabel}
                match={match}
                matchStats={matchStats}
                superioridadStats={superioridadStats}
                inferioridadStats={inferioridadStats}
                blocksStats={blocksStats}
                allGoalkeeperShots={allGoalkeeperShots}
                goalkeeperId={goalkeeperId}
                players={players}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
