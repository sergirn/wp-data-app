"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

interface DefenseFoulsByMatchChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function DefenseFoulsByMatchChart({ matches, stats }: DefenseFoulsByMatchChartProps) {
	const matchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.slice(-15).map((match: any, index: number) => {
			const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

			const exp1c1 = ms.reduce((sum: number, s: any) => sum + toNum(s.faltas_exp_20_1c1), 0);
			const expBoya = ms.reduce((sum: number, s: any) => sum + toNum(s.faltas_exp_20_boya), 0);
			const penalti = ms.reduce((sum: number, s: any) => sum + toNum(s.faltas_penalti), 0);
			const expSimple = ms.reduce((sum: number, s: any) => sum + toNum(s.faltas_exp_simple), 0);
			const expTrans = ms.reduce((sum: number, s: any) => sum + toNum(s.exp_trans_def), 0);
			const exp3Int = ms.reduce((sum: number, s: any) => sum + toNum(s.faltas_exp_3_int), 0);
			const exp3Bruta = ms.reduce((sum: number, s: any) => sum + toNum(s.faltas_exp_3_bruta), 0);

			const total = exp1c1 + expBoya + penalti + expSimple + expTrans + exp3Int + exp3Bruta;
			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				exp1c1,
				expBoya,
				penalti,
				expSimple,
				expTrans,
				exp3Int,
				exp3Bruta,
				total
			};
		});
	}, [matches, stats]);

	const total = matchData.reduce((sum, m) => sum + m.total, 0);
	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Faltas defensivas por jornada"
			description={`Últimos ${matchData.length} · Total ${total}`}
			icon={<ShieldAlert className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{total}</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						exp1c1: { label: 'Exp 18" 1c1', color: "hsla(0, 84%, 60%, 1.00)" },
						expBoya: { label: 'Exp 18" Boya', color: "hsla(25, 95%, 53%, 1.00)" },
						penalti: { label: "Penalti", color: "hsla(330, 78%, 58%, 1.00)" },
						expSimple: { label: "Exp simple", color: "hsla(270, 75%, 60%, 1.00)" },
						expTrans: { label: "Exp trans.", color: "hsla(205, 90%, 55%, 1.00)" },
						exp3Int: { label: 'Exp 3" Int', color: "hsla(190, 95%, 45%, 1.00)" },
						exp3Bruta: { label: 'Exp 3" Bruta', color: "hsla(42, 96%, 55%, 1.00)" }
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
							<YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(label, payload) => {
											const p = payload?.[0]?.payload;
											return p ? `${label} · vs ${p.rival} · ${p.fullDate} · Total ${p.total}` : String(label);
										}}
									/>
								}
							/>
							<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />
							<Bar dataKey="exp1c1" stackId="f" fill="var(--color-exp1c1)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="expBoya" stackId="f" fill="var(--color-expBoya)" />
							<Bar dataKey="penalti" stackId="f" fill="var(--color-penalti)" />
							<Bar dataKey="expSimple" stackId="f" fill="var(--color-expSimple)" />
							<Bar dataKey="expTrans" stackId="f" fill="var(--color-expTrans)" />
							<Bar dataKey="exp3Int" stackId="f" fill="var(--color-exp3Int)" />
							<Bar dataKey="exp3Bruta" stackId="f" fill="var(--color-exp3Bruta)" />
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
										<TableHead className="text-right">1c1</TableHead>
										<TableHead className="text-right">Boya</TableHead>
										<TableHead className="text-right">Pen.</TableHead>
										<TableHead className="text-right">Simple</TableHead>
										<TableHead className="text-right">Trans.</TableHead>
										<TableHead className="text-right">3&quot; Int</TableHead>
										<TableHead className="text-right">3&quot; Bruta</TableHead>
										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</UITableHeader>
								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell className="text-right tabular-nums">{m.exp1c1}</TableCell>
											<TableCell className="text-right tabular-nums">{m.expBoya}</TableCell>
											<TableCell className="text-right tabular-nums">{m.penalti}</TableCell>
											<TableCell className="text-right tabular-nums">{m.expSimple}</TableCell>
											<TableCell className="text-right tabular-nums">{m.expTrans}</TableCell>
											<TableCell className="text-right tabular-nums">{m.exp3Int}</TableCell>
											<TableCell className="text-right tabular-nums">{m.exp3Bruta}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
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
