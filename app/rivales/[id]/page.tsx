"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarDays, ChevronDown, ChevronRight, Crosshair, Settings2, Shield, Sparkles, Swords } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { GoalkeeperShotsGoalChart } from "@/components/analytics-goalkeeper/GoalkeeperShotsGoalChart";
import { OpponentAliasManager } from "@/components/opponents/OpponentAliasManager";
import { OpponentAdvancedAnalysis, OpponentTrendChart, OpponentVenueComparison } from "@/components/opponents/OpponentAdvancedAnalysis";
import { OpponentNotes } from "@/components/opponents/OpponentNotes";
import { OpponentPreparationPanel } from "@/components/opponents/OpponentPreparationPanel";
import { OpponentDataQuality, OpponentExecutiveSummary, OpponentPlayersTable } from "@/components/opponents/OpponentScoutingOverview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClub } from "@/lib/club-context";
import { getMatchOutcome, getVenueScore } from "@/lib/matches/score";
import { buildOpponentScouting, type ScoutingAction, type ScoutingMatch, type ScoutingStat } from "@/lib/opponents/scouting";
import { useProfile } from "@/lib/profile-context";
import { createClient } from "@/lib/supabase/client";
import { fetchAllByIdBatches, fetchAllPages } from "@/lib/supabase/fetch-all-pages";
import type { Opponent, OpponentNote } from "@/lib/types";

type AliasRow = { id: number; alias: string };
type GoalkeeperShot = { id: number; match_id: number; goalkeeper_player_id: number; x: number; y: number; result: "goal" | "save" | "out" };
type OpponentTab = "summary" | "analysis" | "prepare";

export default function OpponentDetailPage() {
	const t = useTranslations("Opponents");
	const locale = useLocale();
	const params = useParams<{ id: string }>();
	const searchParams = useSearchParams();
	const opponentId = Number(params.id);
	const { currentClub } = useClub();
	const { profile } = useProfile();
	const [opponent, setOpponent] = useState<Opponent | null>(null);
	const [aliases, setAliases] = useState<AliasRow[]>([]);
	const [notes, setNotes] = useState<OpponentNote[]>([]);
	const [matches, setMatches] = useState<ScoutingMatch[]>([]);
	const [stats, setStats] = useState<ScoutingStat[]>([]);
	const [actions, setActions] = useState<ScoutingAction[]>([]);
	const [shots, setShots] = useState<GoalkeeperShot[]>([]);
	const [activeSeason, setActiveSeason] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [setupRequired, setSetupRequired] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const [showAllMatches, setShowAllMatches] = useState(false);
	const canEdit = profile?.role === "admin" || profile?.role === "coach";

	const load = useCallback(async () => {
		if (!currentClub) {
			setLoading(false);
			return;
		}
		if (!Number.isInteger(opponentId) || opponentId <= 0) {
			setNotFound(true);
			setLoading(false);
			return;
		}
		setLoading(true);
		setNotFound(false);
		setSetupRequired(false);
		setLoadError(false);
		const supabase = createClient();
		const { data: opponentRow, error: opponentError } = await supabase.from("opponents").select("*").eq("id", opponentId).eq("club_id", currentClub.id).maybeSingle();
		if (opponentError) {
			setSetupRequired(opponentError.code === "42P01" || opponentError.code === "42703");
			setLoadError(opponentError.code !== "42P01" && opponentError.code !== "42703");
			setLoading(false);
			return;
		}
		if (!opponentRow) {
			setNotFound(true);
			setLoading(false);
			return;
		}

		const [aliasesResult, notesResult, matchesResult, activeSeasonResult] = await Promise.all([
			supabase.from("opponent_aliases").select("id, alias").eq("opponent_id", opponentId).order("alias"),
			supabase.from("opponent_notes").select("*").eq("opponent_id", opponentId).order("updated_at", { ascending: false }),
			fetchAllPages<ScoutingMatch>(async (from, to) => {
				const { data, error } = await supabase.from("matches").select("id, match_date, opponent, season, home_score, away_score, is_home, jornada, location, competition_id, stats_enabled, penalty_home_score, penalty_away_score, q1_score, q1_score_rival, q2_score, q2_score_rival, q3_score, q3_score_rival, q4_score, q4_score_rival, competitions:competition_id(id, name, slug, image_url)").eq("club_id", currentClub.id).eq("opponent_id", opponentId).order("match_date", { ascending: false }).range(from, to);
				const normalized = (data ?? []).map((row) => ({ ...row, competitions: Array.isArray(row.competitions) ? row.competitions[0] ?? null : row.competitions }));
				return { data: normalized as ScoutingMatch[], error };
			}),
			supabase.from("club_seasons").select("name").eq("club_id", currentClub.id).eq("status", "active").maybeSingle()
		]);
		const relatedError = aliasesResult.error ?? notesResult.error ?? matchesResult.error;
		if (relatedError) {
			setSetupRequired(relatedError.code === "42P01" || relatedError.code === "42703");
			setLoadError(relatedError.code !== "42P01" && relatedError.code !== "42703");
			setLoading(false);
			return;
		}

		const matchRows = (matchesResult.data ?? []) as ScoutingMatch[];
		const matchIds = matchRows.map((match) => match.id);
		let statRows: ScoutingStat[] = [];
		let shotRows: GoalkeeperShot[] = [];
		let actionRows: ScoutingAction[] = [];
		if (matchIds.length > 0) {
			const [statsResult, shotsResult, actionsResult] = await Promise.all([
				fetchAllByIdBatches<ScoutingStat, number>(matchIds, async (batch, from, to) => {
					const { data, error } = await supabase.from("match_stats").select("*, players:player_id(id, name, number, is_goalkeeper, photo_url)").in("match_id", batch).range(from, to);
					return { data: (data ?? []).map((row) => ({ ...row, players: Array.isArray(row.players) ? row.players[0] ?? null : row.players })) as ScoutingStat[], error };
				}),
				fetchAllByIdBatches<GoalkeeperShot, number>(matchIds, async (batch, from, to) => {
					const { data, error } = await supabase.from("goalkeeper_shots").select("id, match_id, goalkeeper_player_id, x, y, result").in("match_id", batch).range(from, to);
					return { data: data as GoalkeeperShot[] | null, error };
				}),
				fetchAllByIdBatches<ScoutingAction, number>(matchIds, async (batch, from, to) => {
					const { data, error } = await supabase.from("match_actions").select("match_id, player_id, quarter, sequence, action_key").in("match_id", batch).order("sequence").range(from, to);
					return { data: data as ScoutingAction[] | null, error };
				})
			]);
			if (statsResult.error || shotsResult.error || actionsResult.error) {
				setLoadError(true);
				setLoading(false);
				return;
			}
			statRows = statsResult.data ?? [];
			shotRows = (shotsResult.data ?? []) as GoalkeeperShot[];
			actionRows = actionsResult.data ?? [];
		}

		setOpponent(opponentRow as Opponent);
		setAliases((aliasesResult.data ?? []) as AliasRow[]);
		setNotes((notesResult.data ?? []) as OpponentNote[]);
		setMatches(matchRows);
		setStats(statRows);
		setShots(shotRows);
		setActions(actionRows);
		setActiveSeason(activeSeasonResult.data?.name ?? null);
		setLoading(false);
	}, [currentClub, opponentId]);

	useEffect(() => {
		const timeout = window.setTimeout(() => void load(), 0);
		return () => window.clearTimeout(timeout);
	}, [load]);

	const seasons = useMemo(() => [...new Set(matches.map((match) => match.season).filter((season): season is string => Boolean(season)))].sort().reverse(), [matches]);
	const requestedSeason = searchParams.get("season") ?? activeSeason ?? "all";
	const selectedSeason = requestedSeason === "all" || seasons.includes(requestedSeason) ? requestedSeason : "all";
	const requestedTab = searchParams.get("tab");
	const activeTab: OpponentTab = requestedTab === "analysis" || requestedTab === "prepare" ? requestedTab : "summary";
	const visibleMatches = useMemo(() => selectedSeason === "all" ? matches : matches.filter((match) => match.season === selectedSeason), [matches, selectedSeason]);
	const visibleMatchIds = useMemo(() => new Set(visibleMatches.map((match) => match.id)), [visibleMatches]);
	const visibleShots = useMemo(() => shots.filter((shot) => visibleMatchIds.has(shot.match_id)), [shots, visibleMatchIds]);
	const scouting = useMemo(() => buildOpponentScouting(visibleMatches, stats, actions), [visibleMatches, stats, actions]);
	const detailedMatchIds = useMemo(() => new Set(stats.filter((stat) => visibleMatchIds.has(stat.match_id)).map((stat) => stat.match_id)), [stats, visibleMatchIds]);
	const verifiedMatchIds = useMemo(() => new Set(scouting.dataQuality.verifiedMatchIds), [scouting.dataQuality.verifiedMatchIds]);
	const displayedMatches = showAllMatches ? scouting.matches : scouting.matches.slice(0, 5);

	const updateQuery = (key: "tab" | "season", value: string) => {
		const next = new URLSearchParams(searchParams.toString());
		if ((key === "tab" && value === "summary") || (key === "season" && value === activeSeason)) next.delete(key);
		else next.set(key, value);
		const query = next.toString();
		window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
	};

	if (loading) return <main className="container mx-auto max-w-7xl px-4 py-8"><div className="h-64 animate-pulse rounded-2xl border bg-muted/30" /></main>;
	if (setupRequired) return <main className="container mx-auto max-w-7xl px-4 py-8"><Alert><Shield className="h-4 w-4" /><AlertTitle>{t("setupTitle")}</AlertTitle><AlertDescription>{t("setupDescription")}</AlertDescription></Alert></main>;
	if (loadError) return <main className="container mx-auto max-w-7xl px-4 py-8"><Alert variant="destructive"><AlertTitle>{t("loadErrorTitle")}</AlertTitle><AlertDescription>{t("loadErrorDescription")}</AlertDescription></Alert></main>;
	if (notFound || !opponent || !currentClub || !profile) return <main className="container mx-auto max-w-7xl px-4 py-8"><Alert><AlertTitle>{t("notFound")}</AlertTitle></Alert></main>;

	const goalkeeperPlayers = stats
		.filter((stat) => visibleMatchIds.has(stat.match_id) && stat.players?.is_goalkeeper)
		.map((stat) => ({ id: stat.players!.id, name: stat.players!.name, is_goalkeeper: true }))
		.filter((player, index, rows) => rows.findIndex((candidate) => candidate.id === player.id) === index);

	return (
		<main className="container mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
			<Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground"><Link href="/rivales"><ArrowLeft className="mr-2 h-4 w-4" />{t("back")}</Link></Button>
			<header className="relative mb-5 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:mb-6 sm:p-7">
				<div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-w-0 items-center gap-4">
						<div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-muted/30 sm:size-20">{opponent.logo_url ? <Image src={opponent.logo_url} alt="" fill sizes="80px" className="object-contain p-2" /> : <Shield className="h-9 w-9 text-muted-foreground/55" />}</div>
						<div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary"><Swords className="h-3.5 w-3.5" />{t("scoutingReport")}</div><h1 className="truncate text-2xl font-bold sm:text-3xl">{opponent.name}</h1><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="secondary">{t("meetings", { count: scouting.played })}</Badge><Badge variant="outline">{t(`confidence.${scouting.confidence}`)}</Badge><Badge variant="outline" className="hidden sm:inline-flex">{t("coverage", { detailed: scouting.dataQuality.detailedMatches, total: scouting.played })}</Badge><Badge variant="outline" className="hidden md:inline-flex">{t("verifiedCoverage", { verified: scouting.dataQuality.verifiedMatches, detailed: scouting.dataQuality.detailedMatches })}</Badge><Badge variant="outline" className="hidden md:inline-flex">{t("notesCount", { count: notes.length })}</Badge>{seasons.length > 0 && <Select value={selectedSeason} onValueChange={(value) => updateQuery("season", value)}><SelectTrigger className="h-7 w-auto min-w-32 text-xs sm:min-w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("allSeasons")}</SelectItem>{seasons.map((season) => <SelectItem key={season} value={season}>{season}</SelectItem>)}</SelectContent></Select>}</div></div>
					</div>
					<details className="group w-full rounded-xl border bg-muted/10 lg:max-w-md"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium"><span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" />{t("aliases.title")}</span><ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary><div className="px-3 pb-3"><OpponentAliasManager opponentId={opponent.id} aliases={aliases} canEdit={canEdit} onChanged={load} /></div></details>
				</div>
			</header>

			<Tabs value={activeTab} onValueChange={(value) => updateQuery("tab", value)} className="space-y-5">
				<TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
					<TabsTrigger value="summary" className="min-w-0 gap-1 py-2.5 text-[11px] sm:text-sm"><BarChart3 className="hidden h-4 w-4 min-[360px]:block" />{t("tabs.summary")}</TabsTrigger>
					<TabsTrigger value="analysis" className="min-w-0 gap-1 py-2.5 text-[11px] sm:text-sm"><Crosshair className="hidden h-4 w-4 min-[360px]:block" />{t("tabs.analysis")}</TabsTrigger>
					<TabsTrigger value="prepare" className="min-w-0 gap-1 py-2.5 text-[11px] sm:text-sm"><Sparkles className="hidden h-4 w-4 min-[360px]:block" />{t("tabs.prepare")}</TabsTrigger>
				</TabsList>

				<TabsContent value="summary" className="space-y-5">
					<OpponentExecutiveSummary scouting={scouting} />
					<div className="grid items-stretch gap-5 lg:grid-cols-2"><OpponentTrendChart scouting={scouting} /><OpponentVenueComparison scouting={scouting} /></div>
					<div className="grid items-stretch gap-5 lg:grid-cols-2">
						<Card className="h-full"><CardHeader><CardTitle>{t("quarters.title")}</CardTitle><CardDescription>{t("quarters.description")}</CardDescription></CardHeader><CardContent className="space-y-4">{scouting.quarters.map((quarter) => <QuarterBar key={quarter.quarter} {...quarter} label={t("quarter", { number: quarter.quarter })} sampleLabel={t("quarters.sample", { count: quarter.sampleSize })} winLabel={t("quarters.won", { value: quarter.winPercentage })} />)}</CardContent></Card>
						<OpponentDataQuality scouting={scouting} />
					</div>
					<Card className="overflow-hidden"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{t("matches.title")}</CardTitle><CardDescription className="mt-1">{t("matches.descriptionExtended")}</CardDescription></div><CalendarDays className="h-5 w-5 text-primary" /></div></CardHeader><CardContent className="p-0"><div className="hidden grid-cols-[minmax(14rem,1.2fr)_minmax(11rem,.9fr)_minmax(9rem,.7fr)_minmax(10rem,.8fr)_1.5rem] items-center gap-4 border-y bg-muted/25 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground lg:grid"><span>{t("matches.columns.match")}</span><span>{t("matches.columns.context")}</span><span>{t("matches.columns.result")}</span><span>{t("matches.columns.quality")}</span><span className="sr-only">{t("matches.columns.open")}</span></div>{displayedMatches.map((match) => <MatchRow key={match.id} match={match} locale={locale} homeLabel={t("home")} awayLabel={t("away")} resultLabel={t(`results.${getMatchOutcome(match)}`)} quality={verifiedMatchIds.has(match.id) ? "verified" : detailedMatchIds.has(match.id) ? "partial" : "none"} qualityLabel={t(`matches.quality.${verifiedMatchIds.has(match.id) ? "verified" : detailedMatchIds.has(match.id) ? "partial" : "none"}`)} />)}{scouting.matches.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("noMeetings")}</p>}{scouting.matches.length > 5 && <div className="border-t p-2"><Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setShowAllMatches((current) => !current)}>{showAllMatches ? t("recent.showRecent") : t("recent.showAll", { count: scouting.matches.length })}</Button></div>}</CardContent></Card>
				</TabsContent>

				<TabsContent value="analysis" className="space-y-5">
					<OpponentAdvancedAnalysis scouting={scouting} />
					<GoalkeeperShotsGoalChart rows={visibleShots} matches={scouting.matches} players={goalkeeperPlayers} />
					<OpponentPlayersTable scouting={scouting} />
				</TabsContent>

				<TabsContent value="prepare" className="space-y-5"><OpponentPreparationPanel opponentName={opponent.name} scouting={scouting} /><OpponentNotes opponentId={opponent.id} clubId={currentClub.id} profileId={profile.id} notes={notes} canEdit={canEdit} onNotesChange={setNotes} /></TabsContent>
			</Tabs>
		</main>
	);
}

function MatchRow({ match, locale, homeLabel, awayLabel, resultLabel, quality, qualityLabel }: { match: ScoutingMatch; locale: string; homeLabel: string; awayLabel: string; resultLabel: string; quality: "verified" | "partial" | "none"; qualityLabel: string }) {
	const outcome = getMatchOutcome(match);
	const score = getVenueScore(match);
	const date = new Date(match.match_date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
	const venue = match.is_home === false ? awayLabel : homeLabel;
	const outcomeClass = outcome === "win" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600" : outcome === "loss" ? "border-red-500/25 bg-red-500/10 text-red-600" : "border-amber-500/25 bg-amber-500/10 text-amber-600";
	const qualityClass = quality === "verified" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600" : quality === "partial" ? "border-amber-500/25 bg-amber-500/10 text-amber-600" : "text-muted-foreground";

	return (
		<Link href={`/partidos/${match.id}`} className="group block border-b transition-colors last:border-0 hover:bg-primary/[0.035] focus-visible:bg-primary/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
			<div className="p-4 lg:hidden">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="text-sm font-semibold">{date}</p>
						<p className="mt-0.5 truncate text-[11px] text-muted-foreground">{match.competitions?.name ?? match.season ?? "—"}{match.jornada ? ` · J${match.jornada}` : ""}</p>
					</div>
					<Badge variant="outline" className={qualityClass}>{qualityLabel}</Badge>
				</div>
				<div className="mt-3 flex items-end justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-2.5">
					<div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{venue}</p><p className="mt-0.5 truncate text-xs">{match.location ?? "—"}</p></div>
					<div className="flex shrink-0 items-center gap-2"><span className="text-xl font-bold tabular-nums">{score.local}–{score.visitor}</span><Badge variant="outline" className={outcomeClass}>{resultLabel}</Badge><ChevronRight className="size-4 text-muted-foreground" /></div>
				</div>
			</div>

			<div className="hidden grid-cols-[minmax(14rem,1.2fr)_minmax(11rem,.9fr)_minmax(9rem,.7fr)_minmax(10rem,.8fr)_1.5rem] items-center gap-4 px-5 py-4 lg:grid">
				<div className="min-w-0"><p className="text-sm font-semibold">{date}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{match.competitions?.name ?? match.season ?? "—"}{match.competitions?.name && match.season ? ` · ${match.season}` : ""}</p></div>
				<div className="min-w-0"><p className="text-xs font-medium">{venue}{match.jornada ? ` · J${match.jornada}` : ""}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{match.location ?? "—"}</p></div>
				<div className="flex items-center gap-2"><span className="text-lg font-bold tabular-nums">{score.local}–{score.visitor}</span><Badge variant="outline" className={outcomeClass}>{resultLabel}</Badge></div>
				<Badge variant="outline" className={qualityClass}>{qualityLabel}</Badge>
				<ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
			</div>
		</Link>
	);
}

function QuarterBar({ label, own, opponent, difference, sampleSize, sampleLabel, winLabel }: { label: string; own: number; opponent: number; difference: number; sampleSize: number; sampleLabel: string; winLabel: string }) {
	const total = Math.max(1, own + opponent);
	return <div className="rounded-xl border bg-muted/10 p-3"><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span><span className="font-semibold">{label}</span><span className="ml-2 text-muted-foreground">{sampleLabel}</span></span>{sampleSize > 0 ? <span className={difference > 0 ? "font-semibold text-emerald-600" : difference < 0 ? "font-semibold text-red-600" : "font-semibold text-muted-foreground"}>{own.toFixed(1)}–{opponent.toFixed(1)}</span> : <span className="text-muted-foreground">—</span>}</div>{sampleSize > 0 ? <><div className="flex h-2 overflow-hidden rounded-full bg-muted"><div className="bg-primary" style={{ width: `${(own / total) * 100}%` }} /><div className="bg-red-400/65" style={{ width: `${(opponent / total) * 100}%` }} /></div><p className="mt-1.5 text-[11px] text-muted-foreground">{winLabel}</p></> : <div className="h-2 rounded-full border border-dashed bg-muted/20" />}</div>;
}
