"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Percent,
	Target,
	Flame,
	ChevronLeft,
	ChevronRight,
	ListFilter,
	Users,
	Eye,
	ShieldCheck,
	Crosshair,
	CircleOff,
	Sparkles,
	Maximize2,
	Minimize2,
	SlidersHorizontal,
	ChevronDown,
	ChevronUp
} from "lucide-react";

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

/** ====== TIPO INTERNO PARA EL CHART ======
 * ✅ IMPORTANTE:
 * - goal/save: x/y se interpretan como coords del INNER (como antes, coherente)
 * - out: x/y se interpretan como coords del OUTER (para poder dibujar fuera de palos)
 */
type Shot = {
	id: string;
	x: number;
	y: number;
	result: "goal" | "save" | "out";
	jornadaNumber?: number;
	goalkeeperPlayerId: string;
	goalkeeperName: string;
};

type ShotLayer = "all" | "goals" | "saves" | "out";
type MapView = "points" | "heatmap" | "percentage";

/** ====== JITTER VERTICAL (solo UI) para separar puntos en eje Y ====== */
function clamp01(v: number) {
	return Math.max(0, Math.min(1, v));
}

function hashToUnit(str: string) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0) / 4294967295; // 0..1
}

/** offset en [-amp, +amp] (amp en coords 0..1) */
function yJitter(id: string, amp = 0.015) {
	const u = hashToUnit(id); // 0..1
	const signed = u * 2 - 1; // -1..1
	return signed * amp;
}

/** ====== DOTS ====== */
function InnerDot({ id, x, y, result }: { id: string; x: number; y: number; result: "goal" | "save" }) {
	const t = useTranslations("GoalkeeperShotMap");
	// ✅ separa puntos SOLO en Y (no toca X) y mantiene 0..1
	const y2 = clamp01(y + yJitter(`inner-${id}`, 0.015)); // ajusta 0.01–0.025

	return (
		<div
			className={cn(
				"group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
				"h-4 w-4 border-2 shadow-md transition-transform hover:z-30 hover:scale-125 sm:h-[18px] sm:w-[18px]",
				result === "goal"
					? "border-red-200 bg-red-500 text-white shadow-red-950/25"
					: "border-emerald-100 bg-emerald-500 text-white shadow-emerald-950/25"
			)}
			style={{ left: `${x * 100}%`, top: `${y2 * 100}%` }}
			title={result === "goal" ? t("goal") : t("save")}
		>
			{result === "goal" ? (
				<span className="text-[11px] font-black leading-none">×</span>
			) : (
				<span className="h-1.5 w-1.5 rounded-full bg-white" />
			)}
		</div>
	);
}

function OutDot({ id, x, y }: { id: string; x: number; y: number }) {
	const t = useTranslations("GoalkeeperShotMap");
	const y2 = clamp01(y + yJitter(`out-${id}`, 0.02)); // fuera suele necesitar un pelín más

	return (
		<div
			className={cn(
				"absolute z-20 flex -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center rounded-[4px]",
				"h-4 w-4 border-2 border-sky-100 bg-sky-500 text-white shadow-md shadow-sky-950/25 transition-transform hover:z-30 hover:scale-125 sm:h-[18px] sm:w-[18px]"
			)}
			style={{ left: `${x * 100}%`, top: `${y2 * 100}%` }}
			title={t("out")}
		>
			<span className="-rotate-45 text-[11px] font-black leading-none">×</span>
		</div>
	);
}

/** ====== GRID STATS ====== */
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

/** ====== HEATMAP (canvas tipo sports) ====== */
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

/**
 * ✅ Heatmap responsive y estable:
 * - ResizeObserver + window resize
 * - RAF para evitar “repintados locos”
 * - Radio que escala con el tamaño del contenedor
 */
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

		const draw = () => {
			const rect = wrap.getBoundingClientRect();
			const w = Math.max(1, Math.floor(rect.width));
			const h = Math.max(1, Math.floor(rect.height));

			// Si el slide/tab está oculto, a veces da 0x0: evita pintar ahí
			if (w <= 1 || h <= 1) return;

			const dpr = Math.max(1, window.devicePixelRatio || 1);

			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			// dibujamos en coords CSS px (w/h), escaladas por dpr
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			// radio responsive (en CSS px)
			const base = Math.min(w, h);
			const r = clamp((radiusPx / 420) * base, 14, 60);

			// 1) Intensidad (alpha)
			ctx.globalCompositeOperation = "source-over";
			for (const p of points) {
				const px = p.x * w;
				const py = p.y * h;

				const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
				grad.addColorStop(0, "rgba(255,255,255,0.60)");
				grad.addColorStop(1, "rgba(255,255,255,0.0)");
				ctx.fillStyle = grad;
				ctx.fillRect(px - r, py - r, r * 2, r * 2);
			}

			// ✅ 2) Colorizar (IMPORTANTE: usar backing store size)
			const cw = canvas.width; // w * dpr
			const ch = canvas.height; // h * dpr

			const img = ctx.getImageData(0, 0, cw, ch);
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

				const [rr, gg, bb] = heatColor(t);
				data[i] = rr;
				data[i + 1] = gg;
				data[i + 2] = bb;
				data[i + 3] = Math.round(lerp(0, 255, t) * opacity);
			}

			// putImageData no depende del transform
			ctx.putImageData(img, 0, 0);
		};

		const schedule = () => {
			if (raf) cancelAnimationFrame(raf);
			raf = requestAnimationFrame(draw);
		};

		schedule();

		const ro = new ResizeObserver(() => schedule());
		ro.observe(wrap);

		const onResize = () => schedule();
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", onResize);

		return () => {
			if (raf) cancelAnimationFrame(raf);
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

function GoalSurface({
	innerShots,
	outShots,
	cellStats,
	mode,
	empty,
	compact = false,
	emptyTitle,
	emptyDescription
}: {
	innerShots: Shot[];
	outShots: Shot[];
	cellStats: Map<string, CellStats>;
	mode: MapView;
	empty: boolean;
	compact?: boolean;
	emptyTitle: string;
	emptyDescription: string;
}) {
	const showPoints = mode === "points";
	const showHeatmap = mode === "heatmap";
	const showPercentage = mode === "percentage";

	return (
		<div
			className={cn(
				"relative w-full select-none overflow-hidden rounded-xl border bg-gradient-to-b from-muted/20 via-background to-muted/30",
				"aspect-[4/3]",
				!compact && "max-h-[70vh] lg:max-h-[520px]"
			)}
		>
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-muted/35 to-transparent" />
			<div className="pointer-events-none absolute inset-x-0 bottom-[8%] h-px bg-border/40" />
			<div className="pointer-events-none absolute inset-x-0 bottom-[15%] h-px bg-border/30" />

			<div className={cn("pointer-events-none absolute left-[6%] right-[6%] top-[8%] z-30 rounded-full border border-slate-300 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.28)] dark:border-slate-500 dark:bg-slate-100", compact ? "h-1.5" : "h-2.5")} />
			<div className={cn("pointer-events-none absolute bottom-[22%] left-[6%] top-[8%] z-30 rounded-full border border-slate-300 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.28)] dark:border-slate-500 dark:bg-slate-100", compact ? "w-1.5" : "w-2.5")} />
			<div className={cn("pointer-events-none absolute bottom-[22%] right-[6%] top-[8%] z-30 rounded-full border border-slate-300 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.28)] dark:border-slate-500 dark:bg-slate-100", compact ? "w-1.5" : "w-2.5")} />
			<div className="pointer-events-none absolute bottom-[22%] left-[6%] right-[6%] z-30 h-[3px] rounded-full bg-white/90 shadow-sm dark:bg-slate-200" />

			{showPoints && outShots.map((shot) => <OutDot key={shot.id} id={shot.id} x={shot.x} y={shot.y} />)}

			<div className="absolute bottom-[22%] left-[6%] right-[6%] top-[8%] overflow-hidden border border-slate-300/60 bg-background/75 shadow-inner dark:border-slate-600/60 dark:bg-slate-950/50">
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-muted/20" />
				<div
					className="pointer-events-none absolute inset-0 opacity-35"
					style={{
						backgroundImage:
							"linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
						backgroundSize: "8.333% 12.5%"
					}}
				/>

				{showHeatmap ? (
					<HeatmapCanvas enabled points={innerShots.map((shot) => ({ x: shot.x, y: shot.y }))} opacity={0.75} radiusPx={compact ? 30 : 42} />
				) : null}

				<div className="pointer-events-none absolute inset-0">
					<div className="absolute bottom-0 left-1/3 top-0 w-px bg-foreground/20" />
					<div className="absolute bottom-0 left-2/3 top-0 w-px bg-foreground/20" />
					<div className="absolute left-0 right-0 top-1/3 h-px bg-foreground/20" />
					<div className="absolute left-0 right-0 top-2/3 h-px bg-foreground/20" />
				</div>

				{showPercentage ? (
					<div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
						{Array.from({ length: 9 }).map((_, index) => {
							const key = `${index % 3}-${Math.floor(index / 3)}`;
							const stats = cellStats.get(key);
							if (!stats || stats.total === 0) return <div key={key} />;

							return (
								<div key={key} className="relative flex items-center justify-center">
									<div className={cn("absolute inset-0", cellBgClass(stats.savePct))} />
									<div className={cn("relative rounded-md border bg-transparent font-semibold shadow-sm", compact ? "px-1 py-0.5 text-[9px]" : "px-2 py-0.5 text-[11px]", pctBadgeClass(stats.savePct))}>
										{stats.savePct}%
										{!compact ? <span className="ml-1 text-[10px] font-normal text-white/85">({stats.saves}/{stats.total})</span> : null}
									</div>
								</div>
							);
						})}
					</div>
				) : null}

				{showPoints ? innerShots.map((shot) => <InnerDot key={shot.id} id={shot.id} x={shot.x} y={shot.y} result={shot.result as "goal" | "save"} />) : null}
			</div>

			{empty ? (
				<div className="absolute inset-0 z-40 flex items-center justify-center bg-background/55 p-3 backdrop-blur-[2px]">
					<div className={cn("max-w-xs rounded-xl border bg-card/95 text-center shadow-lg", compact ? "p-2.5" : "p-5")}>
						{!compact ? <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><CircleOff className="h-5 w-5 text-muted-foreground" /></div> : null}
						<div className={cn("font-semibold", compact ? "text-[11px]" : "mt-3 text-sm")}>{emptyTitle}</div>
						{!compact ? <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{emptyDescription}</div> : null}
					</div>
				</div>
			) : null}
		</div>
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
	const t = useTranslations("GoalkeeperShotMap");
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
				const name = (p?.full_name || p?.name || t("goalkeeperFallback", { id: r.goalkeeper_player_id })).toString();

				const res = String(r.result ?? "")
					.trim()
					.toLowerCase();
				const result: "goal" | "save" | "out" | null = res === "goal" ? "goal" : res === "save" ? "save" : res === "out" ? "out" : null;
				if (!result) return null;

				return {
					id: `${r.match_id}-${r.goalkeeper_player_id}-${r.id}`,
					x: r.x,
					y: r.y,
					result,
					jornadaNumber: match?.jornada ?? undefined,
					goalkeeperPlayerId: String(r.goalkeeper_player_id),
					goalkeeperName: name
				} satisfies Shot;
			})
			.filter(Boolean) as Shot[];
	}, [rows, matchesById, playersById, t]);

	/** ====== UI STATE ====== */
	const [shotLayer, setShotLayer] = React.useState<ShotLayer>("all");
	const [activeView, setActiveView] = React.useState<MapView>("points");
	const [isExpanded, setIsExpanded] = React.useState(false);
	const [filtersOpen, setFiltersOpen] = React.useState(false);
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

	/** ====== FILTRO BASE (jornada + porteros) ====== */
	const baseShots = React.useMemo(() => {
		let out = shots;
		if (jornadaEnabled && selectedJornada != null) out = out.filter((s) => s.jornadaNumber === selectedJornada);
		if (goalkeeperFilterEnabled) out = out.filter((s) => selectedGoalkeepers.has(s.goalkeeperPlayerId));
		return out;
	}, [shots, jornadaEnabled, selectedJornada, goalkeeperFilterEnabled, selectedGoalkeepers]);

	/** ====== FILTRO FINAL (base + capa) ====== */
	const filteredShots = React.useMemo(() => {
		let out = baseShots;
		if (shotLayer === "goals") out = out.filter((s) => s.result === "goal");
		if (shotLayer === "saves") out = out.filter((s) => s.result === "save");
		if (shotLayer === "out") out = out.filter((s) => s.result === "out");
		return out;
	}, [baseShots, shotLayer]);

	/** ====== Separación coherente:
	 * - Inner shots (goal/save) se pintan DENTRO del inner usando x/y (coords inner)
	 * - Out shots (out) se pintan en el outer usando x/y (coords outer)
	 */
	const innerShots = React.useMemo(() => filteredShots.filter((s) => s.result === "goal" || s.result === "save"), [filteredShots]);
	const outShots = React.useMemo(() => filteredShots.filter((s) => s.result === "out"), [filteredShots]);
	const baseInnerShots = React.useMemo(() => baseShots.filter((s) => s.result === "goal" || s.result === "save"), [baseShots]);

	/** ====== STATS: totales base (sin capa) ====== */
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

	/** ====== STATS POR CELDA ======
	 * Se calculan sobre el filtro base y no sobre la capa visual activa.
	 * Así, mostrar solo goles o paradas no altera artificialmente la eficacia.
	 */
	const cellStats = React.useMemo(() => {
		const map = new Map<string, CellStats>();
		for (const s of baseInnerShots) {
			const { key } = cellIndex3(s.x, s.y);
			const prev = map.get(key) ?? { total: 0, saves: 0, goals: 0, savePct: 0 };

			const total = prev.total + 1;
			const saves = prev.saves + (s.result === "save" ? 1 : 0);
			const goals = prev.goals + (s.result === "goal" ? 1 : 0);
			const savePct = total > 0 ? Math.round((saves / total) * 100) : 0;

			map.set(key, { total, saves, goals, savePct });
		}
		return map;
	}, [baseInnerShots]);

	const saveEfficiency = React.useMemo(() => {
		const shotsOnTarget = totalsAll.goals + totalsAll.saves;
		return shotsOnTarget > 0 ? Math.round((totalsAll.saves / shotsOnTarget) * 100) : 0;
	}, [totalsAll]);

	const zoneInsights = React.useMemo(() => {
		const zones = Array.from(cellStats.entries())
			.map(([key, stats]) => ({ key, stats }))
			.filter((zone) => zone.stats.total > 0);
		if (zones.length === 0) return null;

		const mostTargeted = [...zones].sort((a, b) => b.stats.total - a.stats.total || a.key.localeCompare(b.key))[0];
		const strongest = [...zones].sort((a, b) => b.stats.savePct - a.stats.savePct || b.stats.total - a.stats.total)[0];
		const vulnerable = [...zones].sort((a, b) => a.stats.savePct - b.stats.savePct || b.stats.total - a.stats.total)[0];

		return { mostTargeted, strongest, vulnerable };
	}, [cellStats]);

	const zoneLabel = React.useCallback(
		(key: string) => {
			const labels: Record<string, string> = {
				"0-0": t("zones.topLeft"),
				"1-0": t("zones.topCenter"),
				"2-0": t("zones.topRight"),
				"0-1": t("zones.middleLeft"),
				"1-1": t("zones.center"),
				"2-1": t("zones.middleRight"),
				"0-2": t("zones.bottomLeft"),
				"1-2": t("zones.bottomCenter"),
				"2-2": t("zones.bottomRight")
			};
			return labels[key] ?? key;
		},
		[t]
	);

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
			if (next.size === 0) return prev;
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
			? t("all")
			: shotLayer === "goals"
				? t("goalsCount", { count: totalsVisible.total })
				: shotLayer === "saves"
					? t("savesCount", { count: totalsVisible.total })
					: t("outCount", { count: totalsVisible.total });
	const activeFilterCount =
		(shotLayer !== "all" ? 1 : 0) +
		(selectedJornada != null ? 1 : 0) +
		(goalkeeperFilterEnabled && selectedGkCount > 0 && selectedGkCount < goalkeepers.length ? 1 : 0);
	const viewOptions: Array<{ key: MapView; label: string; description: string; icon: React.ReactNode }> = [
		{ key: "points", label: t("pointsView"), description: t("pointsViewDescription"), icon: <Crosshair className="h-4 w-4" /> },
		{ key: "heatmap", label: t("heatmap"), description: t("heatmapViewDescription"), icon: <Flame className="h-4 w-4" /> },
		{ key: "percentage", label: t("percentageView"), description: t("percentageViewDescription"), icon: <Percent className="h-4 w-4" /> }
	];

	return (
		<div className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", className)}>
			<div className="border-b bg-gradient-to-br from-card via-card to-sky-500/[0.06] p-3 sm:p-4">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
					<div className="flex min-w-0 items-center gap-2">
						<div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 shadow-sm">
							<Target className="h-5 w-5 text-sky-600 dark:text-sky-400" />
						</div>
						<div className="min-w-0 leading-tight">
							<div className="font-semibold tracking-tight">{t("title")}</div>
							<div className="mt-0.5 text-xs text-muted-foreground">
								{jornadaEnabled && selectedJornada != null ? `J${selectedJornada} · ` : ""}
								{isExpanded ? t("expandedHint") : t("compactHint")}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2 sm:justify-end">
						{shotLayer !== "all" ? (
							<Badge variant="outline" className="h-6 bg-background/70 px-2 text-[11px] backdrop-blur-sm">
								{t("view", { label: layerLabel })}
							</Badge>
						) : (
							<Badge variant="outline" className="h-6 bg-background/70 px-2 text-[11px] backdrop-blur-sm">
								{t("completeView")}
							</Badge>
						)}
						<Button type="button" size="sm" variant="outline" className="h-8 gap-2 bg-background/70" onClick={() => setIsExpanded((value) => !value)}>
							{isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
							{isExpanded ? t("collapse") : t("expand")}
						</Button>
					</div>
				</div>

				<div className={cn("mt-3 grid grid-cols-4 overflow-hidden rounded-xl border bg-background/65", isExpanded && "gap-2 overflow-visible border-0 bg-transparent")}>
					<div className={cn("px-2.5 py-2", !isExpanded && "border-r", isExpanded && "rounded-xl border bg-background/70 p-3 shadow-sm")}>
						<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs"><Crosshair className="h-3.5 w-3.5" /><span className="truncate">{t("totalShots")}</span></div>
						<div className={cn("mt-0.5 font-semibold tabular-nums", isExpanded ? "text-xl" : "text-base")}>{totalsAll.total}</div>
					</div>
					<div className={cn("px-2.5 py-2", !isExpanded && "border-r", isExpanded && "rounded-xl border border-red-500/15 bg-red-500/[0.06] p-3 shadow-sm")}>
						<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs"><Target className="h-3.5 w-3.5 text-red-500" /><span className="truncate">{t("goals")}</span></div>
						<div className={cn("mt-0.5 font-semibold tabular-nums text-red-600 dark:text-red-400", isExpanded ? "text-xl" : "text-base")}>{totalsAll.goals}</div>
					</div>
					<div className={cn("px-2.5 py-2", !isExpanded && "border-r", isExpanded && "rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] p-3 shadow-sm")}>
						<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /><span className="truncate">{t("saves")}</span></div>
						<div className={cn("mt-0.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400", isExpanded ? "text-xl" : "text-base")}>{totalsAll.saves}</div>
					</div>
					<div className={cn("px-2.5 py-2", isExpanded && "rounded-xl border border-sky-500/15 bg-sky-500/[0.06] p-3 shadow-sm")}>
						<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs"><Percent className="h-3.5 w-3.5 text-sky-500" /><span className="truncate">{t("saveEfficiency")}</span></div>
						<div className={cn("mt-0.5 font-semibold tabular-nums text-sky-600 dark:text-sky-400", isExpanded ? "text-xl" : "text-base")}>{saveEfficiency}%</div>
					</div>
				</div>
			</div>

			<div className="min-w-0 p-3 sm:p-4">
				{isExpanded ? (
					<>
						<div className="mb-3 grid grid-cols-3 gap-2 rounded-xl border bg-muted/20 p-1.5">
							{viewOptions.map((view) => (
								<Button key={view.key} type="button" size="sm" variant={activeView === view.key ? "default" : "ghost"} className="h-9 gap-2" onClick={() => setActiveView(view.key)}>
									{view.icon}<span className="hidden sm:inline">{view.label}</span>
								</Button>
							))}
						</div>
						<div className="mx-auto max-w-5xl">
							<GoalSurface innerShots={innerShots} outShots={outShots} cellStats={cellStats} mode={activeView} empty={totalsAll.total === 0} emptyTitle={t("noShotsTitle")} emptyDescription={t("noShotsDescription")} />
						</div>
						<div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<span className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1.5 shadow-sm"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">×</span>{t("goal")}</span>
							<span className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1.5 shadow-sm"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500"><span className="h-1 w-1 rounded-full bg-white" /></span>{t("save")}</span>
							<span className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1.5 shadow-sm"><span className="flex h-3.5 w-3.5 rotate-45 items-center justify-center rounded-[3px] bg-sky-500 text-[9px] font-black text-white"><span className="-rotate-45">×</span></span>{t("out")}</span>
							<span className="ml-auto tabular-nums">{t("visibleShots", { count: totalsVisible.total })}</span>
						</div>

						{zoneInsights ? (
							<div className="mt-4 rounded-xl border bg-muted/[0.18] p-3">
								<div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-sky-500" />{t("zoneInsights")}</div>
								<div className="grid gap-2 sm:grid-cols-3">
									<div className="rounded-lg border bg-background p-2.5"><div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("mostTargetedZone")}</div><div className="mt-1 text-sm font-semibold">{zoneLabel(zoneInsights.mostTargeted.key)}</div><div className="text-xs text-muted-foreground">{t("zoneShots", { count: zoneInsights.mostTargeted.stats.total })}</div></div>
									<div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] p-2.5"><div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("strongestZone")}</div><div className="mt-1 text-sm font-semibold">{zoneLabel(zoneInsights.strongest.key)}</div><div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{zoneInsights.strongest.stats.savePct}% {t("saveEfficiencyShort")} · {t("zoneShots", { count: zoneInsights.strongest.stats.total })}</div></div>
									<div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.04] p-2.5"><div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("vulnerableZone")}</div><div className="mt-1 text-sm font-semibold">{zoneLabel(zoneInsights.vulnerable.key)}</div><div className="text-xs font-medium text-amber-600 dark:text-amber-400">{zoneInsights.vulnerable.stats.savePct}% {t("saveEfficiencyShort")} · {t("zoneShots", { count: zoneInsights.vulnerable.stats.total })}</div></div>
								</div>
							</div>
						) : null}
					</>
				) : (
					<div className="grid snap-x auto-cols-[minmax(240px,82vw)] grid-flow-col gap-3 overflow-x-auto pb-1 sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible sm:pb-0">
						{viewOptions.map((view) => (
							<section key={view.key} className="min-w-0 snap-start rounded-xl border bg-background/55 p-2.5 shadow-sm">
								<div className="mb-2 flex items-center gap-2 px-0.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">{view.icon}</span><div className="min-w-0"><div className="text-xs font-semibold">{view.label}</div><div className="truncate text-[10px] text-muted-foreground">{view.description}</div></div></div>
								<GoalSurface compact innerShots={innerShots} outShots={outShots} cellStats={cellStats} mode={view.key} empty={totalsAll.total === 0} emptyTitle={t("noShotsTitle")} emptyDescription={t("noShotsDescription")} />
							</section>
						))}
					</div>
				)}
			</div>

			<div className="border-t bg-muted/[0.12]">
				<button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/35" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>
					<span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /></span><span><span className="block text-sm font-semibold">{t("filters")}</span><span className="block text-xs text-muted-foreground">{activeFilterCount > 0 ? t("activeFilters", { count: activeFilterCount }) : t("filtersHint")}</span></span></span>
					<span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">{filtersOpen ? t("hideFilters") : t("showFilters")}{filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
				</button>

				{filtersOpen ? (
					<div className="grid gap-3 border-t p-3 sm:p-4 lg:grid-cols-3">
						<SidebarSection title={t("shotResult")} icon={<Target className="h-4 w-4 text-muted-foreground" />}>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
									<Button
										type="button"
										size="sm"
										variant={shotLayer === "all" ? "default" : "outline"}
										className="h-8"
										onClick={() => setShotLayer("all")}
									>
										{t("all")}
									</Button>

									<Button
										type="button"
										size="sm"
										variant={shotLayer === "goals" ? "destructive" : "outline"}
										className="h-8"
										onClick={() => setShotLayer("goals")}
									>
										{t("goals")}
									</Button>

									<Button
										type="button"
										size="sm"
										variant={shotLayer === "saves" ? "default" : "outline"}
										className={cn("h-8", shotLayer === "saves" ? "bg-emerald-600 hover:bg-emerald-600/90 text-white" : "")}
										onClick={() => setShotLayer("saves")}
									>
										{t("saves")}
									</Button>

									<Button
										type="button"
										size="sm"
										variant={shotLayer === "out" ? "default" : "outline"}
										className={cn("h-8", shotLayer === "out" ? "bg-blue-600 hover:bg-blue-600/90 text-white" : "")}
										onClick={() => setShotLayer("out")}
									>
										{t("out")}
									</Button>
								</div>
						</SidebarSection>

						<SidebarSection title={t("round")} icon={<ListFilter className="h-4 w-4 text-muted-foreground" />}>
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="h-8 px-2"
										onClick={goPrev}
										disabled={!canPrev}
									title={t("previous")}
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
										<option value="all">{t("allRounds")}</option>
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
										title={t("next")}
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>

								{!jornadaEnabled ? (
									<div className="text-xs text-muted-foreground">{t("noRoundsSeason")}</div>
								) : (
									<div className="text-xs text-muted-foreground">
										{t("showing")} <b className="text-foreground">{selectedJornada == null ? t("allRounds") : `J${selectedJornada}`}</b>
									</div>
								)}
							</div>
						</SidebarSection>

						<SidebarSection title={t("goalkeepers")} icon={<Users className="h-4 w-4 text-muted-foreground" />}>
							{!goalkeeperFilterEnabled ? (
								<div className="text-xs text-muted-foreground">{t("noGoalkeeperShotsSeason")}</div>
							) : (
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<div className="text-xs text-muted-foreground">
											{t("selected")} <b className="text-foreground">{goalkeeperFilterEnabled ? selectedGoalkeepers.size : 0}</b>{" "}
											/ {goalkeepers.length}
										</div>
										<Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={selectAllGoalkeepers}>
											<Eye className="h-4 w-4 mr-1" />
											{t("all")}
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
														{active ? t("enabled") : t("disabled")}
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
				) : null}
			</div>
		</div>
	);
}
