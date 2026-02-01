"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import logo from "@/public/images/lewaterpolo_bg.png";
import graph from "@/public/images/graphic-def.png";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronRight, X } from "lucide-react";

import { MatchSuperiorityChart } from "@/components/match-components/match-superiority-chart";
import { MatchInferiorityChart } from "@/components/match-components/match-inferiority-chart";
import { MatchBlocksChart } from "@/components/match-blocks-chart";
import { MatchPossessionChart } from "@/components/match-components/perd_rec_pos-chart_team";
import { MatchGoalkeepersPieChart } from "@/components/match-components/GoalkeeperMatch-chart";
import { GoalkeeperShotsGoalChart } from "@/components/analytics-goalkeeper/evolution-component/GoalkeepersShotsEvolutions";

type Props = {
	matchId: number;
	clubName: string;
	opponentName: string;
	matchDateLabel: string;

	// datos para pintar
	match: any;
	matchStats: any[];

	superioridadStats: any;
	inferioridadStats: any;
	blocksStats: any;

	allGoalkeeperShots: any[];
	goalkeeperId: number | null;
};

export function MatchChartsModalTrigger({
	matchId,
	clubName,
	opponentName,
	matchDateLabel,
	match,
	matchStats,
	superioridadStats,
	inferioridadStats,
	blocksStats,
	allGoalkeeperShots,
	goalkeeperId
}: Props) {
	const [open, setOpen] = useState(false);

	// Cierra con ESC
	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open]);

	const subtitle = useMemo(() => `${clubName} vs ${opponentName}`, [clubName, opponentName]);

	// ✅ guard del chart portero para evitar crash
	const canShowGoalkeeperShots = Boolean(goalkeeperId) && (allGoalkeeperShots?.length ?? 0) > 0;

	return (
		<>
			{/* Banner / botón estilo header */}
            <button
            type="button"
            onClick={() => setOpen(true)}
            className="
                group relative w-full overflow-hidden rounded-2xl border p-7 bg-background/60
                hover:bg-muted/20 transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            "
            aria-label="Abrir gráficos del partido"
            >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/10" />

            {/* ✅ Imagen traslúcida a la derecha */}
            <div className="pointer-events-none absolute right-35 top-0 h-full w-[140px] sm:w-[200px]">
                <div className="relative h-full w-full">
                <div className="absolute -right-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-green-500/40 blur-3xl" />
                <Image src={graph} alt="" fill className="object-contain opacity-80 grayscale" />
                {/* Fade hacia la izquierda para que no moleste al texto */}
                <div className="" />
                </div>
            </div>

            {/* ✅ Contenido */}
            <div className="relative flex items-center justify-between gap-3 p-6 sm:p-8">
                {/* Texto a la izquierda */}
                <div className="min-w-0 text-left pr-[120px] sm:pr-[170px]">
                <p className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Estadistica del partido
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    Superioridad · Posesión · Porteros · Mapa de tiros
                </p>
                </div>

                {/* Botoncito a la derecha (pero antes de la imagen, visualmente queda bien) */}
                <div className="shrink-0">
                <div className="inline-flex items-center rounded-xl border bg-background/70 px-3 py-2 text-sm opacity-70 group-hover:opacity-100 transition-opacity">
                    Ver <ChevronRight className="ml-2 h-4 w-4" />
                </div>
                </div>
            </div>
            </button>


			{/* Modal */}
			{open && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />

					<div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
						<div
							className="
                relative w-full max-w-6xl
                rounded-3xl border bg-background
                shadow-2xl overflow-hidden
              "
							role="dialog"
							aria-modal="true"
						>
							{/* Header modal */}
							<div className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
								<div className="min-w-0">
									<p className="text-xs font-semibold text-muted-foreground">Gráficos</p>
									<p className="text-base sm:text-lg font-semibold truncate">
										{clubName} vs {opponentName}
									</p>
									<p className="text-xs text-muted-foreground mt-1 truncate">{matchDateLabel}</p>
								</div>

								<Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setOpen(false)} aria-label="Cerrar">
									<X className="h-5 w-5" />
								</Button>
							</div>

							{/* Body modal */}
							<div className="max-h-[80vh] overflow-y-auto p-4 sm:p-5">
								<div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
									<MatchSuperiorityChart stats={superioridadStats} />
									<MatchInferiorityChart stats={inferioridadStats} />
									<MatchBlocksChart stats={blocksStats} matchStats={matchStats} clubName={clubName} />
									<MatchPossessionChart
										stats={matchStats}
										rival={opponentName}
										matchDateLabel={matchDateLabel}
										size="sm"
									/>

									<div className="sm:col-span-2 lg:col-span-1">
										<MatchGoalkeepersPieChart stats={matchStats} match={match} />
									</div>

									<div className="sm:col-span-2 lg:col-span-3">
										{canShowGoalkeeperShots ? (
											<GoalkeeperShotsGoalChart
												shots={allGoalkeeperShots}
												goalkeeperPlayerId={goalkeeperId!}
												matchId={matchId}
											/>
										) : (
											<div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
												No hay datos suficientes para mostrar el mapa/evolución de tiros del portero.
											</div>
										)}
									</div>
								</div>

								{/* Extra espacio al final para scroll cómodo */}
								<div className="h-2" />
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
