"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Goal } from "lucide-react";

interface AttackGoalTypesByMatchChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function AttackGoalTypesByMatchChart({ matches, stats }: AttackGoalTypesByMatchChartProps) {
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

			const boya = ms.reduce((sum: number, s: any) => sum + toNum(s.goles_boya_jugada), 0);
			const lanzamiento = ms.reduce((sum: number, s: any) => sum + toNum(s.goles_lanzamiento), 0);
			const dir5m = ms.reduce((sum: number, s: any) => sum + toNum(s.goles_dir_mas_5m), 0);
			const contra = ms.reduce((sum: number, s: any) => sum + toNum(s.goles_contraataque), 0);
			const penalti = ms.reduce((sum: number, s: any) => sum + toNum(s.goles_penalti_anotado), 0);
			const sup = ms.reduce((sum: number, s: any) => sum + toNum(s.goles_hombre_mas) + toNum(s.gol_del_palo_sup), 0);

			const total = boya + lanzamiento + dir5m + contra + penalti + sup;
			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				boya,
				lanzamiento,
				dir5m,
				contra,
				penalti,
				sup,
				total
			};
		});
	}, [sortedMatches, stats]);

	const partidos = matchData.length;

	const totals = useMemo(() => {
		const boya = matchData.reduce((sum, m) => sum + m.boya, 0);
		const lanzamiento = matchData.reduce((sum, m) => sum + m.lanzamiento, 0);
		const dir5m = matchData.reduce((sum, m) => sum + m.dir5m, 0);
		const contra = matchData.reduce((sum, m) => sum + m.contra, 0);
		const penalti = matchData.reduce((sum, m) => sum + m.penalti, 0);
		const sup = matchData.reduce((sum, m) => sum + m.sup, 0);
		const total = matchData.reduce((sum, m) => sum + m.total, 0);

		const parts = [
			{ key: "boya", label: "Boya/Jugada", value: boya, color: "hsla(145, 63%, 42%, 1.00)" },
			{ key: "lanzamiento", label: "Lanzamiento", value: lanzamiento, color: "hsla(25, 95%, 53%, 1.00)" },
			{ key: "dir5m", label: "Dir +6m", value: dir5m, color: "hsla(221, 83%, 53%, 1.00)" },
			{ key: "contra", label: "Contraataque", value: contra, color: "hsla(190, 95%, 45%, 1.00)" },
			{ key: "penalti", label: "Penalti", value: penalti, color: "hsla(330, 78%, 58%, 1.00)" },
			{ key: "sup", label: "Superioridad", value: sup, color: "hsla(42, 96%, 55%, 1.00)" }
		].map((p) => ({
			...p,
			pct: total > 0 ? Number(((p.value / total) * 100).toFixed(1)) : 0
		}));

		const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

		return { parts, topType, total };
	}, [matchData]);

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Goles por tipo por jornada"
			description={`Últimos ${partidos} · Total: ${totals.total} · Predomina: ${totals.topType?.label ?? "—"}`}
			icon={<Goal className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{totals.topType?.label ?? "—"}</span>}
			renderChart={({ compact }) => (
				<div className="w-full h-full min-h-0 flex flex-col">
					<div className="space-y-3 sm:space-y-4 h-full min-h-0 flex flex-col">
						<ChartContainer
							config={{
								boya: { label: "Boya/Jugada", color: "hsla(145, 63%, 42%, 1.00)" },
								lanzamiento: { label: "Lanzamiento", color: "hsla(25, 95%, 53%, 1.00)" },
								dir5m: { label: "Dir +6m", color: "hsla(221, 83%, 53%, 1.00)" },
								contra: { label: "Contraataque", color: "hsla(190, 95%, 45%, 1.00)" },
								penalti: { label: "Penalti", color: "hsla(330, 78%, 58%, 1.00)" },
								sup: { label: "Superioridad", color: "hsla(42, 96%, 55%, 1.00)" }
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
													if (!p) return String(label);
													return `${label} · vs ${p.rival} · ${p.fullDate} · Total: ${p.total}`;
												}}
											/>
										}
									/>

									<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

									<Bar dataKey="boya" name="Boya/Jugada" stackId="goals" fill="var(--color-boya)" radius={[4, 4, 0, 0]} />
									<Bar dataKey="lanzamiento" name="Lanzamiento" stackId="goals" fill="var(--color-lanzamiento)" />
									<Bar dataKey="dir5m" name="Dir +6m" stackId="goals" fill="var(--color-dir5m)" />
									<Bar dataKey="contra" name="Contraataque" stackId="goals" fill="var(--color-contra)" />
									<Bar dataKey="penalti" name="Penalti" stackId="goals" fill="var(--color-penalti)" />
									<Bar dataKey="sup" name="Superioridad" stackId="goals" fill="var(--color-sup)" />
								</ComposedChart>
							</ResponsiveContainer>
						</ChartContainer>

						<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
							{totals.parts.map((p) => (
								<div
									key={p.key}
									className="rounded-md border px-2 py-2 text-center"
									style={{ backgroundColor: `${p.color}10` }}
									title={p.label}
								>
									<p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{p.label}</p>
									<p className="text-sm sm:text-base font-bold tabular-nums leading-tight">{p.value}</p>
									<p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">{p.pct}%</p>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[1180px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Boya</TableHead>
										<TableHead className="text-right">Lanz.</TableHead>
										<TableHead className="text-right">Dir +6m</TableHead>
										<TableHead className="text-right">Contra</TableHead>
										<TableHead className="text-right">Pen.</TableHead>
										<TableHead className="text-right">Sup.</TableHead>
										<TableHead className="text-right">Total</TableHead>
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
											<TableCell className="text-right tabular-nums">{m.boya}</TableCell>
											<TableCell className="text-right tabular-nums">{m.lanzamiento}</TableCell>
											<TableCell className="text-right tabular-nums">{m.dir5m}</TableCell>
											<TableCell className="text-right tabular-nums">{m.contra}</TableCell>
											<TableCell className="text-right tabular-nums">{m.penalti}</TableCell>
											<TableCell className="text-right tabular-nums">{m.sup}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
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
								{totals.parts.map((p) => (
									<span key={p.key} className="rounded-md border bg-card px-2 py-1">
										{p.label}: <span className="font-semibold text-foreground">{p.value}</span>
									</span>
								))}
								<span className="rounded-md border bg-card px-2 py-1">
									Total: <span className="font-semibold text-foreground">{totals.total}</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
