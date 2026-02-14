"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { ShieldCheck } from "lucide-react";

interface ManDownGoalkeeperChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function ManDownGoalkeeperChart({ matches, stats }: ManDownGoalkeeperChartProps) {
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

			// ✅ Hombre - (H-)
			const recibidos = ms.reduce((sum: number, s: any) => sum + n(s.portero_goles_hombre_menos), 0);
			const paradasHM = ms.reduce((sum: number, s: any) => sum + n(s.portero_paradas_hombre_menos), 0);
			const hmFuera = ms.reduce((sum: number, s: any) => sum + n(s.portero_inferioridad_fuera), 0);
			const hmBloq = ms.reduce((sum: number, s: any) => sum + n(s.portero_inferioridad_bloqueo), 0);

			// ✅ Evitados incluyen también fuera + bloqueos (como pediste)
			const evitados = paradasHM + hmFuera + hmBloq;

			// ✅ total tiros H- = todo lo que hay ahí (evitados + recibidos)
			const total = evitados + recibidos;

			// ✅ eficiencia H- = evitados / total
			const eficiencia = total > 0 ? Math.round((evitados / total) * 100) : 0;

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

				evitados,
				recibidos,
				total,
				eficiencia,
				balance: evitados - recibidos,

				// por si luego quieres mostrar desglose
				paradasHM,
				hmFuera,
				hmBloq
			};
		});
	}, [sortedMatches, stats]);

	const chartData = useMemo(() => {
		let accEvitados = 0;
		let accTotal = 0;

		return matchData.map((m) => {
			accEvitados += m.evitados;
			accTotal += m.total;

			const effAcc = accTotal > 0 ? (accEvitados / accTotal) * 100 : 0;

			return {
				matchId: m.matchId,
				jornada: m.jornada,
				rival: m.rival,
				fullDate: m.fullDate,

				evitados: m.evitados,
				recibidos: m.recibidos,
				eficienciaAcumulada: Number(effAcc.toFixed(1)),

				total: m.total,
				eficiencia: m.eficiencia,
				balance: m.balance
			};
		});
	}, [matchData]);

	// totales / medias
	const partidos = matchData.length;
	const totalEvitados = matchData.reduce((sum, m) => sum + m.evitados, 0);
	const totalRecibidos = matchData.reduce((sum, m) => sum + m.recibidos, 0);
	const totalShots = totalEvitados + totalRecibidos;

	const overallEfficiency = totalShots > 0 ? Math.round((totalEvitados / totalShots) * 100) : 0;

	const avgEvitadosPerMatch = partidos > 0 ? (totalEvitados / partidos).toFixed(1) : "0.0";
	const avgRecibidosPerMatch = partidos > 0 ? (totalRecibidos / partidos).toFixed(1) : "0.0";
	const maxTotalShots = Math.max(...matchData.map((m) => m.total), 1);

	const getEfficiencyColor = (eff: number) => {
		if (eff >= 50) return "bg-green-500";
		if (eff >= 30) return "bg-yellow-500";
		return "bg-red-500";
	};

	const getBalanceColor = (v: number) => (v >= 0 ? "bg-green-500" : "bg-red-500");

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Eficiencia en Inferioridad"
			description={`Últimos ${partidos} · Media: ${overallEfficiency}% · ${totalEvitados}/${totalShots} tiros`}
			icon={<ShieldCheck className="w-5 h-5" />}
			className="bg-gradient-to-br from-blue-500/5 to-cyan-500/15 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{overallEfficiency}%</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						evitados: { label: "Evitados", color: "hsla(56, 86%, 42%, 1.00)" },
						recibidos: { label: "Recibidos", color: "hsla(0, 76%, 50%, 1.00)" },
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

							<Bar yAxisId="left" dataKey="evitados" name="Evitados" fill="var(--color-evitados)" radius={[4, 4, 0, 0]} />
							<Bar yAxisId="left" dataKey="recibidos" name="Recibidos" fill="var(--color-recibidos)" radius={[4, 4, 0, 0]} />

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
							<Table className="min-w-[980px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Evitados</TableHead>
										<TableHead className="text-right">Recibidos</TableHead>
										<TableHead className="text-right">Total</TableHead>
										<TableHead className="text-right">Eficiencia</TableHead>
										<TableHead className="text-right">Balance</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{matchData.map((m, idx) => {
										const pct = Math.round((m.total / maxTotalShots) * 100);
										const dot = m.eficiencia >= 50 ? "bg-green-500" : m.eficiencia >= 30 ? "bg-yellow-500" : "bg-red-500";

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
													<Badge className="bg-green-500 text-white hover:bg-green-500 tabular-nums">+{m.evitados}</Badge>
												</TableCell>

												<TableCell className="text-right tabular-nums">
													<Badge variant="destructive" className="tabular-nums">
														−{m.recibidos}
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

												<TableCell className="text-right">
													<Badge className={`${getBalanceColor(m.balance)} text-white tabular-nums`}>
														{m.balance >= 0 ? "+" : ""}
														{m.balance}
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
									Evitados: <span className="font-semibold text-foreground">{totalEvitados}</span>{" "}
									<span className="text-muted-foreground">({avgEvitadosPerMatch}/p)</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Recibidos: <span className="font-semibold text-foreground">{totalRecibidos}</span>{" "}
									<span className="text-muted-foreground">({avgRecibidosPerMatch}/p)</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Total: <span className="font-semibold text-foreground">{totalShots}</span>
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
