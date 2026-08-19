"use client";

import * as React from "react";
import Link from "next/link";
import type { Player, MatchStats, Match } from "@/lib/types";

import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";
import { useStatWeights } from "@/hooks/useStatWeights";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Loader2, TrendingUp } from "lucide-react";

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

			<Accordion type="single" collapsible className="w-full space-y-4" defaultValue={defaultOpen}>
				{matchStats.map((stat) => {
					const match = stat.matches;
					const derived = getGoalkeeperDerived(stat as any, hiddenStats);
					const score = hasWeights ? computeWeightedScore(stat as any, weights, hiddenStats) : null;

					return (
						<AccordionItem key={stat.id} value={`match-${stat.id}`} className="border-0">
							<Card className="overflow-hidden">
								<AccordionTrigger
									className="
                    w-full p-0 hover:no-underline
                    [&>svg]:mr-4
                    [&>svg]:shrink-0
                    [&>svg]:transition-transform
                    data-[state=open]:[&>svg]:rotate-180
                  "
								>
									<CardHeader className="pb-3 w-full">
										<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
											<div className="min-w-0 text-left">
												<CardTitle className="text-base md:text-lg truncate">{match?.opponent ?? "—"}</CardTitle>
												<p className="text-xs md:text-sm text-muted-foreground truncate">{formatDate(match?.match_date)}</p>
											</div>

											<div className="flex items-center justify-between md:justify-end gap-3">
												<div className="flex items-center gap-2">
													{!loaded ? (
														<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
													) : hasWeights && score !== null ? (
														<div className="inline-flex items-center gap-1.5 rounded-lg border bg-card/60 backdrop-blur px-2 py-1">
															<TrendingUp className="h-4 w-4" />
															<span className="text-sm font-bold tabular-nums">
																{score > 0 ? "+ " : ""}
																{score}
															</span>
												<span className="text-[11px] text-muted-foreground">{page("points")}</span>
														</div>
													) : null}
												</div>

												<span className="text-xl md:text-2xl font-bold tabular-nums">
													{match?.home_score ?? 0} - {match?.away_score ?? 0}
												</span>

												<div className="flex items-center gap-2">
										{stat.id != null && <ExportPlayerMatchPdfButton playerId={player.id} matchStatId={stat.id} />}

												<Button
													asChild
													variant="outline"
													size="sm"
													className="bg-transparent"
													onClick={(e) => e.stopPropagation()}
												>
											<Link href={`/partidos/${match?.id}`}>{page("viewMatch")}</Link>
												</Button>
												</div>
											</div>
										</div>
									</CardHeader>
								</AccordionTrigger>

								<AccordionContent className="p-0">
									<CardContent className="space-y-4">
										<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
											<KpiBox
								label={details("saves")}
												value={derived.saves}
												className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
											/>
											<KpiBox
								label={details("goalsConceded")}
												value={derived.goalsConceded}
												className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
											/>
											<KpiBox
								label={details("efficiency")}
												value={`${derived.savePct}%`}
												className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
											/>
											<KpiBox
								label={details("shotsReceived")}
												value={derived.shotsReceived}
												className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
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
									</CardContent>
								</AccordionContent>
							</Card>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}
