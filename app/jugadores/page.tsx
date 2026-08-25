"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import type { Player } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import { useClub } from "@/lib/club-context";
import { useEffect, useState, memo, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerRadarChart } from "@/components/analytics-player/RadarChartPlayers";
import { GoalkeeperRadarChart } from "@/components/analytics-goalkeeper/GoalkeeperRadarChart";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

function getGoalkeeperGoalsConceded(stat: Record<string, unknown>) {
	const recordedTotal = Number(stat.portero_goles_totales || 0);
	if (recordedTotal > 0) return recordedTotal;

	return [
		"portero_gol",
		"portero_gol_superioridad",
		"portero_goles_boya_parada",
		"portero_goles_hombre_menos",
		"portero_goles_dir_mas_5m",
		"portero_goles_contraataque",
		"portero_goles_lanzamiento",
		"portero_goles_penalti"
	].reduce((total, key) => total + Number(stat[key] || 0), 0);
}

export default function PlayersPage() {
	const t = useTranslations("Pages");
	const playersT = useTranslations("Players");
	const { currentClub } = useClub();
	const [players, setPlayers] = useState<any[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [matchStats, setMatchStats] = useState<any[]>([]);
	const [activeSeason, setActiveSeason] = useState<string | null>(null);

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

				const activeSeasonResult = await supabase
					.from("club_seasons")
					.select("id, name")
					.eq("club_id", currentClub.id)
					.eq("status", "active")
					.maybeSingle();

				let season = activeSeasonResult.data as { id: number; name: string } | null;
				if (!season) {
					const { data: latestMatch } = await supabase
						.from("matches")
						.select("season")
						.eq("club_id", currentClub.id)
						.not("season", "is", null)
						.order("match_date", { ascending: false })
						.limit(1)
						.maybeSingle();
					if (latestMatch?.season) season = { id: 0, name: latestMatch.season };
				}
				setActiveSeason(season?.name ?? null);

				let enabledMatchesQuery = supabase.from("matches").select("id").eq("club_id", currentClub.id).eq("stats_enabled", true);
				if (season?.name) enabledMatchesQuery = enabledMatchesQuery.eq("season", season.name);

				const [playersResult, enabledMatchesResult, rosterResult] = await Promise.all([
					supabase.from("players").select("*").eq("club_id", currentClub.id).order("number"),
					enabledMatchesQuery,
					season?.id
						? supabase.from("player_seasons").select("player_id, number, is_goalkeeper, is_active").eq("club_season_id", season.id).eq("is_active", true)
						: Promise.resolve({ data: null, error: null })
				]);

				if (abortController.signal.aborted || !isMounted) return;

				if (playersResult.error) throw playersResult.error;
				if (enabledMatchesResult.error) throw enabledMatchesResult.error;

				const basePlayers = playersResult.data ?? [];
				const roster = rosterResult.data ?? [];
				const rosterByPlayer = new Map(roster.map((entry) => [Number(entry.player_id), entry]));
				const seasonPlayers = roster.length > 0
					? basePlayers.filter((player) => rosterByPlayer.has(player.id)).map((player) => ({ ...player, ...rosterByPlayer.get(player.id), id: player.id }))
					: basePlayers.filter((player) => player.is_active !== false);
				const playerIds = seasonPlayers.map((player) => player.id);
				const matchIds = (enabledMatchesResult.data ?? []).map((match) => match.id);
				const statsResult = playerIds.length > 0 && matchIds.length > 0
					? await supabase.from("match_stats").select("*").in("player_id", playerIds).in("match_id", matchIds)
					: { data: [], error: null };

				if (statsResult.error) throw statsResult.error;

				const playersWithStats = seasonPlayers.map((player) => {
					const playerStatsData = statsResult.data?.filter((s) => s.player_id === player.id) || [];

					if (player.is_goalkeeper) {
						const totalParadas = playerStatsData.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0);
						const totalAsistencias = playerStatsData.reduce((sum, s) => sum + (s.portero_acciones_asistencias || 0), 0);
						const matchesPlayed = playerStatsData.length;

						const totalRivalGoles = playerStatsData.reduce((sum, stat) => sum + getGoalkeeperGoalsConceded(stat), 0);

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

	const activePlayers = players.filter((p) => p.is_active !== false);
	const fieldPlayers = activePlayers.filter((p) => !p.is_goalkeeper);
	const goalkeepers = activePlayers.filter((p) => p.is_goalkeeper);

	return (
		<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
			<div className="mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{t("players")}</h1>
				<div className="flex flex-wrap items-center gap-2">
					<p className="text-sm sm:text-base text-muted-foreground">
						{playersT("individualStats", { club: currentClub?.short_name || playersT("squad") })}
					</p>
					{activeSeason && <Badge variant="secondary">{playersT("activeSeason", { season: activeSeason })}</Badge>}
				</div>
			</div>

			{activePlayers.length === 0 ? (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{playersT("noPlayers")}</AlertTitle>
					<AlertDescription>
						{playersT("noPlayersForClub", { club: currentClub?.short_name || playersT("squad") })}{" "}
						{currentClub?.short_name === "CN Sant Andreu" ? playersT("samplePlayersHint") : playersT("addPlayersHint")}
					</AlertDescription>
				</Alert>
			) : (
				<Tabs defaultValue="field-players" className="w-full">
					<div className="mb-4 sm:mb-6 flex items-center gap-3">
						<TabsList className="grid w-full grid-cols-2 sm:w-1/2">
							<TabsTrigger value="field-players" className="text-xs sm:text-sm">
								{playersT("fieldPlayersCount", { count: fieldPlayers.length })}
							</TabsTrigger>
							<TabsTrigger value="goalkeepers" className="text-xs sm:text-sm">
								{playersT("goalkeepersCount", { count: goalkeepers.length })}
							</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value="field-players">
						{fieldPlayers.length > 0 ? (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
								{fieldPlayers.map((player) => (
									<FieldPlayerCard key={player.id} player={player} matchStats={matchStats} />
								))}
							</div>
						) : (
							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>{playersT("noFieldPlayers")}</AlertTitle>
								<AlertDescription>
									{playersT("noFieldPlayersForClub", { club: currentClub?.short_name || playersT("squad") })}
								</AlertDescription>
							</Alert>
						)}
					</TabsContent>

					<TabsContent value="goalkeepers">
						{goalkeepers.length > 0 ? (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
								{goalkeepers.map((player) => (
									<GoalkeeperCard key={player.id} player={player} matchStats={matchStats} />
								))}
							</div>
						) : (
							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>{playersT("noGoalkeepers")}</AlertTitle>
								<AlertDescription>
									{playersT("noGoalkeepersForClub", { club: currentClub?.short_name || playersT("squad") })}
								</AlertDescription>
							</Alert>
						)}
					</TabsContent>
				</Tabs>
			)}
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
			aria-label={t("viewPlayerProfile", { name: player.name })}
			onClick={goToPlayer}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					goToPlayer();
				}
			}}
			className="
				group relative flex h-full cursor-pointer flex-col overflow-hidden
				rounded-2xl border border-border/70 bg-card shadow-sm
				transition-all duration-300
				hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5
				focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
			"
		>
			<div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-gradient-to-r from-primary via-cyan-300 to-primary/20" />
			<PlayerHero player={player} role={t("fieldPlayer")} tone="field" />

			<div className="flex flex-1 flex-col gap-2.5 p-3">
				<div className="grid grid-cols-3 gap-2">
					<MiniStat label={t("goals")} value={player.totalGoles || 0} featured />
					<MiniStat label={t("assistsShort")} value={player.totalAsistencias || 0} />
					<MiniStat label={t("efficiencyShort")} value={`${efficiency}%`} />
				</div>

				<div
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
					className="overflow-hidden rounded-xl border border-border/60 bg-muted/15"
				>
					<p className="border-b border-border/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						{t("performanceProfile")}
					</p>
					<PlayerRadarChart playerName={player.name} matchStats={playerMatchStats} height={145} />
				</div>

				<CardFooter label={t("viewProfile")} />
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

	const goalkeeperMatchStats = useMemo(
		() => (Array.isArray(matchStats) ? matchStats.filter((s) => String(s.player_id) === String(player.id)) : []),
		[matchStats, player.id]
	);

	const goToPlayer = useCallback(() => {
		router.push(`/jugadores/${player.id}`);
	}, [router, player.id]);
	const shotsFaced = (player.totalParadas || 0) + (player.totalRivalGoles || 0);
	const savePercentage = shotsFaced > 0 ? Math.round(((player.totalParadas || 0) / shotsFaced) * 100) : 0;

	return (
		<article
			role="link"
			tabIndex={0}
			aria-label={t("viewPlayerProfile", { name: player.name })}
			onClick={goToPlayer}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					goToPlayer();
				}
			}}
			className="
				group relative flex h-full cursor-pointer flex-col overflow-hidden
				rounded-2xl border border-border/70 bg-card shadow-sm
				transition-all duration-300
				hover:-translate-y-1 hover:border-sky-400/40 hover:shadow-xl hover:shadow-sky-500/5
				focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
			"
		>
			<div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-gradient-to-r from-sky-500 via-blue-300 to-sky-500/20" />
			<PlayerHero player={player} role={t("goalkeeper")} tone="goalkeeper" />

			<div className="flex flex-1 flex-col gap-2.5 p-3">
				<div className="grid grid-cols-3 gap-2">
					<MiniStat label={t("saves")} value={player.totalParadas || 0} featured />
					<MiniStat label={t("savePercentageShort")} value={`${savePercentage}%`} />
					<MiniStat label={t("assistsShort")} value={player.totalAsistencias || 0} />
				</div>

				<div className="flex items-center justify-between rounded-lg bg-muted/25 px-3 py-1.5 text-xs">
					<span className="text-muted-foreground">{t("goalsConceded")}</span>
					<span className="font-semibold tabular-nums">{player.totalRivalGoles || 0}</span>
				</div>

				<div
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
					className="overflow-hidden rounded-xl border border-border/60 bg-muted/15"
				>
					<p className="border-b border-border/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						{t("performanceProfile")}
					</p>
					<GoalkeeperRadarChart playerName={player.name} matchStats={goalkeeperMatchStats} height={145} />
				</div>

				<CardFooter label={t("viewProfile")} />
			</div>
		</article>
	);
});

function PlayerHero({
	player,
	role,
	tone
}: {
	player: Player & {
		matchesPlayed?: number;
	};
	role: string;
	tone: "field" | "goalkeeper";
}) {
	const t = useTranslations("Players");
	return (
		<div className="relative aspect-[4/3] overflow-hidden bg-muted">
			{player.photo_url ? (
				<Image
					src={player.photo_url}
					alt={player.name}
					fill
					sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
					className="
						object-cover object-top
						transition-transform duration-500
						group-hover:scale-[1.04]
					"
				/>
			) : (
				<div className="absolute inset-0 grid place-items-center">
					<div className="text-center">
						<div className="text-4xl font-black text-muted-foreground">#{player.number}</div>
						<div className="mt-1 text-xs text-muted-foreground">{t("noPhoto")}</div>
					</div>
				</div>
			)}

			<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-slate-950/30" />

			<div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-md">
				{role}
			</div>

			<div
				className={`absolute right-3 top-3 rounded-lg border px-2.5 py-1 text-xs font-black text-white shadow-sm backdrop-blur-md ${tone === "goalkeeper" ? "border-sky-300/30 bg-sky-500/65" : "border-primary-foreground/20 bg-primary/75"}`}
			>
				#{player.number}
			</div>

			<div className="absolute inset-x-0 bottom-0 p-3">
				<h3 className="line-clamp-1 text-base font-bold tracking-tight text-white">{player.name}</h3>
				<p className="mt-1 text-xs text-white/70">{t("roleMatches", { role, count: player.matchesPlayed || 0 })}</p>
			</div>
		</div>
	);
}

function MiniStat({ label, value, featured = false }: { label: string; value: string | number; featured?: boolean }) {
	return (
		<div className={`rounded-lg border px-2 py-1.5 text-center ${featured ? "border-primary/25 bg-primary/10" : "border-border/60 bg-muted/25"}`}>
			<p className={`truncate text-sm font-bold tabular-nums ${featured ? "text-primary" : "text-foreground"}`}>{value}</p>
			<p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">{label}</p>
		</div>
	);
}

function CardFooter({ label }: { label: string }) {
	return (
		<div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2 text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
			<span>{label}</span>
			<span className="grid size-7 place-items-center rounded-full bg-muted transition-all group-hover:bg-primary group-hover:text-primary-foreground">
				<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
			</span>
		</div>
	);
}
