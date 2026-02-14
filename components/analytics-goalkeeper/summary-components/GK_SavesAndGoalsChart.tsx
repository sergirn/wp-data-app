"use client";

import { useMemo } from "react";
import { Shield } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils";
import { ExpandableChartCard } from "../../analytics-player/ExpandableChartCard";

export function GK_SavesAndGoalsChart({ matches, stats }: { matches: any[]; stats: any[] }) {
	const data = useMemo(() => {
		const sorted = sortMatches(matches);

		const statsArr = Array.isArray(stats) ? stats : [];

		return sorted.slice(-15).map((match, idx) => {
			const mid = String(match.id);
			const ms = statsArr.filter((s) => String(s.match_id) === mid);

			const saves = sumField(ms, "portero_paradas_totales");
			let goals = sumField(ms, "goles_recibidos_reales");
			if (!goals) {
				const g = {
					gol: sumField(ms, "portero_gol"),
					sup: sumField(ms, "portero_gol_superioridad"),
					boya: sumField(ms, "portero_goles_boya_parada"),
					hm: sumField(ms, "portero_goles_hombre_menos"),
					mas6: sumField(ms, "portero_goles_dir_mas_5m"),
					contra: sumField(ms, "portero_goles_contraataque"),
					pen: sumField(ms, "portero_goles_penalti"),
					palo: sumField(ms, "portero_gol_palo")
				};
				goals = Object.values(g).reduce((a, b) => a + (b || 0), 0);
			}

			const totalShots = saves + goals;
			const savePct = totalShots > 0 ? (saves / totalShots) * 100 : 0;

			return { ...formatMatchRow(match, idx), saves, goals, savePct: Number(savePct.toFixed(1)) };
		});
	}, [matches, stats]);

	return (
		<ExpandableChartCard
			title="Paradas vs Goles"
			description="Últimos 15 · evolución"
			icon={<Shield className="w-5 h-5 text-white-600" />}
			className="bg-gradient-to-br from-blue-500/5 to-white-500/5"
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						saves: { label: "Paradas", color: "hsl(210 85% 55%)" },
						goals: { label: "Goles recibidos", color: "hsl(0 80% 55%)" }
					}}
					className={`w-full ${compact ? "h-[200px]" : "h-[420px]"}`}
				>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<defs>
								<linearGradient id="gkFillSaves" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="var(--color-saves)" stopOpacity={0.55} />
									<stop offset="95%" stopColor="var(--color-saves)" stopOpacity={0.08} />
								</linearGradient>
								<linearGradient id="gkFillGoals" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="var(--color-goals)" stopOpacity={0.55} />
									<stop offset="95%" stopColor="var(--color-goals)" stopOpacity={0.08} />
								</linearGradient>
							</defs>

							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
							<XAxis dataKey="jornada" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
							<YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(label, payload) => {
											const p = payload?.[0]?.payload;
											return p ? `${label} · vs ${p.rival} · ${p.fullDate} · %Paradas: ${p.savePct}%` : label;
										}}
									/>
								}
							/>
							<Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

							<Area
								type="monotone"
								dataKey="saves"
								name="Paradas"
								stroke="var(--color-saves)"
								fill="url(#gkFillSaves)"
								strokeWidth={2}
								dot={false}
							/>
							<Area
								type="monotone"
								dataKey="goals"
								name="Goles recibidos"
								stroke="var(--color-goals)"
								fill="url(#gkFillGoals)"
								strokeWidth={2}
								dot={false}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</ChartContainer>
			)}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[860px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Paradas</TableHead>
										<TableHead className="text-right">Goles</TableHead>
										<TableHead className="text-right">% Paradas</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>
								<TableBody>
									{data.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell className="max-w-[360px] truncate">{m.rival}</TableCell>
											<TableCell className="text-right tabular-nums">{m.saves}</TableCell>
											<TableCell className="text-right tabular-nums">{m.goals}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.savePct.toFixed(1)}%</TableCell>
											<TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
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
