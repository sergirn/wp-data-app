"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { createClient } from "@/lib/supabase/client";
import { useClub } from "@/lib/club-context";
import { useProfile } from "@/lib/profile-context";
import { LandingPage } from "@/components/landing-page";
import { buildGeneralDashboardAnalytics } from "@/lib/helpers/generalDashboardHelper";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
	AlertCircle,
	BarChart3,
	PlusCircle,
	Shield,
	Target,
	TrendingUp,
	Trophy
} from "lucide-react";
import { TeamDashboard } from "@/components/team-dashboard/TeamDashboard";
import { buildTeamDashboardStats } from "@/lib/helpers/buildTeamDashboardStats";
import { useTranslations } from "next-intl";
import { getMatchOutcome, getOpponentScore, getOwnScore } from "@/lib/matches/score";
import { TeamTrendsPanel } from "@/components/analysis/TeamTrendsPanel";
import { SeasonObjectivesPanel } from "@/components/analysis/SeasonObjectivesPanel";
import { AnalysisThresholds, DEFAULT_ANALYSIS_THRESHOLDS } from "@/lib/analysis/performance-insights";
import { LeagueStandingsCard } from "@/components/home/LeagueStandingsCard";

type MatchRow = {
	id: number;
	club_id: number;
	opponent: string;
	match_date: string;
	home_score: number;
	away_score: number;
	penalty_home_score: number | null;
	penalty_away_score: number | null;
	is_home?: boolean | null;
	season?: string | null;
	jornada?: number | null;
	stats_enabled?: boolean | null;
};

type PlayerRow = {
	id: number;
	club_id: number;
	name: string;
	number: number;
	is_goalkeeper: boolean;
	is_active?: boolean;
	photo_url?: string | null;
};

type StatRow = Record<string, unknown> & { match_id: number; player_id?: number };

type Outcome = { status: "W" | "L" | "D" };

function getOutcome(match: MatchRow): Outcome {
	const outcome = getMatchOutcome(match);
	return { status: outcome === "win" ? "W" : outcome === "loss" ? "L" : "D" };
}

function KpiCard({
	icon,
	label,
	value,
	suffix,
	footer,
	delay = 0
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	suffix?: string;
	footer?: React.ReactNode;
	delay?: number;
}) {
	return (
		<div
			className="animate-fade-up group rounded-2xl border border-primary/20 bg-card/70 p-5 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md"
			style={{ animationDelay: `${delay}ms` }}
		>
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
				<span className="text-primary transition-colors group-hover:text-primary">{icon}</span>
			</div>

			<div className="mt-4 flex items-baseline gap-1">
				<span className="text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
				{suffix ? <span className="text-base font-medium text-muted-foreground">{suffix}</span> : null}
			</div>

			{footer ? <div className="mt-4">{footer}</div> : null}
		</div>
	);
}

function LoadingMinimal() {
	return (
		<main className="min-h-screen">
			<div className="container mx-auto px-4 py-8 sm:py-10">
				<div className="space-y-8">
					<div className="flex items-center gap-4">
						<div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
						<div className="space-y-2">
							<div className="h-3 w-24 animate-pulse rounded bg-muted" />
							<div className="h-7 w-56 animate-pulse rounded bg-muted" />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
						))}
					</div>

					<div className="grid gap-6 lg:grid-cols-3">
						<div className="h-[360px] animate-pulse rounded-2xl bg-muted lg:col-span-2" />
						<div className="h-[360px] animate-pulse rounded-2xl bg-muted" />
					</div>
				</div>
			</div>
		</main>
	);
}

export default function HomePage() {
	const t = useTranslations("Home");
	const { currentClub } = useClub();
	const { profile, loading: profileLoading } = useProfile();

	const [allMatches, setAllMatches] = useState<MatchRow[]>([]);
	const [players, setPlayers] = useState<PlayerRow[]>([]);
	const [stats, setStats] = useState<StatRow[]>([]);
	const [activeSeason, setActiveSeason] = useState("");
	const [loading, setLoading] = useState(true);

	const [connectionError, setConnectionError] = useState(false);
	const [tablesNotFound, setTablesNotFound] = useState(false);

	const [analysisThresholds] = useState<AnalysisThresholds>(DEFAULT_ANALYSIS_THRESHOLDS);

	const canEdit = profile?.role === "admin" || profile?.role === "coach";

	useEffect(() => {
		async function fetchData() {
			if (profileLoading) return;

			if (!currentClub || !profile) {
				setLoading(false);
				return;
			}

			setLoading(true);
			setConnectionError(false);
			setTablesNotFound(false);

			try {
				const supabase = createClient();

				if (!supabase) {
					setConnectionError(true);
					setLoading(false);
					return;
				}

				const { data: activeSeasonRow } = await supabase
					.from("club_seasons")
					.select("name")
					.eq("club_id", currentClub.id)
					.eq("status", "active")
					.maybeSingle();
				setActiveSeason(activeSeasonRow?.name ?? "");
				let allMatchesQuery = supabase.from("matches").select("*").eq("club_id", currentClub.id).order("match_date", { ascending: false });
				if (activeSeasonRow?.name) {
					allMatchesQuery = allMatchesQuery.eq("season", activeSeasonRow.name);
				}

				const [
					{ data: allMatchesData, error: allMatchesError },
					{ data: playersData, error: playersError }
				] = await Promise.all([
					allMatchesQuery,
					supabase.from("players").select("*").eq("club_id", currentClub.id).order("number")
				]);

				if (allMatchesError) {
					if (allMatchesError.message?.includes("Could not find the table")) setTablesNotFound(true);
					else throw allMatchesError;
				} else {
					setAllMatches(((allMatchesData || []) as MatchRow[]) ?? []);
				}

				if (playersError) {
					if (playersError.message?.includes("Could not find the table")) setTablesNotFound(true);
					else throw playersError;
				} else {
					setPlayers(((playersData || []) as PlayerRow[]).filter((player) => player.is_active !== false));
				}

				const matchIds = ((allMatchesData || []) as MatchRow[]).map((match) => match.id);

				if (matchIds.length > 0) {
					const { data: statsData, error: statsError } = await supabase.from("match_stats").select("*").in("match_id", matchIds);

					if (statsError) throw statsError;

					setStats(((statsData || []) as StatRow[]) ?? []);
				} else {
					setStats([]);
				}
			} catch (e) {
				console.error("[home] Error fetching:", e);
				setConnectionError(true);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [currentClub, profile, profileLoading]);

	const enabledMatches = useMemo(() => {
		return allMatches.filter((match) => match.stats_enabled !== false);
	}, [allMatches]);

	const enabledMatchIds = useMemo(() => {
		return new Set(enabledMatches.map((match) => match.id));
	}, [enabledMatches]);

	const enabledStats = useMemo(() => {
		return stats.filter((stat) => enabledMatchIds.has(stat.match_id));
	}, [stats, enabledMatchIds]);

	const derived = useMemo(() => {
		// const enabledMatches = allMatches.filter((match) => match.stats_enabled !== false);
		// const enabledMatchIds = new Set(enabledMatches.map((match) => match.id));
		// const enabledStats = stats.filter((stat) => enabledMatchIds.has(stat.match_id));

		const totalMatches = enabledMatches.length;

		const wins = enabledMatches.filter((m) => getOutcome(m).status === "W").length;
		const draws = enabledMatches.filter((m) => getOutcome(m).status === "D").length;
		const losses = totalMatches - wins - draws;

		const winRate = totalMatches ? Math.round((wins / totalMatches) * 100) : 0;
		const goalsFor = enabledMatches.reduce((total, match) => total + getOwnScore(match), 0);
		const goalsAgainst = enabledMatches.reduce((total, match) => total + getOpponentScore(match), 0);
		const averageGoalsFor = totalMatches ? (goalsFor / totalMatches).toFixed(1) : "0.0";
		const averageGoalsAgainst = totalMatches ? (goalsAgainst / totalMatches).toFixed(1) : "0.0";
		const analytics = buildGeneralDashboardAnalytics(enabledMatches, enabledStats, players);

		return {
			totalMatches,
			wins,
			draws,
			losses,
			winRate,
			goalsFor,
			goalsAgainst,
			averageGoalsFor,
			averageGoalsAgainst,
			analytics
		};
	}, [enabledMatches, enabledStats, players]);

	const enabledPlayerStats = useMemo(() => {
		return buildTeamDashboardStats(players, enabledStats);
	}, [players, enabledStats]);

	if (!profile && !profileLoading) return <LandingPage />;
	if (profileLoading || loading) return <LoadingMinimal />;

	const analytics = derived.analytics;

	return (
		<main className="min-h-screen">
			<div className="container mx-auto px-4 py-6 sm:py-10">
				<div className="space-y-8">
					<header className="animate-fade-up overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
						<div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
							<div className="flex min-w-0 items-center gap-4">
								<div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-background shadow-sm sm:size-20">
								{currentClub?.logo_url ? (
									<Image
										src={currentClub.logo_url}
										alt={currentClub.name || t("defaultClub")}
										fill
										sizes="(min-width: 640px) 80px, 64px"
										className="object-contain p-2.5"
									/>
								) : (
									<Trophy className="h-8 w-8 text-muted-foreground" />
								)}
								</div>

								<div className="min-w-0">
									<div className="mb-1.5 flex flex-wrap items-center gap-2">
										<span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{t("clubPanel")}</span>
										{activeSeason ? <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{activeSeason}</span> : null}
									</div>
									<h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
										{currentClub?.short_name || currentClub?.name || t("defaultClub")}
									</h1>
									<p className="mt-1 text-sm text-muted-foreground">{t("executiveDescription")}</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
								<Button asChild variant="outline" className="rounded-xl">
									<Link href="/analytics"><BarChart3 className="size-4" />{t("viewAnalytics")}</Link>
								</Button>
								{canEdit ? (
									<Button asChild className="rounded-xl shadow-sm">
										<Link href="/nuevo-partido"><PlusCircle className="size-4" />{t("newMatch")}</Link>
									</Button>
								) : null}
							</div>
						</div>
					</header>

					{tablesNotFound && (
						<Alert variant="destructive" className="rounded-2xl">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>{t("databaseNotInitialized")}</AlertTitle>
							<AlertDescription className="mt-2 space-y-3">
								<p>{t("tablesMissing")}</p>
								<ol className="ml-2 list-inside list-decimal space-y-2">
									<li>{t("initStepMenu")}</li>
									<li>{t("initStepScripts", { scripts: t("scripts") })}</li>
									<li>{t("initStepSql")}</li>
									<li>{t("initStepReload")}</li>
								</ol>
							</AlertDescription>
						</Alert>
					)}

					{connectionError && !tablesNotFound && (
						<Alert variant="destructive" className="rounded-2xl">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>{t("connectionError")}</AlertTitle>
							<AlertDescription>{t("connectionDescription")}</AlertDescription>
						</Alert>
					)}

					<section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label={t("clubSummary")}>
						<KpiCard
							icon={<Trophy className="h-4 w-4" />}
							label={t("winRate")}
							value={derived.winRate}
							suffix="%"
							delay={0}
							footer={<p className="text-[11px] text-muted-foreground">{t("recordSummary", { wins: derived.wins, draws: derived.draws, losses: derived.losses })}</p>}
						/>

						<KpiCard
							icon={<TrendingUp className="h-4 w-4" />}
							label={t("goalsForAverage")}
							value={derived.averageGoalsFor}
							delay={60}
							footer={<p className="text-[11px] text-muted-foreground">{t("seasonGoals", { count: derived.goalsFor })}</p>}
						/>

						<KpiCard
							icon={<Shield className="h-4 w-4" />}
							label={t("goalsAgainstAverage")}
							value={derived.averageGoalsAgainst}
							delay={120}
							footer={<p className="text-[11px] text-muted-foreground">{t("seasonGoalsAgainst", { count: derived.goalsAgainst })}</p>}
						/>

						<KpiCard
							icon={<Target className="h-4 w-4" />}
							label={t("attackEfficiency")}
							value={analytics?.shootingEfficiency ?? "0.0"}
							suffix="%"
							delay={180}
							footer={<p className="text-[11px] text-muted-foreground">{t("goalsShots", { goals: analytics?.totalGoalsFor ?? 0, shots: analytics?.totalShots ?? 0 })}</p>}
						/>
					</section>

					<LeagueStandingsCard
						season={activeSeason}
						clubName={currentClub?.name}
						clubShortName={currentClub?.short_name}
					/>

					<TeamTrendsPanel matches={enabledMatches} stats={enabledStats} players={players} />

					<div className="animate-fade-up" style={{ animationDelay: "320ms" }}>
						<SeasonObjectivesPanel matches={enabledMatches} stats={enabledStats} players={players || []} thresholds={analysisThresholds} clubId={currentClub?.id ?? 0} />
					</div>
					<section className="animate-fade-up " style={{ animationDelay: "340ms" }}>
						<TeamDashboard teamStats={enabledPlayerStats} />
					</section>
				</div>

				<div className="mt-10 flex flex-col items-center gap-2 text-center">
					<p className="text-xs text-muted-foreground">
						{t("poweredBy")} <span className="font-medium">TFT</span> &amp; <span className="font-medium">BWMF</span>
					</p>

					<div className="flex items-center gap-4 opacity-70">
						<Image
							src="/images/logo-sponsor/TFT_LOGO.webp"
							alt="TFT"
							width={30}
							height={18}
							className="h-[60px] w-auto dark:invert dark:brightness-0 dark:contrast-200"
						/>

						<Image src="/images/logo-sponsor/bwmf.svg" alt="BWMF" width={86} height={38} className="h-[40px] w-auto" />
					</div>
				</div>
			</div>
		</main>
	);
}
