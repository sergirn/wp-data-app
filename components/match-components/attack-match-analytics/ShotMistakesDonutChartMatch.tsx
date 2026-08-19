"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { buildShotMistakesMatchData } from "@/lib/helpers/chartMistakeShootHelper";
import { useLocale, useTranslations } from "next-intl";

type PlayerLiteInput = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
};

type MatchLite = {
	id: number;
	opponent?: string | null;
	match_date?: string | null;
	jornada?: number | null;
};

interface ShotMistakesDonutChartMatchProps {
	match: MatchLite | null;
	stats: any[];
	players: PlayerLiteInput[];
	hiddenStats?: string[];
}

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

function DonutCenter({ title, value }: { title: string; value: React.ReactNode }) {
	return (
		<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
			<div className="rounded-full px-5 py-6 shadow-sm text-center min-w-[100px]">
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

export function ShotMistakesDonutChartMatch({
	match,
	stats,
	players,
	hiddenStats = []
}: ShotMistakesDonutChartMatchProps) {
	const t = useTranslations("MatchCharts");
	const locale = useLocale();
	const playersById = useMemo(() => {
		const m = new Map<number, { id: number; name: string; number?: number | null; photo_url?: string | null }>();

		(players ?? []).forEach((p) => {
			const candidate = (p.name ?? p.full_name ?? "").trim();

			m.set(p.id, {
				id: p.id,
				name: candidate.length ? candidate : t("playerFallback", { id: p.id }),
				number: p.number ?? null,
				photo_url: p.photo_url ?? null
			});
		});

		return m;
	}, [players, t]);

	const data = useMemo(
		() => buildShotMistakesMatchData(match, stats ?? [], playersById, { hiddenStats }),
		[match, stats, playersById, hiddenStats]
	);

	if (!data?.summary?.total) return null;
	const labelByKey: Record<string, string> = {
		pen: t("penaltyMissed"), corner: t("corner"), out: t("out"), palo: t("post"),
		saved: t("saved"), blocked: t("blocked"), sup: t("powerPlayMiss")
	};
	const parts = data.summary.parts.map((part) => ({ ...part, label: labelByKey[part.key] ?? part.label }));
	const topType = data.summary.topType ? { ...data.summary.topType, label: labelByKey[data.summary.topType.key] ?? data.summary.topType.label } : null;

	const jornada = match?.jornada ? `J${match.jornada}` : t("match");
	const rival = match?.opponent ?? "—";
	const fecha = match?.match_date ? new Date(match.match_date).toLocaleDateString(locale) : "—";

	return (
		<ExpandableChartCard
			title={t("shotMistakesTitle")}
			description={t("shootingDescription", { round: jornada, opponent: rival, date: fecha })}
			icon={<Target className="w-5 h-5" />}
			className="h-full from-transparent"
			rightHeader={<span className="text-xs text-muted-foreground">{topType?.label ?? "—"}</span>}
			renderChart={({ compact }) => {
				const outer = compact ? 66 : 116;
				const inner = compact ? 42 : 74;

				return (
					<div className="w-full">
						<div className={`grid gap-5 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[1.05fr_1fr]"}`}>
							<div className="relative">
								<div className={`${compact ? "h-[180px]" : "h-[320px]"} w-full rounded-2xl border border-border/60 bg-card/30 p-2`}>
									<ChartContainer
										config={Object.fromEntries(
										parts.map((p) => [p.key, { label: p.label, color: p.color }])
										)}
										className="w-full h-full"
									>
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
											data={parts}
													dataKey="value"
													nameKey="label"
													cx="50%"
													cy="50%"
													innerRadius={inner}
													outerRadius={outer}
													paddingAngle={2}
													stroke="transparent"
												>
											{parts.map((p) => (
														<Cell key={p.key} fill={p.color} />
													))}
												</Pie>
												<RechartsTooltip content={<CustomTooltip total={data.summary.total} />} />
											</PieChart>
										</ResponsiveContainer>
									</ChartContainer>

									<DonutCenter
									title={t("misses")}
										value={data.summary.total}
									/>
								</div>
							</div>

							{!compact ? <div className="space-y-4">
								<div className="flex flex-wrap gap-2">
									<TinyPill>
									{t("total")} <span className="ml-1 font-semibold text-foreground tabular-nums">{data.summary.total}</span>
									</TinyPill>
								{topType ? (
										<TinyPill>
										{t("topType")} <span className="ml-1 font-semibold text-foreground">{topType.label}</span>
										</TinyPill>
									) : null}
									<TinyPill>
									{t("match")} <span className="ml-1 font-semibold text-foreground">{jornada}</span>
									</TinyPill>
								</div>

								<div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm">
									<div className="flex items-center justify-between gap-3 mb-3">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("distribution")}</p>
										<Badge variant="outline" className="bg-background/70 text-[11px]">
										{t("typesCount", { count: parts.length })}
										</Badge>
									</div>

									<div className="space-y-2">
								{parts.map((p) => (
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


							</div> : null}
						</div>
					</div>
				);
			}}
			renderTable={() => (
				<div className="rounded-3xl border border-border/60 bg-card/40 overflow-hidden">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-4">
						<div className="min-w-0">
							<p className="text-sm font-semibold">{t("shotMistakeDetail")}</p>
							<p className="text-xs text-muted-foreground">
								{jornada} · {rival} · {fecha}
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
								{t("total")} {data.summary.total}
							</Badge>
							{topType ? (
								<Badge variant="outline" className="bg-background/70 text-[11px]">
									{t("top", { label: topType.label })}
								</Badge>
							) : null}
						</div>
					</div>

					<div className="p-4 space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
						{parts.map((p) => (
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
										<TableHead className="w-[90px]">{t("round")}</TableHead>
										<TableHead>{t("opponent")}</TableHead>
										{data.perMatch[0]?.pen !== undefined && <TableHead className="text-right">{t("penalty")}</TableHead>}
										{data.perMatch[0]?.corner !== undefined && <TableHead className="text-right">{t("corner")}</TableHead>}
										{data.perMatch[0]?.out !== undefined && <TableHead className="text-right">{t("out")}</TableHead>}
										{data.perMatch[0]?.palo !== undefined && <TableHead className="text-right">{t("post")}</TableHead>}
										{data.perMatch[0]?.saved !== undefined && <TableHead className="text-right">{t("saved")}</TableHead>}
										{data.perMatch[0]?.blocked !== undefined && <TableHead className="text-right">{t("blockedShort")}</TableHead>}
										{data.perMatch[0]?.sup !== undefined && <TableHead className="text-right">{t("powerPlayShort")}</TableHead>}
										<TableHead className="text-right">{t("total")}</TableHead>
										<TableHead className="text-right hidden lg:table-cell">{t("date")}</TableHead>
											</TableRow>
										</UITableHeader>

										<TableBody>
											{data.perMatch.map((m, idx) => (
												<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
													<TableCell className="font-semibold">{m.jornada}</TableCell>

													<TableCell className="max-w-[280px]">
														<div className="min-w-0">
															<p className="font-medium truncate">{m.rival}</p>
															<p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
														</div>
													</TableCell>

													<TableCell className="text-right tabular-nums">
														{m.pen} <span className="text-xs text-muted-foreground">({fmtPct(m.penPct)})</span>
													</TableCell>
													<TableCell className="text-right tabular-nums">
														{m.corner} <span className="text-xs text-muted-foreground">({fmtPct(m.cornerPct)})</span>
													</TableCell>
													<TableCell className="text-right tabular-nums">
														{m.out} <span className="text-xs text-muted-foreground">({fmtPct(m.outPct)})</span>
													</TableCell>
													<TableCell className="text-right tabular-nums">
														{m.palo} <span className="text-xs text-muted-foreground">({fmtPct(m.paloPct)})</span>
													</TableCell>
													<TableCell className="text-right tabular-nums">
														{m.saved} <span className="text-xs text-muted-foreground">({fmtPct(m.savedPct)})</span>
													</TableCell>
													<TableCell className="text-right tabular-nums">
														{m.blocked} <span className="text-xs text-muted-foreground">({fmtPct(m.blockedPct)})</span>
													</TableCell>
													<TableCell className="text-right tabular-nums">
														{m.sup} <span className="text-xs text-muted-foreground">({fmtPct(m.supPct)})</span>
													</TableCell>

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
							{topType && topType.pct >= 40 ? (
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
								<p className="text-sm font-semibold">{t("conclusion")}</p>
									<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
									{topType
										? t("shotMistakeConclusion", { type: topType.label, value: topType.value, percentage: fmtPct(topType.pct) })
										: t("noConclusion")}
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
