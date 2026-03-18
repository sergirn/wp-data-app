"use client";

import React, { useMemo } from "react";
import { buildShotMistakesMatchData } from "@/lib/helpers/chartMistakeShootHelper";
import { ShotMistakesChartBase } from "../templates/charts/ShotMistakesChartTemplate";

type PlayerLiteInput = {
	id: number;
	name?: string | null;
	full_name?: string | null;
	number?: number | null;
	photo_url?: string | null;
};

type MatchLite = {
	id: number;
	opponent?: string | null;
	match_date?: string | null;
	jornada?: number | null;
};

interface ShotMistakesDonutChartMatchProps {
	match: MatchLite | null;
	stats: any[];
	players: PlayerLiteInput[];
}

function playerLabelShort(p: { id: number; name: string; number?: number | null; photo_url?: string | null } | null, value: number) {
	if (!p) return "—";
	const num = p.number != null ? `#${p.number}` : "#-";
	return `${num} (${value})`;
}

function playerLabelFull(p: { id: number; name: string; number?: number | null; photo_url?: string | null } | null, value: number) {
	if (!p) return "—";
	const num = p.number != null ? `#${p.number}` : "#-";
	return `${num} ${p.name} (${value})`;
}

export function ShotMistakesDonutChartMatch({ match, stats, players }: ShotMistakesDonutChartMatchProps) {
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

	const data = useMemo(() => buildShotMistakesMatchData(match, stats ?? [], playersById), [match, stats, playersById]);

	if (!data?.summary?.total) return null;

	const matchTitle = match?.opponent ? `vs ${match.opponent}` : "Partido";

	const getTopPlayerByKey = (key: "pen" | "corner" | "out" | "palo" | "saved" | "blocked" | "sup") => {
		let best = data.perPlayer[0] ?? null;

		for (const row of data.perPlayer ?? []) {
			if ((row[key] ?? 0) > ((best?.[key] as number) ?? 0)) {
				best = row;
			}
		}

		return {
			player: best?.player ?? null,
			value: (best?.[key] as number) ?? 0
		};
	};

	const topPlayers = {
		pen: getTopPlayerByKey("pen"),
		corner: getTopPlayerByKey("corner"),
		out: getTopPlayerByKey("out"),
		palo: getTopPlayerByKey("palo"),
		saved: getTopPlayerByKey("saved"),
		blocked: getTopPlayerByKey("blocked"),
		sup: getTopPlayerByKey("sup")
	};

	const topLineCompact =
		data.summary.total > 0
			? `Fuera ${playerLabelShort(topPlayers.out.player, topPlayers.out.value)} · Parado ${playerLabelShort(
					topPlayers.saved.player,
					topPlayers.saved.value
				)} · Bloq ${playerLabelShort(topPlayers.blocked.player, topPlayers.blocked.value)}`
			: "Sin datos";

	const topLineFull =
		data.summary.total > 0
			? `Top: Penalti ${playerLabelFull(topPlayers.pen.player, topPlayers.pen.value)} · Corner ${playerLabelFull(
					topPlayers.corner.player,
					topPlayers.corner.value
				)} · Fuera ${playerLabelFull(topPlayers.out.player, topPlayers.out.value)} · Palo ${playerLabelFull(
					topPlayers.palo.player,
					topPlayers.palo.value
				)} · Parado ${playerLabelFull(topPlayers.saved.player, topPlayers.saved.value)} · Bloqueado ${playerLabelFull(
					topPlayers.blocked.player,
					topPlayers.blocked.value
				)} · Sup.+ ${playerLabelFull(topPlayers.sup.player, topPlayers.sup.value)}`
			: "Top: —";

	return (
		<ShotMistakesChartBase
			title="Distribución de fallos de tiro"
			description={`${matchTitle} · ${data.summary.topType?.label ?? "Sin datos"} · Total ${data.summary.total}`}
			summary={data.summary}
			perPlayer={data.perPlayer}
			perMatch={data.perMatch}
			mode="match"
			topLineCompact={topLineCompact}
			topLineFull={topLineFull}
		/>
	);
}
