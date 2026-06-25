"use client";

import { useMemo } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buildBlocksChartData } from "@/lib/helpers/chartHelpers";
import { MatchConversionChartTemplate } from "./templates/charts/MatchConversionChartTemplate";

type BlocksStats = {
	bloqueos: number;
	golesRecibidos: number;
	eficacia: number;
};

type MatchStatRow = {
	id?: number;
	acciones_bloqueo?: number | null;
	players: {
		id: number;
		name: string;
		number?: number | null;
		photo_url?: string | null;
	};
};

function Row({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"flex items-center justify-between gap-3",
				"rounded-xl px-3 py-2 border transition-colors",
				subtle ? "bg-muted/30 border-transparent" : "bg-card/40 border-border/60"
			].join(" ")}
		>
			<span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);
}

export function MatchBlocksChart({ stats, matchStats, clubName = "Equipo" }: { stats: BlocksStats; matchStats: MatchStatRow[]; clubName?: string }) {
	const computed = useMemo(() => buildBlocksChartData(stats, matchStats), [stats, matchStats]);

	if (!stats) return null;

	return (
		<MatchConversionChartTemplate
			title="Bloqueos"
			description={`${computed.ok}/${computed.total} · ${computed.efficiency}% · Jug ${computed.playersCount}`}
			icon={<Shield className="h-5 w-5" />}
			data={{
				scored: computed.ok,
				missed: computed.bad,
				attempts: computed.total,
				efficiency: computed.efficiency
			}}
			scoredLabel="Bloqueos"
			missedLabel="Goles"
			insightGood="Buen rendimiento defensivo: alto porcentaje de bloqueos."
			insightBad="Rendimiento defensivo mejorable: revisa oposición al tiro."
			rightHeader={<span className="text-xs text-muted-foreground tabular-nums">{computed.efficiency}%</span>}
			renderExtraChartSummary={
				computed.top3.length > 0 ? (
					<div className="rounded-2xl border bg-card/40 p-3">
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs font-semibold text-muted-foreground">Top bloqueador</p>
							<Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
								top {Math.min(1, computed.playersCount)}
							</Badge>
						</div>

						<div className="mt-2 space-y-2">
							{computed.top3.map((s: any, idx: number) => {
								const p = s.players;
								const blocks = s.acciones_bloqueo ?? 0;

								return (
									<div
										key={s.id ?? p.id}
										className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-3 py-2"
									>
										<div className="min-w-0">
											<p className="text-sm font-semibold truncate">
												{idx + 1}. {p.number != null ? `#${p.number} · ` : ""}
												{p.name}
											</p>
											<p className="text-xs text-muted-foreground truncate">{clubName}</p>
										</div>

										<Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
											<Shield className="h-3 w-3 mr-1" />
											{blocks}
										</Badge>
									</div>
								);
							})}
						</div>
					</div>
				) : (
					<div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">No hay bloqueos registrados por jugador.</div>
				)
			}
			renderExtraTableSummary={
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<Row label="Jugadores con bloqueos" value={computed.playersCount} subtle />
					</div>

					<div className="rounded-2xl border bg-background/50 overflow-hidden">
						<div className="px-4 py-3 border-b bg-muted/20">
							<p className="text-sm font-semibold">Ranking de bloqueos</p>
							<p className="text-xs text-muted-foreground">Ordenado de mayor a menor</p>
						</div>

						<div className="p-3">
							{computed.playersWithBlocks.length > 0 ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{computed.playersWithBlocks.map((stat: any, idx: number) => {
										const player = stat.players;
										const blocks = stat.acciones_bloqueo ?? 0;

										return (
											<div
												key={stat.id ?? player.id}
												className="flex items-center justify-between gap-3 rounded-xl border bg-card/40 px-3 py-2"
											>
												<div className="flex items-center gap-3 min-w-0">
													<div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
														{player.photo_url ? (
															<img
																src={player.photo_url}
																alt={player.name}
																className="w-full h-full object-cover object-top"
																loading="lazy"
																onError={(e) => {
																	(e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
																}}
															/>
														) : (
															<span className="text-xs font-bold tabular-nums">{player.number ?? "—"}</span>
														)}
													</div>

													<div className="min-w-0">
														<p className="text-sm font-semibold truncate">
															{idx + 1}. {player.number != null ? `#${player.number} · ` : ""}
															{player.name}
														</p>
														<p className="text-xs text-muted-foreground truncate">{clubName}</p>
													</div>
												</div>

												<Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums shrink-0">
													<Shield className="h-3 w-3 mr-1" />
													{blocks}
												</Badge>
											</div>
										);
									})}
								</div>
							) : (
								<div className="text-center py-10">
									<Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
									<p className="text-sm text-muted-foreground">No hay bloqueos registrados en este partido</p>
								</div>
							)}
						</div>
					</div>
				</div>
			}
		/>
	);
}
