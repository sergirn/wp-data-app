"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Search, Swords, Trophy, UserPlus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { calculateMatchTotals } from "@/lib/match-comparison";
import { getMatchOutcome, getOpponentScore, getOwnScore, getVenueScore } from "@/lib/matches/score";
import type { Match, MatchStats } from "@/lib/types";
import { cn } from "@/lib/utils";

type MetricKey = "goals" | "goalsAgainst" | "goalDifference" | "shots" | "shootingEfficiency" | "assists" | "powerPlayGoals" | "powerPlayMisses" | "powerPlayAttempts" | "powerPlayEfficiency" | "blocks" | "recoveries" | "turnovers" | "possessionBalance" | "saves" | "savesWithRecovery" | "savePercentage" | "manDownGoalsAgainst" | "manDownSaves" | "manDownEfficiency";
type MetricDefinition = { key: MetricKey; label: string; format?: "percentage"; lowerIsBetter?: boolean; signed?: boolean };
type MatchData = { match: Match; metrics: Record<MetricKey, number>; quarters: number[]; opponentQuarters: number[] };

type Props = { matches: Match[]; stats: MatchStats[]; season: string };

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#e11d48"];

export function SeasonMatchComparator({ matches, stats, season }: Props) {
	const t = useTranslations("MatchComparatorPro");
	const locale = useLocale();
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [search, setSearch] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);
	const data = useMemo(() => matches.map((match) => buildMatchData(match, stats)), [matches, stats]);
	const selected = useMemo(() => selectedIds.map((id) => data.find((item) => item.match.id === id)).filter((item): item is MatchData => Boolean(item)), [data, selectedIds]);
	const suggestions = useMemo(() => {
		const term = search.trim().toLocaleLowerCase(locale);
		return data.filter((item) => !term || item.match.opponent.toLocaleLowerCase(locale).includes(term) || String(item.match.jornada ?? "").includes(term)).sort((a, b) => b.match.match_date.localeCompare(a.match.match_date)).slice(0, 10);
	}, [data, locale, search]);
	const toggleMatch = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((matchId) => matchId !== id) : current.length < 4 ? [...current, id] : current);
	const definitions: MetricDefinition[] = [
		{ key: "goals", label: t("metrics.goals") }, { key: "goalsAgainst", label: t("metrics.goalsAgainst"), lowerIsBetter: true }, { key: "goalDifference", label: t("metrics.goalDifference"), signed: true },
		{ key: "shots", label: t("metrics.shots") }, { key: "shootingEfficiency", label: t("metrics.shootingEfficiency"), format: "percentage" }, { key: "assists", label: t("metrics.assists") },
		{ key: "powerPlayGoals", label: t("metrics.powerPlayGoals") }, { key: "powerPlayMisses", label: t("metrics.powerPlayMisses"), lowerIsBetter: true }, { key: "powerPlayAttempts", label: t("metrics.powerPlayAttempts") }, { key: "powerPlayEfficiency", label: t("metrics.powerPlayEfficiency"), format: "percentage" },
		{ key: "recoveries", label: t("metrics.recoveries") }, { key: "turnovers", label: t("metrics.turnovers"), lowerIsBetter: true }, { key: "possessionBalance", label: t("metrics.possessionBalance"), signed: true }, { key: "blocks", label: t("metrics.blocks") },
		{ key: "saves", label: t("metrics.saves") }, { key: "savesWithRecovery", label: t("metrics.savesWithRecovery") }, { key: "savePercentage", label: t("metrics.savePercentage"), format: "percentage" }, { key: "manDownGoalsAgainst", label: t("metrics.manDownGoalsAgainst"), lowerIsBetter: true }, { key: "manDownSaves", label: t("metrics.manDownSaves") }, { key: "manDownEfficiency", label: t("metrics.manDownEfficiency"), format: "percentage" }
	];

	return <div className="space-y-5">
		<Card className="gap-0 overflow-hidden rounded-2xl py-0 sm:gap-0 sm:py-0">
			<CardHeader className="border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.025] to-transparent py-4 sm:py-5"><CardTitle className="flex items-center gap-2"><Swords className="size-5 text-primary" />{t("title")}</CardTitle><CardDescription>{t("description", { season })}</CardDescription></CardHeader>
			<CardContent className="space-y-5 p-4 sm:p-5">
				<div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("choose")}</p><div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <MatchSlot key={index} index={index} data={selected[index]} onRemove={toggleMatch} onAdd={() => searchRef.current?.focus()} />)}</div></div>
				<div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} className="h-11 pl-9" /></div>
				<div><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{t("suggestions")}</p><Badge variant="secondary">{t("selected", { count: selected.length })}</Badge></div>{suggestions.length > 0 ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{suggestions.map((item) => {
					const isSelected = selectedIds.includes(item.match.id); const outcome = getMatchOutcome(item.match);
					return <button key={item.match.id} type="button" disabled={!isSelected && selectedIds.length >= 4} onClick={() => toggleMatch(item.match.id)} className={cn("flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors", isSelected ? "border-primary/30 bg-primary/[0.06]" : "hover:border-primary/30 hover:bg-muted/35", !isSelected && selectedIds.length >= 4 && "opacity-45")}><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold", outcome === "win" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : outcome === "loss" ? "bg-rose-500/12 text-rose-700 dark:text-rose-300" : "bg-amber-500/12 text-amber-700 dark:text-amber-300")}>{t(`resultLetters.${outcome}`)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.match.opponent}</span><span className="block truncate text-[10px] text-muted-foreground">{t("matchMeta", { round: item.match.jornada ?? "—", score: `${getOwnScore(item.match)}–${getOpponentScore(item.match)}` })}</span></span><span className={cn("shrink-0 text-[10px] font-semibold", isSelected ? "text-muted-foreground" : "text-primary")}>{isSelected ? t("chosen") : t("add")}</span></button>;
				})}</div> : <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">{t("noMatches")}</div>}</div>
			</CardContent>
		</Card>

		{selected.length < 2 ? <Card className="border-dashed bg-muted/15"><CardContent className="flex min-h-24 items-center gap-3 p-5 text-sm text-muted-foreground"><UserPlus className="size-5 shrink-0" />{t("minimum")}</CardContent></Card> : <>
			<MatchComparisonTable selected={selected} definitions={definitions} />
			<div className="grid gap-5 xl:grid-cols-2"><MatchRadar selected={selected} pool={data} /><QuarterComparison selected={selected} /></div>
			<MatchLeaders selected={selected} definitions={definitions} />
		</>}
	</div>;
}

function buildMatchData(match: Match, stats: MatchStats[]): MatchData {
	const totals = calculateMatchTotals(match, stats);
	const powerPlayAttempts = totals.golesHombreMas + totals.fallosHombreMas;
	const goalDifference = getOwnScore(match) - getOpponentScore(match);
	const metrics: Record<MetricKey, number> = { goals: getOwnScore(match), goalsAgainst: getOpponentScore(match), goalDifference, shots: totals.tiros, shootingEfficiency: totals.eficienciaTiro, assists: totals.asistencias, powerPlayGoals: totals.golesHombreMas, powerPlayMisses: totals.fallosHombreMas, powerPlayAttempts, powerPlayEfficiency: totals.eficienciaHombreMas, blocks: totals.bloqueos, recoveries: totals.recuperaciones, turnovers: totals.perdidas, possessionBalance: totals.balancePosesion, saves: totals.paradasPortero, savesWithRecovery: totals.paradasConRecuperacion, savePercentage: totals.porcentajeParadas, manDownGoalsAgainst: totals.golesRecibidosHombreMenos, manDownSaves: totals.paradasHombreMenos, manDownEfficiency: totals.eficienciaDefensivaHombreMenos };
	const source = match as Match & Record<string, unknown>;
	const quarters = [1, 2, 3, 4].map((quarter) => Number(source[`q${quarter}_score`] ?? 0));
	const opponentQuarters = [1, 2, 3, 4].map((quarter) => Number(source[`q${quarter}_score_rival`] ?? 0));
	return { match, metrics, quarters, opponentQuarters };
}

function MatchSlot({ index, data, onRemove, onAdd }: { index: number; data?: MatchData; onRemove: (id: number) => void; onAdd: () => void }) {
	const t = useTranslations("MatchComparatorPro"); const locale = useLocale();
	if (!data) return <button type="button" onClick={onAdd} className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"><Swords className="mb-2 size-5 text-muted-foreground" /><span className="text-sm font-semibold">{t("addMatch")}</span><span className="mt-1 text-[11px] text-muted-foreground">{t("slot", { number: index + 1 })}</span></button>;
	const outcome = getMatchOutcome(data.match); const score = getVenueScore(data.match);
	return <div className="relative flex min-h-36 flex-col rounded-xl border-t-2 bg-card p-3 shadow-sm" style={{ borderTopColor: COLORS[index] }}><button type="button" onClick={() => onRemove(data.match.id)} aria-label={t("remove", { opponent: data.match.opponent })} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-3.5" /></button><span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("slot", { number: index + 1 })}</span><p className="mt-2 line-clamp-1 pr-7 text-sm font-semibold">{data.match.opponent}</p><div className="mt-2 flex items-center gap-2"><Badge variant="outline" className={cn("tabular-nums", outcome === "win" ? "text-emerald-600" : outcome === "loss" ? "text-rose-600" : "text-amber-600")}>{score.local}–{score.visitor}</Badge><span className="text-[10px] text-muted-foreground">{data.match.is_home === false ? t("away") : t("home")}</span></div><div className="mt-auto flex items-center gap-3 pt-2 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="size-3" />{new Date(data.match.match_date).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span><span>J{data.match.jornada ?? "—"}</span></div></div>;
}

function MatchComparisonTable({ selected, definitions }: { selected: MatchData[]; definitions: MetricDefinition[] }) {
	const t = useTranslations("MatchComparatorPro");
	return <Card className="gap-0 overflow-hidden rounded-2xl py-0 sm:gap-0 sm:py-0"><CardHeader className="border-b py-4 sm:py-5"><CardTitle className="text-base">{t("comparisonTitle")}</CardTitle><CardDescription>{t("comparisonDescription")}</CardDescription></CardHeader><CardContent className="overflow-x-auto p-0"><div className="min-w-[760px]"><div className="grid border-b bg-muted/20" style={{ gridTemplateColumns: `minmax(190px,1.1fr) repeat(${selected.length}, minmax(180px,1fr))` }}><div className="p-4 text-xs font-semibold text-muted-foreground">{t("metric")}</div>{selected.map((item, index) => <div key={item.match.id} className="flex items-center gap-2 border-l p-3"><span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} /><span className="truncate text-xs font-semibold">J{item.match.jornada ?? "—"} · {item.match.opponent}</span></div>)}</div>{definitions.map((definition) => <MatchMetricRow key={definition.key} definition={definition} selected={selected} />)}</div></CardContent></Card>;
}

function MatchMetricRow({ definition, selected }: { definition: MetricDefinition; selected: MatchData[] }) {
	const values = selected.map((item) => item.metrics[definition.key]); const min = Math.min(0, ...values); const max = Math.max(1, ...values); const magnitude = Math.max(1, max - min); const ordered = [...values].sort((a, b) => definition.lowerIsBetter ? a - b : b - a);
	return <div className="grid border-b last:border-0" style={{ gridTemplateColumns: `minmax(190px,1.1fr) repeat(${selected.length}, minmax(180px,1fr))` }}><div className="flex items-center p-4 text-xs font-medium">{definition.label}</div>{values.map((value, index) => <div key={`${definition.key}-${selected[index].match.id}`} className="border-l p-3"><div className="flex items-center gap-2"><span className="w-12 text-right text-xs font-bold tabular-nums">{formatMetric(value, definition.format, definition.signed)}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${((value - min) / magnitude) * 100}%`, backgroundColor: COLORS[index] }} /></div><span className={cn("grid size-5 place-items-center rounded-full border text-[9px] font-bold", ordered.indexOf(value) === 0 && "border-primary/40 bg-primary/10 text-primary")}>{ordered.indexOf(value) + 1}</span></div></div>)}</div>;
}

function MatchRadar({ selected, pool }: { selected: MatchData[]; pool: MatchData[] }) {
	const t = useTranslations("MatchComparatorPro"); const axes: Array<{ key: MetricKey; label: string }> = [{ key: "shootingEfficiency", label: t("radar.shooting") }, { key: "powerPlayEfficiency", label: t("radar.powerPlay") }, { key: "recoveries", label: t("radar.recoveries") }, { key: "blocks", label: t("radar.blocks") }, { key: "savePercentage", label: t("radar.goalkeeper") }, { key: "goalDifference", label: t("radar.score") }];
	const chartData = axes.map((axis) => { const values = pool.map((item) => item.metrics[axis.key]); const min = Math.min(0, ...values); const max = Math.max(1, ...values); return selected.reduce<Record<string, string | number>>((row, item) => ({ ...row, [`m${item.match.id}`]: Math.round(((item.metrics[axis.key] - min) / (max - min || 1)) * 100) }), { metric: axis.label }); });
	return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">{t("radar.title")}</CardTitle><CardDescription>{t("radar.description")}</CardDescription></CardHeader><CardContent><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={chartData} outerRadius="70%"><PolarGrid /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />{selected.map((item, index) => <Radar key={item.match.id} name={item.match.opponent} dataKey={`m${item.match.id}`} stroke={COLORS[index]} fill={COLORS[index]} fillOpacity={0.12} strokeWidth={2} />)}<Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></RadarChart></ResponsiveContainer></div></CardContent></Card>;
}

function QuarterComparison({ selected }: { selected: MatchData[] }) {
	const t = useTranslations("MatchComparatorPro"); const chartData = [0, 1, 2, 3].map((quarter) => selected.reduce<Record<string, string | number>>((row, item) => ({ ...row, [`m${item.match.id}`]: item.quarters[quarter] }), { quarter: `P${quarter + 1}` }));
	return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">{t("quarters.title")}</CardTitle><CardDescription>{t("quarters.description")}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid vertical={false} opacity={0.25} /><XAxis dataKey="quarter" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />{selected.map((item, index) => <Bar key={item.match.id} name={item.match.opponent} dataKey={`m${item.match.id}`} fill={COLORS[index]} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer></div><div className="grid gap-2 sm:grid-cols-2">{selected.map((item, index) => <div key={item.match.id} className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index] }} /><span className="min-w-0 flex-1 truncate text-xs font-medium">{item.match.opponent}</span><span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{item.quarters.map((goals, quarter) => `P${quarter + 1} ${goals}–${item.opponentQuarters[quarter]}`).join(" · ")}</span></div>)}</div></CardContent></Card>;
}

function MatchLeaders({ selected, definitions }: { selected: MatchData[]; definitions: MetricDefinition[] }) {
	const t = useTranslations("MatchComparatorPro"); const keys: MetricKey[] = ["goalDifference", "shootingEfficiency", "powerPlayEfficiency", "savePercentage"];
	return <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="size-4 text-primary" />{t("leaders")}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{keys.map((key) => { const definition = definitions.find((item) => item.key === key)!; const leader = [...selected].sort((a, b) => b.metrics[key] - a.metrics[key])[0]; return <div key={key} className="rounded-xl border bg-muted/10 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{definition.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatMetric(leader.metrics[key], definition.format, definition.signed)}</p><p className="mt-1 truncate text-xs text-muted-foreground">J{leader.match.jornada ?? "—"} · {leader.match.opponent}</p></div>; })}</CardContent></Card>;
}

function formatMetric(value: number, format?: MetricDefinition["format"], signed = false) {
	if (format === "percentage") return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
	return signed && value > 0 ? `+${value}` : String(value);
}
