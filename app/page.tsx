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
	ArrowUpRight,
	Calendar,
	ChevronDown,
	ChevronUp,
	PlusCircle,
	Shield,
	Target,
	TrendingDown,
	TrendingUp,
	Trophy,
	Users
} from "lucide-react";
import { TeamDashboard } from "@/components/team-dashboard/TeamDashboard";
import { buildTeamDashboardStats } from "@/lib/helpers/buildTeamDashboardStats";
import { SequentialTypewriter } from "@/components/ui/typing";
import { useLocale, useTranslations } from "next-intl";
import { getMatchOutcome } from "@/lib/matches/score";

type MatchRow = {
	id: number;
	club_id: number;
	opponent: string;
	match_date: string;
	home_score: number;
	away_score: number;
	penalty_home_score: number | null;
	penalty_away_score: number | null;
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

type StatRow = Record<string, any>;

type Outcome = { status: "W" | "L" | "D" };

function formatDate(dateStr: string, locale: string) {
	try {
		return new Date(dateStr).toLocaleDateString(locale, {
			day: "numeric",
			month: "short",
			year: "numeric"
		});
	} catch {
		return dateStr;
	}
}

function getOutcome(match: MatchRow): Outcome {
	const outcome = getMatchOutcome(match);
	return { status: outcome === "win" ? "W" : outcome === "loss" ? "L" : "D" };
}

const FORM_STYLES: Record<Outcome["status"], string> = {
	W: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400",
	L: "bg-red-500/10 text-red-600 ring-red-500/25 dark:text-red-400",
	D: "bg-muted text-muted-foreground ring-border"
};

function FormBadge({ status }: { status: Outcome["status"] }) {
	const t = useTranslations("Home");
	const resultKey = status === "W" ? "win" : status === "L" ? "loss" : "draw";

	return (
		<span
			className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ring-1 ${FORM_STYLES[status]}`}
			aria-label={t(`results.${resultKey}`)}
		>
			{t(`resultLetters.${resultKey}`)}
		</span>
	);
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

	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [allMatches, setAllMatches] = useState<MatchRow[]>([]);
	const [players, setPlayers] = useState<PlayerRow[]>([]);
	const [stats, setStats] = useState<StatRow[]>([]);
	const [loading, setLoading] = useState(true);

	const [connectionError, setConnectionError] = useState(false);
	const [tablesNotFound, setTablesNotFound] = useState(false);

	const [showAllPlayersMobile, setShowAllPlayersMobile] = useState(false);

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
				let matchesPreviewQuery = supabase.from("matches").select("*").eq("club_id", currentClub.id).order("match_date", { ascending: false }).limit(15);
				let allMatchesQuery = supabase.from("matches").select("*").eq("club_id", currentClub.id).order("match_date", { ascending: false });
				if (activeSeasonRow?.name) {
					matchesPreviewQuery = matchesPreviewQuery.eq("season", activeSeasonRow.name);
					allMatchesQuery = allMatchesQuery.eq("season", activeSeasonRow.name);
				}

				const [
					{ data: matchesPreviewData, error: matchesPreviewError },
					{ data: allMatchesData, error: allMatchesError },
					{ data: playersData, error: playersError }
				] = await Promise.all([
					matchesPreviewQuery,
					allMatchesQuery,
					supabase.from("players").select("*").eq("club_id", currentClub.id).order("number")
				]);

				if (matchesPreviewError) {
					if (matchesPreviewError.message?.includes("Could not find the table")) setTablesNotFound(true);
					else throw matchesPreviewError;
				} else {
					setMatches(((matchesPreviewData || []) as MatchRow[]) ?? []);
				}

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

		const analytics = buildGeneralDashboardAnalytics(enabledMatches, enabledStats, players);

		const previewMatches = matches.filter((match) => match.stats_enabled !== false).slice(0, 5);
		const recentForm = matches.filter((match) => match.stats_enabled !== false).slice(0, 15).map((m) => getOutcome(m).status);

		const previewPlayers = players.slice(0, 22);
		const mobileFirst = players.slice(0, 8);
		const mobileRest = players.slice(8);



		return {
			totalMatches,
			wins,
			draws,
			losses,
			winRate,
			analytics,
			previewMatches,
			recentForm,
			previewPlayers,
			mobileFirst,
			mobileRest
		};
	}, [enabledMatches, enabledStats, allMatches, matches, players, stats, canEdit]);

	const enabledPlayerStats = useMemo(() => {
		return buildTeamDashboardStats(players, enabledStats);
	}, [players, enabledStats]);

	useEffect(() => {
		setShowAllPlayersMobile(false);
	}, [currentClub?.id]);

	if (!profile && !profileLoading) return <LandingPage />;
	if (profileLoading || loading) return <LoadingMinimal />;

	const analytics = derived.analytics;

	return (
		<main className="min-h-screen">
			<div className="container mx-auto px-4 py-6 sm:py-10">
				<div className="space-y-8">
					<header className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-4">
						{/* Logo */}
						<div className="grid h-25 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl">
							{currentClub?.logo_url ? (
								<img
									src={currentClub.logo_url}
									alt={currentClub.name || t("defaultClub")}
									className="h-full w-full object-contain p-2"
								/>
							) : (
								<Trophy className="h-8 w-8 text-muted-foreground" />
							)}
						</div>

						{/* Textos */}
						<div className="min-w-0 flex-1">
							<SequentialTypewriter
								lines={[
									t("clubPanel"),
									t("welcomeBack", { club: currentClub?.short_name || currentClub?.name || t("defaultClub") }),
									t("ready")
								]}
								className="space-y-1"
							/>

							<style jsx>{`
								:global(.space-y-1 > div:first-child) {
									font-size: 11px;
									font-weight: 600;
									letter-spacing: .18em;
									text-transform: uppercase;
									color: hsl(var(--muted-foreground));
								}

								:global(.space-y-1 > div:nth-child(2)) {
									font-size: clamp(1.75rem, 3vw, 2.3rem);
									font-weight: 700;
									line-height: 1.15;
									letter-spacing: -0.03em;
								}

								:global(.space-y-1 > div:nth-child(3)) {
									font-size: .95rem;
									color: hsl(var(--muted-foreground));
								}
							`}</style>
						</div>
					</div>

						{/* <Button asChild size="lg" className="rounded-xl shadow-sm">
							<Link href={derived.primaryCta.href}>
								{derived.primaryCta.icon}
								{derived.primaryCta.label}
							</Link>
						</Button> */}
					</header>

					{tablesNotFound && (
						<Alert variant="destructive" className="rounded-2xl">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>{t("databaseNotInitialized")}</AlertTitle>
							<AlertDescription className="mt-2 space-y-3">
								<p>{t("tablesMissing")}</p>
								<ol className="ml-2 list-inside list-decimal space-y-2">
									<li>{t("initStepMenu")}</li>
									<li>
										{t("initStepScripts", { scripts: t("scripts") })}
									</li>
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
							icon={<Target className="h-4 w-4" />}
							label={t("attackEfficiency")}
							value={analytics?.shootingEfficiency ?? 0}
							suffix="%"
							delay={0}
							footer={
								<p className="text-[11px] text-muted-foreground">
									{t("goalsShots", { goals: analytics?.totalGoalsFor ?? 0, shots: analytics?.totalShots ?? 0 })}
								</p>
							}
						/>

						<KpiCard
							icon={<TrendingUp className="h-4 w-4" />}
							label={t("superiority")}
							value={analytics?.superiorityEfficiency ?? 0}
							suffix="%"
							delay={60}
							footer={
								<p className="text-[11px] text-muted-foreground">
									{t("goalsAttempts", { goals: analytics?.goalsSuperiority ?? 0, attempts: analytics?.shotsSuperiority ?? 0 })}
								</p>
							}
						/>

						<KpiCard
							icon={<TrendingDown className="h-4 w-4" />}
							label={t("inferiority")}
							value={analytics?.inferiorityEfficiency ?? 0}
							suffix="%"
							delay={120}
							footer={
								<p className="text-[11px] text-muted-foreground">
									{t("avoidedAttempts", {
										saves: analytics?.savesInferiority ?? 0,
										attempts: (analytics?.savesInferiority ?? 0) + (analytics?.goalsAgainstInferiority ?? 0)
									})}
								</p>
							}
						/>

						<KpiCard
							icon={<Shield className="h-4 w-4" />}
							label={t("goalkeeperEfficiency")}
							value={analytics?.goalkeeperEfficiency ?? 0}
							suffix="%"
							delay={180}
							footer={<p className="text-[11px] text-muted-foreground">{t("totalSaves", { count: analytics?.totalSaves ?? 0 })}</p>}
						/>
					</section>

					<section className="grid gap-6 lg:grid-cols-4">
						<div className="animate-fade-up lg:col-span-2" style={{ animationDelay: "220ms" }}>
							<div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
								<div className="mb-4 flex items-center justify-between gap-3">
									<div>
										<h2 className="text-base font-semibold tracking-tight">{t("latestMatches")}</h2>
										<p className="text-sm text-muted-foreground">{t("recentResults")}</p>
									</div>

									<Button asChild variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:text-foreground">
										<Link href="/partidos">
											{t("viewAll")} <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
										</Link>
									</Button>
								</div>

								{derived.previewMatches.length > 0 ? (
									<MatchListCompact matches={derived.previewMatches} />
								) : (
									<EmptyMinimal
										icon={<Calendar className="h-5 w-5" />}
										title={t("noMatches")}
										desc={canEdit ? t("createFirstMatchDescription") : t("noMatchesDescription")}
										cta={canEdit ? { href: "/nuevo-partido", label: t("createFirstMatch") } : undefined}
									/>
								)}
							</div>
						</div>

						<div className="animate-fade-up lg:col-span-2" style={{ animationDelay: "280ms" }}>
							<div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm sm:p-0">
								<div className="border-b p-5 sm:p-6">
									<div className="flex items-start justify-between gap-4">
										<div>
											<h2 className="text-base font-semibold tracking-tight">{t("teamStatus")}</h2>
											<p className="text-sm text-muted-foreground">{t("teamStatusDescription")}</p>
										</div>

										<div className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
											{t("matchCount", { count: derived.totalMatches })}
										</div>
									</div>
								</div>

								<div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
									<div>
										<div className="flex items-end justify-between gap-5">
											<div>
												<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
													{t("performance")}
												</p>

												<div className="mt-2 flex items-baseline gap-1.5">
													<span className="text-5xl font-semibold tracking-tight tabular-nums">
														{derived.winRate}
													</span>
													<span className="text-xl font-medium text-muted-foreground">%</span>
												</div>
											</div>

											<div className="grid grid-cols-3 gap-2 text-center">
												<div className="rounded-xl border bg-background px-3 py-2">
													<p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
														{derived.wins}
													</p>
													<p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
															{t("resultLetters.win")}
													</p>
												</div>

												<div className="rounded-xl border bg-background px-3 py-2">
													<p className="text-lg font-semibold tabular-nums text-muted-foreground">
														{derived.draws}
													</p>
													<p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
															{t("resultLetters.draw")}
													</p>
												</div>

												<div className="rounded-xl border bg-background px-3 py-2">
													<p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
														{derived.losses}
													</p>
													<p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
															{t("resultLetters.loss")}
													</p>
												</div>
											</div>
										</div>

										<div className="mt-5">
											<div className="flex items-center justify-between text-xs text-muted-foreground">
												<span>0%</span>
												<span>100%</span>
											</div>

											<div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary transition-all duration-700"
													style={{ width: `${derived.winRate}%` }}
												/>
											</div>
										</div>
									</div>

									<div className="mt-7">
										<div className="mb-3 flex items-center justify-between gap-3">
											<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
														{t("latestResults")}
											</p>

											<Link
												href="/partidos"
												className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
											>
														{t("viewHistory")}
											</Link>
										</div>

										{derived.recentForm.length > 0 ? (
											<div className="flex flex-wrap items-center gap-2">
												{derived.recentForm.map((s, i) => (
													<FormBadge key={i} status={s} />
												))}
											</div>
										) : (
											<p className="text-sm text-muted-foreground">{t("noData")}</p>
										)}
									</div>
								</div>
							</div>
						</div>
						
					</section>
					<section
							className="animate-fade-up "
							style={{ animationDelay: "340ms" }}
						>
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

function MatchListCompact({ matches }: { matches: MatchRow[] }) {
	const t = useTranslations("Home");
	const locale = useLocale();
	return (
		<div className="flex flex-col divide-y divide-border/70">
			{matches.map((m) => {
				const o = getOutcome(m);

				return (
					<Link
						key={m.id}
						href={`/partidos/${m.id}`}
						aria-label={t("viewMatch", { opponent: m.opponent })}
						className="group flex items-center justify-between gap-3 py-3 transition-colors first:pt-0 last:pb-0 focus-visible:outline-none"
					>
						<div className="flex min-w-0 items-center gap-3">
							<FormBadge status={o.status} />

							<div className="min-w-0">
								<p className="truncate text-sm font-medium transition-colors group-hover:text-primary">{m.opponent}</p>
								<p className="mt-0.5 text-xs text-muted-foreground">{formatDate(m.match_date, locale)}</p>
							</div>
						</div>

						<div className="flex shrink-0 items-center gap-3">
							<div className="rounded-lg border bg-background px-2.5 py-1 text-sm font-semibold tabular-nums">
								{m.home_score}
								<span className="mx-1 text-muted-foreground">–</span>
								{m.away_score}
							</div>

							<ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
						</div>
					</Link>
				);
			})}
		</div>
	);
}

function PlayerPhotoGridResponsive({ players }: { players: PlayerRow[] }) {
	const t = useTranslations("Home");
	return (
		<div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9">
			{players.map((player) => (
				<Link
					key={player.id}
					href={`/jugadores/${player.id}`}
					aria-label={t("viewPlayer", { player: player.name })}
					className="group overflow-hidden rounded-xl border bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
				>
					<div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
						{player.photo_url ? (
							<img
								src={player.photo_url || "/placeholder.svg"}
								alt={player.name}
								className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
								loading="lazy"
							/>
						) : (
							<div className="absolute inset-0 grid place-items-center">
								<span className="text-2xl font-bold tabular-nums text-muted-foreground">#{player.number}</span>
							</div>
						)}

						<div className="absolute right-2 top-2 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90 backdrop-blur-sm">
							#{player.number}
						</div>

						<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/95 via-background/60 to-transparent dark:from-black/80" />

						<div className="absolute inset-x-0 bottom-0 p-2.5">
							<p className="line-clamp-2 text-xs font-semibold leading-tight">{player.name}</p>
						</div>
					</div>
				</Link>
			))}
		</div>
	);
}

function EmptyMinimal({
	icon,
	title,
	desc,
	cta
}: {
	icon: React.ReactNode;
	title: string;
	desc: string;
	cta?: { href: string; label: string };
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center">
			<div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground">{icon}</div>
			<p className="font-medium">{title}</p>
			<p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">{desc}</p>

			{cta ? (
				<div className="mt-4">
					<Button asChild size="sm" className="rounded-lg">
						<Link href={cta.href}>{cta.label}</Link>
					</Button>
				</div>
			) : null}
		</div>
	);
}
