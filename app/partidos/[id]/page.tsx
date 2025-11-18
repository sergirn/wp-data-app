import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { notFound } from "next/navigation";
import type { Match, MatchStats, Player, Club } from "@/lib/types";
import { DeleteMatchButton } from "@/components/delete-match-button";
import { MatchExportButton } from "@/components/match-export-button";
import { getCurrentProfile } from "@/lib/auth";

interface MatchWithStats extends Match {
	match_stats: (MatchStats & { players: Player })[];
	clubs: Club;
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const profile = await getCurrentProfile();
	const supabase = await createClient();

	const { data: match, error } = await supabase
		.from("matches")
		.select(
			`
      *,
      clubs (*),
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

	const matchDate = new Date(match.match_date);
	const result = match.home_score > match.away_score ? "Victoria" : match.home_score < match.away_score ? "Derrota" : "Empate";
	const resultColor =
		result === "Victoria"
			? "bg-green-500/10 text-green-700 dark:text-green-300"
			: result === "Derrota"
			? "bg-red-500/10 text-red-700 dark:text-red-300"
			: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";

	const fieldPlayersStats = match.match_stats
		.filter((stat: any) => !stat.players.is_goalkeeper)
		.sort((a: any, b: any) => a.players.number - b.players.number);

	const goalkeepersStats = match.match_stats
		.filter((stat: any) => stat.players.is_goalkeeper)
		.sort((a: any, b: any) => a.players.number - b.players.number);

	const teamTotals = calculateTeamTotals(match.match_stats);

	const players = match.match_stats.map((s: any) => s.players);
	const stats = match.match_stats;

	const canEdit = profile?.role === "admin" || profile?.role === "coach";

	const clubName = match.clubs?.short_name || match.clubs?.name || "Nuestro Equipo";

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/partidos">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a Partidos
					</Link>
				</Button>

				<Card>
					<CardHeader>
						<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<CardTitle className="text-2xl">
										{clubName} vs {match.opponent}
									</CardTitle>
									<span className={`text-sm font-semibold px-3 py-1 rounded-full ${resultColor}`}>{result}</span>
								</div>
								<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
							<div className="flex items-center gap-4">
								<div className="text-center">
									<p className="text-4xl font-bold">{match.home_score}</p>
									<p className="text-xs text-muted-foreground">{clubName}</p>
								</div>
								<div className="text-3xl font-bold text-muted-foreground">-</div>
								<div className="text-center">
									<p className="text-4xl font-bold">{match.away_score}</p>
									<p className="text-xs text-muted-foreground">{match.opponent}</p>
								</div>
							</div>
						</div>
					</CardHeader>
					{match.notes && (
						<CardContent>
							<p className="text-sm text-muted-foreground">
								<span className="font-semibold">Notas:</span> {match.notes}
							</p>
						</CardContent>
					)}
				</Card>
			</div>

			{/* Team Totals */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Totales del Equipo</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center p-4 bg-blue-500/10 rounded-lg">
							<p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{teamTotals.goles}</p>
							<p className="text-sm text-muted-foreground">Goles</p>
						</div>
						<div className="text-center p-4 bg-green-500/10 rounded-lg">
							<p className="text-3xl font-bold text-green-700 dark:text-green-300">{teamTotals.tiros}</p>
							<p className="text-sm text-muted-foreground">Tiros</p>
						</div>
						<div className="text-center p-4 bg-orange-500/10 rounded-lg">
							<p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{teamTotals.faltas}</p>
							<p className="text-sm text-muted-foreground">Faltas</p>
						</div>
						<div className="text-center p-4 bg-purple-500/10 rounded-lg">
							<p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{teamTotals.asistencias}</p>
							<p className="text-sm text-muted-foreground">Asistencias</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Field Players Stats */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Estadísticas - Jugadores de Campo</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						{fieldPlayersStats.map((stat: any) => (
							<PlayerStatsDisplay key={stat.id} stat={stat} player={stat.players} />
						))}
					</div>
				</CardContent>
			</Card>

			{/* Goalkeepers Stats */}
			{goalkeepersStats.length > 0 && (
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Estadísticas - Porteros</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							{goalkeepersStats.map((stat: any) => (
								<GoalkeeperStatsDisplay key={stat.id} stat={stat} player={stat.players} />
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<div className="flex justify-between items-center gap-4">
				<MatchExportButton match={match} players={players} stats={stats} />
				<div className="flex gap-2">
					{canEdit && (
						<Button asChild>
							<Link href={`/nuevo-partido?matchId=${match.id}`}>
								<Edit className="mr-2 h-4 w-4" />
								Editar Partido
							</Link>
						</Button>
					)}
					{canEdit && <DeleteMatchButton matchId={match.id} />}
				</div>
			</div>
		</main>
	);
}

function calculateTeamTotals(stats: any[]) {
	return stats.reduce(
		(acc, stat) => ({
			goles: acc.goles + (stat.goles_totales || 0),
			tiros: acc.tiros + (stat.tiros_totales || 0),
			faltas:
				acc.faltas +
				(stat.faltas_exp_3_int || 0) +
				(stat.faltas_exp_3_bruta || 0) +
				(stat.faltas_penalti || 0) +
				(stat.faltas_contrafaltas || 0),
			asistencias: acc.asistencias + (stat.acciones_asistencias || 0)
		}),
		{ goles: 0, tiros: 0, faltas: 0, asistencias: 0 }
	);
}

function PlayerStatsDisplay({ stat, player }: { stat: MatchStats; player: Player }) {
	const hasStats =
		stat.goles_totales > 0 ||
		stat.tiros_totales > 0 ||
		stat.faltas_exp_3_int > 0 ||
		stat.faltas_exp_3_bruta > 0 ||
		stat.faltas_penalti > 0 ||
		stat.faltas_contrafaltas > 0 ||
		stat.acciones_asistencias > 0 ||
		stat.acciones_bloqueo > 0;

	if (!hasStats) {
		return (
			<div className="border rounded-lg p-4 bg-muted/30">
				<div className="flex items-center gap-3 mb-2">
					<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
						<span className="text-primary-foreground font-bold">{player.number}</span>
					</div>
					<h3 className="font-semibold text-lg">{player.name}</h3>
				</div>
				<p className="text-sm text-muted-foreground">Sin estadísticas registradas</p>
			</div>
		);
	}

	return (
		<div className="border rounded-lg p-4">
			<div className="flex items-center gap-3 mb-4">
				<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
					<span className="text-primary-foreground font-bold">{player.number}</span>
				</div>
				<h3 className="font-semibold text-lg">{player.name}</h3>
			</div>

			<div className="space-y-4">
				{/* Goals */}
				{stat.goles_totales > 0 && (
					<div>
						<h4 className="font-semibold text-sm bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded mb-2">
							GOLES ({stat.goles_totales})
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
							{stat.goles_boya_cada > 0 && <StatBadge label="Boya/Cada" value={stat.goles_boya_cada} />}
							{stat.goles_hombre_mas > 0 && <StatBadge label="Hombre +" value={stat.goles_hombre_mas} />}
							{stat.goles_lanzamiento > 0 && <StatBadge label="Lanzamiento" value={stat.goles_lanzamiento} />}
							{stat.goles_dir_mas_5m > 0 && <StatBadge label="Dir +5m" value={stat.goles_dir_mas_5m} />}
							{stat.goles_contraataque > 0 && <StatBadge label="Contraataque" value={stat.goles_contraataque} />}
							{stat.goles_penalti_juego > 0 && <StatBadge label="Penalti" value={stat.goles_penalti_juego} />}
							{stat.goles_corner > 0 && <StatBadge label="Corner" value={stat.goles_corner} />}
						</div>
					</div>
				)}

				{/* Shots */}
				{stat.tiros_totales > 0 && (
					<div>
						<h4 className="font-semibold text-sm bg-green-500/10 text-green-700 dark:text-green-300 px-3 py-1.5 rounded mb-2">
							TIROS ({stat.tiros_totales})
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
							{stat.tiros_fuera > 0 && <StatBadge label="Fuera" value={stat.tiros_fuera} />}
							{stat.tiros_parados > 0 && <StatBadge label="Parados" value={stat.tiros_parados} />}
							{stat.tiros_bloqueado > 0 && <StatBadge label="Bloqueado" value={stat.tiros_bloqueado} />}
						</div>
					</div>
				)}

				{/* Fouls */}
				{(stat.faltas_exp_3_int > 0 || stat.faltas_exp_3_bruta > 0 || stat.faltas_penalti > 0 || stat.faltas_contrafaltas > 0) && (
					<div>
						<h4 className="font-semibold text-sm bg-orange-500/10 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded mb-2">
							FALTAS
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
							{stat.faltas_exp_3_int > 0 && <StatBadge label="Exp 3º Int" value={stat.faltas_exp_3_int} />}
							{stat.faltas_exp_3_bruta > 0 && <StatBadge label="Exp 3º Bruta" value={stat.faltas_exp_3_bruta} />}
							{stat.faltas_penalti > 0 && <StatBadge label="Penalti" value={stat.faltas_penalti} />}
							{stat.faltas_contrafaltas > 0 && <StatBadge label="Contrafaltas" value={stat.faltas_contrafaltas} />}
						</div>
					</div>
				)}

				{/* Actions */}
				{(stat.acciones_asistencias > 0 || stat.acciones_bloqueo > 0 || stat.acciones_recuperacion > 0 || stat.acciones_rebote > 0) && (
					<div>
						<h4 className="font-semibold text-sm bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded mb-2">
							ACCIONES
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
							{stat.acciones_asistencias > 0 && <StatBadge label="Asistencias" value={stat.acciones_asistencias} />}
							{stat.acciones_bloqueo > 0 && <StatBadge label="Bloqueo" value={stat.acciones_bloqueo} />}
							{stat.acciones_recuperacion > 0 && <StatBadge label="Recuperación" value={stat.acciones_recuperacion} />}
							{stat.acciones_rebote > 0 && <StatBadge label="Rebote" value={stat.acciones_rebote} />}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function GoalkeeperStatsDisplay({ stat, player }: { stat: MatchStats; player: Player }) {
	const hasStats =
		stat.goles_totales > 0 ||
		stat.portero_paradas_totales > 0 ||
		stat.portero_tiros_parado > 0 ||
		stat.portero_acciones_gol_recibido > 0 ||
		stat.acciones_asistencias > 0;

	if (!hasStats) {
		return (
			<div className="border rounded-lg p-4 bg-muted/30">
				<div className="flex items-center gap-3 mb-2">
					<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
						<span className="text-primary-foreground font-bold">{player.number}</span>
					</div>
					<h3 className="font-semibold text-lg">{player.name}</h3>
				</div>
				<p className="text-sm text-muted-foreground">Sin estadísticas registradas</p>
			</div>
		);
	}

	return (
		<div className="border rounded-lg p-4">
			<div className="flex items-center gap-3 mb-4">
				<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
					<span className="text-primary-foreground font-bold">{player.number}</span>
				</div>
				<h3 className="font-semibold text-lg">{player.name}</h3>
			</div>

			<div className="space-y-4">
				{/* Goals */}
				{stat.goles_totales > 0 && (
					<div>
						<h4 className="font-semibold text-sm bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded mb-2">
							GOLES ({stat.goles_totales})
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
							{stat.portero_goles_boya_parada > 0 && <StatBadge label="Boya/Parada" value={stat.portero_goles_boya_parada} />}
							{stat.portero_goles_lanzamiento > 0 && <StatBadge label="Lanzamiento" value={stat.portero_goles_lanzamiento} />}
							{stat.portero_goles_dir_mas_5m > 0 && <StatBadge label="Dir +5m" value={stat.portero_goles_dir_mas_5m} />}
							{stat.goles_contraataque > 0 && <StatBadge label="Contraataque" value={stat.goles_contraataque} />}
							{stat.goles_penalti_juego > 0 && <StatBadge label="Penalti" value={stat.goles_penalti_juego} />}
						</div>
					</div>
				)}

				{/* Paradas (Saves) */}
				{(stat.portero_paradas_totales > 0 || stat.portero_tiros_parado > 0 || stat.portero_acciones_gol_recibido > 0) && (
					<div>
						<h4 className="font-semibold text-sm bg-green-500/10 text-green-700 dark:text-green-300 px-3 py-1.5 rounded mb-2">
							PARADAS Y GOLES
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
							{stat.portero_tiros_parado > 0 && <StatBadge label="Parado" value={stat.portero_tiros_parado} />}
							{stat.portero_paradas_totales > 0 && <StatBadge label="Totales" value={stat.portero_paradas_totales} />}
							{stat.portero_tiros_parada_recup > 0 && <StatBadge label="Parada Recup" value={stat.portero_tiros_parada_recup} />}
							{stat.tiros_corner > 0 && <StatBadge label="Corner" value={stat.tiros_corner} />}
							{stat.portero_paradas_penalti_parado > 0 && (
								<StatBadge label="Penalti Parado" value={stat.portero_paradas_penalti_parado} />
							)}
							{stat.portero_acciones_gol_recibido > 0 && (
								<StatBadge label="Goles Recibidos" value={stat.portero_acciones_gol_recibido} />
							)}
						</div>
					</div>
				)}

				{/* Fouls */}
				{(stat.portero_faltas_exp_3_int > 0 || stat.faltas_penalti > 0 || stat.portero_goles_penalti_encajado > 0) && (
					<div>
						<h4 className="font-semibold text-sm bg-orange-500/10 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded mb-2">
							FALTAS
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
							{stat.portero_faltas_exp_3_int > 0 && <StatBadge label="Exp 3º Int" value={stat.portero_faltas_exp_3_int} />}
							{stat.faltas_penalti > 0 && <StatBadge label="Penalti" value={stat.faltas_penalti} />}
							{stat.portero_goles_penalti_encajado > 0 && (
								<StatBadge label="Penalti Encajado" value={stat.portero_goles_penalti_encajado} />
							)}
						</div>
					</div>
				)}

				{/* Actions */}
				{(stat.portero_acciones_rebote > 0 || stat.acciones_asistencias > 0 || stat.acciones_recuperacion > 0) && (
					<div>
						<h4 className="font-semibold text-sm bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded mb-2">
							ACCIONES
						</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
							{stat.portero_acciones_rebote > 0 && <StatBadge label="Rebote" value={stat.portero_acciones_rebote} />}
							{stat.acciones_asistencias > 0 && <StatBadge label="Asistencias" value={stat.acciones_asistencias} />}
							{stat.acciones_recuperacion > 0 && <StatBadge label="Recuperación" value={stat.acciones_recuperacion} />}
							{stat.portero_acciones_perdida_pos > 0 && <StatBadge label="Pérdida de Pos" value={stat.portero_acciones_perdida_pos} />}
							{stat.acciones_exp_provocada > 0 && <StatBadge label="Exp Provocada" value={stat.acciones_exp_provocada} />}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function StatBadge({ label, value }: { label: string; value: number }) {
	return (
		<div className="bg-muted px-3 py-1.5 rounded">
			<span className="text-muted-foreground">{label}:</span> <span className="font-semibold ml-1">{value}</span>
		</div>
	);
}
