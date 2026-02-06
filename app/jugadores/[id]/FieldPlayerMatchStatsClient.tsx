"use client";

import * as React from "react";
import Link from "next/link";
import type { Player, MatchStats, Match } from "@/lib/types";

import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ✅ IMPORTA EL ACCORDION DE SHADCN (recomendado)
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MatchStatsWithMatch extends MatchStats {
	matches: Match;
}

export function FieldPlayerMatchStatsClient({
	matchStats,
	player
}: {
	matchStats: MatchStatsWithMatch[];
	player: Player;
}) {
	if (!matchStats?.length) {
		return (
			<Card className="mb-6">
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">No hay estadísticas de partidos registradas</p>
				</CardContent>
			</Card>
		);
	}

	const formatDate = (d?: string) =>
		d
			? new Date(d).toLocaleDateString("es-ES", {
					year: "numeric",
					month: "long",
					day: "numeric"
			  })
			: "";

	const KpiBox = ({ label, value, className }: { label: string; value: React.ReactNode; className: string }) => (
		<div className={`rounded-xl p-4 text-center border ${className}`}>
			<p className="text-2xl font-bold tabular-nums">{value}</p>
			<p className="text-xs text-muted-foreground mt-1">{label}</p>
		</div>
	);

	const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
		<div className="space-y-2">
			<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
			<div className="grid grid-cols-2 gap-2">{children}</div>
		</div>
	);

	// ✅ playerId para cargar favoritos desde BBDD
	const playerId: number | undefined = (player as any)?.id ?? (matchStats?.[0] as any)?.player_id ?? undefined;
	const { favSet, toggle } = usePlayerFavorites(playerId);

	// ✅ KV “favoritable” (fila completa clicable) + hover que NO pisa el amarillo
	const KV = ({ label, value, statKey }: { label: string; value: React.ReactNode; statKey: string }) => {
		const isFav = favSet.has(statKey);
		const onToggle = () => toggle(statKey);

		return (
			<div
				role="button"
				tabIndex={0}
				onClick={onToggle}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onToggle();
					}
				}}
				className={[
					"flex items-center justify-between rounded-lg px-3 py-2 border transition-colors select-none",
					"cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
					isFav
						? "bg-yellow-500/20 border-yellow-500/20 hover:bg-yellow-500/25"
						: "bg-muted/50 border-transparent hover:bg-muted/70"
				].join(" ")}
				aria-label={`${label}: ${isFav ? "favorita" : "no favorita"}`}
				title="Pulsa para marcar/desmarcar como favorita"
			>
				<span className="text-sm text-muted-foreground">{label}</span>

				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold tabular-nums">{value}</span>

					{/* Indicador (opcional) que NO dispara doble toggle */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggle();
						}}
						className={[
							"h-7 w-7 grid place-items-center rounded-md text-xs",
							isFav ? "opacity-100" : "opacity-50 hover:opacity-90"
						].join(" ")}
						aria-label={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
						title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
					>
						<span className={isFav ? "opacity-100" : "opacity-30"}>★</span>
					</button>
				</div>
			</div>
		);
	};

	const goalsItems = [
		{ label: "Boya/Jugada", key: "goles_boya_jugada" as const },
		{ label: "Hombre +", key: "goles_hombre_mas" as const },
		{ label: "Lanzamiento", key: "goles_lanzamiento" as const },
		{ label: "+6m", key: "goles_dir_mas_5m" as const },
		{ label: "Contraataque", key: "goles_contraataque" as const },
		{ label: "Penalti", key: "goles_penalti_anotado" as const },
		{ label: "Gol del palo (H+)", key: "gol_del_palo_sup" as const }
	];

	const missesItems = [
		{ label: "Hombre +", key: "tiros_hombre_mas" as const },
		{ label: "Penalti", key: "tiros_penalti_fallado" as const },
		{ label: "Corner", key: "tiros_corner" as const },
		{ label: "Fuera", key: "tiros_fuera" as const },
		{ label: "Parados", key: "tiros_parados" as const },
		{ label: "Bloqueados", key: "tiros_bloqueado" as const },
		{ label: "Tiro al palo", key: "tiro_palo" as const }
	];

	const foulsItems = [
		{ label: 'Exp 20" 1c1', key: "faltas_exp_20_1c1" as const },
		{ label: 'Exp 20" Boya', key: "faltas_exp_20_boya" as const },
		{ label: "Exp Simple", key: "faltas_exp_simple" as const },
		{ label: "Penalti", key: "faltas_penalti" as const },
		{ label: "Contrafaltas", key: "faltas_contrafaltas" as const }
	];

	const actionsItems = [
		{ label: "Bloqueos", key: "acciones_bloqueo" as const },
		{ label: "Recuperaciones", key: "acciones_recuperacion" as const },
		{ label: "Rebotes", key: "acciones_rebote" as const },
		{ label: "Exp. Prov.", key: "acciones_exp_provocada" as const },
		{ label: "Pen. Prov.", key: "acciones_penalti_provocado" as const },
		{ label: "Gol recibido", key: "acciones_recibir_gol" as const },
		{ label: "Pase al boya", key: "pase_boya" as const },
		{ label: "Pase al boya fallado", key: "pase_boya_fallado" as const }
	];

	return (
		<div className="space-y-4 mb-6">
			<div className="space-y-4">
				{matchStats.map((stat) => {
					const match = stat.matches;
					const goles = stat.goles_totales ?? 0;
					const tiros = stat.tiros_totales ?? 0;
					const eficiencia = tiros > 0 ? ((goles / tiros) * 100).toFixed(1) : "0.0";
					const asist = stat.acciones_asistencias ?? 0;

					return (
						<Card key={stat.id} className="overflow-hidden">
							<CardHeader className="pb-3">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div className="min-w-0">
										<CardTitle className="text-base md:text-lg truncate">{match?.opponent ?? "—"}</CardTitle>
										<p className="text-xs md:text-sm text-muted-foreground truncate">{formatDate(match?.match_date)}</p>
									</div>

									<div className="flex items-center justify-between md:justify-end gap-3">
										<span className="text-xl md:text-2xl font-bold tabular-nums">
											{match?.home_score ?? 0} - {match?.away_score ?? 0}
										</span>
										<Button asChild variant="outline" size="sm" className="bg-transparent">
											<Link href={`/partidos/${match?.id}`}>Ver Partido</Link>
										</Button>
									</div>
								</div>
							</CardHeader>

							<CardContent className="space-y-3 sm:space-y-4">
								<div className="grid grid-cols-4 md:grid-cols-4 gap-2 sm:gap-3">
									<KpiBox label="Goles" value={goles} className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400" />
									<KpiBox label="Tiros" value={tiros} className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400" />
									<KpiBox label="Eficiencia" value={`${eficiencia}%`} className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400" />
									<KpiBox label="Asistencias" value={asist} className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400" />
								</div>

								{/* Desktop/Tablet */}
								<div className="hidden sm:block">
									<div className="grid md:grid-cols-2 gap-4">
										<Section title="Goles por tipo">
											{goalsItems.map((it) => (
												<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} statKey={it.key} />
											))}
										</Section>

										<Section title="Tiros fallados">
											{missesItems.map((it) => (
												<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} statKey={it.key} />
											))}
										</Section>

										<Section title="Faltas">
											{foulsItems.map((it) => (
												<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} statKey={it.key} />
											))}
										</Section>

										<Section title="Acciones">
											{actionsItems.map((it) => (
												<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} statKey={it.key} />
											))}
										</Section>
									</div>
								</div>

								{/* Mobile */}
								<div className="sm:hidden">
									<Accordion type="single" collapsible className="w-full">
										<AccordionItem value={`detail-${stat.id}`} className="border rounded-xl overflow-hidden">
											<AccordionTrigger
												className="
													w-full px-3 py-2
													bg-muted/20 hover:bg-muted/30
													text-sm font-semibold
													flex items-center justify-between
													[&>svg]:shrink-0
													[&>svg]:transition-transform
													data-[state=open]:[&>svg]:rotate-180
												"
											>
												<div className="flex w-full items-center justify-between gap-2">
													<span className="inline-flex items-center gap-2">Ver detalle</span>
													<span className="shrink-0 rounded-lg border bg-background/60 px-2.5 py-1 text-xs font-semibold opacity-80">
														Abrir
													</span>
												</div>
											</AccordionTrigger>

											<AccordionContent className="px-3 pb-3 pt-2">
												<div className="grid gap-3">
													<Section title="Goles por tipo">
														{goalsItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} statKey={it.key} />
														))}
													</Section>

													<Section title="Tiros fallados">
														{missesItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} statKey={it.key} />
														))}
													</Section>

													<Section title="Faltas">
														{foulsItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} statKey={it.key} />
														))}
													</Section>

													<Section title="Acciones">
														{actionsItems.map((it) => (
															<KV key={it.key} label={it.label} value={(stat[it.key] ?? 0) as number} statKey={it.key} />
														))}
													</Section>
												</div>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
