"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp } from "lucide-react";
import { MatchStats, Player } from "@/lib/types";
import { GoalkeeperMatchStatsModal } from "./GoalkeeperMatchStatsModal";

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function GoalkeeperStatsCard({ stat, player }: { stat: MatchStats; player: Player }) {
	const [open, setOpen] = useState(false);

	// ✅ includes: gol_palo, goles_lanzamiento, lanz al palo, inferioridad, acciones
	const hasStats =
		n(stat.portero_paradas_totales) > 0 ||
		n(stat.portero_tiros_parada_recup) > 0 ||
		n(stat.portero_paradas_fuera) > 0 ||
		n(stat.portero_paradas_penalti_parado) > 0 ||
		n(stat.portero_paradas_hombre_menos) > 0 ||
		n(stat.lanz_recibido_fuera) > 0 ||
		n(stat.portero_lanz_palo) > 0 ||
		n(stat.portero_goles_boya_parada) > 0 ||
		n(stat.portero_goles_hombre_menos) > 0 ||
		n(stat.portero_goles_dir_mas_5m) > 0 ||
		n(stat.portero_goles_contraataque) > 0 ||
		n(stat.portero_goles_penalti) > 0 ||
		n(stat.portero_goles_lanzamiento) > 0 ||
		n(stat.portero_gol_palo) > 0 ||
		n(stat.portero_inferioridad_fuera) > 0 ||
		n(stat.portero_inferioridad_bloqueo) > 0 ||
		n(stat.acciones_asistencias) > 0 ||
		n(stat.acciones_recuperacion) > 0 ||
		n(stat.portero_acciones_perdida_pos) > 0 ||
		n(stat.acciones_exp_provocada) > 0 ||
		n(stat.portero_gol) > 0 ||
		n(stat.portero_gol_superioridad) > 0 ||
		n(stat.portero_fallo_superioridad) > 0;

	// ✅ Paradas: NO usamos portero_paradas_totales para el KPI si quieres que "tiros" incluya todo lo registrado.
	// Paradas reales = suma de tipos de parada (incluye H-)
	const paradas =
		n(stat.portero_tiros_parada_recup) +
		n(stat.portero_paradas_fuera) +
		n(stat.portero_paradas_penalti_parado) +
		n(stat.portero_paradas_hombre_menos);

	// ✅ tiros recibidos adicionales (NO cuentan como paradas)
	const lanzRecibidoFuera = n(stat.lanz_recibido_fuera);
	const lanzRecibidoPalo = n(stat.portero_lanz_palo);

	// ✅ inferioridad: fuera y bloqueo cuentan como TIRO recibido (pero NO como parada)
	const hmFuera = n(stat.portero_inferioridad_fuera);
	const hmBloqueo = n(stat.portero_inferioridad_bloqueo);

	// ✅ goles recibidos (incluye gol_palo y goles_lanzamiento)
	// Nota: portero_goles_hombre_menos ya contabiliza los goles en H-
	const golesRecibidos =
		n(stat.portero_goles_boya_parada) +
		n(stat.portero_goles_hombre_menos) +
		n(stat.portero_goles_dir_mas_5m) +
		n(stat.portero_goles_contraataque) +
		n(stat.portero_goles_penalti) +
		n(stat.portero_goles_lanzamiento) +
		n(stat.portero_gol_palo);

	// ✅ tiros recibidos totales = TODO intento del rival:
	// paradas + goles + fuera + palo + (H- fuera/bloqueo)
	const tirosRecibidos = paradas + golesRecibidos + lanzRecibidoFuera + lanzRecibidoPalo + hmFuera + hmBloqueo;

	// ✅ eficiencia (paradas/tiros recibidos)
	const savePercentage = tirosRecibidos > 0 ? ((paradas / tirosRecibidos) * 100).toFixed(1) : "0.0";

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
								<span className="tabular-nums">{paradas}</span>
								<span className="hidden sm:inline">&nbsp;paradas</span>
								<span className="sm:hidden">&nbsp;P</span>
							</Badge>

							<Badge
								variant="secondary"
								className="inline-flex items-center bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] px-2 py-0.5 whitespace-nowrap"
							>
								<TrendingUp className="w-3 h-3 mr-1 shrink-0" />
								<span className="tabular-nums">{savePercentage}%</span>
							</Badge>

							<Badge
								variant="secondary"
								className="inline-flex items-center bg-red-500/10 text-red-700 dark:text-red-300 text-[11px] px-2 py-0.5 whitespace-nowrap"
							>
								<span className="font-semibold">GC</span>&nbsp;
								<span className="tabular-nums">{golesRecibidos}</span>
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
						paradas,
						golesRecibidos,
						tirosRecibidos,
						savePercentage,
						lanzRecibidoFuera
					}}
				/>
			) : null}
		</>
	);
}
