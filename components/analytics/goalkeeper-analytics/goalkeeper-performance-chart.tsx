"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

interface GoalkeeperPerformanceChartProps {
	matches: any[];
	stats: any[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const isVisible = (hiddenSet: Set<string>, key: string) => !hiddenSet.has(key);

export function GoalkeeperPerformanceChart({ matches, stats, hiddenStats = [] }: GoalkeeperPerformanceChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const visibility = useMemo(
		() => ({
			// paradas
			save_parada_recup: isVisible(hiddenSet, "portero_tiros_parada_recup"),
			save_fuera: isVisible(hiddenSet, "portero_paradas_fuera"),
			save_penalti: isVisible(hiddenSet, "portero_paradas_penalti_parado"),
			save_inf: isVisible(hiddenSet, "portero_paradas_hombre_menos"),

			// goles encajados
			goal_boya: isVisible(hiddenSet, "portero_goles_boya_parada"),
			goal_dir6: isVisible(hiddenSet, "portero_goles_dir_mas_5m"),
			goal_contra: isVisible(hiddenSet, "portero_goles_contraataque"),
			goal_penalti: isVisible(hiddenSet, "portero_goles_penalti"),
			goal_lanz: isVisible(hiddenSet, "portero_goles_lanzamiento"),
			goal_inf: isVisible(hiddenSet, "portero_goles_hombre_menos"),
			goal_inf_palo: isVisible(hiddenSet, "portero_gol_palo"),

			// tiros recibidos extra
			shot_penalti_palo: isVisible(hiddenSet, "portero_penalti_palo"),
			shot_penalti_fuera: isVisible(hiddenSet, "portero_penalti_fuera"),
			shot_recibido_fuera: isVisible(hiddenSet, "lanz_recibido_fuera"),
			shot_lanz_palo: isVisible(hiddenSet, "portero_lanz_palo"),
			shot_inf_fuera: isVisible(hiddenSet, "portero_inferioridad_fuera"),
			shot_inf_bloqueo: isVisible(hiddenSet, "portero_inferioridad_bloqueo")
		}),
		[hiddenSet]
	);

	const data = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a, b) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.slice(-15).map((match, idx) => {
			const goalkeepersStats = (stats ?? []).filter(
				(s) =>
					String(s.match_id) === String(match.id) &&
					(s.portero_paradas_totales != null ||
						s.portero_tiros_parada_recup != null ||
						s.portero_paradas_fuera != null ||
						s.portero_paradas_penalti_parado != null ||
						s.portero_paradas_hombre_menos != null ||
						s.portero_goles_boya_parada != null ||
						s.portero_goles_dir_mas_5m != null ||
						s.portero_goles_contraataque != null ||
						s.portero_goles_penalti != null ||
						s.portero_goles_lanzamiento != null ||
						s.portero_goles_hombre_menos != null)
			);

			const savesNormal =
				(visibility.save_parada_recup ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_tiros_parada_recup), 0) : 0) +
				(visibility.save_fuera ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_paradas_fuera), 0) : 0);

			const savesInferiority = visibility.save_inf ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_paradas_hombre_menos), 0) : 0;

			const penaltiesSaved = visibility.save_penalti
				? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_paradas_penalti_parado), 0)
				: 0;

			const totalSaves = savesNormal + savesInferiority + penaltiesSaved;

			const goalsAgainst =
				(visibility.goal_boya ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_goles_boya_parada), 0) : 0) +
				(visibility.goal_dir6 ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_goles_dir_mas_5m), 0) : 0) +
				(visibility.goal_contra ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_goles_contraataque), 0) : 0) +
				(visibility.goal_penalti ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_goles_penalti), 0) : 0) +
				(visibility.goal_lanz ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_goles_lanzamiento), 0) : 0) +
				(visibility.goal_inf ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_goles_hombre_menos), 0) : 0) +
				(visibility.goal_inf_palo ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_gol_palo), 0) : 0);

			const extraShots =
				(visibility.shot_penalti_palo ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_penalti_palo), 0) : 0) +
				(visibility.shot_penalti_fuera ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_penalti_fuera), 0) : 0) +
				(visibility.shot_recibido_fuera ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.lanz_recibido_fuera), 0) : 0) +
				(visibility.shot_lanz_palo ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_lanz_palo), 0) : 0) +
				(visibility.shot_inf_fuera ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_inferioridad_fuera), 0) : 0) +
				(visibility.shot_inf_bloqueo ? goalkeepersStats.reduce((sum, s) => sum + toNum(s.portero_inferioridad_bloqueo), 0) : 0);

			const totalShots = totalSaves + goalsAgainst + extraShots;
			const savePercentage = totalShots > 0 ? (totalSaves / totalShots) * 100 : 0;

			const jornadaNumber = match.jornada ?? idx + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

				percentage: Number(savePercentage.toFixed(1)),
				saves: totalSaves,
				savesInf: savesInferiority,
				pensSaved: penaltiesSaved,

				golesRecibidos: goalsAgainst,
				tirosRecibidos: totalShots
			};
		});
	}, [matches, stats, visibility]);

	const avgPct = useMemo(() => {
		if (!data.length) return "0.0";
		return (data.reduce((s, d) => s + d.percentage, 0) / data.length).toFixed(1);
	}, [data]);

	const totalSaves = useMemo(() => data.reduce((s, d) => s + d.saves, 0), [data]);
	const totalGoalsAgainst = useMemo(() => data.reduce((s, d) => s + d.golesRecibidos, 0), [data]);
	const totalShotsAgainst = useMemo(() => data.reduce((s, d) => s + d.tirosRecibidos, 0), [data]);

	const showSaves =
		!hiddenSet.has("portero_tiros_parada_recup") ||
		!hiddenSet.has("portero_paradas_fuera") ||
		!hiddenSet.has("portero_paradas_penalti_parado") ||
		!hiddenSet.has("portero_paradas_hombre_menos");
	const showSavesInf = !hiddenSet.has("portero_paradas_hombre_menos");
	const showPensSaved = !hiddenSet.has("portero_paradas_penalti_parado");
	const showGoalsAgainst =
		!hiddenSet.has("portero_goles_boya_parada") ||
		!hiddenSet.has("portero_goles_dir_mas_5m") ||
		!hiddenSet.has("portero_goles_contraataque") ||
		!hiddenSet.has("portero_goles_penalti") ||
		!hiddenSet.has("portero_goles_lanzamiento") ||
		!hiddenSet.has("portero_goles_hombre_menos") ||
		!hiddenSet.has("portero_gol_palo");
	const showShotsAgainst =
		showSaves ||
		showGoalsAgainst ||
		!hiddenSet.has("portero_penalti_palo") ||
		!hiddenSet.has("portero_penalti_fuera") ||
		!hiddenSet.has("lanz_recibido_fuera") ||
		!hiddenSet.has("portero_lanz_palo") ||
		!hiddenSet.has("portero_inferioridad_fuera") ||
		!hiddenSet.has("portero_inferioridad_bloqueo");

	if (!data.length || (!showSaves && !showSavesInf && !showPensSaved && !showGoalsAgainst && !showShotsAgainst)) return null;

	return (
		<ExpandableChartCard
			title="Rendimiento de Porteros"
			description={`Últimos ${data.length} · Media: ${avgPct}% · Paradas: ${totalSaves} · GC: ${totalGoalsAgainst}`}
			icon={<Shield className="w-5 h-5" />}
			className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
			rightHeader={<span className="text-xs text-muted-foreground">{avgPct}%</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						...(showSaves && { saves: { label: "Paradas Totales", color: "hsl(199 95% 55%)" } }),
						...(showSavesInf && { savesInf: { label: "Paradas en Inferioridad", color: "hsl(142 85% 45%)" } }),
						percentage: { label: "% Efectividad", color: "hsl(34 95% 55%)" }
					}}
					className="w-full h-full"
				>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<defs>
								{showSaves ? (
									<linearGradient id="fillSaves" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="var(--color-saves)" stopOpacity={0.55} />
										<stop offset="95%" stopColor="var(--color-saves)" stopOpacity={0.08} />
									</linearGradient>
								) : null}

								{showSavesInf ? (
									<linearGradient id="fillSavesInf" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="var(--color-savesInf)" stopOpacity={0.55} />
										<stop offset="95%" stopColor="var(--color-savesInf)" stopOpacity={0.08} />
									</linearGradient>
								) : null}

								<linearGradient id="fillPercentage" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="var(--color-percentage)" stopOpacity={0.45} />
									<stop offset="95%" stopColor="var(--color-percentage)" stopOpacity={0.05} />
								</linearGradient>
							</defs>

							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

							<XAxis
								dataKey="jornada"
								fontSize={12}
								tickMargin={8}
								interval="preserveStartEnd"
								minTickGap={18}
								axisLine={false}
								tickLine={false}
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
											return `${label} · vs ${p.rival} · ${p.fullDate} · %: ${p.percentage}% · Par: ${p.saves}`;
										}}
									/>
								}
							/>

							<Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

							{showSaves ? (
								<Area
									yAxisId="left"
									type="monotone"
									dataKey="saves"
									name="Paradas Totales"
									stroke="var(--color-saves)"
									fill="url(#fillSaves)"
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
								/>
							) : null}

							{showSavesInf ? (
								<Area
									yAxisId="left"
									type="monotone"
									dataKey="savesInf"
									name="Paradas en Inferioridad"
									stroke="var(--color-savesInf)"
									fill="url(#fillSavesInf)"
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
								/>
							) : null}

							<Area
								yAxisId="right"
								type="monotone"
								dataKey="percentage"
								name="% Efectividad"
								stroke="var(--color-percentage)"
								fill="url(#fillPercentage)"
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
						</AreaChart>
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
										{showSaves ? <TableHead className="text-right">Paradas</TableHead> : null}
										{showSavesInf ? <TableHead className="text-right">Par. Inf.</TableHead> : null}
										{showPensSaved ? <TableHead className="text-right">Pen. Par.</TableHead> : null}
										{showGoalsAgainst ? <TableHead className="text-right">GC</TableHead> : null}
										{showShotsAgainst ? <TableHead className="text-right">Tiros</TableHead> : null}
										<TableHead className="text-right">% Efec.</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{data.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>

											<TableCell className="max-w-[360px]">
												<div className="min-w-0">
													<p className="font-medium truncate">{m.rival}</p>
													<p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
												</div>
											</TableCell>

											{showSaves ? <TableCell className="text-right tabular-nums">{m.saves}</TableCell> : null}
											{showSavesInf ? <TableCell className="text-right tabular-nums">{m.savesInf}</TableCell> : null}
											{showPensSaved ? <TableCell className="text-right tabular-nums">{m.pensSaved}</TableCell> : null}
											{showGoalsAgainst ? <TableCell className="text-right tabular-nums">{m.golesRecibidos}</TableCell> : null}
											{showShotsAgainst ? <TableCell className="text-right tabular-nums">{m.tirosRecibidos}</TableCell> : null}

											<TableCell className="text-right tabular-nums">
												<span className="font-semibold text-white">{m.percentage.toFixed(1)}%</span>
											</TableCell>

											<TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>

					<div className="border-t bg-muted/20 px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
							<span>
								<span className="font-medium text-foreground">{data.length}</span> partidos
							</span>

							<div className="flex flex-wrap gap-2">
								{showSaves ? (
									<span className="rounded-md border bg-card px-2 py-1">
										Total Paradas: <span className="font-semibold text-foreground">{totalSaves}</span>
									</span>
								) : null}

								{showGoalsAgainst ? (
									<span className="rounded-md border bg-card px-2 py-1">
										Total GC: <span className="font-semibold text-foreground">{totalGoalsAgainst}</span>
									</span>
								) : null}

								{showShotsAgainst ? (
									<span className="rounded-md border bg-card px-2 py-1">
										Total Tiros: <span className="font-semibold text-foreground">{totalShotsAgainst}</span>
									</span>
								) : null}

								<span className="rounded-md border bg-card px-2 py-1">
									Media %: <span className="font-semibold text-white">{avgPct}%</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
