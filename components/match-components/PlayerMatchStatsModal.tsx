"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerHeroHeader } from "@/app/jugadores/[id]/playerHeader";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type Props = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	player: any;
	stat: any;
	derived: {
		totalShots: number;
		shootingEfficiency: string;
		superiorityGoals: number;
		superiorityAttempts: number;
		superiorityEfficiency: string;
		totalActions: number;
		totalFouls: number;
	};
};

export function PlayerMatchStatsModal({ open, onOpenChange, player, stat, derived }: Props) {
	const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "—");

	const match = stat?.matches; // si lo tienes incluido en el stat (MatchStatsWithMatch)
	const opponent = match?.opponent ?? "—";
	const date = formatDate(match?.match_date);
	const score = `${match?.home_score ?? 0} - ${match?.away_score ?? 0}`;

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

	const KV = ({ label, value }: { label: string; value: React.ReactNode }) => (
		<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-semibold tabular-nums">{value}</span>
		</div>
	);

	const goalsItems = [
		{ label: "Boya/Jugada", key: "goles_boya_jugada" },
		{ label: "Gol (H+)", key: "goles_hombre_mas" },
		{ label: "Gol del palo (H+)", key: "gol_del_palo_sup" },
		{ label: "Lanzamiento", key: "goles_lanzamiento" },
		{ label: "+6m", key: "goles_dir_mas_5m" },
		{ label: "Contraataque", key: "goles_contraataque" },
		{ label: "Penalti", key: "goles_penalti_anotado" }
	] as const;

	const missesItems = [
		{ label: " Fallo (H+)", key: "tiros_hombre_mas" },
		{ label: "Penalti", key: "tiros_penalti_fallado" },
		{ label: "Corner", key: "tiros_corner" },
		{ label: "Fuera", key: "tiros_fuera" },
		{ label: "Parados", key: "tiros_parados" },
		{ label: "Bloqueados", key: "tiros_bloqueado" },
		{ label: "Palo", key: "tiro_palo" }
	] as const;

	const foulsItems = [
		{ label: 'Exp 20" 1c1', key: "faltas_exp_20_1c1" },
		{ label: 'Exp 20" Boya', key: "faltas_exp_20_boya" },
		{ label: "Exp Simple", key: "faltas_exp_simple" },
		{ label: "Penalti", key: "faltas_penalti" },
		{ label: "Contrafaltas", key: "faltas_contrafaltas" }
	] as const;

	const actionsItems = [
		{ label: "Asistencias", key: "acciones_asistencias" },
		{ label: "Bloqueos", key: "acciones_bloqueo" },
		{ label: "Recuperaciones", key: "acciones_recuperacion" },
		{ label: "Rebotes", key: "acciones_rebote" },
		{ label: "Exp. Prov.", key: "acciones_exp_provocada" },
		{ label: "Pen. Prov.", key: "acciones_penalti_provocado" },
		{ label: "Gol recibido", key: "acciones_recibir_gol" },
		{ label: "Pase al boya", key: "pase_boya" },
		{ label: "Pase boya fallado", key: "pase_boya_fallado" }
	] as const;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="!w-[55vw] !max-w-none p-0 overflow-hidden">
				<VisuallyHidden>
					<DialogTitle>{player?.name ?? "Estadísticas del jugador"}</DialogTitle>
				</VisuallyHidden>
				<div className="p-4">
					<PlayerHeroHeader
						player={{
							name: player?.name ?? "Jugador",
							number: player?.number,
							photo_url: player?.photo_url,
							is_goalkeeper: player?.is_goalkeeper
						}}
						roleLabel={player?.is_goalkeeper ? "Portero" : "Jugador"}
					/>
				</div>

				{/* Body */}
				<div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
					{/* KPIs */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						<KpiBox label="Goles" value={stat?.goles_totales ?? 0} className="bg-blue-500/5 border-blue-500/10" />
						<KpiBox label="Tiros" value={stat?.tiros_totales ?? 0} className="bg-white/5 border-blue-500/20" />
						<KpiBox label="Eficiencia" value={`${derived.shootingEfficiency}%`} className="bg-blue-500/5 border-blue-500/10" />
						<KpiBox label="Asistencias" value={stat?.acciones_asistencias ?? 0} className="bg-white/5 border-blue-500/20" />
					</div>

					{/* Detalle */}
					<div className="grid md:grid-cols-2 gap-4">
						<Section title="Goles por tipo">
							{goalsItems.map((it) => (
								<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} />
							))}
						</Section>

						<Section title="Tiros fallados">
							{missesItems.map((it) => (
								<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} />
							))}
						</Section>

						<Section title="Faltas">
							{foulsItems.map((it) => (
								<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} />
							))}
						</Section>

						<Section title="Acciones">
							{actionsItems.map((it) => (
								<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} />
							))}
						</Section>
					</div>

					{/* Extra: cajita resumen inferior opcional */}
					<Card className="bg-muted/20">
						<CardContent className="pt-4">
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
								<KV label="Total acciones" value={derived.totalActions} />
								<KV label="Faltas totales" value={derived.totalFouls} />
								<KV label="Sup. goles" value={derived.superiorityGoals} />
								<KV label="Sup. eficiencia" value={`${derived.superiorityEfficiency}%`} />
							</div>
						</CardContent>
					</Card>
				</div>
			</DialogContent>
		</Dialog>
	);
}
