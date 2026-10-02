"use client";

import * as React from "react";
import Link from "next/link";
import type { Player, MatchStats, Match } from "@/lib/types";

import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";
import { useStatWeights } from "@/hooks/useStatWeights";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { ExternalLink, Loader2, TrendingUp } from "lucide-react";

import { getGoalkeeperDerived, getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers";
import { ExportPlayerMatchPdfButton } from "@/components/export-buttons/export-player-match-pdf-button";
import { useLocale, useTranslations } from "next-intl";

interface MatchStatsWithMatch extends MatchStats {
	matches: Match;
}

function isHiddenStat(statKey: string, hiddenStats?: string[] | Set<string>) {
	if (!hiddenStats) return false;
	if (hiddenStats instanceof Set) return hiddenStats.has(statKey);
	return hiddenStats.includes(statKey);
}

function computeWeightedScore(row: Record<string, any>, weights: Record<string, number>, hiddenStats?: string[] | Set<string>): number {
	let score = 0;

	for (const [key, weightRaw] of Object.entries(weights)) {
		if (isHiddenStat(key, hiddenStats)) continue;

		const weight = Number(weightRaw);
		const value = Number(row?.[key] ?? 0);

		if (Number.isFinite(weight) && Number.isFinite(value)) {
			score += value * weight;
		}
	}

	return Math.round(score);
}

export function GoalkeeperMatchStatsClient({
	matchStats,
	player,
	hiddenStats
}: {
	matchStats: MatchStatsWithMatch[];
	player: Player;
	hiddenStats?: string[] | Set<string>;
}) {
	const { weights, loaded } = useStatWeights();
	const locale = useLocale();
	const t = useTranslations("FavoritesModal");
	const page = useTranslations("PlayerDetail");
	const sections = useTranslations("StatsSections");
	const details = useTranslations("MatchDetails");
	const tStat = useTranslations("StatLabels");
	const playerId = player.id ?? matchStats?.[0]?.player_id;
	const { favSet, toggleLocal, dirty, save, discard, saving, error } = usePlayerFavorites(playerId);

	if (!matchStats?.length) {
		return (
			<Card className="mb-6">
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">{page("noMatchStats")}</p>
				</CardContent>
			</Card>
		);
	}

	const hasWeights = loaded && Object.keys(weights).length > 0;

	const formatDate = (d?: string) =>
		d
			? new Date(d).toLocaleDateString(locale, {
					year: "numeric",
					month: "long",
					day: "numeric"
				})
			: "";

	const KpiBox = ({ label, value, className }: { label: string; value: React.ReactNode; className: string }) => (
		<div className={`rounded-xl p-4 text-center border ${className}`}>
			<p className="text-2xl font-bold tabular-nums">{value}</p>
			<p className="text-xs text-muted-foreground mt-1">{label}</p>
		</div>
	);

	const Section = ({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) => (
		<div className="rounded-2xl border bg-card/40">
			<div className="flex items-start justify-between gap-3 px-4 py-3 border-b">
				<div className="min-w-0">
					<h4 className="text-sm font-semibold leading-tight">{title}</h4>
					{hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
				</div>
			</div>
			<div className="p-2">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">{children}</div>
			</div>
		</div>
	);

	const KV = ({ label, value, statKey }: { label: string; value: React.ReactNode; statKey: string }) => {
		const isFav = favSet.has(statKey);
		const onToggle = () => toggleLocal(statKey);

		return (
			<div
				role="button"
				tabIndex={0}
				onClick={onToggle}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onToggle();
					}
				}}
				className={[
					"flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors select-none",
					"cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
					isFav
						? "bg-yellow-500/20 border border-yellow-500/20 hover:bg-yellow-500/25"
						: "bg-muted/40 border border-transparent hover:bg-muted/55"
				].join(" ")}
				aria-label={t("favoriteState", { label, state: isFav ? t("favorite") : t("notFavorite") })}
				title={t("toggleHint")}
			>
				<span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>

				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold tabular-nums">{value}</span>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggle();
						}}
						className={["h-7 w-7 grid place-items-center rounded-md text-xs", isFav ? "opacity-100" : "opacity-50 hover:opacity-90"].join(
							" "
						)}
						aria-label={isFav ? t("removeFavorite") : t("markFavorite")}
						title={isFav ? t("removeFavorite") : t("markFavorite")}
					>
						<span className={isFav ? "opacity-100" : "opacity-30"}>★</span>
					</button>
				</div>
			</div>
		);
	};

	const goalItems = getGoalkeeperStatsByCategory("goles", hiddenStats);
	const saveItems = getGoalkeeperStatsByCategory("paradas", hiddenStats);
	const penaltyItems = getGoalkeeperStatsByCategory("paradas_penalti", hiddenStats);
	const otherShotItems = getGoalkeeperStatsByCategory("otros_tiros", hiddenStats);
	const inferiorityItems = getGoalkeeperStatsByCategory("inferioridad", hiddenStats);
	const actionItems = getGoalkeeperStatsByCategory("acciones", hiddenStats);
	const attackItems = getGoalkeeperStatsByCategory("ataque", hiddenStats);

	const defaultOpen = `match-${matchStats[0]?.id}`;

	return (
		<div className="space-y-4 mb-6">
			{dirty ? (
				<div className="sticky top-2 z-20">
					<div className="rounded-xl border bg-background/60 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
						<div className="text-xs text-muted-foreground">
							{t("unsavedChanges")}{error ? <span className="text-destructive"> · {error}</span> : null}
						</div>

						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={discard} disabled={saving}>
								{t("discard")}
							</Button>
							<Button size="sm" onClick={save} disabled={saving}>
								{saving ? t("saving") : t("saveChanges")}
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<Accordion type="single" collapsible className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm" defaultValue={defaultOpen}>
				<div className="hidden grid-cols-[minmax(10rem,1fr)_5rem_minmax(16rem,1.3fr)_6.5rem_5rem_1.5rem] items-center gap-4 border-b bg-muted/25 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
					<span>{page("table.match")}</span>
					<span>{page("table.score")}</span>
					<span>{page("table.performance")}</span>
					<span>{page("table.rating")}</span>
					<span className="text-center">{page("table.actions")}</span>
					<span className="sr-only">{page("table.expand")}</span>
				</div>
				{matchStats.map((stat) => {
					const match = stat.matches;
					const derived = getGoalkeeperDerived(stat as any, hiddenStats);
					const score = hasWeights ? computeWeightedScore(stat as any, weights, hiddenStats) : null;

					return (
						<AccordionItem key={stat.id} value={`match-${stat.id}`} className="border-b last:border-b-0">
								<AccordionTrigger
									className="group w-full rounded-none px-4 py-4 hover:bg-primary/[0.035] hover:no-underline sm:px-5 [&>svg]:mr-0 [&>svg]:self-center"
								>
					<div className="grid min-w-0 flex-1 gap-4 text-left lg:grid-cols-[minmax(10rem,1fr)_5rem_minmax(16rem,1.3fr)_6.5rem_5rem] lg:items-center">
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold tracking-tight sm:text-base">{match?.opponent ?? "—"}</p>
											<p className="mt-0.5 truncate text-xs text-muted-foreground">{formatDate(match?.match_date)}</p>
										</div>

										<div className="flex items-center justify-between gap-3 lg:block">
											<span className="text-xs text-muted-foreground lg:hidden">{page("table.score")}</span>
											<span className="text-lg font-bold tabular-nums sm:text-xl">{match?.home_score ?? 0} – {match?.away_score ?? 0}</span>
										</div>

										<div className="grid grid-cols-4 gap-1.5 rounded-xl border bg-muted/10 p-2 lg:border-0 lg:bg-transparent lg:p-0">
											<RowMetric label={details("saves")} value={derived.saves} />
											<RowMetric label={details("goalsConceded")} value={derived.goalsConceded} />
											<RowMetric label={details("efficiencyShort")} value={`${derived.savePct}%`} />
											<RowMetric label={details("shotsReceived")} value={derived.shotsReceived} />
										</div>

										<div className="flex items-center justify-between gap-3 lg:block">
											<span className="text-xs text-muted-foreground lg:hidden">{page("table.rating")}</span>
											{!loaded ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : hasWeights && score !== null ? <span className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /><span className="font-bold tabular-nums">{score > 0 ? "+" : ""}{score}</span><span className="text-[10px] text-muted-foreground">{page("points")}</span></span> : <span className="text-muted-foreground">—</span>}
										</div>

						<div className="flex items-center justify-end gap-1 border-t pt-3 lg:border-0 lg:pt-0" onClick={(event) => event.stopPropagation()}>
											{stat.id != null && <ExportPlayerMatchPdfButton playerId={player.id} matchStatId={stat.id} />}
							<Button asChild variant="outline" size="icon" className="size-8 bg-transparent"><Link href={`/partidos/${match?.id}`} aria-label={page("viewMatch")} title={page("viewMatch")}><ExternalLink className="size-4" /><span className="sr-only">{page("viewMatch")}</span></Link></Button>
										</div>
									</div>
								</AccordionTrigger>

								<AccordionContent className="border-t bg-muted/[0.08] p-4 sm:p-5">
									<div className="space-y-4">
										<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
											<KpiBox
								label={details("saves")}
												value={derived.saves}
												className="border-blue-500/20 bg-blue-500/[0.07] text-blue-700 dark:text-blue-300"
											/>
											<KpiBox
								label={details("goalsConceded")}
												value={derived.goalsConceded}
												className="border-slate-500/20 bg-slate-500/[0.06] text-slate-700 dark:text-slate-300"
											/>
											<KpiBox
								label={details("efficiency")}
												value={`${derived.savePct}%`}
												className="border-blue-500/20 bg-blue-500/[0.07] text-blue-700 dark:text-blue-300"
											/>
											<KpiBox
								label={details("shotsReceived")}
												value={derived.shotsReceived}
												className="border-slate-500/20 bg-slate-500/[0.06] text-slate-700 dark:text-slate-300"
											/>
										</div>

										<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							<Section title={sections("categories.goalkeeperGoals")} hint={sections("hints.goalkeeperGoals")}>
												{goalItems.map((it) => (
									<KV key={it.key} label={tStat(it.key)} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

							<Section title={sections("categories.saves")} hint={sections("hints.saves")}>
												{saveItems.map((it) => (
									<KV key={it.key} label={tStat(it.key)} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

											<Section
								title={sections("categories.penalties")}
								hint={sections("hints.penalties")}
											>
												{penaltyItems.map((it) => (
									<KV key={it.key} label={tStat(it.key)} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

											<Section
								title={sections("categories.otherShots")}
								hint={sections("hints.otherShots")}
											>
												{otherShotItems.map((it) => (
									<KV key={it.key} label={tStat(it.key)} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

											<Section
								title={sections("categories.inferiority")}
								hint={sections("hints.inferiority")}
											>
												{inferiorityItems.map((it) => (
									<KV key={it.key} label={tStat(it.key)} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

											<Section
								title={sections("categories.actions")}
								hint={sections("hints.goalkeeperActions")}
											>
												{actionItems.map((it) => (
									<KV key={it.key} label={tStat(it.key)} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

							<Section title={sections("categories.goalkeeperAttack")} hint={sections("hints.goalkeeperAttack")}>
												{attackItems.map((it) => (
									<KV key={it.key} label={tStat(it.key)} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>
										</div>
									</div>
								</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}

function RowMetric({ label, value }: { label: string; value: React.ReactNode }) {
	return <div className="min-w-0 text-center"><p className="text-sm font-bold tabular-nums">{value}</p><p className="truncate text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}
