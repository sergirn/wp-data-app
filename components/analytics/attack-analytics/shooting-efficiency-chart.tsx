"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

interface ShootingEfficiencyChartProps {
	matches: any[];
	stats: any[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const sumVisibleKeys = (rows: any[], keys: string[], hiddenSet: Set<string>) => {
	return rows.reduce((total, row) => {
		return (
			total +
			keys.reduce((acc, key) => {
				if (hiddenSet.has(key)) return acc;
				return acc + toNum(row?.[key]);
			}, 0)
		);
	}, 0);
};

export function ShootingEfficiencyChart({ matches, stats, hiddenStats = [] }: ShootingEfficiencyChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const allData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a, b) => {
			return new Date(a?.match_date).getTime() - new Date(b?.match_date).getTime();
		});

		return sorted.map((match, idx) => {
			const matchStats = (stats ?? []).filter((s) => String(s.match_id) === String(match.id));

			const generalGoalKeys = [
				"goles_boya_jugada",
				"goles_hombre_mas",
				"goles_lanzamiento",
				"goles_dir_mas_5m",
				"goles_contraataque",
				"goles_penalti_anotado",
				"gol_del_palo_sup"
			];

			const generalMissKeys = [
				"tiros_penalti_fallado",
				"tiros_corner",
				"tiros_fuera",
				"tiros_parados",
				"tiros_bloqueado",
				"tiro_palo",
				"tiros_hombre_mas",
				"portero_paradas_superioridad",
				"jugador_superioridad_bloqueo"
			];

			const totalGoals = sumVisibleKeys(matchStats, generalGoalKeys, hiddenSet);
			const totalMisses = sumVisibleKeys(matchStats, generalMissKeys, hiddenSet);
			const totalShots = totalGoals + totalMisses;
			const general = totalShots > 0 ? (totalGoals / totalShots) * 100 : 0;

			const golesSup = hiddenSet.has("goles_hombre_mas") ? 0 : sumVisibleKeys(matchStats, ["goles_hombre_mas"], hiddenSet);

			const paloSup = hiddenSet.has("gol_del_palo_sup") ? 0 : sumVisibleKeys(matchStats, ["gol_del_palo_sup"], hiddenSet);

			const fallosSupFuera = hiddenSet.has("tiros_hombre_mas") ? 0 : sumVisibleKeys(matchStats, ["tiros_hombre_mas"], hiddenSet);

			const fallosSupParada = hiddenSet.has("portero_paradas_superioridad")
				? 0
				: sumVisibleKeys(matchStats, ["portero_paradas_superioridad"], hiddenSet);

			const fallosSupBloqueo = hiddenSet.has("jugador_superioridad_bloqueo")
				? 0
				: sumVisibleKeys(matchStats, ["jugador_superioridad_bloqueo"], hiddenSet);

			const golesSupTotal = golesSup + paloSup;
			const intentosSup = golesSupTotal + fallosSupFuera + fallosSupParada + fallosSupBloqueo;
			const superiority = intentosSup > 0 ? (golesSupTotal / intentosSup) * 100 : 0;

			const jornadaNumber = match?.jornada ?? idx + 1;

			return {
				matchId: match.id,
				xLabel: `${match.id}-${idx}`,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

				general: Number(general.toFixed(1)),
				superiority: Number(superiority.toFixed(1)),

				goles: totalGoals,
				tiros: totalShots,

				golesSup: golesSupTotal,
				tirosSup: intentosSup
			};
		});
	}, [matches, stats, hiddenSet]);

	const compactData = useMemo(() => allData.slice(-15), [allData]);

	const avgGeneral = useMemo(() => {
		if (!allData.length) return "0.0";
		return (allData.reduce((s, d) => s + d.general, 0) / allData.length).toFixed(1);
	}, [allData]);

	const avgSup = useMemo(() => {
		if (!allData.length) return "0.0";
		return (allData.reduce((s, d) => s + d.superiority, 0) / allData.length).toFixed(1);
	}, [allData]);

	if (!allData.length) return null;

	return (
		<ExpandableChartCard
			title="Eficiencia de tiros"
			description={`Jornadas registradas ${allData.length} · Media: ${avgGeneral}% (General) · ${avgSup}% (Sup.)`}
			icon={<Target className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{avgGeneral}%</span>}
			renderChart={({ compact }) => {
				const chartData = compact ? compactData : allData;
				const jornadaByXLabel = new Map(chartData.map((item) => [item.xLabel, item.jornada]));

				return (
					<ChartContainer
						config={{
							general: { label: "Eficiencia General (%)", color: "hsla(0, 91%, 60%, 1.00)" },
							superiority: { label: "Eficiencia Superioridad (%)", color: "hsla(59, 85%, 45%, 1.00)" }
						}}
						className="w-full h-full"
					>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
								<defs>
									<linearGradient id="fillGeneral" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="var(--color-general)" stopOpacity={0.55} />
										<stop offset="95%" stopColor="var(--color-general)" stopOpacity={0.08} />
									</linearGradient>
									<linearGradient id="fillSup" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="var(--color-superiority)" stopOpacity={0.55} />
										<stop offset="95%" stopColor="var(--color-superiority)" stopOpacity={0.08} />
									</linearGradient>
								</defs>

								<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

								<XAxis
									dataKey="xLabel"
									fontSize={12}
									tickMargin={8}
									interval="preserveStartEnd"
									minTickGap={18}
									axisLine={false}
									tickLine={false}
									tickFormatter={(value) => jornadaByXLabel.get(String(value)) ?? ""}
								/>

								<YAxis fontSize={12} width={34} tickMargin={6} domain={[0, 100]} axisLine={false} tickLine={false} />

								<ChartTooltip
									content={
										<ChartTooltipContent
											labelFormatter={(_, payload) => {
												const p = payload?.[0]?.payload;
												if (!p) return "";
												return `${p.jornada} · vs ${p.rival} · ${p.fullDate}`;
											}}
										/>
									}
								/>

								<Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

								<Area
									type="monotone"
									dataKey="general"
									name="Eficiencia General"
									stroke="var(--color-general)"
									fill="url(#fillGeneral)"
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
								/>

								<Area
									type="monotone"
									dataKey="superiority"
									name="Eficiencia Superioridad"
									stroke="var(--color-superiority)"
									fill="url(#fillSup)"
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
								/>
							</AreaChart>
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
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">General</TableHead>
										<TableHead className="text-right">Sup.</TableHead>
										<TableHead className="text-right">Goles</TableHead>
										<TableHead className="text-right">Tiros</TableHead>
										<TableHead className="text-right">Goles Sup.</TableHead>
										<TableHead className="text-right">Tiros Sup.</TableHead>
										<TableHead className="text-right">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{allData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>

											<TableCell className="max-w-[360px]">
												<div className="min-w-0">
													<p className="font-medium truncate">{m.rival}</p>
													<p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
												</div>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												<span className="font-semibold text-white">{m.general.toFixed(1)}%</span>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												<span className="font-semibold text-white">{m.superiority.toFixed(1)}%</span>
											</TableCell>

											<TableCell className="text-right tabular-nums">{m.goles}</TableCell>
											<TableCell className="text-right tabular-nums">{m.tiros}</TableCell>
											<TableCell className="text-right tabular-nums">{m.golesSup}</TableCell>
											<TableCell className="text-right tabular-nums">{m.tirosSup}</TableCell>

											<TableCell className="text-right text-muted-foreground">{m.fullDate}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>

					<div className="border-t bg-muted/20 px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
							<span>
								<span className="font-medium text-foreground">{allData.length}</span> partidos
							</span>

							<div className="flex flex-wrap gap-2">
								<span className="rounded-md border bg-card px-2 py-1">
									Media General: <span className="font-semibold text-white">{avgGeneral}%</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Media Sup.: <span className="font-semibold text-white">{avgSup}%</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
