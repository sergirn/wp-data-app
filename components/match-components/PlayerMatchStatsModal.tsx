"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerHeroHeader } from "@/app/jugadores/[id]/playerHeader";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { PlayerStatsSections } from "../analytics-player/PlayerStatsSections";
import { getPlayerDerived } from "@/lib/stats/playerStatsHelpers";
import { useTranslations } from "next-intl";

type Props = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	player: any;
	stat: any;
	hiddenStats?: string[];
	derived: {
		totalShots: number;
		shootingEfficiency: string;
		superiorityGoals: number;
		superiorityAttempts: number;
		superiorityEfficiency: string;
		totalActions: number;
		totalFouls: number;
	};
};

function usePlayerFavorites(playerId?: number, open?: boolean) {
	const t = useTranslations("FavoritesModal");
	const [initialKeys, setInitialKeys] = React.useState<string[]>([]);
	const [draftKeys, setDraftKeys] = React.useState<string[]>([]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const favSet = React.useMemo(() => new Set(draftKeys), [draftKeys]);

	const dirty = React.useMemo(() => {
		const a = new Set(initialKeys);
		const b = new Set(draftKeys);
		if (a.size !== b.size) return true;
		for (const k of a) if (!b.has(k)) return true;
		return false;
	}, [initialKeys, draftKeys]);

	const load = React.useCallback(async () => {
		if (!playerId) return;
		setError(null);
		try {
			const res = await fetch(`/api/favorites?playerId=${playerId}`, { cache: "no-store" });
			const json = await res.json();
			const keys = Array.isArray(json.keys) ? json.keys : [];
			setInitialKeys(keys);
			setDraftKeys(keys);
		} catch {
			setInitialKeys([]);
			setDraftKeys([]);
			setError(t("loadError"));
		}
	}, [playerId, t]);

	React.useEffect(() => {
		if (!open || !playerId) return;
		load();
	}, [playerId, open, load]);

	const toggleLocal = (statKey: string) => {
		setDraftKeys((prev) => (prev.includes(statKey) ? prev.filter((k) => k !== statKey) : [...prev, statKey]));
	};

	const discard = () => {
		setError(null);
		setDraftKeys(initialKeys);
	};

	const save = async () => {
		if (!playerId) return;
		setSaving(true);
		setError(null);

		const prev = new Set(initialKeys);
		const next = new Set(draftKeys);

		const toToggle: string[] = [];
		for (const k of prev) if (!next.has(k)) toToggle.push(k);
		for (const k of next) if (!prev.has(k)) toToggle.push(k);

		try {
			for (const statKey of toToggle) {
				const res = await fetch("/api/favorites", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ playerId, statKey })
				});
				if (!res.ok) throw new Error("save_failed");
			}

			setInitialKeys(draftKeys);
		} catch {
			setError(t("saveError"));
			await load();
		} finally {
			setSaving(false);
		}
	};

	return { favSet, toggleLocal, dirty, save, discard, saving, error, reload: load };
}

export function PlayerMatchStatsModal({ open, onOpenChange, player, stat, derived, hiddenStats = [] }: Props) {
	const t = useTranslations("FavoritesModal");
	const playerId: number | undefined = player?.id ?? stat?.player_id;

	const { favSet, toggleLocal, dirty, save, discard, saving, error } = usePlayerFavorites(playerId, open);

	const [confirmOpen, setConfirmOpen] = React.useState(false);
	const pendingCloseRef = React.useRef<boolean | null>(null);

	const requestClose = React.useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			onOpenChange(true);
			return;
		}

		if (dirty && !saving) {
			pendingCloseRef.current = false;
			setConfirmOpen(true);
			return;
		}
		requestClose();
	};

	const confirmCloseWithoutSaving = () => {
		setConfirmOpen(false);
		pendingCloseRef.current = null;
		discard();
		requestClose();
	};

	const confirmSaveAndClose = async () => {
		await save();
		setConfirmOpen(false);
		pendingCloseRef.current = null;
		requestClose();
	};

	const modalDerived = React.useMemo(() => getPlayerDerived(stat, hiddenStats), [stat, hiddenStats]);

	const KpiBox = ({ label, value, className }: { label: string; value: React.ReactNode; className: string }) => (
		<div className={`rounded-xl p-4 text-center border ${className}`}>
			<p className="text-2xl font-bold tabular-nums">{value}</p>
			<p className="text-xs text-muted-foreground mt-1">{label}</p>
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
					"flex items-center justify-between rounded-lg px-3 py-2 border transition-colors select-none",
					"cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
					isFav ? "bg-yellow-500/20 border-yellow-500/20 hover:bg-yellow-500/25" : "bg-muted/50 border-transparent hover:bg-muted/70"
				].join(" ")}
				aria-label={t("favoriteState", { label, state: isFav ? t("favorite") : t("notFavorite") })}
			>
				<span className="text-sm text-muted-foreground">{label}</span>

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

	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent
					className="
            !w-[calc(100vw-16px)]
            sm:!w-[94vw]
            md:!w-[90vw]
            lg:!w-[86vw]
            xl:!w-[78vw]
            2xl:!w-[70vw]
            !max-w-[1600px]
            p-0 overflow-hidden
          "
				>
					<VisuallyHidden>
						<DialogTitle>{player?.name ?? t("playerStats")}</DialogTitle>
					</VisuallyHidden>

					<div className="p-2">
						<PlayerHeroHeader
							player={{
								name: player?.name ?? t("player"),
								number: player?.number,
								photo_url: player?.photo_url,
								is_goalkeeper: player?.is_goalkeeper
							}}
							roleLabel={player?.is_goalkeeper ? t("goalkeeper") : t("player")}
						/>
					</div>

					{dirty ? (
						<div className="sticky top-0 z-20 px-4 pb-2 bg-background/60 backdrop-blur">
							<div className="rounded-xl border bg-background/80 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
								<div className="text-xs text-muted-foreground">
									{t("unsavedChanges")} {error ? <span className="text-destructive">· {error}</span> : null}
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
					) : (
						<div />
					)}

					<div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							<KpiBox label={t("goals")} value={modalDerived.goals} className="bg-blue-500/5 border-blue-500/10" />
							<KpiBox label={t("shots")} value={modalDerived.shots} className="bg-white/5 border-blue-500/20" />
							<KpiBox label={t("efficiency")} value={`${modalDerived.efficiency}%`} className="bg-blue-500/5 border-blue-500/10" />
							<KpiBox label={t("assists")} value={modalDerived.assists} className="bg-white/5 border-blue-500/20" />
						</div>

						<PlayerStatsSections
							stats={stat}
							mode="match"
							hiddenStats={hiddenStats}
							renderRow={({ label, value, statKey }) => <KV key={statKey} label={label} value={value} statKey={statKey} />}
						/>

						<Card className="bg-muted/20">
							<CardContent className="pt-4">
								<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
									<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
										<span className="text-sm text-muted-foreground">{t("totalActions")}</span>
										<span className="text-sm font-semibold tabular-nums">{modalDerived.totalActions}</span>
									</div>
									<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
										<span className="text-sm text-muted-foreground">{t("totalExclusions")}</span>
										<span className="text-sm font-semibold tabular-nums">{modalDerived.totalFouls}</span>
									</div>
									<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
										<span className="text-sm text-muted-foreground">{t("superiorityGoals")}</span>
										<span className="text-sm font-semibold tabular-nums">{modalDerived.superiorityGoals}</span>
									</div>
									<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
										<span className="text-sm text-muted-foreground">{t("superiorityEfficiency")}</span>
										<span className="text-sm font-semibold tabular-nums">{modalDerived.superiorityEfficiency}%</span>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent className="sm:max-w-[480px]">
					<DialogTitle>{t("leaveTitle")}</DialogTitle>

					<div className="text-sm text-muted-foreground">{t("leaveDescription")}</div>

					<div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
						<Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
							{t("continueEditing")}
						</Button>

						<Button variant="destructive" onClick={confirmCloseWithoutSaving} disabled={saving}>
							{t("leaveWithoutSaving")}
						</Button>

						<Button onClick={confirmSaveAndClose} disabled={saving}>
							{saving ? t("saving") : t("saveAndExit")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
