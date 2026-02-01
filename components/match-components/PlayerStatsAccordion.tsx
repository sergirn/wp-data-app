"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Activity } from "lucide-react";
import { PlayerMatchStatsModal } from "./PlayerMatchStatsModal";
import { MatchStats, Player } from "@/lib/types";

export function PlayerStatsCard({ stat, player }: { stat: MatchStats; player: Player }) {
  const [open, setOpen] = useState(false);

  const totalShots = stat.goles_totales + stat.tiros_totales;
  const shootingEfficiency = totalShots > 0 ? ((stat.goles_totales / totalShots) * 100).toFixed(1) : "0.0";

  const superiorityGoals = (stat.goles_hombre_mas || 0) + (stat.gol_del_palo_sup || 0);
  const superiorityAttempts = superiorityGoals + (stat.tiros_hombre_mas || 0);
  const superiorityEfficiency = superiorityAttempts > 0 ? ((superiorityGoals / superiorityAttempts) * 100).toFixed(1) : "0.0";

  const totalActions =
    (stat.acciones_asistencias || 0) +
    (stat.acciones_bloqueo || 0) +
    (stat.acciones_recuperacion || 0) +
    (stat.acciones_rebote || 0);

  const totalFouls =
    (stat.faltas_exp_20_1c1 || 0) +
    (stat.faltas_exp_20_boya || 0) +
    (stat.faltas_exp_simple || 0) +
    (stat.faltas_penalti || 0) +
    (stat.faltas_contrafaltas || 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left w-full"
        aria-label={`Ver estadísticas de ${player.name}`}
      >
        <div className="w-full overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30">
          {/* ✅ Más “cuadrada” en móvil: ratio controlado */}
          <div className="relative aspect-[4/5] sm:aspect-[3/3] overflow-hidden">
            {player.photo_url ? (
              <img
                src={player.photo_url ?? undefined}
                alt={player.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover object-top bg-muted"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-muted">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-muted-foreground">#{player.number}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">Sin foto</div>
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/15 to-transparent dark:from-black/65 dark:via-black/25 dark:to-transparent" />

            <div className="absolute inset-x-0 bottom-0 px-3 pb-2">
              <h3 className="text-sm font-semibold leading-tight truncate text-zinc-900 dark:text-white">
                {player.name}
              </h3>
              <p className="text-[11px] text-zinc-700/80 dark:text-white/80">
                #{player.number} · Jugador
              </p>
            </div>
          </div>

          {/* ✅ Menos alto en móvil: padding y badges más compactos */}
          <div className="p-2.5 sm:p-3">
			<div className="flex items-center gap-2 flex-nowrap overflow-hidden">
				<Badge
				variant="secondary"
				className="bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] px-2 py-0.5 whitespace-nowrap"
				>
				<Target className="w-3 h-3 mr-1 shrink-0" />
				<span className="tabular-nums">{stat.goles_totales}</span>
				</Badge>

				<Badge
				variant="secondary"
				className="bg-green-500/10 text-green-700 dark:text-green-300 text-[11px] px-2 py-0.5 whitespace-nowrap"
				>
				<TrendingUp className="w-3 h-3 mr-1 shrink-0" />
				<span className="tabular-nums">{shootingEfficiency}%</span>
				</Badge>

				<Badge
				variant="secondary"
				className="bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] px-2 py-0.5 whitespace-nowrap"
				>
				<Activity className="w-3 h-3 mr-1 shrink-0" />
				<span className="tabular-nums">{totalActions}</span>
				</Badge>
			</div>
			</div>
        </div>
      </button>

      <PlayerMatchStatsModal
        open={open}
        onOpenChange={setOpen}
        player={player}
        stat={stat}
        derived={{
          totalShots,
          shootingEfficiency,
          superiorityGoals,
          superiorityAttempts,
          superiorityEfficiency,
          totalActions,
          totalFouls
        }}
      />
    </>
  );
}
