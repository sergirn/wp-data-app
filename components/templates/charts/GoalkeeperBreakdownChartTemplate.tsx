"use client";

import React from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

type BreakdownPart = {
	key: string;
	label: string;
	value: number;
	pct: number;
	color: string;
};

type BreakdownSummary = {
	parts: BreakdownPart[];
	total: number;
	topType: BreakdownPart | null;
};

type BreakdownPlayerRow = {
	playerId: number;
	player: { id: number; name: string; number?: number | null; photo_url?: string | null } | null;
	total: number;
	[key: string]: any;
};

type Props = {
	title?: string;
	description?: string;
	icon?: React.ReactNode;
	summary: BreakdownSummary;
	perPlayer: BreakdownPlayerRow[];
	topLineCompact?: string;
	topLineFull?: string;
	rightHeader?: React.ReactNode;
};

const fmtPct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;

export function GoalkeeperBreakdownChartBase({ title, description, icon, summary, perPlayer, topLineCompact, topLineFull, rightHeader }: Props) {
	if (!summary?.total) return null;

	const resolvedTopLineCompact = topLineCompact ?? "Sin datos";
	const resolvedTopLineFull = topLineFull ?? "Sin datos";

	return (
		<ExpandableChartCard
			title={title ?? "Distribución"}
			description={description ?? `${summary.topType?.label ?? "Sin datos"} · ${resolvedTopLineCompact}`}
			icon={icon}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={rightHeader ?? <span className="text-xs text-muted-foreground">{summary.topType?.label ?? "—"}</span>}
			renderChart={({ compact }) => {
				const outer = compact ? 88 : 108;
				const inner = compact ? 54 : 68;

				const chartConfig = Object.fromEntries(
					summary.parts.map((p) => [
						p.key,
						{
							label: p.label,
							color: p.color
						}
					])
				);

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
													const v = Number(value) || 0;
													const pctValue = summary.total > 0 ? (v / summary.total) * 100 : 0;
													return [`${v} (${pctValue.toFixed(1)}%)`, props?.payload?.label ?? ""];
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
											<span className="font-medium text-foreground">{p.label}</span>{" "}
											<span className="tabular-nums">{fmtPct(p.pct)}</span>
										</span>
									</div>
								))}
							</div>

							<div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-3">
								{summary.parts.map((p) => (
									<div
										key={p.key}
										className="rounded-md border px-2 py-2 text-center"
										style={{ backgroundColor: `${p.color}10` }}
										title={p.label}
									>
										<p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{p.label}</p>
										<p className="text-sm sm:text-base font-bold tabular-nums leading-tight">{p.value}</p>
										<p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
											{summary.total ? Math.round((p.value / summary.total) * 100) : 0}%
										</p>
									</div>
								))}
							</div>

							{!compact ? (
								<div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
									<span className="font-medium text-foreground">{resolvedTopLineFull}</span>
								</div>
							) : null}
						</div>
					</div>
				);
			}}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<Table className="min-w-[820px]">
							<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
								<TableRow className="hover:bg-transparent">
									<TableHead>Jugador</TableHead>
									{summary.parts.map((p) => (
										<TableHead key={p.key} className="text-right">
											{p.label}
										</TableHead>
									))}
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</UITableHeader>

							<TableBody>
								{perPlayer.map((r, idx) => (
									<TableRow key={r.playerId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
										<TableCell className="font-medium">
											{r.player ? `${r.player.number != null ? `#${r.player.number} ` : ""}${r.player.name}` : `#${r.playerId}`}
										</TableCell>

										{summary.parts.map((p) => (
											<TableCell key={p.key} className="text-right tabular-nums">
												{r[p.key] ?? 0}
											</TableCell>
										))}

										<TableCell className="text-right tabular-nums font-semibold">{r.total}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
						Total: <span className="font-semibold text-foreground tabular-nums">{summary.total}</span>
					</div>
				</div>
			)}
		/>
	);
}
