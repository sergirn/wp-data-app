"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { CalendarDays, Search, Trophy, UserRoundSearch, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMatchOutcome, getOpponentScore, getOwnScore, getVenueScore } from "@/lib/matches/score";
import { accumulateGoalkeeperStats, getGoalkeeperStatValue, getGoalkeeperSummary } from "@/lib/stats/goalkeeperStatsHelpers";
import { accumulatePlayerStats, getPlayerSummary } from "@/lib/stats/playerStatsHelpers";
import type { Match, MatchStats, Player } from "@/lib/types";
import { cn } from "@/lib/utils";

type MetricKey =
	| "goals" | "shots" | "efficiency" | "assists" | "powerPlayGoals" | "powerPlayAttempts" | "powerPlayEfficiency"
	| "recoveries" | "rebounds" | "blocks" | "exclusions" | "penalties" | "turnovers" | "possessionBalance"
	| "saves" | "savesWithRecovery" | "goalsAgainst" | "shotsReceived" | "savePercentage" | "penaltySaves"
	| "penaltyAttempts" | "penaltySavePercentage" | "manDownSaves" | "manDownGoalsAgainst" | "manDownEfficiency";

type MetricDefinition = {
	key: MetricKey;
	label: string;
	format?: "percentage";
	lowerIsBetter?: boolean;
	signed?: boolean;
};

type PlayerMatchData = {
	match: Match;
	metrics: Record<MetricKey, number>;
};

type Props = {
	players: Player[];
	matches: Match[];
	stats: MatchStats[];
	season: string;
	hiddenStats?: string[];
};

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#e11d48"];

const EMPTY_METRICS: Record<MetricKey, number> = {
	goals: 0, shots: 0, efficiency: 0, assists: 0, powerPlayGoals: 0, powerPlayAttempts: 0, powerPlayEfficiency: 0,
	recoveries: 0, rebounds: 0, blocks: 0, exclusions: 0, penalties: 0, turnovers: 0, possessionBalance: 0,
	saves: 0, savesWithRecovery: 0, goalsAgainst: 0, shotsReceived: 0, savePercentage: 0, penaltySaves: 0,
	penaltyAttempts: 0, penaltySavePercentage: 0, manDownSaves: 0, manDownGoalsAgainst: 0, manDownEfficiency: 0
};

export function PlayerMatchComparator({ players, matches, stats, season, hiddenStats = [] }: Props) {
	const t = useTranslations("PlayerMatchComparatorPro");
	const locale = useLocale();
	const matchSearchRef = useRef<HTMLInputElement>(null);
	const [playerId, setPlayerId] = useState<number | null>(null);
	const [selectedMatchIds, setSelectedMatchIds] = useState<number[]>([]);
	const [playerSearch, setPlayerSearch] = useState("");
	const [matchSearch, setMatchSearch] = useState("");
	const [changingPlayer, setChangingPlayer] = useState(false);

	const eligiblePlayerIds = useMemo(() => new Set(stats.map((row) => Number(row.player_id))), [stats]);
	const eligiblePlayers = useMemo(() => players.filter((player) => eligiblePlayerIds.has(Number(player.id))), [eligiblePlayerIds, players]);
	const player = useMemo(() => players.find((item) => Number(item.id) === Number(playerId)) ?? null, [playerId, players]);
	const playerSuggestions = useMemo(() => {
		const term = playerSearch.trim().toLocaleLowerCase(locale);
		return eligiblePlayers
			.filter((item) => !term || item.name.toLocaleLowerCase(locale).includes(term) || String(item.number).includes(term))
			.sort((a, b) => a.number - b.number)
			.slice(0, 12);
	}, [eligiblePlayers, locale, playerSearch]);

	const playerMatchData = useMemo(() => {
		if (!player) return [];
		const rowsByMatch = new Map<number, Array<Record<string, unknown>>>();
		stats.filter((row) => Number(row.player_id) === Number(player.id)).forEach((row) => {
			const matchId = Number(row.match_id);
			rowsByMatch.set(matchId, [...(rowsByMatch.get(matchId) ?? []), row as unknown as Record<string, unknown>]);
		});
		return matches.flatMap((match) => {
			const rows = rowsByMatch.get(Number(match.id));
			if (!rows) return [];
			return [{ match, metrics: buildMetrics(rows, player.is_goalkeeper, hiddenStats) }];
		});
	}, [hiddenStats, matches, player, stats]);

	const selected = useMemo(() => selectedMatchIds.map((id) => playerMatchData.find((item) => item.match.id === id)).filter((item): item is PlayerMatchData => Boolean(item)), [playerMatchData, selectedMatchIds]);
	const matchSuggestions = useMemo(() => {
		const term = matchSearch.trim().toLocaleLowerCase(locale);
		return playerMatchData
			.filter((item) => !term || item.match.opponent.toLocaleLowerCase(locale).includes(term) || String(item.match.jornada ?? "").includes(term))
			.sort((a, b) => b.match.match_date.localeCompare(a.match.match_date))
			.slice(0, 10);
	}, [locale, matchSearch, playerMatchData]);

	const definitions = useMemo<MetricDefinition[]>(() => player?.is_goalkeeper ? [
		{ key: "saves", label: t("metrics.saves") },
		{ key: "savesWithRecovery", label: t("metrics.savesWithRecovery") },
		{ key: "goalsAgainst", label: t("metrics.goalsAgainst"), lowerIsBetter: true },
		{ key: "shotsReceived", label: t("metrics.shotsReceived") },
		{ key: "savePercentage", label: t("metrics.savePercentage"), format: "percentage" },
		{ key: "penaltySaves", label: t("metrics.penaltySaves") },
		{ key: "penaltyAttempts", label: t("metrics.penaltyAttempts") },
		{ key: "penaltySavePercentage", label: t("metrics.penaltySavePercentage"), format: "percentage" },
		{ key: "manDownSaves", label: t("metrics.manDownSaves") },
		{ key: "manDownGoalsAgainst", label: t("metrics.manDownGoalsAgainst"), lowerIsBetter: true },
		{ key: "manDownEfficiency", label: t("metrics.manDownEfficiency"), format: "percentage" },
		{ key: "recoveries", label: t("metrics.recoveries") },
		{ key: "assists", label: t("metrics.assists") },
		{ key: "turnovers", label: t("metrics.turnovers"), lowerIsBetter: true },
		{ key: "possessionBalance", label: t("metrics.possessionBalance"), signed: true }
	] : [
		{ key: "goals", label: t("metrics.goals") },
		{ key: "shots", label: t("metrics.shots") },
		{ key: "efficiency", label: t("metrics.efficiency"), format: "percentage" },
		{ key: "assists", label: t("metrics.assists") },
		{ key: "powerPlayGoals", label: t("metrics.powerPlayGoals") },
		{ key: "powerPlayAttempts", label: t("metrics.powerPlayAttempts") },
		{ key: "powerPlayEfficiency", label: t("metrics.powerPlayEfficiency"), format: "percentage" },
		{ key: "recoveries", label: t("metrics.recoveries") },
		{ key: "rebounds", label: t("metrics.rebounds") },
		{ key: "blocks", label: t("metrics.blocks") },
		{ key: "exclusions", label: t("metrics.exclusions") },
		{ key: "penalties", label: t("metrics.penalties") },
		{ key: "turnovers", label: t("metrics.turnovers"), lowerIsBetter: true },
		{ key: "possessionBalance", label: t("metrics.possessionBalance"), signed: true }
	], [player?.is_goalkeeper, t]);

	const selectPlayer = (id: number) => {
		setPlayerId(id);
		setSelectedMatchIds([]);
		setMatchSearch("");
		setChangingPlayer(false);
	};
	const toggleMatch = (id: number) => setSelectedMatchIds((current) => current.includes(id) ? current.filter((matchId) => matchId !== id) : current.length < 4 ? [...current, id] : current);
	const showPlayerPicker = !player || changingPlayer;

	return <div className="space-y-5">
		<Card className="gap-0 overflow-hidden rounded-2xl py-0 sm:gap-0 sm:py-0">
			<CardHeader className="border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.025] to-transparent py-4 sm:py-5">
				<CardTitle className="flex items-center gap-2"><UserRoundSearch className="size-5 text-primary" />{t("title")}</CardTitle>
				<CardDescription>{t("description", { season })}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5 p-4 sm:p-5">
				{showPlayerPicker ? <div className="space-y-3">
					<div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("choosePlayer")}</p>{player && <Button type="button" variant="ghost" size="sm" onClick={() => setChangingPlayer(false)}>{t("cancel")}</Button>}</div>
					<div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} placeholder={t("searchPlayer")} className="h-11 pl-9" /></div>
					{playerSuggestions.length > 0 ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{playerSuggestions.map((item) => <button key={item.id} type="button" onClick={() => selectPlayer(item.id)} className="flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"><PlayerAvatar player={item} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">#{item.number} · {item.name}</span><span className="block text-[11px] text-muted-foreground">{item.is_goalkeeper ? t("goalkeeper") : t("fieldPlayer")}</span></span></button>)}</div> : <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">{t("noPlayers")}</div>}
				</div> : <>
					<div className="flex flex-col gap-3 rounded-xl border bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 items-center gap-3"><PlayerAvatar player={player} large /><div className="min-w-0"><p className="truncate font-semibold">#{player.number} · {player.name}</p><p className="text-xs text-muted-foreground">{player.is_goalkeeper ? t("goalkeeper") : t("fieldPlayer")} · {t("matchesAvailable", { count: playerMatchData.length })}</p></div></div>
						<Button type="button" variant="outline" size="sm" onClick={() => setChangingPlayer(true)}>{t("changePlayer")}</Button>
					</div>

					<div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("chooseMatches")}</p><div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <MatchSlot key={index} index={index} data={selected[index]} onRemove={toggleMatch} onAdd={() => matchSearchRef.current?.focus()} />)}</div></div>
					<div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input ref={matchSearchRef} value={matchSearch} onChange={(event) => setMatchSearch(event.target.value)} placeholder={t("searchMatch")} className="h-11 pl-9" /></div>
					<div><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{t("matchSuggestions")}</p><Badge variant="secondary">{t("selected", { count: selected.length })}</Badge></div>{matchSuggestions.length > 0 ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{matchSuggestions.map((item) => {
						const isSelected = selectedMatchIds.includes(item.match.id); const outcome = getMatchOutcome(item.match);
						return <button key={item.match.id} type="button" disabled={!isSelected && selectedMatchIds.length >= 4} onClick={() => toggleMatch(item.match.id)} className={cn("flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors", isSelected ? "border-primary/30 bg-primary/[0.06]" : "hover:border-primary/30 hover:bg-muted/35", !isSelected && selectedMatchIds.length >= 4 && "opacity-45")}><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold", outcome === "win" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : outcome === "loss" ? "bg-rose-500/12 text-rose-700 dark:text-rose-300" : "bg-amber-500/12 text-amber-700 dark:text-amber-300")}>{t(`resultLetters.${outcome}`)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.match.opponent}</span><span className="block truncate text-[10px] text-muted-foreground">{t("matchMeta", { round: item.match.jornada ?? "—", score: `${getOwnScore(item.match)}–${getOpponentScore(item.match)}` })}</span></span><span className={cn("shrink-0 text-[10px] font-semibold", isSelected ? "text-muted-foreground" : "text-primary")}>{isSelected ? t("chosen") : t("add")}</span></button>;
					})}</div> : <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">{t("noMatches")}</div>}</div>
				</>}
			</CardContent>
		</Card>

		{player && !showPlayerPicker && (selected.length < 2 ? <Card className="border-dashed bg-muted/15"><CardContent className="flex min-h-24 items-center gap-3 p-5 text-sm text-muted-foreground"><UserRoundSearch className="size-5 shrink-0" />{t("minimum")}</CardContent></Card> : <>
			<ComparisonTable selected={selected} definitions={definitions} />
			<div className="grid gap-5 xl:grid-cols-2"><PerformanceRadar selected={selected} definitions={definitions} goalkeeper={player.is_goalkeeper} /><MatchLeaders selected={selected} definitions={definitions} goalkeeper={player.is_goalkeeper} /></div>
		</>)}
	</div>;
}

function buildMetrics(rows: Array<Record<string, unknown>>, goalkeeper: boolean, hiddenStats: string[]) {
	const metrics = { ...EMPTY_METRICS };
	if (goalkeeper) {
		const totals = accumulateGoalkeeperStats(rows, hiddenStats);
		const summary = getGoalkeeperSummary(totals, hiddenStats);
		metrics.saves = summary.saves;
		metrics.savesWithRecovery = getGoalkeeperStatValue(totals, "portero_paradas_parada_recup", hiddenStats);
		metrics.goalsAgainst = summary.goalsConceded;
		metrics.shotsReceived = summary.shotsReceived;
		metrics.savePercentage = summary.savePct;
		metrics.penaltySaves = summary.penaltySaves;
		metrics.penaltyAttempts = summary.penaltyAttempts;
		metrics.penaltySavePercentage = summary.penaltySavePct;
		metrics.manDownSaves = summary.inferioritySaves;
		metrics.manDownGoalsAgainst = summary.inferiorityGoals;
		metrics.manDownEfficiency = summary.inferiorityEfficiency;
		metrics.recoveries = getGoalkeeperStatValue(totals, "portero_acciones_recuperacion", hiddenStats);
		metrics.assists = getGoalkeeperStatValue(totals, "portero_acciones_asistencias", hiddenStats);
		metrics.turnovers = getGoalkeeperStatValue(totals, "portero_acciones_perdida_pos", hiddenStats);
		metrics.possessionBalance = metrics.recoveries - metrics.turnovers;
		return metrics;
	}
	const totals = accumulatePlayerStats(rows, hiddenStats);
	const summary = getPlayerSummary(totals, hiddenStats);
	metrics.goals = summary.goals;
	metrics.shots = summary.shots;
	metrics.efficiency = summary.efficiency;
	metrics.assists = summary.assists;
	metrics.powerPlayGoals = summary.superiority.goals;
	metrics.powerPlayAttempts = summary.superiority.attempts;
	metrics.powerPlayEfficiency = summary.superiority.efficiency;
	metrics.recoveries = summary.recoveries;
	metrics.rebounds = summary.rebounds;
	metrics.blocks = summary.blocks;
	metrics.exclusions = summary.provokedExclusions;
	metrics.penalties = summary.provokedPenalties;
	metrics.turnovers = summary.losses;
	metrics.possessionBalance = summary.recoveries + summary.rebounds - summary.losses;
	return metrics;
}

function PlayerAvatar({ player, large = false }: { player: Player; large?: boolean }) {
	const size = large ? 52 : 40;
	return <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full border bg-muted font-bold", large ? "size-13 text-sm" : "size-10 text-xs")}>{player.photo_url ? <Image src={player.photo_url} alt="" fill sizes={`${size}px`} className="object-cover object-top" /> : player.number}</span>;
}

function MatchSlot({ index, data, onRemove, onAdd }: { index: number; data?: PlayerMatchData; onRemove: (id: number) => void; onAdd: () => void }) {
	const t = useTranslations("PlayerMatchComparatorPro"); const locale = useLocale();
	if (!data) return <button type="button" onClick={onAdd} className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"><UserRoundSearch className="mb-2 size-5 text-muted-foreground" /><span className="text-sm font-semibold">{t("addMatch")}</span><span className="mt-1 text-[11px] text-muted-foreground">{t("slot", { number: index + 1 })}</span></button>;
	const outcome = getMatchOutcome(data.match); const score = getVenueScore(data.match);
	return <div className="relative flex min-h-36 flex-col rounded-xl border-t-2 bg-card p-3 shadow-sm" style={{ borderTopColor: COLORS[index] }}><button type="button" onClick={() => onRemove(data.match.id)} aria-label={t("remove", { opponent: data.match.opponent })} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-3.5" /></button><span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("slot", { number: index + 1 })}</span><p className="mt-2 line-clamp-1 pr-7 text-sm font-semibold">{data.match.opponent}</p><div className="mt-2 flex items-center gap-2"><Badge variant="outline" className={cn("tabular-nums", outcome === "win" ? "text-emerald-600" : outcome === "loss" ? "text-rose-600" : "text-amber-600")}>{score.local}–{score.visitor}</Badge><span className="text-[10px] text-muted-foreground">{data.match.is_home === false ? t("away") : t("home")}</span></div><div className="mt-auto flex items-center gap-3 pt-2 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="size-3" />{new Date(data.match.match_date).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span><span>J{data.match.jornada ?? "—"}</span></div></div>;
}

function ComparisonTable({ selected, definitions }: { selected: PlayerMatchData[]; definitions: MetricDefinition[] }) {
	const t = useTranslations("PlayerMatchComparatorPro");
	return <Card className="gap-0 overflow-hidden rounded-2xl py-0 sm:gap-0 sm:py-0"><CardHeader className="border-b py-4 sm:py-5"><CardTitle className="text-base">{t("comparisonTitle")}</CardTitle><CardDescription>{t("comparisonDescription")}</CardDescription></CardHeader><CardContent className="overflow-x-auto p-0"><div className="min-w-[760px]"><div className="grid border-b bg-muted/20" style={{ gridTemplateColumns: `minmax(190px,1.1fr) repeat(${selected.length}, minmax(180px,1fr))` }}><div className="p-4 text-xs font-semibold text-muted-foreground">{t("metric")}</div>{selected.map((item, index) => <div key={item.match.id} className="flex items-center gap-2 border-l p-3"><span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} /><span className="truncate text-xs font-semibold">J{item.match.jornada ?? "—"} · {item.match.opponent}</span></div>)}</div>{definitions.map((definition) => <MetricRow key={definition.key} definition={definition} selected={selected} />)}</div></CardContent></Card>;
}

function MetricRow({ definition, selected }: { definition: MetricDefinition; selected: PlayerMatchData[] }) {
	const values = selected.map((item) => item.metrics[definition.key]); const min = Math.min(0, ...values); const max = Math.max(1, ...values); const magnitude = Math.max(1, max - min); const ordered = [...values].sort((a, b) => definition.lowerIsBetter ? a - b : b - a);
	return <div className="grid border-b last:border-0" style={{ gridTemplateColumns: `minmax(190px,1.1fr) repeat(${selected.length}, minmax(180px,1fr))` }}><div className="flex items-center p-4 text-xs font-medium">{definition.label}</div>{values.map((value, index) => <div key={`${definition.key}-${selected[index].match.id}`} className="border-l p-3"><div className="flex items-center gap-2"><span className="w-12 text-right text-xs font-bold tabular-nums">{formatMetric(value, definition)}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${((value - min) / magnitude) * 100}%`, backgroundColor: COLORS[index] }} /></div><span className={cn("grid size-5 place-items-center rounded-full border text-[9px] font-bold", ordered.indexOf(value) === 0 && "border-primary/40 bg-primary/10 text-primary")}>{ordered.indexOf(value) + 1}</span></div></div>)}</div>;
}

function PerformanceRadar({ selected, definitions, goalkeeper }: { selected: PlayerMatchData[]; definitions: MetricDefinition[]; goalkeeper: boolean }) {
	const t = useTranslations("PlayerMatchComparatorPro");
	const keys: MetricKey[] = goalkeeper ? ["saves", "savePercentage", "penaltySavePercentage", "manDownEfficiency", "recoveries", "possessionBalance"] : ["goals", "efficiency", "assists", "powerPlayEfficiency", "recoveries", "blocks"];
	const axes = keys.map((key) => definitions.find((item) => item.key === key)!);
	const chartData = axes.map((axis) => { const values = selected.map((item) => item.metrics[axis.key]); const min = Math.min(0, ...values); const max = Math.max(1, ...values); return selected.reduce<Record<string, string | number>>((row, item) => ({ ...row, [`m${item.match.id}`]: Math.round(((item.metrics[axis.key] - min) / (max - min || 1)) * 100) }), { metric: axis.label }); });
	return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">{t("radarTitle")}</CardTitle><CardDescription>{t("radarDescription")}</CardDescription></CardHeader><CardContent><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={chartData} outerRadius="70%"><PolarGrid /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />{selected.map((item, index) => <Radar key={item.match.id} name={`J${item.match.jornada ?? "—"} · ${item.match.opponent}`} dataKey={`m${item.match.id}`} stroke={COLORS[index]} fill={COLORS[index]} fillOpacity={0.12} strokeWidth={2} />)}<Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></RadarChart></ResponsiveContainer></div></CardContent></Card>;
}

function MatchLeaders({ selected, definitions, goalkeeper }: { selected: PlayerMatchData[]; definitions: MetricDefinition[]; goalkeeper: boolean }) {
	const t = useTranslations("PlayerMatchComparatorPro"); const keys: MetricKey[] = goalkeeper ? ["saves", "savePercentage", "penaltySavePercentage", "manDownEfficiency"] : ["goals", "efficiency", "assists", "recoveries"];
	return <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="size-4 text-primary" />{t("leaders")}</CardTitle><CardDescription>{t("leadersDescription")}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{keys.map((key) => { const definition = definitions.find((item) => item.key === key)!; const leader = [...selected].sort((a, b) => b.metrics[key] - a.metrics[key])[0]; return <div key={key} className="rounded-xl border bg-muted/10 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{definition.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatMetric(leader.metrics[key], definition)}</p><p className="mt-1 truncate text-xs text-muted-foreground">J{leader.match.jornada ?? "—"} · {leader.match.opponent}</p></div>; })}</CardContent></Card>;
}

function formatMetric(value: number, definition: MetricDefinition) {
	if (definition.format === "percentage") return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
	return definition.signed && value > 0 ? `+${value}` : String(value);
}
