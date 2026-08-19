"use client";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
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
import { useTranslations } from "next-intl";

export default function PlayersPage() {
	const t = useTranslations("Pages");
	const playersT = useTranslations("Players");
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
					setError(playersT("databaseError"));
					console.error("Error fetching players:", e);
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
	}, [currentClub, playersT]);

	if (error) {
		return (
			<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{playersT("connectionError")}</AlertTitle>
					<AlertDescription>
						{error}
						<br />
						<br />
						{playersT("connectionDescription")}
					</AlertDescription>
				</Alert>
			</main>
		);
	}

	if (loading) {
		return (
			<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
				<div className="text-center py-12">
					<p className="text-muted-foreground">{playersT("loading")}</p>
				</div>
			</main>
		);
	}

	const fieldPlayers = players.filter((p) => !p.is_goalkeeper);
	const goalkeepers = players.filter((p) => p.is_goalkeeper);

	return (
		<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
			<div className="mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{t("players")}</h1>
				<p className="text-sm sm:text-base text-muted-foreground">{playersT("individualStats", { club: currentClub?.short_name || playersT("squad") })}</p>
			</div>

			{players.length === 0 ? (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{playersT("noPlayers")}</AlertTitle>
					<AlertDescription>
						{playersT("noPlayersForClub", { club: currentClub?.short_name || playersT("squad") })} {" "}
						{currentClub?.short_name === "CN Sant Andreu"
							? playersT("samplePlayersHint")
							: playersT("addPlayersHint")}
					</AlertDescription>
				</Alert>
			) : (
				<Tabs defaultValue="field-players" className="w-full">
					<div className="mb-4 sm:mb-6 flex items-center gap-3">
						<TabsList className="grid w-1/2 grid-cols-2">
							<TabsTrigger value="field-players" className="text-xs sm:text-sm">
								{playersT("fieldPlayersCount", { count: fieldPlayers.length })}
							</TabsTrigger>
							<TabsTrigger value="goalkeepers" className="text-xs sm:text-sm">
								{playersT("goalkeepersCount", { count: goalkeepers.length })}
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
							{playersT("editPlayers")}
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
								<AlertTitle>{playersT("noFieldPlayers")}</AlertTitle>
								<AlertDescription>{playersT("noFieldPlayersForClub", { club: currentClub?.short_name || playersT("squad") })}</AlertDescription>
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
								<AlertTitle>{playersT("noGoalkeepers")}</AlertTitle>
								<AlertDescription>{playersT("noGoalkeepersForClub", { club: currentClub?.short_name || playersT("squad") })}</AlertDescription>
							</Alert>
						)}
					</TabsContent>
				</Tabs>
			)}
			<EditPlayersModal open={editOpen} players={players} onClose={() => setEditOpen(false)} onSaved={(updated) => setPlayers(updated)} />
			<div className="mt-6 flex flex-col items-center gap-2 text-center">
				<p className="text-xs text-muted-foreground">
					{playersT("poweredBy")} <span className="font-medium">TFT</span> &amp; <span className="font-medium">BWMF</span>
				</p>

				<div className="flex items-center gap-4 opacity-70">
					<Image
						src="/images/logo-sponsor/TFT_LOGO.webp"
						alt="TFT"
						width={30}
						height={18}
						className="h-[60px] w-auto dark:invert dark:brightness-0 dark:contrast-200"
					/>

					<Image src="/images/logo-sponsor/bwmf.svg" alt="BWMF" width={86} height={38} className="h-[40px] w-auto" />
				</div>
			</div>
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
	const t = useTranslations("Players");
	const router = useRouter();
	const isMobile = useIsMobile();

	const playerMatchStats = useMemo(
		() => (Array.isArray(matchStats) ? matchStats.filter((s) => s.player_id === player.id) : []),
		[matchStats, player.id]
	);

	const goToPlayer = useCallback(() => {
		router.push(`/jugadores/${player.id}`);
	}, [router, player.id]);

	const efficiency = player.totalTiros > 0 ? Math.round((player.totalGoles / player.totalTiros) * 100) : 0;

	return (
		<article
			role="link"
			tabIndex={0}
			onClick={goToPlayer}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") goToPlayer();
			}}
			className="
				group flex h-full cursor-pointer flex-col overflow-hidden
				rounded-3xl border bg-card shadow-sm
				transition-all duration-300
				hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg
				focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
			"
		>
			<PlayerHero player={player} role={t("fieldPlayer")} />

			<div className="space-y-3 p-3 sm:p-4">
				<div className="grid grid-cols-3 gap-2">
					<MiniStat label={t("goals")} value={player.totalGoles || 0} />
					<MiniStat label={t("assistsShort")} value={player.totalAsistencias || 0} />
					<MiniStat label={t("efficiencyShort")} value={`${efficiency}%`} />
				</div>

				<div
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
					className="
						overflow-hidden rounded-2xl mb-6
					"
				>
					<PlayerRadarChart
						playerName={player.name}
						matchStats={playerMatchStats}
						height={isMobile ? 190 : 200}
					/>
				</div>
			</div>
		</article>
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
	const t = useTranslations("Players");
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
		<article
			role="link"
			tabIndex={0}
			onClick={goToPlayer}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") goToPlayer();
			}}
			className="
				group flex h-full cursor-pointer flex-col overflow-hidden
				rounded-3xl border bg-card shadow-sm
				transition-all duration-300
				hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg
				focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
			"
		>
			<PlayerHero player={player} role={t("goalkeeper")} />

			<div className="space-y-3 p-3 sm:p-4">
				<div className="grid grid-cols-3 gap-2">
					<MiniStat label={t("saves")} value={player.totalParadas || 0} />
					<MiniStat label={t("goals")} value={player.totalRivalGoles || 0} />
					<MiniStat label={t("matches")} value={player.matchesPlayed || 0} />
				</div>

				<div
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
					className="
						overflow-hidden rounded-2xl mb-6
						
					"
				>
					<GoalkeeperRadarChart
						playerName={player.name}
						matchStats={goalkeeperMatchStats}
						height={isMobile ? 190 : 200}
					/>
				</div>
			</div>
		</article>
	);
});

function PlayerHero({
	player,
	role
}: {
	player: Player & {
		matchesPlayed?: number;
	};
	role: string;
}) {
	const t = useTranslations("Players");
	return (
		<div className="relative aspect-[4/5] overflow-hidden bg-muted sm:aspect-[5/4]">
			{player.photo_url ? (
				<img
					src={player.photo_url}
					alt={player.name}
					loading="lazy"
					className="
						absolute inset-0 h-full w-full object-cover object-top
						transition-transform duration-500
						group-hover:scale-[1.04]
					"
				/>
			) : (
				<div className="absolute inset-0 grid place-items-center">
					<div className="text-center">
						<div className="text-4xl font-black text-muted-foreground">
							#{player.number}
						</div>
						<div className="mt-1 text-xs text-muted-foreground">
							{t("noPhoto")}
						</div>
					</div>
				</div>
			)}

			<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

			<div className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
				#{player.number}
			</div>

			<div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
				<h3 className="line-clamp-1 text-sm font-bold text-white sm:text-base">
					{player.name}
				</h3>
				<p className="mt-0.5 text-[11px] text-white/75 sm:text-xs">
					{t("roleMatches", { role, count: player.matchesPlayed || 0 })}
				</p>
			</div>
		</div>
	);
}

function MiniStat({
	label,
	value
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-xl border bg-muted/30 px-2 py-2 text-center">
			<p className="truncate text-sm font-bold tabular-nums">{value}</p>
			<p className="mt-0.5 truncate text-[10px] text-muted-foreground">
				{label}
			</p>
		</div>
	);
}
