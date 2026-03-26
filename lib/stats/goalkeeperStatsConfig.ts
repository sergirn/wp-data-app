export type GoalkeeperStatCategory = "goles" | "paradas" | "paradas_penalti" | "otros_tiros" | "inferioridad" | "acciones" | "ataque";

export type GoalkeeperStatDef = {
	key: string;
	label: string;
	category: GoalkeeperStatCategory;
	countsAsSave?: boolean;
	countsAsGoalConceded?: boolean;
	countsAsShotReceived?: boolean;
	countsAsPenaltyAttempt?: boolean;
};

export const GOALKEEPER_STATS: GoalkeeperStatDef[] = [
	// GOLES ENCAJADOS
	{
		key: "portero_goles_boya_parada",
		label: "Boya",
		category: "goles",
		countsAsGoalConceded: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_goles_dir_mas_5m",
		label: "+6m",
		category: "goles",
		countsAsGoalConceded: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_goles_contraataque",
		label: "Contraataque",
		category: "goles",
		countsAsGoalConceded: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_goles_penalti",
		label: "Penalti",
		category: "goles",
		countsAsGoalConceded: true,
		countsAsShotReceived: true,
		countsAsPenaltyAttempt: true
	},
	{
		key: "portero_goles_lanzamiento",
		label: "Lanzamiento",
		category: "goles",
		countsAsGoalConceded: true,
		countsAsShotReceived: true
	},

	// PARADAS REALES
	{
		key: "portero_paradas_totales",
		label: "Totales",
		category: "paradas"
	},
	{
		key: "portero_tiros_parada_recup",
		label: "Parada + Recup",
		category: "paradas",
		countsAsSave: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_paradas_fuera",
		label: "Parada + Corner",
		category: "paradas",
		countsAsSave: true,
		countsAsShotReceived: true
	},

	// PENALTIS
	{
		key: "portero_paradas_penalti_parado",
		label: "Penalti parado",
		category: "paradas_penalti",
		countsAsSave: true,
		countsAsShotReceived: true,
		countsAsPenaltyAttempt: true
	},
	{
		key: "portero_penalti_palo",
		label: "Penalti al palo",
		category: "paradas_penalti",
		countsAsShotReceived: true,
		countsAsPenaltyAttempt: true
	},
	{
		key: "portero_penalti_fuera",
		label: "Penalti fuera",
		category: "paradas_penalti",
		countsAsShotReceived: true,
		countsAsPenaltyAttempt: true
	},

	// OTROS TIROS RECIBIDOS
	{
		key: "lanz_recibido_fuera",
		label: "Lanzamiento recibido fuera",
		category: "otros_tiros",
		countsAsShotReceived: true
	},
	{
		key: "portero_lanz_palo",
		label: "Lanzamiento al palo",
		category: "otros_tiros",
		countsAsShotReceived: true
	},

	// INFERIORIDAD
	{
		key: "portero_goles_hombre_menos",
		label: "Goles Inferioridad -",
		category: "inferioridad",
		countsAsGoalConceded: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_gol_palo",
		label: "Gol del palo (Inf.-)",
		category: "inferioridad",
		countsAsGoalConceded: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_paradas_hombre_menos",
		label: "Parada + recup Inferioridad -",
		category: "inferioridad",
		countsAsSave: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_parada_fuera_inf",
		label: "Parada + Corner Inferioridad -",
		category: "inferioridad",
		countsAsSave: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_lanz_palo_inf",
		label: "Lanzamiento al palo Inferioridad -",
		category: "inferioridad",
		countsAsSave: true,
		countsAsShotReceived: true
	},
	{
		key: "portero_inferioridad_fuera",
		label: "Fuera (Inf.-)",
		category: "inferioridad",
		countsAsShotReceived: true
	},
	{
		key: "portero_inferioridad_bloqueo",
		label: "Bloqueo (Inf.-)",
		category: "inferioridad",
		countsAsShotReceived: true
	},

	// ACCIONES
	{
		key: "portero_acciones_asistencias",
		label: "Asistencias",
		category: "acciones"
	},
	{
		key: "portero_acciones_recuperacion",
		label: "Recuperación",
		category: "acciones"
	},
	{
		key: "portero_acciones_perdida_pos",
		label: "Pérdida posesión",
		category: "acciones"
	},
	{
		key: "portero_acciones_exp_provocada",
		label: "Exp. provocada",
		category: "acciones"
	},

	// ATAQUE
	{
		key: "portero_gol",
		label: "Gol",
		category: "ataque"
	},
	{
		key: "tiro_fallado_portero",
		label: "Tiro Fallado",
		category: "ataque"
	},
	{
		key: "portero_gol_superioridad",
		label: "Gol superioridad",
		category: "ataque"
	},
	{
		key: "portero_fallo_superioridad",
		label: "Fallo superioridad",
		category: "ataque"
	}
];

export const GOALKEEPER_CATEGORY_TITLES: Record<GoalkeeperStatCategory, string> = {
	goles: "Goles encajados",
	paradas: "Paradas",
	paradas_penalti: "Penaltis",
	otros_tiros: "Otros tiros recibidos",
	inferioridad: "Inferioridad",
	acciones: "Acciones",
	ataque: "Ataque (portero)"
};

export const GOALKEEPER_CATEGORY_HINTS: Partial<Record<GoalkeeperStatCategory, string>> = {
	goles: "Desglose por tipo",
	paradas: "Paradas reales",
	paradas_penalti: "Tanda y penaltis recibidos",
	otros_tiros: "No cuentan como parada",
	inferioridad: "Situaciones en H-",
	acciones: "Acciones de juego",
	ataque: "Aportación ofensiva"
};
