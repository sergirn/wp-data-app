"use client";

import React, { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import type { Match, MatchStats, Player } from "@/lib/types";

interface DefenseFoulsMixChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function DefenseFoulsMixChart({ matches, stats, hiddenStats = [] }: DefenseFoulsMixChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const isVisible = (key: string) => !hiddenSet.has(key);

	const visibleDefs = useMemo(
		() =>
			[
				{
					key: "exp1c1",
					statKey: "faltas_exp_20_1c1",
					label: 'Exp 18" 1c1',
					shortLabel: "1c1",
					color: "hsla(0, 84%, 60%, 1.00)"
				},
				{
					key: "expBoya",
					statKey: "faltas_exp_20_boya",
					label: 'Exp 18" Boya',
					shortLabel: "Boya",
					color: "hsla(25, 95%, 53%, 1.00)"
				},
				{
					key: "penalti",
					statKey: "faltas_penalti",
					label: "Penalti",
					shortLabel: "Pen.",
					color: "hsla(330, 78%, 58%, 1.00)"
				},
				{
					key: "expSimple",
					statKey: "faltas_exp_simple",
					label: "Exp simple",
					shortLabel: "Simple",
					color: "hsla(270, 75%, 60%, 1.00)"
				},
				{
					key: "expTrans",
					statKey: "exp_trans_def",
					label: "Exp trans.",
					shortLabel: "Trans.",
					color: "hsla(205, 90%, 55%, 1.00)"
				},
				{
					key: "contrafaltas",
					statKey: "faltas_contrafaltas",
					label: "Contrafaltas",
					shortLabel: "Contraf.",
					color: "hsla(145, 63%, 42%, 1.00)"
				},
				{
					key: "exp3Int",
					statKey: "faltas_exp_3_int",
					label: 'Exp 3" Int',
					shortLabel: '3" Int',
					color: "hsla(190, 95%, 45%, 1.00)"
				},
				{
					key: "exp3Bruta",
					statKey: "faltas_exp_3_bruta",
					label: 'Exp 3" Bruta',
					shortLabel: '3" Bruta',
					color: "hsla(42, 96%, 55%, 1.00)"
				}
			].filter((def) => isVisible(def.statKey)),
		[hiddenSet]
	);

	const summary = useMemo(() => {
		const all = stats ?? [];

		const parts = visibleDefs.map((def) => {
			const value = all.reduce((sum: number, s: any) => sum + toNum(s[def.statKey]), 0);
			return {
				key: def.key,
				statKey: def.statKey,
				label: def.label,
				shortLabel: def.shortLabel,
				value,
				color: def.color
			};
		});

		const total = parts.reduce((sum, p) => sum + p.value, 0);

		const partsWithPct = parts.map((p) => ({
			...p,
			pct: total > 0 ? (p.value / total) * 100 : 0
		}));

		const topType = [...partsWithPct].sort((a, b) => b.value - a.value)[0] ?? null;

		return {
			parts: partsWithPct,
			total,
			topType,
			totalMatches: (matches ?? []).length || 0
		};
	}, [matches, stats, visibleDefs]);

	const perMatch = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted
			.slice(-15)
			.map((match: any, idx: number) => {
				const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

				const values = Object.fromEntries(
					visibleDefs.map((def) => [def.key, ms.reduce((sum: number, s: any) => sum + toNum(s[def.statKey]), 0)])
				);

				const total = Object.values(values).reduce((sum: number, v: any) => sum + toNum(v), 0);
				const jornadaNumber = match.jornada ?? idx + 1;

				return {
					matchId: match.id,
					jornada: `J${jornadaNumber}`,
					rival: match.opponent,
					fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
					total,
					...values
				};
			})
			.filter((row) => row.total > 0);
	}, [matches, stats, visibleDefs]);

	const chartConfig = useMemo(() => {
		return Object.fromEntries(
			summary.parts.map((p) => [
				p.key,
				{
					label: p.label,
					color: p.color
				}
			])
		);
	}, [summary.parts]);

	if (!summary.totalMatches || !summary.parts.length || summary.total === 0) return null;

	return (
		<ExpandableChartCard
			title="Mix de faltas defensivas"
			description={`${summary.topType?.label ?? "Sin datos"} · Total ${summary.total}`}
			icon={<ShieldAlert className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{summary.topType?.label ?? "—"}</span>}
			renderChart={({ compact }) => {
				const outer = compact ? 88 : 108;
				const inner = compact ? 54 : 68;

				return (
					<div className="w-full h-full min-h-0 flex flex-col">
						<div className="space-y-3 sm:space-y-4 h-full min-h-0 flex flex-col">
							<ChartContainer config={chartConfig} className="w-full h-full min-h-0">
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
								className={`grid gap-1.5 sm:gap-2 ${
									summary.parts.length <= 2
										? "grid-cols-2"
										: summary.parts.length <= 4
											? "grid-cols-2 sm:grid-cols-4"
											: "grid-cols-2 sm:grid-cols-4"
								}`}
							>
								{summary.parts.map((p) => (
									<div key={p.key} className="rounded-md border px-2 py-2 text-center" style={{ backgroundColor: `${p.color}10` }}>
										<p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{p.label}</p>
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
							<Table className="min-w-[980px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										{visibleDefs.map((def) => (
											<TableHead key={def.key} className="text-right">
												{def.shortLabel}
											</TableHead>
										))}
										<TableHead className="text-right">Total</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>
								<TableBody>
									{perMatch.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>

											{visibleDefs.map((def) => (
												<TableCell key={def.key} className="text-right tabular-nums">
													{toNum((m as any)[def.key])}
												</TableCell>
											))}

											<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
											<TableCell className="text-right hidden lg:table-cell text-muted-foreground">{m.fullDate}</TableCell>
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
