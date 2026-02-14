"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerHeroHeader } from "@/app/jugadores/[id]/playerHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	player: any;
	stat: any;
	derived: {
		paradas: number;
		golesRecibidos: number;
		tirosRecibidos: number; // ✅ debe incluir lanz_recibido_fuera + portero_lanz_palo
		savePercentage: string;
		lanzRecibidoFuera?: number;
	};
};

function usePlayerFavorites(playerId?: number, open?: boolean) {
	const [initialKeys, setInitialKeys] = React.useState<string[]>([]);
	const [draftKeys, setDraftKeys] = React.useState<string[]>([]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const favSet = React.useMemo(() => new Set(draftKeys), [draftKeys]);

	const dirty = React.useMemo(() => {
		const a = new Set(initialKeys);
		const b = new Set(draftKeys);
		if (a.size !== b.size) return true;
		for (const k of a) if (!b.has(k)) return true;
		return false;
	}, [initialKeys, draftKeys]);

	const load = React.useCallback(async () => {
		if (!playerId) return;
		setError(null);
		try {
			const res = await fetch(`/api/favorites?playerId=${playerId}`, { cache: "no-store" });
			const json = await res.json();
			const keys = Array.isArray(json.keys) ? json.keys : [];
			setInitialKeys(keys);
			setDraftKeys(keys);
		} catch {
			setInitialKeys([]);
			setDraftKeys([]);
			setError("No se pudieron cargar las favoritas");
		}
	}, [playerId]);

	React.useEffect(() => {
		if (!open || !playerId) return;
		load();
	}, [playerId, open, load]);

	const toggleLocal = (statKey: string) => {
		setDraftKeys((prev) => (prev.includes(statKey) ? prev.filter((k) => k !== statKey) : [...prev, statKey]));
	};

	const discard = () => {
		setError(null);
		setDraftKeys(initialKeys);
	};

	const save = async () => {
		if (!playerId) return;
		setSaving(true);
		setError(null);

		const prev = new Set(initialKeys);
		const next = new Set(draftKeys);

		const toToggle: string[] = [];
		for (const k of prev) if (!next.has(k)) toToggle.push(k);
		for (const k of next) if (!prev.has(k)) toToggle.push(k);

		try {
			for (const statKey of toToggle) {
				const res = await fetch("/api/favorites", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ playerId, statKey })
				});
				if (!res.ok) throw new Error("save_failed");
			}
			setInitialKeys(draftKeys);
		} catch {
			setError("No se pudieron guardar los cambios");
			await load();
		} finally {
			setSaving(false);
		}
	};

	return { favSet, toggleLocal, dirty, save, discard, saving, error };
}

export function GoalkeeperMatchStatsModal({ open, onOpenChange, player, stat, derived }: Props) {
	const playerId: number | undefined = player?.id ?? stat?.player_id;
	const { favSet, toggleLocal, dirty, save, discard, saving, error } = usePlayerFavorites(playerId, open);

	const [confirmOpen, setConfirmOpen] = React.useState(false);

	const requestClose = React.useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			onOpenChange(true);
			return;
		}
		if (dirty && !saving) {
			setConfirmOpen(true);
			return;
		}
		requestClose();
	};

	const confirmCloseWithoutSaving = () => {
		setConfirmOpen(false);
		discard();
		requestClose();
	};

	const confirmSaveAndClose = async () => {
		await save();
		setConfirmOpen(false);
		requestClose();
	};

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
		const onToggle = () => toggleLocal(statKey);

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
					isFav ? "bg-yellow-500/20 border-yellow-500/20 hover:bg-yellow-500/25" : "bg-muted/50 border-transparent hover:bg-muted/70"
				].join(" ")}
				aria-label={`${label}: ${isFav ? "favorita" : "no favorita"}`}
				title="Pulsa para marcar/desmarcar como favorita"
			>
				<span className="text-sm text-muted-foreground">{label}</span>

				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold tabular-nums">{value}</span>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggle();
						}}
						className={["h-7 w-7 grid place-items-center rounded-md text-xs", isFav ? "opacity-100" : "opacity-50 hover:opacity-90"].join(
							" "
						)}
						aria-label={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
						title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
					>
						<span className={isFav ? "opacity-100" : "opacity-30"}>★</span>
					</button>
				</div>
			</div>
		);
	};

	// ✅ Paradas / tiros rivales NO a puerta (incluye portero_lanz_palo como tiro recibido, NO como parada)
	const savesItems = [
		{ label: "Parada + Recup", key: "portero_tiros_parada_recup" },
		{ label: "Fuera", key: "portero_paradas_fuera" },
		{ label: "Lanz. recibido fuera", key: "lanz_recibido_fuera" },
		{ label: "Penalti parado", key: "portero_paradas_penalti_parado" },
		{ label: "Hombre -", key: "portero_paradas_hombre_menos" },
		{ label: "Lanz. al palo", key: "portero_lanz_palo" } // ✅ cuenta como tiro recibido
	] as const;

	// ✅ Goles encajados (incluye gol de palo + gol de lanzamiento)
	const goalsItems = [
		{ label: "Boya/Parada", key: "portero_goles_boya_parada" },
		{ label: "Hombre -", key: "portero_goles_hombre_menos" },
		{ label: "+6m", key: "portero_goles_dir_mas_5m" },
		{ label: "Contraataque", key: "portero_goles_contraataque" },
		{ label: "Penalti", key: "portero_goles_penalti" },
		{ label: "Gol de palo", key: "portero_gol_palo" },
		{ label: "Gol de lanzamiento", key: "portero_goles_lanzamiento" }
	] as const;

	// ✅ Inferioridad (H-)
	const inferioridadItems = [
		{ label: "Goles Hombre -", key: "portero_goles_hombre_menos" },
		{ label: "Paradas Hombre -", key: "portero_paradas_hombre_menos" },
		{ label: "Fuera (H-)", key: "portero_inferioridad_fuera" },
		{ label: "Bloqueo (H-)", key: "portero_inferioridad_bloqueo" }
	] as const;

	// ✅ Acciones
	const accionesItems = [
		{ label: "Asistencias", key: "acciones_asistencias" },
		{ label: "Recuperación", key: "acciones_recuperacion" },
		{ label: "Pérdida posesión", key: "portero_acciones_perdida_pos" },
		{ label: "Expulsión provocada", key: "acciones_exp_provocada" },
		{ label: "Gol", key: "portero_gol" },
		{ label: "Gol superioridad", key: "portero_gol_superioridad" },
		{ label: "Fallo superioridad", key: "portero_fallo_superioridad" }
	] as const;

	// ✅ eficiencia H- (paradas/(paradas+goles))
	const hmGoles = Number(stat?.portero_goles_hombre_menos ?? 0);
	const hmParadas = Number(stat?.portero_paradas_hombre_menos ?? 0);
	const hmTotal = hmGoles + hmParadas;
	const hmEficiencia = hmTotal > 0 ? Math.round((hmParadas / hmTotal) * 100) : 0;

	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
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

					{/* ✅ Barra Guardar/Descartar */}
					{dirty ? (
						<div className="sticky top-0 z-20 px-4 pb-2 bg-background/60 backdrop-blur">
							<div className="rounded-xl border bg-background/80 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
								<div className="text-xs text-muted-foreground">
									Cambios sin guardar {error ? <span className="text-destructive">· {error}</span> : null}
								</div>

								<div className="flex items-center gap-2">
									<Button variant="outline" size="sm" onClick={discard} disabled={saving}>
										Descartar
									</Button>
									<Button size="sm" onClick={save} disabled={saving}>
										{saving ? "Guardando..." : "Guardar cambios"}
									</Button>
								</div>
							</div>
						</div>
					) : (
						<div />
					)}

					<div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
						{/* ✅ KPI: tiros recibidos ya viene calculado incluyendo lanz_recibido_fuera + portero_lanz_palo */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							<KpiBox label="Paradas" value={derived.paradas} className="bg-blue-500/5 border-blue-500/10" />
							<KpiBox label="GC" value={derived.golesRecibidos} className="bg-white/5 border-blue-500/20" />
							<KpiBox label="Eficiencia" value={`${derived.savePercentage}%`} className="bg-blue-500/5 border-blue-500/10" />
							<KpiBox label="Tiros" value={derived.tirosRecibidos} className="bg-white/5 border-blue-500/20" />
						</div>

						{/* ✅ Tabs (Goles / Paradas / Inferioridad / Acciones) */}
						<Tabs defaultValue="goles" className="w-full">
							<TabsList className="grid w-full grid-cols-4 h-auto">
								<TabsTrigger value="goles" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
									Goles
								</TabsTrigger>
								<TabsTrigger value="paradas" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
									Paradas
								</TabsTrigger>
								<TabsTrigger value="inferioridad" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
									<span className="sm:hidden block truncate">Inf.</span>
									<span className="hidden sm:inline block truncate">Inferioridad</span>
								</TabsTrigger>
								<TabsTrigger value="acciones" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
									Acciones
								</TabsTrigger>
							</TabsList>

							<TabsContent value="goles" className="space-y-3 mt-4">
								<Section title="Goles encajados por tipo">
									{goalsItems.map((it) => (
										<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
									))}
								</Section>
							</TabsContent>

							<TabsContent value="paradas" className="space-y-3 mt-4">
								<Section title="Paradas / tiros por tipo">
									{savesItems.map((it) => (
										<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
									))}
								</Section>
							</TabsContent>

							<TabsContent value="inferioridad" className="space-y-3 mt-4">
								<Section title="Inferioridad (H-)">
									{inferioridadItems.map((it) => (
										<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
									))}
								</Section>

								<div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
									Eficiencia H-: <span className="font-semibold text-foreground tabular-nums">{hmEficiencia}%</span>
								</div>
							</TabsContent>

							<TabsContent value="acciones" className="space-y-3 mt-4">
								<Section title="Acciones">
									{accionesItems.map((it) => (
										<KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
									))}
								</Section>
							</TabsContent>
						</Tabs>

						{/* ✅ Resumen compacto (mantengo tu card) */}
						<Card className="bg-muted/20">
							<CardContent className="pt-4">
								<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

			{/* ✅ Confirm modal */}
			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent className="sm:max-w-[480px]">
					<DialogTitle>¿Salir sin guardar?</DialogTitle>

					<div className="text-sm text-muted-foreground">Tienes cambios sin guardar en favoritas. ¿Qué quieres hacer?</div>

					<div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
						<Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
							Seguir editando
						</Button>

						<Button variant="destructive" onClick={confirmCloseWithoutSaving} disabled={saving}>
							Salir sin guardar
						</Button>

						<Button onClick={confirmSaveAndClose} disabled={saving}>
							{saving ? "Guardando..." : "Guardar y salir"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
