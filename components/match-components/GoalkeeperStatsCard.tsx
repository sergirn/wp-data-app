"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp } from "lucide-react";
import { MatchStats, Player } from "@/lib/types";
import { GoalkeeperMatchStatsModal } from "./GoalkeeperMatchStatsModal";
import { GOALKEEPER_STATS } from "@/lib/stats/goalkeeperStatsConfig";
import { getGoalkeeperDerived, n } from "@/lib/stats/goalkeeperStatsHelpers";

function hasGoalkeeperStats(stat: Record<string, any> | null | undefined) {
	if (!stat) return false;

	return GOALKEEPER_STATS.some((def) => n(stat[def.key]) > 0);
}

export function GoalkeeperStatsCard({ stat, player }: { stat: MatchStats; player: Player }) {
	const [open, setOpen] = useState(false);

	const hasStats = hasGoalkeeperStats(stat as Record<string, any>);
	const derived = getGoalkeeperDerived(stat as Record<string, any>);

	return (
		<>
			<button
				type="button"
				disabled={!hasStats}
				onClick={() => hasStats && setOpen(true)}
				className="text-left w-full disabled:opacity-70"
				aria-label={`Ver estadísticas de portero de ${player.name}`}
			>
				<div className="w-full overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30">
					<div className="relative aspect-[4/5] sm:aspect-[3/3] overflow-hidden">
						{player.photo_url ? (
							<img
								src={player.photo_url ?? undefined}
								alt={player.name}
								loading="lazy"
								className="h-full w-full object-cover object-top bg-muted"
							/>
						) : (
							<div className="h-full w-full grid place-items-center bg-muted">
								<div className="text-center">
									<div className="text-2xl font-extrabold text-muted-foreground">#{player.number}</div>
									<div className="mt-0.5 text-[10px] text-muted-foreground">Sin foto</div>
								</div>
							</div>
						)}

						<div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/15 to-transparent dark:from-black/65 dark:via-black/25 dark:to-transparent" />

						<div className="absolute inset-x-0 bottom-0 px-3 pb-2">
							<h3 className="text-sm font-semibold leading-tight truncate text-zinc-900 dark:text-white">{player.name}</h3>
							<p className="text-[11px] text-zinc-700/80 dark:text-white/80">#{player.number} · Portero</p>
						</div>
					</div>

					<div className="p-2.5 sm:p-3">
						<div className="flex items-center gap-2 flex-nowrap overflow-hidden">
							<Badge
								variant="secondary"
								className="inline-flex items-center bg-green-500/10 text-green-700 dark:text-green-300 text-[11px] px-2 py-0.5 whitespace-nowrap"
							>
								<Shield className="w-3 h-3 mr-1 shrink-0" />
								<span className="tabular-nums">{derived.saves}</span>
								<span className="hidden sm:inline">&nbsp;paradas</span>
								<span className="sm:hidden">&nbsp;P</span>
							</Badge>

							<Badge
								variant="secondary"
								className="inline-flex items-center bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] px-2 py-0.5 whitespace-nowrap"
							>
								<TrendingUp className="w-3 h-3 mr-1 shrink-0" />
								<span className="tabular-nums">{derived.savePct}%</span>
							</Badge>

							<Badge
								variant="secondary"
								className="inline-flex items-center bg-red-500/10 text-red-700 dark:text-red-300 text-[11px] px-2 py-0.5 whitespace-nowrap"
							>
								<span className="font-semibold">GC</span>&nbsp;
								<span className="tabular-nums">{derived.goalsConceded}</span>
							</Badge>
						</div>
					</div>
				</div>
			</button>

			{hasStats ? (
				<GoalkeeperMatchStatsModal
					open={open}
					onOpenChange={setOpen}
					player={player}
					stat={stat}
					derived={{
						paradas: derived.saves,
						golesRecibidos: derived.goalsConceded,
						tirosRecibidos: derived.shotsReceived,
						savePercentage: String(derived.savePct),
						lanzRecibidoFuera: n(stat.lanz_recibido_fuera)
					}}
				/>
			) : null}
		</>
	);
}
