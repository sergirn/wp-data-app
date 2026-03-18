export type PlayerStatCategory = "goles" | "fallos" | "faltas" | "acciones";

export type PlayerStatDef = {
	key: string;
	label: string;
	category: PlayerStatCategory;
	countsAsGoal?: boolean;
	countsAsShot?: boolean;
	countsAsMiss?: boolean;
	countsAsAssist?: boolean;
};

export const PLAYER_STATS: PlayerStatDef[] = [
	// GOLES
	{
		key: "goles_boya_jugada",
		label: "Boya/Jugada",
		category: "goles",
		countsAsGoal: true,
		countsAsShot: true
	},
	{
		key: "goles_hombre_mas",
		label: "Goles en superioridad",
		category: "goles",
		countsAsGoal: true,
		countsAsShot: true
	},
	{
		key: "goles_lanzamiento",
		label: "Lanzamiento",
		category: "goles",
		countsAsGoal: true,
		countsAsShot: true
	},
	{
		key: "goles_dir_mas_5m",
		label: "+6m",
		category: "goles",
		countsAsGoal: true,
		countsAsShot: true
	},
	{
		key: "goles_contraataque",
		label: "Contraataque",
		category: "goles",
		countsAsGoal: true,
		countsAsShot: true
	},
	{
		key: "goles_penalti_anotado",
		label: "Penalti",
		category: "goles",
		countsAsGoal: true,
		countsAsShot: true
	},
	{
		key: "gol_del_palo_sup",
		label: "Gol del palo (Sup.+)",
		category: "goles",
		countsAsGoal: true,
		countsAsShot: true
	},

	// FALLOS
	{
		key: "tiros_hombre_mas",
		label: "Tiros fuera en superioridad",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},
	{
		key: "portero_paradas_superioridad",
		label: "Paradas en superioridad",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},
	{
		key: "jugador_superioridad_bloqueo",
		label: "Bloqueo en superioridad",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},
	{
		key: "tiros_penalti_fallado",
		label: "Penalti",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},
	{
		key: "tiros_corner",
		label: "Corner",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},
	{
		key: "tiros_fuera",
		label: "Fuera",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},
	{
		key: "tiros_parados",
		label: "Parados",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},
	{
		key: "tiros_bloqueado",
		label: "Bloqueados",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},
	{
		key: "tiro_palo",
		label: "Tiro al palo",
		category: "fallos",
		countsAsMiss: true,
		countsAsShot: true
	},

	// FALTAS
	{
		key: "faltas_exp_20_1c1",
		label: 'Exp 20" 1c1',
		category: "faltas"
	},
	{
		key: "faltas_exp_20_boya",
		label: 'Exp 20" Boya',
		category: "faltas"
	},
	{
		key: "faltas_exp_simple",
		label: "Exp Simple",
		category: "faltas"
	},
	{
		key: "faltas_penalti",
		label: "Penalti",
		category: "faltas"
	},
	{
		key: "faltas_contrafaltas",
		label: "Contrafaltas",
		category: "faltas"
	},
	{
		key: "exp_trans_def",
		label: "Exp trans. def.",
		category: "faltas"
	},

	// ACCIONES
	{
		key: "acciones_bloqueo",
		label: "Bloqueos",
		category: "acciones"
	},
	{
		key: "acciones_recuperacion",
		label: "Recuperaciones",
		category: "acciones"
	},
	{
		key: "acciones_rebote",
		label: "Rebotes",
		category: "acciones"
	},
	{
		key: "acciones_exp_provocada",
		label: "Exp. Prov.",
		category: "acciones"
	},
	{
		key: "acciones_penalti_provocado",
		label: "Pen. Prov.",
		category: "acciones"
	},
	{
		key: "acciones_recibir_gol",
		label: "Gol recibido",
		category: "acciones"
	},
	{
		key: "pase_boya",
		label: "Pase al boya",
		category: "acciones"
	},
	{
		key: "pase_boya_fallado",
		label: "Pase al boya fallado",
		category: "acciones"
	},
	{
		key: "acciones_asistencias",
		label: "Asistencias",
		category: "acciones",
		countsAsAssist: true
	},
	{
		key: "acciones_perdida_poco",
		label: "Perdida de posesión",
		category: "acciones"
	}
];

export const PLAYER_CATEGORY_TITLES: Record<PlayerStatCategory, string> = {
	goles: "Goles por tipo",
	fallos: "Tiros fallados",
	faltas: "Faltas",
	acciones: "Acciones"
};

export const PLAYER_CATEGORY_HINTS: Partial<Record<PlayerStatCategory, string>> = {
	goles: "Desglose ofensivo",
	fallos: "Tiros no convertidos",
	faltas: "Acciones defensivas sancionadas",
	acciones: "Aportación general"
};
