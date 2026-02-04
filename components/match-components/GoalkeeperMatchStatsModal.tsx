"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerHeroHeader } from "@/app/jugadores/[id]/playerHeader";

type Props = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	player: any;
	stat: any;
	derived: {
		paradas: number;
		golesRecibidos: number;
		tirosRecibidos: number;
		savePercentage: string;
		// ✅ NUEVO (si lo pasas desde GoalkeeperStatsCard)
		lanzRecibidoFuera?: number;
	};
};

export function GoalkeeperMatchStatsModal({ open, onOpenChange, player, stat, derived }: Props) {
	const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "—");

	const match = stat?.matches;
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

	const savesItems = [
		{ label: "Parada + Recup", key: "portero_tiros_parada_recup" },
		{ label: "Fuera", key: "portero_paradas_fuera" },

		// ✅ NUEVO
		{ label: "Lanz. recibido fuera", key: "lanz_recibido_fuera" },

		{ label: "Penalti parado", key: "portero_paradas_penalti_parado" },
		{ label: "Hombre -", key: "portero_paradas_hombre_menos" }
	] as const;

	const goalsItems = [
		{ label: "Boya/Parada", key: "portero_goles_boya_parada" },
		{ label: "Hombre -", key: "portero_goles_hombre_menos" },
		{ label: "+6m", key: "portero_goles_dir_mas_5m" },
		{ label: "Contraataque", key: "portero_goles_contraataque" },
		{ label: "Penalti", key: "portero_goles_penalti" }
	] as const;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="
          !w-[calc(100vw-16px)]
          sm:!w-[94vw]
          md:!w-[90vw]
          lg:!w-[86vw]
          xl:!w-[78vw]
          2xl:!w-[70vw]
          !max-w-[1600px]
          p-0 overflow-hidden
        "
			>
				<VisuallyHidden>
					<DialogTitle>{player?.name ?? "Estadísticas del portero"}</DialogTitle>
				</VisuallyHidden>

				{/* Header tipo hero */}
				<div className="p-4">
					<PlayerHeroHeader
						player={{
							name: player?.name ?? "Portero",
							number: player?.number,
							photo_url: player?.photo_url,
							is_goalkeeper: true
						}}
						roleLabel="Portero"
					/>
				</div>

				{/* Body */}
				<div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						<KpiBox label="Paradas" value={derived.paradas} className="bg-blue-500/5 border-blue-500/10" />
						<KpiBox label="GC" value={derived.golesRecibidos} className="bg-white/5 border-blue-500/20" />
						<KpiBox label="Eficiencia" value={`${derived.savePercentage}%`} className="bg-blue-500/5 border-blue-500/10" />
						<KpiBox label="Tiros" value={derived.tirosRecibidos} className="bg-white/5 border-blue-500/20" />
					</div>

					<div className="grid md:grid-cols-2 gap-4">
						<Section title="Paradas por tipo">
							{savesItems.map((it) => (
								<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} />
							))}
						</Section>

						<Section title="Goles encajados por tipo">
							{goalsItems.map((it) => (
								<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} />
							))}
						</Section>
					</div>

					<Card className="bg-muted/20">
						<CardContent className="pt-4">
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
								<KV label="Paradas inf." value={stat?.portero_paradas_hombre_menos ?? 0} />
								<KV label="Pen. parados" value={stat?.portero_paradas_penalti_parado ?? 0} />
								<KV label="Fuera" value={stat?.portero_paradas_fuera ?? 0} />

								{/* ✅ NUEVO (en resumen también) */}
								<KV label="Lanz. fuera" value={stat?.lanz_recibido_fuera ?? 0} />

								{/* Si quieres mantener también Parada+Recup, cambia el grid a md:grid-cols-5 o quita uno */}
								{/* <KV label="Parada+Recup" value={stat?.portero_tiros_parada_recup ?? 0} /> */}
							</div>
						</CardContent>
					</Card>
				</div>
			</DialogContent>
		</Dialog>
	);
}
