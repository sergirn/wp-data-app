"use client";

import React, { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

interface MatchGoalMixChartProps {
	match: any;
	stats: any[];
	hiddenStats?: string[];
}

type GoalMixPart = {
	key: string;
	label: string;
	value: number;
	pct: number;
	color: string;
};

const toNum = (v: any) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const fmtPct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;

function TinyPill({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex items-center rounded-full border border-border/60 bg-background/70 backdrop-blur px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
			{children}
		</span>
	);
}

function StatBox({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"rounded-2xl border px-3 py-3 transition-colors",
				subtle ? "bg-muted/25 border-transparent" : "bg-card/60 border-border/60 shadow-sm"
			].join(" ")}
		>
			<p className="text-[11px] font-medium text-muted-foreground">{label}</p>
			<p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
		</div>
	);
}

function Row({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border transition-colors",
				subtle ? "bg-muted/25 border-transparent" : "bg-card/40 border-border/60"
			].join(" ")}
		>
			<span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}

function DonutCenter({ title, value, subtitle }: { title: string; value: React.ReactNode; subtitle?: React.ReactNode }) {
	return (
		<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
			<div className="rounded-full   px-5 py-6 shadow-sm text-center min-w-[100px]">
				<p className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
				<p className="mt-1 text-2xl font-bold tabular-nums leading-none">{value}</p>

			</div>
		</div>
	);
}

function CustomTooltip({
	active,
	payload,
	total
}: {
	active?: boolean;
	payload?: any[];
	total: number;
}) {
	if (!active || !payload?.length) return null;

	const p = payload[0];
	const name = String(p?.name ?? "");
	const value = Number(p?.value ?? 0);
	const pct = total > 0 ? (value / total) * 100 : 0;

	return (
		<div className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
			<p className="text-xs text-muted-foreground">{name}</p>
			<p className="text-sm font-semibold tabular-nums">
				{value} ({pct.toFixed(1)}%)
			</p>
		</div>
	);
}

export function MatchGoalMixChart({ match, stats, hiddenStats = [] }: MatchGoalMixChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const summary = useMemo(() => {
		const all = stats ?? [];

		const boya = hiddenSet.has("goles_boya_jugada") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_boya_jugada), 0);

		const lanzamiento = hiddenSet.has("goles_lanzamiento") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_lanzamiento), 0);

		const dir5m = hiddenSet.has("goles_dir_mas_5m") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_dir_mas_5m), 0);

		const contra = hiddenSet.has("goles_contraataque") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_contraataque), 0);

		const penalti = hiddenSet.has("goles_penalti_anotado") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_penalti_anotado), 0);

		const sup =
			hiddenSet.has("goles_hombre_mas") && hiddenSet.has("gol_del_palo_sup")
				? 0
				: all.reduce(
						(sum: number, s: any) =>
							sum +
							(hiddenSet.has("goles_hombre_mas") ? 0 : toNum(s.goles_hombre_mas)) +
							(hiddenSet.has("gol_del_palo_sup") ? 0 : toNum(s.gol_del_palo_sup)),
						0
					);

		const total = boya + lanzamiento + dir5m + contra + penalti + sup;
		const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

		const rawParts: GoalMixPart[] = [
			{ key: "boya", label: "Boya/Jugada", value: boya, pct: pct(boya), color: "hsla(140, 70%, 45%, 1.00)" },
			{ key: "lanzamiento", label: "Lanzamiento", value: lanzamiento, pct: pct(lanzamiento), color: "hsla(12, 85%, 60%, 1.00)" },
			{ key: "dir5m", label: "Dir +6m", value: dir5m, pct: pct(dir5m), color: "hsla(220, 80%, 62%, 1.00)" },
			{ key: "contra", label: "Contraataque", value: contra, pct: pct(contra), color: "hsla(205, 90%, 55%, 1.00)" },
			{ key: "penalti", label: "Penalti", value: penalti, pct: pct(penalti), color: "hsla(330, 78%, 58%, 1.00)" },
			{ key: "sup", label: "Superioridad", value: sup, pct: pct(sup), color: "hsla(59, 85%, 45%, 1.00)" }
		];

		const parts = rawParts.filter((p) => p.value > 0);
		const topType = [...rawParts].sort((a, b) => b.value - a.value)[0] ?? null;

		return {
			parts,
			rawParts,
			total,
			topType: topType && topType.value > 0 ? topType : null
		};
	}, [stats, hiddenSet]);

	const perMatch = useMemo(() => {
		const boya = hiddenSet.has("goles_boya_jugada") ? 0 : (stats ?? []).reduce((sum: number, s: any) => sum + toNum(s.goles_boya_jugada), 0);

		const lanzamiento = hiddenSet.has("goles_lanzamiento")
			? 0
			: (stats ?? []).reduce((sum: number, s: any) => sum + toNum(s.goles_lanzamiento), 0);

		const dir5m = hiddenSet.has("goles_dir_mas_5m") ? 0 : (stats ?? []).reduce((sum: number, s: any) => sum + toNum(s.goles_dir_mas_5m), 0);

		const contra = hiddenSet.has("goles_contraataque") ? 0 : (stats ?? []).reduce((sum: number, s: any) => sum + toNum(s.goles_contraataque), 0);

		const penalti = hiddenSet.has("goles_penalti_anotado")
			? 0
			: (stats ?? []).reduce((sum: number, s: any) => sum + toNum(s.goles_penalti_anotado), 0);

		const sup =
			hiddenSet.has("goles_hombre_mas") && hiddenSet.has("gol_del_palo_sup")
				? 0
				: (stats ?? []).reduce(
						(sum: number, s: any) =>
							sum +
							(hiddenSet.has("goles_hombre_mas") ? 0 : toNum(s.goles_hombre_mas)) +
							(hiddenSet.has("gol_del_palo_sup") ? 0 : toNum(s.gol_del_palo_sup)),
						0
					);

		const total = boya + lanzamiento + dir5m + contra + penalti + sup;
		const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

		const jornadaNumber = match?.jornada ?? 1;

		return total > 0
			? [
					{
						matchId: match?.id,
						jornadaNumber,
						jornada: `J${jornadaNumber}`,
						rival: match?.opponent ?? "—",
						fullDate: match?.match_date ? new Date(match.match_date).toLocaleDateString("es-ES") : "—",
						boya,
						lanzamiento,
						dir5m,
						contra,
						penalti,
						sup,
						total,
						boyaPct: Number(pct(boya).toFixed(1)),
						lanzamientoPct: Number(pct(lanzamiento).toFixed(1)),
						dir5mPct: Number(pct(dir5m).toFixed(1)),
						contraPct: Number(pct(contra).toFixed(1)),
						penaltiPct: Number(pct(penalti).toFixed(1)),
						supPct: Number(pct(sup).toFixed(1))
					}
				]
			: [];
	}, [match, stats, hiddenSet]);

	if (summary.total <= 0) return null;

	const jornada = match?.jornada ? `J${match.jornada}` : "Partido";
	const rival = match?.opponent ?? "—";
	const fecha = match?.match_date ? new Date(match.match_date).toLocaleDateString("es-ES") : "—";

	return (
		<ExpandableChartCard
			title="Tipo de goles ofensivos"
			description={`${jornada} · vs ${rival} · ${fecha}`}
			icon={<Target className="w-5 h-5" />}
			className="from-transparent"
			rightHeader={<span className="text-xs text-muted-foreground">{summary.topType?.label ?? "—"}</span>}
			renderChart={({ compact }) => {
				const outer = compact ? 86 : 116;
				const inner = compact ? 52 : 74;

				return (
					<div className="w-full">
						<div className={`grid gap-5 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[1.05fr_1fr]"}`}>
							<div className="relative">
								<div className={`${compact ? "h-[240px]" : "h-[320px]"} w-full rounded-3xl border border-border/60 bg-card/30 p-2`}>
									<ChartContainer
										config={Object.fromEntries(
											summary.rawParts.filter((p) => p.value > 0).map((p) => [p.key, { label: p.label, color: p.color }])
										)}
										className="w-full h-full"
									>
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={summary.parts}
													dataKey="value"
													nameKey="label"
													cx="50%"
													cy="50%"
													innerRadius={inner}
													outerRadius={outer}
													paddingAngle={2}
													stroke="transparent"
												>
													{summary.parts.map((p) => (
														<Cell key={p.key} fill={p.color} />
													))}
												</Pie>
												<RechartsTooltip content={<CustomTooltip total={summary.total} />} />
											</PieChart>
										</ResponsiveContainer>
									</ChartContainer>

									<DonutCenter
										title="Goles"
										value={summary.total}
										subtitle={summary.topType ? `${summary.topType.label} · ${Math.round(summary.topType.pct)}%` : "—"}
									/>
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex flex-wrap gap-2">
									<TinyPill>
										Total <span className="ml-1 font-semibold text-foreground tabular-nums">{summary.total}</span>
									</TinyPill>
									{summary.topType ? (
										<TinyPill>
											Top tipo <span className="ml-1 font-semibold text-foreground">{summary.topType.label}</span>
										</TinyPill>
									) : null}
									<TinyPill>
										Partido <span className="ml-1 font-semibold text-foreground">{jornada}</span>
									</TinyPill>
								</div>

								

								<div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm">
									<div className="flex items-center justify-between gap-3 mb-3">
										<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Distribución</p>
										<Badge variant="outline" className="bg-background/70 text-[11px]">
											{summary.parts.length} tipos
										</Badge>
									</div>

									<div className="space-y-2">
										{summary.parts.map((p) => (
											<Row
												key={p.key}
												label={p.label}
												value={
													<span className="tabular-nums">
														{p.value} ({fmtPct(p.pct)})
													</span>
												}
												subtle
											/>
										))}
									</div>
								</div>

								<div className="rounded-3xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-4 shadow-sm">
									<div className="flex items-start gap-3">
										<div className="mt-0.5">
											{summary.topType && summary.topType.pct >= 40 ? (
												<div className="rounded-full border border-border/60 bg-background/80 p-2">
													<TrendingUp className="h-4 w-4 text-muted-foreground" />
												</div>
											) : (
												<div className="rounded-full border border-border/60 bg-background/80 p-2">
													<TrendingDown className="h-4 w-4 text-muted-foreground" />
												</div>
											)}
										</div>

										<div className="min-w-0">
											<p className="text-sm font-semibold">Lectura rápida</p>
											<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
												{summary.topType
													? `${summary.topType.label} fue la vía principal de gol del partido, con ${summary.topType.value} tantos (${fmtPct(
															summary.topType.pct
														)}).`
													: "No hay suficientes datos para generar una lectura del partido."}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				);
			}}
			renderTable={() => (
				<div className="rounded-3xl border border-border/60 bg-card/40 overflow-hidden">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-4">
						<div className="min-w-0">
							<p className="text-sm font-semibold">Detalle de tipo de goles</p>
							<p className="text-xs text-muted-foreground">
								{jornada} · {rival} · {fecha}
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
								Total {summary.total}
							</Badge>
							{summary.topType ? (
								<Badge variant="outline" className="bg-background/70 text-[11px]">
									Top {summary.topType.label}
								</Badge>
							) : null}
						</div>
					</div>

					<div className="p-4 space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
							{summary.parts.map((p) => (
								<StatBox
									key={p.key}
									label={p.label}
									value={
										<span className="tabular-nums">
											{p.value} · {fmtPct(p.pct)}
										</span>
									}
								/>
							))}
						</div>

						<div className="rounded-3xl border border-border/60 bg-muted/15 p-4">
							<div className="w-full overflow-x-auto">
								<div className="max-h-[520px] overflow-y-auto">
									<Table className="min-w-[1180px]">
										<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
											<TableRow className="hover:bg-transparent">
												<TableHead className="w-[90px]">Jornada</TableHead>
												<TableHead>Rival</TableHead>
												{!hiddenSet.has("goles_boya_jugada") && <TableHead className="text-right">Boya</TableHead>}
												{!hiddenSet.has("goles_lanzamiento") && <TableHead className="text-right">Lanz.</TableHead>}
												{!hiddenSet.has("goles_dir_mas_5m") && <TableHead className="text-right">Dir +6m</TableHead>}
												{!hiddenSet.has("goles_contraataque") && <TableHead className="text-right">Contra</TableHead>}
												{!hiddenSet.has("goles_penalti_anotado") && <TableHead className="text-right">Penalti</TableHead>}
												{(!hiddenSet.has("goles_hombre_mas") || !hiddenSet.has("gol_del_palo_sup")) && (
													<TableHead className="text-right">Sup.</TableHead>
												)}
												<TableHead className="text-right">Total</TableHead>
												<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
											</TableRow>
										</UITableHeader>

										<TableBody>
											{perMatch.map((m, idx) => (
												<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
													<TableCell className="font-semibold">{m.jornada}</TableCell>

													<TableCell className="max-w-[280px]">
														<div className="min-w-0">
															<p className="font-medium truncate">{m.rival}</p>
															<p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
														</div>
													</TableCell>

													{!hiddenSet.has("goles_boya_jugada") && (
														<TableCell className="text-right tabular-nums">
															{m.boya} <span className="text-xs text-muted-foreground">({fmtPct(m.boyaPct)})</span>
														</TableCell>
													)}

													{!hiddenSet.has("goles_lanzamiento") && (
														<TableCell className="text-right tabular-nums">
															{m.lanzamiento} <span className="text-xs text-muted-foreground">({fmtPct(m.lanzamientoPct)})</span>
														</TableCell>
													)}

													{!hiddenSet.has("goles_dir_mas_5m") && (
														<TableCell className="text-right tabular-nums">
															{m.dir5m} <span className="text-xs text-muted-foreground">({fmtPct(m.dir5mPct)})</span>
														</TableCell>
													)}

													{!hiddenSet.has("goles_contraataque") && (
														<TableCell className="text-right tabular-nums">
															{m.contra} <span className="text-xs text-muted-foreground">({fmtPct(m.contraPct)})</span>
														</TableCell>
													)}

													{!hiddenSet.has("goles_penalti_anotado") && (
														<TableCell className="text-right tabular-nums">
															{m.penalti} <span className="text-xs text-muted-foreground">({fmtPct(m.penaltiPct)})</span>
														</TableCell>
													)}

													{(!hiddenSet.has("goles_hombre_mas") || !hiddenSet.has("gol_del_palo_sup")) && (
														<TableCell className="text-right tabular-nums">
															{m.sup} <span className="text-xs text-muted-foreground">({fmtPct(m.supPct)})</span>
														</TableCell>
													)}

													<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
													<TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						</div>

						<div className="rounded-3xl border border-border/60 bg-gradient-to-br from-background to-muted/25 p-4">
							<div className="flex items-start gap-3">
								<div className="mt-0.5">
									{summary.topType && summary.topType.pct >= 40 ? (
										<div className="rounded-full border border-border/60 bg-background/80 p-2">
											<TrendingUp className="h-4 w-4 text-muted-foreground" />
										</div>
									) : (
										<div className="rounded-full border border-border/60 bg-background/80 p-2">
											<TrendingDown className="h-4 w-4 text-muted-foreground" />
										</div>
									)}
								</div>

								<div>
									<p className="text-sm font-semibold">Conclusión</p>
									<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
										{summary.topType
											? `La producción ofensiva del partido se apoyó sobre todo en ${summary.topType.label}, con ${summary.topType.value} goles y un peso de ${fmtPct(
													summary.topType.pct
											  )} sobre el total.`
											: "No hay suficientes datos para generar una conclusión del partido."}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}