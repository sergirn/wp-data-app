"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, CircleDot, ChevronRight, Lock } from "lucide-react";
import { MatchStats, Player } from "@/lib/types";
import { GoalkeeperMatchStatsModal } from "../GoalkeeperMatchStatsModal";
import { GOALKEEPER_STATS } from "@/lib/stats/goalkeeperStatsConfig";
import { getGoalkeeperDerived, n } from "@/lib/stats/goalkeeperStatsHelpers";

function hasGoalkeeperStats(stat: Record<string, any> | null | undefined, hiddenStats: string[] = []) {
	if (!stat) return false;

	const hiddenSet = new Set(hiddenStats);

	return GOALKEEPER_STATS.some((def) => {
		if (hiddenSet.has(def.key)) return false;
		return n(stat[def.key]) > 0;
	});
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-xl border bg-muted/30 px-3 py-2">
			<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
				<Icon className="h-3.5 w-3.5" />
				<span>{label}</span>
			</div>
			<p className="mt-1 text-sm font-bold tabular-nums">{value}</p>
		</div>
	);
}

export function GoalkeeperStatsCard({ stat, player, hiddenStats = [] }: { stat: MatchStats; player: Player; hiddenStats?: string[] }) {
	const [open, setOpen] = useState(false);

	const hasStats = hasGoalkeeperStats(stat as Record<string, any>, hiddenStats);
	const derived = getGoalkeeperDerived(stat as Record<string, any>, hiddenStats);

	return (
		<>
			<button
				type="button"
				disabled={!hasStats}
				onClick={() => hasStats && setOpen(true)}
				aria-label={`Ver estadísticas de portero de ${player.name}`}
				className="group w-full text-left disabled:cursor-not-allowed"
			>
				<div
					className={[
						"w-full overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
						hasStats ? "hover:-translate-y-1 hover:shadow-lg" : "opacity-80",
						"focus:outline-none focus:ring-2 focus:ring-primary/30"
					].join(" ")}
				>
					<div className="relative aspect-[4/5] overflow-hidden">
						{player.photo_url ? (
							<img
								src={player.photo_url ?? undefined}
								alt={player.name}
								loading="lazy"
								className={[
									"absolute inset-0 h-full w-full object-cover object-top bg-muted transition-transform duration-300",
									hasStats ? "group-hover:scale-[1.03]" : ""
								].join(" ")}
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

						<div className="absolute left-3 top-3 flex items-center gap-2">
							<Badge
								variant="secondary"
								className="rounded-full border bg-background/85 px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur"
							>
								#{player.number}
							</Badge>
						</div>

						<div className="absolute right-3 top-3">
							{hasStats ? (
								<div className="rounded-full border bg-background/85 p-1.5 shadow-sm backdrop-blur transition-transform duration-200 group-hover:translate-x-0.5">
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								</div>
							) : (
								<div className="rounded-full border bg-background/85 p-1.5 shadow-sm backdrop-blur">
									<Lock className="h-4 w-4 text-muted-foreground" />
								</div>
							)}
						</div>

						<div className="absolute inset-x-0 bottom-0 p-3">
							<div className="rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-sm dark:bg-black/35">
								<h3 className="truncate text-sm font-semibold text-white">{player.name}</h3>
								<p className="mt-0.5 text-[11px] text-white/75">
									#{player.number} · {hasStats ? "Disponible" : "Sin datos registrados"}
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-3 p-3">
						<div className="grid grid-cols-2 gap-2">
							<MiniStat icon={Shield} label="Paradas" value={derived.saves} />
							<MiniStat icon={TrendingUp} label="Eficacia" value={`${derived.savePct}%`} />
						</div>

						<div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2">
							<div className="min-w-0">
								<p className="text-[11px] text-muted-foreground">Resumen</p>
								<p className="truncate text-xs font-medium text-foreground/85">
									{derived.shotsReceived} tiros recibidos · {derived.saves} intervenciones
								</p>
							</div>

							<span className="ml-3 text-[11px] font-semibold text-primary">{hasStats ? "Ver detalle" : "Sin detalle"}</span>
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
					hiddenStats={hiddenStats}
					derived={{
						paradas: derived.saves,
						golesRecibidos: derived.goalsConceded,
						tirosRecibidos: derived.shotsReceived,
						savePercentage: String(derived.savePct),
						lanzRecibidoFuera: hiddenStats.includes("lanz_recibido_fuera") ? 0 : n(stat.lanz_recibido_fuera)
					}}
				/>
			) : null}
		</>
	);
}
