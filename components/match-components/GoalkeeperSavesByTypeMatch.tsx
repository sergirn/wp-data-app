"use client";

import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { buildGoalkeeperSavesSummary, buildGoalkeeperSavesPerPlayer } from "@/lib/helpers/chartGoalkeeperBreakdownHelper";
import { GoalkeeperBreakdownChartBase } from "../templates/charts/GoalkeeperBreakdownChartTemplate";

type PlayerLiteInput = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
};

type Props = {
	match: any;
	stats: any[];
	players: PlayerLiteInput[];
};

export function MatchGoalkeeperSavesBreakdownChart({ match, stats, players }: Props) {
	const playersById = useMemo(() => {
		const m = new Map<number, { id: number; name: string; number?: number | null; photo_url?: string | null }>();

		(players ?? []).forEach((p) => {
			const candidate = (p.name ?? p.full_name ?? "").trim();

			m.set(p.id, {
				id: p.id,
				name: candidate.length ? candidate : `Jugador ${p.id}`,
				number: p.number ?? null,
				photo_url: p.photo_url ?? null
			});
		});

		return m;
	}, [players]);

	const summary = useMemo(() => buildGoalkeeperSavesSummary(stats ?? []), [stats]);
	const perPlayer = useMemo(() => buildGoalkeeperSavesPerPlayer(stats ?? [], playersById), [stats, playersById]);

	if (!summary.total) return null;

	const matchTitle = match?.opponent ? `vs ${match.opponent}` : "Partido";

	return (
		<GoalkeeperBreakdownChartBase
			title="Distribución de paradas"
			description={`${matchTitle} · ${summary.topType?.label ?? "Sin datos"} · Total ${summary.total}`}
			icon={<ShieldCheck className="h-5 w-5" />}
			summary={summary}
			perPlayer={perPlayer}
			topLineCompact={`Principal: ${summary.topType?.label ?? "—"}`}
			topLineFull={`Principal: ${summary.topType?.label ?? "—"} · ${summary.topType?.value ?? 0}/${summary.total}`}
		/>
	);
}
