"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Scale } from "lucide-react";

interface DefenseBalanceChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

type MetricDef = {
	key: keyof MatchStats | string;
	dataKey: string;
	label: string;
	color: string;
	group: "positive" | "negative";
};

const METRIC_DEFS: MetricDef[] = [
	{
		key: "acciones_bloqueo",
		dataKey: "bloqueos",
		label: "Bloq.",
		color: "hsla(221, 83%, 53%, 1.00)",
		group: "positive"
	},
	{
		key: "acciones_recuperacion",
		dataKey: "recuperaciones",
		label: "Recup.",
		color: "hsla(145, 63%, 42%, 1.00)",
		group: "positive"
	},
	{
		key: "acciones_rebote",
		dataKey: "rebotes",
		label: "Rebotes",
		color: "hsla(42, 96%, 55%, 1.00)",
		group: "positive"
	},
	{
		key: "acciones_recibir_gol",
		dataKey: "recibeGol",
		label: "Recibe gol",
		color: "hsla(0, 84%, 60%, 1.00)",
		group: "negative"
	}
];

export function DefenseBalanceChart({ matches, stats, hiddenStats = [] }: DefenseBalanceChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const visibleDefs = useMemo(() => METRIC_DEFS.filter((def) => !hiddenSet.has(String(def.key))), [hiddenSet]);

	const positiveDefs = useMemo(() => visibleDefs.filter((def) => def.group === "positive"), [visibleDefs]);

	const negativeDefs = useMemo(() => visibleDefs.filter((def) => def.group === "negative"), [visibleDefs]);

	const matchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted
			.slice(-15)
			.map((match: any, index: number) => {
				const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

				const values = Object.fromEntries(
					METRIC_DEFS.map((def) => {
						const value = hiddenSet.has(String(def.key)) ? 0 : ms.reduce((sum: number, s: any) => sum + toNum(s[def.key]), 0);

						return [def.dataKey, value];
					})
				) as Record<string, number>;

				const positivas = positiveDefs.reduce((sum, def) => sum + toNum(values[def.dataKey]), 0);
				const negativas = negativeDefs.reduce((sum, def) => sum + toNum(values[def.dataKey]), 0);
				const balance = positivas - negativas;
				const jornadaNumber = match.jornada ?? index + 1;

				return {
					matchId: match.id,
					jornada: `J${jornadaNumber}`,
					rival: match.opponent,
					fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
					...values,
					positivas,
					negativas,
					negativasView: -negativas,
					balance
				};
			})
			.filter((row) => row.positivas > 0 || row.negativas > 0);
	}, [matches, stats, hiddenSet, positiveDefs, negativeDefs]);

	const totalPos = useMemo(() => matchData.reduce((sum, m) => sum + m.positivas, 0), [matchData]);
	const totalNeg = useMemo(() => matchData.reduce((sum, m) => sum + m.negativas, 0), [matchData]);
	const totalBal = totalPos - totalNeg;

	const chartConfig = useMemo(() => {
		const base = Object.fromEntries(
			visibleDefs.map((def) => [
				def.dataKey,
				{
					label: def.label,
					color: def.color
				}
			])
		);

		return {
			...base,
			positivas: { label: "Positivas", color: "hsla(145, 63%, 42%, 1.00)" },
			negativasView: { label: "Negativas", color: "hsla(0, 84%, 60%, 1.00)" },
			balance: { label: "Balance", color: "hsla(221, 83%, 53%, 1.00)" }
		};
	}, [visibleDefs]);

	if (!visibleDefs.length || !matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Balance defensivo"
			description={`Positivas ${totalPos} · Negativas ${totalNeg} · Balance ${totalBal >= 0 ? "+" : ""}${totalBal}`}
			icon={<Scale className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={
				<span className="text-xs text-muted-foreground">
					{totalBal >= 0 ? "+" : ""}
					{totalBal}
				</span>
			}
			renderChart={({ compact }) => (
				<ChartContainer config={chartConfig} className={`w-full ${compact ? "h-[260px]" : "h-[340px] lg:h-[380px]"}`}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={matchData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
							<XAxis
								dataKey="jornada"
								fontSize={12}
								tickMargin={8}
								axisLine={false}
								tickLine={false}
								interval="preserveStartEnd"
								minTickGap={18}
							/>
							<YAxis fontSize={12} width={38} tickMargin={6} axisLine={false} tickLine={false} />
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(label, payload) => {
											const p = payload?.[0]?.payload;
											return p
												? `${label} · vs ${p.rival} · ${p.fullDate} · ${p.balance >= 0 ? "+" : ""}${p.balance}`
												: String(label);
										}}
									/>
								}
							/>
							<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

							<Bar dataKey="positivas" name="Positivas" fill="var(--color-positivas)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="negativasView" name="Negativas" fill="var(--color-negativasView)" radius={[4, 4, 0, 0]} />
							<Line
								type="monotone"
								dataKey="balance"
								name="Balance"
								stroke="var(--color-balance)"
								strokeWidth={3}
								dot={false}
								activeDot={{ r: 4 }}
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</ChartContainer>
			)}
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
											<TableHead key={def.dataKey} className="text-right">
												{def.label}
											</TableHead>
										))}

										<TableHead className="text-right">Balance</TableHead>
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

											<TableCell className="text-right">
												<Badge
													className={`${m.balance >= 0 ? "bg-emerald-500 hover:bg-emerald-500" : "bg-rose-500 hover:bg-rose-500"} text-white`}
												>
													{m.balance >= 0 ? "+" : ""}
													{m.balance}
												</Badge>
											</TableCell>
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
