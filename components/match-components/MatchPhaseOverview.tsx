"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Activity, ArrowDownRight, ArrowUpRight, CircleGauge, Crown, Minus, ShieldCheck, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Phase = "attack" | "defense" | "goalkeeper";

type MatchStatRow = Record<string, unknown> & {
	id?: number;
	players?: {
		id?: number;
		name?: string | null;
		number?: number | null;
		is_goalkeeper?: boolean;
	};
};

type Props = {
	phase: Phase;
	stats: MatchStatRow[];
	hiddenStats?: string[];
};

type Contributor = {
	id: number | string;
	name: string;
	number?: number | null;
	primary: number;
	secondary: number;
	score: number;
};

const n = (value: unknown) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const pct = (value: number, total: number) => (total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0);

function MetricCard({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: string }) {
	return (
		<div className="relative overflow-hidden rounded-2xl border bg-background/70 p-4 shadow-sm">
			<div className={`absolute inset-x-0 top-0 h-1 ${tone}`} />
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<p className="mt-1 text-2xl font-black tracking-tight tabular-nums">{value}</p>
			<p className="mt-1 text-xs text-muted-foreground">{detail}</p>
		</div>
	);
}

function DistributionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
	const percentage = pct(value, total);
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between gap-3 text-xs">
				<span className="truncate font-medium">{label}</span>
				<span className="shrink-0 tabular-nums text-muted-foreground">{value} · {percentage}%</span>
			</div>
			<div className="h-2.5 overflow-hidden rounded-full bg-muted">
				<div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${percentage}%` }} />
			</div>
		</div>
	);
}

export function MatchPhaseOverview({ phase, stats, hiddenStats = [] }: Props) {
	const t = useTranslations("MatchPhaseOverview");
	const hidden = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const data = useMemo(() => {
		const rows = Array.isArray(stats) ? stats : [];
		const fieldRows = rows.filter((row) => !row?.players?.is_goalkeeper);
		const goalkeeperRows = rows.filter((row) => row?.players?.is_goalkeeper);
		const isVisible = (key: string) => !hidden.has(key);
		const sum = (source: MatchStatRow[], key: string) => isVisible(key) ? source.reduce((acc, row) => acc + n(row?.[key]), 0) : 0;
		const rowValue = (row: MatchStatRow, key: string) => isVisible(key) ? n(row?.[key]) : 0;

		const goals = sum(fieldRows, "goles_totales");
		const shots = sum(fieldRows, "tiros_totales");
		const assists = sum(fieldRows, "acciones_asistencias");
		const drawn = sum(fieldRows, "acciones_exp_provocada") + sum(fieldRows, "acciones_penalti_provocado");
		const centerPasses = sum(fieldRows, "pase_boya");
		const losses = sum(fieldRows, "acciones_perdida_poco") + sum(fieldRows, "pase_boya_fallado") + sum(fieldRows, "faltas_contrafaltas");
		const creation = assists + drawn + centerPasses;
		const creationBalance = creation - losses;

		const powerPlayGoals = sum(fieldRows, "goles_hombre_mas") + sum(fieldRows, "gol_del_palo_sup");
		const powerPlayMisses = sum(fieldRows, "tiros_hombre_mas") + sum(fieldRows, "portero_paradas_superioridad") + sum(fieldRows, "jugador_superioridad_bloqueo");
		const powerPlayAttempts = powerPlayGoals + powerPlayMisses;

		const blocks = sum(fieldRows, "acciones_bloqueo");
		const recoveries = sum(fieldRows, "acciones_recuperacion");
		const rebounds = sum(fieldRows, "acciones_rebote");
		const defensiveActions = blocks + recoveries + rebounds;
		const goalsAllowedActions = sum(fieldRows, "acciones_recibir_gol");

		const inferioritySaves = sum(rows, "portero_paradas_hombre_menos");
		const inferiorityOut = sum(rows, "portero_inferioridad_fuera") + sum(rows, "portero_parada_fuera_inf") + sum(rows, "portero_lanz_palo_inf") + sum(rows, "portero_inferioridad_bloqueo");
		const inferiorityGoals = sum(rows, "portero_goles_hombre_menos") + sum(rows, "portero_gol_palo");
		const inferiorityPrevented = inferioritySaves + inferiorityOut;
		const inferiorityTotal = inferiorityPrevented + inferiorityGoals;

		const saves = sum(goalkeeperRows, "portero_paradas_totales");
		const detailedGoals = ["portero_goles_boya_parada", "portero_goles_dir_mas_5m", "portero_goles_contraataque", "portero_goles_penalti", "portero_goles_lanzamiento", "portero_goles_hombre_menos", "portero_gol_palo"]
			.reduce((acc, key) => acc + sum(goalkeeperRows, key), 0);
		const storedGoals = sum(goalkeeperRows, "portero_goles_totales");
		const conceded = storedGoals || detailedGoals;
		const shotsReceived = saves + conceded;
		const penaltySaves = sum(goalkeeperRows, "portero_paradas_penalti_parado");
		const penaltyGoals = sum(goalkeeperRows, "portero_goles_penalti");
		const penaltyTotal = penaltySaves + penaltyGoals;

		const contributors: Contributor[] = (phase === "goalkeeper" ? goalkeeperRows : fieldRows)
			.map((row, index) => {
				const player = row?.players ?? {};
				if (phase === "attack") {
					const rowGoals = rowValue(row, "goles_totales");
					const rowAssists = rowValue(row, "acciones_asistencias");
					const rowCreated = rowValue(row, "acciones_exp_provocada") + rowValue(row, "acciones_penalti_provocado") + rowValue(row, "pase_boya");
					const rowLosses = rowValue(row, "acciones_perdida_poco") + rowValue(row, "pase_boya_fallado") + rowValue(row, "faltas_contrafaltas");
					return { id: player.id ?? row.id ?? index, name: player.name ?? t("unknownPlayer"), number: player.number, primary: rowGoals, secondary: rowAssists, score: rowGoals * 4 + rowAssists * 2 + rowCreated - rowLosses };
				}
				if (phase === "defense") {
					const rowBlocks = rowValue(row, "acciones_bloqueo");
					const rowRecoveries = rowValue(row, "acciones_recuperacion") + rowValue(row, "acciones_rebote");
					const received = rowValue(row, "acciones_recibir_gol");
					return { id: player.id ?? row.id ?? index, name: player.name ?? t("unknownPlayer"), number: player.number, primary: rowRecoveries, secondary: rowBlocks, score: rowRecoveries * 2 + rowBlocks * 3 - received * 2 };
				}
				const rowSaves = rowValue(row, "portero_paradas_totales");
				const rowGoals = rowValue(row, "portero_goles_totales") || ["portero_goles_boya_parada", "portero_goles_dir_mas_5m", "portero_goles_contraataque", "portero_goles_penalti", "portero_goles_lanzamiento", "portero_goles_hombre_menos", "portero_gol_palo"].reduce((acc, key) => acc + rowValue(row, key), 0);
				return { id: player.id ?? row.id ?? index, name: player.name ?? t("unknownGoalkeeper"), number: player.number, primary: rowSaves, secondary: rowGoals, score: rowSaves * 2 - rowGoals };
			})
			.filter((player) => player.primary > 0 || player.secondary > 0 || player.score !== 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 3);

		if (phase === "attack") {
			return {
				metrics: [
					{ label: t("shootingEfficiency"), value: `${pct(goals, shots)}%`, detail: t("goalsOfShots", { goals, shots }), tone: "bg-emerald-500" },
					{ label: t("powerPlayEfficiency"), value: `${pct(powerPlayGoals, powerPlayAttempts)}%`, detail: t("goalsOfAttempts", { goals: powerPlayGoals, attempts: powerPlayAttempts }), tone: "bg-cyan-500" },
					{ label: t("creationBalance"), value: creationBalance > 0 ? `+${creationBalance}` : creationBalance, detail: t("createdVsLost", { created: creation, lost: losses }), tone: creationBalance >= 0 ? "bg-blue-500" : "bg-rose-500" },
					{ label: t("assistedGoals"), value: `${pct(assists, goals)}%`, detail: t("assistsOfGoals", { assists, goals }), tone: "bg-violet-500" }
				],
				distribution: [
					{ label: t("goals"), value: goals, color: "bg-emerald-500" },
					{ label: t("assists"), value: assists, color: "bg-violet-500" },
					{ label: t("createdAdvantages"), value: drawn + centerPasses, color: "bg-blue-500" }
				],
				insight: t(pct(goals, shots) >= 45 ? "attackInsightPositive" : "attackInsightOpportunity", { efficiency: pct(goals, shots), balance: creationBalance }),
				contributors
			};
		}

		if (phase === "defense") {
			return {
				metrics: [
					{ label: t("defensiveActions"), value: defensiveActions, detail: t("actionsBreakdown", { recoveries, blocks, rebounds }), tone: "bg-blue-500" },
					{ label: t("inferiorityEfficiency"), value: `${pct(inferiorityPrevented, inferiorityTotal)}%`, detail: t("preventedOfTotal", { prevented: inferiorityPrevented, total: inferiorityTotal }), tone: "bg-emerald-500" },
					{ label: t("possessionBalance"), value: recoveries - losses > 0 ? `+${recoveries - losses}` : recoveries - losses, detail: t("recoveriesVsLosses", { recoveries, losses }), tone: recoveries >= losses ? "bg-cyan-500" : "bg-rose-500" },
					{ label: t("goalsAllowedActions"), value: goalsAllowedActions, detail: t("registeredAssignments"), tone: "bg-amber-500" }
				],
				distribution: [
					{ label: t("recoveries"), value: recoveries, color: "bg-emerald-500" },
					{ label: t("blocks"), value: blocks, color: "bg-blue-500" },
					{ label: t("rebounds"), value: rebounds, color: "bg-amber-500" }
				],
				insight: t(pct(inferiorityPrevented, inferiorityTotal) >= 50 ? "defenseInsightPositive" : "defenseInsightOpportunity", { efficiency: pct(inferiorityPrevented, inferiorityTotal), balance: recoveries - losses }),
				contributors
			};
		}

		return {
			metrics: [
				{ label: t("saveEfficiency"), value: `${pct(saves, shotsReceived)}%`, detail: t("savesOfShots", { saves, shots: shotsReceived }), tone: "bg-blue-500" },
				{ label: t("goalsConceded"), value: conceded, detail: t("shotsFaced", { shots: shotsReceived }), tone: "bg-rose-500" },
				{ label: t("penaltyEfficiency"), value: `${pct(penaltySaves, penaltyTotal)}%`, detail: t("penaltiesSaved", { saves: penaltySaves, total: penaltyTotal }), tone: "bg-amber-500" },
				{ label: t("inferiorityEfficiency"), value: `${pct(inferiorityPrevented, inferiorityTotal)}%`, detail: t("preventedOfTotal", { prevented: inferiorityPrevented, total: inferiorityTotal }), tone: "bg-violet-500" }
			],
			distribution: [
				{ label: t("saves"), value: saves, color: "bg-blue-500" },
				{ label: t("goalsConceded"), value: conceded, color: "bg-rose-500" },
				{ label: t("otherPrevented"), value: inferiorityOut, color: "bg-violet-500" }
			],
			insight: t(pct(saves, shotsReceived) >= 50 ? "goalkeeperInsightPositive" : "goalkeeperInsightOpportunity", { efficiency: pct(saves, shotsReceived), shots: shotsReceived }),
			contributors
		};
	}, [phase, stats, hidden, t]);

	const distributionTotal = data.distribution.reduce((acc, item) => acc + item.value, 0);
	const maxScore = Math.max(...data.contributors.map((player) => Math.max(player.score, 0)), 1);
	const phaseIcon = phase === "attack" ? Target : phase === "defense" ? ShieldCheck : CircleGauge;
	const PhaseIcon = phaseIcon;

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{data.metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
				<Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card to-muted/20">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Activity className="h-4 w-4 text-primary" />
							{t("actionDistribution")}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{distributionTotal > 0 ? data.distribution.map((item) => <DistributionBar key={item.label} {...item} total={distributionTotal} />) : <p className="text-sm text-muted-foreground">{t("noPhaseData")}</p>}
						<div className="flex items-start gap-3 rounded-xl border bg-background/70 p-3">
							<PhaseIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("matchReading")}</p>
								<p className="mt-1 text-sm leading-relaxed">{data.insight}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-border/70">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Crown className="h-4 w-4 text-amber-500" />
							{t("topContributors")}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{data.contributors.length ? data.contributors.map((player, index) => {
							const positive = player.score > 0;
							const Indicator = positive ? ArrowUpRight : player.score < 0 ? ArrowDownRight : Minus;
							return (
								<div key={player.id} className="rounded-xl border bg-background/60 p-3">
									<div className="flex items-center justify-between gap-3">
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold">{index + 1}. {player.number != null ? `#${player.number} ` : ""}{player.name}</p>
											<p className="text-xs text-muted-foreground">{phase === "attack" ? t("goalsAndAssists", { primary: player.primary, secondary: player.secondary }) : phase === "defense" ? t("recoveriesAndBlocks", { primary: player.primary, secondary: player.secondary }) : t("savesAndConceded", { primary: player.primary, secondary: player.secondary })}</p>
										</div>
										<Badge variant="outline" className="gap-1 tabular-nums"><Indicator className="h-3 w-3" />{player.score > 0 ? "+" : ""}{player.score}</Badge>
									</div>
									<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, pct(Math.max(player.score, 0), maxScore))}%` }} /></div>
								</div>
							);
						}) : <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" />{t("noContributors")}</div>}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
