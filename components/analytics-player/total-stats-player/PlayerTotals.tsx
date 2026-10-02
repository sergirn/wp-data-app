"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";
import { getPlayerDerived, getPlayerStatsByCategory } from "@/lib/stats/playerStatsHelpers";
import { useTranslations } from "next-intl";
import { Crosshair, Percent, Sparkles, Target, type LucideIcon } from "lucide-react";

function StatPill({ children }: { children: React.ReactNode }) {
	return <span className="inline-flex items-center rounded-full border bg-background/75 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">{children}</span>;
}

function KpiBox({ label, value, icon: Icon, tone }: { label: string; value: React.ReactNode; icon: LucideIcon; tone: "blue" | "emerald" | "violet" | "amber" }) {
	const tones = {
		blue: "border-blue-500/20 bg-blue-500/[0.07] text-blue-700 dark:text-blue-300",
		emerald: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300",
		violet: "border-violet-500/20 bg-violet-500/[0.07] text-violet-700 dark:text-violet-300",
		amber: "border-amber-500/20 bg-amber-500/[0.07] text-amber-700 dark:text-amber-300"
	};
	return <div className={`min-w-0 rounded-xl border p-3.5 sm:p-4 ${tones[tone]}`}><div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/65">{label}</p><Icon className="size-4 shrink-0 opacity-80" /></div><p className="mt-2 text-2xl font-bold leading-none tabular-nums sm:text-3xl">{value}</p></div>;
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
	return <div className="overflow-hidden rounded-xl border bg-card"><div className="flex items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3"><div className="min-w-0"><h4 className="text-sm font-semibold leading-tight">{title}</h4>{hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}</div></div><div className="p-2"><div className="grid grid-cols-1 gap-1 sm:grid-cols-2">{children}</div></div></div>;
}

export function FieldPlayerTotalsCard({
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
					"rounded-lg px-3 py-2.5 transition-colors select-none",
					"cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
					isFav
						? "bg-yellow-500/20 border border-yellow-500/20 hover:bg-yellow-500/25"
						: "bg-muted/40 border border-transparent hover:bg-muted/55"
				].join(" ")}
				aria-label={t("favoriteState", { label, state: isFav ? t("favorite") : t("notFavorite") })}
				title={t("toggleHint")}
			>
				<span className="min-w-0 truncate text-sm text-foreground/75">{label}</span>

				<div className="flex items-center gap-2">
					<span className="text-base font-bold tabular-nums text-foreground">{value}</span>

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

	const derived = getPlayerDerived(stats, hiddenStats);

	const goalsItems = getPlayerStatsByCategory("goles", hiddenStats);
	const missesItems = getPlayerStatsByCategory("fallos", hiddenStats);
	const foulsItems = getPlayerStatsByCategory("faltas", hiddenStats);
	const actionsItems = getPlayerStatsByCategory("acciones", hiddenStats);

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

			<div className="space-y-4">
				<div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
					<div className="flex items-center justify-between gap-3 border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.025] to-transparent px-4 py-4 sm:px-5">
						<div className="min-w-0">
							<h3 className="truncate text-lg font-semibold">{resolvedTitle}</h3>
							<p className="mt-0.5 text-xs text-muted-foreground">{sections("totalsDescription")}</p>
						</div>

						{typeof matchCount === "number" ? <StatPill>{sections("matches", { count: matchCount })}</StatPill> : null}
					</div>

					<div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4 lg:grid-cols-4">
						<KpiBox label={details("goals")} value={derived.goals} icon={Target} tone="blue" />
						<KpiBox label={details("shots")} value={derived.shots} icon={Crosshair} tone="amber" />
						<KpiBox label={details("efficiency")} value={`${derived.efficiency}%`} icon={Percent} tone="emerald" />
						<KpiBox label={details("assists")} value={derived.assists} icon={Sparkles} tone="violet" />
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Section title={sections("categories.playerGoals")} hint={sections("hints.playerGoals")}>
							{goalsItems.map((it) => (
							<FavRow key={it.key} statKey={it.key} label={tStat(it.key)} value={(stats?.[it.key] ?? 0) as number} />
							))}
						</Section>

					<Section title={sections("categories.playerMisses")} hint={sections("hints.playerMisses")}>
							{missesItems.map((it) => (
							<FavRow key={it.key} statKey={it.key} label={tStat(it.key)} value={(stats?.[it.key] ?? 0) as number} />
							))}
						</Section>

					<Section title={sections("categories.fouls")} hint={sections("hints.fouls")}>
							{foulsItems.map((it) => (
							<FavRow key={it.key} statKey={it.key} label={tStat(it.key)} value={(stats?.[it.key] ?? 0) as number} />
							))}
						</Section>

					<Section title={sections("categories.actions")} hint={sections("hints.actions")}>
							{actionsItems.map((it) => (
							<FavRow key={it.key} statKey={it.key} label={tStat(it.key)} value={(stats?.[it.key] ?? 0) as number} />
							))}
						</Section>
				</div>
			</div>
		</div>
	);
}
