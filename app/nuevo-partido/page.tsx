"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatInput } from "@/components/stat-input";
import Image from "next/image";
import type { Player, MatchStats, Profile, Match, MatchAction } from "@/lib/types";
import { Loader2, AlertCircle, RefreshCw, Plus, Save, Cloud, CloudOff, CheckCircle2, CirclePlay, CircleStop } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlayerSubstitutionDialog } from "@/components/player-substitution-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";
import { SprintWinnerModal } from "@/components/nuevo-partido/modals/SprintWinnerPlayerModal";
import {
	GoalkeeperGoalsRecorder,
	GoalkeeperSavesRecorder,
	GoalkeeperShotDraft
} from "@/components/nuevo-partido/modal-stats/GoalkeeperShotsRecorder";
import { Competition } from "@/lib/admin";
import { PenaltiesTab, type PenaltyShooter, type RivalPenalty } from "@/components/players-components/PenaltiesTab";
import { PenaltyShooterDialog } from "@/components/players-components/PenaltyShooterDialog";
import { useHiddenStats } from "@/hooks/useHiddenStats";
import { useMatchAutosave } from "@/hooks/useMatchAutosave";
import { loadBestMatchDraft } from "@/lib/match-draft-client";
import type { MatchDraftPayload } from "@/lib/match-drafts";
import { MatchChronology } from "@/components/match-actions/MatchChronology";
import { MatchSaveError, saveMatchBundle, stripManagedStatFields, type MatchSavePayload } from "@/lib/matches/reliable-save";
import {
	calculateMatchScore,
	FIELD_GOAL_ACTIONS,
	GOALKEEPER_CONCEDED_ACTIONS,
	GOALKEEPER_SCORED_ACTIONS
} from "@/lib/matches/calculate-match-score";

interface MatchEditParams {
	matchId?: string;
	draftKey?: string;
	isEditing?: boolean;
}

type DraftQuarter = 1 | 2 | 3 | 4;

type NewMatchDraftPayload = MatchDraftPayload & {
	schemaVersion: 1;
	matchDate: string;
	opponent: string;
	location: string;
	isHome: boolean;
	season: string;
	jornada: number;
	notes: string;
	competitionId: string;
	closedQuarters: Record<DraftQuarter, boolean>;
	quarterScores: Record<DraftQuarter, { home: number; away: number }>;
	sprintWinners: Record<DraftQuarter, number | null>;
	penaltyHomeScore: number | null;
	penaltyAwayScore: number | null;
	penaltyShooters: PenaltyShooter[];
	rivalPenalties: RivalPenalty[];
	penaltyGoalkeeperMap: Record<number, number>;
	activePlayerIds: number[];
	stats: Record<number, Partial<MatchStats>>;
	goalkeeperShots: GoalkeeperShotDraft[];
	activeQuarter?: DraftQuarter | null;
	matchActions?: MatchAction[];
};

function isNewMatchDraftPayload(payload: MatchDraftPayload): payload is NewMatchDraftPayload {
	return payload.schemaVersion === 1 && typeof payload.matchDate === "string" && Array.isArray(payload.activePlayerIds) && typeof payload.stats === "object";
}

export default function NewMatchPage({ searchParams }: { searchParams: Promise<MatchEditParams> }) {
	const pageT = useTranslations("Pages");
	const t = useTranslations("NewMatch");
	const locale = useLocale();
	const [closedQuarters, setClosedQuarters] = useState<Record<number, boolean>>({
		1: false,
		2: false,
		3: false,
		4: false
	});
	const [activeQuarter, setActiveQuarter] = useState<DraftQuarter | null>(null);
	const [matchActions, setMatchActions] = useState<MatchAction[]>([]);
	const nextActionSequenceRef = useRef(1);
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
		if (!p) return t("playerNotFound");
		return `#${p.number} · ${p.name}`;
	};

	const [competitions, setCompetitions] = useState<Competition[]>([]);
	const [competitionId, setCompetitionId] = useState<string>("");

	const [penaltyHomeScore, setPenaltyHomeScore] = useState<number | null>(null);
	const [penaltyAwayScore, setPenaltyAwayScore] = useState<number | null>(null);
	const [penaltyShooters, setPenaltyShooters] = useState<PenaltyShooter[]>([]);
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
	const [previousMatches, setPreviousMatches] = useState<Array<Pick<Match, "id" | "match_date" | "opponent" | "season">>>([]);
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
	const [initialDraftRevision, setInitialDraftRevision] = useState(0);
	const [initialDraftCreatedAt, setInitialDraftCreatedAt] = useState<string | null>(null);
	const [initialDraftExpiresAt, setInitialDraftExpiresAt] = useState<string | null>(null);
	const [draftRecovered, setDraftRecovered] = useState(false);
	const [activeDraftKey, setActiveDraftKey] = useState<string | null>(null);
	const initialPenaltySavesRef = useRef<Record<number, number>>({});

	const playersById = useMemo(() => {
		const m = new Map<number, Player>();
		for (const p of allPlayers) m.set(p.id, p);
		return m;
	}, [allPlayers]);

	const hiddenStatsState = useHiddenStats();

	const isStatVisible = (statKey: keyof MatchStats | string) => {
		return !hiddenStatsState.isHidden(String(statKey));
	};

	const sumVisibleStats = (statsObj: Partial<MatchStats> | undefined | null, keys: (keyof MatchStats)[]) => {
		return keys.reduce((sum, key) => {
			if (!isStatVisible(key)) return sum;
			return sum + safeNumber(statsObj?.[key] as number | undefined | null);
		}, 0);
	};

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
			if ((comps ?? []).length > 0) setCompetitionId((current) => current || String(comps![0].id));
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

	useEffect(() => {
		async function initializeFromParams() {
			const params = await searchParams;

			if (params.matchId) {
				setEditingMatchId(Number(params.matchId));
			}

			const authorizedProfile = await checkPermissions();
			if (!authorizedProfile) {
				setLoading(false);
				return;
			}
			await loadPlayers(params.matchId ? Number(params.matchId) : null);
			await loadPreviousMatches();

			if (params.matchId) {
				await loadExistingMatch(Number(params.matchId), authorizedProfile.club_id!);
			}

			if (authorizedProfile.club_id) {
				const matchId = params.matchId ? Number(params.matchId) : null;
				const requestedDraftKey = typeof params.draftKey === "string" && params.draftKey.length <= 160 ? params.draftKey : null;
				const createDraftKey = () => `${matchId ? `edit:${matchId}` : "new"}:${authorizedProfile.club_id}:${crypto.randomUUID()}`;
				let selectedDraftKey = createDraftKey();

				if (requestedDraftKey) {
					const draft = await loadBestMatchDraft<NewMatchDraftPayload>(authorizedProfile.id, requestedDraftKey, authorizedProfile.club_id);
					if (draft && Date.parse(draft.expiresAt) > Date.now() && isNewMatchDraftPayload(draft.payload)) {
						selectedDraftKey = requestedDraftKey;
						const saved = draft.payload;
						setMatchDate(saved.matchDate);
						setOpponent(saved.opponent);
						setLocation(saved.location);
						setIsHome(saved.isHome);
						setSeason(saved.season);
						setJornada(saved.jornada);
						setNotes(saved.notes);
						setCompetitionId(saved.competitionId);
						setClosedQuarters(saved.closedQuarters);
						setQuarterScores(saved.quarterScores);
						setSprintWinners(saved.sprintWinners);
						setPenaltyHomeScore(saved.penaltyHomeScore);
						setPenaltyAwayScore(saved.penaltyAwayScore);
						setPenaltyShooters(saved.penaltyShooters);
						setRivalPenalties(saved.rivalPenalties);
						setPenaltyGoalkeeperMap(saved.penaltyGoalkeeperMap);
						setActivePlayerIds(saved.activePlayerIds);
						setStats(saved.stats);
						setGoalkeeperShots(saved.goalkeeperShots);
						const savedActions = Array.isArray(saved.matchActions) ? saved.matchActions : [];
						setActiveQuarter(saved.activeQuarter ?? null);
						setMatchActions(savedActions);
						nextActionSequenceRef.current = savedActions.reduce((max, action) => Math.max(max, action.sequence), 0) + 1;
						setInitialDraftRevision(draft.revision);
						setInitialDraftCreatedAt(draft.createdAt);
						setInitialDraftExpiresAt(draft.expiresAt);
						setDraftRecovered(true);
					}
				}

				setActiveDraftKey(selectedDraftKey);
			}

			setLoading(false);
		}

		initializeFromParams();
	}, [searchParams]);

	const checkPermissions = async () => {
		if (!supabase) {
			setPermissionError(true);
			return null;
		}

		try {
			const {
				data: { user }
			} = await supabase.auth.getUser();

			if (!user) {
				router.push("/auth/login");
				return null;
			}

			const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

			if (!profileData || (profileData.role !== "admin" && profileData.role !== "coach")) {
				setPermissionError(true);
				return null;
			}

			setProfile(profileData);
			return profileData as Profile;
		} catch (error) {
			console.error("[v0] Auth error:", error);
			setPermissionError(true);
			return null;
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
			alert(t("lineupLoadError"));
		} finally {
			setLoadingLineup(false);
		}
	};

	const loadPlayers = async (matchId: number | null = null) => {
		if (!supabase) return;

		try {
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) return;

			const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

			if (!profileData?.club_id) return;

			const { data, error } = await supabase
				.from("players")
				.select("*")
				.eq("club_id", profileData.club_id)
				.order("number");

			if (error || !data) {
				console.error("[v0] Error loading players:", error);
				setAllPlayers([]);
				return;
			}

			let availablePlayers = matchId ? data : data.filter((player) => player.is_active !== false);

			if (!matchId) {
				const { data: activeSeason, error: seasonError } = await supabase
					.from("club_seasons")
					.select("id, name")
					.eq("club_id", profileData.club_id)
					.eq("status", "active")
					.maybeSingle();

				if (!seasonError && activeSeason) {
					setSeason(activeSeason.name);
					const { data: rosterRows, error: rosterError } = await supabase
						.from("player_seasons")
						.select("number, is_goalkeeper, players:player_id(*)")
						.eq("club_season_id", activeSeason.id)
						.eq("is_active", true)
						.order("number");

					if (!rosterError && rosterRows) {
						availablePlayers = rosterRows.flatMap((row) => {
							const relation = Array.isArray(row.players) ? row.players[0] : row.players;
							return relation ? [{ ...relation, number: row.number, is_goalkeeper: row.is_goalkeeper, is_active: true } as Player] : [];
						});
					}
				}
			}
			setAllPlayers(availablePlayers);

			// Solo inicializamos los 14 primeros jugadores si estamos creando un partido NUEVO
			if (!matchId) {
				const initialActiveIds = availablePlayers.slice(0, 14).map((p) => p.id);
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
		portero_paradas_superioridad: 0,
		jugador_superioridad_bloqueo: 0,

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
		portero_lanz_palo_inf: 0,
		portero_parada_fuera_inf: 0,
		lanz_recibido_fuera: 0,
		portero_gol_palo: 0,
		portero_lanz_palo: 0,
		tiro_fallado_portero: 0,
		portero_penalti_palo: 0,
		portero_penalti_fuera: 0,
		portero_acciones_exp_provocada: 0,
		portero_acciones_asistencias: 0,

		rebote_recup_hombre_mas: 0,
		rebote_perd_hombre_mas: 0
	});

	const hasStats = (playerId: number): boolean => {
		const playerStats = stats[playerId];
		if (!playerStats) return false;

		return Object.entries(playerStats).some(([key, value]) => {
			if (key === "player_id" || key === "match_id") return false;
			if (!isStatVisible(key)) return false;
			return typeof value === "number" && value > 0;
		});
	};

	const calcParadasTotales = (s?: Partial<MatchStats> | null) => {
		if (!s) return 0;

		return sumVisibleStats(s, [
			"portero_tiros_parada_recup",
			"portero_paradas_fuera",
			"portero_paradas_penalti_parado",
			"portero_paradas_hombre_menos",
			"portero_parada_fuera_inf"
		]);
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
			alert(t("maxFieldPlayers"));
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

	const loadExistingMatch = async (matchId: number, clubId: number) => {
		if (!supabase) return;

		try {
			const { data: match, error } = await supabase
				.from("matches")
				.select("*")
				.eq("id", matchId)
				.eq("club_id", clubId)
				.single();

			if (error || !match) {
				console.error("Error loading match:", error);
				return;
			}

			if (match.season_id) {
				const { data: rosterRows } = await supabase
					.from("player_seasons")
					.select("number, is_goalkeeper, players:player_id(*)")
					.eq("club_season_id", match.season_id)
					.order("number");
				if (rosterRows && rosterRows.length > 0) {
					setAllPlayers(rosterRows.flatMap((row) => {
						const relation = Array.isArray(row.players) ? row.players[0] : row.players;
						return relation ? [{ ...relation, number: row.number, is_goalkeeper: row.is_goalkeeper } as Player] : [];
					}));
				}
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
			setActiveQuarter(null);

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

			const { data: actionRows, error: actionsError } = await supabase
				.from("match_actions")
				.select("id, client_id, match_id, player_id, quarter, sequence, action_key, created_by, created_at")
				.eq("match_id", matchId)
				.order("sequence", { ascending: true });

			if (actionsError) {
				console.error("Error loading match chronology:", actionsError);
			} else {
				const loadedActions = (actionRows ?? []) as MatchAction[];
				setMatchActions(loadedActions);
				nextActionSequenceRef.current = loadedActions.reduce((max, action) => Math.max(max, action.sequence), 0) + 1;
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
				initialPenaltySavesRef.current = penaltyPlayers
					.filter((penalty) => penalty.result_type === "saved" && penalty.goalkeeper_id)
					.reduce<Record<number, number>>((counts, penalty) => {
						const goalkeeperId = Number(penalty.goalkeeper_id);
						counts[goalkeeperId] = (counts[goalkeeperId] ?? 0) + 1;
						return counts;
					}, {});
				setPenaltyShooters(
					penaltyPlayers
						.filter((p) => p.player_id !== null)
						.map((p) => ({
							id: p.id, // ✅ importante
							playerId: p.player_id!,
							scored: !!p.scored
						}))
				);
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
						y: s.y,
						quarter: s.quarter ?? undefined
					}))
				);
			}
		} catch (error) {
			console.error("Error loading existing match:", error);
		}
	};

	const applyStatValue = (playerId: number, field: keyof MatchStats, value: number) => {
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
					"portero_paradas_hombre_menos",
					"portero_parada_fuera_inf"
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
					"portero_gol",
					"portero_gol_superioridad",
					"portero_goles_lanzamiento",
					"portero_gol_palo"
				];

				if (field.startsWith("portero_gol") || field.startsWith("portero_goles_")) {
					newStats.portero_goles_totales = sumVisibleStats(newStats, goalkeeperGoalCategories) as any;
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
					newStats.goles_totales = sumVisibleStats(newStats, goalCategories) as any;

					const totalMissedShots = sumVisibleStats(newStats, shotCategories);

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

	const adjustQuarterScore = (quarter: DraftQuarter, playerId: number, field: keyof MatchStats, delta: number) => {
		if (delta === 0) return;
		const player = playersById.get(playerId);
		const side = player?.is_goalkeeper && GOALKEEPER_CONCEDED_ACTIONS.has(field)
			? "away"
			: player?.is_goalkeeper && GOALKEEPER_SCORED_ACTIONS.has(field)
				? "home"
			: !player?.is_goalkeeper && FIELD_GOAL_ACTIONS.has(field)
				? "home"
				: null;
		if (!side) return;

		setQuarterScores((current) => ({
			...current,
			[quarter]: {
				...current[quarter],
				[side]: Math.max(0, current[quarter][side] + delta)
			}
		}));
	};

	const recordActionDelta = (playerId: number, field: keyof MatchStats, delta: number, quarter: DraftQuarter) => {
		if (delta > 0) {
			const additions = Array.from({ length: delta }, () => ({
				client_id: crypto.randomUUID(),
				player_id: playerId,
				quarter,
				sequence: nextActionSequenceRef.current++,
				action_key: String(field)
			}) satisfies MatchAction);
			setMatchActions((current) => [...current, ...additions]);
			return;
		}

		if (delta < 0) {
			setMatchActions((current) => {
				let toRemove = Math.abs(delta);
				const next = [...current];
				for (let index = next.length - 1; index >= 0 && toRemove > 0; index -= 1) {
					const action = next[index];
					if (action.player_id === playerId && action.action_key === field && action.quarter === quarter) {
						next.splice(index, 1);
						toRemove -= 1;
					}
				}
				return next;
			});
		}
	};

	const updateStat = (playerId: number, field: keyof MatchStats, value: number) => {
		if (!activeQuarter) {
			toast({ title: t("chronology.noOpenQuarterTitle"), description: t("chronology.noOpenQuarterDescription"), variant: "destructive" });
			return;
		}

		const previousValue = safeNumber(stats[playerId]?.[field] as number | undefined);
		const nextValue = safeNumber(value);
		const delta = nextValue - previousValue;
		if (delta === 0) return;

		applyStatValue(playerId, field, nextValue);
		recordActionDelta(playerId, field, delta, activeQuarter);
		adjustQuarterScore(activeQuarter, playerId, field, delta);
	};

	const removeMatchAction = (action: MatchAction) => {
		const field = action.action_key as keyof MatchStats;
		const currentValue = safeNumber(stats[action.player_id]?.[field] as number | undefined);
		if (currentValue > 0) applyStatValue(action.player_id, field, currentValue - 1);
		adjustQuarterScore(action.quarter, action.player_id, field, -1);
		setMatchActions((current) => current.filter((item) => item.client_id !== action.client_id));
	};

	const openQuarter = (quarter: DraftQuarter) => {
		if (activeQuarter && activeQuarter !== quarter) {
			toast({ title: t("chronology.closeCurrentTitle"), description: t("chronology.closeCurrentDescription", { quarter: activeQuarter }) });
			return;
		}
		setClosedQuarters((current) => ({ ...current, [quarter]: false }));
		setActiveQuarter(quarter);
	};

	const closeQuarter = (quarter: DraftQuarter) => {
		setClosedQuarters((current) => ({ ...current, [quarter]: true }));
		setActiveQuarter((current) => current === quarter ? null : current);
	};

	function buildPenaltyRows() {
		const homeRows = penaltyShooters.map((shooter, index) => ({
			player_id: Number(shooter.playerId),
			shot_order: index + 1,
			scored: Boolean(shooter.scored),
			result_type: shooter.scored ? "scored" as const : "missed" as const,
			goalkeeper_id: null
		}));
		const baseOrder = homeRows.length;
		const rivalRows = rivalPenalties.map((penalty, index) => {
			const result = penalty.result ?? "missed";
			return {
				player_id: null,
				shot_order: baseOrder + index + 1,
				scored: result === "scored",
				result_type: result,
				goalkeeper_id: result === "saved" ? (penaltyGoalkeeperMap[penalty.id] ?? null) : null
			};
		});

		return [...homeRows, ...rivalRows];
	}

	const handleSave = async () => {
		if (!opponent.trim()) {
			alert(t("opponentRequired"));
			return;
		}

		if (!profile || !profile.club_id) {
			alert(t("clubInfoError"));
			return;
		}

		if (activeQuarter) {
			toast({
				title: t("chronology.closeBeforeSaveTitle"),
				description: t("chronology.closeBeforeSaveDescription", { quarter: activeQuarter })
			});
			return;
		}

		const { ownGoals: homeGoals, opponentGoals: awayGoals } = calculateMatchScore(stats, playersById);
		const quarterOwnGoals = Object.values(quarterScores).reduce((total, quarter) => total + safeNumber(quarter.home), 0);
		const quarterOpponentGoals = Object.values(quarterScores).reduce((total, quarter) => total + safeNumber(quarter.away), 0);
		if (quarterOwnGoals !== homeGoals || quarterOpponentGoals !== awayGoals) {
			toast({
				title: t("scoreMismatchTitle"),
				description: t("scoreMismatchDescription", {
					ownTotal: homeGoals,
					ownPeriods: quarterOwnGoals,
					opponentTotal: awayGoals,
					opponentPeriods: quarterOpponentGoals
				}),
				variant: "destructive"
			});
			return;
		}

		const hasAnyPenaltyData = penaltyHomeScore !== null || penaltyAwayScore !== null || penaltyShooters.length > 0 || rivalPenalties.length > 0;

		if (hasAnyPenaltyData) {
			if (penaltyHomeScore === null || penaltyAwayScore === null) {
				alert(t("penaltyResultRequired"));
				return;
			}

			if (penaltyHomeScore === penaltyAwayScore) {
				alert(t("penaltyTieError"));
				return;
			}

			if (penaltyShooters.length === 0) {
				toast({
					title: t("warning"),
					description: t("penaltyShootersRequired"),
					variant: "destructive"
				});
				return;
			}
		}

		setSaving(true);

		try {
			const penaltySavesByGoalkeeper: Record<number, number> = {};
			rivalPenalties.forEach((penalty) => {
				if (penalty.result === "saved" && penaltyGoalkeeperMap[penalty.id]) {
					const gkId = penaltyGoalkeeperMap[penalty.id];
					penaltySavesByGoalkeeper[gkId] = (penaltySavesByGoalkeeper[gkId] || 0) + 1;
				}
			});

			const statsForSave: Record<number, Partial<MatchStats>> = {};
			for (const playerId of activePlayerIds) {
				const currentStats = { ...(stats[playerId] ?? createEmptyStats(playerId)), player_id: playerId };
				const player = playersById.get(playerId);
				if (player?.is_goalkeeper) {
					const previousAutomatic = initialPenaltySavesRef.current[playerId] ?? 0;
					const currentAutomatic = penaltySavesByGoalkeeper[playerId] ?? 0;
					const valueWithoutPreviousAutomatic = Math.max(0, safeNumber(currentStats.portero_paradas_penalti_parado) - previousAutomatic);
					currentStats.portero_paradas_penalti_parado = valueWithoutPreviousAutomatic + currentAutomatic;
				}
				statsForSave[playerId] = currentStats;
			}

			const penalties = homeGoals === awayGoals ? buildPenaltyRows() : [];
			const payload: MatchSavePayload = {
				draft_key: activeDraftKey,
				match: {
					id: editingMatchId,
					club_id: profile.club_id,
					match_date: matchDate,
					opponent: opponent.trim(),
					location: location.trim() || null,
					home_score: homeGoals,
					away_score: awayGoals,
					is_home: isHome,
					season: season.trim() || null,
					jornada: jornada || null,
					notes: notes.trim() || null,
					q1_score: quarterScores[1].home,
					q2_score: quarterScores[2].home,
					q3_score: quarterScores[3].home,
					q4_score: quarterScores[4].home,
					q1_score_rival: quarterScores[1].away,
					q2_score_rival: quarterScores[2].away,
					q3_score_rival: quarterScores[3].away,
					q4_score_rival: quarterScores[4].away,
					sprint1_winner: sprintWinners[1] == null ? -1 : 1,
					sprint2_winner: sprintWinners[2] == null ? -1 : 1,
					sprint3_winner: sprintWinners[3] == null ? -1 : 1,
					sprint4_winner: sprintWinners[4] == null ? -1 : 1,
					sprint1_winner_player_id: sprintWinners[1],
					sprint2_winner_player_id: sprintWinners[2],
					sprint3_winner_player_id: sprintWinners[3],
					sprint4_winner_player_id: sprintWinners[4],
					max_players_on_field: fieldPlayers.length,
					penalty_home_score: homeGoals === awayGoals ? penaltyHomeScore : null,
					penalty_away_score: homeGoals === awayGoals ? penaltyAwayScore : null,
					competition_id: competitionId ? Number(competitionId) : null,
					stats_enabled: existingMatch?.stats_enabled ?? true
				},
				stats: activePlayerIds.map((playerId) => stripManagedStatFields(statsForSave[playerId] as Record<string, unknown>)) as MatchSavePayload["stats"],
				actions: matchActions.map((action) => ({
					client_id: action.client_id,
					player_id: action.player_id,
					quarter: action.quarter,
					sequence: action.sequence,
					action_key: action.action_key
				})),
				penalties,
				goalkeeper_shots: goalkeeperShots.map((shot) => ({
					goalkeeper_player_id: shot.goalkeeper_player_id,
					quarter: shot.quarter ?? null,
					shot_index: shot.shot_index,
					result: shot.result,
					x: shot.x,
					y: shot.y
				}))
			};

			const result = await saveMatchBundle(supabase, payload, editingMatchId ? (existingMatch?.version ?? 1) : null);
			await autosave.clearDraft().catch((error) => console.error("Error deleting saved draft locally:", error));
			router.push(`/partidos/${result.matchId}`);
		} catch (error) {
			console.error("Error saving match:", error);
			const errorCode = error instanceof MatchSaveError ? error.code : "SAVE_FAILED";
			const messageKey = errorCode === "MATCH_VERSION_CONFLICT"
				? "saveErrors.versionConflict"
				: errorCode === "SAVE_RPC_NOT_INSTALLED"
					? "saveErrors.rpcMissing"
					: errorCode === "FORBIDDEN" || errorCode === "AUTH_REQUIRED"
						? "saveErrors.permission"
						: errorCode === "PLAYER_OUTSIDE_CLUB" || errorCode === "PLAYER_OUTSIDE_LINEUP"
							? "saveErrors.invalidPlayer"
							: errorCode === "INVALID_PAYLOAD" || errorCode === "DUPLICATE_PLAYERS" || errorCode === "DUPLICATE_ACTIONS" || errorCode === "DUPLICATE_PENALTY_ORDER"
								? "saveErrors.invalidData"
								: "saveErrors.generic";
			toast({ title: t("saveError"), description: t(messageKey), variant: "destructive" });
		} finally {
			setSaving(false);
		}
	};

	const totalExpulsiones = (s: Partial<MatchStats> | undefined | null) =>
		sumVisibleStats(s, [
			"faltas_exp_20_1c1",
			"faltas_exp_20_boya",
			"faltas_penalti",
			"faltas_exp_3_int",
			"faltas_exp_3_bruta",
			"faltas_exp_simple",
			"exp_trans_def"
		]);

	const activeSet = useMemo(() => new Set(activePlayerIds), [activePlayerIds]);

	const activePlayers = useMemo(() => allPlayers.filter((p) => activeSet.has(p.id)), [allPlayers, activeSet]);

	const fieldPlayers = useMemo(() => activePlayers.filter((p) => !p.is_goalkeeper), [activePlayers]);

	const goalkeepers = useMemo(() => activePlayers.filter((p) => p.is_goalkeeper), [activePlayers]);

	const availableFieldPlayers = useMemo(() => allPlayers.filter((p) => !p.is_goalkeeper && !activeSet.has(p.id)), [allPlayers, activeSet]);

	const availableGoalkeepers = useMemo(() => allPlayers.filter((p) => p.is_goalkeeper && !activeSet.has(p.id)), [allPlayers, activeSet]);

	const getAvailablePlayers = (isGoalkeeper: boolean): Player[] => {
		return isGoalkeeper ? availableGoalkeepers : availableFieldPlayers;
	};

	const score = useMemo(() => calculateMatchScore(stats, playersById), [stats, playersById]);

	const homeGoals = score.ownGoals;
	const awayGoals = score.opponentGoals;
	const isTied = homeGoals === awayGoals;

	const homeTeamName = myClub?.name || t("myTeam");
	const awayTeamName = opponent || t("opponentFallback");
	const draftKey = profile?.club_id ? activeDraftKey : null;
	const draftPayload = useMemo<NewMatchDraftPayload>(
		() => ({
			schemaVersion: 1,
			matchDate,
			opponent,
			location,
			isHome,
			season,
			jornada,
			notes,
			competitionId,
			closedQuarters: closedQuarters as Record<DraftQuarter, boolean>,
			quarterScores: quarterScores as Record<DraftQuarter, { home: number; away: number }>,
			sprintWinners,
			penaltyHomeScore,
			penaltyAwayScore,
			penaltyShooters,
			rivalPenalties,
			penaltyGoalkeeperMap,
			activePlayerIds,
			stats,
			goalkeeperShots,
			activeQuarter,
			matchActions
		}),
		[
			activePlayerIds,
			activeQuarter,
			closedQuarters,
			competitionId,
			goalkeeperShots,
			isHome,
			jornada,
			location,
			matchDate,
			matchActions,
			notes,
			opponent,
			penaltyAwayScore,
			penaltyGoalkeeperMap,
			penaltyHomeScore,
			penaltyShooters,
			quarterScores,
			rivalPenalties,
			season,
			sprintWinners,
			stats
		]
	);
	const autosave = useMatchAutosave({
		enabled: !loading && hiddenStatsState.loaded && !saving && Boolean(profile?.club_id),
		draftKey,
		clubId: profile?.club_id ?? null,
		userId: profile?.id ?? null,
		matchId: editingMatchId,
		payload: draftPayload,
		initialRevision: initialDraftRevision,
		initialCreatedAt: initialDraftCreatedAt,
		initialExpiresAt: initialDraftExpiresAt
	});

	if (loading || !hiddenStatsState.loaded) {
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
						{t("permissionError")}
					</AlertDescription>
				</Alert>
				<div className="mt-4">
					<Button onClick={() => router.back()}>{t("backHome")}</Button>
				</div>
			</main>
		);
	}

	return (
		<main className="container mx-auto px-4 py-8 max-w-7xl">
			<div className="mb-6">
				<h1 className="text-3xl md:text-4xl font-bold mb-2">{editingMatchId ? pageT("editMatch") : pageT("newMatch")}</h1>
				<p className="text-muted-foreground text-lg">
					{editingMatchId ? t("editDescription") : t("createDescription")}
				</p>
				<div className="flex items-center gap-3 mt-3 flex-wrap">
					<Badge variant="secondary" className="text-sm">
						{t("lineupCount", { count: activePlayerIds.length })}
					</Badge>
					<Badge variant={activeQuarter ? "default" : "outline"} className="gap-1.5 text-sm">
						{activeQuarter ? <CirclePlay className="h-3.5 w-3.5" /> : <CircleStop className="h-3.5 w-3.5" />}
						{activeQuarter ? t("chronology.activeQuarter", { quarter: activeQuarter }) : t("chronology.noActiveQuarter")}
					</Badge>
					<Badge variant="outline" className="gap-1.5 text-sm">
						{autosave.status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						{(autosave.status === "offline" || autosave.status === "error") && <CloudOff className="h-3.5 w-3.5" />}
						{autosave.status === "saved" && <CheckCircle2 className="h-3.5 w-3.5" />}
						{(autosave.status === "idle" || autosave.status === "pending") && <Cloud className="h-3.5 w-3.5" />}
						{t(`autosave.${autosave.status}`)}
					</Badge>
					{draftRecovered && <span className="text-xs text-muted-foreground">{t("autosave.recovered")}</span>}
					{previousMatches.length > 0 && (
						<Select onValueChange={(value) => loadLineupFromMatch(Number(value))} disabled={loadingLineup}>
							<SelectTrigger className="w-[250px]">
								<SelectValue placeholder={t("loadPreviousLineup")} />
							</SelectTrigger>
							<SelectContent>
								{previousMatches.map((match) => (
									<SelectItem key={match.id} value={match.id.toString()}>
									{new Date(match.match_date).toLocaleDateString(locale)} - {match.opponent}
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
						<span className="sm:hidden block truncate">{t("tabs.infoShort")}</span>
						{/* Desktop */}
						<span className="hidden sm:inline block truncate">{t("tabs.info")}</span>
					</TabsTrigger>

					{/* TAB: Jugadores de Campo */}
					<TabsTrigger value="field" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
						{/* Móvil */}
						<span className="sm:hidden block truncate">{t("tabs.fieldShort", { count: fieldPlayers.length })}</span>
						{/* Desktop */}
						<span className="hidden sm:inline block truncate">{t("tabs.field", { count: fieldPlayers.length })}</span>
					</TabsTrigger>

					{/* TAB: Porteros */}
					<TabsTrigger value="goalkeepers" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
						{/* Móvil */}
						<span className="sm:hidden block truncate">{t("tabs.goalkeepers", { count: goalkeepers.length })}</span>
						{/* Desktop */}
						<span className="hidden sm:inline block truncate">{t("tabs.goalkeepers", { count: goalkeepers.length })}</span>
					</TabsTrigger>

					{isTied && (
						<TabsTrigger value="penalties" className="text-xs sm:text-sm px-2 sm:px-4 py-2 relative">
							<span className="sm:hidden block truncate">{t("tabs.penaltiesShort")}</span>
							<span className="hidden sm:inline block truncate">{t("tabs.penalties")}</span>
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
										<Label htmlFor="date">{t("date")}</Label>
										<Input id="date" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
									</div>

									<div className="space-y-2">
										<Label htmlFor="opponent">{t("opponent")}</Label>
										<Input
											id="opponent"
											value={opponent}
											onChange={(e) => setOpponent(e.target.value)}
											placeholder={t("opponentPlaceholder")}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="venue">{t("venue")}</Label>
										<Select value={isHome ? "home" : "away"} onValueChange={(value) => setIsHome(value === "home")}>
											<SelectTrigger id="venue">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="home">{t("home")}</SelectItem>
												<SelectItem value="away">{t("away")}</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="location">{t("location")}</Label>
										<Input
											id="location"
											value={location}
											onChange={(e) => setLocation(e.target.value)}
											placeholder={t("locationPlaceholder")}
										/>
									</div>
								</div>
							</div>

							{/* COLUMNA 2: Competición + Temporada */}
							<div className="space-y-4 rounded-sm border-2 p-4">
								{/* <h3 className="text-sm font-semibold">Competición y temporada</h3> */}

								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="competition">{t("competition")}</Label>
										<Select value={competitionId} onValueChange={setCompetitionId}>
											<SelectTrigger id="competition" className="w-full">
												<SelectValue placeholder={t("selectCompetition")} />
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
										<Label htmlFor="jornada">{t("matchday")}</Label>
										<Input
											id="jornada"
											type="number"
											value={jornada}
											onChange={(e) => setJornada(Number.parseInt(e.target.value) || 1)}
											min={1}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="season">{t("season")}</Label>
										<Input id="season" value={season} readOnly className="bg-muted/40" />
									</div>
								</div>
							</div>

							{/* COLUMNA 3: Marcador */}
							<div className="space-y-4 rounded-sm border bg-muted/15 p-4">
								<h3 className="text-sm font-semibold">{t("score")}</h3>

								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="home-score">{t("ownGoals")}</Label>
										<Input
											id="home-score"
											type="number"
											value={homeGoals}
											readOnly
											className="bg-muted text-center text-lg font-bold"
											title={t("ownGoalsHint")}
										/>
										<p className="text-xs text-muted-foreground">{t("automaticCalculation")}</p>
									</div>

									<div className="space-y-2">
										<Label htmlFor="away-score">{t("opponentGoals")}</Label>
										<Input
											id="away-score"
											type="number"
											value={awayGoals}
											readOnly
											className="bg-muted text-center text-lg font-bold"
											title={t("opponentGoalsHint")}
										/>
										<p className="text-xs text-muted-foreground">{t("goalkeeperCalculation")}</p>
									</div>
								</div>
							</div>
						</div>

						<div className="md:col-span-3 mt-4 border-t pt-4">
							<Tabs defaultValue="quarters" className="w-full">
								<TabsList className="grid h-auto w-full grid-cols-2">
									<TabsTrigger value="quarters">{t("chronology.quartersTab")}</TabsTrigger>
									<TabsTrigger value="chronology" className="gap-2">
										{t("chronology.timelineTab")}
										<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{matchActions.length}</Badge>
									</TabsTrigger>
								</TabsList>

								<TabsContent value="quarters" className="mt-4">
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
										{([1, 2, 3, 4] as const).map((quarter) => {
											const winnerId = sprintWinners[quarter];
											const hasWinner = winnerId != null;
											const winnerLabel = getWinnerLabel(winnerId);
											const isActive = activeQuarter === quarter;
											const isClosed = closedQuarters[quarter];
											const actionCount = matchActions.filter((action) => action.quarter === quarter).length;

											return (
												<div key={quarter} className={`space-y-3 rounded-xl border p-3 ${isActive ? "border-primary bg-primary/5 shadow-sm" : isClosed ? "bg-muted/20" : "bg-card"}`}>
													<div className="flex items-center justify-between gap-2">
														<Label className="text-sm font-semibold">{t("quarter", { number: quarter })}</Label>
														<Badge variant={isActive ? "default" : "secondary"}>
															{isActive ? t("chronology.openStatus") : isClosed ? t("chronology.closedStatus") : t("chronology.pendingStatus")}
														</Badge>
													</div>

													<p className="text-xs text-muted-foreground">{t("chronology.actionCount", { count: actionCount })}</p>

													<div className="grid grid-cols-2 gap-2">
														<div>
															<Label className="text-xs">{t("own")}</Label>
															<Input type="number" value={quarterScores[quarter].home} onChange={(event) => setQuarterScores((current) => ({ ...current, [quarter]: { ...current[quarter], home: Number.parseInt(event.target.value) || 0 } }))} disabled={!isActive} min={0} className="text-center text-lg font-bold" />
														</div>
														<div>
															<Label className="text-xs">{t("opponentFallback")}</Label>
															<Input type="number" value={quarterScores[quarter].away} onChange={(event) => setQuarterScores((current) => ({ ...current, [quarter]: { ...current[quarter], away: Number.parseInt(event.target.value) || 0 } }))} disabled={!isActive} min={0} className="text-center text-lg font-bold" />
														</div>
													</div>

													<button
														type="button"
														disabled={!isActive}
														onClick={() => {
															if (hasWinner) setSprintWinners((current) => ({ ...current, [quarter]: null }));
															else {
																setActiveSprintQuarter(quarter);
																setSprintModalOpen(true);
															}
														}}
														className={`w-full rounded-md border py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${hasWinner ? "border-green-600 bg-green-500 text-white" : "border-border bg-muted/50"}`}
													>
														{hasWinner ? t("sprintWon") : t("sprintLost")}
													</button>

													{hasWinner ? <p className="text-[11px] text-muted-foreground">{t("winner")} <span className="font-medium text-foreground">{winnerLabel}</span></p> : null}

													<Button type="button" size="sm" variant={isActive ? "destructive" : "outline"} onClick={() => isActive ? closeQuarter(quarter) : openQuarter(quarter)} className="w-full text-xs">
														{isActive ? <CircleStop className="mr-2 size-4" /> : <CirclePlay className="mr-2 size-4" />}
														{isActive ? t("closeQuarter") : isClosed ? t("chronology.reopenQuarter") : t("openQuarter")}
													</Button>
												</div>
											);
										})}
									</div>
								</TabsContent>

								<TabsContent value="chronology" className="mt-4">
									<MatchChronology actions={matchActions} players={allPlayers} activeQuarter={activeQuarter} onRemove={removeMatchAction} />
								</TabsContent>
							</Tabs>
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
							<Label htmlFor="notes">{t("notes")}</Label>
							<Textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder={t("notesPlaceholder")}
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
											{t("playerSummary", { goals: safeNumber(stats[player.id]?.goles_totales), exclusions: totalExpulsiones(stats[player.id]) })}
											</p>
										</div>

										{/* BOTTOM: SUSTITUIR */}
										<div className="w-full px-2 pb-2 cursor-pointer">
											{!hasStats(player.id) && getAvailablePlayers(false).length > 0 ? (
												<div
													role="button"
													tabIndex={0}
											title={t("substitutePlayer")}
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
											{t("substitute")}
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
									<p className="font-semibold text-sm">{t("callPlayer")}</p>
									<p className="text-xs text-muted-foreground mt-1">{t("addToList")}</p>
									</div>

									<div className="w-full px-2 pb-2">
										<div className="h-8 w-full rounded-md border border-green-500/40 bg-green-500/10 grid place-items-center text-xs font-medium text-green-700 dark:text-green-400">
										{t("add")}
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
											{t("goalkeeperSummary", { goals: safeNumber(stats[player.id]?.portero_goles_totales), saves: calcParadasTotales(stats[player.id]) })}
											</p>
										</div>

										{/* BOTTOM: SUSTITUIR (sin button dentro de button) */}
										<div className="w-full px-1.5 sm:px-2 pb-1.5 sm:pb-2">
											{!hasStats(player.id) && getAvailablePlayers(true).length > 0 ? (
												<div
													role="button"
													tabIndex={0}
											title={t("substitutePlayer")}
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
											{t("substitute")}
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
				<PenaltyShooterDialog
					open={showPenaltyShooterDialog}
					onOpenChange={setShowPenaltyShooterDialog}
					fieldPlayers={fieldPlayers}
					setPenaltyShooters={setPenaltyShooters}
				/>
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
								activeQuarter={activeQuarter}
								match={existingMatch as any}
								isStatVisible={isStatVisible}
							/>
						) : (
							<FieldPlayerStatsDialog
								player={selectedPlayer}
								stats={stats[selectedPlayer.id] || createEmptyStats(selectedPlayer.id)}
								onUpdate={(field, value) => updateStat(selectedPlayer.id, field, value)}
								isStatVisible={isStatVisible}
							/>
						)}
					</DialogContent>
				</Dialog>
			)}

			<div className=" mt-8">
			<Button
				onClick={handleSave}
				disabled={saving}
				size="lg"
				className="w-full h-12"
			>
				{saving ? (
				<>
					<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									{t("saving")}
				</>
				) : (
				<>
					<Save className="mr-2 h-5 w-5" />
									{editingMatchId ? t("updateMatch") : t("saveMatch")}
				</>
				)}
			</Button>
			</div>
			<div className="mt-6 flex flex-col items-center gap-2 text-center">
				<p className="text-xs text-muted-foreground">
					{t("poweredBy")} <span className="font-medium">TFT</span> &amp; <span className="font-medium">BWMF</span>
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

function FieldPlayerStatsDialog({
	player,
	stats,
	onUpdate,
	isStatVisible
}: {
	player: Player;
	stats: Partial<MatchStats>;
	onUpdate: (field: keyof MatchStats, value: number) => void;
	isStatVisible: (statKey: keyof MatchStats | string) => boolean;
}) {
	const t = useTranslations("NewMatch");
	return (
		<Tabs defaultValue="goles" className="w-full">
			<TabsList className="grid grid-cols-5 w-full h-auto">
				<TabsTrigger
					value="goles"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					{t("statTabs.goals")}
				</TabsTrigger>

				<TabsTrigger
					value="tiros"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					{t("statTabs.shots")}
				</TabsTrigger>

				<TabsTrigger
					value="superioridad"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					<span className="sm:hidden">{t("statTabs.superiorityShort")}</span>
					<span className="hidden sm:inline">{t("statTabs.superiority")}</span>
				</TabsTrigger>

				<TabsTrigger
					value="faltas"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					{t("statTabs.fouls")}
				</TabsTrigger>

				<TabsTrigger
					value="acciones"
					className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm px-1 sm:px-2 py-2"
				>
					{t("statTabs.actions")}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="goles" className="space-y-4 mt-4">
				<Group title={t("groups.offense")}>
					<VisibleStatField
						statKey="goles_boya_jugada"
						isStatVisible={isStatVisible}
						label="Boya/Jugada"
						value={safeNumber(stats.goles_boya_jugada)}
						onChange={(v) => onUpdate("goles_boya_jugada", v)}
					/>
					<VisibleStatField
						statKey="goles_lanzamiento"
						isStatVisible={isStatVisible}
						label="Lanzamiento"
						value={safeNumber(stats.goles_lanzamiento)}
						onChange={(v) => onUpdate("goles_lanzamiento", v)}
					/>
					<VisibleStatField
						statKey="goles_dir_mas_5m"
						isStatVisible={isStatVisible}
						label="Dir +6m"
						value={safeNumber(stats.goles_dir_mas_5m)}
						onChange={(v) => onUpdate("goles_dir_mas_5m", v)}
					/>
					<VisibleStatField
						statKey="goles_contraataque"
						isStatVisible={isStatVisible}
						label="Contraataque"
						value={safeNumber(stats.goles_contraataque)}
						onChange={(v) => onUpdate("goles_contraataque", v)}
					/>
					<VisibleStatField
						statKey="goles_penalti_anotado"
						isStatVisible={isStatVisible}
						label="Penalti Anotado"
						value={safeNumber(stats.goles_penalti_anotado)}
						onChange={(v) => onUpdate("goles_penalti_anotado", v)}
					/>
				</Group>
				<Group title={t("groups.other")}>
					<StatField label={t("totals")} value={safeNumber(stats.goles_totales)} onChange={() => {}} readOnly />
				</Group>
			</TabsContent>

			<TabsContent value="tiros" className="space-y-4 mt-4">
				<Group title={t("groups.offense")}>
					<VisibleStatField
						statKey="tiros_penalti_fallado"
						isStatVisible={isStatVisible}
						label="Penalti Fallado"
						value={safeNumber(stats.tiros_penalti_fallado)}
						onChange={(v) => onUpdate("tiros_penalti_fallado", v)}
					/>

					<VisibleStatField
						statKey="tiros_corner"
						isStatVisible={isStatVisible}
						label="Corner"
						value={safeNumber(stats.tiros_corner)}
						onChange={(v) => onUpdate("tiros_corner", v)}
					/>

					<VisibleStatField
						statKey="tiros_fuera"
						isStatVisible={isStatVisible}
						label="Fuera"
						value={safeNumber(stats.tiros_fuera)}
						onChange={(v) => onUpdate("tiros_fuera", v)}
					/>

					<VisibleStatField
						statKey="tiro_palo"
						isStatVisible={isStatVisible}
						label="Palo"
						value={safeNumber(stats.tiro_palo)}
						onChange={(v) => onUpdate("tiro_palo", v)}
					/>
				</Group>

				<Group title={t("groups.opponentDefense")}>
					<VisibleStatField
						statKey="tiros_parados"
						isStatVisible={isStatVisible}
						label="Parados"
						value={safeNumber(stats.tiros_parados)}
						onChange={(v) => onUpdate("tiros_parados", v)}
					/>

					<VisibleStatField
						statKey="tiros_bloqueado"
						isStatVisible={isStatVisible}
						label="Bloqueado"
						value={safeNumber(stats.tiros_bloqueado)}
						onChange={(v) => onUpdate("tiros_bloqueado", v)}
					/>
				</Group>
				<Group title={t("groups.other")}>
					<StatField label={t("totals")} value={safeNumber(stats.tiros_totales)} onChange={() => {}} readOnly />
					<StatField
						label={t("efficiency")}
						value={(() => {
							const golesGenerales =
								(isStatVisible("goles_boya_jugada") ? safeNumber(stats.goles_boya_jugada) : 0) +
								(isStatVisible("goles_lanzamiento") ? safeNumber(stats.goles_lanzamiento) : 0) +
								(isStatVisible("goles_dir_mas_5m") ? safeNumber(stats.goles_dir_mas_5m) : 0) +
								(isStatVisible("goles_contraataque") ? safeNumber(stats.goles_contraataque) : 0) +
								(isStatVisible("goles_penalti_anotado") ? safeNumber(stats.goles_penalti_anotado) : 0) +
								(isStatVisible("goles_hombre_mas") ? safeNumber(stats.goles_hombre_mas) : 0) +
								(isStatVisible("gol_del_palo_sup") ? safeNumber(stats.gol_del_palo_sup) : 0);

							const fallosGenerales =
								(isStatVisible("tiros_penalti_fallado") ? safeNumber(stats.tiros_penalti_fallado) : 0) +
								(isStatVisible("tiros_corner") ? safeNumber(stats.tiros_corner) : 0) +
								(isStatVisible("tiros_fuera") ? safeNumber(stats.tiros_fuera) : 0) +
								(isStatVisible("tiros_parados") ? safeNumber(stats.tiros_parados) : 0) +
								(isStatVisible("tiros_bloqueado") ? safeNumber(stats.tiros_bloqueado) : 0) +
								(isStatVisible("tiro_palo") ? safeNumber(stats.tiro_palo) : 0) +
								(isStatVisible("tiros_hombre_mas") ? safeNumber(stats.tiros_hombre_mas) : 0);

							const intentos = golesGenerales + fallosGenerales;
							return intentos > 0 ? Math.round((golesGenerales / intentos) * 100) : 0;
						})()}
						onChange={() => {}}
						readOnly
						suffix="%"
					/>
				</Group>
			</TabsContent>

			<TabsContent value="superioridad" className="space-y-4 mt-4">
				<Group title={t("groups.offense")}>
					<VisibleStatField
						statKey="goles_hombre_mas"
						isStatVisible={isStatVisible}
						label="Goles Sup.+"
						value={safeNumber(stats.goles_hombre_mas)}
						onChange={(v) => onUpdate("goles_hombre_mas", v)}
					/>
					<VisibleStatField
						statKey="gol_del_palo_sup"
						isStatVisible={isStatVisible}
						label="Gol del palo Sup.+"
						value={safeNumber(stats.gol_del_palo_sup)}
						onChange={(v) => onUpdate("gol_del_palo_sup", v)}
					/>
					<StatField
						label={t("efficiency")}
						value={(() => {
							const aciertos =
								(isStatVisible("goles_hombre_mas") ? safeNumber(stats.goles_hombre_mas) : 0) +
								(isStatVisible("gol_del_palo_sup") ? safeNumber(stats.gol_del_palo_sup) : 0);

							const intentos =
								aciertos +
								(isStatVisible("tiros_hombre_mas") ? safeNumber(stats.tiros_hombre_mas) : 0) +
								(isStatVisible("portero_paradas_superioridad") ? safeNumber(stats.portero_paradas_superioridad) : 0) +
								(isStatVisible("jugador_superioridad_bloqueo") ? safeNumber(stats.jugador_superioridad_bloqueo) : 0);

							return intentos > 0 ? Math.round((aciertos / intentos) * 100) : 0;
						})()}
						onChange={() => {}}
						readOnly
						suffix="%"
					/>
				</Group>
				<Group title={t("groups.missedOffense")}>
					<VisibleStatField
						statKey="tiros_hombre_mas"
						isStatVisible={isStatVisible}
						label="Fuera Sup.+"
						value={safeNumber(stats.tiros_hombre_mas)}
						onChange={(v) => onUpdate("tiros_hombre_mas", v)}
					/>

					<VisibleStatField
						statKey="portero_paradas_superioridad"
						isStatVisible={isStatVisible}
						label="Paradas Sup.+"
						value={safeNumber(stats.portero_paradas_superioridad)}
						onChange={(v) => onUpdate("portero_paradas_superioridad", v)}
					/>

					<VisibleStatField
						statKey="jugador_superioridad_bloqueo"
						isStatVisible={isStatVisible}
						label="Bloqueo Sup.+"
						value={safeNumber(stats.jugador_superioridad_bloqueo)}
						onChange={(v) => onUpdate("jugador_superioridad_bloqueo", v)}
					/>
				</Group>

				<Group title={t("groups.other")}>
					<VisibleStatField
						statKey="rebote_recup_hombre_mas"
						isStatVisible={isStatVisible}
						label="Rebote Recup."
						value={safeNumber(stats.rebote_recup_hombre_mas)}
						onChange={(v) => onUpdate("rebote_recup_hombre_mas", v)}
					/>

					<VisibleStatField
						statKey="rebote_perd_hombre_mas"
						isStatVisible={isStatVisible}
						label="Rebote Perd."
						value={safeNumber(stats.rebote_perd_hombre_mas)}
						onChange={(v) => onUpdate("rebote_perd_hombre_mas", v)}
					/>
				</Group>
			</TabsContent>

			<TabsContent value="faltas" className="space-y-4 mt-4">
				<Group title={t("groups.defense")}>
					<VisibleStatField
						statKey="faltas_exp_20_1c1"
						isStatVisible={isStatVisible}
						label="Exp 18'' 1c1"
						value={safeNumber(stats.faltas_exp_20_1c1)}
						onChange={(v) => onUpdate("faltas_exp_20_1c1", v)}
					/>

					<VisibleStatField
						statKey="faltas_exp_20_boya"
						isStatVisible={isStatVisible}
						label="Exp 18'' Boya"
						value={safeNumber(stats.faltas_exp_20_boya)}
						onChange={(v) => onUpdate("faltas_exp_20_boya", v)}
					/>

					<VisibleStatField
						statKey="faltas_penalti"
						isStatVisible={isStatVisible}
						label="Penalti"
						value={safeNumber(stats.faltas_penalti)}
						onChange={(v) => onUpdate("faltas_penalti", v)}
					/>

					<VisibleStatField
						statKey="faltas_exp_simple"
						isStatVisible={isStatVisible}
						label="Exp (Simple)"
						value={safeNumber(stats.faltas_exp_simple)}
						onChange={(v) => onUpdate("faltas_exp_simple", v)}
					/>

					<VisibleStatField
						statKey="exp_trans_def"
						isStatVisible={isStatVisible}
						label="Exp trans. def."
						value={safeNumber(stats.exp_trans_def)}
						onChange={(v) => onUpdate("exp_trans_def", v)}
					/>
				</Group>
			</TabsContent>

			<TabsContent value="acciones" className="space-y-4 mt-4">
				<Group title={t("groups.offense")}>
					<VisibleStatField
						statKey="acciones_asistencias"
						isStatVisible={isStatVisible}
						label="Asistencias"
						value={safeNumber(stats.acciones_asistencias)}
						onChange={(v) => onUpdate("acciones_asistencias", v)}
					/>

					<VisibleStatField
						statKey="acciones_exp_provocada"
						isStatVisible={isStatVisible}
						label="Exp Provocada"
						value={safeNumber(stats.acciones_exp_provocada)}
						onChange={(v) => onUpdate("acciones_exp_provocada", v)}
					/>

					<VisibleStatField
						statKey="acciones_penalti_provocado"
						isStatVisible={isStatVisible}
						label="Penalti Provocado"
						value={safeNumber(stats.acciones_penalti_provocado)}
						onChange={(v) => onUpdate("acciones_penalti_provocado", v)}
					/>

					<VisibleStatField
						statKey="pase_boya"
						isStatVisible={isStatVisible}
						label="Pase boya"
						value={safeNumber(stats.pase_boya)}
						onChange={(v) => onUpdate("pase_boya", v)}
					/>

					<VisibleStatField
						statKey="pase_boya_fallado"
						isStatVisible={isStatVisible}
						label="Pase boya fallado"
						value={safeNumber(stats.pase_boya_fallado)}
						onChange={(v) => onUpdate("pase_boya_fallado", v)}
					/>

					<VisibleStatField
						statKey="acciones_perdida_poco"
						isStatVisible={isStatVisible}
						label="Pérdida Posesión"
						value={safeNumber(stats.acciones_perdida_poco)}
						onChange={(v) => onUpdate("acciones_perdida_poco", v)}
					/>

					<VisibleStatField
						statKey="faltas_contrafaltas"
						isStatVisible={isStatVisible}
						label="Contrafaltas"
						value={safeNumber(stats.faltas_contrafaltas)}
						onChange={(v) => onUpdate("faltas_contrafaltas", v)}
					/>
				</Group>

				<Group title={t("groups.defense")}>
					<VisibleStatField
						statKey="acciones_bloqueo"
						isStatVisible={isStatVisible}
						label="Bloqueo"
						value={safeNumber(stats.acciones_bloqueo)}
						onChange={(v) => onUpdate("acciones_bloqueo", v)}
					/>

					<VisibleStatField
						statKey="acciones_recuperacion"
						isStatVisible={isStatVisible}
						label="Recuperación"
						value={safeNumber(stats.acciones_recuperacion)}
						onChange={(v) => onUpdate("acciones_recuperacion", v)}
					/>

					<VisibleStatField
						statKey="acciones_recibir_gol"
						isStatVisible={isStatVisible}
						label="Recibe Gol"
						value={safeNumber(stats.acciones_recibir_gol)}
						onChange={(v) => onUpdate("acciones_recibir_gol", v)}
					/>
				</Group>

				<Group title={t("groups.other")}>
					<VisibleStatField
						statKey="acciones_rebote"
						isStatVisible={isStatVisible}
						label="Rebote"
						value={safeNumber(stats.acciones_rebote)}
						onChange={(v) => onUpdate("acciones_rebote", v)}
					/>
				</Group>
			</TabsContent>
		</Tabs>
	);
}

function GoalkeeperStatsDialog({
	player,
	stats,
	onUpdate,
	goalkeeperShots,
	setGoalkeeperShots,
	activeQuarter,
	isStatVisible
}: {
	player: Player;
	stats: Partial<MatchStats>;
	onUpdate: (field: keyof MatchStats, value: number) => void;
	match: Match;
	goalkeeperShots: GoalkeeperShotDraft[];
	setGoalkeeperShots: (next: GoalkeeperShotDraft[]) => void;
	activeQuarter: DraftQuarter | null;
	isStatVisible: (statKey: keyof MatchStats | string) => boolean;
}) {
	const t = useTranslations("NewMatch");
	const totalGoalsConceded =
		(isStatVisible("portero_goles_boya_parada") ? safeNumber(stats.portero_goles_boya_parada) : 0) +
		(isStatVisible("portero_goles_hombre_menos") ? safeNumber(stats.portero_goles_hombre_menos) : 0) +
		(isStatVisible("portero_goles_dir_mas_5m") ? safeNumber(stats.portero_goles_dir_mas_5m) : 0) +
		(isStatVisible("portero_goles_contraataque") ? safeNumber(stats.portero_goles_contraataque) : 0) +
		(isStatVisible("portero_goles_lanzamiento") ? safeNumber(stats.portero_goles_lanzamiento) : 0) +
		(isStatVisible("portero_gol_palo") ? safeNumber(stats.portero_gol_palo) : 0) +
		(isStatVisible("portero_goles_penalti") ? safeNumber(stats.portero_goles_penalti) : 0);

	return (
		<Tabs defaultValue="goles" className="w-full">
			<TabsList className="grid w-full grid-cols-4 h-auto">
				<TabsTrigger value="goles" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					{t("statTabs.goals")}
				</TabsTrigger>
				<TabsTrigger value="paradas" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					{t("statTabs.saves")}
				</TabsTrigger>
				<TabsTrigger value="inferioridad" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					<span className="sm:hidden block truncate">{t("statTabs.inferiorityShort")}</span>
					<span className="hidden sm:inline block truncate">{t("statTabs.inferiority")}</span>
				</TabsTrigger>
				<TabsTrigger value="acciones" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
					{t("statTabs.actions")}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="goles" className="space-y-4 mt-4">
				<Group title={t("groups.goalsConceded")}>
					<VisibleStatField
						statKey="portero_goles_boya_parada"
						isStatVisible={isStatVisible}
						label="Boya"
						value={safeNumber(stats.portero_goles_boya_parada)}
						onChange={(v) => onUpdate("portero_goles_boya_parada", v)}
					/>
					<VisibleStatField
						statKey="portero_goles_dir_mas_5m"
						isStatVisible={isStatVisible}
						label="Dir +6m"
						value={safeNumber(stats.portero_goles_dir_mas_5m)}
						onChange={(v) => onUpdate("portero_goles_dir_mas_5m", v)}
					/>
					<VisibleStatField
						statKey="portero_goles_contraataque"
						isStatVisible={isStatVisible}
						label="Contraataque"
						value={safeNumber(stats.portero_goles_contraataque)}
						onChange={(v) => onUpdate("portero_goles_contraataque", v)}
					/>
					<VisibleStatField
						statKey="portero_goles_penalti"
						isStatVisible={isStatVisible}
						label="Penalti"
						value={safeNumber(stats.portero_goles_penalti)}
						onChange={(v) => onUpdate("portero_goles_penalti", v)}
					/>
					<VisibleStatField
						statKey="portero_goles_lanzamiento"
						isStatVisible={isStatVisible}
						label="Lanzamiento"
						value={safeNumber(stats.portero_goles_lanzamiento)}
						onChange={(v) => onUpdate("portero_goles_lanzamiento", v)}
					/>
				</Group>
				<Group title={t("groups.other")}>
					<StatField label={t("totals")} value={totalGoalsConceded} onChange={() => {}} readOnly />
				</Group>
				<GoalkeeperGoalsRecorder goalkeeperPlayerId={player.id} shots={goalkeeperShots} onChangeShots={setGoalkeeperShots} quarter={activeQuarter} />
			</TabsContent>

			<TabsContent value="paradas" className="space-y-4 mt-4">
				<Group title={t("statTabs.saves")}>
					<VisibleStatField
						statKey="portero_tiros_parada_recup"
						isStatVisible={isStatVisible}
						label="Parada Recup"
						value={safeNumber(stats.portero_tiros_parada_recup)}
						onChange={(v) => onUpdate("portero_tiros_parada_recup", v)}
					/>

					<VisibleStatField
						statKey="portero_paradas_fuera"
						isStatVisible={isStatVisible}
						label="Parada Corner"
						value={safeNumber(stats.portero_paradas_fuera)}
						onChange={(v) => onUpdate("portero_paradas_fuera", v)}
					/>

					<VisibleStatField
						statKey="lanz_recibido_fuera"
						isStatVisible={isStatVisible}
						label="Lanz. recibido fuera"
						value={safeNumber(stats.lanz_recibido_fuera)}
						onChange={(v) => onUpdate("lanz_recibido_fuera", v)}
					/>

					<VisibleStatField
						statKey="portero_lanz_palo"
						isStatVisible={isStatVisible}
						label="Lanz. al palo"
						value={safeNumber(stats.portero_lanz_palo)}
						onChange={(v) => onUpdate("portero_lanz_palo", v)}
					/>
				</Group>
				<Group title={t("groups.penaltySaves")}>
					<VisibleStatField
						statKey="portero_paradas_penalti_parado"
						isStatVisible={isStatVisible}
						label="Parada (*penalti)"
						value={safeNumber(stats.portero_paradas_penalti_parado)}
						onChange={(v) => onUpdate("portero_paradas_penalti_parado", v)}
					/>

					<VisibleStatField
						statKey="portero_penalti_palo"
						isStatVisible={isStatVisible}
						label="Palo (*penalti)"
						value={safeNumber(stats.portero_penalti_palo)}
						onChange={(v) => onUpdate("portero_penalti_palo", v)}
					/>

					<VisibleStatField
						statKey="portero_penalti_fuera"
						isStatVisible={isStatVisible}
						label="Fuera (*penalti)"
						value={safeNumber(stats.portero_penalti_fuera)}
						onChange={(v) => onUpdate("portero_penalti_fuera", v)}
					/>
				</Group>
				<Group title={t("groups.other")}>
					<StatField
						label={t("totals")}
						value={
							(isStatVisible("portero_tiros_parada_recup") ? safeNumber(stats.portero_tiros_parada_recup) : 0) +
							(isStatVisible("portero_paradas_fuera") ? safeNumber(stats.portero_paradas_fuera) : 0) +
							(isStatVisible("portero_paradas_penalti_parado") ? safeNumber(stats.portero_paradas_penalti_parado) : 0) +
							(isStatVisible("portero_paradas_hombre_menos") ? safeNumber(stats.portero_paradas_hombre_menos) : 0) +
							(isStatVisible("portero_parada_fuera_inf") ? safeNumber(stats.portero_parada_fuera_inf) : 0)
						}
						onChange={() => {}}
						readOnly
					/>
				</Group>
				<GoalkeeperSavesRecorder goalkeeperPlayerId={player.id} shots={goalkeeperShots} onChangeShots={setGoalkeeperShots} quarter={activeQuarter} />
			</TabsContent>

			<TabsContent value="inferioridad" className="space-y-4 mt-4">
				<Group title={t("groups.conceded")}>
					<VisibleStatField
						statKey="portero_goles_hombre_menos"
						isStatVisible={isStatVisible}
						label="Goles Inf.-"
						value={safeNumber(stats.portero_goles_hombre_menos)}
						onChange={(v) => onUpdate("portero_goles_hombre_menos", v)}
					/>
					<VisibleStatField
						statKey="portero_gol_palo"
						isStatVisible={isStatVisible}
						label="Gol de palo"
						value={safeNumber(stats.portero_gol_palo)}
						onChange={(v) => onUpdate("portero_gol_palo", v)}
					/>
				</Group>

				<Group title={t("groups.defense")}>
					<VisibleStatField
						statKey="portero_paradas_hombre_menos"
						isStatVisible={isStatVisible}
						label="Parada Recup Inf.-"
						value={safeNumber(stats.portero_paradas_hombre_menos)}
						onChange={(v) => onUpdate("portero_paradas_hombre_menos", v)}
					/>
					<VisibleStatField
						statKey="portero_parada_fuera_inf"
						isStatVisible={isStatVisible}
						label="Parada Corner Inf.-"
						value={safeNumber(stats.portero_parada_fuera_inf)}
						onChange={(v) => onUpdate("portero_parada_fuera_inf", v)}
					/>
					<VisibleStatField
						statKey="portero_inferioridad_fuera"
						isStatVisible={isStatVisible}
						label="Fuera"
						value={safeNumber(stats.portero_inferioridad_fuera)}
						onChange={(v) => onUpdate("portero_inferioridad_fuera", v)}
					/>
					<VisibleStatField
						statKey="portero_lanz_palo_inf"
						isStatVisible={isStatVisible}
						label="Lanz. al palo inf-"
						value={safeNumber(stats.portero_lanz_palo_inf)}
						onChange={(v) => onUpdate("portero_lanz_palo_inf", v)}
					/>
					<VisibleStatField
						statKey="portero_inferioridad_bloqueo"
						isStatVisible={isStatVisible}
						label="Bloqueo"
						value={safeNumber(stats.portero_inferioridad_bloqueo)}
						onChange={(v) => onUpdate("portero_inferioridad_bloqueo", v)}
					/>
				</Group>

				<Group title={t("groups.other")}>
					<StatField
						label={t("efficiency")}
						value={(() => {
							const goles =
								(isStatVisible("portero_goles_hombre_menos") ? safeNumber(stats.portero_goles_hombre_menos) : 0) +
								(isStatVisible("portero_gol_palo") ? safeNumber(stats.portero_gol_palo) : 0);

							const evitados =
								(isStatVisible("portero_paradas_hombre_menos") ? safeNumber(stats.portero_paradas_hombre_menos) : 0) +
								(isStatVisible("portero_parada_fuera_inf") ? safeNumber(stats.portero_parada_fuera_inf) : 0) +
								(isStatVisible("portero_lanz_palo_inf") ? safeNumber(stats.portero_lanz_palo_inf) : 0) +
								(isStatVisible("portero_inferioridad_fuera") ? safeNumber(stats.portero_inferioridad_fuera) : 0) +
								(isStatVisible("portero_inferioridad_bloqueo") ? safeNumber(stats.portero_inferioridad_bloqueo) : 0);
							const total = goles + evitados;
							return total > 0 ? Math.round((evitados / total) * 100) : 0;
						})()}
						onChange={() => {}}
						readOnly
						suffix="%"
					/>
				</Group>
			</TabsContent>

			<TabsContent value="acciones" className="space-y-4 mt-4">
				<Group title={t("groups.offense")}>
					<VisibleStatField
						statKey="portero_acciones_asistencias"
						isStatVisible={isStatVisible}
						label="Asistencias"
						value={safeNumber(stats.portero_acciones_asistencias)}
						onChange={(v) => onUpdate("portero_acciones_asistencias", v)}
					/>

					<VisibleStatField
						statKey="portero_gol"
						isStatVisible={isStatVisible}
						label="Gol"
						value={safeNumber(stats.portero_gol)}
						onChange={(v) => onUpdate("portero_gol", v)}
					/>

					<VisibleStatField
						statKey="portero_gol_superioridad"
						isStatVisible={isStatVisible}
						label="Gol Superioridad"
						value={safeNumber(stats.portero_gol_superioridad)}
						onChange={(v) => onUpdate("portero_gol_superioridad", v)}
					/>

					<VisibleStatField
						statKey="tiro_fallado_portero"
						isStatVisible={isStatVisible}
						label="Tiro Fallado"
						value={safeNumber(stats.tiro_fallado_portero)}
						onChange={(v) => onUpdate("tiro_fallado_portero", v)}
					/>

					<VisibleStatField
						statKey="portero_fallo_superioridad"
						isStatVisible={isStatVisible}
						label="Fallo Superioridad"
						value={safeNumber(stats.portero_fallo_superioridad)}
						onChange={(v) => onUpdate("portero_fallo_superioridad", v)}
					/>
				</Group>

				<Group title={t("groups.defense")}>
					<VisibleStatField
						statKey="portero_acciones_exp_provocada"
						isStatVisible={isStatVisible}
						label="Exp. Provocada"
						value={safeNumber(stats.portero_acciones_exp_provocada)}
						onChange={(v) => onUpdate("portero_acciones_exp_provocada", v)}
					/>
					<VisibleStatField
						statKey="portero_acciones_perdida_pos"
						isStatVisible={isStatVisible}
						label="Pérdida Posesión"
						value={safeNumber(stats.portero_acciones_perdida_pos)}
						onChange={(v) => onUpdate("portero_acciones_perdida_pos", v)}
					/>
					<VisibleStatField
						statKey="portero_acciones_recuperacion"
						isStatVisible={isStatVisible}
						label="Recuparación"
						value={safeNumber(stats.portero_acciones_recuperacion)}
						onChange={(v) => onUpdate("portero_acciones_recuperacion", v)}
					/>
				</Group>
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

function VisibleStatField({
	statKey,
	isStatVisible,
	...props
}: {
	statKey: keyof MatchStats;
	isStatVisible: (statKey: keyof MatchStats | string) => boolean;
	label: string;
	value: number;
	onChange: (value: number) => void;
	readOnly?: boolean;
	suffix?: string;
}) {
	const t = useTranslations("StatLabels");
	if (!isStatVisible(statKey)) return null;

	return <StatField {...props} label={t(statKey)} />;
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

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<div className="space-y-2">
		<div className="flex items-center gap-2">
			<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
			<div className="h-px flex-1 bg-border/60" />
		</div>
		<div className="rounded-xl p-3 sm:p-4">
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">{children}</div>
		</div>
	</div>
);
