"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { MatchStats } from "@/lib/types";

import { accumulatePlayerStats, getPlayerDerived, n as fpN } from "@/lib/stats/playerStatsHelpers";

import { accumulateGoalkeeperStats, getGoalkeeperDerived, n as gkN } from "@/lib/stats/goalkeeperStatsHelpers";
import { GoalkeeperStatsSections } from "../analytics-goalkeeper/GoalkeeperStatsSections";
import { PlayerStatsSections } from "../analytics-player/PlayerStatsSections";

type Props = {
	title?: string;
	stats: MatchStats[];
};

function pct(numer: number, denom: number) {
	if (!denom) return 0;
	return Math.round((numer / denom) * 1000) / 10;
}

function MiniKpiBox({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"rounded-2xl border",
				"p-3 sm:p-3.5",
				"bg-gradient-to-br",
				subtle ? "from-background to-muted/60" : "from-blue-500/5 to-blue-500/10"
			].join(" ")}
		>
			<p className="text-lg sm:text-xl font-bold tabular-nums leading-none">{value}</p>
			<p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5">{label}</p>
		</div>
	);
}

function Row({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"flex items-center justify-between gap-3",
				"rounded-xl px-3 py-2",
				"border transition-colors",
				subtle ? "bg-muted/20 border-transparent" : "bg-muted/40 border-transparent"
			].join(" ")}
		>
			<span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}

export function TeamTotalsOverviewCard({ title = "Totales del Partido", stats }: Props) {
	const fieldTotals = accumulatePlayerStats(stats as Array<Record<string, any>>);

	const goalkeeperTotals = accumulateGoalkeeperStats(stats as Array<Record<string, any>>);

	const fieldDerived = getPlayerDerived(fieldTotals);
	const goalkeeperDerived = getGoalkeeperDerived(goalkeeperTotals);

	const goles = fieldDerived.goals;
	const intentos = fieldDerived.shots;
	const efectividad = fieldDerived.efficiency;

	const faltas_20_1c1 = fpN(fieldTotals.faltas_exp_20_1c1);
	const faltas_20_boya = fpN(fieldTotals.faltas_exp_20_boya);
	const faltas_simple = fpN(fieldTotals.faltas_exp_simple);
	const exp_trans_def = fpN(fieldTotals.exp_trans_def);
	const faltas_penalti = fpN(fieldTotals.faltas_penalti);
	const faltas_contrafaltas = fpN(fieldTotals.faltas_contrafaltas);
	const faltas_3_int = fpN(fieldTotals.faltas_exp_3_int);
	const faltas_3_bruta = fpN(fieldTotals.faltas_exp_3_bruta);

	const faltas =
		faltas_20_1c1 + faltas_20_boya + faltas_simple + faltas_penalti + faltas_contrafaltas + faltas_3_int + faltas_3_bruta + exp_trans_def;

	const recuperaciones = fpN(fieldTotals.acciones_recuperacion);
	const bloqueos = fpN(fieldTotals.acciones_bloqueo);
	const rebotes = fpN(fieldTotals.acciones_rebote);
	const exp_provocada = fpN(fieldTotals.acciones_exp_provocada);
	const penalti_provocado = fpN(fieldTotals.acciones_penalti_provocado);
	const pase_boya = fpN(fieldTotals.pase_boya);
	const pase_boya_fallado = fpN(fieldTotals.pase_boya_fallado);
	const perdidas = fpN(fieldTotals.acciones_perdida_poco);
	const rebote_recup_hm = fpN(fieldTotals.rebote_recup_hombre_mas);
	const rebote_perd_hm = fpN(fieldTotals.rebote_perd_hombre_mas);

	const porteroRecup = gkN(goalkeeperTotals.portero_acciones_recuperacion) || gkN(goalkeeperTotals.acciones_recuperacion);

	const tirosAPorteria = fpN(fieldTotals.tiros_parados) + goles;
	const pctAPorteria = pct(tirosAPorteria, intentos);
	const balanceRebotesHM = rebote_recup_hm - rebote_perd_hm;

	const paradas = goalkeeperDerived.saves;
	const golesRecibidos = goalkeeperDerived.goalsConceded;
	const tirosRecibidos = goalkeeperDerived.shotsReceived;
	const eficPortero = goalkeeperDerived.savePct;

	const porteroInferioridadFuera = gkN(goalkeeperTotals.portero_inferioridad_fuera);
	const porteroInferioridadBloqueo = gkN(goalkeeperTotals.portero_inferioridad_bloqueo);

	return (
		<Card className="mb-6 bg-transparent shadow-none border-none">
			<div className="mb-3 border-t border-muted/80" />

			<CardContent className="space-y-5 px-0 sm:px-0">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
					<MiniKpiBox label="Goles" value={goles} />
					<MiniKpiBox label="Efectividad" value={`${efectividad}%`} subtle />
					<MiniKpiBox label="Faltas" value={faltas} />
					<MiniKpiBox label="Recuperaciones" value={recuperaciones + porteroRecup} subtle />
				</div>

				<div className="flex items-center gap-3">
					<p className="text-sm font-semibold text-muted-foreground">Jugadores de campo</p>
					<div className="h-px flex-1 bg-border/60" />
				</div>

				<div className="space-y-3">
					<PlayerStatsSections
						stats={fieldTotals}
						mode="team"
						renderRow={({ label, value, statKey }) => <Row key={statKey} label={label} value={value} />}
					/>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Row label="A portería (%)" value={`${pctAPorteria}%`} subtle />
						<Row label="Balance Rebotes Sup.+" value={`${balanceRebotesHM >= 0 ? "+" : ""}${balanceRebotesHM}`} subtle />
						<Row label="Pase a boya (ok/f)" value={`${pase_boya}/${pase_boya_fallado}`} />
						<Row label="Rebotes Sup.+ (rec/perd)" value={`${rebote_recup_hm}/${rebote_perd_hm}`} />
					</div>
				</div>

				<div className="flex items-center gap-3">
					<p className="text-sm font-semibold text-muted-foreground">Porteros</p>
					<div className="h-px flex-1 bg-border/60" />
				</div>

				<div className="space-y-3">
					<GoalkeeperStatsSections
						stats={goalkeeperTotals}
						mode="team"
						renderRow={({ label, value, statKey }) => <Row key={statKey} label={label} value={value} />}
					/>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Row label="Goles recibidos" value={golesRecibidos} />
						<Row label="Paradas" value={paradas} />
						<Row label="Tiros recibidos" value={tirosRecibidos} />
						<Row label="Eficiencia portero" value={`${eficPortero}%`} subtle />
						<Row label="Bloqueos + Fuera (Inferioridad)" value={porteroInferioridadFuera + porteroInferioridadBloqueo} subtle />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
