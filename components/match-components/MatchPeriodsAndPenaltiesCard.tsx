"use client";

import { useTranslations } from "next-intl";

import { PenaltyShootoutList } from "@/components/players-components/PenaltyShootoutList";

type PlayerMini = { id: number; name: string; number: number; photo_url?: string | null };

type LocalShooter = {
	id: number;
	shot_order: number;
	scored: boolean;
	player_id: number;
	players: PlayerMini | null;
};

type RivalShot = {
	id: number;
	shot_order: number;
	scored: boolean;
	result_type: "scored" | "missed" | "saved" | null;
	goalkeeper_id: number | null;
	goalkeeper: PlayerMini | null;
};

type Props = {
	clubName: string;
	opponentName: string;
	hasPenalties: boolean;
	homePenaltyShooters: LocalShooter[];
	rivalPenaltyShots: RivalShot[];
};

export function MatchPeriodsAndPenaltiesCard({
	clubName,
	opponentName,
	hasPenalties,
	homePenaltyShooters,
	rivalPenaltyShots
}: Props) {
	const t = useTranslations("MatchDetails");

	if (!hasPenalties) return null;

	return (
		<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
			<div className="border-b bg-muted/15 px-4 py-3 sm:px-5">
				<h2 className="text-base font-semibold sm:text-lg">{t("shootout")}</h2>
			</div>
			<div className="p-3 sm:p-5">
				<PenaltyShootoutList
					clubName={clubName}
					opponentName={opponentName}
					homePenaltyShooters={homePenaltyShooters}
					rivalPenaltyShots={rivalPenaltyShots}
				/>
			</div>
		</section>
	);
}
