"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	Legend,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from "recharts";
import { Activity, Crosshair, Hand, Shield, ShieldCheck, Sparkles, Target, TrendingUp, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { accumulatePlayerStats, getPlayerDerived, getPlayerSummary } from "@/lib/stats/playerStatsHelpers";
import { accumulateGoalkeeperStats, getGoalkeeperDerived, getGoalkeeperSummary } from "@/lib/stats/goalkeeperStatsHelpers";
import { buildInferiorityBreakdown, buildInferiorityConversionData } from "@/lib/helpers/chartHelpers";
import { buildGoalkeeperGoalsAgainstSummary, buildGoalkeeperSavesSummary } from "@/lib/helpers/chartGoalkeeperBreakdownHelper";
import { FIELD_GOAL_ACTIONS, GOALKEEPER_CONCEDED_ACTIONS, GOALKEEPER_SCORED_ACTIONS } from "@/lib/matches/calculate-match-score";
import type { MatchAction, MatchStats, MatchWithQuarterScores } from "@/lib/types";

type Phase = "attack" | "defense" | "goalkeeper";

type PlayerLite = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
	is_goalkeeper?: boolean;
};

type MatchStatRow = MatchStats & {
	players?: PlayerLite | null;
	[key: string]: unknown;
};

type MatchVisualDashboardProps = {
	phase: Phase;
	matchStats: MatchStatRow[];
	players: PlayerLite[];
	hiddenStats?: string[];
};

const ATTACK_COLORS = ["#ef4444", "#f97316", "#eab308", "#8b5cf6", "#06b6d4", "#22c55e"];
const DEFENSE_COLOR = "#10b981";
const DANGER_COLOR = "#ef4444";
const MUTED_COLOR = "#64748b";
const TOOLTIP_STYLE = {
	backgroundColor: "var(--popover)",
	border: "1px solid var(--border)",
	borderRadius: "12px",
	boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18)",
	color: "var(--popover-foreground)"
};

function number(value: unknown) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value: number, total: number) {
	return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function VisualCard({
	title,
	description,
	icon,
	children,
	className
}: {
	title: string;
	description?: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("min-w-0 overflow-hidden rounded-2xl border bg-card/55 shadow-sm", className)}>
			<header className="flex items-start gap-3 border-b bg-muted/15 px-4 py-3.5">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm">{icon}</span>
				<div className="min-w-0">
					<h4 className="text-sm font-semibold tracking-tight">{title}</h4>
					{description ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
				</div>
			</header>
			<div className="p-4">{children}</div>
		</section>
	);
}

function RingMetric({ value, label, detail, tone = "emerald" }: { value: number; label: string; detail: string; tone?: "emerald" | "amber" | "red" }) {
	const color = tone === "emerald" ? "#10b981" : tone === "amber" ? "#f59e0b" : "#ef4444";
	const safeValue = Math.max(0, Math.min(100, value));
	return (
		<div className="flex items-center gap-4">
			<div className="relative size-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${color} ${safeValue * 3.6}deg, rgba(100, 116, 139, 0.16) 0deg)` }}>
				<div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full border bg-card shadow-inner">
					<span className="text-2xl font-bold tabular-nums">{safeValue}%</span>
					<span className="text-[10px] text-muted-foreground">{label}</span>
				</div>
			</div>
			<p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
		</div>
	);
}

function RankedBars({ rows, empty }: { rows: Array<{ label: string; value: number; color?: string; detail?: string }>; empty: string }) {
	const visibleRows = rows.filter((row) => row.value > 0);
	const max = Math.max(...visibleRows.map((row) => row.value), 1);
	if (visibleRows.length === 0) return <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">{empty}</div>;

	return (
		<div className="space-y-3">
			{visibleRows.map((row) => (
				<div key={row.label}>
					<div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
						<span className="min-w-0 truncate font-medium">{row.label}</span>
						<span className="shrink-0 font-semibold tabular-nums">{row.value}{row.detail ? <span className="ml-1 font-normal text-muted-foreground">{row.detail}</span> : null}</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-muted">
						<div className="h-full rounded-full transition-[width]" style={{ width: `${Math.max((row.value / max) * 100, 4)}%`, backgroundColor: row.color ?? "hsl(var(--primary))" }} />
					</div>
				</div>
			))}
		</div>
	);
}

function MetricTile({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "good" | "bad" | "neutral" }) {
	return (
		<div className={cn("rounded-xl border bg-background/60 p-3", tone === "good" && "border-emerald-500/20 bg-emerald-500/[0.05]", tone === "bad" && "border-red-500/20 bg-red-500/[0.05]")}>
		<p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
		<p className={cn("mt-1 text-xl font-bold tabular-nums", tone === "good" && "text-emerald-600 dark:text-emerald-400", tone === "bad" && "text-red-600 dark:text-red-400")}>{value}</p>
		{hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

function AttackDashboard({ matchStats, hiddenStats = [] }: Omit<MatchVisualDashboardProps, "phase" | "players">) {
	const t = useTranslations("MatchVisualDashboard");
	const totals = useMemo(() => accumulatePlayerStats(matchStats, hiddenStats), [matchStats, hiddenStats]);
	const summary = useMemo(() => getPlayerSummary(totals, hiddenStats), [totals, hiddenStats]);
	const hidden = useMemo(() => new Set(hiddenStats), [hiddenStats]);
	const read = (key: string) => (hidden.has(key) ? 0 : number(totals[key]));

	const goalRoutes = [
		{ label: t("attack.routes.center"), value: read("goles_boya_jugada"), color: ATTACK_COLORS[0] },
		{ label: t("attack.routes.powerPlay"), value: read("goles_hombre_mas") + read("gol_del_palo_sup"), color: ATTACK_COLORS[1] },
		{ label: t("attack.routes.perimeter"), value: read("goles_lanzamiento"), color: ATTACK_COLORS[2] },
		{ label: t("attack.routes.direct"), value: read("goles_dir_mas_5m"), color: ATTACK_COLORS[3] },
		{ label: t("attack.routes.counter"), value: read("goles_contraataque"), color: ATTACK_COLORS[4] },
		{ label: t("attack.routes.penalty"), value: read("goles_penalti_anotado"), color: ATTACK_COLORS[5] }
	];
	const missParts = [
		{ label: t("attack.outcomes.saved"), value: read("tiros_parados"), color: "#64748b" },
		{ label: t("attack.outcomes.out"), value: read("tiros_fuera"), color: "#94a3b8" },
		{ label: t("attack.outcomes.blocked"), value: read("tiros_bloqueado"), color: "#475569" },
		{ label: t("attack.outcomes.post"), value: read("tiro_palo"), color: "#f59e0b" },
		{ label: t("attack.outcomes.penaltyMiss"), value: read("tiros_penalti_fallado"), color: "#a855f7" }
	];
	const identifiedMisses = missParts.reduce((sum, item) => sum + item.value, 0);
	const otherMisses = Math.max(0, summary.shots - summary.goals - identifiedMisses);
	const outcomeBreakdown = [
		{ label: t("attack.outcomes.goals"), value: summary.goals, color: "#10b981" },
		...missParts,
		...(otherMisses > 0 ? [{ label: t("attack.outcomes.other"), value: otherMisses, color: "#cbd5e1" }] : [])
	].filter((item) => item.value > 0);
	const missedShots = Math.max(0, summary.shots - summary.goals);

	return (
		<div className="grid gap-4 xl:grid-cols-12">
			<VisualCard title={t("attack.finishingTitle")} description={t("attack.finishingDescription")} icon={<Crosshair className="size-4" />} className="xl:col-span-7">
				<div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-stretch">
					<div className="flex flex-col justify-between rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.09] via-background to-background p-4">
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("attack.shotConversion")}</p>
							<p className="mt-2 text-4xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{summary.efficiency}%</p>
							<p className="mt-1 text-xs text-muted-foreground">{t("attack.finishingDetail", { goals: summary.goals, shots: summary.shots })}</p>
						</div>
						<div className="mt-5 space-y-2">
							<div className="h-2 overflow-hidden rounded-full bg-muted">
								<div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${Math.min(summary.efficiency, 100)}%` }} />
							</div>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div><span className="block text-muted-foreground">{t("attempts")}</span><strong className="text-base tabular-nums">{summary.shots}</strong></div>
								<div><span className="block text-muted-foreground">{t("attack.missedShots")}</span><strong className="text-base tabular-nums">{missedShots}</strong></div>
							</div>
						</div>
					</div>

					{outcomeBreakdown.length > 0 ? (
						<div className="h-64 min-w-0 rounded-2xl border bg-muted/[0.08] px-2 py-3">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={outcomeBreakdown} layout="vertical" margin={{ top: 4, right: 34, bottom: 4, left: 8 }} barCategoryGap="24%">
									<CartesianGrid horizontal={false} opacity={0.16} />
									<XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
									<YAxis type="category" dataKey="label" width={88} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
									<Tooltip cursor={{ fill: "rgba(100, 116, 139, 0.08)" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "var(--popover-foreground)" }} />
									<Bar dataKey="value" name={t("attack.outcomeShare")} radius={[0, 7, 7, 0]} maxBarSize={22}>
										{outcomeBreakdown.map((item) => <Cell key={item.label} fill={item.color} />)}
										<LabelList dataKey="value" position="right" className="fill-foreground text-[10px] font-semibold" />
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					) : (
						<div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed bg-muted/10 text-sm text-muted-foreground">{t("noData")}</div>
					)}
				</div>
			</VisualCard>

			<VisualCard title={t("attack.powerPlayTitle")} description={t("attack.powerPlayDescription")} icon={<Sparkles className="size-4" />} className="xl:col-span-5">
				<RingMetric value={summary.superiority.efficiency} label={t("efficiencyShort")} detail={t("attack.powerPlayDetail", { goals: summary.superiority.goals, attempts: summary.superiority.attempts })} tone={summary.superiority.efficiency >= 45 ? "emerald" : summary.superiority.efficiency >= 25 ? "amber" : "red"} />
				<div className="mt-4 grid grid-cols-3 gap-2">
					<MetricTile label={t("goals")} value={summary.superiority.goals} />
					<MetricTile label={t("attempts")} value={summary.superiority.attempts} />
					<MetricTile label={t("rebounds")} value={`${summary.reboundsHM.recovered}/${summary.reboundsHM.lost}`} tone={summary.reboundsHM.balance >= 0 ? "good" : "bad"} />
				</div>
			</VisualCard>

			<VisualCard title={t("attack.routesTitle")} description={t("attack.routesDescription")} icon={<Target className="size-4" />} className="xl:col-span-7">
				<RankedBars rows={goalRoutes} empty={t("noData")} />
			</VisualCard>

			<VisualCard title={t("attack.creationTitle")} description={t("attack.creationDescription")} icon={<TrendingUp className="size-4" />} className="xl:col-span-5">
				<div className="grid grid-cols-2 gap-2">
					<MetricTile label={t("assists")} value={summary.assists} />
					<MetricTile label={t("recoveries")} value={summary.recoveries} />
					<MetricTile label={t("provokedExclusions")} value={summary.actions.provokedExclusions} />
					<MetricTile label={t("provokedPenalties")} value={summary.actions.provokedPenalties} />
				</div>
			</VisualCard>
		</div>
	);
}

function DefenseDashboard({ matchStats, players, hiddenStats = [] }: Omit<MatchVisualDashboardProps, "phase">) {
	const t = useTranslations("MatchVisualDashboard");
	const totals = useMemo(() => accumulatePlayerStats(matchStats, hiddenStats), [matchStats, hiddenStats]);
	const summary = useMemo(() => getPlayerSummary(totals, hiddenStats), [totals, hiddenStats]);
	const hidden = useMemo(() => new Set(hiddenStats), [hiddenStats]);
	const filteredRows = useMemo(() => matchStats.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, hidden.has(key) ? 0 : value]))), [matchStats, hidden]);
	const inferiority = useMemo(() => buildInferiorityConversionData(filteredRows), [filteredRows]);
	const inferiorityBreakdown = useMemo(() => buildInferiorityBreakdown(filteredRows), [filteredRows]);
	const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
	const defenders = useMemo(() => matchStats
		.filter((row) => !row?.players?.is_goalkeeper)
		.map((row) => {
			const derived = getPlayerDerived(row, hiddenStats);
			const player = row.players ?? playersById.get(number(row.player_id));
			return { name: player?.name ?? player?.full_name ?? t("playerFallback"), recoveries: derived.recoveries, blocks: derived.blocks, total: derived.recoveries + derived.blocks };
		})
		.filter((row) => row.total > 0)
		.sort((a, b) => b.total - a.total)
		.slice(0, 6), [matchStats, hiddenStats, playersById, t]);
	const possessionTotal = summary.recoveries + summary.losses;
	const recoveryShare = percent(summary.recoveries, possessionTotal);

	return (
		<div className="grid gap-4 xl:grid-cols-12">
			<VisualCard title={t("defense.possessionTitle")} description={t("defense.possessionDescription")} icon={<Activity className="size-4" />} className="xl:col-span-5">
				<div className="grid grid-cols-3 gap-2">
					<MetricTile label={t("recoveries")} value={summary.recoveries} tone="good" />
					<MetricTile label={t("losses")} value={summary.losses} tone="bad" />
					<MetricTile label={t("balance")} value={`${summary.recoveries - summary.losses >= 0 ? "+" : ""}${summary.recoveries - summary.losses}`} tone={summary.recoveries >= summary.losses ? "good" : "bad"} />
				</div>
				<div className="mt-5 overflow-hidden rounded-full bg-red-500/20">
					<div className="h-3 rounded-full bg-emerald-500" style={{ width: `${recoveryShare}%` }} />
				</div>
				<div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{t("defense.recoveryShare", { value: recoveryShare })}</span><span>{t("defense.lossShare", { value: Math.round((100 - recoveryShare) * 10) / 10 })}</span></div>
			</VisualCard>

			<VisualCard title={t("defense.inferiorityTitle")} description={t("defense.inferiorityDescription")} icon={<ShieldCheck className="size-4" />} className="xl:col-span-7">
				<div className="grid gap-4 lg:grid-cols-[180px_1fr] lg:items-center">
					<RingMetric value={inferiority.efficiency} label={t("efficiencyShort")} detail={t("defense.inferiorityDetail", { avoided: inferiority.missed, attempts: inferiority.attempts })} tone={inferiority.efficiency >= 60 ? "emerald" : inferiority.efficiency >= 40 ? "amber" : "red"} />
					<RankedBars rows={[
						{ label: t("saves"), value: inferiorityBreakdown.saves + inferiorityBreakdown.saveCornerInf, color: DEFENSE_COLOR },
						{ label: t("blocks"), value: inferiorityBreakdown.blocks, color: "#14b8a6" },
						{ label: t("outAndPost"), value: inferiorityBreakdown.out + inferiorityBreakdown.postInf, color: MUTED_COLOR },
						{ label: t("goalsConceded"), value: inferiority.scored + number(inferiority.scoredExtra), color: DANGER_COLOR }
					]} empty={t("noData")} />
				</div>
			</VisualCard>

			<VisualCard title={t("defense.leadersTitle")} description={t("defense.leadersDescription")} icon={<UsersRound className="size-4" />} className="xl:col-span-7">
				{defenders.length > 0 ? <div className="h-64">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={defenders} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
							<CartesianGrid horizontal={false} opacity={0.18} /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
							<YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
							<Tooltip cursor={{ fill: "rgba(100, 116, 139, 0.1)" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "var(--popover-foreground)" }} /><Legend wrapperStyle={{ fontSize: 11 }} />
							<Bar dataKey="recoveries" name={t("recoveries")} stackId="defense" fill="#10b981" radius={[4, 0, 0, 4]} />
							<Bar dataKey="blocks" name={t("blocks")} stackId="defense" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div> : <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">{t("noData")}</div>}
			</VisualCard>

			<VisualCard title={t("defense.activityTitle")} description={t("defense.activityDescription")} icon={<Shield className="size-4" />} className="xl:col-span-5">
				<div className="grid grid-cols-2 gap-2">
					<MetricTile label={t("blocks")} value={summary.blocks} />
					<MetricTile label={t("rebounds")} value={summary.rebounds} />
					<MetricTile label={t("provokedExclusions")} value={summary.actions.provokedExclusions} />
					<MetricTile label={t("fouls")} value={summary.defense.fouls} />
				</div>
			</VisualCard>
		</div>
	);
}

function GoalkeeperDashboard({ matchStats, hiddenStats = [] }: Omit<MatchVisualDashboardProps, "phase" | "players">) {
	const t = useTranslations("MatchVisualDashboard");
	const tStat = useTranslations("StatLabels");
	const hidden = useMemo(() => new Set(hiddenStats), [hiddenStats]);
	const filteredRows = useMemo(() => matchStats.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, hidden.has(key) ? 0 : value]))), [matchStats, hidden]);
	const totals = useMemo(() => accumulateGoalkeeperStats(filteredRows, hiddenStats), [filteredRows, hiddenStats]);
	const summary = useMemo(() => getGoalkeeperSummary(totals, hiddenStats), [totals, hiddenStats]);
	const goalsBreakdown = useMemo(() => buildGoalkeeperGoalsAgainstSummary(filteredRows, (key) => tStat(key)), [filteredRows, tStat]);
	const savesBreakdown = useMemo(() => buildGoalkeeperSavesSummary(filteredRows, (key) => tStat(key)), [filteredRows, tStat]);
	const goalkeeperRows = useMemo(() => matchStats
		.filter((row) => row?.players?.is_goalkeeper)
		.map((row) => {
			const derived = getGoalkeeperDerived(row, hiddenStats);
			return { name: row.players?.name ?? row.players?.full_name ?? t("goalkeeperFallback"), saves: derived.saves, conceded: derived.goalsConceded, efficiency: derived.savePct };
		})
		.filter((row) => row.saves + row.conceded > 0), [matchStats, hiddenStats, t]);

	return (
		<div className="grid gap-4 xl:grid-cols-12">
			<VisualCard title={t("goalkeeper.performanceTitle")} description={t("goalkeeper.performanceDescription")} icon={<Hand className="size-4" />} className="xl:col-span-5">
				<RingMetric value={summary.savePct} label={t("saveRate")} detail={t("goalkeeper.performanceDetail", { saves: summary.saves, shots: summary.shotsReceived, conceded: summary.goalsConceded })} tone={summary.savePct >= 55 ? "emerald" : summary.savePct >= 40 ? "amber" : "red"} />
				<div className="mt-4 grid grid-cols-3 gap-2">
					<MetricTile label={t("saves")} value={summary.saves} tone="good" />
					<MetricTile label={t("goalsConceded")} value={summary.goalsConceded} tone="bad" />
					<MetricTile label={t("shotsFaced")} value={summary.shotsReceived} />
				</div>
			</VisualCard>

			<VisualCard title={t("goalkeeper.comparisonTitle")} description={t("goalkeeper.comparisonDescription")} icon={<UsersRound className="size-4" />} className="xl:col-span-7">
				{goalkeeperRows.length > 0 ? <div className="h-64">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={goalkeeperRows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
							<CartesianGrid vertical={false} opacity={0.18} /><XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} />
							<Tooltip cursor={{ fill: "rgba(100, 116, 139, 0.1)" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "var(--popover-foreground)" }} /><Legend wrapperStyle={{ fontSize: 11 }} />
							<Bar dataKey="saves" name={t("saves")} fill="#10b981" radius={[5, 5, 0, 0]} />
							<Bar dataKey="conceded" name={t("goalsConceded")} fill="#ef4444" radius={[5, 5, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div> : <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">{t("noData")}</div>}
			</VisualCard>

			<VisualCard title={t("goalkeeper.goalsBreakdownTitle")} description={t("goalkeeper.goalsBreakdownDescription")} icon={<Target className="size-4" />} className="xl:col-span-6">
				<RankedBars rows={goalsBreakdown.parts.map((part) => ({ label: part.label, value: part.value, color: part.color, detail: `${part.pct}%` }))} empty={t("noData")} />
			</VisualCard>

			<VisualCard title={t("goalkeeper.savesBreakdownTitle")} description={t("goalkeeper.savesBreakdownDescription")} icon={<ShieldCheck className="size-4" />} className="xl:col-span-6">
				<RankedBars rows={savesBreakdown.parts.map((part) => ({ label: part.label, value: part.value, color: part.color, detail: `${part.pct}%` }))} empty={t("noData")} />
			</VisualCard>

			<VisualCard title={t("goalkeeper.specialTitle")} description={t("goalkeeper.specialDescription")} icon={<Sparkles className="size-4" />} className="xl:col-span-12">
				<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
					<MetricTile label={t("penaltySaveRate")} value={`${summary.penalties.savePct}%`} hint={`${summary.penalties.saves}/${summary.penalties.attempts}`} />
					<MetricTile label={t("inferiorityEfficiency")} value={`${summary.inferiority.efficiency}%`} hint={`${summary.inferiority.resolved}/${summary.inferiority.attempts}`} />
					<MetricTile label={t("inferioritySaves")} value={summary.inferiority.saves} />
					<MetricTile label={t("inferiorityGoals")} value={summary.inferiority.goals} />
				</div>
			</VisualCard>
		</div>
	);
}

export function MatchPhaseVisualDashboard(props: MatchVisualDashboardProps) {
	if (props.phase === "attack") return <AttackDashboard matchStats={props.matchStats} hiddenStats={props.hiddenStats} />;
	if (props.phase === "defense") return <DefenseDashboard matchStats={props.matchStats} players={props.players} hiddenStats={props.hiddenStats} />;
	return <GoalkeeperDashboard matchStats={props.matchStats} hiddenStats={props.hiddenStats} />;
}

type MatchScoreFlowChartProps = {
	match: MatchWithQuarterScores;
	actions?: MatchAction[];
	sprints?: Array<{
		quarter: 1 | 2 | 3 | 4;
		result: -1 | 0 | 1;
		winner: PlayerLite | null;
	}>;
	clubName: string;
	opponentName: string;
};

function scoreSide(actionKey: string): "own" | "opponent" | null {
	const statKey = actionKey as keyof MatchStats;
	if (FIELD_GOAL_ACTIONS.has(statKey) || GOALKEEPER_SCORED_ACTIONS.has(statKey)) return "own";
	if (GOALKEEPER_CONCEDED_ACTIONS.has(statKey)) return "opponent";
	return null;
}

export function MatchScoreFlowChart({ match, actions = [], sprints = [], clubName, opponentName }: MatchScoreFlowChartProps) {
	const t = useTranslations("MatchVisualDashboard");
	const quarters = [
		{ quarter: 1, own: number(match.q1_score), opponent: number(match.q1_score_rival) },
		{ quarter: 2, own: number(match.q2_score), opponent: number(match.q2_score_rival) },
		{ quarter: 3, own: number(match.q3_score), opponent: number(match.q3_score_rival) },
		{ quarter: 4, own: number(match.q4_score), opponent: number(match.q4_score_rival) }
	];
	const hasQuarterData = quarters.some((quarter) => quarter.own > 0 || quarter.opponent > 0);
	const officialOwn = number(match.home_score);
	const officialOpponent = number(match.away_score);
	const startPoint = { period: t("scoreFlow.start"), own: 0, opponent: 0, difference: 0 };
	let quarterOwnTotal = 0;
	let quarterOpponentTotal = 0;
	const quarterFlow = [startPoint];
	for (const quarter of quarters) {
		quarterOwnTotal += quarter.own;
		quarterOpponentTotal += quarter.opponent;
		quarterFlow.push({ period: t("scoreFlow.quarter", { number: quarter.quarter }), own: quarterOwnTotal, opponent: quarterOpponentTotal, difference: quarterOwnTotal - quarterOpponentTotal });
	}
	const quartersMatchFinal = quarterOwnTotal === officialOwn && quarterOpponentTotal === officialOpponent;

	const goalEvents = [...actions]
		.sort((a, b) => a.sequence - b.sequence)
		.map((action) => ({ action, side: scoreSide(action.action_key) }))
		.filter((event): event is { action: MatchAction; side: "own" | "opponent" } => event.side !== null);
	const hasGoalTimeline = goalEvents.length > 0;
	let timelineOwn = 0;
	let timelineOpponent = 0;
	const goalFlow = [startPoint];
	goalEvents.forEach(({ action, side }, index) => {
		if (side === "own") timelineOwn += 1;
		else timelineOpponent += 1;
		goalFlow.push({
			period: t("scoreFlow.goalPoint", { number: index + 1, quarter: action.quarter }),
			own: timelineOwn,
			opponent: timelineOpponent,
			difference: timelineOwn - timelineOpponent
		});
	});
	const chronologyMatchesFinal = timelineOwn === officialOwn && timelineOpponent === officialOpponent;
	const selectedFlow = hasGoalTimeline ? goalFlow : quarterFlow;
	const scoreDataMatchesFinal = hasGoalTimeline ? chronologyMatchesFinal : quartersMatchFinal;
	if (!scoreDataMatchesFinal || (!hasGoalTimeline && !hasQuarterData)) {
		selectedFlow.push({ period: t("scoreFlow.final"), own: officialOwn, opponent: officialOpponent, difference: officialOwn - officialOpponent });
	}
	const visibleFlow = hasGoalTimeline || hasQuarterData ? selectedFlow : [selectedFlow[0], selectedFlow[selectedFlow.length - 1]];
	const quarterSwings = quarters.map((quarter) => ({ period: t("scoreFlow.quarter", { number: quarter.quarter }), swing: Math.abs(quarter.own - quarter.opponent) }));
	const decisive = hasQuarterData ? [...quarterSwings].sort((a, b) => b.swing - a.swing)[0] : undefined;
	let lastLeader = 0;
	let leadChanges = 0;
	for (const point of visibleFlow.slice(1)) {
		const currentLeader = Math.sign(point.difference);
		if (currentLeader === 0) continue;
		if (lastLeader !== 0 && currentLeader !== lastLeader) leadChanges += 1;
		lastLeader = currentLeader;
	}
	const pointRadius = visibleFlow.length > 18 ? 2.5 : 4;

	return (
		<VisualCard title={t("scoreFlow.title")} description={t(hasGoalTimeline ? "scoreFlow.goalDescription" : "scoreFlow.description")} icon={<TrendingUp className="size-4" />}>
			<div className="grid gap-5 xl:grid-cols-[1fr_250px] xl:items-center">
				<div className="h-72 min-w-0">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={visibleFlow} margin={{ top: 14, right: 16, bottom: 0, left: -16 }}>
							<defs>
								<linearGradient id="scoreOwn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} /></linearGradient>
								<linearGradient id="scoreOpponent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} /></linearGradient>
							</defs>
							<CartesianGrid vertical={false} opacity={0.2} /><XAxis dataKey="period" tickLine={false} axisLine={false} minTickGap={18} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} />
							<Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "var(--popover-foreground)" }} /><Legend wrapperStyle={{ fontSize: 11 }} /><ReferenceLine y={0} stroke="var(--border)" />
							<Area type={hasGoalTimeline ? "stepAfter" : "monotone"} dataKey="own" name={clubName} stroke="#3b82f6" fill="url(#scoreOwn)" strokeWidth={3} dot={{ r: pointRadius, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
							<Area type={hasGoalTimeline ? "stepAfter" : "monotone"} dataKey="opponent" name={opponentName} stroke="#ef4444" fill="url(#scoreOpponent)" strokeWidth={3} dot={{ r: pointRadius, fill: "#ef4444" }} activeDot={{ r: 6 }} />
						</AreaChart>
					</ResponsiveContainer>
				</div>
				<div className="space-y-3">
					<div className="rounded-2xl border bg-muted/15 p-4 text-center">
						<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("scoreFlow.finalScore")}</p>
						<p className="mt-2 text-3xl font-bold tabular-nums"><span className="text-blue-500">{officialOwn}</span><span className="mx-2 text-muted-foreground">–</span><span className="text-red-500">{officialOpponent}</span></p>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<MetricTile label={t("scoreFlow.leadChanges")} value={leadChanges} />
						<MetricTile label={t("scoreFlow.decisivePeriod")} value={decisive?.period ?? "—"} hint={decisive ? t("scoreFlow.swing", { value: decisive.swing }) : undefined} />
					</div>
					{!scoreDataMatchesFinal ? <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-2.5 text-[11px] text-amber-700 dark:text-amber-300">{t(hasGoalTimeline ? "scoreFlow.goalTimelineWarning" : "scoreFlow.partialWarning")}</p> : null}
				</div>
			</div>
			{hasQuarterData ? (
				<div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
					{quarters.map((quarter) => {
						const sprint = sprints.find((item) => item.quarter === quarter.quarter);
						const sprintWon = sprint?.result === 1;
						const sprintLost = sprint?.result === -1;
						const sprintName = sprintWon
							? sprint?.winner?.name || clubName
							: sprintLost
								? opponentName
								: t("scoreFlow.sprintNotRecorded");

						return (
							<div key={quarter.quarter} className="overflow-hidden rounded-xl border bg-background/60">
								<div className="flex min-h-12 items-center gap-2 border-b bg-muted/15 px-3 py-2">
									{sprintWon && sprint?.winner ? (
										<Avatar className="size-7 border bg-muted">
											{sprint.winner.photo_url ? <AvatarImage src={sprint.winner.photo_url} alt={sprint.winner.name || clubName} className="object-cover object-top" /> : null}
											<AvatarFallback className="text-[9px] font-bold">{sprint.winner.number != null ? `#${sprint.winner.number}` : "✓"}</AvatarFallback>
										</Avatar>
									) : (
										<span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold", sprintLost ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400" : sprintWon ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>{sprintLost ? "R" : sprintWon ? "✓" : "—"}</span>
									)}
									<div className="min-w-0">
										<p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("scoreFlow.sprintStart")}</p>
										<p className={cn("truncate text-[11px] font-semibold", sprintWon && "text-emerald-700 dark:text-emerald-300", sprintLost && "text-red-600 dark:text-red-400")}>{sprintName}</p>
									</div>
								</div>
								<div className="flex items-center justify-between px-3 py-2.5 text-xs">
									<span className="font-medium text-muted-foreground">{t("scoreFlow.quarter", { number: quarter.quarter })}</span>
									<span className="text-base font-bold tabular-nums">{quarter.own}–{quarter.opponent}</span>
								</div>
							</div>
						);
					})}
				</div>
			) : null}
		</VisualCard>
	);
}
