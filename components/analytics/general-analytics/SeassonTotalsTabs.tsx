"use client";

import React, { useMemo } from "react";
import { CardContent } from "@/components/ui/card";
import type { MatchStats } from "@/lib/types";

import { getPlayerDerived, getPlayerStatsByCategory, accumulatePlayerStats } from "@/lib/stats/playerStatsHelpers";
import { PLAYER_CATEGORY_TITLES, type PlayerStatCategory } from "@/lib/stats/playerStatsConfig";

import { getGoalkeeperDerived, getGoalkeeperStatsByCategory, accumulateGoalkeeperStats } from "@/lib/stats/goalkeeperStatsHelpers";
import { GOALKEEPER_CATEGORY_TITLES, type GoalkeeperStatCategory } from "@/lib/stats/goalkeeperStatsConfig";

function MiniKpi({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-2xl border bg-background/60 p-3">
			<p className="text-lg font-bold tabular-nums leading-none">{value}</p>
			<p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
		</div>
	);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
			<span className="text-sm text-foreground truncate">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	if (!children) return null;

	return (
		<div className="rounded-2xl border bg-card/40">
			<div className="px-4 py-3 border-b">
				<p className="text-sm font-semibold">{title}</p>
			</div>
			<div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
		</div>
	);
}

function PlayerCategorySection({
	title,
	category,
	stats,
	hiddenStats
}: {
	title: string;
	category: PlayerStatCategory;
	stats: Record<string, any>;
	hiddenStats?: string[] | Set<string>;
}) {
	const defs = getPlayerStatsByCategory(category, hiddenStats);

	if (!defs.length) return null;

	return (
		<Section title={title}>
			{defs.map((def) => (
				<Row key={def.key} label={def.label} value={stats?.[def.key] ?? 0} />
			))}
		</Section>
	);
}

function GoalkeeperCategorySection({
	title,
	category,
	stats,
	hiddenStats
}: {
	title: string;
	category: GoalkeeperStatCategory;
	stats: Record<string, any>;
	hiddenStats?: string[] | Set<string>;
}) {
	const defs = getGoalkeeperStatsByCategory(category, hiddenStats);

	if (!defs.length) return null;

	return (
		<Section title={title}>
			{defs.map((def) => (
				<Row key={def.key} label={def.label} value={stats?.[def.key] ?? 0} />
			))}
		</Section>
	);
}

export function SeasonAttackTotals({ stats, hiddenStats }: { stats: MatchStats[]; hiddenStats?: string[] | Set<string> }) {
	const totals = useMemo(() => accumulatePlayerStats(stats as any[], hiddenStats), [stats, hiddenStats]);
	const derived = useMemo(() => getPlayerDerived(totals, hiddenStats), [totals, hiddenStats]);

	return (
		<div className="bg-transparent shadow-none">
			<CardContent className="p-0 space-y-3">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
					<MiniKpi label="Goles" value={derived.goals} />
					<MiniKpi label="Tiros" value={derived.shots} />
					<MiniKpi label="Efectividad" value={`${derived.efficiency}%`} />
					<MiniKpi label="Asistencias" value={derived.assists} />
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
					<PlayerCategorySection title={PLAYER_CATEGORY_TITLES.goles} category="goles" stats={totals} hiddenStats={hiddenStats} />
					<PlayerCategorySection title={PLAYER_CATEGORY_TITLES.fallos} category="fallos" stats={totals} hiddenStats={hiddenStats} />
					<PlayerCategorySection title={PLAYER_CATEGORY_TITLES.faltas} category="faltas" stats={totals} hiddenStats={hiddenStats} />
					<PlayerCategorySection title={PLAYER_CATEGORY_TITLES.acciones} category="acciones" stats={totals} hiddenStats={hiddenStats} />
				</div>
			</CardContent>
		</div>
	);
}

export function SeasonDefenseTotals({ stats, hiddenStats }: { stats: MatchStats[]; hiddenStats?: string[] | Set<string> }) {
	const totals = useMemo(() => accumulatePlayerStats(stats as any[], hiddenStats), [stats, hiddenStats]);
	const derived = useMemo(() => getPlayerDerived(totals, hiddenStats), [totals, hiddenStats]);

	return (
		<div className="bg-transparent shadow-none">
			<CardContent className="p-0 space-y-3">
				<div className="grid grid-cols-4 lg:grid-cols-4 gap-2">
					<MiniKpi label="Faltas" value={derived.totalFouls} />
					<MiniKpi label="Bloqueos" value={derived.blocks} />
					<MiniKpi label="Recuperaciones" value={derived.recoveries} />
					<MiniKpi label="Rebotes" value={derived.rebounds} />
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
					<PlayerCategorySection title={PLAYER_CATEGORY_TITLES.faltas} category="faltas" stats={totals} hiddenStats={hiddenStats} />
					<PlayerCategorySection title={PLAYER_CATEGORY_TITLES.acciones} category="acciones" stats={totals} hiddenStats={hiddenStats} />
				</div>
			</CardContent>
		</div>
	);
}

export function SeasonGoalkeeperTotals({ stats, hiddenStats }: { stats: MatchStats[]; hiddenStats?: string[] | Set<string> }) {
	const totals = useMemo(() => accumulateGoalkeeperStats(stats as any[], hiddenStats), [stats, hiddenStats]);
	const derived = useMemo(() => getGoalkeeperDerived(totals, hiddenStats), [totals, hiddenStats]);

	return (
		<div className="bg-transparent shadow-none">
			<CardContent className="p-0 space-y-3">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
					<MiniKpi label="Paradas" value={derived.saves} />
					<MiniKpi label="Goles recibidos" value={derived.goalsConceded} />
					<MiniKpi label="Lanz. recibidos" value={derived.shotsReceived} />
					<MiniKpi label="% Paradas" value={`${derived.savePct}%`} />
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
					<GoalkeeperCategorySection title={GOALKEEPER_CATEGORY_TITLES.goles} category="goles" stats={totals} hiddenStats={hiddenStats} />
					<GoalkeeperCategorySection
						title={GOALKEEPER_CATEGORY_TITLES.paradas}
						category="paradas"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection
						title={GOALKEEPER_CATEGORY_TITLES.paradas_penalti}
						category="paradas_penalti"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection
						title={GOALKEEPER_CATEGORY_TITLES.otros_tiros}
						category="otros_tiros"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection
						title={GOALKEEPER_CATEGORY_TITLES.inferioridad}
						category="inferioridad"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection
						title={GOALKEEPER_CATEGORY_TITLES.acciones}
						category="acciones"
						stats={totals}
						hiddenStats={hiddenStats}
					/>
					<GoalkeeperCategorySection title={GOALKEEPER_CATEGORY_TITLES.ataque} category="ataque" stats={totals} hiddenStats={hiddenStats} />
				</div>
			</CardContent>
		</div>
	);
}
