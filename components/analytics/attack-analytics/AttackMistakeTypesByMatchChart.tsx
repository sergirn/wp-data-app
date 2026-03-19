"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { CircleOff } from "lucide-react";

interface AttackMistakeTypesByMatchChartProps {
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

export function AttackMistakeTypesByMatchChart({ matches, stats, hiddenStats = [] }: AttackMistakeTypesByMatchChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const showPen = !hiddenSet.has("tiros_penalti_fallado");
	const showCorner = !hiddenSet.has("tiros_corner");
	const showFuera = !hiddenSet.has("tiros_fuera");
	const showPalo = !hiddenSet.has("tiro_palo");
	const showParados = !hiddenSet.has("tiros_parados");
	const showBloqueado = !hiddenSet.has("tiros_bloqueado");
	const showSupFuera = !hiddenSet.has("tiros_hombre_mas");
	const showSupParada = !hiddenSet.has("portero_paradas_superioridad");
	const showSupBloqueo = !hiddenSet.has("jugador_superioridad_bloqueo");

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

			const pen = sumVisible(ms, "tiros_penalti_fallado", hiddenSet);
			const corner = sumVisible(ms, "tiros_corner", hiddenSet);
			const fuera = sumVisible(ms, "tiros_fuera", hiddenSet);
			const palo = sumVisible(ms, "tiro_palo", hiddenSet);
			const parados = sumVisible(ms, "tiros_parados", hiddenSet);
			const bloqueado = sumVisible(ms, "tiros_bloqueado", hiddenSet);

			const supFuera = sumVisible(ms, "tiros_hombre_mas", hiddenSet);
			const supParada = sumVisible(ms, "portero_paradas_superioridad", hiddenSet);
			const supBloqueo = sumVisible(ms, "jugador_superioridad_bloqueo", hiddenSet);
			const sup = supFuera + supParada + supBloqueo;

			const total = pen + corner + fuera + palo + parados + bloqueado + sup;
			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

				pen,
				corner,
				fuera,
				palo,
				parados,
				bloqueado,

				supFuera,
				supParada,
				supBloqueo,
				sup,

				total
			};
		});
	}, [sortedMatches, stats, hiddenSet]);

	const partidos = matchData.length;

	const totals = useMemo(() => {
		const pen = matchData.reduce((sum, m) => sum + m.pen, 0);
		const corner = matchData.reduce((sum, m) => sum + m.corner, 0);
		const fuera = matchData.reduce((sum, m) => sum + m.fuera, 0);
		const palo = matchData.reduce((sum, m) => sum + m.palo, 0);
		const parados = matchData.reduce((sum, m) => sum + m.parados, 0);
		const bloqueado = matchData.reduce((sum, m) => sum + m.bloqueado, 0);

		const supFuera = matchData.reduce((sum, m) => sum + m.supFuera, 0);
		const supParada = matchData.reduce((sum, m) => sum + m.supParada, 0);
		const supBloqueo = matchData.reduce((sum, m) => sum + m.supBloqueo, 0);

		const total = matchData.reduce((sum, m) => sum + m.total, 0);

		const parts = [
			showPen && { key: "pen", label: "Pen. fallado", value: pen, color: "hsla(330, 78%, 58%, 1.00)" },
			showCorner && { key: "corner", label: "Corner", value: corner, color: "hsla(35, 90%, 55%, 1.00)" },
			showFuera && { key: "fuera", label: "Fuera", value: fuera, color: "hsla(0, 85%, 60%, 1.00)" },
			showPalo && { key: "palo", label: "Palo", value: palo, color: "hsla(140, 70%, 45%, 1.00)" },
			showParados && { key: "parados", label: "Parado", value: parados, color: "hsla(205, 90%, 55%, 1.00)" },
			showBloqueado && { key: "bloqueado", label: "Bloqueado", value: bloqueado, color: "hsla(270, 75%, 60%, 1.00)" },
			showSupFuera && { key: "supFuera", label: "Sup.+ fuera", value: supFuera, color: "hsla(59, 85%, 45%, 1.00)" },
			showSupParada && { key: "supParada", label: "Sup.+ parada", value: supParada, color: "hsla(47, 95%, 50%, 1.00)" },
			showSupBloqueo && { key: "supBloqueo", label: "Sup.+ bloqueo", value: supBloqueo, color: "hsla(52, 85%, 40%, 1.00)" }
		]
			.filter(Boolean)
			.map((p: any) => ({
				...p,
				pct: total > 0 ? Number(((p.value / total) * 100).toFixed(1)) : 0
			}));

		const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

		return { parts, topType, total };
	}, [matchData, showPen, showCorner, showFuera, showPalo, showParados, showBloqueado, showSupFuera, showSupParada, showSupBloqueo]);

	const chartConfig = {
		...(showPen && { pen: { label: "Pen. fallado", color: "hsla(330, 78%, 58%, 1.00)" } }),
		...(showCorner && { corner: { label: "Corner", color: "hsla(35, 90%, 55%, 1.00)" } }),
		...(showFuera && { fuera: { label: "Fuera", color: "hsla(0, 85%, 60%, 1.00)" } }),
		...(showPalo && { palo: { label: "Palo", color: "hsla(140, 70%, 45%, 1.00)" } }),
		...(showParados && { parados: { label: "Parado", color: "hsla(205, 90%, 55%, 1.00)" } }),
		...(showBloqueado && { bloqueado: { label: "Bloqueado", color: "hsla(270, 75%, 60%, 1.00)" } }),
		...(showSupFuera && { supFuera: { label: "Sup.+ fuera", color: "hsla(59, 85%, 45%, 1.00)" } }),
		...(showSupParada && { supParada: { label: "Sup.+ parada", color: "hsla(47, 95%, 50%, 1.00)" } }),
		...(showSupBloqueo && { supBloqueo: { label: "Sup.+ bloqueo", color: "hsla(52, 85%, 40%, 1.00)" } })
	};

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Fallos por tipo por jornada"
			description={`Últimos ${partidos} · Total: ${totals.total} · Predomina: ${totals.topType?.label ?? "—"}`}
			icon={<CircleOff className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{totals.topType?.label ?? "—"}</span>}
			renderChart={({ compact }) => (
				<div className="w-full h-full min-h-0 flex flex-col">
					<div className="space-y-3 sm:space-y-4 h-full min-h-0 flex flex-col">
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

									{showPen && (
										<Bar dataKey="pen" name="Pen. fallado" stackId="misses" fill="var(--color-pen)" radius={[4, 4, 0, 0]} />
									)}
									{showCorner && <Bar dataKey="corner" name="Corner" stackId="misses" fill="var(--color-corner)" />}
									{showFuera && <Bar dataKey="fuera" name="Fuera" stackId="misses" fill="var(--color-fuera)" />}
									{showPalo && <Bar dataKey="palo" name="Palo" stackId="misses" fill="var(--color-palo)" />}
									{showParados && <Bar dataKey="parados" name="Parado" stackId="misses" fill="var(--color-parados)" />}
									{showBloqueado && <Bar dataKey="bloqueado" name="Bloqueado" stackId="misses" fill="var(--color-bloqueado)" />}
									{showSupFuera && <Bar dataKey="supFuera" name="Sup.+ fuera" stackId="misses" fill="var(--color-supFuera)" />}
									{showSupParada && <Bar dataKey="supParada" name="Sup.+ parada" stackId="misses" fill="var(--color-supParada)" />}
									{showSupBloqueo && (
										<Bar dataKey="supBloqueo" name="Sup.+ bloqueo" stackId="misses" fill="var(--color-supBloqueo)" />
									)}
								</ComposedChart>
							</ResponsiveContainer>
						</ChartContainer>

						<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
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
							<Table className="min-w-[1320px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										{showPen && <TableHead className="text-right">Pen.</TableHead>}
										{showCorner && <TableHead className="text-right">Corner</TableHead>}
										{showFuera && <TableHead className="text-right">Fuera</TableHead>}
										{showPalo && <TableHead className="text-right">Palo</TableHead>}
										{showParados && <TableHead className="text-right">Parado</TableHead>}
										{showBloqueado && <TableHead className="text-right">Bloq</TableHead>}
										{showSupFuera && <TableHead className="text-right">Sup. fuera</TableHead>}
										{showSupParada && <TableHead className="text-right">Sup. parada</TableHead>}
										{showSupBloqueo && <TableHead className="text-right">Sup. bloqueo</TableHead>}
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
											{showPen && <TableCell className="text-right tabular-nums">{m.pen}</TableCell>}
											{showCorner && <TableCell className="text-right tabular-nums">{m.corner}</TableCell>}
											{showFuera && <TableCell className="text-right tabular-nums">{m.fuera}</TableCell>}
											{showPalo && <TableCell className="text-right tabular-nums">{m.palo}</TableCell>}
											{showParados && <TableCell className="text-right tabular-nums">{m.parados}</TableCell>}
											{showBloqueado && <TableCell className="text-right tabular-nums">{m.bloqueado}</TableCell>}
											{showSupFuera && <TableCell className="text-right tabular-nums">{m.supFuera}</TableCell>}
											{showSupParada && <TableCell className="text-right tabular-nums">{m.supParada}</TableCell>}
											{showSupBloqueo && <TableCell className="text-right tabular-nums">{m.supBloqueo}</TableCell>}
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
