"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Anchor } from "lucide-react";

interface AttackBoyaFlowChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const sumVisible = (rows: Record<string, any>[], key: string, hiddenSet: Set<string>) => {
	if (hiddenSet.has(key)) return 0;
	return rows.reduce((sum, row) => sum + toNum(row?.[key]), 0);
};

export function AttackBoyaFlowChart({ matches, stats, hiddenStats = [] }: AttackBoyaFlowChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const showPaseBoya = !hiddenSet.has("pase_boya");
	const showPaseBoyaFallado = !hiddenSet.has("pase_boya_fallado");
	const showGolesBoya = !hiddenSet.has("goles_boya_jugada");

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

		return sortedMatches.slice(-15).map((match: any, index: number) => {
			const ms = statsArr.filter((s: any) => String(s.match_id) === String(match.id));

			const paseBoya = sumVisible(ms, "pase_boya", hiddenSet);
			const paseBoyaFallado = sumVisible(ms, "pase_boya_fallado", hiddenSet);
			const golesBoya = sumVisible(ms, "goles_boya_jugada", hiddenSet);

			const intentosBoya = paseBoya + paseBoyaFallado;
			const conversionBoya = intentosBoya > 0 ? Number(((golesBoya / intentosBoya) * 100).toFixed(1)) : 0;
			const exitoPaseBoya = intentosBoya > 0 ? Number(((paseBoya / intentosBoya) * 100).toFixed(1)) : 0;

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				paseBoya,
				paseBoyaFallado,
				golesBoya,
				intentosBoya,
				conversionBoya,
				exitoPaseBoya
			};
		});
	}, [sortedMatches, stats, hiddenSet]);

	const partidos = matchData.length;

	const totals = useMemo(() => {
		const paseBoya = matchData.reduce((sum, m) => sum + m.paseBoya, 0);
		const paseBoyaFallado = matchData.reduce((sum, m) => sum + m.paseBoyaFallado, 0);
		const golesBoya = matchData.reduce((sum, m) => sum + m.golesBoya, 0);
		const intentosBoya = paseBoya + paseBoyaFallado;
		const conversionBoya = intentosBoya > 0 ? Number(((golesBoya / intentosBoya) * 100).toFixed(1)) : 0;
		const exitoPaseBoya = intentosBoya > 0 ? Number(((paseBoya / intentosBoya) * 100).toFixed(1)) : 0;

		return { paseBoya, paseBoyaFallado, golesBoya, intentosBoya, conversionBoya, exitoPaseBoya };
	}, [matchData]);

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Juego con boya"
			description={`Últimos ${partidos} · Conv.: ${totals.conversionBoya}% · Éxito pase: ${totals.exitoPaseBoya}%`}
			icon={<Anchor className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{totals.conversionBoya}%</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						paseBoya: { label: "Pase boya", color: "hsla(221, 83%, 53%, 1.00)" },
						paseBoyaFallado: { label: "Pase boya fallado", color: "hsla(0, 84%, 60%, 1.00)" },
						golesBoya: { label: "Gol boya", color: "hsla(145, 63%, 42%, 1.00)" },
						conversionBoya: { label: "Conversión boya %", color: "hsla(42, 96%, 55%, 1.00)" }
					}}
					className={`w-full ${compact ? "h-[260px]" : "h-[340px] lg:h-[380px]"}`}
				>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={matchData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
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
											return `${label} · vs ${p.rival} · ${p.fullDate} · Conv.: ${p.conversionBoya}%`;
										}}
									/>
								}
							/>

							<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

							<Bar yAxisId="left" dataKey="paseBoya" name="Pase boya" fill="var(--color-paseBoya)" radius={[4, 4, 0, 0]} />
							<Bar
								yAxisId="left"
								dataKey="paseBoyaFallado"
								name="Pase boya fallado"
								fill="var(--color-paseBoyaFallado)"
								radius={[4, 4, 0, 0]}
							/>
							<Bar yAxisId="left" dataKey="golesBoya" name="Gol boya" fill="var(--color-golesBoya)" radius={[4, 4, 0, 0]} />

							<Line
								yAxisId="right"
								type="monotone"
								dataKey="conversionBoya"
								name="Conversión boya %"
								stroke="var(--color-conversionBoya)"
								strokeWidth={3}
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
										{showPaseBoya && <TableHead className="text-right">Pase boya</TableHead>}
										{showPaseBoyaFallado && <TableHead className="text-right">P. boya fall.</TableHead>}
										{showGolesBoya && <TableHead className="text-right">Gol boya</TableHead>}
										<TableHead className="text-right">Intentos</TableHead>
										<TableHead className="text-right">Éxito pase</TableHead>
										<TableHead className="text-right">Conversión</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell className="max-w-[280px]">
												<div className="min-w-0">
													<p className="font-medium truncate">{m.rival}</p>
													<p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
												</div>
											</TableCell>

											{showPaseBoya && <TableCell className="text-right tabular-nums">{m.paseBoya}</TableCell>}
											{showPaseBoyaFallado && <TableCell className="text-right tabular-nums">{m.paseBoyaFallado}</TableCell>}
											{showGolesBoya && <TableCell className="text-right tabular-nums">{m.golesBoya}</TableCell>}

											<TableCell className="text-right tabular-nums">{m.intentosBoya}</TableCell>
											<TableCell className="text-right">
												<Badge className="bg-blue-600 text-white hover:bg-blue-600 tabular-nums">{m.exitoPaseBoya}%</Badge>
											</TableCell>
											<TableCell className="text-right">
												<Badge className="bg-amber-500 text-white hover:bg-amber-500 tabular-nums">{m.conversionBoya}%</Badge>
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
								<span className="font-medium text-foreground">{partidos}</span> partidos
							</span>
							<div className="flex flex-wrap gap-2">
								{showPaseBoya && (
									<span className="rounded-md border bg-card px-2 py-1">
										Pase boya: <span className="font-semibold text-foreground">{totals.paseBoya}</span>
									</span>
								)}
								{showPaseBoyaFallado && (
									<span className="rounded-md border bg-card px-2 py-1">
										P. boya fallado: <span className="font-semibold text-foreground">{totals.paseBoyaFallado}</span>
									</span>
								)}
								{showGolesBoya && (
									<span className="rounded-md border bg-card px-2 py-1">
										Gol boya: <span className="font-semibold text-foreground">{totals.golesBoya}</span>
									</span>
								)}
								<span className="rounded-md border bg-card px-2 py-1">
									Intentos: <span className="font-semibold text-foreground">{totals.intentosBoya}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Éxito pase: <span className="font-semibold text-foreground">{totals.exitoPaseBoya}%</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Conversión: <span className="font-semibold text-foreground">{totals.conversionBoya}%</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
