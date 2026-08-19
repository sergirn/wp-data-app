"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle, Users, X, XCircle } from "lucide-react";
import type { Player, PenaltyShooter } from "@/components/players-components/PenaltiesTab";
import { useTranslations } from "next-intl";

type Props = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	fieldPlayers: Player[];
	setPenaltyShooters: React.Dispatch<React.SetStateAction<PenaltyShooter[]>>;
};

const makeId = () => Date.now() + Math.floor(Math.random() * 1_000_000);

function PlayerRow({ player, onAdd }: { player: Player; onAdd: (scored: boolean) => void }) {
	const t = useTranslations("Penalties");
	return (
		<div className="rounded-xl border bg-card/40 p-3 hover:bg-accent/20 transition-colors">
			<div className="flex items-center gap-3">
				<div className="flex-shrink-0 w-11 h-11 rounded-full bg-muted/50 border flex items-center justify-center">
					<span className="text-base font-bold text-foreground tabular-nums">{player.number}</span>
				</div>

				<div className="flex-1 min-w-0">
					<p className="font-semibold text-sm text-foreground truncate">{player.name}</p>
					<div className="mt-1 flex items-center gap-2">
						<Badge variant="secondary" className="text-[11px]">
							{t("fieldPlayer")}
						</Badge>
						<span className="text-[11px] text-muted-foreground">{t("canRepeat")}</span>
					</div>
				</div>
			</div>

			<div className="mt-3 flex gap-2">
				<Button type="button" className="flex-1" onClick={() => onAdd(true)}>
					<CheckCircle className="mr-2 h-4 w-4" />
					{t("goal")}
				</Button>
				<Button type="button" variant="destructive" className="flex-1" onClick={() => onAdd(false)}>
					<XCircle className="mr-2 h-4 w-4" />
					{t("miss")}
				</Button>
			</div>
		</div>
	);
}

export function PenaltyShooterDialog({ open, onOpenChange, fieldPlayers, setPenaltyShooters }: Props) {
	const t = useTranslations("Penalties");
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button aria-label={t("close")} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} type="button" />

			<Card className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border shadow-2xl">
				<div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b bg-card/60">
					<div className="min-w-0">
						<p className="text-lg sm:text-xl font-bold">{t("dialogTitle")}</p>
						<p className="text-sm text-muted-foreground mt-1">
							{t("dialogDescription")}
						</p>
					</div>

					<Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
						<X className="h-5 w-5" />
					</Button>
				</div>

				<div className="p-5 sm:p-6 overflow-y-auto">
					{fieldPlayers.length === 0 ? (
						<div className="rounded-xl border bg-muted/20 p-8 text-center">
							<Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
							<p className="text-sm font-medium text-muted-foreground">{t("noPlayers")}</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{fieldPlayers.map((player) => (
								<PlayerRow
									key={player.id}
									player={player}
									onAdd={(scored) => {
										setPenaltyShooters((prev) => [...prev, { id: makeId(), playerId: player.id, scored }]);
										onOpenChange(false);
									}}
								/>
							))}
						</div>
					)}
				</div>

				<div className="p-5 sm:p-6 border-t bg-muted/20">
					<Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
						{t("close")}
					</Button>
				</div>
			</Card>
		</div>
	);
}
