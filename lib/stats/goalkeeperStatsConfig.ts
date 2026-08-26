export type GoalkeeperStatCategory =
	| "goles"
	| "paradas"
	| "paradas_penalti"
	| "otros_tiros"
	| "inferioridad"
	| "acciones"
	| "ataque";

export type GoalkeeperStatDef = {
	key: string;
	category: GoalkeeperStatCategory;
	countsAsSave?: boolean;
	countsAsGoalConceded?: boolean;
	countsAsShotReceived?: boolean;
	countsAsPenaltyAttempt?: boolean;
};

const stat = (
	key: string,
	category: GoalkeeperStatCategory,
	flags: Omit<GoalkeeperStatDef, "key" | "category"> = {}
): GoalkeeperStatDef => ({ key, category, ...flags });

const conceded = { countsAsGoalConceded: true, countsAsShotReceived: true };
const saved = { countsAsSave: true, countsAsShotReceived: true };

export const GOALKEEPER_STATS: GoalkeeperStatDef[] = [
	stat("portero_goles_boya_parada", "goles", conceded),
	stat("portero_goles_dir_mas_5m", "goles", conceded),
	stat("portero_goles_contraataque", "goles", conceded),
	stat("portero_goles_penalti", "goles", { ...conceded, countsAsPenaltyAttempt: true }),
	stat("portero_goles_lanzamiento", "goles", conceded),
	stat("portero_goles_extremo", "goles", conceded),
	stat("portero_paradas_totales", "paradas"),
	stat("portero_tiros_parada_recup", "paradas", saved),
	stat("portero_paradas_fuera", "paradas", saved),
	stat("portero_paradas_penalti_parado", "paradas_penalti", {
		...saved,
		countsAsPenaltyAttempt: true
	}),
	stat("portero_penalti_palo", "paradas_penalti", {
		countsAsShotReceived: true,
		countsAsPenaltyAttempt: true
	}),
	stat("portero_penalti_fuera", "paradas_penalti", {
		countsAsShotReceived: true,
		countsAsPenaltyAttempt: true
	}),
	stat("lanz_recibido_fuera", "otros_tiros", { countsAsShotReceived: true }),
	stat("portero_lanz_palo", "otros_tiros", { countsAsShotReceived: true }),
	stat("portero_goles_hombre_menos", "inferioridad", conceded),
	stat("portero_gol_palo", "inferioridad", conceded),
	stat("portero_paradas_hombre_menos", "inferioridad", saved),
	stat("portero_parada_fuera_inf", "inferioridad", saved),
	stat("portero_lanz_palo_inf", "inferioridad", saved),
	stat("portero_inferioridad_fuera", "inferioridad", { countsAsShotReceived: true }),
	stat("portero_inferioridad_bloqueo", "inferioridad", { countsAsShotReceived: true }),
	stat("portero_acciones_asistencias", "acciones"),
	stat("portero_acciones_recuperacion", "acciones"),
	stat("portero_acciones_perdida_pos", "acciones"),
	stat("portero_acciones_exp_provocada", "acciones"),
	stat("portero_gol", "ataque"),
	stat("tiro_fallado_portero", "ataque"),
	stat("portero_gol_superioridad", "ataque"),
	stat("portero_fallo_superioridad", "ataque")
];
