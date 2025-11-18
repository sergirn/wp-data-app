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
			<Card className="hover:bg-muted/50 transition-colors cursor-pointer relative">
				<CardContent className="p-4 sm:p-6">
					<div className="flex flex-col gap-4">
						{/* Cabecera */}
						<div className="flex-1">
							<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
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

						{/* ============================= */}
						{/* MARCADOR + ACCIONES */}
						{/* ============================= */}

						<div
							className="
							flex flex-col sm:flex-row
							sm:items-center sm:justify-end
							gap-3 sm:gap-4
							pt-3 sm:pt-0
							border-t sm:border-t-0
							relative
						"
						>
							{/* Marcador */}
							<div className="flex items-center gap-3 sm:gap-4 mx-auto sm:mx-0">
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

							{/* === BOTONES EDIT / DELETE === */}
							{canEdit && (
								<>
									{/* DESKTOP → arriba-derecha */}
									<div
										onClick={(e) => e.stopPropagation()}
										className="
											hidden sm:flex
											gap-2
											absolute top-3 right-3
											z-20
										"
									>
										{/* EDITAR (UX EXACTO) */}
										<Button asChild className="h-10 px-3 flex items-center gap-2">
											<Link href={`/nuevo-partido?matchId=${match.id}`} onClick={(e) => e.stopPropagation()}>
												<Edit className="h-4 w-4" />
												Editar Partido
											</Link>
										</Button>

										{/* ELIMINAR */}
										<div
											onClick={(e) => e.stopPropagation()}
											className="
												h-10 px-3 flex items-center justify-center rounded-md
												bg-red-500/10 hover:bg-red-500/20
												text-red-600 cursor-pointer transition
											"
										>
											<DeleteMatchButton matchId={match.id} />
										</div>
									</div>

									{/* MOBILE → debajo del marcador */}
									<div onClick={(e) => e.stopPropagation()} className="flex sm:hidden justify-center gap-3 mt-2">
										{/* EDITAR */}
										<Button
											asChild
											className="
												flex-1 max-w-[160px]
												h-10 flex items-center justify-center gap-2
											"
										>
											<Link href={`/nuevo-partido?matchId=${match.id}`} onClick={(e) => e.stopPropagation()}>
												<Edit className="h-4 w-4" />
												Editar
											</Link>
										</Button>

										{/* ELIMINAR */}
										<div
											onClick={(e) => e.stopPropagation()}
											className="
												flex-1 max-w-[160px]
												h-10 rounded-md flex items-center justify-center
												bg-red-500/10 hover:bg-red-500/20
												text-red-600 cursor-pointer
											"
										>
											<DeleteMatchButton matchId={match.id} />
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
