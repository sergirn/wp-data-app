"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Activity, ChevronRight } from "lucide-react";
import { PlayerMatchStatsModal } from "../PlayerMatchStatsModal";
import { MatchStats, Player } from "@/lib/types";
import { getPlayerDerived } from "@/lib/stats/playerStatsHelpers";

function MiniStat({
	icon: Icon,
	label,
	value,
	className = ""
}: {
	icon: React.ElementType;
	label: string;
	value: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`rounded-xl border bg-muted/30 px-3 py-2 ${className}`}>
			<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
				<Icon className="h-3.5 w-3.5" />
				<span>{label}</span>
			</div>
			<p className="mt-1 text-sm font-bold tabular-nums">{value}</p>
		</div>
	);
}

export function PlayerStatsCard({ stat, player, hiddenStats = [] }: { stat: MatchStats; player: Player; hiddenStats?: string[] }) {
	const [open, setOpen] = useState(false);

	const derived = getPlayerDerived(stat as Record<string, any>, hiddenStats);

	return (
		<>
			<button type="button" onClick={() => setOpen(true)} aria-label={`Ver estadísticas de ${player.name}`} className="group w-full text-left">
				<div className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
					<div className="relative aspect-[4/5] overflow-hidden">
						{player.photo_url ? (
							<img
								src={player.photo_url ?? undefined}
								alt={player.name}
								loading="lazy"
								className="absolute inset-0 h-full w-full object-cover object-top bg-muted transition-transform duration-300 group-hover:scale-[1.03]"
							/>
						) : (
							<div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-muted to-muted/60">
								<div className="text-center">
									<div className="text-4xl font-black tracking-tight text-foreground/85">#{player.number}</div>
									<div className="mt-1 text-xs text-muted-foreground">Sin foto</div>
								</div>
							</div>
						)}

						<div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />

						<div className="absolute left-3 top-3">
							<Badge
								variant="secondary"
								className="rounded-full border bg-background/85 px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur"
							>
								#{player.number}
							</Badge>
						</div>

						<div className="absolute right-3 top-3">
							<div className="rounded-full border bg-background/85 p-1.5 shadow-sm backdrop-blur transition-transform duration-200 group-hover:translate-x-0.5">
								<ChevronRight className="h-4 w-4 text-muted-foreground" />
							</div>
						</div>

						<div className="absolute inset-x-0 bottom-0 p-3">
							<div className="rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm dark:bg-black/35">
								<h3 className="truncate text-sm font-semibold text-white">{player.name}</h3>
								<p className="mt-0.5 text-[11px] text-white/75">Jugador de campo</p>
							</div>
						</div>
					</div>

					<div className="space-y-3 p-3">
						<div className="grid grid-cols-2 gap-2">
							<MiniStat icon={Target} label="Goles" value={derived.goals} />
							<MiniStat icon={TrendingUp} label="Efect." value={`${derived.efficiency}%`} />
						</div>

						<div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2">
							<div className="min-w-0">
								<p className="text-[11px] text-muted-foreground">Resumen</p>
								<p className="truncate text-xs font-medium text-foreground/85">
									{derived.shots} tiros · {derived.assists} asist. · {derived.totalFouls} faltas
								</p>
							</div>

							<span className="ml-3 text-[11px] font-semibold text-primary">Ver detalle</span>
						</div>
					</div>
				</div>
			</button>

			<PlayerMatchStatsModal
				open={open}
				onOpenChange={setOpen}
				player={player}
				stat={stat}
				hiddenStats={hiddenStats}
				derived={{
					totalShots: derived.shots,
					shootingEfficiency: String(derived.efficiency),
					superiorityGoals: derived.superiorityGoals,
					superiorityAttempts: derived.superiorityAttempts,
					superiorityEfficiency: String(derived.superiorityEfficiency),
					totalActions: derived.totalActions,
					totalFouls: derived.totalFouls
				}}
			/>
		</>
	);
}
