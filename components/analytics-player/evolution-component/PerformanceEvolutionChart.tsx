"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BarChart3, Table2, Loader2, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { Player, MatchStats, Match } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { useStatWeights } from "@/hooks/useStatWeights";

type ViewMode = "chart" | "table";
type MatchStatsWithMatch = MatchStats & { matches: Match };

function computeWeightedScore(row: Record<string, any>, weights: Record<string, number>): number {
	let score = 0;
	for (const [key, weightRaw] of Object.entries(weights)) {
		const weight = Number(weightRaw);
		const value = Number(row?.[key] ?? 0);
		if (Number.isFinite(weight) && Number.isFinite(value)) score += value * weight;
	}
	return Math.round(score);
}

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" }) : "");

export function PerformanceEvolutionChart({ matchStats, player }: { matchStats: MatchStatsWithMatch[]; player: Player }) {
	const [view, setView] = useState<ViewMode>("chart");
	const { weights, loaded } = useStatWeights();
	const hasWeights = loaded && Object.keys(weights).length > 0;

	if (!matchStats?.length) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">No hay datos suficientes para mostrar la evolución</p>
				</CardContent>
			</Card>
		);
	}

	// ✅ Data 1:1 desde matchStats y orden cronológico + media acumulada
	const data = useMemo(() => {
		const arr = Array.isArray(matchStats) ? matchStats : [];
		const sorted = [...arr].sort((a: any, b: any) => {
			const da = new Date(a?.matches?.match_date ?? 0).getTime();
			const db = new Date(b?.matches?.match_date ?? 0).getTime();
			return da - db;
		});

		let runningSum = 0;

		return sorted.map((stat: any, idx: number) => {
			const match = stat.matches;

			const puntos = hasWeights ? computeWeightedScore(stat, weights) : 0;

			runningSum += Number(puntos) || 0;
			const mediaPuntos = runningSum / (idx + 1);

			const jornada = match?.jornada ?? idx + 1;

			return {
				match: String(jornada),
				opponent: match?.opponent ?? "—",
				date: formatDate(match?.match_date),
				puntos,
				mediaPuntos // ✅ MEDIA ACUMULADA (varía por jornada)
			};
		});
	}, [matchStats, hasWeights, weights]);

	const avgPts = useMemo(() => {
		if (!data.length) return "0.0";
		const v = data.reduce((s: number, d: any) => s + (Number(d.puntos) || 0), 0) / data.length;
		return v.toFixed(1);
	}, [data]);

	const HeaderSwitch = (
		<div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
			<BarChart3 className={`h-4 w-4 ${view === "chart" ? "text-foreground" : "text-muted-foreground"}`} />
			<Switch checked={view === "table"} onCheckedChange={(v) => setView(v ? "table" : "chart")} />
			<Table2 className={`h-4 w-4 ${view === "table" ? "text-foreground" : "text-muted-foreground"}`} />
		</div>
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="space-y-1">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<CardTitle>Evolución de Puntos</CardTitle>
							<CardDescription className="truncate">
								Puntos por partido según valoraciones · <span className="font-medium text-foreground">Media final: {avgPts} pts</span>
							</CardDescription>
						</div>
						{HeaderSwitch}
					</div>

					{!loaded ? (
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							Cargando valoraciones…
						</div>
					) : null}

					{loaded && !hasWeights ? (
						<div className="text-xs text-muted-foreground">Configura valoraciones en Ajustes para calcular puntos.</div>
					) : null}
				</CardHeader>

				<CardContent className="min-w-0 w-full overflow-hidden">
					{view === "chart" ? (
						<div className="h-[400px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

									{/* ✅ Textos: dark blanco / light negro */}
									<XAxis
										dataKey="match"
										tick={{ fill: "currentColor", fontSize: 12 }}
										axisLine={{ stroke: "hsl(var(--border))" }}
										tickLine={{ stroke: "hsl(var(--border))" }}
									/>
									<YAxis
										tick={{ fill: "currentColor", fontSize: 12 }}
										axisLine={{ stroke: "hsl(var(--border))" }}
										tickLine={{ stroke: "hsl(var(--border))" }}
										domain={["auto", "auto"]}
									/>

									<Tooltip
										cursor={{ stroke: "hsl(var(--border))" }}
										content={({ active, payload, label }) => {
											if (!active || !payload?.length) return null;
											const p: any = payload[0]?.payload;
											return (
												<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
													<div className="text-xs text-muted-foreground">
														{p ? `${p.match} - ${p.opponent} (${p.date})` : String(label)}
													</div>
													<div className="mt-1 text-sm font-semibold tabular-nums flex items-center gap-1.5">
														<TrendingUp className="h-4 w-4 text-muted-foreground" />
														{p?.puntos ?? 0} pts
													</div>
													<div className="text-xs text-muted-foreground">
														Media acumulada: {Number(p?.mediaPuntos ?? 0).toFixed(1)} pts
													</div>
												</div>
											);
										}}
									/>

									<Legend
										wrapperStyle={{
											color: "currentcolor",
											fontSize: 12
										}}
									/>

									{/* ✅ Línea puntos (visible SIEMPRE) */}
									<Line
										type="monotone"
										dataKey="puntos"
										stroke="green"
										strokeWidth={4}
										dot={{ r: 3, fill: "white", stroke: "hsl(var(--foreground))", strokeWidth: 2 }}
										activeDot={{ r: 5, fill: "currentcolor", stroke: "hsl(var(--foreground))", strokeWidth: 2 }}
										isAnimationActive={false}
										connectNulls
										name="Puntos"
									/>

									{/* ✅ Media acumulada (varía por jornada y es visible) */}
									<Line
										type="monotone"
										dataKey="mediaPuntos"
										stroke="magenta"
										strokeWidth={5}
										strokeDasharray="7 6"
										opacity={0.95}
										dot={false}
										isAnimationActive={false}
										name="Media acumulada"
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					) : (
						<div className="rounded-xl border overflow-hidden bg-card w-full">
							<div className="w-full overflow-x-auto">
								<div className="max-h-[520px] overflow-y-auto">
									<Table className="min-w-[900px]">
										<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
											<TableRow className="hover:bg-transparent">
												<TableHead className="w-[90px]">Jornada</TableHead>
												<TableHead>Rival</TableHead>
												<TableHead className="text-right">Pts</TableHead>
												<TableHead className="text-right">Media</TableHead>
												<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
											</TableRow>
										</UITableHeader>

										<TableBody>
											{data.map((m: any, idx: number) => (
												<TableRow
													key={`${m.match}-${m.date}-${idx}`}
													className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
												>
													<TableCell className="font-semibold">{m.match}</TableCell>

													<TableCell className="max-w-[420px]">
														<div className="min-w-0">
															<p className="font-medium truncate">{m.opponent}</p>
															<p className="text-xs text-muted-foreground sm:hidden">{m.date}</p>
														</div>
													</TableCell>

													<TableCell className="text-right tabular-nums font-semibold">
														<span className="inline-flex items-center gap-1">
															<TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
															{m.puntos ?? 0}
														</span>
													</TableCell>

													<TableCell className="text-right tabular-nums">{Number(m.mediaPuntos ?? 0).toFixed(1)}</TableCell>

													<TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.date}</TableCell>
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

									<span className="rounded-md border bg-card px-2 py-1">
										Media final: <span className="font-semibold text-foreground tabular-nums">{avgPts}</span>
									</span>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
