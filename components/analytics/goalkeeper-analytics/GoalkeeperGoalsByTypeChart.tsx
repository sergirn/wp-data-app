"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { ShieldX } from "lucide-react";

interface GoalkeeperGoalsByTypeChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function GoalkeeperGoalsByTypeChart({ matches, stats }: GoalkeeperGoalsByTypeChartProps) {
	const matchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.slice(-15).map((match: any, index: number) => {
			const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

			const boya = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_boya_parada), 0);
			const hm = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_hombre_menos), 0);
			const dir = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_dir_mas_5m), 0);
			const contra = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_contraataque), 0);
			const penalti = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_penalti), 0);
			const lanz = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_goles_lanzamiento), 0);
			const palo = ms.reduce((sum: number, s: any) => sum + toNum(s.portero_gol_palo), 0);

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				boya,
				hm,
				dir,
				contra,
				penalti,
				lanz,
				palo,
				total: boya + hm + dir + contra + penalti + lanz + palo
			};
		});
	}, [matches, stats]);

	const total = matchData.reduce((sum, m) => sum + m.total, 0);
	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Goles recibidos por tipo"
			description={`Últimos ${matchData.length} · Total ${total}`}
			icon={<ShieldX className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{total}</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						boya: { label: "Boya", color: "hsla(145, 63%, 42%, 1.00)" },
						hm: { label: "Inferioridad", color: "hsla(42, 96%, 55%, 1.00)" },
						dir: { label: "Dir +6m", color: "hsla(221, 83%, 53%, 1.00)" },
						contra: { label: "Contraataque", color: "hsla(190, 95%, 45%, 1.00)" },
						penalti: { label: "Penalti", color: "hsla(330, 78%, 58%, 1.00)" },
						lanz: { label: "Lanzamiento", color: "hsla(0, 84%, 60%, 1.00)" },
						palo: { label: "Palo", color: "hsla(270, 75%, 60%, 1.00)" }
					}}
					className="w-full h-full"
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
							<Bar dataKey="boya" stackId="g" fill="var(--color-boya)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="hm" stackId="g" fill="var(--color-hm)" />
							<Bar dataKey="dir" stackId="g" fill="var(--color-dir)" />
							<Bar dataKey="contra" stackId="g" fill="var(--color-contra)" />
							<Bar dataKey="penalti" stackId="g" fill="var(--color-penalti)" />
							<Bar dataKey="lanz" stackId="g" fill="var(--color-lanz)" />
							<Bar dataKey="palo" stackId="g" fill="var(--color-palo)" />
						</ComposedChart>
					</ResponsiveContainer>
				</ChartContainer>
			)}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[1100px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Boya</TableHead>
										<TableHead className="text-right">Inf.</TableHead>
										<TableHead className="text-right">Dir +6m</TableHead>
										<TableHead className="text-right">Contra</TableHead>
										<TableHead className="text-right">Pen.</TableHead>
										<TableHead className="text-right">Lanz.</TableHead>
										<TableHead className="text-right">Palo</TableHead>
										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</UITableHeader>
								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell className="text-right tabular-nums">{m.boya}</TableCell>
											<TableCell className="text-right tabular-nums">{m.hm}</TableCell>
											<TableCell className="text-right tabular-nums">{m.dir}</TableCell>
											<TableCell className="text-right tabular-nums">{m.contra}</TableCell>
											<TableCell className="text-right tabular-nums">{m.penalti}</TableCell>
											<TableCell className="text-right tabular-nums">{m.lanz}</TableCell>
											<TableCell className="text-right tabular-nums">{m.palo}</TableCell>
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
