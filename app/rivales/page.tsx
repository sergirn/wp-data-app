"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronRight, Search, Shield, Swords } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClub } from "@/lib/club-context";
import { getMatchOutcome, getOpponentScore, getOwnScore, getVenueScore } from "@/lib/matches/score";
import type { Match, Opponent } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { fetchAllByIdBatches, fetchAllPages } from "@/lib/supabase/fetch-all-pages";

type OpponentMatch = Pick<Match, "id" | "opponent_id" | "opponent" | "match_date" | "home_score" | "away_score" | "is_home" | "season" | "stats_enabled" | "penalty_home_score" | "penalty_away_score">;
type OpponentAlias = { opponent_id: number; alias: string };

export default function OpponentsPage() {
	const t = useTranslations("Opponents");
	const locale = useLocale();
	const { currentClub } = useClub();
	const [opponents, setOpponents] = useState<Opponent[]>([]);
	const [matches, setMatches] = useState<OpponentMatch[]>([]);
	const [aliases, setAliases] = useState<OpponentAlias[]>([]);
	const [statMatchIds, setStatMatchIds] = useState<Set<number>>(new Set());
	const [search, setSearch] = useState("");
	const [seasonFilter, setSeasonFilter] = useState("all");
	const [sortBy, setSortBy] = useState<"recent" | "meetings" | "difficulty" | "coverage">("recent");
	const [loading, setLoading] = useState(true);
	const [setupRequired, setSetupRequired] = useState(false);
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		async function load() {
			setLoading(true);
			setSetupRequired(false);
			setLoadError(false);
			setOpponents([]);
			setMatches([]);
			setAliases([]);
			setStatMatchIds(new Set());
			if (!currentClub) {
				setLoading(false);
				return;
			}

			const supabase = createClient();
			const [opponentsResult, aliasesResult, matchesResult, activeSeasonResult] = await Promise.all([
				supabase.from("opponents").select("*").eq("club_id", currentClub.id).order("name").abortSignal(controller.signal),
				supabase.from("opponent_aliases").select("opponent_id, alias").eq("club_id", currentClub.id).abortSignal(controller.signal),
				fetchAllPages<OpponentMatch>(async (from, to) => {
					const { data, error } = await supabase.from("matches").select("id, opponent_id, opponent, match_date, home_score, away_score, is_home, season, stats_enabled, penalty_home_score, penalty_away_score").eq("club_id", currentClub.id).not("opponent_id", "is", null).order("match_date", { ascending: false }).range(from, to).abortSignal(controller.signal);
					return { data: data as OpponentMatch[] | null, error };
				}),
				supabase.from("club_seasons").select("name").eq("club_id", currentClub.id).eq("status", "active").abortSignal(controller.signal).maybeSingle()
			]);

			if (controller.signal.aborted) return;
			if (opponentsResult.error || aliasesResult.error || matchesResult.error) {
				const code = opponentsResult.error?.code ?? aliasesResult.error?.code ?? matchesResult.error?.code;
				setSetupRequired(code === "42P01" || code === "42703");
				setLoadError(code !== "42P01" && code !== "42703");
				setLoading(false);
				return;
			}

			setOpponents((opponentsResult.data ?? []) as Opponent[]);
			setAliases((aliasesResult.data ?? []) as OpponentAlias[]);
			const loadedMatches = (matchesResult.data ?? []) as OpponentMatch[];
			setMatches(loadedMatches);
			if (!activeSeasonResult.error && activeSeasonResult.data?.name) setSeasonFilter(activeSeasonResult.data.name);
			const loadedMatchIds = loadedMatches.map((match) => match.id);
			if (loadedMatchIds.length > 0) {
				const statsResult = await fetchAllByIdBatches<{ match_id: number }, number>(loadedMatchIds, async (batch, from, to) => {
					const { data, error } = await supabase.from("match_stats").select("match_id").in("match_id", batch).range(from, to).abortSignal(controller.signal);
					return { data: data as Array<{ match_id: number }> | null, error };
				});
				if (controller.signal.aborted) return;
				if (statsResult.error) {
					setLoadError(true);
					setLoading(false);
					return;
				}
				setStatMatchIds(new Set((statsResult.data ?? []).map((row) => row.match_id)));
			}
			setLoading(false);
		}

		void load();
		return () => controller.abort();
	}, [currentClub]);

	const seasons = useMemo(() => [...new Set(matches.map((match) => match.season).filter((season): season is string => Boolean(season)))].sort().reverse(), [matches]);
	const scopedMatches = useMemo(() => seasonFilter === "all" ? matches : matches.filter((match) => match.season === seasonFilter), [matches, seasonFilter]);
	const cards = useMemo(() => opponents.map((opponent) => {
		const opponentMatches = scopedMatches.filter((match) => match.opponent_id === opponent.id);
		const outcomes = opponentMatches.map(getMatchOutcome);
		const detailedMatches = opponentMatches.filter((match) => statMatchIds.has(match.id)).length;
		const ownGoals = opponentMatches.reduce((total, match) => total + getOwnScore(match), 0);
		const opponentGoals = opponentMatches.reduce((total, match) => total + getOpponentScore(match), 0);
		return {
			opponent,
			matches: opponentMatches,
			wins: outcomes.filter((outcome) => outcome === "win").length,
			draws: outcomes.filter((outcome) => outcome === "draw").length,
			losses: outcomes.filter((outcome) => outcome === "loss").length,
			recentForm: outcomes.slice(0, 5),
			detailedMatches,
			coverage: opponentMatches.length > 0 ? Math.round((detailedMatches / opponentMatches.length) * 100) : 0,
			averageDifference: opponentMatches.length > 0 ? (ownGoals - opponentGoals) / opponentMatches.length : 0,
			lastMatch: opponentMatches[0] ?? null
		};
	}).filter(({ opponent }) => {
		const term = search.trim().toLocaleLowerCase(locale);
		const opponentAliases = aliases.filter((item) => item.opponent_id === opponent.id);
		return !term || opponent.name.toLocaleLowerCase(locale).includes(term) || opponent.short_name?.toLocaleLowerCase(locale).includes(term) || opponentAliases.some((item) => item.alias.toLocaleLowerCase(locale).includes(term));
	}).sort((a, b) => {
		if (sortBy === "meetings") return b.matches.length - a.matches.length || (b.lastMatch?.match_date ?? "").localeCompare(a.lastMatch?.match_date ?? "");
		if (sortBy === "difficulty") return a.averageDifference - b.averageDifference || b.matches.length - a.matches.length;
		if (sortBy === "coverage") return a.coverage - b.coverage || b.matches.length - a.matches.length;
		return (b.lastMatch?.match_date ?? "").localeCompare(a.lastMatch?.match_date ?? "");
	}), [aliases, locale, opponents, scopedMatches, search, sortBy, statMatchIds]);

	return (
		<main className="container mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
			<header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Swords className="h-4 w-4" />{t("eyebrow")}</div>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("description")}</p>
				</div>
				<div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[11rem_11rem_18rem]">
					<Select value={seasonFilter} onValueChange={setSeasonFilter}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("allSeasons")}</SelectItem>{seasons.map((season) => <SelectItem key={season} value={season}>{season}</SelectItem>)}</SelectContent></Select>
					<Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">{t("sort.recent")}</SelectItem><SelectItem value="meetings">{t("sort.meetings")}</SelectItem><SelectItem value="difficulty">{t("sort.difficulty")}</SelectItem><SelectItem value="coverage">{t("sort.coverage")}</SelectItem></SelectContent></Select>
					<div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} className="pl-9" /></div>
				</div>
			</header>

			{setupRequired ? (
				<Alert><Shield className="h-4 w-4" /><AlertTitle>{t("setupTitle")}</AlertTitle><AlertDescription>{t("setupDescription")}</AlertDescription></Alert>
			) : loadError ? (
				<Alert variant="destructive"><AlertTitle>{t("loadErrorTitle")}</AlertTitle><AlertDescription>{t("loadErrorDescription")}</AlertDescription></Alert>
			) : loading ? (
				<div className="overflow-hidden rounded-2xl border bg-card">{[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse border-b bg-muted/20 last:border-0" />)}</div>
			) : cards.length === 0 ? (
				<Card><CardContent className="flex flex-col items-center py-14 text-center"><Shield className="mb-3 h-10 w-10 text-muted-foreground/50" /><p className="font-medium">{t(search ? "emptySearch" : "empty")}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{t("emptyHint")}</p></CardContent></Card>
			) : (
				<div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
					<div className="hidden grid-cols-[minmax(15rem,1.5fr)_minmax(11rem,1fr)_minmax(8rem,.8fr)_minmax(9rem,.8fr)_minmax(13rem,1fr)_2rem] items-center gap-5 border-b bg-muted/25 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
						<span>{t("list.opponent")}</span>
						<span>{t("list.record")}</span>
						<span>{t("list.form")}</span>
						<span>{t("list.analysis")}</span>
						<span>{t("list.lastMeeting")}</span>
						<span className="sr-only">{t("scoutingReport")}</span>
					</div>
					{cards.map((card) => <OpponentRow key={card.opponent.id} {...card} locale={locale} />)}
				</div>
			)}
		</main>
	);
}

type OpponentCard = {
		opponent: Opponent;
		matches: OpponentMatch[];
		wins: number;
		draws: number;
		losses: number;
		recentForm: Array<"win" | "draw" | "loss">;
		detailedMatches: number;
		coverage: number;
		averageDifference: number;
		lastMatch: OpponentMatch | null;
	};

function OpponentRow({ opponent, matches, wins, draws, losses, recentForm, detailedMatches, coverage, averageDifference, lastMatch, locale }: OpponentCard & { locale: string }) {
	const t = useTranslations("Opponents");
	const lastScore = lastMatch ? getVenueScore(lastMatch) : null;
	const lastOutcome = lastMatch ? getMatchOutcome(lastMatch) : null;
	const totalResults = Math.max(1, wins + draws + losses);

	return (
		<Link href={`/rivales/${opponent.id}`} className="group block border-b transition-colors last:border-0 hover:bg-primary/[0.035] focus-visible:bg-primary/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
			<div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(15rem,1.5fr)_minmax(11rem,1fr)_minmax(8rem,.8fr)_minmax(9rem,.8fr)_minmax(13rem,1fr)_2rem] lg:items-center lg:gap-5">
				<div className="flex min-w-0 items-center gap-3.5">
					<div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-background shadow-sm transition-transform group-hover:scale-[1.03]">
						{opponent.logo_url ? <Image src={opponent.logo_url} alt="" fill sizes="56px" className="object-contain p-1.5" /> : <Shield className="size-7 text-muted-foreground/55" />}
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h2 className="truncate font-semibold tracking-tight sm:text-base">{opponent.name}</h2>
							<ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground lg:hidden" />
						</div>
						<p className="mt-0.5 text-xs text-muted-foreground">{t("meetings", { count: matches.length })}{opponent.short_name ? ` · ${opponent.short_name}` : ""}</p>
					</div>
				</div>

				<div className="rounded-xl border bg-muted/10 p-3 lg:border-0 lg:bg-transparent lg:p-0">
					<div className="flex items-center justify-between gap-3 text-xs">
						<span className="text-muted-foreground lg:hidden">{t("list.record")}</span>
						<span className="font-semibold tabular-nums"><span className="text-emerald-600 dark:text-emerald-400">{wins}{t("wins")}</span><span className="mx-2 text-border">/</span><span className="text-amber-600 dark:text-amber-400">{draws}{t("draws")}</span><span className="mx-2 text-border">/</span><span className="text-rose-600 dark:text-rose-400">{losses}{t("losses")}</span></span>
						<span className={`font-bold tabular-nums ${averageDifference > 0 ? "text-emerald-600 dark:text-emerald-400" : averageDifference < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>{averageDifference > 0 ? "+" : ""}{averageDifference.toFixed(1)}</span>
					</div>
					<div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
						<div className="bg-emerald-500" style={{ width: `${(wins / totalResults) * 100}%` }} />
						<div className="bg-amber-500" style={{ width: `${(draws / totalResults) * 100}%` }} />
						<div className="bg-rose-500" style={{ width: `${(losses / totalResults) * 100}%` }} />
					</div>
				</div>

				<div className="flex items-center justify-between gap-3 lg:block">
					<span className="text-xs text-muted-foreground lg:hidden">{t("list.form")}</span>
					<div className="flex gap-1.5">
						{recentForm.length > 0 ? recentForm.map((outcome, index) => <span key={`${outcome}-${index}`} title={t(`results.${outcome}`)} className={`grid size-6 place-items-center rounded-md text-[10px] font-bold ${outcome === "win" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : outcome === "loss" ? "bg-rose-500/12 text-rose-700 dark:text-rose-300" : "bg-amber-500/12 text-amber-700 dark:text-amber-300"}`}>{t(`resultLetters.${outcome}`)}</span>) : <span className="text-xs text-muted-foreground">—</span>}
					</div>
				</div>

				<div>
					<div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground lg:hidden">{t("list.analysis")}</span><span className="font-semibold tabular-nums">{coverage}%</span></div>
					<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${coverage}%` }} /></div>
					<p className="mt-1.5 text-[11px] text-muted-foreground">{t("coverage", { detailed: detailedMatches, total: matches.length })}</p>
				</div>

				<div className="flex items-center justify-between gap-3 border-t pt-3 lg:border-0 lg:pt-0">
					<div className="min-w-0">
						<p className="truncate text-xs font-medium">{lastMatch ? new Date(lastMatch.match_date).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : t("noMeetings")}</p>
						{lastMatch && lastScore ? <p className="mt-1 text-[11px] text-muted-foreground">{lastMatch.is_home === false ? t("away") : t("home")} · <span className={`font-semibold tabular-nums ${lastOutcome === "win" ? "text-emerald-600" : lastOutcome === "loss" ? "text-rose-600" : "text-amber-600"}`}>{lastScore.local}–{lastScore.visitor}</span></p> : null}
					</div>
					<Badge variant="outline" className="shrink-0 text-[10px] lg:hidden">{t("scoutingReport")}</Badge>
				</div>

				<ChevronRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary lg:block" />
			</div>
		</Link>
	);
}
