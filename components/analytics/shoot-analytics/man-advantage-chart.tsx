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

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

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

			const golesSup = ms.reduce((sum: number, s: any) => sum + toNum(s.goles_hombre_mas), 0);
			const golesPaloSup = ms.reduce((sum: number, s: any) => sum + toNum(s.gol_del_palo_sup), 0);
			const fallosSup = ms.reduce((sum: number, s: any) => sum + toNum(s.tiros_hombre_mas), 0);

			const golesTotales = golesSup + golesPaloSup;
			const intentosTotales = golesTotales + fallosSup;

			// corregido: antes se sumaba golesPaloSup dos veces
			const eficiencia = intentosTotales > 0 ? Math.round((golesTotales / intentosTotales) * 100) : 0;

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				golesSup,
				golesPaloSup,
				golesTotales,
				fallosSup,
				intentosTotales,
				eficiencia
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
				golesSup: m.golesSup,
				golesPaloSup: m.golesPaloSup,
				golesTotales: m.golesTotales,
				fallosSup: m.fallosSup,
				intentosTotales: m.intentosTotales,
				eficiencia: m.eficiencia,
				eficienciaAcumulada: Number(avgEfficiency.toFixed(1))
			};
		});
	}, [matchData]);

	const partidos = matchData.length;
	const totalGolesSup = matchData.reduce((sum, m) => sum + m.golesSup, 0);
	const totalPaloSup = matchData.reduce((sum, m) => sum + m.golesPaloSup, 0);
	const totalGoles = matchData.reduce((sum, m) => sum + m.golesTotales, 0);
	const totalFallos = matchData.reduce((sum, m) => sum + m.fallosSup, 0);
	const totalIntentos = totalGoles + totalFallos;

	const overallEfficiency = totalIntentos > 0 ? Math.round((totalGoles / totalIntentos) * 100) : 0;
	const avgGoalsPerMatch = partidos > 0 ? (totalGoles / partidos).toFixed(1) : "0.0";
	const avgMissesPerMatch = partidos > 0 ? (totalFallos / partidos).toFixed(1) : "0.0";
	const maxAttempts = Math.max(...matchData.map((m) => m.intentosTotales), 1);

	const getEfficiencyColor = (eff: number) => {
		if (eff >= 60) return "bg-emerald-500";
		if (eff >= 40) return "bg-amber-500";
		return "bg-rose-500";
	};

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Eficiencia en Superioridad"
			description={`Últimos ${partidos} · Media: ${overallEfficiency}% · ${totalGoles}/${totalIntentos} intentos`}
			icon={<TrendingUp className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{overallEfficiency}%</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						golesSup: { label: "Gol Sup.+", color: "hsla(145, 63%, 42%, 1.00)" },
						golesPaloSup: { label: "Gol del palo", color: "hsla(42, 96%, 55%, 1.00)" },
						fallosSup: { label: "Fallos Sup.+", color: "hsla(0, 84%, 60%, 1.00)" },
						eficiencia: { label: "Eficiencia %", color: "hsla(190, 95%, 45%, 1.00)" },
						eficienciaAcumulada: { label: "Eficiencia acumulada %", color: "hsla(221, 83%, 53%, 1.00)" }
					}}
					className={`w-full ${compact ? "h-[260px]" : "h-[360px] lg:h-[420px]"}`}
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
											return `${label} · vs ${p.rival} · ${p.fullDate}`;
										}}
									/>
								}
							/>

							<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

							<Bar
								yAxisId="left"
								dataKey="golesSup"
								name="Gol Sup.+"
								stackId="sup"
								fill="var(--color-golesSup)"
								radius={[4, 4, 0, 0]}
							/>

							<Bar
								yAxisId="left"
								dataKey="golesPaloSup"
								name="Gol del palo"
								stackId="sup"
								fill="var(--color-golesPaloSup)"
								radius={[4, 4, 0, 0]}
							/>

							<Bar yAxisId="left" dataKey="fallosSup" name="Fallos Sup.+" fill="var(--color-fallosSup)" radius={[4, 4, 0, 0]} />

							<Line
								yAxisId="right"
								type="monotone"
								dataKey="eficiencia"
								name="Eficiencia %"
								stroke="var(--color-eficiencia)"
								strokeWidth={2.5}
								dot={false}
								activeDot={{ r: 4 }}
							/>

							<Line
								yAxisId="right"
								type="monotone"
								dataKey="eficienciaAcumulada"
								name="Eficiencia acumulada %"
								stroke="var(--color-eficienciaAcumulada)"
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
							<Table className="min-w-[1040px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Gol Sup.+</TableHead>
										<TableHead className="text-right">Gol palo</TableHead>
										<TableHead className="text-right">Anotados</TableHead>
										<TableHead className="text-right">Fallados</TableHead>
										<TableHead className="text-right">Total</TableHead>
										<TableHead className="text-right">Eficiencia</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{matchData.map((m, idx) => {
										const pct = Math.round((m.intentosTotales / maxAttempts) * 100);
										const dot = m.eficiencia >= 60 ? "bg-emerald-500" : m.eficiencia >= 40 ? "bg-amber-500" : "bg-rose-500";

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
													<Badge className="bg-emerald-500 text-white hover:bg-emerald-500 tabular-nums">
														{m.golesSup}
													</Badge>
												</TableCell>

												<TableCell className="text-right tabular-nums">
													<Badge className="bg-amber-500 text-white hover:bg-amber-500 tabular-nums">
														{m.golesPaloSup}
													</Badge>
												</TableCell>

												<TableCell className="text-right tabular-nums">
													<Badge className="bg-cyan-600 text-white hover:bg-cyan-600 tabular-nums">{m.golesTotales}</Badge>
												</TableCell>

												<TableCell className="text-right tabular-nums">
													<Badge variant="destructive" className="tabular-nums">
														{m.fallosSup}
													</Badge>
												</TableCell>

												<TableCell className="text-right tabular-nums">
													<div className="flex items-end justify-end gap-3">
														<Badge variant="secondary" className="tabular-nums">
															{m.intentosTotales}
														</Badge>

														<div className="hidden md:block w-20">
															<div className="h-2 rounded-full bg-muted overflow-hidden">
																<div
																	className="h-2 rounded-full bg-cyan-500 transition-all"
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

					<div className="border-t bg-muted/20 px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
							<span>
								<span className="font-medium text-foreground">{partidos}</span> partidos
							</span>

							<div className="flex flex-wrap gap-2">
								<span className="rounded-md border bg-card px-2 py-1">
									Gol Sup.+: <span className="font-semibold text-foreground">{totalGolesSup}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Gol palo: <span className="font-semibold text-foreground">{totalPaloSup}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Anotados: <span className="font-semibold text-foreground">{totalGoles}</span>{" "}
									<span className="text-muted-foreground">({avgGoalsPerMatch}/p)</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Fallados: <span className="font-semibold text-foreground">{totalFallos}</span>{" "}
									<span className="text-muted-foreground">({avgMissesPerMatch}/p)</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Total: <span className="font-semibold text-foreground">{totalIntentos}</span>
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
