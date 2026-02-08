import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { notFound } from "next/navigation";
import { DeleteMatchButton } from "@/components/delete-match-button";
import { getCurrentProfile } from "@/lib/auth";
import Image from "next/image";
import logo from "@/public/images/lewaterpolo_bg.png";
import { MatchPeriodsAndPenaltiesCard } from "@/components/match-components/MatchPeriodsAndPenaltiesCard";
import { TeamTotalsOverviewCard } from "@/components/match-components/TotalMatchStats";
import { MatchPlayersTabs } from "./MatchPlayersTabs";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const matchId = Number(id);
	const profile = await getCurrentProfile();
	const supabase = await createClient();

	const { data: match, error } = await supabase
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
		.eq("id", id)
		.maybeSingle();

	if (error || !match) {
		notFound();
	}

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

	let result: string;
	let resultColor: string;

	if (hasPenalties) {
		// Determine winner by penalties
		result = match.penalty_home_score! > match.penalty_away_score! ? "Victoria (Penaltis)" : "Derrota (Penaltis)";
		resultColor =
			match.penalty_home_score! > match.penalty_away_score!
				? "bg-green-500/10 text-green-700 dark:text-green-300"
				: "bg-red-500/10 text-red-700 dark:text-red-300";
	} else {
		result = match.home_score > match.away_score ? "Victoria" : match.home_score < match.away_score ? "Derrota" : "Empate";
		resultColor =
			result === "Victoria"
				? "bg-green-500/10 text-green-700 dark:text-green-300"
				: result === "Derrota"
					? "bg-red-500/10 text-red-700 dark:text-red-300"
					: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
	}

	const fieldPlayersStats = match.match_stats
		.filter((stat: any) => !stat.players.is_goalkeeper)
		.sort((a: any, b: any) => a.players.number - b.players.number);

	const goalkeepersStats = match.match_stats
		.filter((stat: any) => stat.players.is_goalkeeper)
		.sort((a: any, b: any) => a.players.number - b.players.number);

	const superioridadStats = calculateSuperioridadStats(match.match_stats);
	const inferioridadStats = calculateInferioridadStats(match.match_stats); // Added
	const blocksStats = calculateBlocksStats(match.match_stats, match.away_score);
	const players = match.match_stats.map((s: any) => s.players);

	const stats = match.match_stats; // Rename for clarity in the block section
	const canEdit = profile?.role === "admin" || profile?.role === "coach";
	const clubName = match.clubs?.short_name || match.clubs?.name || "Nuestro Equipo";
	const matchDate = new Date(match.match_date);
	const matchStats = match.match_stats;
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

	const logoGlow = result.startsWith("Victoria")
		? "from-green-500/80 via-emerald-400/40 to-transparent"
		: result.startsWith("Derrota")
			? "from-red-500/80 via-rose-400/40 to-transparent"
			: "from-yellow-500/80 via-amber-400/40 to-transparent";

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/partidos">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a Partidos
					</Link>
				</Button>

				<Card className="relative overflow-hidden border-2 rounded-xl p-0">
					{/* Glow + imagen competición (en toda la card) */}
					<div className="pointer-events-none absolute -right-16 -top-16 h-[420px] w-[420px]">
						<div className="relative h-full w-full">
							<div className={`absolute inset-10 rounded-full bg-gradient-to-br ${logoGlow} blur-3xl`} />
							<Image
								src={competitionImage ?? logo}
								alt={match.competitions?.name ?? "LEWaterpolo"}
								fill
								className="object-contain opacity-30 transition-opacity duration-200"
								priority
							/>
						</div>
					</div>

					{/* Overlay en toda la card */}
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />

					{/* Contenido (controlas tú el padding) */}
					<div className="relative p-4 sm:p-6">
						<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
							{/* IZQ */}
							<div className="flex-1 min-w-0">
								<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
									<h2 className="text-xl sm:text-2xl font-bold truncate">
										{clubName} vs {match.opponent}
									</h2>

									<span className={`text-xs sm:text-sm font-semibold ${resultColor}`}>{result}</span>
								</div>

								<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
									<span>
										{matchDate.toLocaleDateString("es-ES", {
											weekday: "long",
											year: "numeric",
											month: "long",
											day: "numeric"
										})}
									</span>
									{match.location && <span>• {match.location}</span>}
									{match.season && <span>• {match.season}</span>}
									{match.jornada && <span>• Jornada {match.jornada}</span>}
								</div>
							</div>

							{/* DER / MARCADOR */}
							<div className="flex flex-col items-center justify-center gap-2 w-full md:w-auto">
								<div className="flex items-center gap-4 sm:gap-6">
									<div className="text-center">
										<p className="text-3xl sm:text-4xl font-bold tabular-nums">{match.home_score}</p>
										<p className="text-xs text-muted-foreground truncate max-w-[140px]">{clubName}</p>
									</div>

									<div className="text-2xl sm:text-3xl font-bold text-muted-foreground">-</div>

									<div className="text-center">
										<p className="text-3xl sm:text-4xl font-bold tabular-nums">{match.away_score}</p>
										<p className="text-xs text-muted-foreground truncate max-w-[140px]">{match.opponent}</p>
									</div>
								</div>

								{hasPenalties && (
									<div className="text-xs sm:text-sm text-muted-foreground font-medium">
										Penaltis:{" "}
										<span className="font-bold tabular-nums text-foreground">
											{match.penalty_home_score} - {match.penalty_away_score}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* NOTAS (dentro del mismo “hero”, sin márgenes extra) */}
						{match.notes && (
							<div className="mt-4 pt-4 border-t border-border/40">
								<p className="text-sm text-muted-foreground">
									<span className="font-semibold">Notas:</span> {match.notes}
								</p>
							</div>
						)}
					</div>
				</Card>
			</div>

			<MatchPeriodsAndPenaltiesCard
				opponentName={match.opponent}
				clubName={clubName}
				hasPenalties={hasPenalties}
				periods={periods}
				penaltyHomeScore={match.penalty_home_score}
				penaltyAwayScore={match.penalty_away_score}
				homePenaltyShooters={homePenaltyShooters}
				rivalPenaltyShots={rivalPenaltyShots}
			/>

			<div className="grid gap- mb-8">
				<TeamTotalsOverviewCard stats={match.match_stats} />
			</div>

			<MatchPlayersTabs
				fieldPlayersStats={fieldPlayersStats}
				goalkeepersStats={goalkeepersStats}
				matchId={match.id}
				clubName={clubName}
				opponentName={match.opponent}
				matchDateLabel={matchDate.toLocaleDateString("es-ES")}
				match={match}
				matchStats={match.match_stats}
				superioridadStats={superioridadStats}
				inferioridadStats={inferioridadStats}
				blocksStats={blocksStats}
				allGoalkeeperShots={allGoalkeeperShots}
				goalkeeperId={goalkeeperId}
				players={players}
			/>

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">

				<div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
					{canEdit && (
						<Button asChild>
							<Link href={`/nuevo-partido?matchId=${match.id}`}>
								<Edit className="mr-2 h-4 w-4" />
								Editar Partido
							</Link>
						</Button>
					)}

					{canEdit && (
						<div className="flex items-center gap-2 bg-muted rounded-md">
							<DeleteMatchButton matchId={match.id} />

							<span className="hidden sm:inline text-sm text-red-600 dark:text-red-400">Eliminar Partido</span>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}

function calculateSuperioridadStats(stats: any[]) {
	const anotadas = stats.reduce((acc, stat) => acc + (stat.goles_hombre_mas || 0), 0);
	const anotadas_palo = stats.reduce((acc, stat) => acc + (stat.gol_del_palo_sup || 0), 0);
	const falladas = stats.reduce((acc, stat) => acc + (stat.tiros_hombre_mas || 0), 0);

	const rebotesRecuperados = stats.reduce((acc, stat) => acc + (stat.rebote_recup_hombre_mas || 0), 0);
	const rebotesPerdidos = stats.reduce((acc, stat) => acc + (stat.rebote_perd_hombre_mas || 0), 0);

	const goles = anotadas + anotadas_palo;
	const total = goles + falladas;
	const eficiencia = total > 0 ? ((goles / total) * 100).toFixed(1) : "0.0";

	return {
		anotadas,
		anotadas_palo,
		falladas,
		total,
		eficiencia: Number.parseFloat(eficiencia),
		rebotesRecuperados,
		rebotesPerdidos
	};
}

function calculateInferioridadStats(stats: any[]) {
	const paradas = stats.reduce((acc, stat) => acc + (stat.portero_paradas_hombre_menos || 0), 0);
	const fuera = stats.reduce((acc, stat) => acc + (stat.portero_inferioridad_fuera || 0), 0);
	const bloqueo = stats.reduce((acc, stat) => acc + (stat.portero_inferioridad_bloqueo || 0), 0);
	const evitados = paradas + fuera + bloqueo;
	const recibidos = stats.reduce((acc, stat) => acc + (stat.portero_goles_hombre_menos || 0), 0);
	const total = evitados + recibidos;
	const eficiencia = total > 0 ? ((evitados / total) * 100).toFixed(1) : "0.0";

	return {
		evitados,
		recibidos,
		paradas,
		fuera,
		bloqueo,
		total,
		eficiencia: Number.parseFloat(eficiencia)
	};
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
