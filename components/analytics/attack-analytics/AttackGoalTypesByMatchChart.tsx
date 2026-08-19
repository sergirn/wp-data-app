"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Goal } from "lucide-react";

interface AttackGoalTypesByMatchChartProps {
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

export function AttackGoalTypesByMatchChart({ matches, stats, hiddenStats = [] }: AttackGoalTypesByMatchChartProps) {
	const t = useTranslations("AttackByMatch")
	const locale = useLocale()
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const showBoya = !hiddenSet.has("goles_boya_jugada");
	const showLanzamiento = !hiddenSet.has("goles_lanzamiento");
	const showDir5m = !hiddenSet.has("goles_dir_mas_5m");
	const showContra = !hiddenSet.has("goles_contraataque");
	const showPenalti = !hiddenSet.has("goles_penalti_anotado");
	const showSupMas = !hiddenSet.has("goles_hombre_mas");
	const showSupPalo = !hiddenSet.has("gol_del_palo_sup");

	const sortedMatches = useMemo(() => {
		return [...(matches ?? [])].sort((a: any, b: any) => {
			return new Date(a?.match_date).getTime() - new Date(b?.match_date).getTime();
		});
	}, [matches]);

	const matchData = useMemo(() => {
		const statsArr = Array.isArray(stats) ? stats : [];

		return sortedMatches.map((match: any, index: number) => {
			const ms = statsArr.filter((s: any) => String(s.match_id) === String(match.id));

			const boya = sumVisible(ms, "goles_boya_jugada", hiddenSet);
			const lanzamiento = sumVisible(ms, "goles_lanzamiento", hiddenSet);
			const dir5m = sumVisible(ms, "goles_dir_mas_5m", hiddenSet);
			const contra = sumVisible(ms, "goles_contraataque", hiddenSet);
			const penalti = sumVisible(ms, "goles_penalti_anotado", hiddenSet);
			const supMas = sumVisible(ms, "goles_hombre_mas", hiddenSet);
			const supPalo = sumVisible(ms, "gol_del_palo_sup", hiddenSet);
			const sup = supMas + supPalo;

			const total = boya + lanzamiento + dir5m + contra + penalti + sup;
			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				xLabel: `${match.id}-${index}`,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString(locale),

				boya,
				lanzamiento,
				dir5m,
				contra,
				penalti,
				supMas,
				supPalo,
				sup,
				total
			};
		});
	}, [sortedMatches, stats, hiddenSet, locale]);

	const jornadaByXLabel = useMemo(() => {
		return new Map(matchData.map((item) => [item.xLabel, item.jornada]));
	}, [matchData]);

	const partidos = matchData.length;

	const totals = useMemo(() => {
		const boya = matchData.reduce((sum, m) => sum + m.boya, 0);
		const lanzamiento = matchData.reduce((sum, m) => sum + m.lanzamiento, 0);
		const dir5m = matchData.reduce((sum, m) => sum + m.dir5m, 0);
		const contra = matchData.reduce((sum, m) => sum + m.contra, 0);
		const penalti = matchData.reduce((sum, m) => sum + m.penalti, 0);
		const supMas = matchData.reduce((sum, m) => sum + m.supMas, 0);
		const supPalo = matchData.reduce((sum, m) => sum + m.supPalo, 0);
		const sup = matchData.reduce((sum, m) => sum + m.sup, 0);
		const total = matchData.reduce((sum, m) => sum + m.total, 0);

		const parts = [
			showBoya && { key: "boya", label: t("buoyPlay"), value: boya, color: "hsla(145, 63%, 42%, 1.00)" },
			showLanzamiento && { key: "lanzamiento", label: t("shot"), value: lanzamiento, color: "hsla(25, 95%, 53%, 1.00)" },
			showDir5m && { key: "dir5m", label: t("direct6m"), value: dir5m, color: "hsla(221, 83%, 53%, 1.00)" },
			showContra && { key: "contra", label: t("counterattack"), value: contra, color: "hsla(190, 95%, 45%, 1.00)" },
			showPenalti && { key: "penalti", label: t("penalty"), value: penalti, color: "hsla(330, 78%, 58%, 1.00)" },
			showSupMas && { key: "supMas", label: t("powerPlayGoal"), value: supMas, color: "hsla(42, 96%, 55%, 1.00)" },
			showSupPalo && { key: "supPalo", label: t("powerPlayPostGoal"), value: supPalo, color: "hsla(48, 96%, 48%, 1.00)" }
		]
			.filter(Boolean)
			.map((p: any) => ({
				...p,
				pct: total > 0 ? Number(((p.value / total) * 100).toFixed(1)) : 0
			}));

		const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

		return { parts, topType, total, sup };
	}, [matchData, showBoya, showLanzamiento, showDir5m, showContra, showPenalti, showSupMas, showSupPalo, t]);

	const chartConfig = {
		...(showBoya && { boya: { label: t("buoyPlay"), color: "hsla(145, 63%, 42%, 1.00)" } }),
		...(showLanzamiento && { lanzamiento: { label: t("shot"), color: "hsla(25, 95%, 53%, 1.00)" } }),
		...(showDir5m && { dir5m: { label: t("direct6m"), color: "hsla(221, 83%, 53%, 1.00)" } }),
		...(showContra && { contra: { label: t("counterattack"), color: "hsla(190, 95%, 45%, 1.00)" } }),
		...(showPenalti && { penalti: { label: t("penalty"), color: "hsla(330, 78%, 58%, 1.00)" } }),
		...(showSupMas && { supMas: { label: t("powerPlayGoal"), color: "hsla(42, 96%, 55%, 1.00)" } }),
		...(showSupPalo && { supPalo: { label: t("powerPlayPostGoal"), color: "hsla(48, 96%, 48%, 1.00)" } })
	};

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title={t("goalsTitle")}
			description={t("summary", { count: partidos, total: totals.total, top: totals.topType?.label ?? "—" })}
			icon={<Goal className="w-5 h-5" />}
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
										dataKey="xLabel"
										fontSize={12}
										tickMargin={8}
										axisLine={false}
										tickLine={false}
										interval="preserveStartEnd"
										minTickGap={18}
										tickFormatter={(value) => jornadaByXLabel.get(String(value)) ?? ""}
									/>

									<YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />

									<ChartTooltip
										content={
											<ChartTooltipContent
												labelFormatter={(_, payload) => {
													const p = payload?.[0]?.payload;
													if (!p) return "";
											return t("tooltip", { round: p.jornada, opponent: p.rival, date: p.fullDate, total: p.total });
												}}
											/>
										}
									/>

									<Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12 }} />

									{showBoya && (
										<Bar dataKey="boya" name={t("buoyPlay")} stackId="goals" fill="var(--color-boya)" radius={[4, 4, 0, 0]} />
									)}
									{showLanzamiento && (
										<Bar dataKey="lanzamiento" name={t("shot")} stackId="goals" fill="var(--color-lanzamiento)" />
									)}
									{showDir5m && <Bar dataKey="dir5m" name={t("direct6m")} stackId="goals" fill="var(--color-dir5m)" />}
									{showContra && <Bar dataKey="contra" name={t("counterattack")} stackId="goals" fill="var(--color-contra)" />}
									{showPenalti && <Bar dataKey="penalti" name={t("penalty")} stackId="goals" fill="var(--color-penalti)" />}
									{showSupMas && <Bar dataKey="supMas" name={t("powerPlayGoal")} stackId="goals" fill="var(--color-supMas)" />}
									{showSupPalo && <Bar dataKey="supPalo" name={t("powerPlayPostGoal")} stackId="goals" fill="var(--color-supPalo)" />}
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
										<TableHead className="w-[90px]">{t("round")}</TableHead>
										<TableHead>{t("opponent")}</TableHead>
										{showBoya && <TableHead className="text-right">{t("buoyShort")}</TableHead>}
										{showLanzamiento && <TableHead className="text-right">{t("shotShort")}</TableHead>}
										{showDir5m && <TableHead className="text-right">{t("direct6mShort")}</TableHead>}
										{showContra && <TableHead className="text-right">{t("counterattackShort")}</TableHead>}
										{showPenalti && <TableHead className="text-right">{t("penaltyShort")}</TableHead>}
										{showSupMas && <TableHead className="text-right">{t("powerPlayShort")}</TableHead>}
										{showSupPalo && <TableHead className="text-right">{t("powerPlayPostShort")}</TableHead>}
										<TableHead className="text-right">{t("total")}</TableHead>
										<TableHead className="text-right hidden lg:table-cell">{t("date")}</TableHead>
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
											{showBoya && <TableCell className="text-right tabular-nums">{m.boya}</TableCell>}
											{showLanzamiento && <TableCell className="text-right tabular-nums">{m.lanzamiento}</TableCell>}
											{showDir5m && <TableCell className="text-right tabular-nums">{m.dir5m}</TableCell>}
											{showContra && <TableCell className="text-right tabular-nums">{m.contra}</TableCell>}
											{showPenalti && <TableCell className="text-right tabular-nums">{m.penalti}</TableCell>}
											{showSupMas && <TableCell className="text-right tabular-nums">{m.supMas}</TableCell>}
											{showSupPalo && <TableCell className="text-right tabular-nums">{m.supPalo}</TableCell>}
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
								{t("matches", { count: partidos })}
							</span>
							<div className="flex flex-wrap gap-2">
								{totals.parts.map((p) => (
									<span key={p.key} className="rounded-md border bg-card px-2 py-1">
										{p.label}: <span className="font-semibold text-foreground">{p.value}</span>
									</span>
								))}
								<span className="rounded-md border bg-card px-2 py-1">
									{t("total")}: <span className="font-semibold text-foreground">{totals.total}</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
