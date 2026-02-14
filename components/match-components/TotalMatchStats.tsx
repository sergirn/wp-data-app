"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Target, TrendingUp, Shield, RotateCcw, AlertTriangle, HandCoins, Activity, ArrowDownUp, ChevronDown } from "lucide-react";
import type { MatchStats } from "@/lib/types";

type Props = {
	title?: string;
	stats: MatchStats[];
};

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function sum(stats: MatchStats[], key: keyof MatchStats) {
	return stats.reduce((acc, s) => acc + n(s[key]), 0);
}

function pct(numer: number, denom: number) {
	if (!denom) return 0;
	return Math.round((numer / denom) * 1000) / 10;
}

function MetricTile({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: React.ReactNode }) {
	return (
		<div className="rounded-xl border bg-muted/20 p-3 sm:p-4">
			<div className="flex items-start justify-between gap-2 sm:gap-3">
				<div className="min-w-0">
					<p className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">{label}</p>
					<p className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight">{value}</p>
					{hint ? <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-snug line-clamp-2">{hint}</p> : null}
				</div>

				{icon ? (
					<div className="shrink-0 rounded-lg border bg-card/60 p-1.5 sm:p-2 text-muted-foreground">
						<span className="block [&_svg]:h-4 [&_svg]:w-4 sm:[&_svg]:h-5 sm:[&_svg]:w-5">{icon}</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

export function TeamTotalsOverviewCard({ title = "Totales del Equipo", stats }: Props) {
	// --- GOLES (recalculado) ---
	const g_boya_jugada = sum(stats, "goles_boya_jugada");
	const g_hombre_mas = sum(stats, "goles_hombre_mas");
	const g_lanzamiento = sum(stats, "goles_lanzamiento");
	const g_dir_5m = sum(stats, "goles_dir_mas_5m");
	const g_contraataque = sum(stats, "goles_contraataque");
	const g_penalti = sum(stats, "goles_penalti_anotado");
	const g_gol_del_palo_sup = sum(stats, "gol_del_palo_sup");

	const goles = g_boya_jugada + g_hombre_mas + g_lanzamiento + g_dir_5m + g_contraataque + g_penalti + g_gol_del_palo_sup;

	// --- FALLOS ---
	const f_hombre_mas = sum(stats, "tiros_hombre_mas");
	const f_penalti = sum(stats, "tiros_penalti_fallado");
	const f_corner = sum(stats, "tiros_corner");
	const f_fuera = sum(stats, "tiros_fuera");
	const f_parados = sum(stats, "tiros_parados");
	const f_bloqueados = sum(stats, "tiros_bloqueado");
	const f_tiro_palo = sum(stats, "tiro_palo");

	const fallos = f_hombre_mas + f_penalti + f_corner + f_fuera + f_parados + f_bloqueados + f_tiro_palo;

	const intentos = goles + fallos;
	const efectividad = pct(goles, intentos);

	// --- FOULS ---
	const faltas_20_1c1 = sum(stats, "faltas_exp_20_1c1");
	const faltas_20_boya = sum(stats, "faltas_exp_20_boya");
	const faltas_simple = sum(stats, "faltas_exp_simple");

	const exp_trans_def = sum(stats, "exp_trans_def");
	const faltas_penalti = sum(stats, "faltas_penalti");
	const faltas_contrafaltas = sum(stats, "faltas_contrafaltas");
	const faltas_3_int = sum(stats, "faltas_exp_3_int");
	const faltas_3_bruta = sum(stats, "faltas_exp_3_bruta");
	const faltas =
		faltas_20_1c1 + faltas_20_boya + faltas_simple + faltas_penalti + faltas_contrafaltas + faltas_3_int + faltas_3_bruta + exp_trans_def;

	// --- ACCIONES JUGADORES ---
	const asistencias = sum(stats, "acciones_asistencias");
	const bloqueos = sum(stats, "acciones_bloqueo");
	const recuperaciones = sum(stats, "acciones_recuperacion");
	const rebotes = sum(stats, "acciones_rebote");
	const exp_provocada = sum(stats, "acciones_exp_provocada");
	const penalti_provocado = sum(stats, "acciones_penalti_provocado");
	const pase_boya = sum(stats, "pase_boya");
	const pase_boya_fallado = sum(stats, "pase_boya_fallado");
	const perdidas = sum(stats, "acciones_perdida_poco");

	const rebote_recup_hm = sum(stats, "rebote_recup_hombre_mas");
	const rebote_perd_hm = sum(stats, "rebote_perd_hombre_mas");

	// --- PORTERO ---
	const paradas = sum(stats, "portero_paradas_totales");
	const paradas_recup = sum(stats, "portero_tiros_parada_recup") + sum(stats, "portero_paradas_parada_recup");
	const paradas_fuera = sum(stats, "portero_paradas_fuera");
	const paradas_penalti = sum(stats, "portero_paradas_penalti_parado");
	const paradas_hombre_menos = sum(stats, "portero_paradas_hombre_menos");

	// ✅ tiros del rival que NO cuentan como paradas
	const lanz_recibido_fuera = sum(stats, "lanz_recibido_fuera");
	const portero_lanz_palo = sum(stats, "portero_lanz_palo");
	const portero_inferioridad_fuera = sum(stats, "portero_inferioridad_fuera");
	const portero_inferioridad_bloqueo = sum(stats, "portero_inferioridad_bloqueo");

	// ✅ goles recibidos (incluye gol de palo)
	const gc_boya_parada = sum(stats, "portero_goles_boya_parada");
	const gc_hombre_menos = sum(stats, "portero_goles_hombre_menos");
	const gc_dir_5m = sum(stats, "portero_goles_dir_mas_5m");
	const gc_contraataque = sum(stats, "portero_goles_contraataque");
	const gc_penalti = sum(stats, "portero_goles_penalti");
	const gc_lanzamiento = sum(stats, "portero_goles_lanzamiento");
	const gc_penalti_encajado = sum(stats, "portero_goles_penalti_encajado");
	const gc_portero_gol_palo = sum(stats, "portero_gol_palo");

	const goles_recibidos =
		gc_portero_gol_palo + gc_boya_parada + gc_hombre_menos + gc_dir_5m + gc_contraataque + gc_penalti + gc_lanzamiento + gc_penalti_encajado;

	// ✅ NUEVO: tiros totales recibidos (cuenta TODO lo del portero: goles + paradas + fuera + palo + H- fuera/bloq)
	const tiros_recibidos_totales =
		paradas + goles_recibidos + lanz_recibido_fuera + portero_lanz_palo + portero_inferioridad_fuera + portero_inferioridad_bloqueo;

	// ✅ eficiencia portero basada en tiros recibidos totales
	const eficPortero = tiros_recibidos_totales > 0 ? pct(paradas, tiros_recibidos_totales) : 0;

	const portero_asist = sum(stats, "portero_acciones_asistencias");
	const portero_recup = sum(stats, "portero_acciones_recuperacion");
	const portero_perdidas = sum(stats, "portero_acciones_perdida_pos");
	const portero_exp_provocada = sum(stats, "portero_acciones_exp_provocada") + sum(stats, "portero_exp_provocada");
	const portero_penalti_provocado = sum(stats, "portero_penalti_provocado");

	const tirosAPorteria = f_parados + goles;
	const pctAPorteria = pct(tirosAPorteria, intentos);
	const balanceRebotesHM = rebote_recup_hm - rebote_perd_hm;

	return (
		<Card className="mb-6 bg-transparent shadow-none border-none">
			<div className="mb-3 border-t border-muted/80" />
			<CardHeader className="pb-2">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
					<CardTitle className="text-base sm:text-lg">{title}</CardTitle>
					<Badge variant="outline" className="bg-muted/30 w-fit text-[11px] sm:text-xs">
						{intentos} intentos · {efectividad}% efect.
					</Badge>
				</div>
			</CardHeader>

			<div className="space-y-4">
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
					<MetricTile label="Goles" value={goles} hint={`${goles}/${intentos} · ${efectividad}%`} icon={<Target />} />
					<MetricTile label="Efectividad" value={`${efectividad}%`} hint={`A portería ~ ${pctAPorteria}%`} icon={<TrendingUp />} />
					<MetricTile
						label="Faltas"
						value={faltas}
						hint={`20": ${faltas_20_1c1 + faltas_20_boya} · simple: ${faltas_simple} · trans. def.: ${exp_trans_def}`}
						icon={<AlertTriangle />}
					/>
					<MetricTile
						label="Recuperaciones"
						value={recuperaciones + portero_recup}
						hint={portero_recup ? `incluye ${portero_recup} portero` : undefined}
						icon={<RotateCcw />}
					/>
				</div>

				<Accordion type="single" collapsible className="w-full ">
					<AccordionItem value="details" className="bg-transparent overflow-hidden">
						<AccordionTrigger className="px-4 py-3 hover:no-underline bg-muted/20">
							<div className="flex items-center justify-between w-full gap-3">
								<div className="flex items-center gap-2">
									<ChevronDown className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm font-semibold">Ver más estadísticas</span>
								</div>

								<Badge variant="outline" className="bg-muted/30 hidden sm:inline-flex">
									Bloqueos {bloqueos} · Pérdidas {perdidas + portero_perdidas}
								</Badge>
							</div>
						</AccordionTrigger>

						<AccordionContent className="px-4 pb-4 pt-3 space-y-4 bg-muted/10 rounded-xl border-1">
							{/* Acciones */}
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
								<MetricTile
									label="Asistencias"
									value={asistencias}
									hint={portero_asist ? `+${portero_asist} portero` : undefined}
									icon={<Activity />}
								/>
								<MetricTile label="Bloqueos" value={bloqueos} icon={<Shield />} />
								<MetricTile label="Rebotes" value={rebotes} icon={<RotateCcw />} />
								<MetricTile
									label="Pérdidas"
									value={perdidas + portero_perdidas}
									hint="Jugadores + portero"
									icon={<AlertTriangle />}
								/>
							</div>

							{/* Provocadas + HM */}
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
								<MetricTile label="Exp. provocadas" value={exp_provocada + portero_exp_provocada} icon={<HandCoins />} />
								<MetricTile label="Penaltis provoc." value={penalti_provocado + portero_penalti_provocado} icon={<HandCoins />} />
								<MetricTile
									label="Rebotes H+"
									value={`${rebote_recup_hm}/${rebote_perd_hm}`}
									hint={`Balance: ${balanceRebotesHM >= 0 ? "+" : ""}${balanceRebotesHM}`}
									icon={<RotateCcw />}
								/>
								<MetricTile
									label="H+ (goles/fallos)"
									value={`${g_hombre_mas + g_gol_del_palo_sup}/${f_hombre_mas}`}
									icon={<Target />}
								/>
							</div>

							{/* Pase boya */}
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
								<MetricTile
									label="Pase a boya"
									value={`${pase_boya}/${pase_boya_fallado}`}
									hint="ok / fallado"
									icon={<ArrowDownUp />}
								/>
								<MetricTile
									label="Fallos totales"
									value={fallos}
									hint={`Fuera ${f_fuera} · Parados ${f_parados} · Bloq ${f_bloqueados} · Palo ${f_tiro_palo}`}
									icon={<TrendingUp />}
								/>
								<MetricTile
									label="Goles por tipo"
									value={goles}
									hint={`Boya ${g_boya_jugada} · H+ ${g_hombre_mas + g_gol_del_palo_sup} · Contra ${g_contraataque}`}
									icon={<Target />}
								/>
								<MetricTile
									label="Faltas (detalle)"
									value={faltas}
									hint={`Pen ${faltas_penalti} · CF ${faltas_contrafaltas}`}
									icon={<AlertTriangle />}
								/>
							</div>

							{/* Portero */}
							<div className="rounded-xl border bg-muted/10 p-4">
								<div className="flex items-center justify-between gap-3">
									<p className="text-sm font-semibold">Portero</p>
									<Badge variant="outline" className="bg-muted/30 text-[11px] sm:text-xs">
										Efic. {eficPortero}%
									</Badge>
								</div>

								<div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
									{/* ✅ NUEVO */}
									<MetricTile
										label="Tiros recibidos"
										value={tiros_recibidos_totales}
										hint={`Paradas ${paradas} · GC ${goles_recibidos} · Fuera ${lanz_recibido_fuera} · Palo ${portero_lanz_palo} · H- ${portero_inferioridad_fuera + portero_inferioridad_bloqueo}`}
										icon={<Target />}
									/>

									<MetricTile
										label="Paradas"
										value={paradas}
										hint={`Recup ${paradas_recup} · Pen ${paradas_penalti}`}
										icon={<Shield />}
									/>

									<MetricTile
										label="Goles recibidos"
										value={goles_recibidos}
										hint={`H- ${gc_hombre_menos} · Pen ${gc_penalti}`}
										icon={<Target />}
									/>

									<MetricTile label="Paradas H-" value={paradas_hombre_menos} icon={<Shield />} />
									{/* <MetricTile label="Paradas fuera" value={paradas_fuera} icon={<Shield />} /> */}
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</Card>
	);
}
