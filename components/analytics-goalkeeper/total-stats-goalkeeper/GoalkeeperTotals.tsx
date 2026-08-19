"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";
import { getGoalkeeperDerived, getGoalkeeperStatsByCategory } from "@/lib/stats/goalkeeperStatsHelpers";
import { type GoalkeeperStatCategory } from "@/lib/stats/goalkeeperStatsConfig";
import { useTranslations } from "next-intl";

const CATEGORY_KEYS = {
	goles: "goalkeeperGoals", paradas: "saves", paradas_penalti: "penalties", otros_tiros: "otherShots",
	inferioridad: "inferiority", acciones: "actions", ataque: "goalkeeperAttack"
} as const;
const HINT_KEYS = { ...CATEGORY_KEYS, acciones: "goalkeeperActions" } as const;

export function GoalkeeperTotalsCard({
	stats,
	matchCount,
	title,
	playerId,
	hiddenStats
}: {
	stats: any;
	matchCount?: number;
	title?: string;
	playerId: number;
	hiddenStats?: string[] | Set<string>;
}) {
	const t = useTranslations("FavoritesModal");
	const sections = useTranslations("StatsSections");
	const details = useTranslations("MatchDetails");
	const tStat = useTranslations("StatLabels");
	const resolvedTitle = title ?? sections("totals");
	const StatPill = ({ children }: { children: React.ReactNode }) => (
		<span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">{children}</span>
	);

	const KpiBox = ({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) => (
		<div
			className={[
				"rounded-2xl border p-4",
				"bg-gradient-to-br",
				subtle ? "from-background to-muted/60" : "from-blue-500/5 to-blue-500/10"
			].join(" ")}
		>
			<p className="text-[22px] sm:text-2xl font-bold tabular-nums leading-none">{value}</p>
			<p className="text-xs text-muted-foreground mt-2">{label}</p>
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

	const { favSet, toggleLocal, dirty, save, discard, saving, error } = usePlayerFavorites(playerId);

	const FavRow = ({ label, value, statKey }: { label: string; value: React.ReactNode; statKey: string }) => {
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
					"flex items-center justify-between gap-3",
					"rounded-xl px-3 py-2 transition-colors select-none",
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

	const derived = getGoalkeeperDerived(stats, hiddenStats);

	const orderedCategories: GoalkeeperStatCategory[] = ["goles", "paradas", "paradas_penalti", "otros_tiros", "inferioridad", "acciones", "ataque"];

	return (
		<div className="space-y-4">
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

			<div className="overflow-hidden">
				<div className="space-y-5">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<h3 className="text-lg font-semibold truncate">{resolvedTitle}</h3>
						</div>

						{typeof matchCount === "number" ? <StatPill>{sections("matches", { count: matchCount })}</StatPill> : null}
					</div>

					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<KpiBox label={details("saves")} value={derived.saves} />
						<KpiBox label={details("goalsConceded")} value={derived.goalsConceded} subtle />
						<KpiBox label={details("savePercentage")} value={`${derived.savePct}%`} />
						<KpiBox label={details("shotsReceived")} value={derived.shotsReceived} subtle />
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{orderedCategories.map((category) => {
							const items = getGoalkeeperStatsByCategory(category, hiddenStats);

							if (!items.length) return null;

							return (
							<Section key={category} title={sections(`categories.${CATEGORY_KEYS[category]}`)} hint={sections(`hints.${HINT_KEYS[category]}`)}>
									{items.map((it) => (
									<FavRow key={it.key} statKey={it.key} label={tStat(it.key)} value={(stats?.[it.key] ?? 0) as number} />
									))}
								</Section>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
