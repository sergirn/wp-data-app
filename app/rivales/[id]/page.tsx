"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarDays, ClipboardList, Crosshair, Shield, Swords, Target, UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { OpponentAliasManager } from "@/components/opponents/OpponentAliasManager";
import { OpponentNotes } from "@/components/opponents/OpponentNotes";
import { GoalkeeperShotsGoalChart } from "@/components/analytics-goalkeeper/GoalkeeperShotsGoalChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClub } from "@/lib/club-context";
import { buildOpponentScouting, type ScoutingMatch, type ScoutingStat } from "@/lib/opponents/scouting";
import { getMatchOutcome, getVenueScore } from "@/lib/matches/score";
import { useProfile } from "@/lib/profile-context";
import { createClient } from "@/lib/supabase/client";
import type { Opponent, OpponentNote } from "@/lib/types";

type AliasRow = { id: number; alias: string };
type GoalkeeperShot = { id: number; match_id: number; goalkeeper_player_id: number; x: number; y: number; result: "goal" | "save" | "out" };

export default function OpponentDetailPage() {
	const t = useTranslations("Opponents");
	const locale = useLocale();
	const params = useParams<{ id: string }>();
	const opponentId = Number(params.id);
	const { currentClub } = useClub();
	const { profile } = useProfile();
	const [opponent, setOpponent] = useState<Opponent | null>(null);
	const [aliases, setAliases] = useState<AliasRow[]>([]);
	const [notes, setNotes] = useState<OpponentNote[]>([]);
	const [matches, setMatches] = useState<ScoutingMatch[]>([]);
	const [stats, setStats] = useState<ScoutingStat[]>([]);
	const [shots, setShots] = useState<GoalkeeperShot[]>([]);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [setupRequired, setSetupRequired] = useState(false);
	const [selectedSeason, setSelectedSeason] = useState("all");
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
		const supabase = createClient();
		const { data: opponentRow, error: opponentError } = await supabase.from("opponents").select("*").eq("id", opponentId).eq("club_id", currentClub.id).maybeSingle();
		if (opponentError) {
			setSetupRequired(opponentError.code === "42P01" || opponentError.code === "42703");
			setLoading(false);
			return;
		}
		if (!opponentRow) {
			setNotFound(true);
			setLoading(false);
			return;
		}

		const [aliasesResult, notesResult, matchesResult] = await Promise.all([
			supabase.from("opponent_aliases").select("id, alias").eq("opponent_id", opponentId).order("alias"),
			supabase.from("opponent_notes").select("*").eq("opponent_id", opponentId).order("updated_at", { ascending: false }),
			supabase
				.from("matches")
				.select("id, match_date, opponent, season, home_score, away_score, is_home, jornada, stats_enabled, penalty_home_score, penalty_away_score, q1_score, q1_score_rival, q2_score, q2_score_rival, q3_score, q3_score_rival, q4_score, q4_score_rival")
				.eq("club_id", currentClub.id)
				.eq("opponent_id", opponentId)
				.order("match_date", { ascending: false })
		]);

		const matchRows = (matchesResult.data ?? []) as ScoutingMatch[];
		const matchIds = matchRows.map((match) => match.id);
		let statRows: ScoutingStat[] = [];
		let shotRows: GoalkeeperShot[] = [];
		if (matchIds.length > 0) {
			const [statsResult, shotsResult] = await Promise.all([
				supabase.from("match_stats").select("*, players:player_id(id, name, number, is_goalkeeper)").in("match_id", matchIds),
				supabase.from("goalkeeper_shots").select("id, match_id, goalkeeper_player_id, x, y, result").in("match_id", matchIds)
			]);
			statRows = (statsResult.data ?? []).map((row) => ({
				...row,
				players: Array.isArray(row.players) ? row.players[0] ?? null : row.players
			})) as ScoutingStat[];
			shotRows = (shotsResult.data ?? []) as GoalkeeperShot[];
		}

		setOpponent(opponentRow as Opponent);
		setAliases((aliasesResult.data ?? []) as AliasRow[]);
		setNotes((notesResult.data ?? []) as OpponentNote[]);
		setMatches(matchRows);
		setStats(statRows);
		setShots(shotRows);
		setLoading(false);
	}, [currentClub, opponentId]);

	useEffect(() => {
		const timeout = window.setTimeout(() => void load(), 0);
		return () => window.clearTimeout(timeout);
	}, [load]);
	const seasons = useMemo(() => [...new Set(matches.map((match) => match.season).filter((season): season is string => Boolean(season)))].sort().reverse(), [matches]);
	const visibleMatches = useMemo(() => selectedSeason === "all" ? matches : matches.filter((match) => match.season === selectedSeason), [matches, selectedSeason]);
	const visibleMatchIds = useMemo(() => new Set(visibleMatches.map((match) => match.id)), [visibleMatches]);
	const visibleShots = useMemo(() => shots.filter((shot) => visibleMatchIds.has(shot.match_id)), [shots, visibleMatchIds]);
	const scouting = useMemo(() => buildOpponentScouting(visibleMatches, stats), [visibleMatches, stats]);

	if (loading) return <main className="container mx-auto max-w-7xl px-4 py-8"><div className="h-64 animate-pulse rounded-2xl border bg-muted/30" /></main>;
	if (setupRequired) return <main className="container mx-auto max-w-7xl px-4 py-8"><Alert><Shield className="h-4 w-4" /><AlertTitle>{t("setupTitle")}</AlertTitle><AlertDescription>{t("setupDescription")}</AlertDescription></Alert></main>;
	if (notFound || !opponent || !currentClub || !profile) return <main className="container mx-auto max-w-7xl px-4 py-8"><Alert><AlertTitle>{t("notFound")}</AlertTitle></Alert></main>;

	const goalkeeperPlayers = stats
		.filter((stat) => stat.players?.is_goalkeeper)
		.map((stat) => ({ id: stat.players!.id, name: stat.players!.name, is_goalkeeper: true }))
		.filter((player, index, rows) => rows.findIndex((candidate) => candidate.id === player.id) === index);

	return (
		<main className="container mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
			<Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground"><Link href="/rivales"><ArrowLeft className="mr-2 h-4 w-4" />{t("back")}</Link></Button>
			<header className="relative mb-6 overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
				<div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-w-0 items-center gap-4">
						<div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-muted/30 sm:size-20">
							{opponent.logo_url ? <Image src={opponent.logo_url} alt="" fill sizes="80px" className="object-contain p-2" /> : <Shield className="h-9 w-9 text-muted-foreground/55" />}
						</div>
						<div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary"><Swords className="h-3.5 w-3.5" />{t("scoutingReport")}</div><h1 className="truncate text-2xl font-bold sm:text-3xl">{opponent.name}</h1><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="secondary">{t("meetings", { count: scouting.played })}</Badge><Badge variant="outline">{t(`confidence.${scouting.confidence}`)}</Badge>{seasons.length > 0 && <Select value={selectedSeason} onValueChange={setSelectedSeason}><SelectTrigger className="h-7 w-auto min-w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("allSeasons")}</SelectItem>{seasons.map((season) => <SelectItem key={season} value={season}>{season}</SelectItem>)}</SelectContent></Select>}</div></div>
					</div>
					<div className="w-full lg:max-w-md"><OpponentAliasManager opponentId={opponent.id} aliases={aliases} canEdit={canEdit} onChanged={load} /></div>
				</div>
			</header>

			<Tabs defaultValue="summary" className="space-y-5">
				<TabsList className="flex h-auto w-full justify-start overflow-x-auto p-1 sm:grid sm:grid-cols-5">
					<TabsTrigger value="summary" className="min-w-28 gap-1.5 py-2.5 sm:min-w-0"><BarChart3 className="h-4 w-4" />{t("tabs.summary")}</TabsTrigger>
					<TabsTrigger value="tactics" className="min-w-28 gap-1.5 py-2.5 sm:min-w-0"><Crosshair className="h-4 w-4" />{t("tabs.tactics")}</TabsTrigger>
					<TabsTrigger value="players" className="min-w-28 gap-1.5 py-2.5 sm:min-w-0"><UsersRound className="h-4 w-4" />{t("tabs.players")}</TabsTrigger>
					<TabsTrigger value="matches" className="min-w-28 gap-1.5 py-2.5 sm:min-w-0"><CalendarDays className="h-4 w-4" />{t("tabs.matches")}</TabsTrigger>
					<TabsTrigger value="notes" className="min-w-28 gap-1.5 py-2.5 sm:min-w-0"><ClipboardList className="h-4 w-4" />{t("tabs.notes")}</TabsTrigger>
				</TabsList>

				<TabsContent value="summary" className="space-y-5">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<Kpi label={t("kpis.record")} value={`${scouting.wins}-${scouting.draws}-${scouting.losses}`} hint={t("kpis.recordHint")} />
						<Kpi label={t("kpis.averageFor")} value={scouting.averageOwnGoals.toFixed(1)} hint={t("kpis.perMatch")} />
						<Kpi label={t("kpis.averageAgainst")} value={scouting.averageOpponentGoals.toFixed(1)} hint={t("kpis.perMatch")} />
						<Kpi label={t("kpis.goalDifference")} value={`${scouting.goalDifference > 0 ? "+" : ""}${scouting.goalDifference}`} hint={t("kpis.total")} />
					</div>
					<div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
						<Card><CardHeader><CardTitle>{t("quarters.title")}</CardTitle><CardDescription>{t("quarters.description")}</CardDescription></CardHeader><CardContent className="space-y-4">{scouting.quarters.map((quarter) => <QuarterBar key={quarter.quarter} {...quarter} label={t("quarter", { number: quarter.quarter })} />)}</CardContent></Card>
						<Card><CardHeader><CardTitle>{t("recent.title")}</CardTitle><CardDescription>{t("recent.description")}</CardDescription></CardHeader><CardContent className="space-y-2">{scouting.matches.slice(0, 5).map((match) => <MatchRow key={match.id} match={match} locale={locale} homeLabel={t("home")} awayLabel={t("away")} resultLabel={t(`results.${getMatchOutcome(match)}`)} />)}{scouting.matches.length === 0 && <p className="text-sm text-muted-foreground">{t("noMeetings")}</p>}</CardContent></Card>
					</div>
				</TabsContent>

				<TabsContent value="tactics" className="space-y-5">
					<div className="grid gap-5 lg:grid-cols-2">
						<MetricGroup icon={Target} title={t("attack.title")} description={t("attack.description")} metrics={[
							[t("attack.efficiency"), `${scouting.attack.efficiency}%`], [t("attack.goals"), scouting.attack.goals], [t("attack.assists"), scouting.attack.assists], [t("attack.powerPlay"), `${scouting.attack.powerPlayGoals}/${scouting.attack.powerPlayAttempts}`]
						]} />
						<MetricGroup icon={Shield} title={t("opponentAttack.title")} description={t("opponentAttack.description")} metrics={[
							[t("opponentAttack.goals"), scouting.opponentAttack.goals], [t("opponentAttack.powerPlayGoals"), scouting.opponentAttack.powerPlayGoals], [t("opponentAttack.saves"), scouting.opponentAttack.goalkeeperSaves], [t("opponentAttack.shotsMapped"), shots.length]
						]} />
					</div>
					<GoalkeeperShotsGoalChart rows={visibleShots} matches={scouting.matches} players={goalkeeperPlayers} />
				</TabsContent>

				<TabsContent value="players">
					<Card><CardHeader><CardTitle>{t("players.title")}</CardTitle><CardDescription>{t("players.description")}</CardDescription></CardHeader><CardContent className="space-y-2">{scouting.players.length > 0 ? scouting.players.map((player, index) => <div key={player.id} className="grid grid-cols-[36px_1fr_auto_auto] items-center gap-3 rounded-xl border p-3"><span className="text-center text-sm font-bold text-muted-foreground">{index + 1}</span><div className="min-w-0"><p className="truncate font-medium">#{player.number} · {player.name}</p><p className="text-xs text-muted-foreground">{t("players.matches", { count: player.matches })}</p></div><div className="text-right"><p className="font-bold tabular-nums">{player.goals}</p><p className="text-[10px] text-muted-foreground">{t("players.goals")}</p></div><div className="text-right"><p className="font-bold tabular-nums">{player.assists}</p><p className="text-[10px] text-muted-foreground">{t("players.assists")}</p></div></div>) : <p className="py-8 text-center text-sm text-muted-foreground">{t("players.empty")}</p>}</CardContent></Card>
				</TabsContent>

				<TabsContent value="matches"><Card><CardHeader><CardTitle>{t("matches.title")}</CardTitle><CardDescription>{t("matches.description")}</CardDescription></CardHeader><CardContent className="space-y-2">{scouting.matches.map((match) => <MatchRow key={match.id} match={match} locale={locale} homeLabel={t("home")} awayLabel={t("away")} resultLabel={t(`results.${getMatchOutcome(match)}`)} detailed />)}</CardContent></Card></TabsContent>
				<TabsContent value="notes"><OpponentNotes opponentId={opponent.id} clubId={currentClub.id} profileId={profile.id} notes={notes} canEdit={canEdit} onChanged={load} /></TabsContent>
			</Tabs>
		</main>
	);
}

function MatchRow({ match, locale, homeLabel, awayLabel, resultLabel, detailed = false }: { match: ScoutingMatch; locale: string; homeLabel: string; awayLabel: string; resultLabel: string; detailed?: boolean }) {
	const outcome = getMatchOutcome(match);
	const score = getVenueScore(match);
	return <Link href={`/partidos/${match.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"><div className="min-w-0"><p className="text-sm font-medium">{new Date(match.match_date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</p>{detailed && <p className="mt-0.5 text-xs text-muted-foreground">{match.is_home === false ? awayLabel : homeLabel}</p>}</div><div className="flex items-center gap-3"><Badge variant="outline" className={outcome === "win" ? "text-emerald-600" : outcome === "loss" ? "text-red-600" : "text-amber-600"}>{resultLabel}</Badge><span className="text-lg font-bold tabular-nums">{score.local}–{score.visitor}</span></div></Link>;
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
	return <div className="rounded-xl border bg-card p-3.5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>{hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}</div>;
}

function QuarterBar({ label, own, opponent, difference }: { label: string; own: number; opponent: number; difference: number }) {
	const total = Math.max(1, own + opponent);
	return <div><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium">{label}</span><span className={difference > 0 ? "text-emerald-600" : difference < 0 ? "text-red-600" : "text-muted-foreground"}>{own}–{opponent}</span></div><div className="flex h-2 overflow-hidden rounded-full bg-muted"><div className="bg-primary" style={{ width: `${(own / total) * 100}%` }} /><div className="bg-red-400/65" style={{ width: `${(opponent / total) * 100}%` }} /></div></div>;
}

function MetricGroup({ icon: Icon, title, description, metrics }: { icon: typeof Target; title: string; description: string; metrics: Array<[string, string | number]> }) {
	return <Card><CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-3">{metrics.map(([label, value]) => <Kpi key={label} label={label} value={value} />)}</CardContent></Card>;
}
