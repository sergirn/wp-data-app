"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface DefenseActionsByMatchChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function DefenseActionsByMatchChart({ matches, stats, hiddenStats = [] }: DefenseActionsByMatchChartProps) {
	const locale = useLocale();
	const t = useTranslations("DefenseAnalyticsCharts");
	const common = useTranslations("AnalyticsCommon");
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const showBloqueos = !hiddenSet.has("acciones_bloqueo");
	const showRecuperaciones = !hiddenSet.has("acciones_recuperacion");
	const showRebotes = !hiddenSet.has("acciones_rebote");
	const showRecibeGol = !hiddenSet.has("acciones_recibir_gol");

	const visibleSeriesCount = [showBloqueos, showRecuperaciones, showRebotes, showRecibeGol].filter(Boolean).length;

	const matchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			return new Date(a?.match_date).getTime() - new Date(b?.match_date).getTime();
		});

		return sorted.map((match: any, index: number) => {
			const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

			const bloqueos = showBloqueos ? ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_bloqueo), 0) : 0;
			const recuperaciones = showRecuperaciones ? ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_recuperacion), 0) : 0;
			const rebotes = showRebotes ? ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_rebote), 0) : 0;
			const recibeGol = showRecibeGol ? ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_recibir_gol), 0) : 0;

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				xLabel: `${match.id}-${index}`,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString(locale),
				bloqueos,
				recuperaciones,
				recibeGol,
				rebotes,
				total: bloqueos + recuperaciones + recibeGol + rebotes
			};
		});
	}, [matches, stats, showBloqueos, showRecuperaciones, showRebotes, showRecibeGol, locale]);

	const jornadaByXLabel = useMemo(() => {
		return new Map(matchData.map((item) => [item.xLabel, item.jornada]));
	}, [matchData]);

	const totalBloqueos = useMemo(() => (showBloqueos ? matchData.reduce((sum, m) => sum + m.bloqueos, 0) : 0), [matchData, showBloqueos]);

	const totalRecuperaciones = useMemo(
		() => (showRecuperaciones ? matchData.reduce((sum, m) => sum + m.recuperaciones, 0) : 0),
		[matchData, showRecuperaciones]
	);

	const totalRebotes = useMemo(() => (showRebotes ? matchData.reduce((sum, m) => sum + m.rebotes, 0) : 0), [matchData, showRebotes]);

	const totalRecibeGol = useMemo(() => (showRecibeGol ? matchData.reduce((sum, m) => sum + m.recibeGol, 0) : 0), [matchData, showRecibeGol]);

	const totalVisible = useMemo(() => matchData.reduce((sum, m) => sum + m.total, 0), [matchData]);

	const chartConfig = useMemo(() => {
		const config: Record<string, { label: string; color: string }> = {};

		if (showBloqueos) {
			config.bloqueos = { label: t("blocks"), color: "hsla(221, 83%, 53%, 1.00)" };
		}
		if (showRecuperaciones) {
			config.recuperaciones = { label: t("recoveries"), color: "hsla(145, 63%, 42%, 1.00)" };
		}
		if (showRebotes) {
			config.rebotes = { label: t("rebounds"), color: "hsla(42, 96%, 55%, 1.00)" };
		}
		if (showRecibeGol) {
			config.recibeGol = { label: t("goalConceded"), color: "hsla(0, 84%, 60%, 1.00)" };
		}

		return config;
	}, [showBloqueos, showRecuperaciones, showRebotes, showRecibeGol, t]);

	if (!matchData.length || visibleSeriesCount === 0) return null;

	return (
		<ExpandableChartCard
			title={t("actionsTitle")}
			description={t("actionsDescription", { count: matchData.length, total: totalVisible })}
			icon={<ShieldCheck className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{matchData.length} pj</span>}
			renderChart={() => (
				<ChartContainer config={chartConfig} className="w-full h-full">
					<ResponsiveContainer width="100%" height="120%">
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
											return p ? `${p.jornada} · vs ${p.rival} · ${p.fullDate}` : "";
										}}
									/>
								}
							/>

							<Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: 12 }} />

							{showBloqueos && <Bar dataKey="bloqueos" stackId="a" fill="var(--color-bloqueos)" radius={[4, 4, 0, 0]} />}

							{showRecuperaciones && (
								<Bar dataKey="recuperaciones" stackId="a" fill="var(--color-recuperaciones)" radius={[4, 4, 0, 0]} />
							)}

							{showRebotes && <Bar dataKey="rebotes" stackId="a" fill="var(--color-rebotes)" radius={[4, 4, 0, 0]} />}

							{showRecibeGol && <Bar dataKey="recibeGol" stackId="a" fill="var(--color-recibeGol)" radius={[4, 4, 0, 0]} />}
						</ComposedChart>
					</ResponsiveContainer>
					<br />
				</ChartContainer>
			)}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[900px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>{common("round")}</TableHead>
										<TableHead>{common("opponent")}</TableHead>
										{showBloqueos && <TableHead className="text-right">{t("blocks")}</TableHead>}
										{showRecuperaciones && <TableHead className="text-right">{t("recoveries")}</TableHead>}
										{showRebotes && <TableHead className="text-right">{t("rebounds")}</TableHead>}
										{showRecibeGol && <TableHead className="text-right">{t("goalConceded")}</TableHead>}
										<TableHead className="text-right">{common("total")}</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											{showBloqueos && <TableCell className="text-right tabular-nums">{m.bloqueos}</TableCell>}
											{showRecuperaciones && <TableCell className="text-right tabular-nums">{m.recuperaciones}</TableCell>}
											{showRebotes && <TableCell className="text-right tabular-nums">{m.rebotes}</TableCell>}
											{showRecibeGol && <TableCell className="text-right tabular-nums">{m.recibeGol}</TableCell>}
											<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>

					<div className="border-t bg-muted/20 px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
							<span>
								{common("matches", { count: matchData.length })}
							</span>

							<div className="flex flex-wrap gap-2">
								{showBloqueos && (
									<span className="rounded-md border bg-card px-2 py-1">
										{t("blocks")}: <span className="font-semibold text-foreground">{totalBloqueos}</span>
									</span>
								)}
								{showRecuperaciones && (
									<span className="rounded-md border bg-card px-2 py-1">
										{t("recoveries")}: <span className="font-semibold text-foreground">{totalRecuperaciones}</span>
									</span>
								)}
								{showRebotes && (
									<span className="rounded-md border bg-card px-2 py-1">
										{t("rebounds")}: <span className="font-semibold text-foreground">{totalRebotes}</span>
									</span>
								)}
								{showRecibeGol && (
									<span className="rounded-md border bg-card px-2 py-1">
										{t("goalConceded")}: <span className="font-semibold text-foreground">{totalRecibeGol}</span>
									</span>
								)}
								<span className="rounded-md border bg-card px-2 py-1">
									{t("visibleTotal")}: <span className="font-semibold text-foreground">{totalVisible}</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
