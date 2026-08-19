export type PlayerStatCategory = "goles" | "fallos" | "faltas" | "acciones";

export type PlayerStatDef = {
	key: string;
	category: PlayerStatCategory;
	countsAsGoal?: boolean;
	countsAsShot?: boolean;
	countsAsMiss?: boolean;
	countsAsAssist?: boolean;
};

const stat = (
	key: string,
	category: PlayerStatCategory,
	flags: Omit<PlayerStatDef, "key" | "category"> = {}
): PlayerStatDef => ({ key, category, ...flags });

const goal = { countsAsGoal: true, countsAsShot: true };
const miss = { countsAsMiss: true, countsAsShot: true };

export const PLAYER_STATS: PlayerStatDef[] = [
	stat("goles_boya_jugada", "goles", goal),
	stat("goles_hombre_mas", "goles", goal),
	stat("goles_lanzamiento", "goles", goal),
	stat("goles_dir_mas_5m", "goles", goal),
	stat("goles_contraataque", "goles", goal),
	stat("goles_penalti_anotado", "goles", goal),
	stat("gol_del_palo_sup", "goles", goal),
	stat("tiros_hombre_mas", "fallos", miss),
	stat("portero_paradas_superioridad", "fallos", miss),
	stat("jugador_superioridad_bloqueo", "fallos", miss),
	stat("tiros_penalti_fallado", "fallos", miss),
	stat("tiros_corner", "fallos", miss),
	stat("tiros_fuera", "fallos", miss),
	stat("tiros_parados", "fallos", miss),
	stat("tiros_bloqueado", "fallos", miss),
	stat("tiro_palo", "fallos", miss),
	stat("faltas_exp_20_1c1", "faltas"),
	stat("faltas_exp_20_boya", "faltas"),
	stat("faltas_exp_simple", "faltas"),
	stat("faltas_penalti", "faltas"),
	stat("faltas_contrafaltas", "faltas"),
	stat("exp_trans_def", "faltas"),
	stat("acciones_bloqueo", "acciones"),
	stat("acciones_recuperacion", "acciones"),
	stat("acciones_rebote", "acciones"),
	stat("acciones_exp_provocada", "acciones"),
	stat("acciones_penalti_provocado", "acciones"),
	stat("acciones_recibir_gol", "acciones"),
	stat("pase_boya", "acciones"),
	stat("pase_boya_fallado", "acciones"),
	stat("acciones_asistencias", "acciones", { countsAsAssist: true }),
	stat("acciones_perdida_poco", "acciones")
];
