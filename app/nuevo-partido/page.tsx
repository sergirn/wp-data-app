"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatInput } from "@/components/stat-input";
import type { Player, MatchStats, Profile, Match } from "@/lib/types";
import { Loader2, Save, AlertCircle, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlayerSubstitutionDialog } from "@/components/player-substitution-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MatchEditParams {
	matchId?: number;
	isEditing?: boolean;
}

export default function NewMatchPage({ searchParams }: { searchParams: Promise<MatchEditParams> }) {
	const router = useRouter();
	const supabase = createClient();
	const [allPlayers, setAllPlayers] = useState<Player[]>([]);
	const [activePlayerIds, setActivePlayerIds] = useState<number[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
	const [substitutionPlayer, setSubstitutionPlayer] = useState<Player | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [permissionError, setPermissionError] = useState(false);
	const [previousMatches, setPreviousMatches] = useState<Match[]>([]);
	const [loadingLineup, setLoadingLineup] = useState(false);
	const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
	const [existingMatch, setExistingMatch] = useState<Match | null>(null);

	const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
	const [opponent, setOpponent] = useState("");
	const [location, setLocation] = useState("");
	const [isHome, setIsHome] = useState(true);
	const [season, setSeason] = useState(getCurrentSeason());
	const [jornada, setJornada] = useState(1);
	const [notes, setNotes] = useState("");

	const [stats, setStats] = useState<Record<number, Partial<MatchStats>>>({});

	const calculateScores = (playerStats: Record<number, Partial<MatchStats>>) => {
		let homeGoals = 0;
		let awayGoals = 0;

		Object.entries(playerStats).forEach(([playerId, playerStat]) => {
			const player = allPlayers.find((p) => p.id === Number(playerId));

			if (player?.is_goalkeeper) {
				const goalkeeperGoals =
					(playerStat.portero_goles_boya_parada || 0) +
					(playerStat.portero_goles_hombre_menos || 0) +
					(playerStat.portero_goles_dir_mas_5m || 0) +
					(playerStat.portero_goles_contraataque || 0) +
					(playerStat.portero_goles_penalti || 0);

				awayGoals += goalkeeperGoals;
			} else {
				homeGoals += playerStat.goles_totales || 0;
			}
		});

		return { homeGoals, awayGoals };
	};

	useEffect(() => {
		async function initializeFromParams() {
			const params = await searchParams;

			if (params.matchId) {
				setEditingMatchId(Number(params.matchId));
			}

			await checkPermissions();
			await loadPlayers();

			if (params.matchId) {
				await loadExistingMatch(Number(params.matchId));
			} else {
				// Initialize with 14 empty players only if creating new match
				initializeNewMatch();
			}

			loadPreviousMatches();
			setLoading(false);
		}
		initializeFromParams();
	}, []);

	const initializeNewMatch = () => {
		if (allPlayers.length > 0) {
			const initialActiveIds = allPlayers.slice(0, 14).map((p) => p.id);
			setActivePlayerIds(initialActiveIds);

			const initialStats: Record<number, Partial<MatchStats>> = {};
			initialActiveIds.forEach((playerId) => {
				initialStats[playerId] = createEmptyStats(playerId);
			});
			setStats(initialStats);
		}
	};

	const checkPermissions = async () => {
		if (!supabase) {
			setPermissionError(true);
			return;
		}

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			router.push("/auth/login");
			return;
		}

		const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

		if (!profileData || (profileData.role !== "admin" && profileData.role !== "coach")) {
			setPermissionError(true);
			return;
		}

		setProfile(profileData);
	};

	const loadPreviousMatches = async () => {
		if (!supabase) return;

		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) return;

		const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
		if (!profileData?.club_id) return;

		const { data: matches } = await supabase
			.from("matches")
			.select("id, match_date, opponent, season")
			.eq("club_id", profileData.club_id)
			.order("match_date", { ascending: false })
			.limit(10);

		if (matches) {
			setPreviousMatches(matches);
		}
	};

	const loadLineupFromMatch = async (matchId: number) => {
		if (!supabase) return;

		setLoadingLineup(true);
		try {
			const { data: matchStats } = await supabase.from("match_stats").select("player_id").eq("match_id", matchId);

			if (matchStats && matchStats.length > 0) {
				const playerIds = matchStats.map((stat) => stat.player_id);
				const validPlayerIds = playerIds.filter((id) => allPlayers.some((p) => p.id === id));

				setActivePlayerIds(validPlayerIds);

				const initialStats: Record<number, Partial<MatchStats>> = {};
				validPlayerIds.forEach((playerId) => {
					initialStats[playerId] = createEmptyStats(playerId);
				});
				setStats(initialStats);
			}
		} catch (error) {
			console.error("Error loading lineup:", error);
			alert("Error al cargar la convocatoria");
		} finally {
			setLoadingLineup(false);
		}
	};

	const loadPlayers = async () => {
		if (!supabase) {
			return;
		}

		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) {
			console.log("[v0] No user found");
			return;
		}

		const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
		console.log("[v0] Profile data:", profileData);

		if (!profileData?.club_id) {
			console.log("[v0] No club_id in profile");
			return;
		}

		console.log("[v0] Loading players for club_id:", profileData.club_id);
		const playersQuery = supabase.from("players").select("*").eq("club_id", profileData.club_id).order("number");

		const { data, error } = await playersQuery;

		console.log("[v0] Players loaded:", data?.length, "Error:", error);

		if (error) {
			console.error("[v0] Error loading players:", error);
			return;
		}

		if (data && data.length > 0) {
			setAllPlayers(data);
		} else {
			console.log("[v0] No players found for club");
			setAllPlayers([]);
		}
	};

	const createEmptyStats = (playerId: number): Partial<MatchStats> => ({
		player_id: playerId,
		match_id: 0,
		goles_totales: 0,
		goles_boya_jugada: 0,
		goles_hombre_mas: 0,
		goles_lanzamiento: 0,
		goles_dir_mas_5m: 0,
		goles_contraataque: 0,
		goles_penalti_anotado: 0,
		tiros_totales: 0,
		tiros_penalti_fallado: 0,
		tiros_corner: 0,
		tiros_fuera: 0,
		tiros_parados: 0,
		tiros_bloqueado: 0,
		tiros_eficiencia: 0,
		faltas_exp_20_1c1: 0,
		faltas_exp_20_boya: 0,
		faltas_penalti: 0,
		faltas_contrafaltas: 0,
		acciones_bloqueo: 0,
		acciones_asistencias: 0,
		acciones_recuperacion: 0,
		acciones_rebote: 0,
		acciones_exp_provocada: 0,
		acciones_penalti_provocado: 0,
		acciones_recibir_gol: 0,
		portero_goles_boya_parada: 0,
		portero_goles_hombre_menos: 0,
		portero_goles_dir_mas_5m: 0,
		portero_goles_contraataque: 0,
		portero_goles_penalti: 0,
		portero_paradas_totales: 0,
		portero_tiros_parada_recup: 0,
		portero_paradas_fuera: 0,
		portero_paradas_penalti_parado: 0,
		portero_acciones_perdida_pos: 0,
		goles_boya_cada: 0,
		goles_penalti_juego: 0,
		goles_penalti_fallo: 0,
		goles_corner: 0,
		goles_fuera: 0,
		goles_parados: 0,
		goles_bloqueado: 0,
		goles_eficiencia: 0,
		tiros_boya_cada: 0,
		tiros_hombre_mas: 0,
		tiros_lanzamiento: 0,
		tiros_dir_mas_5m: 0,
		tiros_contraataque: 0,
		tiros_penalti_juego: 0,
		faltas_exp_3_int: 0,
		faltas_exp_3_bruta: 0,
		acciones_perdida_poco: 0,
		portero_goles_lanzamiento: 0,
		portero_goles_penalti_encajado: 0,
		portero_tiros_parado: 0,
		portero_faltas_exp_3_int: 0,
		portero_acciones_rebote: 0,
		portero_acciones_gol_recibido: 0,
		portero_paradas_pedida: 0,
		portero_exp_provocada: 0,
		portero_penalti_provocado: 0,
		portero_recibir_gol: 0
	});

	const hasStats = (playerId: number): boolean => {
		const playerStats = stats[playerId];
		if (!playerStats) return false;

		return Object.entries(playerStats).some(([key, value]) => {
			if (key === "player_id" || key === "match_id") return false;
			return typeof value === "number" && value > 0;
		});
	};

	const getAvailablePlayers = (isGoalkeeper: boolean): Player[] => {
		return allPlayers.filter((player) => player.is_goalkeeper === isGoalkeeper && !activePlayerIds.includes(player.id));
	};

	const handleSubstitution = (oldPlayerId: number, newPlayerId: number) => {
		setActivePlayerIds((prev) => prev.filter((id) => id !== oldPlayerId).concat(newPlayerId));

		setStats((prev) => {
			const newStats = { ...prev };
			delete newStats[oldPlayerId];
			newStats[newPlayerId] = createEmptyStats(newPlayerId);
			return newStats;
		});
	};

	const loadExistingMatch = async (matchId: number) => {
		if (!supabase) return;

		try {
			const { data: match, error } = await supabase.from("matches").select("*").eq("id", matchId).single();

			if (error || !match) {
				console.error("Error loading match:", error);
				return;
			}

			setExistingMatch(match);
			setMatchDate(match.match_date);
			setOpponent(match.opponent);
			setLocation(match.location || "");
			setIsHome(match.is_home);
			setSeason(match.season || getCurrentSeason());
			setJornada(match.jornada || 1);
			setNotes(match.notes || "");

			const { data: matchStats, error: statsError } = await supabase.from("match_stats").select("*").eq("match_id", matchId);

			if (statsError) {
				console.error("Error loading match stats:", statsError);
				return;
			}

			if (matchStats && matchStats.length > 0) {
				const playerIds = matchStats.map((stat) => stat.player_id);
				setActivePlayerIds(playerIds);

				const statsMap: Record<number, Partial<MatchStats>> = {};
				matchStats.forEach((stat) => {
					const emptyTemplate = createEmptyStats(stat.player_id);
					// Merge: keep loaded values, fill missing fields with template
					statsMap[stat.player_id] = { ...emptyTemplate, ...stat };
					console.log(`[v0] Loaded stats for player ${stat.player_id}:`, statsMap[stat.player_id]);
				});

				setStats(statsMap);
				console.log("[v0] All match stats loaded successfully");
			}
		} catch (error) {
			console.error("Error loading existing match:", error);
		}
	};

	const updateStat = (playerId: number, field: keyof MatchStats, value: number) => {
		setStats((prev) => {
			const currentStats = prev[playerId] || createEmptyStats(playerId);
			const safeValue = safeNumber(value);
			const newStats = { ...currentStats, [field]: safeValue };

			const player = allPlayers.find((p) => p.id === playerId);

			if (player?.is_goalkeeper) {
				const goalkeeperSaveCategories: (keyof MatchStats)[] = [
					"portero_tiros_parada_recup",
					"portero_paradas_fuera",
					"portero_paradas_penalti_parado",
					"portero_paradas_hombre_menos"
				];

				if (field.startsWith("portero_") && (field.includes("parada") || field.includes("paradas"))) {
					newStats.portero_paradas_totales = goalkeeperSaveCategories.reduce((sum, cat) => {
						return sum + safeNumber(newStats[cat] as number);
					}, 0) as any;
				}
			} else {
				const goalCategories: (keyof MatchStats)[] = [
					"goles_boya_jugada",
					"goles_hombre_mas",
					"goles_lanzamiento",
					"goles_dir_mas_5m",
					"goles_contraataque",
					"goles_penalti_anotado"
				];

				const shotCategories: (keyof MatchStats)[] = [
					"tiros_hombre_mas",
					"tiros_penalti_fallado",
					"tiros_corner",
					"tiros_fuera",
					"tiros_parados",
					"tiros_bloqueado"
				];

				if (field.startsWith("goles_") || field.startsWith("tiros_")) {
					newStats.goles_totales = goalCategories.reduce((sum, cat) => {
						return sum + safeNumber(newStats[cat] as number);
					}, 0) as any;

					const totalMissedShots = shotCategories.reduce((sum, cat) => {
						return sum + safeNumber(newStats[cat] as number);
					}, 0);

					newStats.tiros_totales = (safeNumber(newStats.goles_totales as number) + totalMissedShots) as any;

					const totalShots = safeNumber(newStats.tiros_totales as number);
					const totalGoals = safeNumber(newStats.goles_totales as number);

					if (totalShots > 0) {
						newStats.tiros_eficiencia = Math.round((totalGoals / totalShots) * 100) as any;
						newStats.goles_eficiencia = newStats.tiros_eficiencia as any;
					} else {
						newStats.tiros_eficiencia = 0 as any;
						newStats.goles_eficiencia = 0 as any;
					}
				}
			}

			return {
				...prev,
				[playerId]: newStats
			};
		});
	};

	const handleSave = async () => {
		if (!opponent.trim()) {
			alert("Por favor, introduce el nombre del rival");
			return;
		}

		if (!profile || !profile.club_id) {
			alert("Error: No se pudo obtener la información del club");
			return;
		}

		setSaving(true);

		try {
			const { homeGoals, awayGoals } = calculateScores(stats);

			if (editingMatchId && existingMatch) {
				const { error: matchError } = await supabase
					.from("matches")
					.update({
						match_date: matchDate,
						opponent,
						location: location || null,
						home_score: homeGoals,
						away_score: awayGoals,
						is_home: isHome,
						season: season || null,
						jornada: jornada || null,
						notes: notes || null
					})
					.eq("id", editingMatchId);

				if (matchError) throw matchError;

				await supabase.from("match_stats").delete().eq("match_id", editingMatchId);

				const statsToInsert = activePlayerIds.map((playerId) => ({
					...stats[playerId],
					match_id: editingMatchId
				}));

				const { error: statsError } = await supabase.from("match_stats").insert(statsToInsert);

				if (statsError) throw statsError;

				router.push(`/partidos/${editingMatchId}`);
			} else {
				const { data: matchData, error: matchError } = await supabase
					.from("matches")
					.insert({
						match_date: matchDate,
						opponent,
						location: location || null,
						home_score: homeGoals,
						away_score: awayGoals,
						is_home: isHome,
						season: season || null,
						jornada: jornada || null,
						notes: notes || null,
						club_id: profile.club_id
					})
					.select()
					.single();

				if (matchError) throw matchError;

				const statsToInsert = activePlayerIds.map((playerId) => ({
					...stats[playerId],
					match_id: matchData.id
				}));

				const { error: statsError } = await supabase.from("match_stats").insert(statsToInsert);

				if (statsError) throw statsError;

				router.push(`/partidos/${matchData.id}`);
			}
		} catch (error) {
			console.error("Error saving match:", error);
			alert("Error al guardar el partido");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (permissionError) {
		return (
			<main className="container mx-auto px-4 py-8">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						No tienes permisos para crear partidos. Solo los administradores y entrenadores pueden acceder a esta página.
					</AlertDescription>
				</Alert>
				<div className="mt-4">
					<Button onClick={() => router.back()}>Volver al Inicio</Button>
				</div>
			</main>
		);
	}

	const activePlayers = allPlayers.filter((p) => activePlayerIds.includes(p.id));
	const fieldPlayers = activePlayers.filter((p) => !p.is_goalkeeper);
	const goalkeepers = activePlayers.filter((p) => p.is_goalkeeper);

	const { homeGoals, awayGoals } = calculateScores(stats);

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<h1 className="text-3xl md:text-4xl font-bold mb-2">{editingMatchId ? "Editar Partido" : "Nuevo Partido"}</h1>
				<p className="text-muted-foreground text-lg">
					{editingMatchId ? "Actualiza las estadísticas del partido" : "Registra las estadísticas del partido"}
				</p>
				<div className="flex items-center gap-3 mt-3">
					<Badge variant="secondary" className="text-sm">
						Convocatoria: {activePlayerIds.length} jugadores
					</Badge>
					{previousMatches.length > 0 && (
						<Select onValueChange={(value) => loadLineupFromMatch(Number(value))} disabled={loadingLineup}>
							<SelectTrigger className="w-[250px]">
								<SelectValue placeholder="Cargar convocatoria anterior" />
							</SelectTrigger>
							<SelectContent>
								{previousMatches.map((match) => (
									<SelectItem key={match.id} value={match.id.toString()}>
										{new Date(match.match_date).toLocaleDateString()} - {match.opponent}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					{loadingLineup && <Loader2 className="h-4 w-4 animate-spin" />}
				</div>
			</div>

			<Tabs defaultValue="info" className="w-full">
				<TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
					<TabsTrigger value="info" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
						<span className="block truncate sm:text-[13px] md:text-sm">
							{window.innerWidth < 640 ? "Info" : "Información de Partido"}
						</span>
					</TabsTrigger>

					<TabsTrigger value="field" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
						<span className="block truncate sm:text-[13px] md:text-sm">
							{window.innerWidth < 640 ? `Campo (${fieldPlayers.length})` : `Jugadores de Campo (${fieldPlayers.length})`}
						</span>
					</TabsTrigger>

					<TabsTrigger value="goalkeepers" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
						<span className="block truncate sm:text-[13px] md:text-sm">
							{window.innerWidth < 640 ? `Porteros (${goalkeepers.length})` : `Porteros (${goalkeepers.length})`}
						</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="info">
					<Card>
						<CardHeader>
							<CardTitle>Información del Partido</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="date">Fecha</Label>
									<Input id="date" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="opponent">Rival *</Label>
									<Input
										id="opponent"
										value={opponent}
										onChange={(e) => setOpponent(e.target.value)}
										placeholder="Nombre del equipo rival"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="location">Ubicación</Label>
									<Input
										id="location"
										value={location}
										onChange={(e) => setLocation(e.target.value)}
										placeholder="Piscina o ciudad"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="home-score">Goles Propios</Label>
									<Input
										id="home-score"
										type="number"
										value={homeGoals}
										readOnly
										className="bg-muted text-center text-lg font-bold"
										title="Se calcula automáticamente sumando los goles de los jugadores"
									/>
									<p className="text-xs text-muted-foreground">Se calcula automáticamente</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor="away-score">Goles Rival</Label>
									<Input
										id="away-score"
										type="number"
										value={awayGoals}
										readOnly
										className="bg-muted text-center text-lg font-bold"
										title="Se calcula automáticamente desde las estadísticas del portero"
									/>
									<p className="text-xs text-muted-foreground">Se calcula desde goles del portero</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor="season">Temporada</Label>
									<Input id="season" value={season} onChange={(e) => setSeason(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="jornada">Jornada</Label>
									<Input
										id="jornada"
										type="number"
										value={jornada}
										onChange={(e) => setJornada(Number.parseInt(e.target.value) || 1)}
										min={1}
									/>
								</div>
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="notes">Notas</Label>
									<Textarea
										id="notes"
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Observaciones del partido..."
										rows={2}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="field">
					<Card>
						<CardHeader>
							<CardTitle>Jugadores de Campo</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{fieldPlayers.map((player) => (
									<div key={player.id} className="relative">
										<Button
											variant="outline"
											className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-primary/10 bg-transparent w-full border-2 hover:border-primary transition-all"
											onClick={() => setSelectedPlayer(player)}
										>
											<div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
												{player.photo_url ? (
													<img
														src={player.photo_url || "/placeholder.svg"}
														alt={player.name}
														className="w-full h-full object-cover"
													/>
												) : (
													<span className="text-primary-foreground font-bold text-lg">{player.number}</span>
												)}
											</div>
											<span className="font-medium text-sm text-center w-full truncate px-1">{player.name}</span>
											<span className="text-xs text-muted-foreground">{safeNumber(stats[player.id]?.goles_totales)} goles</span>
										</Button>
										{!hasStats(player.id) && getAvailablePlayers(false).length > 0 && (
											<Button
												size="sm"
												variant="ghost"
												className="absolute top-1 right-1 h-7 w-7 p-0"
												onClick={(e) => {
													e.stopPropagation();
													setSubstitutionPlayer(player);
												}}
												title="Sustituir jugador"
											>
												<RefreshCw className="h-4 w-4" />
											</Button>
										)}
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="goalkeepers">
					<Card>
						<CardHeader>
							<CardTitle>Porteros</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{goalkeepers.map((player) => (
									<div key={player.id} className="relative">
										<Button
											variant="outline"
											className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-primary/10 bg-transparent w-full border-2 hover:border-primary transition-all"
											onClick={() => setSelectedPlayer(player)}
										>
											<div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
												{player.photo_url ? (
													<img
														src={player.photo_url || "/placeholder.svg"}
														alt={player.name}
														className="w-full h-full object-cover"
													/>
												) : (
													<span className="text-primary-foreground font-bold">{player.number}</span>
												)}
											</div>
											<span className="font-medium text-sm text-center w-full truncate px-1">{player.name}</span>
											<span className="text-xs text-muted-foreground">
												{safeNumber(stats[player.id]?.portero_paradas_totales)} paradas
											</span>
										</Button>
										{!hasStats(player.id) && getAvailablePlayers(true).length > 0 && (
											<Button
												size="sm"
												variant="ghost"
												className="absolute top-1 right-1 h-7 w-7 p-0"
												onClick={(e) => {
													e.stopPropagation();
													setSubstitutionPlayer(player);
												}}
												title="Sustituir jugador"
											>
												<RefreshCw className="h-4 w-4" />
											</Button>
										)}
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{substitutionPlayer && (
				<PlayerSubstitutionDialog
					open={!!substitutionPlayer}
					onOpenChange={(open) => !open && setSubstitutionPlayer(null)}
					currentPlayer={substitutionPlayer}
					availablePlayers={getAvailablePlayers(substitutionPlayer.is_goalkeeper)}
					onSubstitute={(newPlayerId) => {
						handleSubstitution(substitutionPlayer.id, newPlayerId);
						setSubstitutionPlayer(null);
					}}
				/>
			)}

			{selectedPlayer && (
				<Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
					<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
									{selectedPlayer.photo_url ? (
										<img
											src={selectedPlayer.photo_url || "/placeholder.svg"}
											alt={selectedPlayer.name}
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="text-primary-foreground font-bold">{selectedPlayer.number}</span>
									)}
								</div>
								{selectedPlayer.name}
							</DialogTitle>
						</DialogHeader>

						{selectedPlayer.is_goalkeeper ? (
							<GoalkeeperStatsDialog
								player={selectedPlayer}
								stats={stats[selectedPlayer.id] || createEmptyStats(selectedPlayer.id)}
								onUpdate={(field, value) => updateStat(selectedPlayer.id, field, value)}
							/>
						) : (
							<FieldPlayerStatsDialog
								player={selectedPlayer}
								stats={stats[selectedPlayer.id] || createEmptyStats(selectedPlayer.id)}
								onUpdate={(field, value) => updateStat(selectedPlayer.id, field, value)}
							/>
						)}
					</DialogContent>
				</Dialog>
			)}

			<div className="flex justify-end gap-4 mt-6">
				<Button variant="outline" onClick={() => router.back()}>
					Cancelar
				</Button>
				<Button onClick={handleSave} disabled={saving} size="lg">
					{saving ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							{editingMatchId ? "Actualizando..." : "Guardando..."}
						</>
					) : (
						<>
							<Save className="mr-2 h-4 w-4" />
							{editingMatchId ? "Actualizar Partido" : "Guardar Partido"}
						</>
					)}
				</Button>
			</div>
		</main>
	);
}

function FieldPlayerStatsDialog({
	player,
	stats,
	onUpdate
}: {
	player: Player;
	stats: Partial<MatchStats>;
	onUpdate: (field: keyof MatchStats, value: number) => void;
}) {
	return (
		<Tabs defaultValue="goles" className="w-full">
			<TabsList className="grid w-full grid-cols-4 h-auto">
				<TabsTrigger value="goles" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
					Goles
				</TabsTrigger>
				<TabsTrigger value="tiros" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
					Tiros
				</TabsTrigger>
				<TabsTrigger value="faltas" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
					Faltas
				</TabsTrigger>
				<TabsTrigger value="acciones" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
					Acciones
				</TabsTrigger>
			</TabsList>

			<TabsContent value="goles" className="space-y-4 mt-4">
				<p className="text-sm text-muted-foreground mb-4">El total se calcula automáticamente sumando todos los tipos de goles.</p>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField label="Totales" value={safeNumber(stats.goles_totales)} onChange={() => {}} readOnly />
					<StatField label="Boya/Jugada" value={safeNumber(stats.goles_boya_jugada)} onChange={(v) => onUpdate("goles_boya_jugada", v)} />
					<StatField label="Hombre +" value={safeNumber(stats.goles_hombre_mas)} onChange={(v) => onUpdate("goles_hombre_mas", v)} />
					<StatField label="Lanzamiento" value={safeNumber(stats.goles_lanzamiento)} onChange={(v) => onUpdate("goles_lanzamiento", v)} />
					<StatField label="Dir +5m" value={safeNumber(stats.goles_dir_mas_5m)} onChange={(v) => onUpdate("goles_dir_mas_5m", v)} />
					<StatField
						label="Contraataque"
						value={safeNumber(stats.goles_contraataque)}
						onChange={(v) => onUpdate("goles_contraataque", v)}
					/>
					<StatField
						label="Penalti Anotado"
						value={safeNumber(stats.goles_penalti_anotado)}
						onChange={(v) => onUpdate("goles_penalti_anotado", v)}
					/>
				</div>
			</TabsContent>

			<TabsContent value="tiros" className="space-y-4 mt-4">
				<p className="text-sm text-muted-foreground mb-4">
					El total incluye goles + tiros fallados. La eficiencia se calcula automáticamente.
				</p>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField label="Totales" value={safeNumber(stats.tiros_totales)} onChange={() => {}} readOnly />
					<StatField label="Hombre +" value={safeNumber(stats.tiros_hombre_mas)} onChange={(v) => onUpdate("tiros_hombre_mas", v)} />
					<StatField
						label="Penalti Fallado"
						value={safeNumber(stats.tiros_penalti_fallado)}
						onChange={(v) => onUpdate("tiros_penalti_fallado", v)}
					/>
					<StatField label="Corner" value={safeNumber(stats.tiros_corner)} onChange={(v) => onUpdate("tiros_corner", v)} />
					<StatField label="Fuera" value={safeNumber(stats.tiros_fuera)} onChange={(v) => onUpdate("tiros_fuera", v)} />
					<StatField label="Parados" value={safeNumber(stats.tiros_parados)} onChange={(v) => onUpdate("tiros_parados", v)} />
					<StatField label="Bloqueado" value={safeNumber(stats.tiros_bloqueado)} onChange={(v) => onUpdate("tiros_bloqueado", v)} />
					<StatField label="Eficiencia %" value={safeNumber(stats.tiros_eficiencia)} onChange={() => {}} readOnly suffix="%" />
				</div>
			</TabsContent>

			<TabsContent value="faltas" className="space-y-4 mt-4">
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField label="Exp 18'' 1c1" value={safeNumber(stats.faltas_exp_20_1c1)} onChange={(v) => onUpdate("faltas_exp_20_1c1", v)} />
					<StatField
						label="Exp 18'' Boya"
						value={safeNumber(stats.faltas_exp_20_boya)}
						onChange={(v) => onUpdate("faltas_exp_20_boya", v)}
					/>
					<StatField label="Penalti" value={safeNumber(stats.faltas_penalti)} onChange={(v) => onUpdate("faltas_penalti", v)} />
					<StatField
						label="Contrafaltas"
						value={safeNumber(stats.faltas_contrafaltas)}
						onChange={(v) => onUpdate("faltas_contrafaltas", v)}
					/>
				</div>
			</TabsContent>

			<TabsContent value="acciones" className="space-y-4 mt-4">
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField label="Bloqueo" value={safeNumber(stats.acciones_bloqueo)} onChange={(v) => onUpdate("acciones_bloqueo", v)} />
					<StatField
						label="Asistencias"
						value={safeNumber(stats.acciones_asistencias)}
						onChange={(v) => onUpdate("acciones_asistencias", v)}
					/>
					<StatField
						label="Recuperación"
						value={safeNumber(stats.acciones_recuperacion)}
						onChange={(v) => onUpdate("acciones_recuperacion", v)}
					/>
					<StatField label="Rebote" value={safeNumber(stats.acciones_rebote)} onChange={(v) => onUpdate("acciones_rebote", v)} />
					<StatField
						label="Exp Provocada"
						value={safeNumber(stats.acciones_exp_provocada)}
						onChange={(v) => onUpdate("acciones_exp_provocada", v)}
					/>
					<StatField
						label="Penalti Provocado"
						value={safeNumber(stats.acciones_penalti_provocado)}
						onChange={(v) => onUpdate("acciones_penalti_provocado", v)}
					/>
					<StatField
						label="Recibe Gol"
						value={safeNumber(stats.acciones_recibir_gol)}
						onChange={(v) => onUpdate("acciones_recibir_gol", v)}
					/>
				</div>
			</TabsContent>
		</Tabs>
	);
}

function GoalkeeperStatsDialog({
	player,
	stats,
	onUpdate
}: {
	player: Player;
	stats: Partial<MatchStats>;
	onUpdate: (field: keyof MatchStats, value: number) => void;
}) {
	const totalGoalsConceded =
		safeNumber(stats.portero_goles_boya_parada) +
		safeNumber(stats.portero_goles_hombre_menos) +
		safeNumber(stats.portero_goles_dir_mas_5m) +
		safeNumber(stats.portero_goles_contraataque) +
		safeNumber(stats.portero_goles_penalti);

	return (
		<Tabs defaultValue="goles" className="w-full">
			<TabsList className="grid w-full grid-cols-3 h-auto">
				<TabsTrigger value="goles" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					Goles
				</TabsTrigger>
				<TabsTrigger value="paradas" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					Paradas
				</TabsTrigger>
				<TabsTrigger value="acciones" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					Acciones
				</TabsTrigger>
			</TabsList>

			<TabsContent value="goles" className="space-y-4 mt-4">
				<p className="text-sm text-muted-foreground mb-4">
					Registra los goles encajados del equipo rival. Se suman automáticamente a "Goles Rival".
				</p>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField label="Totales" value={totalGoalsConceded} onChange={() => {}} readOnly />
					<StatField
						label="Boya"
						value={safeNumber(stats.portero_goles_boya_parada)}
						onChange={(v) => onUpdate("portero_goles_boya_parada", v)}
					/>
					<StatField
						label="Hombre -"
						value={safeNumber(stats.portero_goles_hombre_menos)}
						onChange={(v) => onUpdate("portero_goles_hombre_menos", v)}
					/>
					<StatField
						label="Dir +5m"
						value={safeNumber(stats.portero_goles_dir_mas_5m)}
						onChange={(v) => onUpdate("portero_goles_dir_mas_5m", v)}
					/>
					<StatField
						label="Contraataque"
						value={safeNumber(stats.portero_goles_contraataque)}
						onChange={(v) => onUpdate("portero_goles_contraataque", v)}
					/>
					<StatField
						label="Penalti"
						value={safeNumber(stats.portero_goles_penalti)}
						onChange={(v) => onUpdate("portero_goles_penalti", v)}
					/>
				</div>
			</TabsContent>

			<TabsContent value="paradas" className="space-y-4 mt-4">
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField label="Totales" value={safeNumber(stats.portero_paradas_totales)} onChange={() => {}} readOnly />
					<StatField
						label="Parada Recup"
						value={safeNumber(stats.portero_tiros_parada_recup)}
						onChange={(v) => onUpdate("portero_tiros_parada_recup", v)}
					/>
					<StatField
						label="Parada Fuera"
						value={safeNumber(stats.portero_paradas_fuera)}
						onChange={(v) => onUpdate("portero_paradas_fuera", v)}
					/>
					<StatField
						label="Penalti Parado"
						value={safeNumber(stats.portero_paradas_penalti_parado)}
						onChange={(v) => onUpdate("portero_paradas_penalti_parado", v)}
					/>
					<StatField
						label="Parada/Defensa Hombre -"
						value={safeNumber(stats.portero_paradas_hombre_menos)}
						onChange={(v) => onUpdate("portero_paradas_hombre_menos", v)}
					/>
				</div>
			</TabsContent>

			<TabsContent value="acciones" className="space-y-4 mt-4">
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField
						label="Asistencias"
						value={safeNumber(stats.acciones_asistencias)}
						onChange={(v) => onUpdate("acciones_asistencias", v)}
					/>
					<StatField
						label="Recuperación"
						value={safeNumber(stats.acciones_recuperacion)}
						onChange={(v) => onUpdate("acciones_recuperacion", v)}
					/>
					<StatField
						label="Pérdida Posesión"
						value={safeNumber(stats.portero_acciones_perdida_pos)}
						onChange={(v) => onUpdate("portero_acciones_perdida_pos", v)}
					/>
					<StatField
						label="Expulsión Provocada"
						value={safeNumber(stats.acciones_exp_provocada)}
						onChange={(v) => onUpdate("acciones_exp_provocada", v)}
					/>
				</div>
			</TabsContent>
		</Tabs>
	);
}

function StatField({
	label,
	value,
	onChange,
	readOnly = false,
	suffix
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
	readOnly?: boolean;
	suffix?: string;
}) {
	const displayValue = safeNumber(value);

	return (
		<div className="space-y-2">
			<Label className="text-sm font-medium">{label}</Label>
			{readOnly ? (
				<Input value={suffix ? `${displayValue}${suffix}` : displayValue} readOnly className="bg-muted" />
			) : (
				<StatInput value={displayValue} onChange={onChange} />
			)}
		</div>
	);
}

const safeNumber = (value: number | undefined | null): number => {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return 0;
	}
	return value;
};

const getCurrentSeason = (): string => {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1; // JavaScript months are 0-indexed

	// If it's September (9) or later, we're in the new season
	if (month >= 9) {
		return `${year}-${year + 1}`;
	} else {
		return `${year - 1}-${year}`;
	}
};
