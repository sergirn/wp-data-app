"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

interface DefenseFoulsByMatchChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

type FoulDef = {
	key: keyof MatchStats | string;
	dataKey: string;
	label: string;
	color: string;
};

const FOUL_DEFS: FoulDef[] = [
	{
		key: "faltas_exp_20_1c1",
		dataKey: "exp1c1",
		label: 'Exp 18" 1c1',
		color: "hsla(0, 84%, 60%, 1.00)"
	},
	{
		key: "faltas_exp_20_boya",
		dataKey: "expBoya",
		label: 'Exp 18" Boya',
		color: "hsla(25, 95%, 53%, 1.00)"
	},
	{
		key: "faltas_penalti",
		dataKey: "penalti",
		label: "Penalti",
		color: "hsla(330, 78%, 58%, 1.00)"
	},
	{
		key: "faltas_exp_simple",
		dataKey: "expSimple",
		label: "Exp simple",
		color: "hsla(270, 75%, 60%, 1.00)"
	},
	{
		key: "exp_trans_def",
		dataKey: "expTrans",
		label: "Exp trans.",
		color: "hsla(205, 90%, 55%, 1.00)"
	},
	{
		key: "faltas_exp_3_int",
		dataKey: "exp3Int",
		label: 'Exp 3" Int',
		color: "hsla(190, 95%, 45%, 1.00)"
	},
	{
		key: "faltas_exp_3_bruta",
		dataKey: "exp3Bruta",
		label: 'Exp 3" Bruta',
		color: "hsla(42, 96%, 55%, 1.00)"
	}
];

export function DefenseFoulsByMatchChart({ matches, stats, hiddenStats = [] }: DefenseFoulsByMatchChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const visibleDefs = useMemo(() => FOUL_DEFS.filter((def) => !hiddenSet.has(String(def.key))), [hiddenSet]);

	const matchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			return new Date(a?.match_date).getTime() - new Date(b?.match_date).getTime();
		});

		return sorted
			.map((match: any, index: number) => {
				const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

				const values = Object.fromEntries(
					FOUL_DEFS.map((def) => {
						const value = hiddenSet.has(String(def.key)) ? 0 : ms.reduce((sum: number, s: any) => sum + toNum(s[def.key]), 0);

						return [def.dataKey, value];
					})
				) as Record<string, number>;

				const total = visibleDefs.reduce((sum, def) => sum + toNum(values[def.dataKey]), 0);
				const jornadaNumber = match.jornada ?? index + 1;

				return {
					matchId: match.id,
					xLabel: `${match.id}-${index}`,
					jornada: `J${jornadaNumber}`,
					rival: match.opponent,
					fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
					...values,
					total
				};
			})
			.filter((row) => row.total > 0);
	}, [matches, stats, hiddenSet, visibleDefs]);

	const jornadaByXLabel = useMemo(() => {
		return new Map(matchData.map((item) => [item.xLabel, item.jornada]));
	}, [matchData]);

	const total = useMemo(() => matchData.reduce((sum, m) => sum + m.total, 0), [matchData]);

	const chartConfig = useMemo(() => {
		return Object.fromEntries(
			visibleDefs.map((def) => [
				def.dataKey,
				{
					label: def.label,
					color: def.color
				}
			])
		);
	}, [visibleDefs]);

	if (!visibleDefs.length || !matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Faltas defensivas por jornada"
			description={`Últimos ${matchData.length} · Total ${total}`}
			icon={<ShieldAlert className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{total}</span>}
			renderChart={({ compact }) => (
				<ChartContainer config={chartConfig} className={`w-full ${compact ? "h-[260px]" : "h-[340px] lg:h-[380px]"}`}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={matchData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
							<XAxis
								dataKey="xLabel"
								fontSize={12}
								tickMargin={8}
								axisLine={false}
								tickLine={false}
								interval="preserveStartEnd"
								minTickGap={18}
								tickFormatter={(value) => jornadaByXLabel.get(String(value)) ?? ""}
							/>
							<YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(_, payload) => {
											const p = payload?.[0]?.payload;
											return p ? `${p.jornada} · vs ${p.rival} · ${p.fullDate} · Total ${p.total}` : "";
										}}
									/>
								}
							/>
							<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

							{visibleDefs.map((def, index) => (
								<Bar
									key={def.dataKey}
									dataKey={def.dataKey}
									stackId="f"
									name={def.label}
									fill={`var(--color-${def.dataKey})`}
									radius={index === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
								/>
							))}
						</ComposedChart>
					</ResponsiveContainer>
				</ChartContainer>
			)}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[1180px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>

										{visibleDefs.map((def) => (
											<TableHead key={def.dataKey} className="text-right">
												{def.dataKey === "exp1c1"
													? "1c1"
													: def.dataKey === "expBoya"
														? "Boya"
														: def.dataKey === "penalti"
															? "Pen."
															: def.dataKey === "expSimple"
																? "Simple"
																: def.dataKey === "expTrans"
																	? "Trans."
																	: def.dataKey === "exp3Int"
																		? '3" Int'
																		: def.dataKey === "exp3Bruta"
																			? '3" Bruta'
																			: def.label}
											</TableHead>
										))}

										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>

											{visibleDefs.map((def) => (
												<TableCell key={def.dataKey} className="text-right tabular-nums">
													{toNum((m as Record<string, unknown>)[def.dataKey])}
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
