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
import { getPlayerDerived, getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { PLAYER_CATEGORY_HINTS, PLAYER_CATEGORY_TITLES } from "@/lib/stats/playerStatsConfig";

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

export function FieldPlayerMatchStatsClient({
	matchStats,
	player,
	hiddenStats
}: {
	matchStats: MatchStatsWithMatch[];
	player: Player;
	hiddenStats?: string[] | Set<string>;
}) {
	if (!matchStats?.length) {
		return (
			<Card className="mb-6">
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">No hay estadísticas de partidos registradas</p>
				</CardContent>
			</Card>
		);
	}

	const { weights, loaded } = useStatWeights();
	const hasWeights = loaded && Object.keys(weights).length > 0;

	const formatDate = (d?: string) =>
		d
			? new Date(d).toLocaleDateString("es-ES", {
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

	const playerId: number | undefined = (player as any)?.id ?? (matchStats?.[0] as any)?.player_id ?? undefined;
	const { favSet, toggleLocal, dirty, save, discard, saving, error } = usePlayerFavorites(playerId);

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
				aria-label={`${label}: ${isFav ? "favorita" : "no favorita"}`}
				title="Pulsa para marcar/desmarcar como favorita"
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
						aria-label={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
						title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
					>
						<span className={isFav ? "opacity-100" : "opacity-30"}>★</span>
					</button>
				</div>
			</div>
		);
	};

	const goalsItems = getPlayerStatsByCategory("goles", hiddenStats);
	const missesItems = getPlayerStatsByCategory("fallos", hiddenStats);
	const foulsItems = getPlayerStatsByCategory("faltas", hiddenStats);
	const actionsItems = getPlayerStatsByCategory("acciones", hiddenStats);

	const defaultOpen = `match-${matchStats[0]?.id}`;

	return (
		<div className="space-y-4 mb-6">
			{dirty ? (
				<div className="sticky top-2 z-20">
					<div className="rounded-xl border bg-background/60 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
						<div className="text-xs text-muted-foreground">
							Cambios sin guardar{error ? <span className="text-destructive"> · {error}</span> : null}
						</div>

						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={discard} disabled={saving}>
								Descartar
							</Button>
							<Button size="sm" onClick={save} disabled={saving}>
								{saving ? "Guardando..." : "Guardar cambios"}
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<Accordion type="single" collapsible className="w-full space-y-4" defaultValue={defaultOpen}>
				{matchStats.map((stat) => {
					const match = stat.matches;
					const derived = getPlayerDerived(stat as any, hiddenStats);
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
															<span className="text-[11px] text-muted-foreground">pts</span>
														</div>
													) : null}
												</div>

												<span className="text-xl md:text-2xl font-bold tabular-nums">
													{match?.home_score ?? 0} - {match?.away_score ?? 0}
												</span>

												<Button
													asChild
													variant="outline"
													size="sm"
													className="bg-transparent"
													onClick={(e) => e.stopPropagation()}
												>
													<Link href={`/partidos/${match?.id}`}>Ver Partido</Link>
												</Button>
											</div>
										</div>
									</CardHeader>
								</AccordionTrigger>

								<AccordionContent className="p-0">
									<CardContent className="space-y-3 sm:space-y-4">
										<div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
											<KpiBox
												label="Goles"
												value={derived.goals}
												className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
											/>
											<KpiBox
												label="Tiros"
												value={derived.shots}
												className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
											/>
											<KpiBox
												label="Eficiencia"
												value={`${derived.efficiency}%`}
												className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
											/>
											<KpiBox
												label="Asistencias"
												value={derived.assists}
												className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
											/>
										</div>

										<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
											<Section title={PLAYER_CATEGORY_TITLES.goles} hint={PLAYER_CATEGORY_HINTS.goles ?? "Partido"}>
												{goalsItems.map((it) => (
													<KV key={it.key} label={it.label} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

											<Section title={PLAYER_CATEGORY_TITLES.fallos} hint={PLAYER_CATEGORY_HINTS.fallos ?? "Partido"}>
												{missesItems.map((it) => (
													<KV key={it.key} label={it.label} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

											<Section title={PLAYER_CATEGORY_TITLES.faltas} hint={PLAYER_CATEGORY_HINTS.faltas ?? "Partido"}>
												{foulsItems.map((it) => (
													<KV key={it.key} label={it.label} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
												))}
											</Section>

											<Section title={PLAYER_CATEGORY_TITLES.acciones} hint={PLAYER_CATEGORY_HINTS.acciones ?? "Partido"}>
												{actionsItems.map((it) => (
													<KV key={it.key} label={it.label} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
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
