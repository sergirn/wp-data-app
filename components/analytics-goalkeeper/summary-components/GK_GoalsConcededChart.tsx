"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

import { formatMatchRow, sortMatches, sumField } from "@/lib/chartUtils";
import { ExpandableChartCard } from "../../analytics-player/ExpandableChartCard";

export function GK_GoalsConcededChart({ matches, stats }: { matches: any[]; stats: any[] }) {
	const data = useMemo(() => {
		const sorted = sortMatches(matches);
		const statsArr = Array.isArray(stats) ? stats : [];

		return sorted.slice(-15).map((match, idx) => {
			const mid = String(match.id);
			const ms = statsArr.filter((s) => String(s.match_id) === mid);

			return {
				...formatMatchRow(match, idx),
				gol: sumField(ms, "portero_gol"),
				superioridad: sumField(ms, "portero_gol_superioridad"),
				boyaParada: sumField(ms, "portero_goles_boya_parada"),
				hombreMenos: sumField(ms, "portero_goles_hombre_menos"),
				dirMas5m: sumField(ms, "portero_goles_dir_mas_5m"),
				contraataque: sumField(ms, "portero_goles_contraataque"),
				penalti: sumField(ms, "portero_goles_penalti"),
				palo: sumField(ms, "portero_gol_palo")
			};
		});
	}, [matches, stats]);

	return (
		<ExpandableChartCard
			title="Goles Encajados"
			description="Por tipo · últimos 15"
			icon={<AlertCircle className="w-5 h-5 text-white-600" />}
			className="bg-gradient-to-br from-orange-500/5 to-red-500/5"
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						gol: { label: "Gol", color: "hsl(0 80% 55%)" },
						superioridad: { label: "Gol Superioridad", color: "hsl(10 85% 55%)" },
						boyaParada: { label: "Boya/Parada", color: "hsl(20 85% 55%)" },
						hombreMenos: { label: "Hombre -", color: "hsl(28 90% 55%)" },
						dirMas5m: { label: "+6m", color: "hsl(350 80% 55%)" },
						contraataque: { label: "Contraataque", color: "hsl(5 75% 50%)" },
						palo: { label: "Gol de palo", color: "hsl(40 85% 55%)" },
						penalti: { label: "Penalti", color: "hsl(330 75% 55%)" }
					}}
					className={`w-full ${compact ? "h-[200px]" : "h-[420px]"}`}
				>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
							<XAxis dataKey="jornada" fontSize={12} tickMargin={8} axisLine={false} tickLine={false} />
							<YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(label, payload) => {
											const p = payload?.[0]?.payload;
											return p ? `${label} · vs ${p.rival} · ${p.fullDate}` : label;
										}}
									/>
								}
							/>
							<Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

							<Bar dataKey="gol" name="Gol" fill="var(--color-gol)" radius={[6, 6, 0, 0]} />
							<Bar dataKey="superioridad" name="Gol Superioridad" fill="var(--color-superioridad)" radius={[6, 6, 0, 0]} />
							<Bar dataKey="boyaParada" name="Boya/Parada" fill="var(--color-boyaParada)" radius={[6, 6, 0, 0]} />
							<Bar dataKey="hombreMenos" name="Hombre -" fill="var(--color-hombreMenos)" radius={[6, 6, 0, 0]} />
							<Bar dataKey="dirMas5m" name="+6m" fill="var(--color-dirMas5m)" radius={[6, 6, 0, 0]} />
							<Bar dataKey="contraataque" name="Contraataque" fill="var(--color-contraataque)" radius={[6, 6, 0, 0]} />
							<Bar dataKey="palo" name="Gol de palo" fill="var(--color-palo)" radius={[6, 6, 0, 0]} />
							<Bar dataKey="penalti" name="Penalti" fill="var(--color-penalti)" radius={[6, 6, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</ChartContainer>
			)}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[1250px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Gol</TableHead>
										<TableHead className="text-right">Sup.</TableHead>
										<TableHead className="text-right">Boya/Par.</TableHead>
										<TableHead className="text-right">Hombre -</TableHead>
										<TableHead className="text-right">+6m</TableHead>
										<TableHead className="text-right">Contra</TableHead>
										<TableHead className="text-right">Gol de palo</TableHead>
										<TableHead className="text-right">Penalti</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{data.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell className="truncate max-w-[340px]">{m.rival}</TableCell>
											<TableCell className="text-right tabular-nums">{m.gol}</TableCell>
											<TableCell className="text-right tabular-nums">{m.superioridad}</TableCell>
											<TableCell className="text-right tabular-nums">{m.boyaParada}</TableCell>
											<TableCell className="text-right tabular-nums">{m.hombreMenos}</TableCell>
											<TableCell className="text-right tabular-nums">{m.dirMas5m}</TableCell>
											<TableCell className="text-right tabular-nums">{m.contraataque}</TableCell>
											<TableCell className="text-right tabular-nums">{m.palo}</TableCell>
											<TableCell className="text-right tabular-nums">{m.penalti}</TableCell>
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
