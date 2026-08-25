import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit, ListOrdered } from "lucide-react";
import { notFound } from "next/navigation";
import { DeleteMatchButton } from "@/components/delete-match-button";
import { getCurrentProfile } from "@/lib/auth";
import Image from "next/image";
import logo from "@/public/images/lewaterpolo_bg.png";
import { MatchPeriodsAndPenaltiesCard } from "@/components/match-components/MatchPeriodsAndPenaltiesCard";
import { MatchPlayersTabs } from "./MatchPlayersTabs";
import { ExportMatchPdfButton } from "@/components/export-buttons/export-match-pdf-button";
import { ExportMatchExcelButton } from "@/components/export-buttons/export-match-excel-button";
import { getLocale, getTranslations } from "next-intl/server";
import { MatchChronology } from "@/components/match-actions/MatchChronology";
import type { MatchAction } from "@/lib/types";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const t = await getTranslations("Matches");
	const chronologyT = await getTranslations("MatchChronology");
	const locale = await getLocale();
	const { id } = await params;
	const matchId = Number(id);
	const profile = await getCurrentProfile();
	const supabase = await createClient();
	if (!profile || !supabase) notFound();

	let matchQuery = supabase
		.from("matches")
		.select(
			`
      *,
      clubs (*),
      competitions:competition_id ( id, name, slug, image_url ),
      match_stats (
        *,
        players (*)
      )
    `
		)
		.eq("id", id);

	if (!profile.is_super_admin) {
		if (!profile.club_id) notFound();
		matchQuery = matchQuery.eq("club_id", profile.club_id);
	}

	const { data: match, error } = await matchQuery
		.maybeSingle();

	if (error || !match) {
		notFound();
	}

	const hiddenStats =
		profile?.id != null
			? ((await supabase.from("profile_hidden_stats").select("stat_key").eq("profile_id", profile.id)).data?.map((row) => row.stat_key) ?? [])
			: [];

	const { data: penaltyRows } = await supabase
		.from("penalty_shootout_players")
		.select(
			`
      id,
      match_id,
      shot_order,
      scored,
      result_type,
      player_id,
      goalkeeper_id,
      players:player_id (
        id,
        name,
        number,
        photo_url
      ),
      goalkeeper:goalkeeper_id (
        id,
        name,
        number,
        photo_url
      )
    `
		)
		.eq("match_id", matchId)
		.order("shot_order", { ascending: true });

	const { data: actionRows, error: actionsError } = await supabase
		.from("match_actions")
		.select(`
			id,
			client_id,
			match_id,
			player_id,
			quarter,
			sequence,
			action_key,
			created_by,
			created_at,
			players:player_id (id, name, number, photo_url)
		`)
		.eq("match_id", matchId)
		.order("sequence", { ascending: true });

	if (actionsError) console.error("Error loading match chronology:", actionsError);

	const isTied = match.home_score === match.away_score;
	const hasPenalties = isTied && (match.penalty_home_score != null || match.penalty_away_score != null);

	const normalizeRel = <T,>(rel: T | T[] | null | undefined): T | null => {
		if (!rel) return null;
		return Array.isArray(rel) ? (rel[0] ?? null) : rel;
	};

	const homePenaltyShooters = (penaltyRows ?? [])
		.filter((r: any) => r.player_id !== null)
		.map((r: any) => ({
			...r,
			players: normalizeRel(r.players)
		}));

	const rivalPenaltyShots = (penaltyRows ?? [])
		.filter((r: any) => r.player_id === null)
		.map((r: any) => ({
			...r,
			goalkeeper: normalizeRel(r.goalkeeper)
		}));

	type PlayerMini = { id: number; name: string; number: number; photo_url?: string | null };

	const playersById = new Map<number, PlayerMini>(
		(match.match_stats ?? []).map((s: any) => {
			const p = s.players;
			return [p.id, { id: p.id, name: p.name, number: p.number, photo_url: p.photo_url }];
		})
	);

	const getWinner = (playerId: number | null | undefined): PlayerMini | null => {
		if (!playerId) return null;
		return playersById.get(playerId) ?? null;
	};

	const periods = [
		{ q: 1 as const, home: match.q1_score ?? 0, away: match.q1_score_rival ?? 0, winner: getWinner(match.sprint1_winner_player_id) },
		{ q: 2 as const, home: match.q2_score ?? 0, away: match.q2_score_rival ?? 0, winner: getWinner(match.sprint2_winner_player_id) },
		{ q: 3 as const, home: match.q3_score ?? 0, away: match.q3_score_rival ?? 0, winner: getWinner(match.sprint3_winner_player_id) },
		{ q: 4 as const, home: match.q4_score ?? 0, away: match.q4_score_rival ?? 0, winner: getWinner(match.sprint4_winner_player_id) }
	];

	const outcome = hasPenalties
		? match.penalty_home_score! > match.penalty_away_score! ? "win" : "loss"
		: match.home_score > match.away_score ? "win" : match.home_score < match.away_score ? "loss" : "draw";
	const result = hasPenalties
		? t(outcome === "win" ? "results.penaltyWin" : "results.penaltyLoss")
		: t(`results.${outcome}`);
	const resultColor = outcome === "win"
		? "bg-green-500/10 text-green-700 dark:text-green-300"
		: outcome === "loss"
			? "bg-red-500/10 text-red-700 dark:text-red-300"
			: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";

	const fieldPlayersStats = match.match_stats
		.filter((stat: any) => !stat.players.is_goalkeeper)
		.sort((a: any, b: any) => a.players.number - b.players.number);

	const goalkeepersStats = match.match_stats
		.filter((stat: any) => stat.players.is_goalkeeper)
		.sort((a: any, b: any) => a.players.number - b.players.number);

	const blocksStats = calculateBlocksStats(match.match_stats, match.away_score);
	const players = match.match_stats.map((s: any) => s.players);
	const chronologyActions = (actionRows ?? []).map((action: any) => ({
		id: action.id,
		client_id: action.client_id,
		match_id: action.match_id,
		player_id: action.player_id,
		quarter: action.quarter,
		sequence: action.sequence,
		action_key: action.action_key,
		created_by: action.created_by,
		created_at: action.created_at
	})) as MatchAction[];
	const chronologyPlayers = Array.from(
		new Map(
			[
				...players,
				...(actionRows ?? []).map((action: any) => normalizeRel(action.players)).filter(Boolean)
			].map((player: any) => [player.id, player])
		).values()
	);

	const stats = match.match_stats;
	const canEdit = profile?.role === "admin" || profile?.role === "coach";
	const clubName = match.clubs?.short_name || match.clubs?.name || t("ourTeam");
	const isClubHome = match.is_home !== false;
	const localTeam = isClubHome ? clubName : match.opponent;
	const visitingTeam = isClubHome ? match.opponent : clubName;
	const localScore = isClubHome ? match.home_score : match.away_score;
	const visitingScore = isClubHome ? match.away_score : match.home_score;
	const localPenaltyScore = isClubHome ? match.penalty_home_score : match.penalty_away_score;
	const visitingPenaltyScore = isClubHome ? match.penalty_away_score : match.penalty_home_score;
	const matchDate = new Date(match.match_date);
	const competitionImage = match.competitions?.image_url?.trim() || null;

	const { data: gkShots, error: gkShotsErr } = await supabase
		.from("goalkeeper_shots")
		.select("id, match_id, goalkeeper_player_id, x, y, result")
		.eq("match_id", match.id)
		.order("shot_index", { ascending: true });

	if (gkShotsErr) console.error(gkShotsErr);

	const allGoalkeeperShots = gkShots ?? [];
	const goalkeeperIdFromShots = allGoalkeeperShots[0]?.goalkeeper_player_id;
	const goalkeeperIdFromStats =
		match.match_stats?.find((s: any) => s?.players?.is_goalkeeper)?.player_id ??
		match.match_stats?.find((s: any) => s?.players?.is_goalkeeper)?.players?.id;

	const goalkeeperId = goalkeeperIdFromShots ?? goalkeeperIdFromStats ?? null;

	const logoGlow = outcome === "win"
		? "from-green-500/80 via-emerald-400/40 to-transparent"
		: outcome === "loss"
			? "from-red-500/80 via-rose-400/40 to-transparent"
			: "from-yellow-500/80 via-amber-400/40 to-transparent";

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<div className="mb-4 flex items-center justify-between gap-3">
					<Button variant="ghost" asChild>
						<Link href="/partidos">
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("backToMatches")}
						</Link>
					</Button>

					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<ExportMatchPdfButton matchId={match.id} />
						<ExportMatchExcelButton matchId={match.id} />
					</div>
				</div>

				<Card className="relative overflow-hidden border-2 rounded-xl p-0">
					<div className="pointer-events-none absolute -right-16 -top-16 h-[420px] w-[420px]">
						<div className="relative h-full w-full">
							<div className={`absolute inset-10 rounded-full bg-gradient-to-br ${logoGlow} blur-3xl`} />
							<Image
								src={competitionImage ?? logo}
								alt={match.competitions?.name ?? "LEWaterpolo"}
								fill
								sizes="(max-width: 640px) 280px, 420px"
								className="object-contain opacity-30 transition-opacity duration-200"
								priority
							/>
						</div>
					</div>

					<div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />

					<div className="relative p-4 sm:p-6">
						<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
							<div className="flex-1 min-w-0">
								<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
									<h2 className="text-xl sm:text-2xl font-bold truncate">
										{localTeam} {t("versus")} {visitingTeam}
									</h2>

									<span className={`text-xs sm:text-sm font-semibold ${resultColor}`}>{result}</span>
								</div>

								<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
									<span>
										{matchDate.toLocaleDateString(locale, {
											weekday: "long",
											year: "numeric",
											month: "long",
											day: "numeric"
										})}
									</span>
									{match.location && <span>• {match.location}</span>}
									{match.season && <span>• {match.season}</span>}
									{match.jornada && <span>• {t("matchday", { number: match.jornada })}</span>}
								</div>
							</div>

							<div className="flex flex-col items-center justify-center gap-2 w-full md:w-auto">
								<div className="flex items-center gap-4 sm:gap-6">
									<div className="text-center">
										<p className="text-3xl sm:text-4xl font-bold tabular-nums">{localScore}</p>
										<p className="text-xs text-muted-foreground truncate max-w-[140px]">{localTeam}</p>
									</div>

									<div className="text-2xl sm:text-3xl font-bold text-muted-foreground">-</div>

									<div className="text-center">
										<p className="text-3xl sm:text-4xl font-bold tabular-nums">{visitingScore}</p>
										<p className="text-xs text-muted-foreground truncate max-w-[140px]">{visitingTeam}</p>
									</div>
								</div>

								{hasPenalties && (
									<div className="text-xs sm:text-sm text-muted-foreground font-medium">
										{t("penaltiesLabel")} {" "}
										<span className="font-bold tabular-nums text-foreground">
											{localPenaltyScore} - {visitingPenaltyScore}
										</span>
									</div>
								)}
							</div>
						</div>

						{match.notes && (
							<div className="mt-4 pt-4 border-t border-border/40">
								<p className="text-sm text-muted-foreground">
									<span className="font-semibold">{t("notes")}</span> {match.notes}
								</p>
							</div>
						)}
					</div>
				</Card>
			</div>

			<MatchPeriodsAndPenaltiesCard
				opponentName={match.opponent}
				clubName={clubName}
				isClubHome={isClubHome}
				hasPenalties={hasPenalties}
				periods={periods}
				penaltyHomeScore={match.penalty_home_score}
				penaltyAwayScore={match.penalty_away_score}
				homePenaltyShooters={homePenaltyShooters}
				rivalPenaltyShots={rivalPenaltyShots}
			/>

			<Card className="mb-6 overflow-hidden rounded-2xl border-border/70 p-0">
				<div className="flex items-center justify-between gap-3 border-b bg-muted/15 px-4 py-3 sm:px-5">
					<div>
						<h2 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
							<ListOrdered className="size-5 text-primary" />
							{chronologyT("title")}
						</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">{chronologyT("description")}</p>
					</div>
					<span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
						{chronologyT("actionCount", { count: chronologyActions.length })}
					</span>
				</div>
				<div className="p-4 sm:p-5">
					<MatchChronology actions={chronologyActions} players={chronologyPlayers} showAll />
				</div>
			</Card>

			<MatchPlayersTabs
				fieldPlayersStats={fieldPlayersStats}
				goalkeepersStats={goalkeepersStats}
				matchId={match.id}
				clubName={clubName}
				opponentName={match.opponent}
				matchDateLabel={matchDate.toLocaleDateString(locale)}
				match={match}
				matchStats={match.match_stats}
				blocksStats={blocksStats}
				allGoalkeeperShots={allGoalkeeperShots}
				goalkeeperId={goalkeeperId}
				players={players}
				hiddenStats={hiddenStats}
			/>

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
				<div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
					{canEdit && (
						<Button asChild>
							<Link href={`/nuevo-partido?matchId=${match.id}`}>
								<Edit className="mr-2 h-4 w-4" />
								{t("editMatch")}
							</Link>
						</Button>
					)}

					{canEdit && (
						<div className="flex items-center gap-2 bg-muted rounded-md">
							<DeleteMatchButton matchId={match.id} />
							<span className="hidden sm:inline text-sm text-red-600 dark:text-red-400">{t("deleteMatch")}</span>
						</div>
					)}
				</div>
			</div>

			<div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
				<span>{t("poweredBy")}</span>

				<Image
					src="/images/logo-sponsor/TFT_LOGO.webp"
					alt="TFT"
					width={30}
					height={18}
					className="h-[40px] w-auto dark:invert dark:brightness-0 dark:contrast-200"
				/>

				<span>&amp;</span>

				<Image src="/images/logo-sponsor/bwmf.svg" alt="BWMF" width={86} height={38} className="h-[30px] w-auto" />
			</div>
		</main>
	);
}

function calculateBlocksStats(stats: any[], golesRecibidos: number) {
	const bloqueos = stats.reduce((acc, stat) => acc + (stat.acciones_bloqueo || 0), 0);
	const total = bloqueos + golesRecibidos;
	const eficacia = total > 0 ? ((bloqueos / total) * 100).toFixed(1) : "0.0";

	return {
		bloqueos,
		golesRecibidos,
		eficacia: Number.parseFloat(eficacia)
	};
}
