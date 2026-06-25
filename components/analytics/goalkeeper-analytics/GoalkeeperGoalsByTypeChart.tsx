"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { ShieldX } from "lucide-react";

interface GoalkeeperGoalsByTypeChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const GOAL_DEFS = [
	{
		key: "boya",
		statKey: "portero_goles_boya_parada",
		label: "Boya",
		shortLabel: "Boya",
		color: "hsla(145, 63%, 42%, 1.00)"
	},
	{
		key: "hm",
		statKey: "portero_goles_hombre_menos",
		label: "Inferioridad",
		shortLabel: "Inf.",
		color: "hsla(42, 96%, 55%, 1.00)"
	},
	{
		key: "dir",
		statKey: "portero_goles_dir_mas_5m",
		label: "Dir +6m",
		shortLabel: "Dir +6m",
		color: "hsla(221, 83%, 53%, 1.00)"
	},
	{
		key: "contra",
		statKey: "portero_goles_contraataque",
		label: "Contraataque",
		shortLabel: "Contra",
		color: "hsla(190, 95%, 45%, 1.00)"
	},
	{
		key: "penalti",
		statKey: "portero_goles_penalti",
		label: "Penalti",
		shortLabel: "Pen.",
		color: "hsla(330, 78%, 58%, 1.00)"
	},
	{
		key: "lanz",
		statKey: "portero_goles_lanzamiento",
		label: "Lanzamiento",
		shortLabel: "Lanz.",
		color: "hsla(0, 84%, 60%, 1.00)"
	},
	{
		key: "palo",
		statKey: "portero_gol_palo",
		label: "Palo",
		shortLabel: "Palo",
		color: "hsla(270, 75%, 60%, 1.00)"
	}
] as const;

export function GoalkeeperGoalsByTypeChart({ matches, stats, hiddenStats = [] }: GoalkeeperGoalsByTypeChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const visibleDefs = useMemo(() => {
		return GOAL_DEFS.filter((def) => !hiddenSet.has(def.statKey));
	}, [hiddenSet]);

	const chartConfig = useMemo(() => {
		return Object.fromEntries(
			visibleDefs.map((def) => [
				def.key,
				{
					label: def.label,
					color: def.color
				}
			])
		);
	}, [visibleDefs]);

	const allMatchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			return new Date(a?.match_date).getTime() - new Date(b?.match_date).getTime();
		});

		return sorted
			.map((match: any, index: number) => {
				const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

				const values = Object.fromEntries(
					GOAL_DEFS.map((def) => {
						const value = hiddenSet.has(def.statKey) ? 0 : ms.reduce((sum: number, s: any) => sum + toNum(s?.[def.statKey]), 0);

						return [def.key, value];
					})
				) as Record<string, number>;

				const total = visibleDefs.reduce((acc, def) => acc + toNum(values[def.key]), 0);
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

	const compactMatchData = useMemo(() => {
		return allMatchData.slice(-15);
	}, [allMatchData]);

	const total = useMemo(() => {
		return allMatchData.reduce((sum, m) => sum + m.total, 0);
	}, [allMatchData]);

	if (!visibleDefs.length || !allMatchData.length) return null;

	return (
		<ExpandableChartCard
			title="Goles recibidos por tipo"
			description={`Jornadas registradas ${allMatchData.length} · Total ${total}`}
			icon={<ShieldX className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{total}</span>}
			renderChart={({ compact }) => {
				const data = compact ? compactMatchData : allMatchData;
				const jornadaByXLabel = new Map(data.map((item) => [item.xLabel, item.jornada]));

				return (
					<ChartContainer config={chartConfig} className="w-full h-full">
						<ResponsiveContainer width="100%" height="100%">
							<ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
										key={def.key}
										dataKey={def.key}
										name={def.label}
										stackId="g"
										fill={`var(--color-${def.key})`}
										radius={index === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
									/>
								))}
							</ComposedChart>
						</ResponsiveContainer>
					</ChartContainer>
				);
			}}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[1200px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead>Fecha</TableHead>

										{visibleDefs.map((def) => (
											<TableHead key={def.key} className="text-right">
												{def.shortLabel}
											</TableHead>
										))}

										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{allMatchData.map((m, idx) => (
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
