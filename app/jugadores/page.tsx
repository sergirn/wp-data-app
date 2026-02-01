"use client";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import type { Player } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Edit } from "lucide-react";
import { useClub } from "@/lib/club-context";
import { useEffect, useState, memo, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PlayerRadarChart } from "@/components/analytics-player/RadarChartPlayers";
import { GoalkeeperRadarChart } from "@/components/analytics-goalkeeper/GoalkeeperRadarChart";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditPlayersModal } from "@/components/players-components/EditPlayersModal";
import { useIsMobile } from "@/hooks/player-movile";

export default function PlayersPage() {
	const { currentClub } = useClub();
	const [players, setPlayers] = useState<any[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [matchStats, setMatchStats] = useState<any[]>([]);
	const [editOpen, setEditOpen] = useState(false);

	useEffect(() => {
		const abortController = new AbortController();
		let isMounted = true;

		async function fetchPlayers() {
			setLoading(true);
			setPlayers([]);
			setError(null);

			if (!currentClub) {
				setLoading(false);
				return;
			}

			try {
				const supabase = createClient();

				const [playersResult, statsResult, matchesResult] = await Promise.all([
					supabase.from("players").select("*").eq("club_id", currentClub.id).order("number"),
					supabase
						.from("match_stats")
						.select("*")
						.in("player_id", (await supabase.from("players").select("id").eq("club_id", currentClub.id)).data?.map((p) => p.id) || []),
					supabase.from("matches").select("*").eq("club_id", currentClub.id)
				]);

				if (abortController.signal.aborted || !isMounted) return;

				if (playersResult.error) throw playersResult.error;

				const playersWithStats = playersResult.data?.map((player) => {
					const playerStatsData = statsResult.data?.filter((s) => s.player_id === player.id) || [];

					if (player.is_goalkeeper) {
						const totalParadas = playerStatsData.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0);
						const totalAsistencias = playerStatsData.reduce((sum, s) => sum + (s.portero_acciones_asistencias || 0), 0);
						const matchesPlayed = playerStatsData.length;

						const totalRivalGoles = playerStatsData.reduce((sum, stat) => {
							const match = matchesResult.data?.find((m) => m.id === stat.match_id);
							if (!match) return sum;
							const rivalGoals = match.is_home ? match.away_score : match.home_score;
							return sum + rivalGoals;
						}, 0);

						return {
							...player,
							totalParadas,
							totalRivalGoles,
							totalAsistencias,
							matchesPlayed
						};
					} else {
						const totalGoles = playerStatsData.reduce((sum, s) => sum + (s.goles_totales || 0), 0);
						const totalTiros = playerStatsData.reduce((sum, s) => sum + (s.tiros_totales || 0), 0);
						const totalAsistencias = playerStatsData.reduce((sum, s) => sum + (s.acciones_asistencias || 0), 0);
						const matchesPlayed = playerStatsData.length;

						return {
							...player,
							totalGoles,
							totalTiros,
							totalAsistencias,
							matchesPlayed
						};
					}
				});

				if (isMounted) {
					setPlayers(playersWithStats || []);
					setMatchStats(statsResult.data || []);
				}
			} catch (e) {
				if (!abortController.signal.aborted && isMounted) {
					const errorMsg = e instanceof Error ? e.message : "Error al conectar con la base de datos";
					setError(errorMsg);
					console.error("Error fetching players:", errorMsg);
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		}

		fetchPlayers();

		return () => {
			isMounted = false;
			abortController.abort();
		};
	}, [currentClub]);

	if (error) {
		return (
			<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error de Conexión</AlertTitle>
					<AlertDescription>
						{error}
						<br />
						<br />
						Por favor, configura la integración de Supabase desde la sección Connect en el panel lateral.
					</AlertDescription>
				</Alert>
			</main>
		);
	}

	if (loading) {
		return (
			<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
				<div className="text-center py-12">
					<p className="text-muted-foreground">Cargando jugadores...</p>
				</div>
			</main>
		);
	}

	const fieldPlayers = players.filter((p) => !p.is_goalkeeper);
	const goalkeepers = players.filter((p) => p.is_goalkeeper);

	return (
		<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
			<div className="mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Jugadores</h1>
				<p className="text-sm sm:text-base text-muted-foreground">Estadísticas individuales de {currentClub?.short_name || "la plantilla"}</p>
			</div>
			  

			{players.length === 0 ? (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>No hay jugadores</AlertTitle>
					<AlertDescription>
						No se encontraron jugadores para {currentClub?.short_name}.
						{currentClub?.short_name === "CN Sant Andreu"
							? " Los jugadores de ejemplo están disponibles para este club."
							: " Puedes agregar jugadores desde el panel de administración."}
					</AlertDescription>
				</Alert>
			) : (
				<Tabs defaultValue="field-players" className="w-full">
					<div className="mb-4 sm:mb-6 flex items-center gap-3">
						<TabsList className="grid w-1/2 grid-cols-2">
							<TabsTrigger value="field-players" className="text-xs sm:text-sm">
							Jugadores ({fieldPlayers.length})
							</TabsTrigger>
							<TabsTrigger value="goalkeepers" className="text-xs sm:text-sm">
							Porteros ({goalkeepers.length})
							</TabsTrigger>
						</TabsList>

						<Button
							type="button"
							variant="default"
							className="group flex-1 rounded-md flex items-center justify-center gap-2 
								text-black-700 dark:text-white-400 
								bg-blue-500/15 hover:bg-blue-500/20 
								transition-all duration-200 font-medium border border-white-500/30"
							onClick={() => setEditOpen(true)}
						>
							<Edit className="h-4 w-4" />
							Editar jugadores
						</Button>
						</div>

					<TabsContent value="field-players">
						{fieldPlayers.length > 0 ? (
							<div className="grid gap-3 sm:gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
								{fieldPlayers.map((player) => (
									<FieldPlayerCard key={player.id} player={player} matchStats={matchStats} />
								))}
							</div>
						) : (
							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>No hay jugadores de campo</AlertTitle>
								<AlertDescription>No se encontraron jugadores de campo para {currentClub?.short_name}.</AlertDescription>
							</Alert>
						)}
					</TabsContent>

					<TabsContent value="goalkeepers">
						{goalkeepers.length > 0 ? (
							<div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
								{goalkeepers.map((player) => (
									<GoalkeeperCard key={player.id} player={player} matchStats={matchStats} />
								))}
							</div>
						) : (
							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>No hay porteros</AlertTitle>
								<AlertDescription>No se encontraron porteros para {currentClub?.short_name}.</AlertDescription>
							</Alert>
						)}
					</TabsContent>
				</Tabs>
				
			)}
			<EditPlayersModal
				open={editOpen}
				players={players}
				onClose={() => setEditOpen(false)}
				onSaved={(updated) => setPlayers(updated)}
				/>
		</main>
		
	);
}

const FieldPlayerCard = memo(function FieldPlayerCard({
  player,
  matchStats
}: {
  player: Player & {
    totalGoles: number;
    totalTiros: number;
    totalAsistencias: number;
    matchesPlayed: number;
  };
  matchStats: any[];
}) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const playerMatchStats = useMemo(
    () => (Array.isArray(matchStats) ? matchStats.filter((s) => s.player_id === player.id) : []),
    [matchStats, player.id]
  );

  const goToPlayer = useCallback(() => {
    router.push(`/jugadores/${player.id}`);
  }, [router, player.id]);

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={goToPlayer}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") goToPlayer();
      }}
      className={cn(`
        h-full overflow-hidden p-0 cursor-pointer
        transition-all duration-200
        hover:-translate-y-1 hover:shadow-lg
        flex flex-col
      `)}
    >
      {/* ✅ FOTO: más compacta en móvil */}
      <div className="relative aspect-[5/4] sm:aspect-auto sm:h-40 md:h-65 overflow-hidden">
        {player.photo_url ? (
          <img
            src={player.photo_url ?? undefined}
            alt={player.name}
            loading="lazy"
            className="
              absolute inset-0 h-full w-full
              object-cover sm:object-cover
              object-top
              bg-muted
            "
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-muted-foreground">#{player.number}</div>
              <div className="mt-1 text-xs text-muted-foreground">Sin foto</div>
            </div>
          </div>
        )}

        <div
          className="
            absolute inset-0 bg-gradient-to-t
            from-white/75 via-white/10 to-transparent
            dark:from-black/60 dark:via-black/20 dark:to-transparent
          "
        />

        {/* ✅ Texto más compacto en móvil */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2 sm:px-4 sm:pb-3">
          <h3 className="text-sm sm:text-base font-semibold leading-tight truncate text-zinc-900 dark:text-white">
            {player.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-zinc-700/80 dark:text-white/80">
            #{player.number} · Jugador de campo
          </p>
        </div>
      </div>

      {/* Radar */}
		<div
		onClick={(e) => e.stopPropagation()}
		onMouseDown={(e) => e.stopPropagation()}
		onPointerDown={(e) => e.stopPropagation()}
		className="cursor-default -mt-15 sm:mt-0"
		>
		<PlayerRadarChart
			playerName={player.name}
			matchStats={playerMatchStats}
			height={isMobile ? 220 : 340}
		/>
		</div>
    </Card>
  );
});

const GoalkeeperCard = memo(function GoalkeeperCard({
  player,
  matchStats
}: {
  player: Player & {
    totalParadas: number;
    totalRivalGoles: number;
    totalAsistencias: number;
    matchesPlayed: number;
  };
  matchStats: any[];
}) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const goalkeeperMatchStats = useMemo(
    () => (Array.isArray(matchStats) ? matchStats.filter((s) => String(s.player_id) === String(player.id)) : []),
    [matchStats, player.id]
  );

  const goToPlayer = useCallback(() => {
    router.push(`/jugadores/${player.id}`);
  }, [router, player.id]);

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={goToPlayer}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") goToPlayer();
      }}
      className={cn(`
        h-full overflow-hidden p-0 cursor-pointer
        transition-all duration-200
        hover:-translate-y-1 hover:shadow-lg
        flex flex-col
      `)}
    >
      {/* ✅ FOTO compacta móvil */}
      <div className="relative aspect-[5/4] sm:aspect-auto sm:h-40 md:h-65 overflow-hidden">
        {player.photo_url ? (
          <img
            src={player.photo_url ?? undefined}
            alt={player.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-top bg-muted"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-muted-foreground">#{player.number}</div>
              <div className="mt-1 text-xs text-muted-foreground">Sin foto</div>
            </div>
          </div>
        )}

        <div
          className="
            absolute inset-0 bg-gradient-to-t
            from-white/75 via-white/10 to-transparent
            dark:from-black/60 dark:via-black/10 dark:to-transparent
          "
        />

        <div className="absolute inset-x-0 bottom-0 px-3 pb-2 sm:px-4 sm:pb-3">
          <h3 className="text-sm sm:text-base font-semibold leading-tight truncate text-zinc-900 dark:text-white">
            {player.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-zinc-700/80 dark:text-white/80">
            #{player.number} · Portero
          </p>
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="cursor-default -mt-15 sm:mt-0"
      >
        <GoalkeeperRadarChart
          playerName={player.name}
          matchStats={goalkeeperMatchStats}
          height={isMobile ? 220 : 340}
        />
      </div>
    </Card>
  );
});
