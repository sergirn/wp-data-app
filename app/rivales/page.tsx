"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search, Shield, Swords } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClub } from "@/lib/club-context";
import { getMatchOutcome, getVenueScore } from "@/lib/matches/score";
import type { Match, Opponent } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type OpponentMatch = Pick<Match, "id" | "opponent_id" | "opponent" | "match_date" | "home_score" | "away_score" | "is_home" | "penalty_home_score" | "penalty_away_score">;
type OpponentAlias = { opponent_id: number; alias: string };

export default function OpponentsPage() {
	const t = useTranslations("Opponents");
	const locale = useLocale();
	const { currentClub } = useClub();
	const [opponents, setOpponents] = useState<Opponent[]>([]);
	const [matches, setMatches] = useState<OpponentMatch[]>([]);
	const [aliases, setAliases] = useState<OpponentAlias[]>([]);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [setupRequired, setSetupRequired] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		async function load() {
			setLoading(true);
			setSetupRequired(false);
			setOpponents([]);
			setMatches([]);
			setAliases([]);
			if (!currentClub) {
				setLoading(false);
				return;
			}

			const supabase = createClient();
			const [opponentsResult, aliasesResult, matchesResult] = await Promise.all([
				supabase.from("opponents").select("*").eq("club_id", currentClub.id).order("name").abortSignal(controller.signal),
				supabase.from("opponent_aliases").select("opponent_id, alias").eq("club_id", currentClub.id).abortSignal(controller.signal),
				supabase
					.from("matches")
					.select("id, opponent_id, opponent, match_date, home_score, away_score, is_home, penalty_home_score, penalty_away_score")
					.eq("club_id", currentClub.id)
					.not("opponent_id", "is", null)
					.order("match_date", { ascending: false })
					.abortSignal(controller.signal)
			]);

			if (controller.signal.aborted) return;
			if (opponentsResult.error || aliasesResult.error || matchesResult.error) {
				const code = opponentsResult.error?.code ?? aliasesResult.error?.code ?? matchesResult.error?.code;
				setSetupRequired(code === "42P01" || code === "42703");
				setLoading(false);
				return;
			}

			setOpponents((opponentsResult.data ?? []) as Opponent[]);
			setAliases((aliasesResult.data ?? []) as OpponentAlias[]);
			setMatches((matchesResult.data ?? []) as OpponentMatch[]);
			setLoading(false);
		}

		void load();
		return () => controller.abort();
	}, [currentClub]);

	const cards = useMemo(() => opponents.map((opponent) => {
		const opponentMatches = matches.filter((match) => match.opponent_id === opponent.id);
		const outcomes = opponentMatches.map(getMatchOutcome);
		return {
			opponent,
			matches: opponentMatches,
			wins: outcomes.filter((outcome) => outcome === "win").length,
			draws: outcomes.filter((outcome) => outcome === "draw").length,
			losses: outcomes.filter((outcome) => outcome === "loss").length,
			lastMatch: opponentMatches[0] ?? null
		};
	}).filter(({ opponent, matches: opponentMatches }) => {
		if (opponentMatches.length === 0) return false;
		const term = search.trim().toLocaleLowerCase(locale);
		const opponentAliases = aliases.filter((item) => item.opponent_id === opponent.id);
		return !term || opponent.name.toLocaleLowerCase(locale).includes(term) || opponent.short_name?.toLocaleLowerCase(locale).includes(term) || opponentAliases.some((item) => item.alias.toLocaleLowerCase(locale).includes(term));
	}), [aliases, locale, matches, opponents, search]);

	return (
		<main className="container mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
			<header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Swords className="h-4 w-4" />{t("eyebrow")}</div>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("description")}</p>
				</div>
				<div className="relative w-full sm:w-72">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} className="pl-9" />
				</div>
			</header>

			{setupRequired ? (
				<Alert><Shield className="h-4 w-4" /><AlertTitle>{t("setupTitle")}</AlertTitle><AlertDescription>{t("setupDescription")}</AlertDescription></Alert>
			) : loading ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border bg-muted/30" />)}</div>
			) : cards.length === 0 ? (
				<Card><CardContent className="flex flex-col items-center py-14 text-center"><Shield className="mb-3 h-10 w-10 text-muted-foreground/50" /><p className="font-medium">{t(search ? "emptySearch" : "empty")}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{t("emptyHint")}</p></CardContent></Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{cards.map(({ opponent, matches: opponentMatches, wins, draws, losses, lastMatch }) => (
						<Link key={opponent.id} href={`/rivales/${opponent.id}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
							<Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-md">
								<CardContent className="p-5">
									<div className="flex items-start gap-4">
										<div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-muted/40">
											{opponent.logo_url ? <Image src={opponent.logo_url} alt="" fill sizes="56px" className="object-contain p-1.5" /> : <Shield className="h-7 w-7 text-muted-foreground/60" />}
										</div>
										<div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold">{opponent.name}</h2><p className="text-sm text-muted-foreground">{t("meetings", { count: opponentMatches.length })}</p></div>
										<ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
									</div>

									<div className="mt-5 grid grid-cols-3 gap-2">
										<ResultCell label={t("wins")} value={wins} tone="win" />
										<ResultCell label={t("draws")} value={draws} tone="draw" />
										<ResultCell label={t("losses")} value={losses} tone="loss" />
									</div>

									<div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
										<span>{lastMatch ? t("lastMeeting", { date: new Date(lastMatch.match_date).toLocaleDateString(locale) }) : t("noMeetings")}</span>
										{lastMatch && (() => {
											const score = getVenueScore(lastMatch);
							return <Badge variant="outline" className="tabular-nums">{score.local}–{score.visitor}</Badge>;
										})()}
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</main>
	);
}

function ResultCell({ label, value, tone }: { label: string; value: number; tone: "win" | "draw" | "loss" }) {
	const tones = { win: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", draw: "bg-amber-500/10 text-amber-700 dark:text-amber-300", loss: "bg-red-500/10 text-red-700 dark:text-red-300" };
	return <div className={`rounded-xl px-3 py-2 text-center ${tones[tone]}`}><p className="text-lg font-bold tabular-nums">{value}</p><p className="text-[11px] opacity-80">{label}</p></div>;
}
