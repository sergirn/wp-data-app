"use client";

import { Activity, ArrowDownRight, ArrowUpRight, Goal, Hand, Shield, Target, UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Scouting = ReturnType<typeof import("@/lib/opponents/scouting").buildOpponentScouting>;

export function OpponentTrendChart({ scouting }: { scouting: Scouting }) {
	const t = useTranslations("Opponents.trend");
	const locale = useLocale();
	const data = scouting.trend.map((point, index) => ({ ...point, label: new Date(point.date).toLocaleDateString(locale, { day: "numeric", month: "short" }), order: index + 1 }));
	if (data.length < 2) return null;

	return <Card className="h-full overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-primary" />{t("title")}</CardTitle><CardDescription>{t("description")}</CardDescription></CardHeader><CardContent><ChartContainer config={{ own: { label: t("own"), color: "hsl(142 71% 45%)" }, opponent: { label: t("opponent"), color: "hsl(0 84% 60%)" }, difference: { label: t("difference"), color: "hsl(217 91% 60%)" } }} className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={20} /><YAxis yAxisId="goals" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} /><YAxis yAxisId="difference" orientation="right" hide /><ChartTooltip content={<ChartTooltipContent />} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar yAxisId="goals" dataKey="own" fill="var(--color-own)" radius={[4, 4, 0, 0]} /><Bar yAxisId="goals" dataKey="opponent" fill="var(--color-opponent)" radius={[4, 4, 0, 0]} /><Line yAxisId="difference" type="monotone" dataKey="difference" stroke="var(--color-difference)" strokeWidth={3} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></ChartContainer></CardContent></Card>;
}

export function OpponentVenueComparison({ scouting }: { scouting: Scouting }) {
	const t = useTranslations("Opponents.venue");
	return <Card className="h-full"><CardHeader><CardTitle>{t("title")}</CardTitle><CardDescription>{t("description")}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><VenueBlock label={t("home")} summary={scouting.venue.home} /><VenueBlock label={t("away")} summary={scouting.venue.away} /></CardContent></Card>;
}

function VenueBlock({ label, summary }: { label: string; summary: Scouting["venue"]["home"] }) {
	const t = useTranslations("Opponents.venue");
	return <div className="rounded-xl border bg-muted/10 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{label}</p><Badge variant="secondary">{t("matches", { count: summary.played })}</Badge></div>{summary.played > 0 ? <><p className="mt-3 text-2xl font-bold tabular-nums">{summary.wins}-{summary.draws}-{summary.losses}</p><div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>{t("averageScore")}</span><span className="font-semibold text-foreground">{summary.averageOwnGoals.toFixed(1)}–{summary.averageOpponentGoals.toFixed(1)}</span></div><div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>{t("averageDifference")}</span><span className={summary.averageDifference >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>{summary.averageDifference > 0 ? "+" : ""}{summary.averageDifference.toFixed(1)}</span></div></> : <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>}</div>;
}

export function OpponentAdvancedAnalysis({ scouting }: { scouting: Scouting }) {
	const t = useTranslations("Opponents.advanced");
	const statT = useTranslations("StatLabels");
	const metricSample = scouting.dataQuality.detailedMatches;
	return <div className="space-y-5">
		<div className="grid gap-4 xl:grid-cols-3">
			<AnalysisCard icon={Target} title={t("attack.title")} description={t("sample", { count: metricSample })} metrics={[[t("attack.goalsPerMatch"), scouting.attack.goalsPerMatch.toFixed(1)], [t("attack.shooting"), `${scouting.attack.efficiency}%`], [t("attack.powerPlay"), `${scouting.attack.powerPlayEfficiency}%`], [t("attack.assistsPerMatch"), scouting.attack.assistsPerMatch.toFixed(1)]]} />
			<AnalysisCard icon={Shield} title={t("defense.title")} description={t("sample", { count: metricSample })} metrics={[[t("defense.recoveries"), scouting.defense.recoveriesPerMatch.toFixed(1)], [t("defense.turnovers"), scouting.defense.turnoversPerMatch.toFixed(1)], [t("defense.balance"), signed(scouting.defense.possessionBalancePerMatch)], [t("defense.blocks"), scouting.defense.blocksPerMatch.toFixed(1)]]} />
			<AnalysisCard icon={Hand} title={t("opponent.title")} description={t("opponent.description", { count: metricSample })} metrics={[[t("opponent.goalsPerMatch"), scouting.opponentAttack.goalsPerMatch.toFixed(1)], [t("opponent.savePercentage"), `${scouting.opponentAttack.savePercentage}%`], [t("opponent.manDown"), `${scouting.opponentAttack.manDownSavePercentage}%`], [t("opponent.shotsFaced"), scouting.opponentAttack.shotsFaced]]} />
		</div>
		<div className="grid gap-4 lg:grid-cols-2"><BreakdownCard icon={Goal} title={t("attack.breakdown")} empty={t("emptyBreakdown")} rows={scouting.attack.goalBreakdown.map((item) => ({ label: statT.has(item.key) ? statT(item.key) : item.key, value: item.value }))} /><BreakdownCard icon={Shield} title={t("opponent.breakdown")} empty={t("emptyBreakdown")} rows={scouting.opponentAttack.goalBreakdown.map((item) => ({ label: statT.has(item.key) ? statT(item.key) : item.key, value: item.value }))} /></div>
		{scouting.goalkeepers.length > 0 && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Hand className="size-5 text-primary" />{t("goalkeepers.title")}</CardTitle><CardDescription>{t("goalkeepers.description")}</CardDescription></CardHeader><CardContent className="grid gap-3 lg:grid-cols-2">{scouting.goalkeepers.map((goalkeeper) => <div key={goalkeeper.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">#{goalkeeper.number} · {goalkeeper.name}</p><p className="text-xs text-muted-foreground">{t("goalkeepers.matches", { count: goalkeeper.matches })}</p></div><Badge variant={goalkeeper.savePercentage >= 50 ? "default" : "secondary"}>{goalkeeper.savePercentage}%</Badge></div><div className="mt-3 grid grid-cols-2 gap-2"><MiniMetric label={t("goalkeepers.saves")} value={goalkeeper.savesPerMatch.toFixed(1)} /><MiniMetric label={t("goalkeepers.conceded")} value={goalkeeper.goalsAgainstPerMatch.toFixed(1)} /></div></div>)}</CardContent></Card>}
		<QuarterActions scouting={scouting} />
	</div>;
}

function AnalysisCard({ icon: Icon, title, description, metrics }: { icon: typeof Target; title: string; description: string; metrics: Array<[string, string | number]> }) {
	return <Card className="h-full"><CardHeader><div className="mb-1 grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4.5" /></div><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-2">{metrics.map(([label, value]) => <MiniMetric key={label} label={label} value={value} />)}</CardContent></Card>;
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
	return <div className="rounded-lg border bg-muted/10 p-3"><p className="text-[11px] leading-tight text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></div>;
}

function BreakdownCard({ icon: Icon, title, rows, empty }: { icon: typeof Target; title: string; rows: Array<{ label: string; value: number }>; empty: string }) {
	const max = Math.max(1, ...rows.map((row) => row.value));
	return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="size-5 text-primary" />{title}</CardTitle></CardHeader><CardContent>{rows.length > 0 ? <div className="space-y-3">{rows.map((row) => <div key={row.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate">{row.label}</span><span className="font-semibold tabular-nums">{row.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/75" style={{ width: `${(row.value / max) * 100}%` }} /></div></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>;
}

function QuarterActions({ scouting }: { scouting: Scouting }) {
	const t = useTranslations("Opponents.advanced.chronology");
	if (scouting.dataQuality.actionMatches === 0) return <Card><CardContent className="flex items-center gap-3 py-6"><UsersRound className="size-5 text-muted-foreground" /><div><p className="font-medium">{t("empty")}</p><p className="text-sm text-muted-foreground">{t("emptyHint")}</p></div></CardContent></Card>;
	return <Card><CardHeader><CardTitle>{t("title")}</CardTitle><CardDescription>{t("description", { count: scouting.dataQuality.actionMatches })}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{scouting.actionQuarters.map((quarter) => <div key={quarter.quarter} className="rounded-xl border p-4"><div className="flex items-center justify-between"><p className="font-semibold">Q{quarter.quarter}</p><Badge variant="secondary">{quarter.total}</Badge></div><div className="mt-3 space-y-1.5"><ActionLine icon={ArrowUpRight} label={t("goals")} value={quarter.goals} positive /><ActionLine icon={Target} label={t("misses")} value={quarter.misses} /><ActionLine icon={ArrowUpRight} label={t("assists")} value={quarter.assists} positive /><ActionLine icon={ArrowUpRight} label={t("recoveries")} value={quarter.recoveries} positive /><ActionLine icon={ArrowDownRight} label={t("turnovers")} value={quarter.turnovers} /></div></div>)}</CardContent></Card>;
}

function ActionLine({ icon: Icon, label, value, positive = false }: { icon: typeof Target; label: string; value: number; positive?: boolean }) {
	return <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Icon className={positive ? "size-3.5 text-emerald-500" : "size-3.5 text-amber-500"} />{label}</span><span className="font-semibold tabular-nums text-foreground">{value}</span></div>;
}

function signed(value: number) {
	return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}
