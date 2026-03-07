"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Sparkles } from "lucide-react";

interface GoalkeeperBallImpactChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function GoalkeeperBallImpactChart({ matches, stats }: GoalkeeperBallImpactChartProps) {
	const matchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.slice(-15).map((match: any, index: number) => {
			const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

			const asistencias = ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_asistencias), 0);
			const gol = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_gol), 0);
			const golSup = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_gol_superioridad), 0);
			const recuperacion = ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_recuperacion), 0);
			const expProvocada = ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_exp_provocada), 0);

			const tiroFallado = ms.reduce((sum: number, s: any) => sum + toNum(s.tiro_fallado_portero), 0);
			const falloSup = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_fallo_superioridad), 0);
			const perdidas = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_acciones_perdida_pos), 0);

			const positivas = asistencias + gol + golSup + recuperacion + expProvocada;
			const negativas = tiroFallado + falloSup + perdidas;
			const balance = positivas - negativas;

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				asistencias,
				gol,
				golSup,
				recuperacion,
				expProvocada,
				tiroFallado,
				falloSup,
				perdidas,
				positivas,
				negativas,
				negativasView: -negativas,
				balance
			};
		});
	}, [matches, stats]);

	const totalPos = matchData.reduce((sum, m) => sum + m.positivas, 0);
	const totalNeg = matchData.reduce((sum, m) => sum + m.negativas, 0);
	const totalBal = totalPos - totalNeg;

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Impacto con balón"
			description={`Positivas ${totalPos} · Negativas ${totalNeg} · Balance ${totalBal >= 0 ? "+" : ""}${totalBal}`}
			icon={<Sparkles className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={
				<span className="text-xs text-muted-foreground">
					{totalBal >= 0 ? "+" : ""}
					{totalBal}
				</span>
			}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						positivas: { label: "Positivas", color: "hsla(145, 63%, 42%, 1.00)" },
						negativasView: { label: "Negativas", color: "hsla(0, 84%, 60%, 1.00)" },
						balance: { label: "Balance", color: "hsla(262, 83%, 58%, 1.00)" }
					}}
					className={`w-full ${compact ? "h-[260px]" : "h-[340px] lg:h-[380px]"}`}
				>
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
											return p
												? `${label} · vs ${p.rival} · ${p.fullDate} · ${p.balance >= 0 ? "+" : ""}${p.balance}`
												: String(label);
										}}
									/>
								}
							/>
							<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />
							<Bar dataKey="positivas" fill="var(--color-positivas)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="negativasView" fill="var(--color-negativasView)" radius={[4, 4, 0, 0]} />
							<Line type="monotone" dataKey="balance" stroke="var(--color-balance)" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
						</ComposedChart>
					</ResponsiveContainer>
				</ChartContainer>
			)}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[1180px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Asist.</TableHead>
										<TableHead className="text-right">Gol</TableHead>
										<TableHead className="text-right">Gol Sup.</TableHead>
										<TableHead className="text-right">Recup.</TableHead>
										<TableHead className="text-right">Exp. Prov.</TableHead>
										<TableHead className="text-right">Tiro fall.</TableHead>
										<TableHead className="text-right">Fallo Sup.</TableHead>
										<TableHead className="text-right">Pérdidas</TableHead>
										<TableHead className="text-right">Balance</TableHead>
									</TableRow>
								</UITableHeader>
								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell className="text-right tabular-nums">{m.asistencias}</TableCell>
											<TableCell className="text-right tabular-nums">{m.gol}</TableCell>
											<TableCell className="text-right tabular-nums">{m.golSup}</TableCell>
											<TableCell className="text-right tabular-nums">{m.recuperacion}</TableCell>
											<TableCell className="text-right tabular-nums">{m.expProvocada}</TableCell>
											<TableCell className="text-right tabular-nums">{m.tiroFallado}</TableCell>
											<TableCell className="text-right tabular-nums">{m.falloSup}</TableCell>
											<TableCell className="text-right tabular-nums">{m.perdidas}</TableCell>
											<TableCell className="text-right">
												<Badge
													className={`${m.balance >= 0 ? "bg-emerald-500 hover:bg-emerald-500" : "bg-rose-500 hover:bg-rose-500"} text-white`}
												>
													{m.balance >= 0 ? "+" : ""}
													{m.balance}
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
