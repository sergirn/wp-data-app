"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { TrendingUp } from "lucide-react";

interface ManAdvantageChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

export function ManAdvantageChartExpandable({ matches, stats }: ManAdvantageChartProps) {
	const sortedMatches = useMemo(() => {
		return [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});
	}, [matches]);

	const matchData = useMemo(() => {
		const statsArr = Array.isArray(stats) ? stats : [];

		return sortedMatches.map((match: any, index: number) => {
			const ms = statsArr.filter((s: any) => String(s.match_id) === String(match.id));
			const totalGoals = ms.reduce((sum: number, s: any) => sum + (s.goles_hombre_mas || 0), 0);
			const totalPalo = ms.reduce((sum: number, s: any) => sum + (s.gol_del_palo_sup || 0), 0);
			const totalMisses = ms.reduce((sum: number, s: any) => sum + (s.tiros_hombre_mas || 0), 0);

			const totalGoalsH = totalGoals + totalPalo;
			const totalAttempts = totalGoalsH + totalMisses;
			const efficiency = totalAttempts > 0 ? Math.round(((totalGoalsH + totalPalo) / totalAttempts) * 100) : 0;

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				goles_normales: totalGoals,
				goles_palo: totalPalo,
				goles: totalGoalsH,
				fallos: totalMisses,
				total: totalAttempts,
				eficiencia: efficiency
			};
		});
	}, [sortedMatches, stats]);

	const chartData = useMemo(() => {
		return matchData.map((m, index) => {
			const prev = matchData.slice(0, index + 1);
			const avgEfficiency = prev.reduce((sum, x) => sum + x.eficiencia, 0) / (index + 1);

			return {
				matchId: m.matchId,
				jornada: m.jornada,
				rival: m.rival,
				fullDate: m.fullDate,
				goles: m.goles,
				fallos: m.fallos,
				eficienciaAcumulada: Number(avgEfficiency.toFixed(1)),
				total: m.total,
				eficiencia: m.eficiencia
			};
		});
	}, [matchData]);

	// totales / medias (para description + footer)
	const partidos = matchData.length;
	const totalGoalsH = matchData.reduce((sum, m) => sum + m.goles, 0);
	const totalMisses = matchData.reduce((sum, m) => sum + m.fallos, 0);
	const totalAttempts = totalGoalsH + totalMisses;
	const overallEfficiency = totalAttempts > 0 ? Math.round((totalGoalsH / totalAttempts) * 100) : 0;
	const avgGoalsPerMatch = partidos > 0 ? (totalGoalsH / partidos).toFixed(1) : "0.0";
	const avgMissesPerMatch = partidos > 0 ? (totalMisses / partidos).toFixed(1) : "0.0";
	const maxAttempts = Math.max(...matchData.map((m) => m.total), 1);

	const getEfficiencyColor = (eff: number) => {
		if (eff >= 60) return "bg-green-500";
		if (eff >= 40) return "bg-yellow-500";
		return "bg-red-500";
	};

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Eficiencia en Superioridad"
			description={`Últimos ${partidos} · Media: ${overallEfficiency}% · ${totalGoalsH}/${totalAttempts} intentos`}
			icon={<TrendingUp className="w-5 h-5" />}
			className="bg-gradient-to-br from-blue-500/5 to-cyan-500/15 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{overallEfficiency}%</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						goles: { label: "Goles", color: "hsla(0, 0%, 89%, 1.00)" },
						fallos: { label: "Fallos", color: "hsla(0, 76%, 50%, 1.00)" },
						eficienciaAcumulada: { label: "Eficiencia Acumulada %", color: "hsl(217 91% 60%)" }
					}}
					className={`w-full ${compact ? "h-[190px]" : "h-[420px]"}`}
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
											if (!p) return String(label);
											return `${label} · vs ${p.rival} · ${p.fullDate} · Efic: ${p.eficiencia}%`;
										}}
									/>
								}
							/>

							<Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

							<Bar yAxisId="left" dataKey="goles" name="Goles" fill="var(--color-goles)" radius={[4, 4, 0, 0]} />

							<Bar yAxisId="left" dataKey="fallos" name="Fallos" fill="var(--color-fallos)" radius={[4, 4, 0, 0]} />

							<Line
								yAxisId="right"
								type="monotone"
								dataKey="eficienciaAcumulada"
								name="Eficiencia Acumulada %"
								stroke="var(--color-eficienciaAcumulada)"
								strokeWidth={5}
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
							<Table className="min-w-[920px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Anotados</TableHead>
										<TableHead className="text-right">Fallados</TableHead>
										<TableHead className="text-right">Total</TableHead>
										<TableHead className="text-right">Eficiencia</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{matchData.map((m, idx) => {
										const pct = Math.round((m.total / maxAttempts) * 100);
										const dot = m.eficiencia >= 60 ? "bg-green-500" : m.eficiencia >= 40 ? "bg-yellow-500" : "bg-red-500";

										return (
											<TableRow
												key={m.matchId}
												className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
											>
												<TableCell className="font-semibold">
													<div className="flex items-center gap-2">
														<span className={`h-2 w-2 rounded-full ${dot}`} />
														{m.jornada}
													</div>
												</TableCell>

												<TableCell className="max-w-[360px]">
													<div className="min-w-0">
														<p className="font-medium truncate">{m.rival}</p>
														<p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
													</div>
												</TableCell>

												<TableCell className="text-right tabular-nums">
													<div className="flex flex-col items-end gap-1">
														<Badge className="bg-green-500 text-white hover:bg-green-500 tabular-nums">+{m.goles}</Badge>

														{(m.goles_normales > 0 || m.goles_palo > 0) && (
															<div className="text-[11px] text-muted-foreground leading-tight">
																{m.goles_normales > 0 && <span>G: {m.goles_normales}</span>}
																{m.goles_normales > 0 && m.goles_palo > 0 && <span className="mx-1">·</span>}
																{m.goles_palo > 0 && <span>Gol del palo: {m.goles_palo}</span>}
															</div>
														)}
													</div>
												</TableCell>

												<TableCell className="text-right tabular-nums">
													<Badge variant="destructive" className="tabular-nums">
														−{m.fallos}
													</Badge>
												</TableCell>

												<TableCell className="text-right tabular-nums">
													<div className="flex items-end justify-end gap-3">
														<Badge variant="secondary" className="tabular-nums">
															{m.total}
														</Badge>

														<div className="hidden md:block w-20">
															<div className="h-2 rounded-full bg-muted overflow-hidden">
																<div
																	className="h-2 rounded-full bg-blue-600 dark:bg-blue-400 transition-all"
																	style={{ width: `${pct}%` }}
																/>
															</div>
														</div>
													</div>
												</TableCell>

												<TableCell className="text-right">
													<Badge className={`${getEfficiencyColor(m.eficiencia)} text-white tabular-nums`}>
														{m.eficiencia}%
													</Badge>
												</TableCell>

												<TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>

					{/* ✅ footer igual que Goalkeeper */}
					<div className="border-t bg-muted/20 px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
							<span>
								<span className="font-medium text-foreground">{partidos}</span> partidos
							</span>

							<div className="flex flex-wrap gap-2">
								<span className="rounded-md border bg-card px-2 py-1">
									Anotados: <span className="font-semibold text-foreground">{totalGoalsH}</span>{" "}
									<span className="text-muted-foreground">({avgGoalsPerMatch}/p)</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Fallados: <span className="font-semibold text-foreground">{totalMisses}</span>{" "}
									<span className="text-muted-foreground">({avgMissesPerMatch}/p)</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Total: <span className="font-semibold text-foreground">{totalAttempts}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Media %: <span className="font-semibold text-foreground">{overallEfficiency}%</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
