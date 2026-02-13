"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Percent, Target, Flame, ChevronLeft, ChevronRight, ListFilter, Users, Eye } from "lucide-react";

/** ===========================
 *  CORE TYPES
 *  =========================== */

/**
 * ✅ Tipo interno unificado:
 * - goal/save: x/y coords INNER (0..1 dentro de palos)
 * - out: x/y coords OUTER (0..1 del canvas completo)
 */
export type UnifiedShot = {
	id: string;
	x: number;
	y: number;
	result: "goal" | "save" | "out";
	jornadaNumber?: number;
	goalkeeperPlayerId?: string;
	goalkeeperName?: string;
};

type ShotLayer = "all" | "goals" | "saves" | "out";

/** ===========================
 *  JITTER (solo UI)
 *  =========================== */
function clamp01(v: number) {
	return Math.max(0, Math.min(1, v));
}

function hashToUnit(str: string) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0) / 4294967295;
}

function yJitter(id: string, amp = 0.015) {
	const u = hashToUnit(id);
	const signed = u * 2 - 1;
	return signed * amp;
}

/** ===========================
 *  DOTS
 *  =========================== */
function InnerDot({ id, x, y, result }: { id: string; x: number; y: number; result: "goal" | "save" }) {
	const y2 = clamp01(y + yJitter(`inner-${id}`, 0.015));
	return (
		<div
			className={cn(
				"absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
				"h-3 w-3 sm:h-3.5 sm:w-3.5",
				"shadow-sm ring-2 ring-background/70",
				result === "goal" ? "bg-red-500/90 ring-red-900/10" : "bg-emerald-500/90 ring-emerald-900/10"
			)}
			style={{ left: `${x * 100}%`, top: `${y2 * 100}%` }}
			title={result === "goal" ? "Gol" : "Parada"}
		/>
	);
}

function OutDot({ id, x, y }: { id: string; x: number; y: number }) {
	const y2 = clamp01(y + yJitter(`out-${id}`, 0.02));
	return (
		<div
			className={cn(
				"absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
				"h-3 w-3 sm:h-3.5 sm:w-3.5",
				"shadow-sm ring-2 ring-background/70",
				"bg-blue-500/90 ring-blue-900/10"
			)}
			style={{ left: `${x * 100}%`, top: `${y2 * 100}%` }}
			title="Fuera"
		/>
	);
}

/** ===========================
 *  GRID STATS
 *  =========================== */
type CellStats = { total: number; saves: number; goals: number; savePct: number };

function cellIndex3(x: number, y: number) {
	const cx = Math.min(2, Math.max(0, Math.floor(x * 3)));
	const cy = Math.min(2, Math.max(0, Math.floor(y * 3)));
	return { cx, cy, key: `${cx}-${cy}` };
}

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

/** ===========================
 *  HEATMAP
 *  =========================== */
function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}
function clamp(v: number, min = 0, max = 1) {
	return Math.max(min, Math.min(max, v));
}

function heatColor(t: number) {
	const stops = [
		{ p: 0.0, c: [0, 80, 255] },
		{ p: 0.35, c: [0, 200, 120] },
		{ p: 0.65, c: [255, 210, 0] },
		{ p: 1.0, c: [255, 60, 60] }
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

		let raf = 0;
		let tmr: number | null = null;

		const draw = () => {
			const rect = wrap.getBoundingClientRect();
			const w = Math.floor(rect.width);
			const h = Math.floor(rect.height);

			// ✅ clave para tabs/carousel: si aún no hay tamaño real, no pintes
			if (w < 10 || h < 10) return;

			const dpr = Math.max(1, window.devicePixelRatio || 1);
			const wd = Math.max(1, Math.floor(w * dpr));
			const hd = Math.max(1, Math.floor(h * dpr));

			// evita repaints innecesarios si ya está igual
			if (canvas.width !== wd) canvas.width = wd;
			if (canvas.height !== hd) canvas.height = hd;

			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, wd, hd);

			const base = Math.min(wd, hd);
			const r = clamp((radiusPx / 420) * base, 14 * dpr, 60 * dpr);

			// 1) intensidad
			ctx.globalCompositeOperation = "source-over";
			for (const p of points) {
				const px = p.x * wd;
				const py = p.y * hd;

				const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
				grad.addColorStop(0, "rgba(255,255,255,0.60)");
				grad.addColorStop(1, "rgba(255,255,255,0.0)");
				ctx.fillStyle = grad;
				ctx.fillRect(px - r, py - r, r * 2, r * 2);
			}

			// 2) colorizar (device px completo ✅)
			const img = ctx.getImageData(0, 0, wd, hd);
			const data = img.data;

			let maxA = 0;
			for (let i = 3; i < data.length; i += 4) maxA = Math.max(maxA, data[i]);
			if (maxA === 0) {
				ctx.putImageData(img, 0, 0);
				return;
			}

			const gamma = 0.75; // opcional: mejora contraste en pantallas pequeñas

			for (let i = 0; i < data.length; i += 4) {
				const a = data[i + 3];
				let t = clamp(a / maxA);
				if (t <= 0) {
					data[i + 3] = 0;
					continue;
				}

				t = Math.pow(t, gamma);

				const [rr, gg, bb] = heatColor(t);
				data[i] = rr;
				data[i + 1] = gg;
				data[i + 2] = bb;
				data[i + 3] = Math.round(lerp(0, 255, t) * opacity);
			}

			ctx.putImageData(img, 0, 0);
		};

		const schedule = () => {
			if (raf) cancelAnimationFrame(raf);
			raf = requestAnimationFrame(draw);

			// ✅ segundo intento por si el layout termina después (tabs/carousel)
			if (tmr) window.clearTimeout(tmr);
			tmr = window.setTimeout(() => {
				if (raf) cancelAnimationFrame(raf);
				raf = requestAnimationFrame(draw);
			}, 0);
		};

		schedule();

		const ro = new ResizeObserver(() => schedule());
		ro.observe(wrap);

		const onResize = () => schedule();
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", onResize);

		return () => {
			if (raf) cancelAnimationFrame(raf);
			if (tmr) window.clearTimeout(tmr);
			ro.disconnect();
			window.removeEventListener("resize", onResize);
			window.removeEventListener("orientationchange", onResize);
		};
	}, [enabled, points, opacity, radiusPx]);

	return (
		<div ref={wrapperRef} className="absolute inset-0 pointer-events-none">
			<canvas ref={canvasRef} className={cn("absolute inset-0", !enabled && "hidden")} />
		</div>
	);
}

/** ===========================
 *  SIDEBAR UI
 *  =========================== */
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

/** ===========================
 *  CORE CHART (REUTILIZABLE)
 *  =========================== */
function GoalkeeperShotsChartCore({
	shots,
	className,
	enableJornadaFilter,
	enableGoalkeeperFilter
}: {
	shots: UnifiedShot[];
	className?: string;
	enableJornadaFilter?: boolean;
	enableGoalkeeperFilter?: boolean;
}) {
	const [shotLayer, setShotLayer] = React.useState<ShotLayer>("all");
	const [showGrid, setShowGrid] = React.useState(true);
	const [showCellPct, setShowCellPct] = React.useState(false);
	const [showHeatmap, setShowHeatmap] = React.useState(false);

	const jornadaEnabled = Boolean(enableJornadaFilter);
	const goalkeeperFilterEnabled = Boolean(enableGoalkeeperFilter);

	const [selectedJornada, setSelectedJornada] = React.useState<number | null>(null);
	const [selectedGoalkeepers, setSelectedGoalkeepers] = React.useState<Set<string>>(new Set());

	/** Jornadas */
	const jornadas = React.useMemo(() => {
		if (!jornadaEnabled) return [];
		const set = new Set<number>();
		for (const s of shots) if (typeof s.jornadaNumber === "number") set.add(s.jornadaNumber);
		return Array.from(set).sort((a, b) => a - b);
	}, [shots, jornadaEnabled]);

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

	/** Porteros */
	const goalkeepers = React.useMemo(() => {
		if (!goalkeeperFilterEnabled) return [];
		const map = new Map<string, { id: string; name: string }>();
		for (const s of shots) {
			const id = s.goalkeeperPlayerId ?? "";
			if (!id) continue;
			const name = (s.goalkeeperName ?? id).toString();
			if (!map.has(id)) map.set(id, { id, name });
		}
		return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
	}, [shots, goalkeeperFilterEnabled]);

	React.useEffect(() => {
		if (!goalkeeperFilterEnabled) {
			setSelectedGoalkeepers(new Set());
			return;
		}
		setSelectedGoalkeepers((prev) => {
			const next = new Set(prev);

			// primera vez: selecciona todos
			if (next.size === 0) {
				for (const gk of goalkeepers) next.add(gk.id);
				return next;
			}

			// limpia ids que ya no existen
			for (const id of Array.from(next)) {
				if (!goalkeepers.some((g) => g.id === id)) next.delete(id);
			}

			// si quedó vacío, vuelve a todos
			if (next.size === 0) for (const gk of goalkeepers) next.add(gk.id);

			return next;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [goalkeeperFilterEnabled, goalkeepers.map((g) => g.id).join("|")]);

	/** dependencias */
	React.useEffect(() => {
		if (!showGrid) {
			setShowCellPct(false);
			setShowHeatmap(false);
		}
	}, [showGrid]);

	/** filtro base */
	const baseShots = React.useMemo(() => {
		let out = shots;

		if (jornadaEnabled && selectedJornada != null) out = out.filter((s) => s.jornadaNumber === selectedJornada);

		if (goalkeeperFilterEnabled) {
			out = out.filter((s) => {
				const id = s.goalkeeperPlayerId ?? "";
				return id && selectedGoalkeepers.has(id);
			});
		}

		return out;
	}, [shots, jornadaEnabled, selectedJornada, goalkeeperFilterEnabled, selectedGoalkeepers]);

	/** filtro capa */
	const filteredShots = React.useMemo(() => {
		let out = baseShots;
		if (shotLayer === "goals") out = out.filter((s) => s.result === "goal");
		if (shotLayer === "saves") out = out.filter((s) => s.result === "save");
		if (shotLayer === "out") out = out.filter((s) => s.result === "out");
		return out;
	}, [baseShots, shotLayer]);

	/** separación render */
	const innerShots = React.useMemo(() => filteredShots.filter((s) => s.result === "goal" || s.result === "save"), [filteredShots]);
	const outShots = React.useMemo(() => filteredShots.filter((s) => s.result === "out"), [filteredShots]);

	/** stats */
	const totalsAll = React.useMemo(() => {
		const goals = baseShots.filter((s) => s.result === "goal").length;
		const saves = baseShots.filter((s) => s.result === "save").length;
		const out = baseShots.filter((s) => s.result === "out").length;
		return { total: baseShots.length, goals, saves, out };
	}, [baseShots]);

	const totalsVisible = React.useMemo(() => {
		const goals = filteredShots.filter((s) => s.result === "goal").length;
		const saves = filteredShots.filter((s) => s.result === "save").length;
		const out = filteredShots.filter((s) => s.result === "out").length;
		return { total: filteredShots.length, goals, saves, out };
	}, [filteredShots]);

	/** cell stats SOLO inner */
	const cellStats = React.useMemo(() => {
		const map = new Map<string, CellStats>();
		for (const s of innerShots) {
			const { key } = cellIndex3(s.x, s.y);
			const prev = map.get(key) ?? { total: 0, saves: 0, goals: 0, savePct: 0 };
			const total = prev.total + 1;
			const saves = prev.saves + (s.result === "save" ? 1 : 0);
			const goals = prev.goals + (s.result === "goal" ? 1 : 0);
			const savePct = total > 0 ? Math.round((saves / total) * 100) : 0;
			map.set(key, { total, saves, goals, savePct });
		}
		return map;
	}, [innerShots]);

	/** nav jornada */
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

	/** porteros */
	const toggleGoalkeeper = (id: string) => {
		setSelectedGoalkeepers((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			if (next.size === 0) return prev; // no permitir 0
			return next;
		});
	};

	const selectAllGoalkeepers = () => {
		const all = new Set<string>();
		for (const gk of goalkeepers) all.add(gk.id);
		setSelectedGoalkeepers(all);
	};

	const layerLabel =
		shotLayer === "all"
			? "Todos"
			: shotLayer === "goals"
				? `Goles (${totalsVisible.total})`
				: shotLayer === "saves"
					? `Paradas (${totalsVisible.total})`
					: `Fuera (${totalsVisible.total})`;

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
							Total: {totalsAll.total}
						</Badge>
						<Badge variant="destructive" className="text-[11px] h-5 px-2">
							Goles: {totalsAll.goals}
						</Badge>
						<Badge variant="secondary" className="text-[11px] h-5 px-2">
							Paradas: {totalsAll.saves}
						</Badge>
						<Badge variant="secondary" className="text-[11px] h-5 px-2">
							Fuera: {totalsAll.out}
						</Badge>

						{shotLayer !== "all" ? (
							<Badge variant="outline" className="text-[11px] h-5 px-2">
								Vista: {layerLabel}
							</Badge>
						) : null}
					</div>
				</div>
			</div>

			{/* Body */}
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
				{/* Left */}
				<div className="p-3">
					<div className={cn("relative w-full select-none", "aspect-[4/3]", "max-h-[70vh] lg:max-h-[520px]")}>
						{/* Marco */}
						<div className="pointer-events-none absolute left-[10%] right-[10%] top-[12%] h-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute left-[10%] top-[12%] bottom-[28%] w-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute right-[10%] top-[12%] bottom-[28%] w-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute left-[10%] right-[10%] bottom-[28%] h-[4px] rounded bg-foreground/70 shadow-sm" />

						{/* ✅ OUT dots SIEMPRE visibles (aunque haya heatmap) */}
						{outShots.map((s) => (
							<OutDot key={s.id} id={s.id} x={s.x} y={s.y} />
						))}

						{/* INNER area */}
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
									{showHeatmap && (
										<HeatmapCanvas
											enabled={showHeatmap}
											points={innerShots.map((s) => ({ x: s.x, y: s.y }))}
											opacity={0.75}
											radiusPx={42}
										/>
									)}

									<div className="absolute top-0 bottom-0 left-1/3 w-px bg-foreground/20" />
									<div className="absolute top-0 bottom-0 left-2/3 w-px bg-foreground/20" />
									<div className="absolute left-0 right-0 top-1/3 h-px bg-foreground/20" />
									<div className="absolute left-0 right-0 top-2/3 h-px bg-foreground/20" />
								</div>
							)}

							{showGrid && showCellPct && (
								<div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
									{Array.from({ length: 9 }).map((_, i) => {
										const key = `${i % 3}-${Math.floor(i / 3)}`;
										const st = cellStats.get(key);
										if (!st || st.total === 0) return <div key={key} />;

										return (
											<div key={key} className="relative flex items-center justify-center">
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

							{/* ✅ Inner dots: solo cuando NO hay heatmap */}
							{!showHeatmap &&
								innerShots.map((s) => <InnerDot key={s.id} id={s.id} x={s.x} y={s.y} result={s.result as "goal" | "save"} />)}
						</div>
					</div>

					<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-2 rounded-full border bg-background px-2 py-1">
							<span className="h-2.5 w-2.5 rounded-full bg-red-500/90" />
							Gol
						</span>
						<span className="inline-flex items-center gap-2 rounded-full border bg-background px-2 py-1">
							<span className="h-2.5 w-2.5 rounded-full bg-emerald-500/90" />
							Parada
						</span>
						<span className="inline-flex items-center gap-2 rounded-full border bg-background px-2 py-1">
							<span className="h-2.5 w-2.5 rounded-full bg-blue-500/90" />
							Fuera
						</span>
					</div>
				</div>

				{/* Right */}
				<aside className="border-t lg:border-t-0 lg:border-l bg-card/60">
					<div className="p-3 space-y-3 lg:sticky lg:top-4">
						<SidebarSection title="Visualización" icon={<Grid3X3 className="h-4 w-4 text-muted-foreground" />}>
							<div className="space-y-2">
								<div className="grid grid-cols-4 gap-2">
									<Button
										type="button"
										size="sm"
										variant={shotLayer === "all" ? "default" : "outline"}
										className="h-8"
										onClick={() => setShotLayer("all")}
									>
										Todos
									</Button>
									<Button
										type="button"
										size="sm"
										variant={shotLayer === "goals" ? "destructive" : "outline"}
										className="h-8"
										onClick={() => setShotLayer("goals")}
									>
										Goles
									</Button>
									<Button
										type="button"
										size="sm"
										variant={shotLayer === "saves" ? "default" : "outline"}
										className={cn("h-8", shotLayer === "saves" ? "bg-emerald-600 hover:bg-emerald-600/90 text-white" : "")}
										onClick={() => setShotLayer("saves")}
									>
										Paradas
									</Button>
									<Button
										type="button"
										size="sm"
										variant={shotLayer === "out" ? "default" : "outline"}
										className={cn("h-8", shotLayer === "out" ? "bg-blue-600 hover:bg-blue-600/90 text-white" : "")}
										onClick={() => setShotLayer("out")}
									>
										Fuera
									</Button>
								</div>

								<ToggleRow
									label="Cuadrícula"
									description="Divide la portería en 3×3"
									active={showGrid}
									onClick={() => setShowGrid((v) => !v)}
									icon={<Grid3X3 className="h-4 w-4" />}
								/>
								<ToggleRow
									label="% por celda"
									description="Eficacia por zona (solo dentro)"
									active={showCellPct}
									onClick={() => setShowCellPct((v) => !v)}
									disabled={!showGrid}
									icon={<Percent className="h-4 w-4" />}
								/>
								<ToggleRow
									label="Heatmap"
									description="Mapa de calor (solo dentro)"
									active={showHeatmap}
									onClick={() => setShowHeatmap((v) => !v)}
									disabled={!showGrid}
									icon={<Flame className="h-4 w-4" />}
								/>
							</div>
						</SidebarSection>

						{jornadaEnabled ? (
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
												jornadas.length === 0 && "opacity-60 cursor-not-allowed"
											)}
											disabled={jornadas.length === 0}
											value={selectedJornada == null ? "all" : String(selectedJornada)}
											onChange={(e) => setSelectedJornada(e.target.value === "all" ? null : Number(e.target.value))}
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

									{jornadas.length === 0 ? (
										<div className="text-xs text-muted-foreground">No hay jornadas en los datos.</div>
									) : (
										<div className="text-xs text-muted-foreground">
											Mostrando: <b className="text-foreground">{selectedJornada == null ? "Todas" : `J${selectedJornada}`}</b>
										</div>
									)}
								</div>
							</SidebarSection>
						) : null}

						{goalkeeperFilterEnabled ? (
							<SidebarSection title="Porteros" icon={<Users className="h-4 w-4 text-muted-foreground" />}>
								{goalkeepers.length === 0 ? (
									<div className="text-xs text-muted-foreground">No hay tiros con portero.</div>
								) : (
									<div className="space-y-2">
										<div className="flex items-center justify-between gap-2">
											<div className="text-xs text-muted-foreground">
												Seleccionados: <b className="text-foreground">{selectedGoalkeepers.size}</b> / {goalkeepers.length}
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
						) : null}
					</div>
				</aside>
			</div>
		</div>
	);
}

/** ===========================
 *  WRAPPER 1: "GRANDE" (rows + matches + players)
 *  =========================== */
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

export function GoalkeeperShotsGoalChartFromRows({
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

	const shots: UnifiedShot[] = React.useMemo(() => {
		return (rows || [])
			.map((r) => {
				const match = matchesById.get(r.match_id);
				const p = playersById.get(r.goalkeeper_player_id);
				const name = (p?.full_name || p?.name || `Portero ${r.goalkeeper_player_id}`).toString();

				const res = String(r.result ?? "")
					.trim()
					.toLowerCase();
				const result: "goal" | "save" | "out" | null = res === "goal" ? "goal" : res === "save" ? "save" : res === "out" ? "out" : null;
				if (!result) return null;

				return {
					id: `${r.match_id}-${r.goalkeeper_player_id}-${r.id}`,
					x: Number(r.x),
					y: Number(r.y),
					result,
					jornadaNumber: match?.jornada ?? undefined,
					goalkeeperPlayerId: String(r.goalkeeper_player_id),
					goalkeeperName: name
				} satisfies UnifiedShot;
			})
			.filter(Boolean) as UnifiedShot[];
	}, [rows, matchesById, playersById]);

	return <GoalkeeperShotsChartCore shots={shots} className={className} enableJornadaFilter enableGoalkeeperFilter />;
}

/** ===========================
 *  WRAPPER 2: "SIMPLE" (shots + goalkeeperPlayerId + matchId)
 *  =========================== */
export type GoalkeeperShotForChart = {
	id: number | string;
	match_id: number;
	goalkeeper_player_id: number;
	x: number;
	y: number;
	result: "goal" | "save" | "out";
};

export function GoalkeeperShotsGoalChartSimple({
	shots,
	goalkeeperPlayerId,
	matchId,
	className
}: {
	shots: GoalkeeperShotForChart[];
	goalkeeperPlayerId: number;
	matchId?: number;
	className?: string;
}) {
	const filtered: UnifiedShot[] = React.useMemo(() => {
		const arr = Array.isArray(shots) ? shots : [];
		return arr
			.filter((s) => {
				if (Number(s.goalkeeper_player_id) !== Number(goalkeeperPlayerId)) return false;
				if (typeof matchId === "number" && Number(s.match_id) !== Number(matchId)) return false;
				return true;
			})
			.map((s) => ({
				id: `${s.match_id}-${s.goalkeeper_player_id}-${String(s.id)}`,
				x: Number(s.x),
				y: Number(s.y),
				result: s.result
			}));
	}, [shots, goalkeeperPlayerId, matchId]);

	return <GoalkeeperShotsChartCore shots={filtered} className={className} enableJornadaFilter={false} enableGoalkeeperFilter={false} />;
}
