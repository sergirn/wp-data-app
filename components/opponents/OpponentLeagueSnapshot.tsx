"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Clock3, ExternalLink, RefreshCw, ShieldCheck, Star, Target, TrendingUp, Trophy, UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExternalOpponentSnapshot, ExternalPlayerRanking, ExternalTeamMetric } from "@/lib/external/lewaterpolo-opponent";
import { cn } from "@/lib/utils";

type ResponsePayload = {
	data: ExternalOpponentSnapshot;
	fetchedAt: string;
	weekOf: string;
	stale: boolean;
};

type LoadState = { status: "loading" } | { status: "notFound" } | { status: "error" } | ({ status: "success" } & ResponsePayload);

const FORM_STYLES = {
	W: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
	D: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
	L: "bg-rose-500/12 text-rose-700 dark:text-rose-300"
};

function LoadingCard() {
	return (
		<Card aria-hidden="true">
			<CardHeader>
				<div className="h-5 w-48 animate-pulse rounded bg-muted" />
				<div className="h-3 w-72 max-w-full animate-pulse rounded bg-muted" />
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index} className="h-20 animate-pulse rounded-xl bg-muted/60" />
					))}
				</div>
				<div className="grid gap-3 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<div key={index} className="h-36 animate-pulse rounded-xl bg-muted/60" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

export function OpponentLeagueSnapshot({
	season,
	opponentName,
	aliases,
	onCrestResolved
}: {
	season: string | null;
	opponentName: string;
	aliases: string[];
	onCrestResolved?: (crestUrl: string | null) => void;
}) {
	const t = useTranslations("Opponents.externalLeague");
	const locale = useLocale();
	const [attempt, setAttempt] = useState(0);
	const [state, setState] = useState<LoadState>({ status: "loading" });
	const aliasKey = useMemo(() => aliases.slice().sort().join("\u0000"), [aliases]);

	useEffect(() => {
		if (!season) return;
		const selectedSeason = season;
		const selectedAliases = aliasKey ? aliasKey.split("\u0000") : [];
		const controller = new AbortController();
		let active = true;
		setState({ status: "loading" });

		async function load() {
			const timeout = window.setTimeout(() => controller.abort(), 12_000);
			try {
				const query = new URLSearchParams({ season: selectedSeason, name: opponentName });
				for (const alias of selectedAliases) query.append("alias", alias);
				const response = await fetch(`/api/opponent-league-stats?${query.toString()}`, {
					signal: controller.signal,
					headers: { Accept: "application/json" }
				});
				if (response.status === 404) {
					if (active) {
						onCrestResolved?.(null);
						setState({ status: "notFound" });
					}
					return;
				}
				if (!response.ok) throw new Error(`External opponent request returned ${response.status}`);
				const payload = (await response.json()) as ResponsePayload;
				if (!payload.data?.team?.name) throw new Error("External opponent response is incomplete");
				if (active) {
					onCrestResolved?.(payload.data.team.crestUrl ?? null);
					setState({ status: "success", ...payload });
				}
			} catch (error) {
				if (!active) return;
				console.warn("[opponent] External league data unavailable:", error);
				setState({ status: "error" });
			} finally {
				window.clearTimeout(timeout);
			}
		}

		void load();
		return () => {
			active = false;
			controller.abort();
		};
	}, [aliasKey, attempt, onCrestResolved, opponentName, season]);

	if (!season) return null;
	if (state.status === "loading") return <LoadingCard />;

	if (state.status === "notFound") {
		return (
			<Card className="border-dashed">
				<CardContent className="flex items-start gap-3 p-4 sm:p-5">
					<div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
						<UsersRound className="size-5" />
					</div>
					<div>
						<p className="text-sm font-semibold">{t("notLinkedTitle")}</p>
						<p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("notLinkedDescription")}</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (state.status === "error") {
		return (
			<Card>
				<CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
					<div className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
						<AlertTriangle className="size-5" />
					</div>
					<div>
						<p className="text-sm font-semibold">{t("unavailableTitle")}</p>
						<p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">{t("unavailableDescription")}</p>
					</div>
					<Button type="button" variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
						<RefreshCw className="size-3.5" />
						{t("retry")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	const { data } = state;
	const classification = data.classification;
	const ranks = [
		{ label: t("ranks.attack"), value: data.ranks.attack, icon: Target },
		{ label: t("ranks.defense"), value: data.ranks.defense, icon: ShieldCheck },
		{ label: t("ranks.efficiency"), value: data.ranks.efficiency, icon: BarChart3 }
	];
	const metrics = new Map(data.metrics.map((metric) => [metric.key, metric]));
	const numberValue = (key: ExternalTeamMetric["key"]) => {
		const value = Number.parseFloat((metrics.get(key)?.value ?? "").replace(",", ".").replace(/[^0-9.-]/g, ""));
		return Number.isFinite(value) ? value : null;
	};
	const goalsFor = numberValue("goalsFor");
	const goalsAgainst = numberValue("goalsAgainst");
	const goalsForPerMatch = goalsFor !== null && classification.played > 0 ? goalsFor / classification.played : null;
	const goalsAgainstPerMatch = goalsAgainst !== null && classification.played > 0 ? goalsAgainst / classification.played : null;
	const balancePositive = goalsForPerMatch !== null && goalsAgainstPerMatch !== null && goalsForPerMatch >= goalsAgainstPerMatch;
	const conclusions = [
		{
			icon: Target,
			title: t("conclusions.attackTitle"),
			body: t(
				`conclusions.${data.ranks.attack && data.ranks.attack <= 3 ? "attackHigh" : data.ranks.attack && data.ranks.attack <= 8 ? "attackMedium" : "attackLow"}`,
				{
					rank: data.ranks.attack ?? "—",
					total: data.ranks.totalTeams ?? 12,
					efficiency: metrics.get("attackEfficiency")?.value ?? "—"
				}
			)
		},
		{
			icon: ShieldCheck,
			title: t("conclusions.defenseTitle"),
			body: t(
				`conclusions.${data.ranks.defense && data.ranks.defense <= 3 ? "defenseHigh" : data.ranks.defense && data.ranks.defense <= 8 ? "defenseMedium" : "defenseLow"}`,
				{
					rank: data.ranks.defense ?? "—",
					total: data.ranks.totalTeams ?? 12,
					conceded: goalsAgainstPerMatch?.toFixed(1) ?? "—",
					saves: metrics.get("goalkeeperSaves")?.value ?? "—"
				}
			)
		},
		{
			icon: TrendingUp,
			title: t("conclusions.balanceTitle"),
			body: t(`conclusions.${balancePositive ? "positiveBalance" : "negativeBalance"}`, {
				for: goalsForPerMatch?.toFixed(1) ?? "—",
				against: goalsAgainstPerMatch?.toFixed(1) ?? "—"
			})
		},
		{
			icon: Star,
			title: t("conclusions.referenceTitle"),
			body: data.topScorers[0]
				? t("conclusions.referencePlayer", {
						player: data.topScorers[0].name,
						goals: data.topScorers[0].value,
						matches: data.topScorers[0].matches
					})
				: t("conclusions.referenceUnavailable")
		}
	];

	return (
		<Card className="overflow-hidden border-primary/15 shadow-sm">
			<div className="border-b via-card to-card p-2 sm:p-2">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 items-start gap-3">
						<span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-background text-primary shadow-sm">
							<Trophy className="size-5" />
						</span>
						<div className="min-w-0">
							<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{t("eyebrow")}</p>
							<CardTitle className="mt-1 text-lg sm:text-xl">{t("title")}</CardTitle>
							<CardDescription className="mt-1">{t("description", { season: data.season })}</CardDescription>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
						{state.stale ? (
							<span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
								{t("previousCopy")}
							</span>
						) : (
							<span className="rounded-full border bg-background px-2.5 py-1">{t("weeklyUpdate")}</span>
						)}
						<span>
							{t("updated", {
								date: new Date(state.fetchedAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
							})}
						</span>
					</div>
				</div>
			</div>

			<CardContent className="space-y-7 p-4 sm:p-6">
				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(20rem,.75fr)]">
					<div className="space-y-5">
						<div>
							<SectionHeading icon={Trophy} title={t("sections.competition")} description={t("sections.competitionDescription")} />
							<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
								<SummaryMetric label={t("classification")} value={t("position", { position: classification.position })} emphasis />
								<SummaryMetric label={t("points")} value={classification.points} />
								<SummaryMetric
									label={t("record")}
									value={`${classification.wins}${t("recordLetters.win")} · ${classification.draws}${t("recordLetters.draw")} · ${classification.losses}${t("recordLetters.loss")}`}
								/>
								<SummaryMetric label={t("played")} value={classification.played} />
							</div>
						</div>

						<div>
							<SectionHeading icon={BarChart3} title={t("sections.performance")} description={t("sections.performanceDescription")} />
							<div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
								{data.metrics.map((metric) => (
									<MetricCard key={metric.key} metric={metric} />
								))}
							</div>
						</div>
					</div>

					<div className="rounded-2xl border bg-muted/[0.14] p-4 sm:p-5">
						<SectionHeading icon={TrendingUp} title={t("conclusions.title")} description={t("conclusions.description")} />
						<div className="mt-4 space-y-3">
							{conclusions.map(({ icon: Icon, title, body }) => (
								<div key={title} className="flex gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
									<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
										<Icon className="size-4" />
									</span>
									<div>
										<p className="text-xs font-semibold">{title}</p>
										<p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div>
					<SectionHeading icon={Target} title={t("sections.ranking")} description={t("sections.rankingDescription")} />
					<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{ranks.map(({ label, value, icon: Icon }) => (
							<div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
								<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
									<Icon className="size-5" />
								</span>
								<div>
									<p className="text-2xl font-bold tabular-nums">
										{value ? t("rankValue", { rank: value, total: data.ranks.totalTeams ?? 12 }) : "—"}
									</p>
									<p className="text-xs text-muted-foreground">{label}</p>
								</div>
							</div>
						))}
						<div className="rounded-xl border bg-card p-4">
							<p className="text-xs text-muted-foreground">{t("recentForm")}</p>
							<div className="mt-3 flex gap-1.5">
								{data.form.length ? (
									data.form.map((result, index) => (
										<span
											key={`${result}-${index}`}
											className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold", FORM_STYLES[result])}
										>
											{t(`form.${result}`)}
										</span>
									))
								) : (
									<span className="text-sm text-muted-foreground">—</span>
								)}
							</div>
						</div>
					</div>
				</div>

				<div>
					<SectionHeading icon={UsersRound} title={t("sections.players")} description={t("sections.playersDescription")} />
					<div className="mt-3 grid gap-4 lg:grid-cols-3">
						<RankingList icon={Trophy} title={t("rankings.scorers")} valueLabel={t("rankings.goals")} players={data.topScorers} />
						<RankingList icon={Star} title={t("rankings.rated")} valueLabel={t("rankings.rating")} players={data.topRated} />
						<RankingList icon={Clock3} title={t("rankings.minutes")} valueLabel={t("rankings.time")} players={data.mostUsed} />
					</div>
				</div>
			</CardContent>

			<div className="flex flex-col gap-2 border-t bg-muted/10 px-4 py-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<p>{t("sourceNotice")}</p>
				<a
					href={data.team.sourceUrl}
					target="_blank"
					rel="noreferrer"
					className="inline-flex shrink-0 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
				>
					{t("source")}
					<ExternalLink className="size-3" />
				</a>
			</div>
		</Card>
	);
}

function MetricCard({ metric }: { metric: ExternalTeamMetric }) {
	const t = useTranslations("Opponents.externalLeague");
	return (
		<div className="min-w-0 rounded-xl border bg-card p-3.5 shadow-sm">
			<p className="text-[11px] font-medium leading-tight text-muted-foreground">{t(`metrics.${metric.key}`)}</p>
			<p className="mt-2 text-2xl font-bold tabular-nums">{metric.value}</p>
			{metric.rank ? <p className="mt-1 text-[10px] text-primary">{metric.rank}</p> : null}
		</div>
	);
}

function RankingList({
	icon: Icon,
	title,
	valueLabel,
	players
}: {
	icon: typeof Trophy;
	title: string;
	valueLabel: string;
	players: ExternalPlayerRanking[];
}) {
	const t = useTranslations("Opponents.externalLeague");
	return (
		<div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
			<div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-3.5">
				<span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
					<Icon className="size-4" />
				</span>
				<p className="truncate text-sm font-semibold">{title}</p>
			</div>
			<div className="divide-y">
				{players.length ? (
					players.map((player, index) => (
						<div key={`${player.id}-${index}`} className="flex items-center gap-3 px-4 py-3">
							<span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
							<span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border bg-muted text-[10px] font-bold">
								{player.photoUrl ? (
									<Image src={player.photoUrl} alt="" fill sizes="40px" className="object-cover object-top" />
								) : (
									player.name.slice(0, 2).toUpperCase()
								)}
							</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-xs font-semibold">{player.name}</p>
								<p className="mt-0.5 text-[10px] text-muted-foreground">
									{t("rankings.matches", { count: player.matches })}
									{player.perMatch ? ` · ${player.perMatch}/${t("rankings.matchShort")}` : ""}
								</p>
							</div>
							<div className="shrink-0 rounded-lg bg-muted/40 px-2.5 py-1.5 text-right">
								<p className="text-base font-bold tabular-nums">{player.value}</p>
								<p className="text-[8px] uppercase tracking-wide text-muted-foreground">{valueLabel}</p>
							</div>
						</div>
					))
				) : (
					<p className="px-3 py-8 text-center text-xs text-muted-foreground">{t("rankings.empty")}</p>
				)}
			</div>
		</div>
	);
}

function SectionHeading({ icon: Icon, title, description }: { icon: typeof Trophy; title: string; description: string }) {
	return (
		<div className="flex items-start gap-2.5">
			<span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
				<Icon className="size-3.5" />
			</span>
			<div>
				<h3 className="text-sm font-semibold">{title}</h3>
				<p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

function SummaryMetric({ label, value, emphasis = false }: { label: string; value: string | number; emphasis?: boolean }) {
	return (
		<div className={cn("rounded-xl border bg-card p-4 shadow-sm", emphasis && "border-primary/25 bg-primary/[0.045]")}>
			<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
			<p className={cn("mt-2 font-bold tabular-nums", emphasis ? "text-3xl text-primary" : "text-2xl")}>{value}</p>
		</div>
	);
}
