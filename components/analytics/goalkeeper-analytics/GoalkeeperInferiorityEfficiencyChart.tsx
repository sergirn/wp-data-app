"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Shield } from "lucide-react";

interface GoalkeeperInferiorityEfficiencyChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function GoalkeeperInferiorityEfficiencyChart({ matches, stats }: GoalkeeperInferiorityEfficiencyChartProps) {
	const matchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.slice(-15).map((match: any, idx: number) => {
			const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

			const golesRecibidos =
				ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_hombre_menos), 0) +
				ms.reduce((sum: number, s: any) => sum + toNum(s.portero_gol_palo), 0);

			const paradasInf = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_paradas_hombre_menos), 0);
			const fueraInf = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_fuera), 0);

			const evitados = paradasInf + fueraInf;
			const totalAcciones = golesRecibidos + evitados;
			const eficacia = totalAcciones > 0 ? Math.round((evitados / totalAcciones) * 100) : 0;

			const jornadaNumber = match.jornada ?? idx + 1;

			return {
				matchId: match.id,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				golesRecibidos,
				paradasInf,
				fueraInf,
				evitados,
				totalAcciones,
				eficacia
			};
		});
	}, [matches, stats]);

	const chartData = useMemo(() => {
		return matchData.map((m, index) => {
			const prev = matchData.slice(0, index + 1);
			const avg = prev.reduce((sum, x) => sum + x.eficacia, 0) / (index + 1);

			return {
				...m,
				eficaciaAcum: Number(avg.toFixed(1))
			};
		});
	}, [matchData]);

	const totalGC = matchData.reduce((sum, m) => sum + m.golesRecibidos, 0);
	const totalEvitados = matchData.reduce((sum, m) => sum + m.evitados, 0);
	const totalAcciones = totalGC + totalEvitados;
	const overall = totalAcciones > 0 ? Math.round((totalEvitados / totalAcciones) * 100) : 0;

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Inferioridad: recibidos vs evitados"
			description={`Últimos ${matchData.length} · Evitados ${overall}% · ${totalEvitados}/${totalAcciones}`}
			icon={<Shield className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{overall}%</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						golesRecibidos: { label: "Goles recibidos", color: "hsla(0, 84%, 60%, 1.00)" },
						paradasInf: { label: "Paradas Inf.-", color: "hsla(145, 63%, 42%, 1.00)" },
						fueraInf: { label: "Fuera Inf.-", color: "hsla(42, 96%, 55%, 1.00)" },
						eficacia: { label: "Evitados %", color: "hsla(190, 95%, 45%, 1.00)" },
						eficaciaAcum: { label: "Evitados acum. %", color: "hsla(221, 83%, 53%, 1.00)" }
					}}
					className="w-full h-full"
				>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
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
							<YAxis yAxisId="left" fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />
							<YAxis
								yAxisId="right"
								orientation="right"
								domain={[0, 100]}
								fontSize={12}
								width={40}
								tickMargin={6}
								axisLine={false}
								tickLine={false}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(label, payload) => {
											const p = payload?.[0]?.payload;
											return p ? `${label} · vs ${p.rival} · ${p.fullDate} · ${p.eficacia}%` : String(label);
										}}
									/>
								}
							/>
							<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />
							<Bar yAxisId="left" dataKey="golesRecibidos" fill="var(--color-golesRecibidos)" radius={[4, 4, 0, 0]} />
							<Bar yAxisId="left" dataKey="paradasInf" fill="var(--color-paradasInf)" radius={[4, 4, 0, 0]} />
							<Bar yAxisId="left" dataKey="fueraInf" fill="var(--color-fueraInf)" radius={[4, 4, 0, 0]} />
							<Line
								yAxisId="right"
								type="monotone"
								dataKey="eficacia"
								stroke="var(--color-eficacia)"
								strokeWidth={2.5}
								dot={false}
								activeDot={{ r: 4 }}
							/>
							<Line
								yAxisId="right"
								type="monotone"
								dataKey="eficaciaAcum"
								stroke="var(--color-eficaciaAcum)"
								strokeWidth={3.5}
								strokeDasharray="6 4"
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
							<Table className="min-w-[940px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Recibidos</TableHead>
										<TableHead className="text-right">Paradas</TableHead>
										<TableHead className="text-right">Fuera</TableHead>
										<TableHead className="text-right">Evitados</TableHead>
										<TableHead className="text-right">Efic.</TableHead>
									</TableRow>
								</UITableHeader>
								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.golesRecibidos}</TableCell>
											<TableCell className="text-right tabular-nums">{m.paradasInf}</TableCell>
											<TableCell className="text-right tabular-nums">{m.fueraInf}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.evitados}</TableCell>
											<TableCell className="text-right">
												<Badge
													className={`${m.eficacia >= 60 ? "bg-emerald-500 hover:bg-emerald-500" : m.eficacia >= 40 ? "bg-amber-500 hover:bg-amber-500" : "bg-rose-500 hover:bg-rose-500"} text-white`}
												>
													{m.eficacia}%
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
