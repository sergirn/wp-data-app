"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BarChart3, Table2, Loader2, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Player, MatchStats, Match } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { useStatWeights } from "@/hooks/useStatWeights";
import { useLocale, useTranslations } from "next-intl";
import { getGoalkeeperDerived } from "@/lib/stats/goalkeeperStatsHelpers";
import { getPlayerDerived } from "@/lib/stats/playerStatsHelpers";

type ViewMode = "chart" | "table";
type MatchStatsWithMatch = MatchStats & { matches: Match };

function computeWeightedScore(row: object, weights: Record<string, number>): number {
	let score = 0;
	const values = row as Record<string, unknown>;
	for (const [key, weightRaw] of Object.entries(weights)) {
		const weight = Number(weightRaw);
		const value = Number(values[key] ?? 0);
		if (Number.isFinite(weight) && Number.isFinite(value)) score += value * weight;
	}
	return Math.round(score);
}

const formatDate = (d: string | undefined, locale: string) =>
	d ? new Date(d).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" }) : "";

export function PerformanceEvolutionChart({ matchStats, player, hiddenStats }: { matchStats: MatchStatsWithMatch[]; player: Player; hiddenStats?: string[] | Set<string> }) {
	const [view, setView] = useState<ViewMode>("chart");
	const t = useTranslations("Evolution");
	const locale = useLocale();
	const { weights, loaded } = useStatWeights();
	const hasWeights = loaded && Object.keys(weights).length > 0;

	const data = useMemo(() => {
		const arr = Array.isArray(matchStats) ? matchStats : [];
		const sorted = [...arr].sort((a, b) => {
			const da = new Date(a?.matches?.match_date ?? 0).getTime();
			const db = new Date(b?.matches?.match_date ?? 0).getTime();
			return da - db;
		});

		const rows = sorted.map((stat, idx) => {
			const match = stat.matches;
			const puntos = hasWeights ? computeWeightedScore(stat, weights) : 0;
			const jornada = match?.jornada ?? idx + 1;
			const roleMetrics = player.is_goalkeeper
				? (() => {
					const derived = getGoalkeeperDerived(stat, hiddenStats);
					return { primary: derived.saves, secondary: derived.goalsConceded, efficiency: derived.savePct };
				})()
				: (() => {
					const derived = getPlayerDerived(stat, hiddenStats);
					return { primary: derived.goals, secondary: derived.assists, efficiency: derived.efficiency };
				})();
			return {
				match: String(jornada),
				opponent: match?.opponent ?? "—",
				date: formatDate(match?.match_date, locale),
				puntos,
				...roleMetrics
			};
		});

		return rows.map((row, index) => {
			const elapsed = rows.slice(0, index + 1);
			const recent = rows.slice(Math.max(0, index - 2), index + 1);
			return {
				...row,
				mediaPuntos: elapsed.reduce((total, item) => total + item.puntos, 0) / elapsed.length,
				rollingEfficiency: recent.reduce((total, item) => total + item.efficiency, 0) / recent.length
			};
		});
	}, [matchStats, hasWeights, weights, locale, player.is_goalkeeper, hiddenStats]);

	const avgPts = useMemo(() => {
		if (!data.length) return "0.0";
		const v = data.reduce((sum, item) => sum + (Number(item.puntos) || 0), 0) / data.length;
		return v.toFixed(1);
	}, [data]);

	if (!matchStats?.length) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">{t("noData")}</p>
				</CardContent>
			</Card>
		);
	}

	const HeaderSwitch = (
		<div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
			<BarChart3 className={`h-4 w-4 ${view === "chart" ? "text-foreground" : "text-muted-foreground"}`} />
			<Switch checked={view === "table"} onCheckedChange={(v) => setView(v ? "table" : "chart")} aria-label={t("switchView")} />
			<Table2 className={`h-4 w-4 ${view === "table" ? "text-foreground" : "text-muted-foreground"}`} />
		</div>
	);

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden rounded-2xl">
				<CardHeader className="space-y-1 pb-3">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<CardTitle>{t("title")}</CardTitle>
							<CardDescription className="truncate">
								{t("description")} · <span className="font-medium text-foreground">{t("finalAverage")} {avgPts} {t("pointsAbbr")}</span>
							</CardDescription>
						</div>
						{HeaderSwitch}
					</div>

					{!loaded ? (
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							{t("loadingRatings")}
						</div>
					) : null}

					{loaded && !hasWeights ? (
						<div className="text-xs text-muted-foreground">{t("configureRatings")}</div>
					) : null}
				</CardHeader>

				<CardContent className="min-w-0 w-full overflow-hidden px-3 pb-4 sm:px-5">
					{view === "chart" ? (
						<div className="h-[250px] w-full sm:h-[280px]">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
									<CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
									<XAxis
										dataKey="match"
										tick={{ fill: "currentColor", fontSize: 11 }}
										axisLine={false}
										tickLine={false}
									/>
									<YAxis
										tick={{ fill: "currentColor", fontSize: 11 }}
										axisLine={false}
										tickLine={false}
										domain={["auto", "auto"]}
									/>

									<Tooltip
										cursor={{ stroke: "hsl(var(--border))" }}
										content={({ active, payload, label }) => {
											if (!active || !payload?.length) return null;
											const p = payload[0]?.payload as (typeof data)[number] | undefined;
											return (
												<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
													<div className="text-xs text-muted-foreground">
														{p ? `${p.match} - ${p.opponent} (${p.date})` : String(label)}
													</div>
													<div className="mt-1 text-sm font-semibold tabular-nums flex items-center gap-1.5">
														<TrendingUp className="h-4 w-4 text-muted-foreground" />
											{p?.puntos ?? 0} {t("pointsAbbr")}
													</div>
													<div className="text-xs text-muted-foreground">
											{t("cumulativeAverage", { value: Number(p?.mediaPuntos ?? 0).toFixed(1) })}
													</div>
												</div>
											);
										}}
									/>

									<Legend wrapperStyle={{ color: "currentcolor", fontSize: 11 }} />
									<Line
										type="monotone"
										dataKey="puntos"
										stroke="#2563eb"
										strokeWidth={2.5}
										dot={{ r: 3, fill: "var(--card)", stroke: "#2563eb", strokeWidth: 2 }}
										activeDot={{ r: 5, fill: "#2563eb", stroke: "var(--card)", strokeWidth: 2 }}
										isAnimationActive={false}
										connectNulls
									name={t("points")}
									/>

									<Line
										type="monotone"
										dataKey="mediaPuntos"
										stroke="#f59e0b"
										strokeWidth={2}
										strokeDasharray="6 5"
										dot={false}
										isAnimationActive={false}
									name={t("cumulativeAverageLabel")}
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
										<TableHead className="w-[90px]">{t("round")}</TableHead>
										<TableHead>{t("opponent")}</TableHead>
										<TableHead className="text-right">{t("pointsAbbr")}</TableHead>
										<TableHead className="text-right">{t("average")}</TableHead>
										<TableHead className="text-right hidden lg:table-cell">{t("date")}</TableHead>
											</TableRow>
										</UITableHeader>

										<TableBody>
											{data.map((m, idx) => (
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
										{t("matches", { count: data.length })}
									</span>

									<span className="rounded-md border bg-card px-2 py-1">
									{t("finalAverage")} <span className="font-semibold text-foreground tabular-nums">{avgPts}</span>
									</span>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{view === "chart" && (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card className="overflow-hidden rounded-2xl">
						<CardHeader className="pb-2"><CardTitle className="text-base">{t("production.title")}</CardTitle><CardDescription>{t(player.is_goalkeeper ? "production.goalkeeperDescription" : "production.playerDescription")}</CardDescription></CardHeader>
						<CardContent className="px-3 pb-4 sm:px-5"><div className="h-[220px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.45} /><XAxis dataKey="match" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }} labelFormatter={(label) => t("roundValue", { value: String(label) })} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="primary" name={t(player.is_goalkeeper ? "production.saves" : "production.goals")} fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={28} /><Bar dataKey="secondary" name={t(player.is_goalkeeper ? "production.conceded" : "production.assists")} fill="#14b8a6" radius={[5, 5, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div></CardContent>
					</Card>

					<Card className="overflow-hidden rounded-2xl">
						<CardHeader className="pb-2"><CardTitle className="text-base">{t("efficiency.title")}</CardTitle><CardDescription>{t(player.is_goalkeeper ? "efficiency.goalkeeperDescription" : "efficiency.playerDescription")}</CardDescription></CardHeader>
						<CardContent className="px-3 pb-4 sm:px-5"><div className="h-[220px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id={`efficiency-${player.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.28} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.45} /><XAxis dataKey="match" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={32} unit="%" /><Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }} formatter={(value, name) => [`${Number(value).toFixed(1)}%`, String(name)]} labelFormatter={(label) => t("roundValue", { value: String(label) })} /><Legend wrapperStyle={{ fontSize: 11 }} /><Area type="monotone" dataKey="efficiency" name={t("efficiency.match")} stroke="#8b5cf6" strokeWidth={2.5} fill={`url(#efficiency-${player.id})`} dot={{ r: 2.5 }} /><Line type="monotone" dataKey="rollingEfficiency" name={t("efficiency.rolling")} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={false} /></AreaChart></ResponsiveContainer></div></CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
