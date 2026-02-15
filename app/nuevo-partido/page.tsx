"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatInput } from "@/components/stat-input";
import type { Player, MatchStats, Profile, Match } from "@/lib/types";
import { Loader2, AlertCircle, RefreshCw, Plus, Users, CheckCircle, XCircle, X, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlayerSubstitutionDialog } from "@/components/player-substitution-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SprintWinnerModal } from "@/components/nuevo-partido/modals/SprintWinnerPlayerModal";
import {
	GoalkeeperGoalsRecorder,
	GoalkeeperSavesRecorder,
	GoalkeeperShotDraft
} from "@/components/nuevo-partido/modal-stats/GoalkeeperShotsRecorder";
import { Competition } from "@/lib/admin";
import { PenaltiesTab } from "@/components/players-components/PenaltiesTab";

interface MatchEditParams {
	matchId?: number;
	isEditing?: boolean;
}

export default function NewMatchPage({ searchParams }: { searchParams: Promise<MatchEditParams> }) {
	const [closedQuarters, setClosedQuarters] = useState<Record<number, boolean>>({
		1: false,
		2: false,
		3: false,
		4: false
	});
	const [quarterScores, setQuarterScores] = useState<Record<number, { home: number; away: number }>>({
		1: { home: 0, away: 0 },
		2: { home: 0, away: 0 },
		3: { home: 0, away: 0 },
		4: { home: 0, away: 0 }
	});

	type Quarter = 1 | 2 | 3 | 4;

	const [sprintModalOpen, setSprintModalOpen] = useState(false);
	const [activeSprintQuarter, setActiveSprintQuarter] = useState<Quarter | null>(null);

	const [sprintWinners, setSprintWinners] = useState<Record<Quarter, number | null>>({
		1: null,
		2: null,
		3: null,
		4: null
	});

	const getWinnerLabel = (playerId: number | null) => {
		if (!playerId) return null;
		const p = playersById.get(playerId);
		if (!p) return "Jugador no encontrado";
		return `#${p.number} · ${p.name}`;
	};

	const [competitions, setCompetitions] = useState<Competition[]>([]);
	const [competitionId, setCompetitionId] = useState<string>("");

	const [penaltyHomeScore, setPenaltyHomeScore] = useState<number | null>(null);
	const [penaltyAwayScore, setPenaltyAwayScore] = useState<number | null>(null);
	const [penaltyShooters, setPenaltyShooters] = useState<Array<{ playerId: number; scored: boolean }>>([]);
	const [showPenaltyShooterDialog, setShowPenaltyShooterDialog] = useState(false);
	const [rivalPenalties, setRivalPenalties] = useState<Array<{ id: number; result: "scored" | "saved" | "missed" }>>([]);
	const [penaltyGoalkeeperMap, setPenaltyGoalkeeperMap] = useState<Record<number, number>>({});
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
	const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
	const [selectedAddPlayer, setSelectedAddPlayer] = useState<Player | null>(null);
	const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
	const [opponent, setOpponent] = useState("");
	const [location, setLocation] = useState("");
	const [isHome, setIsHome] = useState(true);
	const [season, setSeason] = useState(getCurrentSeason());
	const [jornada, setJornada] = useState(1);
	const [notes, setNotes] = useState("");
	const [stats, setStats] = useState<Record<number, Partial<MatchStats>>>({});
	const { toast } = useToast();
	const [goalkeeperShots, setGoalkeeperShots] = useState<GoalkeeperShotDraft[]>([]);
	const [myClub, setMyClub] = useState<{ id: string; name: string } | null>(null);

	const playersById = useMemo(() => {
		const m = new Map<number, Player>();
		for (const p of allPlayers) m.set(p.id, p);
		return m;
	}, [allPlayers]);

	// FUNCIONES USE EFFECT INICIALES
	useEffect(() => {
		const fetchClub = async () => {
			if (!profile?.club_id) return;
			const { data } = await supabase.from("clubs").select("id, name").eq("id", profile.club_id).single();
			if (data) setMyClub(data);
		};
		if (profile) fetchClub();
	}, [profile, supabase]);

	useEffect(() => {
		const fetchCompetitions = async () => {
			if (!profile?.club_id) return;

			const { data: cc, error: ccError } = await supabase.from("club_competitions").select("competition_id").eq("club_id", profile.club_id);

			if (ccError) {
				setCompetitions([]);
				return;
			}

			const ids = (cc ?? []).map((x) => x.competition_id);
			if (ids.length === 0) {
				setCompetitions([]);
				return;
			}

			const { data: comps, error: compsError } = await supabase
				.from("competitions")
				.select("id, name, slug, image_url")
				.in("id", ids)
				.order("name");

			if (compsError) {
				setCompetitions([]);
				return;
			}

			setCompetitions(comps ?? []);
			if (!competitionId && (comps ?? []).length > 0) setCompetitionId(String(comps![0].id));
		};

		fetchCompetitions();
	}, [profile?.club_id]);

	useEffect(() => {
		const homeScore = penaltyShooters.filter((s) => s.scored).length;
		const awayScore = rivalPenalties.filter((p) => p.result === "scored").length;

		if (penaltyShooters.length > 0 || rivalPenalties.length > 0) {
			setPenaltyHomeScore(homeScore);
			setPenaltyAwayScore(awayScore);
		}
	}, [penaltyShooters, rivalPenalties]);

	const calculateScores = (playerStats: Record<number, Partial<MatchStats>>, playersById: Map<number, Player>) => {
		let homeGoals = 0;
		let awayGoals = 0;

		for (const [playerIdStr, playerStat] of Object.entries(playerStats)) {
			const playerId = Number(playerIdStr);
			const player = playersById.get(playerId);

			if (player?.is_goalkeeper) {
				homeGoals += playerStat.portero_gol || 0;

				const goalkeeperGoals =
					(playerStat.portero_goles_boya_parada || 0) +
					(playerStat.portero_goles_hombre_menos || 0) +
					(playerStat.portero_goles_dir_mas_5m || 0) +
					(playerStat.portero_goles_contraataque || 0) +
					(playerStat.portero_goles_lanzamiento || 0) +
					(playerStat.portero_gol_palo || 0) +
					(playerStat.portero_goles_penalti || 0);

				awayGoals += goalkeeperGoals;
			} else {
				homeGoals += playerStat.goles_totales || 0;
			}
		}

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
			await loadPreviousMatches();

			if (params.matchId) {
				await loadExistingMatch(Number(params.matchId));
			}

			setLoading(false);
		}

		initializeFromParams();
	}, [searchParams]);

	const checkPermissions = async () => {
		if (!supabase) {
			setPermissionError(true);
			return;
		}

		try {
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
		} catch (error) {
			console.error("[v0] Auth error:", error);
			setPermissionError(true);
		}
	};

	const loadPreviousMatches = async () => {
		if (!supabase) return;

		try {
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
		} catch (error) {
			console.error("[v0] Error loading previous matches:", error);
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
		if (!supabase) return;

		try {
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) return;

			const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

			if (!profileData?.club_id) return;

			const { data, error } = await supabase.from("players").select("*").eq("club_id", profileData.club_id).order("number");

			if (error || !data) {
				console.error("[v0] Error loading players:", error);
				setAllPlayers([]);
				return;
			}

			setAllPlayers(data);

			// Solo inicializamos los 14 primeros jugadores si estamos creando un partido NUEVO
			if (!editingMatchId) {
				const initialActiveIds = data.slice(0, 14).map((p) => p.id);
				setActivePlayerIds(initialActiveIds);

				const initialStats: Record<number, Partial<MatchStats>> = {};
				initialActiveIds.forEach((playerId) => {
					initialStats[playerId] = createEmptyStats(playerId);
				});
				setStats(initialStats);
			}
			// Si estamos editando, la convocatoria se carga después en loadExistingMatch()
		} catch (error) {
			console.error("[v0] Error loading players:", error);
			setLoading(false);
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
		gol_del_palo_sup: 0,

		tiros_totales: 0,
		tiros_penalti_fallado: 0,
		tiros_corner: 0,
		tiros_fuera: 0,
		tiros_parados: 0,
		tiros_bloqueado: 0,
		tiros_eficiencia: 0,
		tiro_palo: 0,

		faltas_exp_20_1c1: 0,
		faltas_exp_20_boya: 0,
		faltas_penalti: 0,
		faltas_contrafaltas: 0,
		exp_trans_def: 0,

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
		portero_gol: 0,
		portero_gol_superioridad: 0,
		portero_fallo_superioridad: 0,
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
		faltas_exp_simple: 0,

		pase_boya: 0,
		pase_boya_fallado: 0,

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
		portero_recibir_gol: 0,
		portero_inferioridad_fuera: 0,
		portero_inferioridad_bloqueo: 0,
		lanz_recibido_fuera: 0,
		portero_gol_palo: 0,
		portero_lanz_palo: 0,

		rebote_recup_hombre_mas: 0,
		rebote_perd_hombre_mas: 0
	});

	const hasStats = (playerId: number): boolean => {
		const playerStats = stats[playerId];
		if (!playerStats) return false;

		return Object.entries(playerStats).some(([key, value]) => {
			if (key === "player_id" || key === "match_id") return false;
			return typeof value === "number" && value > 0;
		});
	};

	const calcParadasTotales = (s?: Partial<MatchStats> | null) => {
		if (!s) return 0;

		return (
			safeNumber(s.portero_tiros_parada_recup) +
			safeNumber(s.portero_paradas_fuera) +
			safeNumber(s.portero_paradas_penalti_parado) +
			safeNumber(s.portero_paradas_hombre_menos)
		);
	};

	// ADD FUNCTION TO ADD PLAYER TO THE FIELD (MAX 12 FIELD PLAYERS)
	const handleAddPlayer = (playerId: number) => {
		const player = playersById.get(playerId);
		if (!player) return;

		const currentFieldPlayers = activePlayerIds.reduce((acc, id) => {
			const p = playersById.get(id);
			return acc + (p && !p.is_goalkeeper ? 1 : 0);
		}, 0);

		if (!player.is_goalkeeper && currentFieldPlayers >= 12) {
			alert("No se pueden añadir más de 12 jugadores de campo");
			return;
		}

		setActivePlayerIds((prev) => [...prev, playerId]);
		setStats((prev) => ({
			...prev,
			[playerId]: createEmptyStats(playerId)
		}));
		setShowAddPlayerDialog(false);
		setSelectedAddPlayer(null);
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

	const handleRemovePlayer = (playerId: number) => {
		setActivePlayerIds((prev) => prev.filter((id) => id !== playerId));

		setStats((prev) => {
			const newStats = { ...prev };
			delete newStats[playerId];
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
			setCompetitionId(match.competition_id ? String(match.competition_id) : "");

			// LOAD PENALTY SCORES IF THEY EXIST
			setPenaltyHomeScore(match.penalty_home_score ?? null);
			setPenaltyAwayScore(match.penalty_away_score ?? null);

			setQuarterScores({
				1: { home: match.q1_score || 0, away: match.q1_score_rival || 0 },
				2: { home: match.q2_score || 0, away: match.q2_score_rival || 0 },
				3: { home: match.q3_score || 0, away: match.q3_score_rival || 0 },
				4: { home: match.q4_score || 0, away: match.q4_score_rival || 0 }
			});

			// ALSO SET CLOSED QUARTERS BASED ON MATCH DATA
			setClosedQuarters({
				1: match.q1_score !== undefined && match.q1_score_rival !== undefined,
				2: match.q2_score !== undefined && match.q2_score_rival !== undefined,
				3: match.q3_score !== undefined && match.q3_score_rival !== undefined,
				4: match.q4_score !== undefined && match.q4_score_rival !== undefined
			});

			setSprintWinners({
				1: match.sprint1_winner_player_id ?? null,
				2: match.sprint2_winner_player_id ?? null,
				3: match.sprint3_winner_player_id ?? null,
				4: match.sprint4_winner_player_id ?? null
			});

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
				});

				setStats(statsMap);
			}

			// LOAD PENALTY SHOOTERS IF THEY EXIST
			const { data: penaltyPlayers, error: penaltyError } = await supabase
				.from("penalty_shootout_players")
				.select("*")
				.eq("match_id", matchId)
				.order("shot_order");

			if (penaltyError) {
				console.error("Error loading penalty shooters:", penaltyError);
			} else if (penaltyPlayers) {
				setPenaltyShooters(penaltyPlayers.filter((p) => p.player_id !== null).map((p) => ({ playerId: p.player_id!, scored: p.scored })));

				// Load rival penalties and goalkeeper map
				const rivalPenaltiesData = penaltyPlayers
					.filter((p) => p.player_id === null)
					.map((p, index) => ({
						id: p.id,
						result: p.result_type || (p.scored ? "scored" : "missed")
					}));
				setRivalPenalties(rivalPenaltiesData);

				// Populate penaltyGoalkeeperMap from penalty shootout data
				const goalkeeperMapData = penaltyPlayers
					.filter((p) => p.goalkeeper_id && p.id)
					.reduce(
						(acc, p) => {
							acc[p.id] = p.goalkeeper_id;
							return acc;
						},
						{} as Record<number, number>
					);

				setPenaltyGoalkeeperMap(goalkeeperMapData);
			}

			const { data: gkShots, error: gkShotsErr } = await supabase
				.from("goalkeeper_shots")
				.select("goalkeeper_player_id, shot_index, result, x, y, quarter")
				.eq("match_id", matchId)
				.order("goalkeeper_player_id", { ascending: true })
				.order("shot_index", { ascending: true });

			if (gkShotsErr) {
				console.error("Error loading goalkeeper shots:", gkShotsErr);
			} else {
				setGoalkeeperShots(
					(gkShots ?? []).map((s) => ({
						goalkeeper_player_id: s.goalkeeper_player_id,
						shot_index: s.shot_index,
						result: s.result,
						x: s.x,
						y: s.y
						// quarter lo ignoras en draft si quieres
					}))
				);
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

			const player = playersById.get(playerId);

			if (player?.is_goalkeeper) {
				const saveFields: (keyof MatchStats)[] = [
					"portero_tiros_parada_recup",
					"portero_paradas_fuera",
					"portero_paradas_penalti_parado",
					"portero_paradas_hombre_menos"
				];

				if (saveFields.includes(field)) {
					newStats.portero_paradas_totales = calcParadasTotales(newStats) as any;
				}

				const goalkeeperGoalCategories: (keyof MatchStats)[] = [
					"portero_goles_boya_parada",
					"portero_goles_hombre_menos",
					"portero_goles_dir_mas_5m",
					"portero_goles_contraataque",
					"portero_goles_penalti",
					"portero_gol", // Added
					"portero_gol_superioridad", // Added
					"portero_goles_lanzamiento",
					"portero_gol_palo"
				];

				if (field.startsWith("portero_gol") || field.startsWith("portero_goles_")) {
					newStats.portero_goles_totales = goalkeeperGoalCategories.reduce((sum, cat) => {
						return sum + safeNumber(newStats[cat] as number);
					}, 0) as any;
				}

				// Update goalkeeper inferiority stats when relevant fields change
				if (
					field === "portero_goles_hombre_menos" ||
					field === "portero_paradas_hombre_menos" ||
					field === "portero_inferioridad_fuera" ||
					field === "portero_inferioridad_bloqueo"
				) {
					const currentStatsForPlayer = prev[playerId] || createEmptyStats(playerId);
					const updatedGolesHombreMenos = safeNumber(
						field === "portero_goles_hombre_menos" ? safeValue : currentStatsForPlayer.portero_goles_hombre_menos
					);
					const updatedParadasHombreMenos = safeNumber(
						field === "portero_paradas_hombre_menos" ? safeValue : currentStatsForPlayer.portero_paradas_hombre_menos
					);

					// newStats.portero_paradas_totales =
					// 	(safeNumber(newStats.portero_paradas_totales) || 0) +
					// 	(safeNumber(newStats.portero_inferioridad_fuera) || 0) +
					// 	(safeNumber(newStats.portero_inferioridad_bloqueo) || 0);

					// // The efficiency calculation below is for generic field players, we need to adjust for goalkeepers if needed.
					// // For now, let's ensure we're not overwriting existing correct calculations.
				}
			} else {
				const goalCategories: (keyof MatchStats)[] = [
					"goles_boya_jugada",
					"goles_hombre_mas",
					"goles_lanzamiento",
					"goles_dir_mas_5m",
					"goles_contraataque",
					"goles_penalti_anotado",
					"gol_del_palo_sup"
				];

				const shotCategories: (keyof MatchStats)[] = [
					"tiros_hombre_mas",
					"tiros_penalti_fallado",
					"tiros_corner",
					"tiros_fuera",
					"tiros_parados",
					"tiros_bloqueado",
					"tiro_palo"
				];

				if (field.startsWith("goles_") || field.startsWith("tiros_") || field.startsWith("tiro_") || field.startsWith("gol")) {
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

				// Update rebound stats when relevant fields change for field players
				if (
					field === "rebote_recup_hombre_mas" ||
					field === "rebote_perd_hombre_mas" ||
					field === "goles_hombre_mas" ||
					field === "tiros_hombre_mas"
				) {
					// These specific fields don't directly influence a single total,
					// but are tracked independently. No recalculation needed here based on current logic.
				}
			}

			const updatedAllStats = {
				...prev,
				[playerId]: newStats
			};

			setQuarterScores((prev) => {
				const updated = { ...prev };

				// encuentra el primer cuarto que NO está cerrado
				const activeQuarter = [1, 2, 3, 4].find((q) => !closedQuarters[q]);
				if (!activeQuarter) return updated;

				// recalcula solo el ACTIVO desde cero
				const { homeGoals, awayGoals } = calculateScores(updatedAllStats, playersById);

				// diferencia respecto al total del cuarto anterior
				const previousQuartersTotal = Object.values(prev)
					.slice(0, activeQuarter - 1)
					.reduce(
						(acc, q) => ({
							home: acc.home + q.home,
							away: acc.away + q.away
						}),
						{ home: 0, away: 0 }
					);

				updated[activeQuarter] = {
					home: homeGoals - previousQuartersTotal.home,
					away: awayGoals - previousQuartersTotal.away
				};

				return updated;
			});

			return updatedAllStats;
		});
	};

	type PenaltyShooter = { playerId: number; scored: boolean };
	type RivalPenalty = { id: number; result: "scored" | "saved" | "missed" };

	function buildPenaltyRows(args: {
		matchId: number;
		penaltyShooters: PenaltyShooter[];
		rivalPenalties: RivalPenalty[];
		penaltyGoalkeeperMap: Record<number, number>;
	}) {
		const { matchId, penaltyShooters, rivalPenalties, penaltyGoalkeeperMap } = args;

		const homeRows = penaltyShooters.map((s, index) => ({
			match_id: matchId,
			player_id: Number(s.playerId),
			shot_order: index + 1,
			scored: !!s.scored,
			result_type: s.scored ? "scored" : "missed",
			goalkeeper_id: null
		}));

		const baseOrder = homeRows.length;

		const rivalRows = rivalPenalties.map((p, index) => {
			const result = p.result ?? "missed";
			const isSaved = result === "saved";
			const isScored = result === "scored";

			return {
				match_id: matchId,
				player_id: null,
				shot_order: baseOrder + index + 1,
				scored: isScored,
				result_type: result,
				goalkeeper_id: isSaved ? (penaltyGoalkeeperMap[p.id] ?? null) : null
			};
		});

		return [...homeRows, ...rivalRows];
	}

	const handleSave = async () => {
		if (!opponent.trim()) {
			alert("Por favor, introduce el nombre del rival");
			return;
		}

		if (!profile || !profile.club_id) {
			alert("Error: No se pudo obtener la información del club");
			return;
		}

		const { homeGoals, awayGoals } = calculateScores(stats, playersById);

		const isTied = homeGoals === awayGoals;
		const isZeroZero = homeGoals === 0 && awayGoals === 0;

		if (isTied && !isZeroZero) {
			if (penaltyHomeScore === null || penaltyAwayScore === null) {
				alert("El partido está empatado. Debes registrar el resultado de los penaltis.");
				return;
			}
			if (penaltyHomeScore === penaltyAwayScore) {
				alert("La tanda de penaltis no puede terminar en empate. Debe haber un ganador.");
				return;
			}

			if (penaltyShooters.length === 0) {
				toast({
					title: "Atención",
					description: "No has seleccionado los lanzadores de penaltis de tu equipo",
					variant: "destructive"
				});
				return;
			}
		}

		setSaving(true);

		try {
			const homeQ1 = quarterScores[1].home;
			const awayQ1 = quarterScores[1].away;
			const homeQ2 = quarterScores[2].home;
			const awayQ2 = quarterScores[2].away;
			const homeQ3 = quarterScores[3].home;
			const awayQ3 = quarterScores[3].away;
			const homeQ4 = quarterScores[4].home;
			const awayQ4 = quarterScores[4].away;

			const sprint1Winner = sprintWinners[1];
			const sprint2Winner = sprintWinners[2];
			const sprint3Winner = sprintWinners[3];
			const sprint4Winner = sprintWinners[4];
			// </CHANGE>

			// Calculate penalty saves for goalkeepers
			const penaltySavesByGoalkeeper: Record<number, number> = {};
			rivalPenalties.forEach((penalty) => {
				if (penalty.result === "saved" && penaltyGoalkeeperMap[penalty.id]) {
					const gkId = penaltyGoalkeeperMap[penalty.id];
					penaltySavesByGoalkeeper[gkId] = (penaltySavesByGoalkeeper[gkId] || 0) + 1;
				}
			});

			const statsForSave: Record<number, Partial<MatchStats>> = { ...stats };

			for (const [playerId] of Object.entries(statsForSave)) {
				const player = playersById.get(Number(playerId));
				if (player?.is_goalkeeper && penaltySavesByGoalkeeper[player.id]) {
					const prev = statsForSave[player.id] ?? {};
					statsForSave[player.id] = {
						...prev,
						portero_paradas_penalti_parado: (prev.portero_paradas_penalti_parado ?? 0) + penaltySavesByGoalkeeper[player.id]
					};
				}
			}

			const maxPlayers = fieldPlayers.length;

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
						notes: notes || null,
						q1_score: homeQ1,
						q2_score: homeQ2,
						q3_score: homeQ3,
						q4_score: homeQ4,
						q1_score_rival: awayQ1,
						q2_score_rival: awayQ2,
						q3_score_rival: awayQ3,
						q4_score_rival: awayQ4,
						sprint1_winner: sprint1Winner === 1 ? 1 : sprint1Winner === 2 ? 2 : null,
						sprint2_winner: sprint2Winner === 1 ? 1 : sprint2Winner === 2 ? 2 : null,
						sprint3_winner: sprint3Winner === 1 ? 1 : sprint3Winner === 2 ? 2 : null,
						sprint4_winner: sprint4Winner === 1 ? 1 : sprint4Winner === 2 ? 2 : null,
						sprint1_winner_player_id: sprintWinners[1],
						sprint2_winner_player_id: sprintWinners[2],
						sprint3_winner_player_id: sprintWinners[3],
						sprint4_winner_player_id: sprintWinners[4],
						max_players_on_field: maxPlayers,
						penalty_home_score: homeGoals === awayGoals ? penaltyHomeScore : null,
						penalty_away_score: homeGoals === awayGoals ? penaltyAwayScore : null,
						competition_id: competitionId ? Number(competitionId) : null
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

				if (homeGoals === awayGoals) {
					await supabase.from("penalty_shootout_players").delete().eq("match_id", editingMatchId);

					const rows = buildPenaltyRows({
						matchId: editingMatchId,
						penaltyShooters,
						rivalPenalties,
						penaltyGoalkeeperMap
					});

					if (rows.length > 0) {
						const { error: penErr } = await supabase.from("penalty_shootout_players").insert(rows);
						if (penErr) throw penErr;
					}
				} else {
					await supabase.from("penalty_shootout_players").delete().eq("match_id", editingMatchId);
				}

				if (goalkeeperShots.length > 0) {
					await supabase.from("goalkeeper_shots").delete().eq("match_id", editingMatchId);

					const rows = goalkeeperShots.map((s) => ({
						match_id: editingMatchId,
						goalkeeper_player_id: s.goalkeeper_player_id,
						quarter: null,
						shot_index: s.shot_index,
						result: s.result,
						x: s.x,
						y: s.y
					}));

					const { error: gkShotsError } = await supabase.from("goalkeeper_shots").insert(rows);
					if (gkShotsError) throw gkShotsError;
				} else {
					// ⚠️ Importante: si está vacío NO borres nada.
					console.warn("[GoalkeeperShots] Skipping replace because local array is empty");
				}

				router.push(`/partidos/${editingMatchId}`);
			} else {
				const { data: newMatch, error: matchError } = await supabase
					.from("matches")
					.insert({
						club_id: profile.club_id,
						match_date: matchDate,
						opponent,
						is_home: isHome,
						location: location || null,
						season: season || null,
						jornada: jornada || null,
						home_score: homeGoals,
						away_score: awayGoals,
						q1_score: homeQ1,
						q2_score: homeQ2,
						q3_score: homeQ3,
						q4_score: homeQ4,
						q1_score_rival: awayQ1,
						q2_score_rival: awayQ2,
						q3_score_rival: awayQ3,
						q4_score_rival: awayQ4,
						sprint1_winner: sprint1Winner === 1 ? 1 : sprint1Winner === 2 ? 2 : null,
						sprint2_winner: sprint2Winner === 1 ? 1 : sprint2Winner === 2 ? 2 : null,
						sprint3_winner: sprint3Winner === 1 ? 1 : sprint3Winner === 2 ? 2 : null,
						sprint4_winner: sprint4Winner === 1 ? 1 : sprint4Winner === 2 ? 2 : null,
						sprint1_winner_player_id: sprintWinners[1],
						sprint2_winner_player_id: sprintWinners[2],
						sprint3_winner_player_id: sprintWinners[3],
						sprint4_winner_player_id: sprintWinners[4],
						max_players_on_field: maxPlayers,
						notes: notes || null,
						penalty_home_score: homeGoals === awayGoals ? penaltyHomeScore : null,
						penalty_away_score: homeGoals === awayGoals ? penaltyAwayScore : null,
						competition_id: competitionId ? Number(competitionId) : null
					})
					.select()
					.single();

				if (matchError) throw matchError;

				const statsToInsert = activePlayerIds.map((playerId) => ({
					...stats[playerId],
					match_id: newMatch.id
				}));

				const { error: statsError } = await supabase.from("match_stats").insert(statsToInsert);

				if (statsError) throw statsError;

				if (newMatch && homeGoals === awayGoals) {
					await supabase.from("penalty_shootout_players").delete().eq("match_id", newMatch.id);

					const rows = buildPenaltyRows({
						matchId: newMatch.id,
						penaltyShooters,
						rivalPenalties,
						penaltyGoalkeeperMap
					});

					if (rows.length > 0) {
						const { error: penErr } = await supabase.from("penalty_shootout_players").insert(rows);
						if (penErr) throw penErr;
					}
				} else if (newMatch) {
					await supabase.from("penalty_shootout_players").delete().eq("match_id", newMatch.id);
				}

				if (goalkeeperShots.length > 0) {
					const rows = goalkeeperShots.map((s) => ({
						match_id: newMatch.id,
						goalkeeper_player_id: s.goalkeeper_player_id,
						quarter: null,
						shot_index: s.shot_index,
						result: s.result,
						x: s.x,
						y: s.y
					}));
					const { error: gkShotsError } = await supabase.from("goalkeeper_shots").insert(rows);
					if (gkShotsError) throw gkShotsError;
				}

				router.push(`/partidos/${newMatch.id}`);
			}
		} catch (error) {
			console.error("Error saving match:", error);
			alert("Error al guardar el partido");
		} finally {
			setSaving(false);
		}
	};

	const totalExpulsiones = (s: any) =>
		safeNumber(s?.faltas_exp_20_1c1) +
		safeNumber(s?.faltas_exp_20_boya) +
		safeNumber(s?.faltas_penalti) +
		safeNumber(s?.faltas_exp_3_int) +
		safeNumber(s?.faltas_exp_3_bruta) +
		safeNumber(s?.faltas_exp_simple) +
		safeNumber(s?.exp_trans_def);

	const activeSet = useMemo(() => new Set(activePlayerIds), [activePlayerIds]);

	const activePlayers = useMemo(() => allPlayers.filter((p) => activeSet.has(p.id)), [allPlayers, activeSet]);

	const fieldPlayers = useMemo(() => activePlayers.filter((p) => !p.is_goalkeeper), [activePlayers]);

	const goalkeepers = useMemo(() => activePlayers.filter((p) => p.is_goalkeeper), [activePlayers]);

	const availableFieldPlayers = useMemo(() => allPlayers.filter((p) => !p.is_goalkeeper && !activeSet.has(p.id)), [allPlayers, activeSet]);

	const availableGoalkeepers = useMemo(() => allPlayers.filter((p) => p.is_goalkeeper && !activeSet.has(p.id)), [allPlayers, activeSet]);

	const getAvailablePlayers = (isGoalkeeper: boolean): Player[] => {
		return isGoalkeeper ? availableGoalkeepers : availableFieldPlayers;
	};

	const score = useMemo(() => calculateScores(stats, playersById), [stats, playersById]);

	const homeGoals = score.homeGoals;
	const awayGoals = score.awayGoals;
	const isTied = homeGoals === awayGoals;

	const selectedPlayersForPenalty = useMemo(() => {
		return activePlayerIds.map((id) => {
			const player = playersById.get(id);
			return {
				playerId: id,
				played: true,
				is_goalkeeper: player?.is_goalkeeper || false,
				jersey_number: player?.number,
				name: player?.name
			};
		});
	}, [activePlayerIds, playersById]);

	const players = allPlayers;
	const homeTeamName = myClub?.name || "Mi Equipo";
	const awayTeamName = opponent || "Rival";

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

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<h1 className="text-3xl md:text-4xl font-bold mb-2">{editingMatchId ? "Editar Partido" : "Nuevo Partido"}</h1>
				<p className="text-muted-foreground text-lg">
					{editingMatchId ? "Actualiza las estadísticas del partido" : "Registra las estadísticas del partido"}
				</p>
				<div className="flex items-center gap-3 mt-3 flex-wrap">
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
				<TabsList className={`grid w-full ${isTied ? "grid-cols-4" : "grid-cols-3"} mb-6 h-auto`}>
					{/* TAB: Información */}
					<TabsTrigger value="info" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
						{/* Móvil */}
						<span className="sm:hidden block truncate">Info</span>
						{/* Desktop */}
						<span className="hidden sm:inline block truncate">Información de Partido</span>
					</TabsTrigger>

					{/* TAB: Jugadores de Campo */}
					<TabsTrigger value="field" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
						{/* Móvil */}
						<span className="sm:hidden block truncate">Campo ({fieldPlayers.length})</span>
						{/* Desktop */}
						<span className="hidden sm:inline block truncate">Jugadores de Campo ({fieldPlayers.length})</span>
					</TabsTrigger>

					{/* TAB: Porteros */}
					<TabsTrigger value="goalkeepers" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
						{/* Móvil */}
						<span className="sm:hidden block truncate">Porteros ({goalkeepers.length})</span>
						{/* Desktop */}
						<span className="hidden sm:inline block truncate">Porteros ({goalkeepers.length})</span>
					</TabsTrigger>

					{isTied && (
						<TabsTrigger value="penalties" className="text-xs sm:text-sm px-2 sm:px-4 py-2 relative">
							<span className="sm:hidden block truncate">Penaltis</span>
							<span className="hidden sm:inline block truncate">Tanda de Penaltis</span>
							{isTied && (
								<span className="absolute -top-1 -right-1 flex h-3 w-3">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
								</span>
							)}
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="info">
					<div className="space-y-6">
						<div className="grid gap-6 lg:grid-cols-3">
							{/* COLUMNA 1: Datos */}
							<div className="space-y-4 rounded-sm border bg-muted/15 p-4">
								{/* <h3 className="text-sm font-semibold">Datos del partido</h3> */}

								<div className="space-y-4">
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
								</div>
							</div>

							{/* COLUMNA 2: Competición + Temporada */}
							<div className="space-y-4 rounded-sm border-2 p-4">
								{/* <h3 className="text-sm font-semibold">Competición y temporada</h3> */}

								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="competition">Competición</Label>
										<Select value={competitionId} onValueChange={setCompetitionId}>
											<SelectTrigger id="competition" className="w-full">
												<SelectValue placeholder="Selecciona competición" />
											</SelectTrigger>
											<SelectContent>
												{competitions.map((c) => (
													<SelectItem key={c.id} value={String(c.id)}>
														{c.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>

										{competitions.length === 0 && <p className="text-xs text-muted-foreground"></p>}
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

									<div className="space-y-2">
										<Label htmlFor="season">Temporada</Label>
										<Input id="season" value={season} onChange={(e) => setSeason(e.target.value)} />
									</div>
								</div>
							</div>

							{/* COLUMNA 3: Marcador */}
							<div className="space-y-4 rounded-sm border bg-muted/15 p-4">
								<h3 className="text-sm font-semibold">Marcador</h3>

								<div className="space-y-4">
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
								</div>
							</div>
						</div>

						<div className="space-y-2 md:col-span-3 border-t pt-4 mt-4">
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
								{[1, 2, 3, 4].map((q) => {
									const quarter = q as Quarter;
									const winnerId = sprintWinners[quarter];
									const hasWinner = winnerId != null;
									const winnerLabel = getWinnerLabel(winnerId);

									return (
										<div
											key={q}
											className={`space-y-2 p-3 border rounded ${
												closedQuarters[q] ? "bg-gray-200/50 opacity-60 dark:bg-gray-800/50" : "bg-muted/30"
											}`}
										>
											<div className="flex items-center justify-between mb-2">
												<Label className="text-sm font-medium">Parcial {q}</Label>
											</div>

											<div className="grid grid-cols-2 gap-2">
												<div>
													<Label className="text-xs">Propios</Label>
													<Input
														type="number"
														value={quarterScores[q].home}
														onChange={(e) => {
															if (!closedQuarters[q]) {
																setQuarterScores((prev) => ({
																	...prev,
																	[q]: { ...prev[q], home: Number.parseInt(e.target.value) || 0 }
																}));
															}
														}}
														disabled={closedQuarters[q]}
														min={0}
														className="text-center font-bold text-lg"
													/>
												</div>

												<div>
													<Label className="text-xs">Rival</Label>
													<Input
														type="number"
														value={quarterScores[q].away}
														onChange={(e) => {
															if (!closedQuarters[q]) {
																setQuarterScores((prev) => ({
																	...prev,
																	[q]: { ...prev[q], away: Number.parseInt(e.target.value) || 0 }
																}));
															}
														}}
														disabled={closedQuarters[q]}
														min={0}
														className="text-center font-bold text-lg"
													/>
												</div>
											</div>

											{/* SPRINT WINNER */}
											<button
												type="button"
												onClick={() => {
													if (closedQuarters[q]) return;

													if (hasWinner) {
														setSprintWinners((prev) => ({ ...prev, [quarter]: null }));
														return;
													}

													setActiveSprintQuarter(quarter);
													setSprintModalOpen(true);
												}}
												className={`w-full mt-2 py-2 rounded-md text-xs font-semibold transition-all border ${
													hasWinner
														? "bg-green-500 text-white border-green-600"
														: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600"
												}`}
											>
												{hasWinner ? "Sprint ganado" : "Sprint NO ganado"}
											</button>

											{hasWinner ? (
												<div className="rounded-md border bg-card/60 px-2 py-1 text-[11px] text-muted-foreground">
													Ganador: <span className="font-medium text-foreground">{winnerLabel}</span>
												</div>
											) : null}

											<Button
												size="sm"
												variant={closedQuarters[q] ? "default" : "destructive"}
												onClick={() => setClosedQuarters((prev) => ({ ...prev, [q]: !prev[q] }))}
												className="w-full mt-2 text-xs"
											>
												{closedQuarters[q] ? "Abrir Parcial" : "Cerrar Parcial"}
											</Button>
										</div>
									);
								})}
							</div>
						</div>

						<SprintWinnerModal
							open={sprintModalOpen}
							quarter={activeSprintQuarter}
							players={allPlayers}
							activePlayerIds={activePlayerIds}
							onClose={() => {
								setSprintModalOpen(false);
								setActiveSprintQuarter(null);
							}}
							onConfirm={(playerId) => {
								if (!activeSprintQuarter) return;

								setSprintWinners((prev) => ({
									...prev,
									[activeSprintQuarter]: playerId
								}));

								setSprintModalOpen(false);
								setActiveSprintQuarter(null);
							}}
						/>

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
				</TabsContent>

				<TabsContent value="field">
					{/* <CardHeader>
							<CardTitle>Jugadores de Campo</CardTitle>
						</CardHeader> */}
					<div>
						<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
							{fieldPlayers.map((player) => (
								<div key={player.id} className="relative">
									<Button
										variant="outline"
										className="
                        group w-full p-0 h-auto overflow-hidden
                        aspect-square
                        rounded-xl border-2 bg-transparent
                        hover:bg-muted/40 hover:border-primary/40
                        hover:-translate-y-0.5 hover:shadow-md
                        transition-all
                        flex flex-col
                      "
										onClick={() => setSelectedPlayer(player)}
									>
										{/* TOP: FOTO */}
										<div className="relative w-full h-[62%] overflow-hidden">
											{player.photo_url ? (
												<img
													src={player.photo_url}
													alt={player.name}
													className="h-full w-full object-cover object-top group-hover:scale-[1.03] transition-transform"
													loading="lazy"
												/>
											) : (
												<div className="h-full w-full grid place-items-center bg-muted">
													<span className="text-2xl font-extrabold text-muted-foreground">#{player.number}</span>
												</div>
											)}

											<div
												className="
                            absolute inset-0 bg-gradient-to-t
                            from-white/80 via-white/10 to-transparent
                            dark:from-black/60 dark:via-black/15 dark:to-transparent
                          "
											/>

											{player.photo_url && (
												<div className="absolute top-2 right-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
													#{player.number}
												</div>
											)}
										</div>

										{/* MIDDLE: NOMBRE + GOLES */}
										<div className="w-full flex-1 flex flex-col items-center justify-center px-2 text-center">
											<p className="font-semibold text-sm w-full truncate group-hover:text-primary transition-colors">
												{player.name}
											</p>

											<p className="text-xs text-muted-foreground mt-1">
												{safeNumber(stats[player.id]?.goles_totales)} goles
												<span> | </span>
												{totalExpulsiones(stats[player.id])} expulsiones
											</p>
										</div>

										{/* BOTTOM: SUSTITUIR */}
										<div className="w-full px-2 pb-2 cursor-pointer">
											{!hasStats(player.id) && getAvailablePlayers(false).length > 0 ? (
												<div
													role="button"
													tabIndex={0}
													title="Sustituir jugador"
													className="
                              h-8 w-full rounded-md
                              bg-muted/70 hover:bg-blue-500/40
                              border border-border/70
                              inline-flex items-center justify-center gap-2
                              text-xs font-medium
                              transition-colors
                            "
													onClick={(e) => {
														e.stopPropagation();
														setSubstitutionPlayer(player);
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															e.stopPropagation();
															setSubstitutionPlayer(player);
														}
													}}
												>
													<RefreshCw className="h-4 w-4" />
													Sustituir
												</div>
											) : (
												// Mantiene altura constante para que todas las cards queden iguales
												<div className="h-8" />
											)}
										</div>
									</Button>
								</div>
							))}

							{/* CONVOCAR */}
							{getAvailablePlayers(false).length > 0 && fieldPlayers.length < 12 && (
								<Button
									variant="outline"
									className="
                      group w-full p-0 h-auto overflow-hidden
                      aspect-square
                      rounded-xl border-2 border-dashed bg-transparent
                      hover:bg-green-500/10 hover:border-green-500/60
                      hover:-translate-y-0.5 hover:shadow-md
                      transition-all
                      flex flex-col
                    "
									onClick={() => setShowAddPlayerDialog(true)}
								>
									<div className="w-full h-[52%] grid place-items-center bg-muted/40">
										<Plus className="h-10 w-10 text-green-600" />
									</div>

									<div className="w-full flex-1 flex flex-col items-center justify-center px-2 text-center">
										<p className="font-semibold text-sm">Convocar jugador</p>
										<p className="text-xs text-muted-foreground mt-1">Añadir a la lista</p>
									</div>

									<div className="w-full px-2 pb-2">
										<div className="h-8 w-full rounded-md border border-green-500/40 bg-green-500/10 grid place-items-center text-xs font-medium text-green-700 dark:text-green-400">
											Añadir
										</div>
									</div>
								</Button>
							)}
						</div>
					</div>
				</TabsContent>

				<TabsContent value="goalkeepers">
					<div>
						<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
							{goalkeepers.map((player) => (
								<div key={player.id} className="relative">
									<Button
										variant="outline"
										className="
                        group w-full p-0 h-auto overflow-hidden
                        aspect-square
                        rounded-xl border-2 bg-transparent
                        hover:bg-muted/40 hover:border-primary/40
                        hover:-translate-y-0.5 hover:shadow-md
                        transition-all
                        flex flex-col
                      "
										onClick={() => setSelectedPlayer(player)}
									>
										{/* TOP: FOTO (más alta en móvil) */}
										<div className="relative w-full h-[62%] overflow-hidden">
											{player.photo_url ? (
												<img
													src={player.photo_url}
													alt={player.name}
													className="h-full w-full object-cover object-top group-hover:scale-[1.03] transition-transform"
													loading="lazy"
												/>
											) : (
												<div className="h-full w-full grid place-items-center bg-muted">
													<span className="text-2xl font-extrabold text-muted-foreground">#{player.number}</span>
												</div>
											)}

											<div
												className="
                            absolute inset-0 bg-gradient-to-t
                            from-white/80 via-white/10 to-transparent
                            dark:from-black/60 dark:via-black/15 dark:to-transparent
                          "
											/>

											{player.photo_url && (
												<div className="absolute top-2 right-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
													#{player.number}
												</div>
											)}
										</div>

										{/* MIDDLE: NOMBRE + STATS */}
										<div className="w-full flex-1 flex flex-col items-center justify-center px-1.5 sm:px-2 text-center">
											<p className="font-semibold text-[11px] sm:text-sm w-full truncate group-hover:text-primary transition-colors">
												{player.name}
											</p>

											<p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
												{safeNumber(stats[player.id]?.portero_goles_totales)} goles
												<span className="mx-1">|</span>
												{calcParadasTotales(stats[player.id])} paradas
											</p>
										</div>

										{/* BOTTOM: SUSTITUIR (sin button dentro de button) */}
										<div className="w-full px-1.5 sm:px-2 pb-1.5 sm:pb-2">
											{!hasStats(player.id) && getAvailablePlayers(true).length > 0 ? (
												<div
													role="button"
													tabIndex={0}
													title="Sustituir jugador"
													className="
                              h-7 sm:h-8 w-full rounded-md
                              bg-muted/70 hover:bg-muted
                              border border-border/70
                              inline-flex items-center justify-center gap-2
                              text-[10px] sm:text-xs font-medium
                              transition-colors
                            "
													onClick={(e) => {
														e.stopPropagation();
														setSubstitutionPlayer(player);
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															e.stopPropagation();
															setSubstitutionPlayer(player);
														}
													}}
												>
													<RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
													Sustituir
												</div>
											) : (
												<div className="h-7 sm:h-8" />
											)}
										</div>
									</Button>
								</div>
							))}
						</div>
					</div>
				</TabsContent>

				{isTied && (
					<PenaltiesTab
						homeGoals={homeGoals}
						awayGoals={awayGoals}
						homeTeamName={homeTeamName}
						awayTeamName={awayTeamName}
						myClubName={myClub?.name}
						opponent={opponent}
						fieldPlayers={fieldPlayers}
						goalkeepers={goalkeepers}
						penaltyShooters={penaltyShooters}
						setPenaltyShooters={setPenaltyShooters}
						rivalPenalties={rivalPenalties}
						setRivalPenalties={setRivalPenalties}
						penaltyGoalkeeperMap={penaltyGoalkeeperMap}
						setPenaltyGoalkeeperMap={setPenaltyGoalkeeperMap}
						setShowPenaltyShooterDialog={setShowPenaltyShooterDialog}
					/>
				)}
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
					onRemove={(playerId) => {
						handleRemovePlayer(playerId);
						setSubstitutionPlayer(null);
					}}
				/>
			)}

			{/* ADD DIALOG TO SELECT PLAYER TO ADD */}
			{showAddPlayerDialog && (
				<Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Plus className="h-5 w-5" />
								Convocar Jugador
							</DialogTitle>
							<DialogDescription>Selecciona un jugador de campo para añadir a la convocatoria (máximo 12)</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="add-player">Selecciona el jugador</Label>
								<Select
									value={selectedAddPlayer?.id.toString() || ""}
									onValueChange={(value) => {
										const player = allPlayers.find((p) => p.id === Number(value));
										setSelectedAddPlayer(player || null);
									}}
								>
									<SelectTrigger id="add-player">
										<SelectValue placeholder="Elige un jugador..." />
									</SelectTrigger>
									<SelectContent>
										{getAvailablePlayers(false).length === 0 ? (
											<div className="p-2 text-sm text-muted-foreground text-center">No hay jugadores disponibles</div>
										) : (
											getAvailablePlayers(false).map((player) => (
												<SelectItem key={player.id} value={player.id.toString()}>
													#{player.number} - {player.name}
												</SelectItem>
											))
										)}
									</SelectContent>
								</Select>
							</div>

							<div className="flex justify-end gap-2 pt-4">
								<Button variant="outline" onClick={() => setShowAddPlayerDialog(false)}>
									Cancelar
								</Button>
								<Button
									onClick={() => {
										if (selectedAddPlayer) {
											handleAddPlayer(selectedAddPlayer.id);
										}
									}}
									disabled={!selectedAddPlayer}
								>
									<Plus className="mr-2 h-4 w-4" />
									Convocar
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
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
											className="w-full h-full object-cover object-top"
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
								goalkeeperShots={goalkeeperShots}
								setGoalkeeperShots={setGoalkeeperShots}
								match={existingMatch as any}
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

			{showPenaltyShooterDialog && (
				<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
					<div className="bg-background border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
						{/* Header con gradiente */}
						<div className="relative p-6 border-b border-border bg-gradient-to-br from-blue-500/10 via-primary/5 to-transparent">
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1">
									<h2 className="text-2xl font-bold text-foreground mb-1">Añadir Lanzador</h2>
									<p className="text-sm text-muted-foreground">Selecciona el jugador y el resultado del penalti</p>
								</div>
								<button
									type="button"
									onClick={() => setShowPenaltyShooterDialog(false)}
									className="flex-shrink-0 w-9 h-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						{/* Lista de jugadores con scroll */}
						<div className="flex-1 overflow-y-auto p-6">
							{(() => {
								const availablePlayers = fieldPlayers.filter((p) => !penaltyShooters.some((s) => s.playerId === p.id));

								if (availablePlayers.length === 0) {
									return (
										<div className="flex flex-col items-center justify-center py-16 text-center">
											<div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
												<Users className="h-10 w-10 text-muted-foreground" />
											</div>
											<p className="text-lg font-semibold text-foreground mb-2">No hay jugadores disponibles</p>
											<p className="text-sm text-muted-foreground max-w-[280px]">
												Todos los jugadores de campo ya fueron añadidos como lanzadores
											</p>
										</div>
									);
								}

								return (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{availablePlayers.map((player) => (
											<div
												key={player.id}
												className="group relative p-3 rounded-xl border-2 border-border hover:border-primary/40 bg-card hover:bg-accent/30 transition-all duration-200"
											>
												<div className="flex flex-col gap-3">
													{/* Info del jugador */}
													<div className="flex items-center gap-3">
														<div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center">
															<span className="text-lg font-bold text-primary">{player.number}</span>
														</div>
														<div className="flex-1 min-w-0">
															<p className="font-semibold text-sm text-foreground truncate">{player.name}</p>
															<p className="text-xs text-muted-foreground">
																{player.is_goalkeeper ? "Portero" : "Jugador"}
															</p>
														</div>
													</div>

													{/* Botones de acción */}
													<div className="flex gap-2">
														<button
															type="button"
															onClick={() => {
																setPenaltyShooters((prev) => [...prev, { playerId: player.id, scored: true }]);
																setShowPenaltyShooterDialog(false);
															}}
															className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-medium shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 transition-all duration-200 flex items-center justify-center gap-1.5"
														>
															<CheckCircle className="h-4 w-4" />
															<span>Gol</span>
														</button>
														<button
															type="button"
															onClick={() => {
																setPenaltyShooters((prev) => [...prev, { playerId: player.id, scored: false }]);
																setShowPenaltyShooterDialog(false);
															}}
															className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/40 transition-all duration-200 flex items-center justify-center gap-1.5"
														>
															<XCircle className="h-4 w-4" />
															<span>Falla</span>
														</button>
													</div>
												</div>
											</div>
										))}
									</div>
								);
							})()}
						</div>

						{/* Footer */}
						<div className="p-6 border-t border-border bg-muted/20">
							<button
								type="button"
								onClick={() => setShowPenaltyShooterDialog(false)}
								className="w-full px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
							>
								Cerrar
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="fixed bottom-6 right-6 z-40">
				<Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
					{saving ? (
						<>
							<Loader2 className="mr-2 h-5 w-5 animate-spin" />
							Guardando...
						</>
					) : (
						<>
							<Save className="mr-2 h-5 w-5" />
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
			<TabsList className="grid grid-cols-5 w-full h-auto">
				<TabsTrigger
					value="goles"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					Goles
				</TabsTrigger>

				<TabsTrigger
					value="tiros"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					Tiros
				</TabsTrigger>

				<TabsTrigger
					value="superioridad"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					<span className="sm:hidden">Sup.</span>
					<span className="hidden sm:inline">Superioridad</span>
				</TabsTrigger>

				<TabsTrigger
					value="faltas"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					Faltas
				</TabsTrigger>

				<TabsTrigger
					value="acciones"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					Acciones
				</TabsTrigger>
			</TabsList>

			<TabsContent value="goles" className="space-y-4 mt-4">
				<p className="text-sm text-muted-foreground mb-4">El total se calcula automáticamente sumando todos los tipos de goles.</p>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField label="Totales" value={safeNumber(stats.goles_totales)} onChange={() => {}} readOnly />
					<StatField label="Boya/Jugada" value={safeNumber(stats.goles_boya_jugada)} onChange={(v) => onUpdate("goles_boya_jugada", v)} />
					<StatField label="Lanzamiento" value={safeNumber(stats.goles_lanzamiento)} onChange={(v) => onUpdate("goles_lanzamiento", v)} />
					<StatField label="Dir +6m" value={safeNumber(stats.goles_dir_mas_5m)} onChange={(v) => onUpdate("goles_dir_mas_5m", v)} />
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
					<StatField
						label="Penalti Fallado"
						value={safeNumber(stats.tiros_penalti_fallado)}
						onChange={(v) => onUpdate("tiros_penalti_fallado", v)}
					/>
					<StatField label="Corner" value={safeNumber(stats.tiros_corner)} onChange={(v) => onUpdate("tiros_corner", v)} />
					<StatField label="Fuera" value={safeNumber(stats.tiros_fuera)} onChange={(v) => onUpdate("tiros_fuera", v)} />
					<StatField label="Parados" value={safeNumber(stats.tiros_parados)} onChange={(v) => onUpdate("tiros_parados", v)} />
					<StatField label="Bloqueado" value={safeNumber(stats.tiros_bloqueado)} onChange={(v) => onUpdate("tiros_bloqueado", v)} />
					<StatField label="Palo" value={safeNumber(stats.tiro_palo)} onChange={(v) => onUpdate("tiro_palo", v)} />
					<StatField
						label="Eficiencia (general) %"
						value={(() => {
							const golesGenerales =
								safeNumber(stats.goles_boya_jugada) +
								safeNumber(stats.goles_lanzamiento) +
								safeNumber(stats.goles_dir_mas_5m) +
								safeNumber(stats.goles_contraataque) +
								safeNumber(stats.goles_penalti_anotado) +
								safeNumber(stats.goles_hombre_mas) +
								safeNumber(stats.gol_del_palo_sup);

							const fallosGenerales =
								safeNumber(stats.tiros_penalti_fallado) +
								safeNumber(stats.tiros_corner) +
								safeNumber(stats.tiros_fuera) +
								safeNumber(stats.tiros_parados) +
								safeNumber(stats.tiros_bloqueado) +
								safeNumber(stats.tiro_palo) +
								safeNumber(stats.tiros_hombre_mas);

							const intentos = golesGenerales + fallosGenerales;

							return intentos > 0 ? Math.round((golesGenerales / intentos) * 100) : 0;
						})()}
						onChange={() => {}}
						readOnly
						suffix="%"
					/>
				</div>
			</TabsContent>

			<TabsContent value="superioridad" className="space-y-4 mt-4">
				<p className="text-sm text-muted-foreground mb-4">Estadísticas específicas de superioridad (Hombre +).</p>

				<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
					<StatField label="Goles H+" value={safeNumber(stats.goles_hombre_mas)} onChange={(v) => onUpdate("goles_hombre_mas", v)} />
					<StatField label="Gol del palo H+" value={safeNumber(stats.gol_del_palo_sup)} onChange={(v) => onUpdate("gol_del_palo_sup", v)} />
					<StatField label="Fallos H+" value={safeNumber(stats.tiros_hombre_mas)} onChange={(v) => onUpdate("tiros_hombre_mas", v)} />

					<StatField
						label="Rebote Recup."
						value={safeNumber(stats.rebote_recup_hombre_mas)}
						onChange={(v) => onUpdate("rebote_recup_hombre_mas", v)}
					/>

					<StatField
						label="Rebote Perd."
						value={safeNumber(stats.rebote_perd_hombre_mas)}
						onChange={(v) => onUpdate("rebote_perd_hombre_mas", v)}
					/>

					<StatField
						label="Eficiencia %"
						value={(() => {
							const g = safeNumber(stats.goles_hombre_mas);
							const gp = safeNumber(stats.gol_del_palo_sup);
							const t = safeNumber(stats.tiros_hombre_mas);

							const goals = g + gp;
							const attempts = goals + t;

							return attempts > 0 ? Math.round((goals / attempts) * 100) : 0;
						})()}
						onChange={() => {}}
						readOnly
						suffix="%"
					/>
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
					<StatField label="Exp (Simple)" value={safeNumber(stats.faltas_exp_simple)} onChange={(v) => onUpdate("faltas_exp_simple", v)} />
					<StatField label="Exp trans. def." value={safeNumber(stats.exp_trans_def)} onChange={(v) => onUpdate("exp_trans_def", v)} />
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
					<StatField
						label="Pérdida Posesión"
						value={safeNumber(stats.acciones_perdida_poco)}
						onChange={(v) => onUpdate("acciones_perdida_poco", v)}
					/>
					<StatField
						label="Contrafaltas"
						value={safeNumber(stats.faltas_contrafaltas)}
						onChange={(v) => onUpdate("faltas_contrafaltas", v)}
					/>
					<StatField label="Pase boya" value={safeNumber(stats.pase_boya)} onChange={(v) => onUpdate("pase_boya", v)} />
					<StatField
						label="Pase boya fallado"
						value={safeNumber(stats.pase_boya_fallado)}
						onChange={(v) => onUpdate("pase_boya_fallado", v)}
					/>
				</div>
			</TabsContent>
		</Tabs>
	);
}

function GoalkeeperStatsDialog({
	player,
	stats,
	onUpdate,
	goalkeeperShots,
	setGoalkeeperShots
}: {
	player: Player;
	stats: Partial<MatchStats>;
	onUpdate: (field: keyof MatchStats, value: number) => void;
	match: Match;
	goalkeeperShots: GoalkeeperShotDraft[];
	setGoalkeeperShots: (next: GoalkeeperShotDraft[]) => void;
}) {
	const totalGoalsConceded =
		safeNumber(stats.portero_goles_boya_parada) +
		safeNumber(stats.portero_goles_hombre_menos) +
		safeNumber(stats.portero_goles_dir_mas_5m) +
		safeNumber(stats.portero_goles_contraataque) +
		safeNumber(stats.portero_goles_lanzamiento) +
		safeNumber(stats.portero_gol_palo) +
		safeNumber(stats.portero_goles_penalti);

	return (
		<Tabs defaultValue="goles" className="w-full">
			<TabsList className="grid w-full grid-cols-4 h-auto">
				<TabsTrigger value="goles" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					Goles
				</TabsTrigger>
				<TabsTrigger value="paradas" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					Paradas
				</TabsTrigger>
				<TabsTrigger value="inferioridad" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					<span className="sm:hidden block truncate">Inf.</span>
					<span className="hidden sm:inline block truncate">Inferioridad</span>
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
						label="Dir +6m"
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
					<StatField
						label="Lanzamiento"
						value={safeNumber(stats.portero_goles_lanzamiento)}
						onChange={(v) => onUpdate("portero_goles_lanzamiento", v)}
					/>
					<StatField label="Gol de palo" value={safeNumber(stats.portero_gol_palo)} onChange={(v) => onUpdate("portero_gol_palo", v)} />
				</div>
				<GoalkeeperGoalsRecorder goalkeeperPlayerId={player.id} shots={goalkeeperShots} onChangeShots={setGoalkeeperShots} />
			</TabsContent>

			<TabsContent value="paradas" className="space-y-4 mt-4">
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField
						label="Totales"
						value={
							safeNumber(stats.portero_tiros_parada_recup) +
							safeNumber(stats.portero_paradas_fuera) +
							safeNumber(stats.portero_paradas_penalti_parado) +
							safeNumber(stats.portero_paradas_hombre_menos)
						}
						onChange={() => {}}
						readOnly
					/>

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
						label="Lanz. recibido fuera"
						value={safeNumber(stats.lanz_recibido_fuera)}
						onChange={(v) => onUpdate("lanz_recibido_fuera", v)}
					/>
					<StatField label="Lanz. al palo" value={safeNumber(stats.portero_lanz_palo)} onChange={(v) => onUpdate("portero_lanz_palo", v)} />
				</div>
				<GoalkeeperSavesRecorder goalkeeperPlayerId={player.id} shots={goalkeeperShots} onChangeShots={setGoalkeeperShots} />
			</TabsContent>

			<TabsContent value="inferioridad" className="space-y-4 mt-4">
				<p className="text-sm text-muted-foreground mb-4">
					Estadísticas de inferioridad numérica (Hombre -). Se suman automáticamente al marcador del rival.
				</p>

				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					<StatField
						label="Goles Hombre -"
						value={safeNumber(stats.portero_goles_hombre_menos)}
						onChange={(v) => onUpdate("portero_goles_hombre_menos", v)}
					/>

					<StatField
						label="Paradas Hombre -"
						value={safeNumber(stats.portero_paradas_hombre_menos)}
						onChange={(v) => onUpdate("portero_paradas_hombre_menos", v)}
					/>

					<StatField
						label="Fuera"
						value={safeNumber(stats.portero_inferioridad_fuera)}
						onChange={(v) => onUpdate("portero_inferioridad_fuera", v)}
					/>

					<StatField
						label="Bloqueo"
						value={safeNumber(stats.portero_inferioridad_bloqueo)}
						onChange={(v) => onUpdate("portero_inferioridad_bloqueo", v)}
					/>

					<StatField
						label="Eficiencia %"
						value={(() => {
							const goles = safeNumber(stats.portero_goles_hombre_menos);
							const paradas = safeNumber(stats.portero_paradas_hombre_menos);
							const total = goles + paradas;
							return total > 0 ? Math.round((paradas / total) * 100) : 0;
						})()}
						onChange={() => {}}
						readOnly
						suffix="%"
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
					<StatField label="Gol" value={safeNumber(stats.portero_gol)} onChange={(v) => onUpdate("portero_gol", v)} />
					<StatField
						label="Gol Superioridad"
						value={safeNumber(stats.portero_gol_superioridad)}
						onChange={(v) => onUpdate("portero_gol_superioridad", v)}
					/>
					<StatField
						label="Fallo Superioridad"
						value={safeNumber(stats.portero_fallo_superioridad)}
						onChange={(v) => onUpdate("portero_fallo_superioridad", v)}
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
	const month = now.getMonth() + 1;

	if (month >= 9) {
		return `${year}-${year + 1}`;
	} else {
		return `${year - 1}-${year}`;
	}
};
