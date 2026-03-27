"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Shield } from "lucide-react";

interface DefenseInferiorityEfficiencyChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function DefenseInferiorityEfficiencyChart({ matches, stats, hiddenStats = [] }: DefenseInferiorityEfficiencyChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const showGolesInf = !hiddenSet.has("portero_goles_hombre_menos");
	const showGolPaloInf = !hiddenSet.has("portero_gol_palo");
	const showParadasInf = !hiddenSet.has("portero_paradas_hombre_menos");
	const showParadaFueraInf = !hiddenSet.has("portero_parada_fuera_inf");
	const showLanzPaloInf = !hiddenSet.has("portero_lanz_palo_inf");
	const showFueraInf = !hiddenSet.has("portero_inferioridad_fuera");
	const showBloqueoInf = !hiddenSet.has("portero_inferioridad_bloqueo");

	const hasVisibleInferiorityStats =
		showGolesInf || showGolPaloInf || showParadasInf || showParadaFueraInf || showLanzPaloInf || showFueraInf || showBloqueoInf;

	const allMatchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			return new Date(a?.match_date).getTime() - new Date(b?.match_date).getTime();
		});

		return sorted
			.map((match: any, idx: number) => {
				const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

				const golesInf = showGolesInf ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_hombre_menos), 0) : 0;
				const golPaloInf = showGolPaloInf ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_gol_palo), 0) : 0;

				const golesRecibidos = golesInf + golPaloInf;

				const paradasInf = showParadasInf ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_paradas_hombre_menos), 0) : 0;
				const paradaFueraInf = showParadaFueraInf ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_parada_fuera_inf), 0) : 0;
				const lanzPaloInf = showLanzPaloInf ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_lanz_palo_inf), 0) : 0;
				const fueraInf = showFueraInf ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_fuera), 0) : 0;
				const bloqueoInf = showBloqueoInf ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_bloqueo), 0) : 0;

				const evitados = paradasInf + paradaFueraInf + lanzPaloInf + fueraInf + bloqueoInf;
				const totalAcciones = golesRecibidos + evitados;
				const efic = totalAcciones > 0 ? Math.round((evitados / totalAcciones) * 100) : 0;

				const jornadaNumber = match.jornada ?? idx + 1;

				return {
					matchId: match.id,
					xLabel: `${match.id}-${idx}`,
					jornada: `J${jornadaNumber}`,
					rival: match.opponent,
					fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

					golesInf,
					golPaloInf,
					golesRecibidos,

					paradasInf,
					paradaFueraInf,
					lanzPaloInf,
					fueraInf,
					bloqueoInf,

					evitados,
					totalAcciones,
					efic
				};
			})
			.filter((row) => row.totalAcciones > 0);
	}, [matches, stats, showGolesInf, showGolPaloInf, showParadasInf, showParadaFueraInf, showLanzPaloInf, showFueraInf, showBloqueoInf]);

	const compactMatchData = useMemo(() => allMatchData.slice(-15), [allMatchData]);

	const buildChartData = (data: typeof allMatchData) =>
		data.map((m, index) => {
			const prev = data.slice(0, index + 1);
			const avg = prev.reduce((sum, x) => sum + x.efic, 0) / (index + 1);

			return {
				...m,
				eficAcum: Number(avg.toFixed(1))
			};
		});

	const allChartData = useMemo(() => buildChartData(allMatchData), [allMatchData]);
	const compactChartData = useMemo(() => buildChartData(compactMatchData), [compactMatchData]);

	const totalGolesInf = allMatchData.reduce((sum, m) => sum + m.golesInf, 0);
	const totalGolPaloInf = allMatchData.reduce((sum, m) => sum + m.golPaloInf, 0);
	const totalGolesRecibidos = allMatchData.reduce((sum, m) => sum + m.golesRecibidos, 0);
	const totalParadas = allMatchData.reduce((sum, m) => sum + m.paradasInf, 0);
	const totalParadaFueraInf = allMatchData.reduce((sum, m) => sum + m.paradaFueraInf, 0);
	const totalLanzPaloInf = allMatchData.reduce((sum, m) => sum + m.lanzPaloInf, 0);
	const totalFuera = allMatchData.reduce((sum, m) => sum + m.fueraInf, 0);
	const totalBloqueo = allMatchData.reduce((sum, m) => sum + m.bloqueoInf, 0);

	const totalEvitados = allMatchData.reduce((sum, m) => sum + m.evitados, 0);
	const totalAcciones = allMatchData.reduce((sum, m) => sum + m.totalAcciones, 0);
	const overall = totalAcciones > 0 ? Math.round((totalEvitados / totalAcciones) * 100) : 0;

	const chartConfig = useMemo(() => {
		const entries: Record<string, { label: string; color: string }> = {};

		if (showGolesInf || showGolPaloInf) {
			entries.golesRecibidos = { label: "Goles recibidos", color: "hsla(0, 84%, 60%, 1.00)" };
		}
		if (showParadasInf) {
			entries.paradasInf = { label: "Paradas Inf.-", color: "hsla(145, 63%, 42%, 1.00)" };
		}
		if (showParadaFueraInf) {
			entries.paradaFueraInf = { label: "Parada corner Inf.-", color: "hsla(160, 70%, 38%, 1.00)" };
		}
		if (showLanzPaloInf) {
			entries.lanzPaloInf = { label: "Palo Inf.-", color: "hsla(280, 70%, 52%, 1.00)" };
		}
		if (showFueraInf) {
			entries.fueraInf = { label: "Fuera Inf.-", color: "hsla(42, 96%, 55%, 1.00)" };
		}
		if (showBloqueoInf) {
			entries.bloqueoInf = { label: "Bloqueo Inf.-", color: "hsla(221, 83%, 53%, 1.00)" };
		}

		entries.efic = { label: "Evitados %", color: "hsla(190, 95%, 45%, 1.00)" };
		entries.eficAcum = { label: "Evitados acum. %", color: "hsla(221, 83%, 53%, 1.00)" };

		return entries;
	}, [showGolesInf, showGolPaloInf, showParadasInf, showParadaFueraInf, showLanzPaloInf, showFueraInf, showBloqueoInf]);

	if (!hasVisibleInferiorityStats || !allMatchData.length) return null;

	return (
		<ExpandableChartCard
			title="Inferioridad: recibidos vs evitados"
			description={`Jornadas registradas ${allMatchData.length} · Evitados ${overall}% · ${totalEvitados}/${totalAcciones}`}
			icon={<Shield className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{overall}%</span>}
			renderChart={({ compact }) => {
				const chartData = compact ? compactChartData : allChartData;
				const jornadaByXLabel = new Map(chartData.map((item) => [item.xLabel, item.jornada]));

				return (
					<ChartContainer config={chartConfig} className={`w-full ${compact ? "h-[260px]" : "h-[340px] lg:h-[380px]"}`}>
						<ResponsiveContainer width="100%" height="100%">
							<ComposedChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
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
											labelFormatter={(_, payload) => {
												const p = payload?.[0]?.payload;
												return p ? `${p.jornada} · vs ${p.rival} · ${p.fullDate} · Evitados ${p.efic}%` : "";
											}}
										/>
									}
								/>

								<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

								{(showGolesInf || showGolPaloInf) && (
									<Bar
										yAxisId="left"
										dataKey="golesRecibidos"
										name="Goles recibidos"
										fill="var(--color-golesRecibidos)"
										radius={[4, 4, 0, 0]}
									/>
								)}

								{showParadasInf && (
									<Bar
										yAxisId="left"
										dataKey="paradasInf"
										name="Paradas Inf.-"
										fill="var(--color-paradasInf)"
										radius={[4, 4, 0, 0]}
									/>
								)}

								{showParadaFueraInf && (
									<Bar
										yAxisId="left"
										dataKey="paradaFueraInf"
										name="Parada corner Inf.-"
										fill="var(--color-paradaFueraInf)"
										radius={[4, 4, 0, 0]}
									/>
								)}

								{showLanzPaloInf && (
									<Bar
										yAxisId="left"
										dataKey="lanzPaloInf"
										name="Palo Inf.-"
										fill="var(--color-lanzPaloInf)"
										radius={[4, 4, 0, 0]}
									/>
								)}

								{showFueraInf && (
									<Bar yAxisId="left" dataKey="fueraInf" name="Fuera Inf.-" fill="var(--color-fueraInf)" radius={[4, 4, 0, 0]} />
								)}

								{showBloqueoInf && (
									<Bar
										yAxisId="left"
										dataKey="bloqueoInf"
										name="Bloqueo Inf.-"
										fill="var(--color-bloqueoInf)"
										radius={[4, 4, 0, 0]}
									/>
								)}

								<Line
									yAxisId="right"
									type="monotone"
									dataKey="efic"
									name="Evitados %"
									stroke="var(--color-efic)"
									strokeWidth={2.5}
									dot={false}
									activeDot={{ r: 4 }}
								/>

								<Line
									yAxisId="right"
									type="monotone"
									dataKey="eficAcum"
									name="Evitados acum. %"
									stroke="var(--color-eficAcum)"
									strokeWidth={3.5}
									strokeDasharray="6 4"
									dot={false}
									activeDot={{ r: 4 }}
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</ChartContainer>
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
										<TableHead>Fecha</TableHead>
										{(showGolesInf || showGolPaloInf) && <TableHead className="text-right">Recibidos</TableHead>}
										{showParadasInf && <TableHead className="text-right">Paradas</TableHead>}
										{showParadaFueraInf && <TableHead className="text-right">P. corner</TableHead>}
										{showLanzPaloInf && <TableHead className="text-right">Palo</TableHead>}
										{showFueraInf && <TableHead className="text-right">Fuera</TableHead>}
										{showBloqueoInf && <TableHead className="text-right">Bloqueo</TableHead>}
										<TableHead className="text-right">Total</TableHead>
										<TableHead className="text-right">Evitados</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{allMatchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell className="text-muted-foreground">{m.fullDate}</TableCell>

											{(showGolesInf || showGolPaloInf) && (
												<TableCell className="text-right tabular-nums font-semibold">{m.golesRecibidos}</TableCell>
											)}

											{showParadasInf && <TableCell className="text-right tabular-nums">{m.paradasInf}</TableCell>}
											{showParadaFueraInf && <TableCell className="text-right tabular-nums">{m.paradaFueraInf}</TableCell>}
											{showLanzPaloInf && <TableCell className="text-right tabular-nums">{m.lanzPaloInf}</TableCell>}
											{showFueraInf && <TableCell className="text-right tabular-nums">{m.fueraInf}</TableCell>}
											{showBloqueoInf && <TableCell className="text-right tabular-nums">{m.bloqueoInf}</TableCell>}

											<TableCell className="text-right tabular-nums">{m.totalAcciones}</TableCell>

											<TableCell className="text-right">
												<Badge
													className={`${
														m.efic >= 60
															? "bg-emerald-500 hover:bg-emerald-500"
															: m.efic >= 40
																? "bg-amber-500 hover:bg-amber-500"
																: "bg-rose-500 hover:bg-rose-500"
													} text-white`}
												>
													{m.efic}%
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>

					<div className="border-t bg-muted/20 px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
							<span>
								<span className="font-medium text-foreground">{allMatchData.length}</span> partidos
							</span>

							<div className="flex flex-wrap gap-2">
								{showGolesInf && (
									<span className="rounded-md border bg-card px-2 py-1">
										Goles Inf.-: <span className="font-semibold text-foreground">{totalGolesInf}</span>
									</span>
								)}

								{showGolPaloInf && (
									<span className="rounded-md border bg-card px-2 py-1">
										Gol palo: <span className="font-semibold text-foreground">{totalGolPaloInf}</span>
									</span>
								)}

								{(showGolesInf || showGolPaloInf) && (
									<span className="rounded-md border bg-card px-2 py-1">
										Recibidos: <span className="font-semibold text-foreground">{totalGolesRecibidos}</span>
									</span>
								)}

								{showParadasInf && (
									<span className="rounded-md border bg-card px-2 py-1">
										Paradas: <span className="font-semibold text-foreground">{totalParadas}</span>
									</span>
								)}

								{showParadaFueraInf && (
									<span className="rounded-md border bg-card px-2 py-1">
										P. corner: <span className="font-semibold text-foreground">{totalParadaFueraInf}</span>
									</span>
								)}

								{showLanzPaloInf && (
									<span className="rounded-md border bg-card px-2 py-1">
										Palo: <span className="font-semibold text-foreground">{totalLanzPaloInf}</span>
									</span>
								)}

								{showFueraInf && (
									<span className="rounded-md border bg-card px-2 py-1">
										Fuera: <span className="font-semibold text-foreground">{totalFuera}</span>
									</span>
								)}

								{showBloqueoInf && (
									<span className="rounded-md border bg-card px-2 py-1">
										Bloqueo: <span className="font-semibold text-foreground">{totalBloqueo}</span>
									</span>
								)}

								<span className="rounded-md border bg-card px-2 py-1">
									Evitados %: <span className="font-semibold text-foreground">{overall}%</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
