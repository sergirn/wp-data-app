"use client";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import type { Match } from "@/lib/types";
import { useClub } from "@/lib/club-context";
import { useProfile } from "@/lib/profile-context";
import { useEffect, useState } from "react";
import { DeleteMatchButton } from "@/components/delete-match-button";

export default function MatchesPage() {
	const { currentClub } = useClub();
	const { profile } = useProfile();
	const [matches, setMatches] = useState<Match[]>([]);
	const [loading, setLoading] = useState(true);

	const canEdit = profile?.role === "admin" || profile?.role === "coach";

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			setMatches([]);

			if (!currentClub) {
				setLoading(false);
				return;
			}

			try {
				const supabase = createClient();
				if (!supabase) {
					setLoading(false);
					return;
				}

				const { data: matchesData, error } = await supabase
					.from("matches")
					.select("*")
					.eq("club_id", currentClub.id)
					.order("match_date", { ascending: false });

				if (error) throw error;

				setMatches(matchesData || []);
			} catch (error) {
				console.error("[v0] Error fetching matches:", error);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [currentClub]);

	if (loading) {
		return (
			<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
				<div className="text-center py-12">
					<p className="text-muted-foreground">Cargando partidos...</p>
				</div>
			</main>
		);
	}

	return (
		<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Partidos</h1>
					<p className="text-sm sm:text-base text-muted-foreground">Historial de partidos de {currentClub?.short_name || ""}</p>
				</div>
				{canEdit && (
					<Button asChild className="w-full sm:w-auto">
						<Link href="/nuevo-partido">
							<Plus className="mr-2 h-4 w-4" />
							Nuevo Partido
						</Link>
					</Button>
				)}
			</div>

			{matches && matches.length > 0 ? (
				<div className="grid gap-3 sm:gap-4">
					{matches.map((match) => (
						<MatchCard key={match.id} match={match} clubName={currentClub?.short_name || ""} canEdit={canEdit} />
					))}
				</div>
			) : (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<p className="text-muted-foreground mb-4 text-sm sm:text-base text-center">
							No hay partidos registrados para {currentClub?.short_name}
						</p>
						{canEdit && (
							<Button asChild>
								<Link href="/nuevo-partido">
									<Plus className="mr-2 h-4 w-4" />
									Crear Primer Partido
								</Link>
							</Button>
						)}
					</CardContent>
				</Card>
			)}
		</main>
	);
}

function MatchCard({ match, clubName, canEdit }: { match: Match; clubName: string; canEdit: boolean }) {
	const matchDate = new Date(match.match_date);
	const result = match.home_score > match.away_score ? "Victoria" : match.home_score < match.away_score ? "Derrota" : "Empate";

	const resultColor =
		result === "Victoria"
			? "text-green-600 dark:text-green-400"
			: result === "Derrota"
			? "text-red-600 dark:text-red-400"
			: "text-yellow-600 dark:text-yellow-400";

	return (
		<Link href={`/partidos/${match.id}`}>
			<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
				<CardContent className="p-4 sm:p-6">
					{/* GRID RESPONSIVE */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-start">
						{/* 📌 INFO DEL PARTIDO */}
						<div className="sm:col-span-2">
							<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
								<h3 className="text-lg sm:text-xl font-bold">
									{clubName} vs {match.opponent}
								</h3>
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

								{match.location && <span className="hidden sm:inline">• {match.location}</span>}
								{match.location && <span className="sm:hidden">{match.location}</span>}

								{match.season && <span className="hidden sm:inline">• {match.season}</span>}
								{match.season && <span className="sm:hidden">{match.season}</span>}

								{match.jornada && <span className="hidden sm:inline">• Jornada {match.jornada}</span>}
								{match.jornada && <span className="sm:hidden">J{match.jornada}</span>}
							</div>
						</div>

						{/* 📌 MARCADOR */}
						<div className="flex flex-col items-center sm:items-end gap-3">
							{/* marcador */}
							<div className="flex items-center justify-center gap-4">
								<div className="text-center">
									<p className="text-2xl sm:text-3xl font-bold">{match.home_score}</p>
									<p className="text-xs text-muted-foreground truncate max-w-[80px]">{clubName}</p>
								</div>
								<div className="text-xl sm:text-2xl font-bold text-muted-foreground">-</div>
								<div className="text-center">
									<p className="text-2xl sm:text-3xl font-bold">{match.away_score}</p>
									<p className="text-xs text-muted-foreground truncate max-w-[80px]">{match.opponent}</p>
								</div>
							</div>

							{/* 📌 BOTONES (siempre debajo del marcador) */}
							{canEdit && (
								<div onClick={(e) => e.stopPropagation()} className="flex gap-2 mt-2 sm:justify-end">
									{/* Editar */}
									<Link
										href={`/nuevo-partido?matchId=${match.id}`}
										onClick={(e) => e.stopPropagation()}
										className="p-2 rounded-md bg-muted hover:bg-muted/70 transition flex items-center justify-center"
										title="Editar partido"
									>
										<Edit className="w-4 h-4 text-muted-foreground" />
									</Link>

									{/* Eliminar */}
									<div
										onClick={(e) => e.stopPropagation()}
										className="p-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-600 transition flex items-center justify-center cursor-pointer"
										title="Eliminar partido"
									>
										<DeleteMatchButton matchId={match.id} />
									</div>
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
