"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Scale } from "lucide-react";

interface AttackCreationVsLossesChartProps {
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

export function AttackCreationVsLossesChart({ matches, stats, hiddenStats = [] }: AttackCreationVsLossesChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const showAsistencias = !hiddenSet.has("acciones_asistencias");
	const showExpProvocada = !hiddenSet.has("acciones_exp_provocada");
	const showPenaltiProvocado = !hiddenSet.has("acciones_penalti_provocado");
	const showPaseBoya = !hiddenSet.has("pase_boya");

	const showPaseBoyaFallado = !hiddenSet.has("pase_boya_fallado");
	const showPerdidas = !hiddenSet.has("acciones_perdida_poco");
	const showContrafaltas = !hiddenSet.has("faltas_contrafaltas");

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

			const asistencias = sumVisible(ms, "acciones_asistencias", hiddenSet);
			const expProvocada = sumVisible(ms, "acciones_exp_provocada", hiddenSet);
			const penaltiProvocado = sumVisible(ms, "acciones_penalti_provocado", hiddenSet);
			const paseBoya = sumVisible(ms, "pase_boya", hiddenSet);

			const paseBoyaFallado = sumVisible(ms, "pase_boya_fallado", hiddenSet);
			const perdidas = sumVisible(ms, "acciones_perdida_poco", hiddenSet);
			const contrafaltas = sumVisible(ms, "faltas_contrafaltas", hiddenSet);

			const positivas = asistencias + expProvocada + penaltiProvocado + paseBoya;
			const negativas = paseBoyaFallado + perdidas + contrafaltas;
			const balance = positivas - negativas;

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

				asistencias,
				expProvocada,
				penaltiProvocado,
				paseBoya,

				paseBoyaFallado,
				perdidas,
				contrafaltas,

				positivas,
				negativas,
				negativasView: -negativas,
				balance
			};
		});
	}, [sortedMatches, stats, hiddenSet]);

	const partidos = matchData.length;

	const totals = useMemo(() => {
		const asistencias = matchData.reduce((sum, m) => sum + m.asistencias, 0);
		const expProvocada = matchData.reduce((sum, m) => sum + m.expProvocada, 0);
		const penaltiProvocado = matchData.reduce((sum, m) => sum + m.penaltiProvocado, 0);
		const paseBoya = matchData.reduce((sum, m) => sum + m.paseBoya, 0);

		const paseBoyaFallado = matchData.reduce((sum, m) => sum + m.paseBoyaFallado, 0);
		const perdidas = matchData.reduce((sum, m) => sum + m.perdidas, 0);
		const contrafaltas = matchData.reduce((sum, m) => sum + m.contrafaltas, 0);

		const positivas = matchData.reduce((sum, m) => sum + m.positivas, 0);
		const negativas = matchData.reduce((sum, m) => sum + m.negativas, 0);
		const balance = positivas - negativas;

		return {
			asistencias,
			expProvocada,
			penaltiProvocado,
			paseBoya,
			paseBoyaFallado,
			perdidas,
			contrafaltas,
			positivas,
			negativas,
			balance
		};
	}, [matchData]);

	const chartConfig = {
		positivas: { label: "Positivas", color: "hsla(160, 84%, 39%, 1.00)" },
		negativasView: { label: "Negativas", color: "hsla(0, 84%, 60%, 1.00)" },
		balance: { label: "Balance", color: "hsla(221, 83%, 53%, 1.00)" }
	};

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Creación vs pérdidas ofensivas"
			description={`Últimos ${partidos} · Positivas: ${totals.positivas} · Negativas: ${totals.negativas} · Balance: ${
				totals.balance >= 0 ? "+" : ""
			}${totals.balance}`}
			icon={<Scale className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={
				<span className="text-xs text-muted-foreground">
					{totals.balance >= 0 ? "+" : ""}
					{totals.balance}
				</span>
			}
			renderChart={({ compact }) => (
				<ChartContainer config={chartConfig} className={`w-full ${compact ? "h-[260px]" : "h-[340px] lg:h-[380px]"}`}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={matchData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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

							<YAxis fontSize={12} width={38} tickMargin={6} axisLine={false} tickLine={false} />

							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(label, payload) => {
											const p = payload?.[0]?.payload;
											if (!p) return String(label);
											return `${label} · vs ${p.rival} · ${p.fullDate} · Balance: ${p.balance >= 0 ? "+" : ""}${p.balance}`;
										}}
									/>
								}
							/>

							<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

							<Bar dataKey="positivas" name="Positivas" fill="var(--color-positivas)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="negativasView" name="Negativas" fill="var(--color-negativasView)" radius={[4, 4, 0, 0]} />
							<Line
								type="monotone"
								dataKey="balance"
								name="Balance"
								stroke="var(--color-balance)"
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
							<Table className="min-w-[1280px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										{showAsistencias && <TableHead className="text-right">Asist.</TableHead>}
										{showExpProvocada && <TableHead className="text-right">Exp. Prov.</TableHead>}
										{showPenaltiProvocado && <TableHead className="text-right">Pen. Prov.</TableHead>}
										{showPaseBoya && <TableHead className="text-right">Pase boya</TableHead>}
										{showPaseBoyaFallado && <TableHead className="text-right">P. boya fall.</TableHead>}
										{showPerdidas && <TableHead className="text-right">Pérdidas</TableHead>}
										{showContrafaltas && <TableHead className="text-right">Contraf.</TableHead>}
										<TableHead className="text-right">Balance</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell className="max-w-[260px]">
												<div className="min-w-0">
													<p className="font-medium truncate">{m.rival}</p>
													<p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
												</div>
											</TableCell>

											{showAsistencias && <TableCell className="text-right tabular-nums">{m.asistencias}</TableCell>}
											{showExpProvocada && <TableCell className="text-right tabular-nums">{m.expProvocada}</TableCell>}
											{showPenaltiProvocado && <TableCell className="text-right tabular-nums">{m.penaltiProvocado}</TableCell>}
											{showPaseBoya && <TableCell className="text-right tabular-nums">{m.paseBoya}</TableCell>}
											{showPaseBoyaFallado && <TableCell className="text-right tabular-nums">{m.paseBoyaFallado}</TableCell>}
											{showPerdidas && <TableCell className="text-right tabular-nums">{m.perdidas}</TableCell>}
											{showContrafaltas && <TableCell className="text-right tabular-nums">{m.contrafaltas}</TableCell>}

											<TableCell className="text-right">
												<Badge
													className={`${
														m.balance >= 0 ? "bg-emerald-500 hover:bg-emerald-500" : "bg-rose-500 hover:bg-rose-500"
													} text-white tabular-nums`}
												>
													{m.balance >= 0 ? "+" : ""}
													{m.balance}
												</Badge>
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
								{showAsistencias && (
									<span className="rounded-md border bg-card px-2 py-1">
										Asist.: <span className="font-semibold text-foreground">{totals.asistencias}</span>
									</span>
								)}
								{showExpProvocada && (
									<span className="rounded-md border bg-card px-2 py-1">
										Exp. Prov.: <span className="font-semibold text-foreground">{totals.expProvocada}</span>
									</span>
								)}
								{showPenaltiProvocado && (
									<span className="rounded-md border bg-card px-2 py-1">
										Pen. Prov.: <span className="font-semibold text-foreground">{totals.penaltiProvocado}</span>
									</span>
								)}
								{showPaseBoya && (
									<span className="rounded-md border bg-card px-2 py-1">
										Pase boya: <span className="font-semibold text-foreground">{totals.paseBoya}</span>
									</span>
								)}
								{showPaseBoyaFallado && (
									<span className="rounded-md border bg-card px-2 py-1">
										P. boya fall.: <span className="font-semibold text-foreground">{totals.paseBoyaFallado}</span>
									</span>
								)}
								{showPerdidas && (
									<span className="rounded-md border bg-card px-2 py-1">
										Pérdidas: <span className="font-semibold text-foreground">{totals.perdidas}</span>
									</span>
								)}
								{showContrafaltas && (
									<span className="rounded-md border bg-card px-2 py-1">
										Contraf.: <span className="font-semibold text-foreground">{totals.contrafaltas}</span>
									</span>
								)}

								<span className="rounded-md border bg-card px-2 py-1">
									Positivas: <span className="font-semibold text-foreground">{totals.positivas}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Negativas: <span className="font-semibold text-foreground">{totals.negativas}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Balance:{" "}
									<span className="font-semibold text-foreground">
										{totals.balance >= 0 ? "+" : ""}
										{totals.balance}
									</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
