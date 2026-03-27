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
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function GoalkeeperInferiorityEfficiencyChart({ matches, stats, hiddenStats = [] }: GoalkeeperInferiorityEfficiencyChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const showGoalsHM = !hiddenSet.has("portero_goles_hombre_menos");
	const showGoalPostHM = !hiddenSet.has("portero_gol_palo");
	const showSavesHM = !hiddenSet.has("portero_paradas_hombre_menos");
	const showSaveCornerHM = !hiddenSet.has("portero_parada_fuera_inf");
	const showPostHM = !hiddenSet.has("portero_lanz_palo_inf");
	const showOutsideHM = !hiddenSet.has("portero_inferioridad_fuera");
	const showBlocksHM = !hiddenSet.has("portero_inferioridad_bloqueo");

	const visibleReceived = (showGoalsHM ? 1 : 0) + (showGoalPostHM ? 1 : 0);

	const visiblePrevented =
		(showSavesHM ? 1 : 0) + (showSaveCornerHM ? 1 : 0) + (showPostHM ? 1 : 0) + (showOutsideHM ? 1 : 0) + (showBlocksHM ? 1 : 0);

	const allMatchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			return new Date(a?.match_date).getTime() - new Date(b?.match_date).getTime();
		});

		return sorted
			.map((match: any, idx: number) => {
				const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

				const golesHM = showGoalsHM ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_hombre_menos), 0) : 0;

				const golPaloHM = showGoalPostHM ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_gol_palo), 0) : 0;

				const golesRecibidos = golesHM + golPaloHM;

				const paradasInf = showSavesHM ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_paradas_hombre_menos), 0) : 0;

				const paradaCornerInf = showSaveCornerHM ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_parada_fuera_inf), 0) : 0;

				const paloInf = showPostHM ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_lanz_palo_inf), 0) : 0;

				const fueraInf = showOutsideHM ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_fuera), 0) : 0;

				const bloqueoInf = showBlocksHM ? ms.reduce((sum: number, s: any) => sum + toNum(s.portero_inferioridad_bloqueo), 0) : 0;

				const evitados = paradasInf + paradaCornerInf + paloInf + fueraInf + bloqueoInf;
				const totalAcciones = golesRecibidos + evitados;
				const eficacia = totalAcciones > 0 ? Math.round((evitados / totalAcciones) * 100) : 0;

				const jornadaNumber = match.jornada ?? idx + 1;

				return {
					matchId: match.id,
					xLabel: `${match.id}-${idx}`,
					jornada: `J${jornadaNumber}`,
					rival: match.opponent,
					fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
					golesHM,
					golPaloHM,
					golesRecibidos,
					paradasInf,
					paradaCornerInf,
					paloInf,
					fueraInf,
					bloqueoInf,
					evitados,
					totalAcciones,
					eficacia
				};
			})
			.filter((row) => row.totalAcciones > 0);
	}, [matches, stats, showGoalsHM, showGoalPostHM, showSavesHM, showSaveCornerHM, showPostHM, showOutsideHM, showBlocksHM]);

	const compactMatchData = useMemo(() => allMatchData.slice(-15), [allMatchData]);

	const jornadaByXLabelAll = useMemo(() => {
		return new Map(allMatchData.map((item) => [item.xLabel, item.jornada]));
	}, [allMatchData]);

	const jornadaByXLabelCompact = useMemo(() => {
		return new Map(compactMatchData.map((item) => [item.xLabel, item.jornada]));
	}, [compactMatchData]);

	const buildChartData = (data: typeof allMatchData) =>
		data.map((m, index) => {
			const prev = data.slice(0, index + 1);
			const avg = prev.reduce((sum, x) => sum + x.eficacia, 0) / (index + 1);

			return {
				...m,
				eficaciaAcum: Number(avg.toFixed(1))
			};
		});

	const allChartData = useMemo(() => buildChartData(allMatchData), [allMatchData]);
	const compactChartData = useMemo(() => buildChartData(compactMatchData), [compactMatchData]);

	const totalGC = allMatchData.reduce((sum, m) => sum + m.golesRecibidos, 0);
	const totalEvitados = allMatchData.reduce((sum, m) => sum + m.evitados, 0);
	const totalAcciones = totalGC + totalEvitados;
	const overall = totalAcciones > 0 ? Math.round((totalEvitados / totalAcciones) * 100) : 0;

	if (!allMatchData.length || (visibleReceived === 0 && visiblePrevented === 0)) return null;

	return (
		<ExpandableChartCard
			title="Inferioridad: recibidos vs evitados"
			description={`Jornadas registradas ${allMatchData.length} · Evitados ${overall}% · ${totalEvitados}/${totalAcciones}`}
			icon={<Shield className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{overall}%</span>}
			renderChart={({ compact }) => {
				const data = compact ? compactChartData : allChartData;
				const jornadaMap = compact ? jornadaByXLabelCompact : jornadaByXLabelAll;

				return (
					<ChartContainer
						config={{
							golesRecibidos: { label: "Goles recibidos", color: "hsla(0, 84%, 60%, 1.00)" },
							paradasInf: { label: "Paradas Inf.-", color: "hsla(145, 63%, 42%, 1.00)" },
							paradaCornerInf: { label: "Parada corner Inf.-", color: "hsla(160, 70%, 38%, 1.00)" },
							paloInf: { label: "Palo Inf.-", color: "hsla(285, 70%, 52%, 1.00)" },
							fueraInf: { label: "Fuera Inf.-", color: "hsla(42, 96%, 55%, 1.00)" },
							bloqueoInf: { label: "Bloqueo Inf.-", color: "hsla(270, 75%, 60%, 1.00)" },
							eficacia: { label: "Evitados %", color: "hsla(190, 95%, 45%, 1.00)" },
							eficaciaAcum: { label: "Evitados acum. %", color: "hsla(221, 83%, 53%, 1.00)" }
						}}
						className="w-full h-full"
					>
						<ResponsiveContainer width="100%" height="100%">
							<ComposedChart data={data} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
								<XAxis
									dataKey="xLabel"
									fontSize={12}
									tickMargin={8}
									axisLine={false}
									tickLine={false}
									interval="preserveStartEnd"
									minTickGap={18}
									tickFormatter={(value) => jornadaMap.get(String(value)) ?? ""}
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
												return p ? `${p.jornada} · vs ${p.rival} · ${p.fullDate} · ${p.eficacia}%` : "";
											}}
										/>
									}
								/>
								<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

								<Bar
									yAxisId="left"
									dataKey="golesRecibidos"
									name="Goles recibidos"
									fill="var(--color-golesRecibidos)"
									radius={[4, 4, 0, 0]}
								/>

								{showSavesHM ? (
									<Bar
										yAxisId="left"
										dataKey="paradasInf"
										name="Paradas Inf.-"
										fill="var(--color-paradasInf)"
										radius={[4, 4, 0, 0]}
									/>
								) : null}

								{showSaveCornerHM ? (
									<Bar
										yAxisId="left"
										dataKey="paradaCornerInf"
										name="Parada corner Inf.-"
										fill="var(--color-paradaCornerInf)"
										radius={[4, 4, 0, 0]}
									/>
								) : null}

								{showPostHM ? (
									<Bar yAxisId="left" dataKey="paloInf" name="Palo Inf.-" fill="var(--color-paloInf)" radius={[4, 4, 0, 0]} />
								) : null}

								{showOutsideHM ? (
									<Bar yAxisId="left" dataKey="fueraInf" name="Fuera Inf.-" fill="var(--color-fueraInf)" radius={[4, 4, 0, 0]} />
								) : null}

								{showBlocksHM ? (
									<Bar
										yAxisId="left"
										dataKey="bloqueoInf"
										name="Bloqueo Inf.-"
										fill="var(--color-bloqueoInf)"
										radius={[4, 4, 0, 0]}
									/>
								) : null}

								<Line
									yAxisId="right"
									type="monotone"
									dataKey="eficacia"
									name="Evitados %"
									stroke="var(--color-eficacia)"
									strokeWidth={2.5}
									dot={false}
									activeDot={{ r: 4 }}
								/>
								<Line
									yAxisId="right"
									type="monotone"
									dataKey="eficaciaAcum"
									name="Evitados acum. %"
									stroke="var(--color-eficaciaAcum)"
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
							<Table className="min-w-[940px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead>Fecha</TableHead>
										<TableHead className="text-right">Goles HM</TableHead>
										<TableHead className="text-right">Gol palo</TableHead>
										<TableHead className="text-right">Recibidos</TableHead>

										{showSavesHM ? <TableHead className="text-right">Paradas</TableHead> : null}
										{showSaveCornerHM ? <TableHead className="text-right">P. corner</TableHead> : null}
										{showPostHM ? <TableHead className="text-right">Palo</TableHead> : null}
										{showOutsideHM ? <TableHead className="text-right">Fuera</TableHead> : null}
										{showBlocksHM ? <TableHead className="text-right">Bloqueo</TableHead> : null}

										<TableHead className="text-right">Evitados</TableHead>
										<TableHead className="text-right">Total acc.</TableHead>
										<TableHead className="text-right">Efic.</TableHead>
									</TableRow>
								</UITableHeader>
								<TableBody>
									{allMatchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell>{m.fullDate}</TableCell>
											<TableCell className="text-right tabular-nums">{m.golesHM}</TableCell>
											<TableCell className="text-right tabular-nums">{m.golPaloHM}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.golesRecibidos}</TableCell>

											{showSavesHM ? <TableCell className="text-right tabular-nums">{m.paradasInf}</TableCell> : null}
											{showSaveCornerHM ? <TableCell className="text-right tabular-nums">{m.paradaCornerInf}</TableCell> : null}
											{showPostHM ? <TableCell className="text-right tabular-nums">{m.paloInf}</TableCell> : null}
											{showOutsideHM ? <TableCell className="text-right tabular-nums">{m.fueraInf}</TableCell> : null}
											{showBlocksHM ? <TableCell className="text-right tabular-nums">{m.bloqueoInf}</TableCell> : null}

											<TableCell className="text-right tabular-nums font-semibold">{m.evitados}</TableCell>
											<TableCell className="text-right tabular-nums">{m.totalAcciones}</TableCell>
											<TableCell className="text-right">
												<Badge
													className={`${
														m.eficacia >= 60
															? "bg-emerald-500 hover:bg-emerald-500"
															: m.eficacia >= 40
																? "bg-amber-500 hover:bg-amber-500"
																: "bg-rose-500 hover:bg-rose-500"
													} text-white`}
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
