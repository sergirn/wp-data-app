"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { MatchStats } from "@/lib/types";

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sum = (stats: MatchStats[], key: keyof MatchStats) => stats.reduce((acc, s) => acc + n(s[key]), 0);

function MiniKpi({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-2xl border bg-background/60 p-3">
			<p className="text-lg font-bold tabular-nums leading-none">{value}</p>
			<p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
		</div>
	);
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
			<span className="text-sm text-foreground truncate">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-2xl border bg-card/40">
			<div className="px-4 py-3 border-b">
				<p className="text-sm font-semibold">{title}</p>
			</div>
			<div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
		</div>
	);
}

export function SeasonAttackTotals({ stats }: { stats: MatchStats[] }) {
	const t = useMemo(() => {
		// GOLES (Ofensiva) — orden del dialog
		const g_boya_jugada = sum(stats, "goles_boya_jugada");
		const g_lanzamiento = sum(stats, "goles_lanzamiento");
		const g_dir_5m = sum(stats, "goles_dir_mas_5m");
		const g_contra = sum(stats, "goles_contraataque");
		const g_penalti = sum(stats, "goles_penalti_anotado");

		// Superioridad
		const g_hm = sum(stats, "goles_hombre_mas");
		const g_palo_sup = sum(stats, "gol_del_palo_sup");
		const f_hm = sum(stats, "tiros_hombre_mas");

		// Fallos (tiros)
		const f_pen = sum(stats, "tiros_penalti_fallado");
		const f_corner = sum(stats, "tiros_corner");
		const f_fuera = sum(stats, "tiros_fuera");
		const f_palo = sum(stats, "tiro_palo");
		const f_parados = sum(stats, "tiros_parados");
		const f_bloq = sum(stats, "tiros_bloqueado");

		const asistencias = sum(stats, "acciones_asistencias");
		const exp_provocada = sum(stats, "acciones_exp_provocada");
		const penalti_provocado = sum(stats, "acciones_penalti_provocado");
		const pase_boya = sum(stats, "pase_boya");
		const pase_boya_fallado = sum(stats, "pase_boya_fallado");
		const perdidas_pos = sum(stats, "acciones_perdida_poco");
		const contrafaltas = sum(stats, "faltas_contrafaltas");

		const goles = g_boya_jugada + g_lanzamiento + g_dir_5m + g_contra + g_penalti + g_hm + g_palo_sup;
		const fallos = f_pen + f_corner + f_fuera + f_parados + f_bloq + f_palo + f_hm;
		const intentos = goles + fallos;
		const efectividad = intentos ? Math.round((goles / intentos) * 100) : 0;

		const supGoals = g_hm + g_palo_sup;
		const supAtt = supGoals + f_hm;
		const supEfic = supAtt ? Math.round((supGoals / supAtt) * 100) : 0;

		return {
			goles,
			intentos,
			efectividad,
			g_boya_jugada,
			g_lanzamiento,
			g_dir_5m,
			g_contra,
			g_penalti,
			g_hm,
			g_palo_sup,
			f_hm,
			f_pen,
			f_corner,
			f_fuera,
			f_palo,
			f_parados,
			f_bloq,
			fallos,
			supEfic,
			asistencias,
			exp_provocada,
			penalti_provocado,
			pase_boya,
			pase_boya_fallado,
			perdidas_pos,
			contrafaltas
		};
	}, [stats]);

	return (
		<div className=" bg-transparent shadow-none">
			<CardContent className="p-0 space-y-3">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
					<MiniKpi label="Goles" value={t.goles} />
					<MiniKpi label="Intentos" value={t.intentos} />
					<MiniKpi label="Efectividad" value={`${t.efectividad}%`} />
					<MiniKpi label="Sup.+ Efic." value={`${t.supEfic}%`} />
				</div>
				<div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
					<Section title="Goles · Ofensiva">
						<Row label="Boya/Jugada" value={t.g_boya_jugada} />
						<Row label="Lanzamiento" value={t.g_lanzamiento} />
						<Row label="Dir +6m" value={t.g_dir_5m} />
						<Row label="Contraataque" value={t.g_contra} />
						<Row label="Penalti Anotado" value={t.g_penalti} />
						<Row label="Totales" value={t.goles} />
					</Section>

					<Section title="Superioridad · Ofensiva">
						<Row label="Goles Sup.+" value={t.g_hm} />
						<Row label="Gol del palo Sup.+" value={t.g_palo_sup} />
						<Row label="Fallos Sup.+" value={t.f_hm} />
						<Row label="Eficiencia %" value={`${t.supEfic}%`} />
					</Section>

					<Section title="Tiros · Fallos">
						<Row label="Penalti Fallado" value={t.f_pen} />
						<Row label="Corner" value={t.f_corner} />
						<Row label="Fuera" value={t.f_fuera} />
						<Row label="Palo" value={t.f_palo} />
						<Row label="Parados" value={t.f_parados} />
						<Row label="Bloqueado" value={t.f_bloq} />
						<Row label="Fallos (total)" value={t.fallos} />
						<Row label="Eficiencia % (global)" value={`${t.efectividad}%`} />
					</Section>

					<Section title="Acciones · Ofensiva">
						<Row label="Asistencias" value={t.asistencias} />
						<Row label="Exp. Provocada" value={t.exp_provocada} />
						<Row label="Penalti Provocado" value={t.penalti_provocado} />
						<Row label="Pase boya" value={t.pase_boya} />
						<Row label="Pase boya fallado" value={t.pase_boya_fallado} />
						<Row label="Pérdida Posesión" value={t.perdidas_pos} />
						<Row label="Contrafaltas" value={t.contrafaltas} />
					</Section>
				</div>
			</CardContent>
		</div>
	);
}

export function SeasonDefenseTotals({ stats }: { stats: MatchStats[] }) {
	const t = useMemo(() => {
		// FALTAS (orden del dialog)
		const exp_20_1c1 = sum(stats, "faltas_exp_20_1c1");
		const exp_20_boya = sum(stats, "faltas_exp_20_boya");
		const penalti = sum(stats, "faltas_penalti");
		const exp_simple = sum(stats, "faltas_exp_simple");
		const exp_trans = sum(stats, "exp_trans_def");
		const exp_3_int = sum(stats, "faltas_exp_3_int");
		const exp_3_bruta = sum(stats, "faltas_exp_3_bruta");

		// INFERIORIDAD (eficiencia como tu dialog)
		const inf_fuera = sum(stats, "portero_inferioridad_fuera");
		const inf_bloq = sum(stats, "portero_inferioridad_bloqueo");
		const inf_efic = inf_fuera + inf_bloq ? Math.round((inf_bloq / (inf_fuera + inf_bloq)) * 100) : 0;

		// ACCIONES defensivas
		const bloqueos = sum(stats, "acciones_bloqueo");
		const recuperaciones = sum(stats, "acciones_recuperacion");
		const recibe_gol = sum(stats, "acciones_recibir_gol");
		const rebotes = sum(stats, "acciones_rebote");

		return {
			exp_20_1c1,
			exp_20_boya,
			penalti,
			exp_simple,
			exp_trans,
			bloqueos,
			recuperaciones,
			recibe_gol,
			rebotes,
			exp_3_int,
			exp_3_bruta,
			inf_fuera,
			inf_bloq,
			inf_efic
		};
	}, [stats]);

	return (
		<div className="bg-transparent shadow-none">
			<CardContent className="p-0 space-y-3">
				<div className="grid grid-cols-4 lg:grid-cols-4 gap-2">
					<MiniKpi label='Exp 18" (1c1)' value={t.exp_20_1c1} />
					<MiniKpi label='Exp 18" (Boya)' value={t.exp_20_boya} />
					<MiniKpi label="Recuperaciones" value={t.recuperaciones} />
					<MiniKpi label="Bloqueos" value={t.bloqueos} />
				</div>

				<div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
					<Section title="Faltas · Defensiva">
						<Row label='Exp 18" 1c1' value={t.exp_20_1c1} />
						<Row label='Exp 18" Boya' value={t.exp_20_boya} />
						<Row label="Penalti" value={t.penalti} />
						<Row label="Exp (Simple)" value={t.exp_simple} />
						<Row label="Exp trans. def." value={t.exp_trans} />
						<Row label='Exp 3" Int' value={t.exp_3_int} />
						<Row label='Exp 3" Bruta' value={t.exp_3_bruta} />
					</Section>

					<Section title="Defensa · Inferioridad">
						<Row label="Fuera" value={t.inf_fuera} />
						<Row label="Bloqueo" value={t.inf_bloq} />
						<Row label="Eficiencia %" value={`${t.inf_efic}%`} />
					</Section>

					<Section title="Acciones · Defensiva">
						<Row label="Bloqueo" value={t.bloqueos} />
						<Row label="Recuperación" value={t.recuperaciones} />
						<Row label="Recibe Gol" value={t.recibe_gol} />
						<Row label="Rebote" value={t.rebotes} />
					</Section>
				</div>
			</CardContent>
		</div>
	);
}

export function SeasonGoalkeeperTotals({ stats }: { stats: MatchStats[] }) {
	const t = useMemo(() => {
		// GOLES recibidos (totales) como tu dialog
		const gc_boya = sum(stats, "portero_goles_boya_parada");
		const gc_hm = sum(stats, "portero_goles_hombre_menos");
		const gc_dir = sum(stats, "portero_goles_dir_mas_5m");
		const gc_contra = sum(stats, "portero_goles_contraataque");
		const gc_pen = sum(stats, "portero_goles_penalti");
		const gc_lanz = sum(stats, "portero_goles_lanzamiento");
		const gc_palo = sum(stats, "portero_gol_palo");
		const totalGC = gc_boya + gc_hm + gc_dir + gc_contra + gc_pen + gc_lanz + gc_palo;

		// PARADAS (totales) como tu dialog
		const p_recup = sum(stats, "portero_tiros_parada_recup");
		const p_fuera = sum(stats, "portero_paradas_fuera");
		const p_pen = sum(stats, "portero_paradas_penalti_parado");
		const p_hm = sum(stats, "portero_paradas_hombre_menos");
		const totalP = p_recup + p_fuera + p_pen + p_hm;

		const lanz_fuera = sum(stats, "lanz_recibido_fuera");
		const lanz_palo = sum(stats, "portero_lanz_palo");

		const asistencias = sum(stats, "acciones_asistencias");
		const portero_gol = sum(stats, "portero_gol");
		const portero_gol_sup = sum(stats, "portero_gol_superioridad");
		const tiro_fallado = sum(stats, "tiro_fallado_portero");
		const fallo_sup = sum(stats, "portero_fallo_superioridad");

		const recuperacion = sum(stats, "acciones_recuperacion");
		const perdidas = sum(stats, "portero_acciones_perdida_pos");
		const exp_provocada = sum(stats, "acciones_exp_provocada");

		const inf_goles = gc_hm + gc_palo;

		return {
			totalGC,
			totalP,
			gc_boya,
			gc_hm,
			gc_dir,
			gc_contra,
			gc_pen,
			gc_lanz,
			gc_palo,
			p_recup,
			p_fuera,
			p_pen,
			p_hm,
			lanz_fuera,
			lanz_palo,
			asistencias,
			portero_gol,
			portero_gol_sup,
			tiro_fallado,
			fallo_sup,
			recuperacion,
			perdidas,
			exp_provocada
		};
	}, [stats]);

	return (
		<div className=" bg-transparent shadow-none">
			<CardContent className="p-0 space-y-3">
				<div className="grid grid-cols-3 lg:grid-cols-3 gap-2">
					<MiniKpi label="Goles recibidos" value={t.totalGC} />
					<MiniKpi label="Paradas" value={t.totalP} />
					<MiniKpi label="Paradas Inf.-" value={t.p_hm} />
				</div>

				<div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
					<Section title="Portero · Goles">
						<Row label="Totales" value={t.totalGC} />
						<Row label="Boya" value={t.gc_boya} />
						<Row label="Dir +6m" value={t.gc_dir} />
						<Row label="Contraataque" value={t.gc_contra} />
						<Row label="Penalti" value={t.gc_pen} />
						<Row label="Lanzamiento" value={t.gc_lanz} />
						<Row label="Gol de palo" value={t.gc_palo} />
					</Section>

					<Section title="Portero · Paradas">
						<Row label="Totales" value={t.totalP} />
						<Row label="Parada Recup" value={t.p_recup} />
						<Row label="Parada Corner" value={t.p_fuera} />
						<Row label="Penalti Parado" value={t.p_pen} />
						<Row label="Paradas Inf.-" value={t.p_hm} />
						<Row label="Lanz. recibido fuera" value={t.lanz_fuera} />
						<Row label="Lanz. al palo" value={t.lanz_palo} />
					</Section>

					<Section title="Portero · Acciones">
						<Row label="Asistencias" value={t.asistencias} />
						<Row label="Gol" value={t.portero_gol} />
						<Row label="Gol Superioridad" value={t.portero_gol_sup} />
						<Row label="Tiro Fallado" value={t.tiro_fallado} />
						<Row label="Fallo Superioridad" value={t.fallo_sup} />
						<Row label="Recuperación" value={t.recuperacion} />
						<Row label="Pérdida Posesión" value={t.perdidas} />
						<Row label="Exp. Provocada" value={t.exp_provocada} />
					</Section>
				</div>
			</CardContent>
		</div>
	);
}
