"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";
import type { LeagueFormResult, LeagueStandings } from "@/lib/external/lewaterpolo-standings";
import { cn } from "@/lib/utils";

type StandingsResponse = {
	data: LeagueStandings;
	fetchedAt: string;
	sourceUrl: string;
	stale: boolean;
};

type LoadState =
	| { status: "loading" }
	| { status: "error" }
	| ({ status: "success" } & StandingsResponse);

const FORM_STYLES: Record<LeagueFormResult, string> = {
	W: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
	D: "bg-muted text-muted-foreground",
	L: "bg-rose-500/12 text-rose-700 dark:text-rose-300"
};

function normalizeTeamName(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

function matchesClub(team: string, shortName: string, clubNames: string[]) {
	const candidates = [team, shortName].map(normalizeTeamName).filter(Boolean);
	return clubNames
		.map(normalizeTeamName)
		.filter((name) => name.length >= 3)
		.some((name) => candidates.some((candidate) => candidate === name || (name.length >= 6 && (candidate.includes(name) || name.includes(candidate)))));
}

function StandingsSkeleton() {
	return (
		<div className="space-y-2 p-4 sm:p-5" aria-hidden="true">
			{Array.from({ length: 6 }).map((_, index) => (
				<div key={index} className="flex h-11 animate-pulse items-center gap-3 rounded-lg bg-muted/55 px-3">
					<div className="size-5 rounded bg-muted-foreground/10" />
					<div className="size-7 rounded-full bg-muted-foreground/10" />
					<div className="h-3 flex-1 rounded bg-muted-foreground/10" />
					<div className="h-3 w-8 rounded bg-muted-foreground/10" />
				</div>
			))}
		</div>
	);
}

export function LeagueStandingsCard({ season, clubName, clubShortName }: { season: string; clubName?: string; clubShortName?: string }) {
	const t = useTranslations("Home.standings");
	const locale = useLocale();
	const [attempt, setAttempt] = useState(0);
	const [expanded, setExpanded] = useState(false);
	const [state, setState] = useState<LoadState>({ status: "loading" });

	useEffect(() => {
		if (!season) return;
		const controller = new AbortController();
		let active = true;
		setState({ status: "loading" });

		async function loadStandings() {
			const timeout = window.setTimeout(() => controller.abort(), 10_000);
			try {
				const response = await fetch(`/api/standings?season=${encodeURIComponent(season)}`, {
					signal: controller.signal,
					headers: { Accept: "application/json" }
				});
				if (!response.ok) throw new Error(`Standings request returned ${response.status}`);
				const payload = (await response.json()) as StandingsResponse;
				if (!payload.data?.teams?.length) throw new Error("Standings response is empty");
				if (active) setState({ status: "success", ...payload });
			} catch (error) {
				if (!active) return;
				console.warn("[home] Standings unavailable:", error);
				setState({ status: "error" });
			} finally {
				window.clearTimeout(timeout);
			}
		}

		void loadStandings();
		return () => {
			active = false;
			controller.abort();
		};
	}, [attempt, season]);

	const clubNames = useMemo(() => [clubName ?? "", clubShortName ?? ""], [clubName, clubShortName]);
	const visibleTeams = useMemo(() => {
		if (state.status !== "success") return [];
		if (expanded) return state.data.teams;

		const clubIndex = state.data.teams.findIndex((team) => matchesClub(team.team, team.shortName, clubNames));
		if (clubIndex < 0) return state.data.teams.slice(0, 5);

		const windowSize = Math.min(5, state.data.teams.length);
		const start = Math.max(0, Math.min(clubIndex - 2, state.data.teams.length - windowSize));
		return state.data.teams.slice(start, start + windowSize);
	}, [clubNames, expanded, state]);

	if (!season) return null;

	return (
		<section className="animate-fade-up overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm" aria-labelledby="league-standings-title">
			<div className="flex flex-col gap-3 border-b bg-muted/10 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<div className="min-w-0">
					<h2 id="league-standings-title" className="flex items-center gap-2 text-base font-semibold">
						<Trophy className="size-4.5 text-primary" />
						{t("title")}
					</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">
						{state.status === "success" && state.data.round
							? t("seasonAndRound", { season: state.data.season, round: state.data.round })
							: t("season", { season })}
					</p>
				</div>

				{state.status === "success" ? (
					<div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
						{state.stale ? <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">{t("cachedData")}</span> : null}
						<span>{t("updated", { date: new Date(state.fetchedAt).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) })}</span>
					</div>
				) : null}
			</div>

			{state.status === "loading" ? <StandingsSkeleton /> : null}

			{state.status === "error" ? (
				<div className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-center" role="status">
					<div className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
						<AlertTriangle className="size-5" />
					</div>
					<div>
						<p className="text-sm font-semibold">{t("unavailableTitle")}</p>
						<p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{t("unavailableDescription")}</p>
					</div>
					<Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setAttempt((value) => value + 1)}>
						<RefreshCw className="size-3.5" />
						{t("retry")}
					</Button>
				</div>
			) : null}

			{state.status === "success" ? (
				<>
					<div className={cn("overflow-auto [&_[data-slot=table-container]]:overflow-visible", expanded && "max-h-[480px]")}>
						<Table className="min-w-[390px]">
							<TableHeader className="sticky top-0 z-20 bg-card/95 shadow-[0_1px_0_hsl(var(--border))] backdrop-blur">
								<TableRow className="hover:bg-transparent">
									<TableHead className="sticky left-0 z-30 w-11 min-w-11 bg-card/95 text-center">#</TableHead>
									<TableHead className="sticky left-11 z-30 min-w-[180px] bg-card/95 sm:min-w-[220px]">{t("team")}</TableHead>
									<TableHead className="text-center">{t("played")}</TableHead>
									<TableHead className="hidden text-center sm:table-cell">{t("won")}</TableHead>
									<TableHead className="hidden text-center sm:table-cell">{t("lost")}</TableHead>
									<TableHead className="hidden text-center lg:table-cell">{t("penaltyWins")}</TableHead>
									<TableHead className="hidden text-center lg:table-cell">{t("penaltyLosses")}</TableHead>
									<TableHead className="hidden text-center md:table-cell">{t("goalsFor")}</TableHead>
									<TableHead className="hidden text-center md:table-cell">{t("goalsAgainst")}</TableHead>
									<TableHead className="hidden text-center sm:table-cell">{t("difference")}</TableHead>
									<TableHead className="text-center text-foreground">{t("points")}</TableHead>
									<TableHead className="hidden text-center xl:table-cell">{t("form")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{visibleTeams.map((team) => {
									const isCurrentClub = matchesClub(team.team, team.shortName, clubNames);
									return (
										<TableRow key={`${team.position}-${team.team}`} className={cn(isCurrentClub && "bg-primary/[0.075] hover:bg-primary/[0.1]")}>
											<TableCell className={cn("sticky left-0 z-10 w-11 min-w-11 bg-card text-center font-semibold tabular-nums text-muted-foreground", isCurrentClub && "bg-[color-mix(in_oklch,var(--primary)_7.5%,var(--card))]")}>{team.position}</TableCell>
											<TableCell className={cn("sticky left-11 z-10 bg-card", isCurrentClub && "bg-[color-mix(in_oklch,var(--primary)_7.5%,var(--card))]")}>
												<div className="flex min-w-0 items-center gap-2.5">
													<div className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border bg-background">
														{team.crestUrl ? <Image src={team.crestUrl} alt="" width={32} height={32} className="size-7 object-contain p-0.5" /> : <span className="text-[9px] font-bold text-muted-foreground">{team.shortName.slice(0, 3)}</span>}
													</div>
													<div className="min-w-0">
														<p className="max-w-[145px] truncate text-sm font-medium sm:max-w-none">{team.team}</p>
														{isCurrentClub ? <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{t("yourClub")}</p> : null}
													</div>
												</div>
											</TableCell>
											<TableCell className="text-center tabular-nums">{team.played}</TableCell>
											<TableCell className="hidden text-center tabular-nums sm:table-cell">{team.won}</TableCell>
											<TableCell className="hidden text-center tabular-nums sm:table-cell">{team.lost}</TableCell>
											<TableCell className="hidden text-center tabular-nums lg:table-cell">{team.penaltyWins}</TableCell>
											<TableCell className="hidden text-center tabular-nums lg:table-cell">{team.penaltyLosses}</TableCell>
											<TableCell className="hidden text-center tabular-nums md:table-cell">{team.goalsFor}</TableCell>
											<TableCell className="hidden text-center tabular-nums md:table-cell">{team.goalsAgainst}</TableCell>
											<TableCell className="hidden text-center tabular-nums sm:table-cell">{team.goalDifference > 0 ? "+" : ""}{team.goalDifference}</TableCell>
											<TableCell className="text-center text-base font-bold tabular-nums text-foreground">{team.points}</TableCell>
											<TableCell className="hidden xl:table-cell">
												<div className="flex justify-center gap-1">
													{team.form.map((result, index) => <span key={`${result}-${index}`} className={cn("grid size-5 place-items-center rounded-md text-[9px] font-bold", FORM_STYLES[result])}>{t(`formResult.${result}`)}</span>)}
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
					<div className="flex justify-center border-t px-4 py-2.5">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="rounded-lg text-xs font-semibold"
							aria-expanded={expanded}
							onClick={() => setExpanded((value) => !value)}
						>
							{expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
							{expanded ? t("showCompact") : t("showAll")}
						</Button>
					</div>
					<div className="flex flex-col gap-2 border-t bg-muted/10 px-4 py-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
						<p>{t("externalNotice")}</p>
						<a href={state.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
							{t("source")}
							<ExternalLink className="size-3" />
						</a>
					</div>
				</>
			) : null}
		</section>
	);
}
