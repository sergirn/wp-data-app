export function buildTeamDashboardStats(players: any[] = [], enabledStats: any[] = []) {
	return (players || []).map((player) => {
		const stats = enabledStats.filter((s) => s.player_id === player.id);

		const goles_totales = stats.reduce((sum, s) => sum + (s.goles_totales || 0), 0);
		const tiros_totales = stats.reduce((sum, s) => sum + (s.tiros_totales || 0), 0);
		const acciones_asistencias = stats.reduce((sum, s) => sum + (s.acciones_asistencias || 0), 0);
		const acciones_bloqueo = stats.reduce((sum, s) => sum + (s.acciones_bloqueo || 0), 0);
		const acciones_recuperacion = stats.reduce((sum, s) => sum + (s.acciones_recuperacion || 0), 0);
		const acciones_rebote = stats.reduce((sum, s) => sum + (s.acciones_rebote || 0), 0);

		const faltas_exp_3_bruta = stats.reduce((sum, s) => sum + (s.faltas_exp_3_bruta || 0), 0);
		const faltas_exp_3_int = stats.reduce((sum, s) => sum + (s.faltas_exp_3_int || 0), 0);
		const faltas_exp_20_1c1 = stats.reduce((sum, s) => sum + (s.faltas_exp_20_1c1 || 0), 0);
		const faltas_exp_20_boya = stats.reduce((sum, s) => sum + (s.faltas_exp_20_boya || 0), 0);
		const faltas_penalti = stats.reduce((sum, s) => sum + (s.faltas_penalti || 0), 0);

		const goles_penalti_anotado = stats.reduce((sum, s) => sum + (s.goles_penalti_anotado || 0), 0);
		const tiros_penalti_fallado = stats.reduce((sum, s) => sum + (s.tiros_penalti_fallado || 0), 0);

		const totalPerdidas = stats.reduce(
			(sum, s) => sum + (s.acciones_perdida_poco || 0) + (s.portero_acciones_perdida_pos || 0),
			0
		);

		const eficiencia = tiros_totales > 0 ? Math.round((goles_totales / tiros_totales) * 100) : 0;

		const portero_paradas_totales = stats.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0);
		const portero_paradas_penalti_parado = stats.reduce((sum, s) => sum + (s.portero_paradas_penalti_parado || 0), 0);
		const portero_goles_totales = stats.reduce((sum, s) => sum + (s.portero_goles_totales || 0), 0);
		const portero_goles_extremo = stats.reduce((sum, s) => sum + (s.portero_goles_extremo || 0), 0);
		const portero_paradas_hombre_menos = stats.reduce((sum, s) => sum + (s.portero_paradas_hombre_menos || 0), 0);
		const portero_goles_hombre_menos = stats.reduce((sum, s) => sum + (s.portero_goles_hombre_menos || 0), 0);
		const portero_inferioridad_fuera = stats.reduce((sum, s) => sum + (s.portero_inferioridad_fuera || 0), 0);
		const portero_inferioridad_bloqueo = stats.reduce((sum, s) => sum + (s.portero_inferioridad_bloqueo || 0), 0);

		return {
			...player,
			goles_totales,
			tiros_totales,
			acciones_asistencias,
			acciones_bloqueo,
			acciones_recuperacion,
			acciones_rebote,
			faltas_exp_3_bruta,
			faltas_exp_3_int,
			faltas_exp_20_1c1,
			faltas_exp_20_boya,
			faltas_penalti,
			goles_penalti_anotado,
			tiros_penalti_fallado,
			totalGoles: goles_totales,
			totalTiros: tiros_totales,
			totalAsistencias: acciones_asistencias,
			totalBloqueos: acciones_bloqueo,
			totalPerdidas,
			eficiencia,
			matchesPlayed: stats.length,
			partidos: stats.length,
			portero_paradas_totales,
			portero_paradas_penalti_parado,
			portero_goles_totales,
			portero_goles_extremo,
			portero_paradas_hombre_menos,
			portero_goles_hombre_menos,
			portero_inferioridad_fuera,
			portero_inferioridad_bloqueo
		};
	});
}
