"use client";

import React, { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { ShieldX } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import type { Match, MatchStats, Player } from "@/lib/types";

interface GoalkeeperGoalsMixChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

type GoalPartDef = {
	key: "boya" | "hm" | "dir" | "contra" | "penalti" | "lanz" | "palo";
	label: string;
	statKey: string;
	color: string;
};

const GOAL_PART_DEFS: GoalPartDef[] = [
	{
		key: "boya",
		label: "Boya",
		statKey: "portero_goles_boya_parada",
		color: "hsla(145, 63%, 42%, 1.00)"
	},
	{
		key: "hm",
		label: "Inferioridad",
		statKey: "portero_goles_hombre_menos",
		color: "hsla(42, 96%, 55%, 1.00)"
	},
	{
		key: "dir",
		label: "Dir +6m",
		statKey: "portero_goles_dir_mas_5m",
		color: "hsla(221, 83%, 53%, 1.00)"
	},
	{
		key: "contra",
		label: "Contraataque",
		statKey: "portero_goles_contraataque",
		color: "hsla(190, 95%, 45%, 1.00)"
	},
	{
		key: "penalti",
		label: "Penalti",
		statKey: "portero_goles_penalti",
		color: "hsla(330, 78%, 58%, 1.00)"
	},
	{
		key: "lanz",
		label: "Lanzamiento",
		statKey: "portero_goles_lanzamiento",
		color: "hsla(0, 84%, 60%, 1.00)"
	},
	{
		key: "palo",
		label: "Palo",
		statKey: "portero_gol_palo",
		color: "hsla(270, 75%, 60%, 1.00)"
	}
];

export function GoalkeeperGoalsMixChart({ matches, stats, hiddenStats = [] }: GoalkeeperGoalsMixChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const visibleDefs = useMemo(() => GOAL_PART_DEFS.filter((def) => !hiddenSet.has(def.statKey)), [hiddenSet]);

	const summary = useMemo(() => {
		const all = stats ?? [];

		const rawValues = Object.fromEntries(
			GOAL_PART_DEFS.map((def) => [
				def.key,
				hiddenSet.has(def.statKey) ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s?.[def.statKey]), 0)
			])
		) as Record<GoalPartDef["key"], number>;

		const total = Object.values(rawValues).reduce((sum, v) => sum + v, 0);
		const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

		const parts = GOAL_PART_DEFS.filter((def) => !hiddenSet.has(def.statKey)).map((def) => ({
			key: def.key,
			label: def.label,
			value: rawValues[def.key],
			pct: pct(rawValues[def.key]),
			color: def.color
		}));

		const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

		return { parts, total, topType, totalMatches: (matches ?? []).length || 0 };
	}, [matches, stats, hiddenSet]);

	const perMatch = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted
			.map((match: any, idx: number) => {
				const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

				const values = Object.fromEntries(
					GOAL_PART_DEFS.map((def) => [
						def.key,
						hiddenSet.has(def.statKey) ? 0 : ms.reduce((sum: number, s: any) => sum + toNum(s?.[def.statKey]), 0)
					])
				) as Record<GoalPartDef["key"], number>;

				const jornadaNumber = match.jornada ?? idx + 1;
				const total = Object.values(values).reduce((sum, v) => sum + v, 0);

				return {
					matchId: match.id,
					jornada: `J${jornadaNumber}`,
					rival: match.opponent,
					fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
					...values,
					total
				};
			})
			.filter((row) => row.total > 0);
	}, [matches, stats, hiddenSet]);

	if (!summary.totalMatches || visibleDefs.length === 0 || summary.total === 0) return null;

	return (
		<ExpandableChartCard
			title="Mix de goles recibidos"
			description={`${summary.topType?.label ?? "Sin datos"} · Total ${summary.total}`}
			icon={<ShieldX className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{summary.topType?.label ?? "—"}</span>}
			renderChart={({ compact }) => {
				const outer = compact ? 88 : 108;
				const inner = compact ? 54 : 68;

				return (
					<div className="w-full h-full min-h-0 flex flex-col">
						<div className="space-y-3 sm:space-y-4 h-full min-h-0 flex flex-col">
							<ChartContainer
								config={Object.fromEntries(summary.parts.map((p) => [p.key, { label: p.label, color: p.color }]))}
								className="w-full h-full min-h-0"
							>
								<div className="w-full h-full min-h-[240px] sm:min-h-[260px] lg:min-h-[300px] flex-1">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
											<Pie
												data={summary.parts}
												dataKey="value"
												nameKey="label"
												innerRadius={inner}
												outerRadius={outer}
												paddingAngle={2}
												stroke="none"
												isAnimationActive={false}
												cx="50%"
												cy="50%"
											>
												{summary.parts.map((p) => (
													<Cell key={p.key} fill={p.color} />
												))}
											</Pie>

											<RechartsTooltip
												formatter={(value: any, _name: any, props: any) => {
													const v = toNum(value);
													const pct = summary.total > 0 ? (v / summary.total) * 100 : 0;
													return [`${v} (${pct.toFixed(1)}%)`, props?.payload?.label ?? ""];
												}}
												labelFormatter={() => ""}
											/>
										</PieChart>
									</ResponsiveContainer>
								</div>
							</ChartContainer>

							<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
								{summary.parts.map((p) => (
									<div key={p.key} className="inline-flex items-center gap-2">
										<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
										<span className="whitespace-nowrap">
											<span className="font-medium text-foreground">{p.label}</span>
										</span>
									</div>
								))}
							</div>

							<div
								className={`grid gap-1.5 sm:gap-2 ${summary.parts.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}
							>
								{summary.parts.map((p) => (
									<div key={p.key} className="rounded-md border px-2 py-2 text-center" style={{ backgroundColor: `${p.color}10` }}>
										<p className="text-[10px] sm:text-[12px] text-muted-foreground truncate">{p.label}</p>
										<p className="text-sm sm:text-base font-bold tabular-nums">{p.value}</p>
										<p className="text-[10px] sm:text-[12px] text-muted-foreground">{Math.round(p.pct)}%</p>
									</div>
								))}
							</div>
						</div>
					</div>
				);
			}}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[1180px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead>Fecha</TableHead>

										{visibleDefs.map((def) => (
											<TableHead key={def.key} className="text-right">
												{def.label}
											</TableHead>
										))}

										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{perMatch.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell>{m.fullDate}</TableCell>

											{visibleDefs.map((def) => (
												<TableCell key={def.key} className="text-right tabular-nums">
													{toNum((m as Record<string, unknown>)[def.key])}
												</TableCell>
											))}

											<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
