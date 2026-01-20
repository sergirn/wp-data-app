"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Percent, Target, Flame, ChevronLeft, ChevronRight, ListFilter, Users, Eye } from "lucide-react";

/** ====== TIPOS ENTRADA (CRUDO) ====== */
export type GoalkeeperShotRow = {
	id: number;
	match_id: number;
	goalkeeper_player_id: number;
	shot_index?: number;
	result: "goal" | "save" | string;
	x: number;
	y: number;
	created_at?: string;
};

export type MatchLite = {
	id: number;
	jornada?: number | null;
	match_date?: string | null;
};

export type PlayerLite = {
	id: number;
	full_name?: string | null;
	name?: string | null;
	is_goalkeeper?: boolean;
};

/** ====== TIPO INTERNO PARA EL CHART ====== */
type Shot = {
	id: string;
	x: number;
	y: number;
	result: "goal" | "save";
	jornadaNumber?: number;
	goalkeeperPlayerId: string;
	goalkeeperName: string;
};

function Dot({ x, y, result }: { x: number; y: number; result: "goal" | "save" }) {
	return (
		<div
			className={cn(
				"absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
				"h-3 w-3 sm:h-3.5 sm:w-3.5",
				"shadow-sm ring-2 ring-background/70",
				result === "goal" ? "bg-red-500/90 ring-red-900/10" : "bg-emerald-500/90 ring-emerald-900/10"
			)}
			style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
			title={result === "goal" ? "Gol" : "Parada"}
		/>
	);
}

type CellStats = { total: number; saves: number; goals: number; savePct: number };

function cellIndex3(x: number, y: number) {
	const cx = Math.min(2, Math.max(0, Math.floor(x * 3)));
	const cy = Math.min(2, Math.max(0, Math.floor(y * 3)));
	return { cx, cy, key: `${cx}-${cy}` };
}

// 0–29 rojo, 30–49 ámbar, 50+ verde
function pctTier(pct: number) {
	if (pct < 30) return "low";
	if (pct < 50) return "mid";
	return "high";
}

function cellBgClass(pct: number) {
	const t = pctTier(pct);
	if (t === "low") return "bg-red-500/12";
	if (t === "mid") return "bg-amber-500/12";
	return "bg-emerald-500/12";
}

function pctBadgeClass(pct: number) {
	const t = pctTier(pct);
	if (t === "low") return "!bg-red-600 !border-red-700 text-white";
	if (t === "mid") return "!bg-amber-500 !border-amber-600 text-white";
	return "!bg-emerald-600 !border-emerald-700 text-white";
}

/** ====== HEATMAP (canvas tipo sports) ====== */
function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

function clamp(v: number, min = 0, max = 1) {
	return Math.max(min, Math.min(max, v));
}

// Paleta: azul -> verde -> amarillo -> rojo
function heatColor(t: number) {
	const stops = [
		{ p: 0.0, c: [0, 80, 255] }, // azul
		{ p: 0.35, c: [0, 200, 120] }, // verde
		{ p: 0.65, c: [255, 210, 0] }, // amarillo
		{ p: 1.0, c: [255, 60, 60] } // rojo
	];

	let a = stops[0];
	let b = stops[stops.length - 1];

	for (let i = 0; i < stops.length - 1; i++) {
		if (t >= stops[i].p && t <= stops[i + 1].p) {
			a = stops[i];
			b = stops[i + 1];
			break;
		}
	}

	const localT = (t - a.p) / (b.p - a.p || 1);
	const r = Math.round(lerp(a.c[0], b.c[0], localT));
	const g = Math.round(lerp(a.c[1], b.c[1], localT));
	const bl = Math.round(lerp(a.c[2], b.c[2], localT));
	return [r, g, bl] as const;
}

function HeatmapCanvas({
	points,
	enabled,
	opacity = 0.75,
	radiusPx = 42
}: {
	points: Array<{ x: number; y: number }>;
	enabled: boolean;
	opacity?: number;
	radiusPx?: number;
}) {
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const wrapperRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (!enabled) return;
		if (!wrapperRef.current || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const wrap = wrapperRef.current;

		const draw = () => {
			const rect = wrap.getBoundingClientRect();
			const w = Math.max(1, Math.floor(rect.width));
			const h = Math.max(1, Math.floor(rect.height));

			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			// 1) Intensidad acumulada (alpha)
			ctx.globalCompositeOperation = "source-over";
			for (const p of points) {
				const px = p.x * w;
				const py = p.y * h;

				const r = radiusPx;
				const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
				grad.addColorStop(0, "rgba(255,255,255,0.60)");
				grad.addColorStop(1, "rgba(255,255,255,0.0)");
				ctx.fillStyle = grad;
				ctx.fillRect(px - r, py - r, r * 2, r * 2);
			}

			// 2) Colorización por intensidad
			const img = ctx.getImageData(0, 0, w, h);
			const data = img.data;

			let maxA = 0;
			for (let i = 3; i < data.length; i += 4) maxA = Math.max(maxA, data[i]);
			if (maxA === 0) {
				ctx.putImageData(img, 0, 0);
				return;
			}

			for (let i = 0; i < data.length; i += 4) {
				const a = data[i + 3];
				const t = clamp(a / maxA);

				if (t <= 0) {
					data[i + 3] = 0;
					continue;
				}

				const [r, g, b] = heatColor(t);
				data[i] = r;
				data[i + 1] = g;
				data[i + 2] = b;
				data[i + 3] = Math.round(lerp(0, 255, t) * opacity);
			}

			ctx.putImageData(img, 0, 0);
		};

		draw();

		const ro = new ResizeObserver(() => draw());
		ro.observe(wrap);

		return () => ro.disconnect();
	}, [enabled, points, opacity, radiusPx]);

	return (
		<div ref={wrapperRef} className="absolute inset-0 pointer-events-none">
			<canvas ref={canvasRef} className={cn("absolute inset-0", !enabled && "hidden")} />
		</div>
	);
}

/** ====== UI PIEZAS SIDEBAR ====== */
function SidebarSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
	return (
		<div className="rounded-xl border bg-background/40 p-3">
			<div className="mb-2 flex items-center gap-2">
				<div className="inline-flex h-7 w-7 items-center justify-center rounded-lg border bg-background">
					{icon ?? <div className="h-3.5 w-3.5" />}
				</div>
				<div className="text-sm font-semibold leading-none">{title}</div>
			</div>
			{children}
		</div>
	);
}

function ToggleRow({
	label,
	description,
	active,
	onClick,
	disabled,
	icon
}: {
	label: string;
	description?: string;
	active: boolean;
	onClick: () => void;
	disabled?: boolean;
	icon?: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"w-full rounded-lg border px-3 py-2 text-left transition-colors",
				"hover:bg-muted/40",
				active ? "bg-foreground text-background border-foreground/30" : "bg-background",
				disabled && "opacity-50 cursor-not-allowed"
			)}
			title={disabled ? "Activa la cuadrícula para usar esta opción" : undefined}
		>
			<div className="flex items-start gap-2">
				<span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center">{icon}</span>
				<div className="min-w-0">
					<div className="text-sm font-medium leading-tight">{label}</div>
					{description ? <div className={cn("text-xs", active ? "text-background/80" : "text-muted-foreground")}>{description}</div> : null}
				</div>
			</div>
		</button>
	);
}

export function GoalkeeperShotsGoalChart({
	rows,
	matches,
	players,
	className
}: {
	rows: GoalkeeperShotRow[];
	matches: MatchLite[];
	players: PlayerLite[];
	className?: string;
}) {
	/** ====== MAPEOS ====== */
	const matchesById = React.useMemo(() => {
		const m = new Map<number, MatchLite>();
		(matches || []).forEach((x) => m.set(x.id, x));
		return m;
	}, [matches]);

	const playersById = React.useMemo(() => {
		const m = new Map<number, PlayerLite>();
		(players || []).forEach((p) => m.set(p.id, p));
		return m;
	}, [players]);

	/** ====== SHOTS INTERNOS ====== */
	const shots: Shot[] = React.useMemo(() => {
		return (rows || [])
			.map((r) => {
				const match = matchesById.get(r.match_id);
				const p = playersById.get(r.goalkeeper_player_id);
				const name = (p?.full_name || p?.name || `Portero ${r.goalkeeper_player_id}`).toString();

				const res = String(r.result ?? "")
					.trim()
					.toLowerCase();
				const result: "goal" | "save" | null = res === "goal" ? "goal" : res === "save" ? "save" : null;
				if (!result) return null;

				return {
					id: `${r.match_id}-${r.goalkeeper_player_id}-${r.id}`, // ✅ único SIEMPRE
					x: r.x,
					y: r.y,
					result,
					jornadaNumber: match?.jornada ?? undefined,
					goalkeeperPlayerId: String(r.goalkeeper_player_id),
					goalkeeperName: name
				} satisfies Shot;
			})
			.filter(Boolean) as Shot[];
	}, [rows, matchesById, playersById]);

	/** ====== UI STATE ====== */
	const [showGrid, setShowGrid] = React.useState(true);
	const [showCellPct, setShowCellPct] = React.useState(false);
	const [showHeatmap, setShowHeatmap] = React.useState(false);
	const [selectedJornada, setSelectedJornada] = React.useState<number | null>(null);

	/** ====== JORNADAS ====== */
	const jornadas = React.useMemo(() => {
		const set = new Set<number>();
		for (const s of shots) if (typeof s.jornadaNumber === "number") set.add(s.jornadaNumber);
		return Array.from(set).sort((a, b) => a - b);
	}, [shots]);

	const jornadaEnabled = jornadas.length > 0;

	React.useEffect(() => {
		if (!jornadaEnabled) {
			setSelectedJornada(null);
			return;
		}
		if (selectedJornada != null && !jornadas.includes(selectedJornada)) {
			setSelectedJornada(jornadas[jornadas.length - 1] ?? null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [jornadaEnabled, jornadas.join("|")]);

	/** ====== PORTEROS ====== */
	const goalkeepers = React.useMemo(() => {
		const map = new Map<string, { id: string; name: string }>();
		for (const s of shots) {
			const id = s.goalkeeperPlayerId;
			if (!map.has(id)) map.set(id, { id, name: s.goalkeeperName });
		}
		return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
	}, [shots]);

	const goalkeeperFilterEnabled = goalkeepers.length > 0;
	const [selectedGoalkeepers, setSelectedGoalkeepers] = React.useState<Set<string>>(new Set());

	React.useEffect(() => {
		if (!goalkeeperFilterEnabled) {
			setSelectedGoalkeepers(new Set());
			return;
		}
		setSelectedGoalkeepers((prev) => {
			const next = new Set(prev);
			if (next.size === 0) {
				for (const gk of goalkeepers) next.add(gk.id);
				return next;
			}
			for (const id of Array.from(next)) {
				if (!goalkeepers.some((g) => g.id === id)) next.delete(id);
			}
			if (next.size === 0) for (const gk of goalkeepers) next.add(gk.id);
			return next;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [goalkeeperFilterEnabled, goalkeepers.map((g) => g.id).join("|")]);

	/** ====== DEPENDENCIAS ====== */
	React.useEffect(() => {
		if (!showGrid) {
			setShowCellPct(false);
			setShowHeatmap(false);
		}
	}, [showGrid]);

	/** ====== FILTRO FINAL ====== */
	const filteredShots = React.useMemo(() => {
		let out = shots;

		if (jornadaEnabled && selectedJornada != null) out = out.filter((s) => s.jornadaNumber === selectedJornada);
		if (goalkeeperFilterEnabled) out = out.filter((s) => selectedGoalkeepers.has(s.goalkeeperPlayerId));

		return out;
	}, [shots, jornadaEnabled, selectedJornada, goalkeeperFilterEnabled, selectedGoalkeepers]);

	/** ====== STATS ====== */
	const totals = React.useMemo(() => {
		const goals = filteredShots.filter((s) => s.result === "goal").length;
		const saves = filteredShots.filter((s) => s.result === "save").length;
		return { total: filteredShots.length, goals, saves };
	}, [filteredShots]);

	const cellStats = React.useMemo(() => {
		const map = new Map<string, CellStats>();
		for (const s of filteredShots) {
			const { key } = cellIndex3(s.x, s.y);
			const prev = map.get(key) ?? { total: 0, saves: 0, goals: 0, savePct: 0 };

			const total = prev.total + 1;
			const saves = prev.saves + (s.result === "save" ? 1 : 0);
			const goals = prev.goals + (s.result === "goal" ? 1 : 0);
			const savePct = total > 0 ? Math.round((saves / total) * 100) : 0;

			map.set(key, { total, saves, goals, savePct });
		}
		return map;
	}, [filteredShots]);

	/** ====== NAV JORNADA ====== */
	const selectedIndex = React.useMemo(() => {
		if (!jornadaEnabled || selectedJornada == null) return -1;
		return jornadas.indexOf(selectedJornada);
	}, [jornadaEnabled, jornadas, selectedJornada]);

	const canPrev = jornadaEnabled && selectedIndex > 0;
	const canNext = jornadaEnabled && selectedIndex >= 0 && selectedIndex < jornadas.length - 1;

	const goPrev = () => {
		if (!canPrev) return;
		setSelectedJornada(jornadas[selectedIndex - 1]);
	};
	const goNext = () => {
		if (!canNext) return;
		setSelectedJornada(jornadas[selectedIndex + 1]);
	};

	/** ====== TOGGLES PORTEROS ====== */
	const selectedGkCount = goalkeeperFilterEnabled ? selectedGoalkeepers.size : 0;

	const toggleGoalkeeper = (id: string) => {
		setSelectedGoalkeepers((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);

			// evita quedarse sin ninguno (si quieres permitir 0, elimina este bloque)
			if (next.size === 0) return prev;

			return next;
		});
	};

	const selectAllGoalkeepers = () => {
		const all = new Set<string>();
		for (const gk of goalkeepers) all.add(gk.id);
		setSelectedGoalkeepers(all);
	};

	return (
		<div className={cn("rounded-2xl border bg-card shadow-sm overflow-hidden", className)}>
			{/* Header */}
			<div className="p-3 pb-2 border-b">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-2 min-w-0">
						<div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-background shrink-0">
							<Target className="h-4 w-4 text-muted-foreground" />
						</div>
						<div className="leading-tight min-w-0">
							<div className="text-sm font-semibold">Mapa de tiros</div>
							<div className="text-xs text-muted-foreground truncate">
								{jornadaEnabled && selectedJornada != null ? `J${selectedJornada} · ` : ""}
								Rendimiento por zona (3×3)
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-1.5 justify-end">
						<Badge variant="secondary" className="text-[11px] h-5 px-2">
							Total: {totals.total}
						</Badge>
						<Badge variant="destructive" className="text-[11px] h-5 px-2">
							Goles: {totals.goals}
						</Badge>
						<Badge variant="secondary" className="text-[11px] h-5 px-2">
							Paradas: {totals.saves}
						</Badge>
					</div>
				</div>
			</div>

			{/* Body: chart + sidebar */}
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
				{/* Left: Chart */}
				<div className="p-3">
					<div className={cn("relative w-full select-none", "aspect-[4/3]", "max-h-[500px] sm:max-h-[500px]")}>
						{/* Marco */}
						<div className="pointer-events-none absolute left-[10%] right-[10%] top-[12%] h-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute left-[10%] top-[12%] bottom-[28%] w-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute right-[10%] top-[12%] bottom-[28%] w-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute left-[10%] right-[10%] bottom-[28%] h-[4px] rounded bg-foreground/70 shadow-sm" />

						{/* INNER AREA */}
						<div className="absolute left-[10%] right-[10%] top-[12%] bottom-[28%] overflow-hidden rounded-xl border bg-muted/10">
							<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background/50" />
							<div
								className="pointer-events-none absolute inset-0 opacity-25"
								style={{
									backgroundImage:
										"linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
									backgroundSize: "8% 8%"
								}}
							/>
							<div className="pointer-events-none absolute inset-0 shadow-[inset_0_-18px_42px_rgba(0,0,0,0.22)]" />

							{showGrid && (
								<div className="pointer-events-none absolute inset-0">
									{/* ✅ HEATMAP (canvas “mancha”) */}
									{showHeatmap && (
										<HeatmapCanvas
											enabled={showHeatmap}
											points={filteredShots.map((s) => ({ x: s.x, y: s.y }))}
											opacity={0.75}
											radiusPx={42}
										/>
									)}

									{/* Líneas 3x3 */}
									<div className="absolute top-0 bottom-0 left-1/3 w-px bg-foreground/20" />
									<div className="absolute top-0 bottom-0 left-2/3 w-px bg-foreground/20" />
									<div className="absolute left-0 right-0 top-1/3 h-px bg-foreground/20" />
									<div className="absolute left-0 right-0 top-2/3 h-px bg-foreground/20" />
								</div>
							)}

							{/* % por celda */}
							{showGrid && showCellPct && (
								<div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
									{Array.from({ length: 9 }).map((_, i) => {
										const key = `${i % 3}-${Math.floor(i / 3)}`;
										const st = cellStats.get(key);
										if (!st || st.total === 0) return <div key={key} />;

										return (
											<div key={key} className="relative flex items-center justify-center">
												{/* si NO hay heatmap, colorea suave la celda */}
												{!showHeatmap && <div className={cn("absolute inset-0", cellBgClass(st.savePct))} />}

												<div
													className={cn(
														"relative rounded-md border bg-transparent px-2 py-0.5 text-[11px] font-semibold shadow-sm",
														pctBadgeClass(st.savePct)
													)}
												>
													{st.savePct}%
													<span className="ml-1 text-[10px] font-normal text-white/85">
														({st.saves}/{st.total})
													</span>
												</div>
											</div>
										);
									})}
								</div>
							)}

							{/* ✅ Puntos: NO mostrar cuando hay heatmap */}
							{!showHeatmap &&
								filteredShots.map((s, i) => <Dot key={`${s.id}-${s.goalkeeperPlayerId}-${i}`} x={s.x} y={s.y} result={s.result} />)}
						</div>
					</div>

					{/* (Opcional) si quieres ocultar leyenda con heatmap, envuelve con {!showHeatmap && (...)} */}
					<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-2 rounded-full border bg-background px-2 py-1">
							<span className="h-2.5 w-2.5 rounded-full bg-red-500/90" />
							Gol
						</span>
						<span className="inline-flex items-center gap-2 rounded-full border bg-background px-2 py-1">
							<span className="h-2.5 w-2.5 rounded-full bg-emerald-500/90" />
							Parada
						</span>
					</div>
				</div>

				{/* Right: Sidebar */}
				<aside className="border-t lg:border-t-0 lg:border-l bg-card/60">
					<div className="p-3 space-y-3 lg:sticky lg:top-4">
						<SidebarSection title="Visualización" icon={<Grid3X3 className="h-4 w-4 text-muted-foreground" />}>
							<div className="space-y-2">
								<ToggleRow
									label="Cuadrícula"
									description="Divide la portería en 3×3"
									active={showGrid}
									onClick={() => setShowGrid((v) => !v)}
									icon={<Grid3X3 className="h-4 w-4" />}
								/>
								<ToggleRow
									label="% por celda"
									description="Muestra eficacia por zona"
									active={showCellPct}
									onClick={() => setShowCellPct((v) => !v)}
									disabled={!showGrid}
									icon={<Percent className="h-4 w-4" />}
								/>
								<ToggleRow
									label="Heatmap"
									description="Mapa de calor tipo sports"
									active={showHeatmap}
									onClick={() => setShowHeatmap((v) => !v)}
									disabled={!showGrid}
									icon={<Flame className="h-4 w-4" />}
								/>
							</div>
						</SidebarSection>

						<SidebarSection title="Jornada" icon={<ListFilter className="h-4 w-4 text-muted-foreground" />}>
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="h-8 px-2"
										onClick={goPrev}
										disabled={!canPrev}
										title="Anterior"
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>

									<select
										className={cn(
											"h-8 flex-1 rounded-md border bg-background px-2 text-[12px] outline-none",
											"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
											!jornadaEnabled && "opacity-60 cursor-not-allowed"
										)}
										disabled={!jornadaEnabled}
										value={selectedJornada == null ? "all" : String(selectedJornada)}
										onChange={(e) => {
											const v = e.target.value;
											setSelectedJornada(v === "all" ? null : Number(v));
										}}
									>
										<option value="all">Todas</option>
										{jornadas.map((j) => (
											<option key={j} value={j}>
												J{j}
											</option>
										))}
									</select>

									<Button
										type="button"
										size="sm"
										variant="outline"
										className="h-8 px-2"
										onClick={goNext}
										disabled={!canNext}
										title="Siguiente"
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>

								{!jornadaEnabled ? (
									<div className="text-xs text-muted-foreground">No hay jornadas en los partidos de esta temporada.</div>
								) : (
									<div className="text-xs text-muted-foreground">
										Mostrando: <b className="text-foreground">{selectedJornada == null ? "Todas" : `J${selectedJornada}`}</b>
									</div>
								)}
							</div>
						</SidebarSection>

						<SidebarSection title="Porteros" icon={<Users className="h-4 w-4 text-muted-foreground" />}>
							{!goalkeeperFilterEnabled ? (
								<div className="text-xs text-muted-foreground">No hay tiros con portero en esta temporada.</div>
							) : (
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<div className="text-xs text-muted-foreground">
											Seleccionados: <b className="text-foreground">{selectedGkCount}</b> / {goalkeepers.length}
										</div>
										<Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={selectAllGoalkeepers}>
											<Eye className="h-4 w-4 mr-1" />
											Todos
										</Button>
									</div>

									<div className="max-h-[220px] overflow-auto rounded-lg border bg-background">
										<ul className="divide-y">
											{goalkeepers.map((gk) => {
												const active = selectedGoalkeepers.has(gk.id);
												return (
													<li key={gk.id}>
														<button
															type="button"
															onClick={() => toggleGoalkeeper(gk.id)}
															className={cn(
																"w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-muted/40",
																active ? "bg-muted/20" : "bg-transparent"
															)}
														>
															<span className="min-w-0">
																<span className="text-sm font-medium truncate block">{gk.name}</span>
															</span>

															<span
																className={cn(
																	"inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
																	active
																		? "bg-foreground text-background border-foreground/30"
																		: "bg-background text-muted-foreground"
																)}
															>
																{active ? "ON" : "OFF"}
															</span>
														</button>
													</li>
												);
											})}
										</ul>
									</div>
								</div>
							)}
						</SidebarSection>
					</div>
				</aside>
			</div>
		</div>
	);
}
