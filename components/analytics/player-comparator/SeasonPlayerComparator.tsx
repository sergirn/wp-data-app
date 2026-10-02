"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { BarChart3, Hand, Search, UserPlus, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Cell, Legend, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { accumulateGoalkeeperStats, getGoalkeeperSummary } from "@/lib/stats/goalkeeperStatsHelpers";
import { accumulatePlayerStats, getPlayerSummary } from "@/lib/stats/playerStatsHelpers";
import type { MatchStats, Player } from "@/lib/types";
import { cn } from "@/lib/utils";

type Role = "field" | "goalkeeper";
type MetricKey =
	| "matches"
	| "goals"
	| "goalsPerMatch"
	| "shots"
	| "efficiency"
	| "assists"
	| "assistsPerMatch"
	| "recoveries"
	| "blocks"
	| "exclusions"
	| "penalties"
	| "turnovers"
	| "saves"
	| "savesPerMatch"
	| "goalsAgainst"
	| "goalsAgainstPerMatch"
	| "savePct"
	| "penaltySavePct"
	| "inferiorityEfficiency";

type PlayerComparisonData = {
	player: Player;
	role: Role;
	metrics: Record<MetricKey, number>;
	impact: number;
};

type MetricDefinition = {
	key: MetricKey;
	label: string;
	format?: "decimal" | "percentage";
	lowerIsBetter?: boolean;
};

type Props = {
	players: Player[];
	stats: MatchStats[];
	season: string;
	hiddenStats?: string[];
};

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#e11d48"];
const ZERO_METRICS: Record<MetricKey, number> = {
	matches: 0,
	goals: 0,
	goalsPerMatch: 0,
	shots: 0,
	efficiency: 0,
	assists: 0,
	assistsPerMatch: 0,
	recoveries: 0,
	blocks: 0,
	exclusions: 0,
	penalties: 0,
	turnovers: 0,
	saves: 0,
	savesPerMatch: 0,
	goalsAgainst: 0,
	goalsAgainstPerMatch: 0,
	savePct: 0,
	penaltySavePct: 0,
	inferiorityEfficiency: 0
};

const perMatch = (value: number, matches: number) => matches > 0 ? Number((value / matches).toFixed(1)) : 0;

export function SeasonPlayerComparator({ players, stats, season, hiddenStats = [] }: Props) {
	const t = useTranslations("PlayerComparatorPro");
	const [role, setRole] = useState<Role>("field");
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [search, setSearch] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);

	const data = useMemo(() => players.map((player) => buildPlayerData(player, stats, hiddenStats)), [hiddenStats, players, stats]);
	const roleData = useMemo(() => data.filter((item) => item.role === role && item.metrics.matches > 0), [data, role]);
	const selected = useMemo(() => selectedIds.map((id) => roleData.find((item) => item.player.id === id)).filter((item): item is PlayerComparisonData => Boolean(item)), [roleData, selectedIds]);
	const suggestions = useMemo(() => {
		const term = search.trim().toLocaleLowerCase();
		return roleData
			.filter((item) => !term || item.player.name.toLocaleLowerCase().includes(term) || String(item.player.number).includes(term))
			.sort((a, b) => b.impact - a.impact)
			.slice(0, 10);
	}, [roleData, search]);

	const changeRole = (nextRole: Role) => {
		setRole(nextRole);
		setSelectedIds([]);
		setSearch("");
	};

	const togglePlayer = (id: number) => {
		setSelectedIds((current) => current.includes(id) ? current.filter((playerId) => playerId !== id) : current.length < 4 ? [...current, id] : current);
	};

	const definitions: MetricDefinition[] = role === "field" ? [
		{ key: "matches", label: t("metrics.matches") },
		{ key: "goals", label: t("metrics.goals") },
		{ key: "goalsPerMatch", label: t("metrics.goalsPerMatch"), format: "decimal" },
		{ key: "shots", label: t("metrics.shots") },
		{ key: "efficiency", label: t("metrics.efficiency"), format: "percentage" },
		{ key: "assists", label: t("metrics.assists") },
		{ key: "recoveries", label: t("metrics.recoveries") },
		{ key: "blocks", label: t("metrics.blocks") },
		{ key: "exclusions", label: t("metrics.exclusions") },
		{ key: "penalties", label: t("metrics.penalties") },
		{ key: "turnovers", label: t("metrics.turnovers"), lowerIsBetter: true }
	] : [
		{ key: "matches", label: t("metrics.matches") },
		{ key: "saves", label: t("metrics.saves") },
		{ key: "savesPerMatch", label: t("metrics.savesPerMatch"), format: "decimal" },
		{ key: "goalsAgainst", label: t("metrics.goalsAgainst"), lowerIsBetter: true },
		{ key: "goalsAgainstPerMatch", label: t("metrics.goalsAgainstPerMatch"), format: "decimal", lowerIsBetter: true },
		{ key: "savePct", label: t("metrics.savePct"), format: "percentage" },
		{ key: "penaltySavePct", label: t("metrics.penaltySavePct"), format: "percentage" },
		{ key: "inferiorityEfficiency", label: t("metrics.inferiorityEfficiency"), format: "percentage" },
		{ key: "recoveries", label: t("metrics.recoveries") },
		{ key: "assists", label: t("metrics.assists") },
		{ key: "turnovers", label: t("metrics.turnovers"), lowerIsBetter: true }
	];

	return (
		<div className="space-y-5">
			<Card className="gap-0 overflow-hidden rounded-2xl py-0 sm:gap-0 sm:py-0">
				<CardHeader className="border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.025] to-transparent py-4 sm:py-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" />{t("title")}</CardTitle>
							<CardDescription className="mt-1">{t("description", { season })}</CardDescription>
						</div>
						<div className="grid grid-cols-2 rounded-xl bg-muted/60 p-1">
							<Button type="button" size="sm" variant={role === "field" ? "default" : "ghost"} onClick={() => changeRole("field")} className="rounded-lg"><Users className="mr-2 size-4" />{t("fieldPlayers")}</Button>
							<Button type="button" size="sm" variant={role === "goalkeeper" ? "default" : "ghost"} onClick={() => changeRole("goalkeeper")} className="rounded-lg"><Hand className="mr-2 size-4" />{t("goalkeepers")}</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-5 p-4 sm:p-5">
					<div>
						<p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("choose")}</p>
						<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
							{Array.from({ length: 4 }, (_, index) => <SelectionSlot key={index} index={index} data={selected[index]} onRemove={togglePlayer} onAdd={() => searchRef.current?.focus()} />)}
						</div>
					</div>

					<div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search", { season })} className="h-11 pl-9" /></div>

					<div>
						<div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{t("suggestions")}</p><Badge variant="secondary">{t("selected", { count: selected.length })}</Badge></div>
						{suggestions.length > 0 ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{suggestions.map((item) => {
							const isSelected = selectedIds.includes(item.player.id);
							return <button key={item.player.id} type="button" disabled={!isSelected && selectedIds.length >= 4} onClick={() => togglePlayer(item.player.id)} className={cn("flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors", isSelected ? "border-primary/30 bg-primary/[0.06]" : "hover:border-primary/30 hover:bg-muted/35", !isSelected && selectedIds.length >= 4 && "opacity-45")}><PlayerAvatar player={item.player} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">#{item.player.number} · {item.player.name}</span><span className="block truncate text-[10px] text-muted-foreground">{t("matches", { count: item.metrics.matches })}</span></span><span className={cn("shrink-0 text-[10px] font-semibold", isSelected ? "text-muted-foreground" : "text-primary")}>{isSelected ? t("chosen") : t("add")}</span></button>;
						})}</div> : <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">{t("noPlayers")}</div>}
					</div>
				</CardContent>
			</Card>

			{selected.length < 2 ? <Card className="border-dashed bg-muted/15"><CardContent className="flex min-h-24 items-center gap-3 p-5 text-sm text-muted-foreground"><UserPlus className="size-5 shrink-0" />{t("minimum")}</CardContent></Card> : <>
				<ComparisonTable selected={selected} definitions={definitions} />
				<div className="grid gap-5 xl:grid-cols-2">
					<PerformanceRadar selected={selected} pool={roleData} role={role} />
					<ContributionPanel selected={selected} role={role} definitions={definitions} />
				</div>
			</>}
		</div>
	);
}

function buildPlayerData(player: Player, stats: MatchStats[], hiddenStats: string[]): PlayerComparisonData {
	const rows = stats.filter((row) => row.player_id === player.id) as unknown as Array<Record<string, unknown>>;
	const matches = new Set(rows.map((row) => Number(row.match_id))).size;
	const metrics = { ...ZERO_METRICS, matches };
	if (player.is_goalkeeper) {
		const totals = accumulateGoalkeeperStats(rows, hiddenStats);
		const summary = getGoalkeeperSummary(totals, hiddenStats);
		metrics.saves = summary.saves;
		metrics.savesPerMatch = perMatch(summary.saves, matches);
		metrics.goalsAgainst = summary.goalsConceded;
		metrics.goalsAgainstPerMatch = perMatch(summary.goalsConceded, matches);
		metrics.savePct = summary.savePct;
		metrics.penaltySavePct = summary.penaltySavePct;
		metrics.inferiorityEfficiency = summary.inferiorityEfficiency;
		metrics.recoveries = Number(totals.portero_acciones_recuperacion ?? 0);
		metrics.assists = Number(totals.portero_acciones_asistencias ?? 0);
		metrics.turnovers = Number(totals.portero_acciones_perdida_pos ?? 0);
		return { player, role: "goalkeeper", metrics, impact: summary.saves * 2 + metrics.recoveries + metrics.assists * 1.5 - summary.goalsConceded };
	}

	const totals = accumulatePlayerStats(rows, hiddenStats);
	const summary = getPlayerSummary(totals, hiddenStats);
	metrics.goals = summary.goals;
	metrics.goalsPerMatch = perMatch(summary.goals, matches);
	metrics.shots = summary.shots;
	metrics.efficiency = summary.efficiency;
	metrics.assists = summary.assists;
	metrics.assistsPerMatch = perMatch(summary.assists, matches);
	metrics.recoveries = summary.recoveries;
	metrics.blocks = summary.blocks;
	metrics.exclusions = summary.provokedExclusions;
	metrics.penalties = summary.provokedPenalties;
	metrics.turnovers = summary.losses;
	return { player, role: "field", metrics, impact: summary.goals * 4 + summary.assists * 2 + summary.recoveries + summary.blocks + summary.provokedExclusions - summary.losses };
}

function SelectionSlot({ index, data, onRemove, onAdd }: { index: number; data?: PlayerComparisonData; onRemove: (id: number) => void; onAdd: () => void }) {
	const t = useTranslations("PlayerComparatorPro");
	if (!data) return <button type="button" onClick={onAdd} className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"><UserPlus className="mb-2 size-5 text-muted-foreground" /><span className="text-sm font-semibold">{t("addPlayer")}</span><span className="mt-1 text-[11px] text-muted-foreground">{t("slot", { number: index + 1 })}</span></button>;
	return <div className="relative flex min-h-32 flex-col items-center justify-center rounded-xl border-t-2 bg-card p-3 text-center shadow-sm" style={{ borderTopColor: COLORS[index] }}><button type="button" onClick={() => onRemove(data.player.id)} aria-label={t("remove", { name: data.player.name })} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-3.5" /></button><span className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("slot", { number: index + 1 })}</span><PlayerAvatar player={data.player} /><p className="mt-2 line-clamp-1 text-xs font-semibold sm:text-sm">#{data.player.number} · {data.player.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{t("matches", { count: data.metrics.matches })}</p></div>;
}

function PlayerAvatar({ player, size = "md" }: { player: Player; size?: "sm" | "md" }) {
	const dimension = size === "sm" ? 34 : 48;
	return <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full border bg-muted font-bold", size === "sm" ? "size-8 text-xs" : "size-12 text-sm")}>{player.photo_url ? <Image src={player.photo_url} alt="" fill sizes={`${dimension}px`} className="object-cover object-top" /> : player.number}</span>;
}

function ComparisonTable({ selected, definitions }: { selected: PlayerComparisonData[]; definitions: MetricDefinition[] }) {
	const t = useTranslations("PlayerComparatorPro");
	return <Card className="gap-0 overflow-hidden rounded-2xl py-0 sm:gap-0 sm:py-0"><CardHeader className="border-b py-4 sm:py-5"><CardTitle className="text-base">{t("comparisonTitle")}</CardTitle><CardDescription>{t("comparisonDescription")}</CardDescription></CardHeader><CardContent className="overflow-x-auto p-0"><div className="min-w-[720px]"><div className="grid border-b bg-muted/20" style={{ gridTemplateColumns: `minmax(180px,1.1fr) repeat(${selected.length}, minmax(170px,1fr))` }}><div className="p-4 text-xs font-semibold text-muted-foreground">{t("metric")}</div>{selected.map((item, index) => <div key={item.player.id} className="flex items-center gap-2 border-l p-3"><span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} /><span className="truncate text-xs font-semibold">#{item.player.number} · {item.player.name}</span></div>)}</div>{definitions.map((definition) => <ComparisonMetricRow key={definition.key} definition={definition} selected={selected} />)}</div></CardContent></Card>;
}

function ComparisonMetricRow({ definition, selected }: { definition: MetricDefinition; selected: PlayerComparisonData[] }) {
	const values = selected.map((item) => item.metrics[definition.key]);
	const max = Math.max(1, ...values);
	const ordered = [...values].sort((a, b) => definition.lowerIsBetter ? a - b : b - a);
	return <div className="grid border-b last:border-0" style={{ gridTemplateColumns: `minmax(180px,1.1fr) repeat(${selected.length}, minmax(170px,1fr))` }}><div className="flex items-center p-4 text-xs font-medium">{definition.label}</div>{values.map((value, index) => {
		const rank = ordered.indexOf(value) + 1;
		return <div key={`${definition.key}-${selected[index].player.id}`} className="border-l p-3"><div className="flex items-center gap-2"><span className="w-12 text-right text-xs font-bold tabular-nums">{formatMetric(value, definition.format)}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: COLORS[index] }} /></div><span className={cn("grid size-5 place-items-center rounded-full border text-[9px] font-bold", rank === 1 && "border-primary/40 bg-primary/10 text-primary")}>{rank}</span></div></div>;
	})}</div>;
}

function PerformanceRadar({ selected, pool, role }: { selected: PlayerComparisonData[]; pool: PlayerComparisonData[]; role: Role }) {
	const t = useTranslations("PlayerComparatorPro");
	const axes: Array<{ key: MetricKey; label: string }> = role === "field" ? [
		{ key: "goalsPerMatch", label: t("radar.scoring") }, { key: "efficiency", label: t("radar.efficiency") }, { key: "assistsPerMatch", label: t("radar.creation") }, { key: "recoveries", label: t("radar.recovery") }, { key: "blocks", label: t("radar.blocks") }, { key: "exclusions", label: t("radar.advantages") }
	] : [
		{ key: "savesPerMatch", label: t("radar.saves") }, { key: "savePct", label: t("radar.savePct") }, { key: "penaltySavePct", label: t("radar.penalties") }, { key: "inferiorityEfficiency", label: t("radar.inferiority") }, { key: "recoveries", label: t("radar.recovery") }, { key: "assists", label: t("radar.creation") }
	];
	const chartData = axes.map((axis) => {
		const max = Math.max(1, ...pool.map((item) => item.metrics[axis.key]));
		return selected.reduce<Record<string, string | number>>((row, item) => ({ ...row, [`p${item.player.id}`]: Math.round((item.metrics[axis.key] / max) * 100) }), { metric: axis.label });
	});
	return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">{t("radar.title")}</CardTitle><CardDescription>{t("radar.description")}</CardDescription></CardHeader><CardContent><div className="h-[330px] w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart data={chartData} outerRadius="70%"><PolarGrid /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />{selected.map((item, index) => <Radar key={item.player.id} name={item.player.name} dataKey={`p${item.player.id}`} stroke={COLORS[index]} fill={COLORS[index]} fillOpacity={0.12} strokeWidth={2} />)}<Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></RadarChart></ResponsiveContainer></div></CardContent></Card>;
}

function ContributionPanel({ selected, role, definitions }: { selected: PlayerComparisonData[]; role: Role; definitions: MetricDefinition[] }) {
	const t = useTranslations("PlayerComparatorPro");
	const contributionKey: MetricKey = role === "field" ? "goals" : "saves";
	const contribution = selected.map((item, index) => ({ name: item.player.name, value: item.metrics[contributionKey], color: COLORS[index] }));
	const leaderKeys = role === "field" ? (["goals", "efficiency", "assists", "recoveries"] as MetricKey[]) : (["saves", "savePct", "penaltySavePct", "inferiorityEfficiency"] as MetricKey[]);
	return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">{t(role === "field" ? "contribution.goals" : "contribution.saves")}</CardTitle><CardDescription>{t("contribution.description")}</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]"><div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={contribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>{contribution.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-2">{contribution.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} /><span className="truncate">{item.name}</span></span><span className="font-bold tabular-nums">{item.value}</span></div>)}</div></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("leaders")}</p><div className="grid gap-2 sm:grid-cols-2">{leaderKeys.map((key) => {
		const definition = definitions.find((item) => item.key === key)!;
		const leader = [...selected].sort((a, b) => b.metrics[key] - a.metrics[key])[0];
		return <div key={key} className="flex items-center gap-3 rounded-xl border bg-muted/10 p-3"><PlayerAvatar player={leader.player} size="sm" /><div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{definition.label}</p><p className="text-lg font-bold tabular-nums">{formatMetric(leader.metrics[key], definition.format)}</p><p className="truncate text-[11px] text-muted-foreground">{leader.player.name}</p></div></div>;
	})}</div></div></CardContent></Card>;
}

function formatMetric(value: number, format?: MetricDefinition["format"]) {
	if (format === "percentage") return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
	if (format === "decimal") return value.toFixed(1);
	return String(value);
}
