"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
		lanzRecibidoFuera?: number;
	};
};

function usePlayerFavorites(playerId?: number, open?: boolean) {
	const [keys, setKeys] = React.useState<string[]>([]);
	const favSet = React.useMemo(() => new Set(keys), [keys]);

	React.useEffect(() => {
		if (!open || !playerId) return;

		(async () => {
			const res = await fetch(`/api/favorites?playerId=${playerId}`);
			const json = await res.json();
			setKeys(Array.isArray(json.keys) ? json.keys : []);
		})();
	}, [playerId, open]);

	const toggle = async (statKey: string) => {
		if (!playerId) return;

		// optimistic
		setKeys((prev) => (prev.includes(statKey) ? prev.filter((k) => k !== statKey) : [...prev, statKey]));

		const res = await fetch("/api/favorites", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ playerId, statKey })
		});

		// si falla, recarga
		if (!res.ok) {
			const reload = await fetch(`/api/favorites?playerId=${playerId}`);
			const json = await reload.json();
			setKeys(Array.isArray(json.keys) ? json.keys : []);
		}
	};

	return { favSet, toggle };
}

export function GoalkeeperMatchStatsModal({ open, onOpenChange, player, stat, derived }: Props) {
	const playerId: number | undefined = player?.id ?? stat?.player_id;
	const { favSet, toggle } = usePlayerFavorites(playerId, open);

	const formatDate = (d?: string) =>
		d ? new Date(d).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "—";

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

					{/* Indicador/botón opcional */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation(); // evita doble toggle al clicar el botón
							onToggle();
						}}
						className={[
							"h-7 w-7 grid place-items-center rounded-md text-xs",
							isFav ? "opacity-100" : "opacity-50 hover:opacity-90"
						].join(" ")}
						aria-label={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
						title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
					>
						★
					</button>
				</div>
			</div>
		);
	};

	const savesItems = [
		{ label: "Parada + Recup", key: "portero_tiros_parada_recup" },
		{ label: "Fuera", key: "portero_paradas_fuera" },
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
								<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
							))}
						</Section>

						<Section title="Goles encajados por tipo">
							{goalsItems.map((it) => (
								<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
							))}
						</Section>
					</div>

					<Card className="bg-muted/20">
						<CardContent className="pt-4">
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
								{/* Si quisieras también hacer favoritos aquí, podrías asignar statKey a cada uno.
                    Por ahora lo dejo como resumen sin toggle. */}
								<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
									<span className="text-sm text-muted-foreground">Paradas inf.</span>
									<span className="text-sm font-semibold tabular-nums">{stat?.portero_paradas_hombre_menos ?? 0}</span>
								</div>
								<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
									<span className="text-sm text-muted-foreground">Pen. parados</span>
									<span className="text-sm font-semibold tabular-nums">{stat?.portero_paradas_penalti_parado ?? 0}</span>
								</div>
								<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
									<span className="text-sm text-muted-foreground">Fuera</span>
									<span className="text-sm font-semibold tabular-nums">{stat?.portero_paradas_fuera ?? 0}</span>
								</div>
								<div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
									<span className="text-sm text-muted-foreground">Lanz. fuera</span>
									<span className="text-sm font-semibold tabular-nums">{stat?.lanz_recibido_fuera ?? 0}</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</DialogContent>
		</Dialog>
	);
}
