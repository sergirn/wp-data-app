"use client";

import React, { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import type { Match, MatchStats, Player } from "@/lib/types";

interface DefenseInferiorityMixChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function DefenseInferiorityMixChart({ matches, stats }: DefenseInferiorityMixChartProps) {
	const summary = useMemo(() => {
		const all = stats ?? [];
		const fuera = all.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_fuera), 0);
		const bloqueo = all.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_bloqueo), 0);
		const total = fuera + bloqueo;
		const efic = total > 0 ? Math.round((bloqueo / total) * 100) : 0;

		const parts = [
			{ key: "fuera", label: "Fuera", value: fuera, pct: total > 0 ? (fuera / total) * 100 : 0, color: "hsla(0, 84%, 60%, 1.00)" },
			{ key: "bloqueo", label: "Bloqueo", value: bloqueo, pct: total > 0 ? (bloqueo / total) * 100 : 0, color: "hsla(145, 63%, 42%, 1.00)" }
		];

		return { parts, total, efic, totalMatches: (matches ?? []).length || 0 };
	}, [matches, stats]);

	const perMatch = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.slice(-15).map((match: any, idx: number) => {
			const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));
			const fuera = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_fuera), 0);
			const bloqueo = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_bloqueo), 0);
			const total = fuera + bloqueo;
			const efic = total > 0 ? Math.round((bloqueo / total) * 100) : 0;
			const jornadaNumber = match.jornada ?? idx + 1;

			return {
				matchId: match.id,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				fuera,
				bloqueo,
				total,
				efic
			};
		});
	}, [matches, stats]);

	if (!summary.totalMatches) return null;

	return (
		<ExpandableChartCard
			title="Mix de inferioridad"
			description={`Bloqueo ${summary.efic}% · Total ${summary.total}`}
			icon={<Shield className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{summary.efic}%</span>}
			renderChart={({ compact }) => {
				const outer = compact ? 88 : 108;
				const inner = compact ? 54 : 68;

				return (
					<div className="w-full h-full min-h-0 flex flex-col">
						<div className="space-y-3 sm:space-y-4 h-full min-h-0 flex flex-col">
							<ChartContainer
								config={{
									fuera: { label: "Fuera", color: summary.parts[0].color },
									bloqueo: { label: "Bloqueo", color: summary.parts[1].color }
								}}
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

							<div className="grid grid-cols-2 gap-2">
								{summary.parts.map((p) => (
									<div key={p.key} className="rounded-md border px-2 py-2 text-center" style={{ backgroundColor: `${p.color}10` }}>
										<p className="text-[11px] text-muted-foreground">{p.label}</p>
										<p className="text-base font-bold tabular-nums">{p.value}</p>
										<p className="text-[11px] text-muted-foreground">{Math.round(p.pct)}%</p>
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
							<Table className="min-w-[780px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Fuera</TableHead>
										<TableHead className="text-right">Bloqueo</TableHead>
										<TableHead className="text-right">Total</TableHead>
										<TableHead className="text-right">Efic.</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>
								<TableBody>
									{perMatch.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell className="text-right tabular-nums">{m.fuera}</TableCell>
											<TableCell className="text-right tabular-nums">{m.bloqueo}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.efic}%</TableCell>
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
