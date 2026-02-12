"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ShotResult = "goal" | "save" | "out";

/**
 * ✅ ESCALA COHERENTE CON LOS GRÁFICOS:
 * - goal/save: x/y se guardan en coords del INNER (0..1 dentro de palos)
 * - out: x/y se guardan en coords del OUTER (0..1 del canvas completo)
 */
export type GoalkeeperShotDraft = {
	goalkeeper_player_id: number;
	shot_index: number;
	result: ShotResult;
	x: number;
	y: number;
};

type BaseProps = {
	goalkeeperPlayerId: number;
	shots?: GoalkeeperShotDraft[];
	onChangeShots?: (next: GoalkeeperShotDraft[]) => void;
	fixedResult: Exclude<ShotResult, "out">; // "goal" | "save"
	hintText?: string;
};

function GoalkeeperShotRecorderBase({ goalkeeperPlayerId, shots, onChangeShots, fixedResult, hintText = "Toca para registrar" }: BaseProps) {
	const safeShots = React.useMemo(() => (Array.isArray(shots) ? shots : []), [shots]);
	const safeOnChange = React.useMemo(() => onChangeShots ?? (() => {}), [onChangeShots]);

	const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

	const nextIndexFor = React.useCallback(
		(prev: GoalkeeperShotDraft[]) => {
			const max = prev.filter((s) => s.goalkeeper_player_id === goalkeeperPlayerId).reduce((m, s) => Math.max(m, s.shot_index), 0);
			return max + 1;
		},
		[goalkeeperPlayerId]
	);

	// ✅ outer: todo el lienzo (incluye fuera de palos)
	const goalOuterRef = React.useRef<HTMLDivElement | null>(null);
	// ✅ inner: dentro de palos (rect exacto)
	const goalInnerRef = React.useRef<HTMLDivElement | null>(null);

	const pointFromClient = React.useCallback((el: HTMLDivElement, clientX: number, clientY: number) => {
		const rect = el.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return null;

		const x = clamp01((clientX - rect.left) / rect.width);
		const y = clamp01((clientY - rect.top) / rect.height);
		return { x, y };
	}, []);

	/**
	 * ✅ Para dibujar en el OUTER aunque el punto esté guardado en INNER:
	 * (mismas proporciones que tus componentes de gráficos: left/right/top/bottom)
	 */
	const INNER_NORM = React.useMemo(() => {
		const left = 0.1;
		const right = 0.9;
		const top = 0.12;
		const bottom = 0.72; // 1 - 0.28
		return { left, right, top, bottom, w: right - left, h: bottom - top };
	}, []);

	const innerToOuter = React.useCallback(
		(ix: number, iy: number) => {
			return {
				x: clamp01(INNER_NORM.left + ix * INNER_NORM.w),
				y: clamp01(INNER_NORM.top + iy * INNER_NORM.h)
			};
		},
		[INNER_NORM]
	);

	const addShotAtClientPoint = React.useCallback(
		(clientX: number, clientY: number) => {
			const outer = goalOuterRef.current;
			const inner = goalInnerRef.current;
			if (!outer || !inner) return;

			// ¿el click cae dentro de los palos?
			const innerRect = inner.getBoundingClientRect();
			const isInsideInner = clientX >= innerRect.left && clientX <= innerRect.right && clientY >= innerRect.top && clientY <= innerRect.bottom;

			const shot_index = nextIndexFor(safeShots);

			if (isInsideInner) {
				// ✅ GUARDAR EN ESCALA INNER (0..1 dentro)
				const innerPt = pointFromClient(inner, clientX, clientY);
				if (!innerPt) return;

				const next: GoalkeeperShotDraft[] = [
					...safeShots,
					{
						goalkeeper_player_id: goalkeeperPlayerId,
						shot_index,
						result: fixedResult,
						x: innerPt.x,
						y: innerPt.y
					}
				];

				safeOnChange(next);
				return;
			}

			// ✅ GUARDAR OUT EN ESCALA OUTER (0..1 canvas completo)
			const outerPt = pointFromClient(outer, clientX, clientY);
			if (!outerPt) return;

			const next: GoalkeeperShotDraft[] = [
				...safeShots,
				{
					goalkeeper_player_id: goalkeeperPlayerId,
					shot_index,
					result: "out",
					x: outerPt.x,
					y: outerPt.y
				}
			];

			safeOnChange(next);
		},
		[fixedResult, goalkeeperPlayerId, nextIndexFor, pointFromClient, safeOnChange, safeShots]
	);

	const onPointerDownOuter = (e: React.PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		addShotAtClientPoint(e.clientX, e.clientY);
	};

	const shotsForThisGK = React.useMemo(
		() => safeShots.filter((s) => s.goalkeeper_player_id === goalkeeperPlayerId),
		[safeShots, goalkeeperPlayerId]
	);

	const removeLast = () => {
		let idx = -1;
		for (let i = safeShots.length - 1; i >= 0; i--) {
			const s = safeShots[i];
			if (s.goalkeeper_player_id === goalkeeperPlayerId) {
				idx = i;
				break;
			}
		}
		if (idx === -1) return;
		const next = safeShots.slice(0, idx).concat(safeShots.slice(idx + 1));
		safeOnChange(next);
	};

	const clearThisGK = () => {
		safeOnChange(safeShots.filter((s) => s.goalkeeper_player_id !== goalkeeperPlayerId));
	};

	return (
		<div className="space-y-4">
			{/* Cabecera */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="text-sm text-muted-foreground">
					Registrando:{" "}
					<b>
						{fixedResult === "goal" ? "Goles" : "Paradas"}{" "}
						<span className="text-muted-foreground font-normal">
							(fuera = <span className="text-blue-600">azul</span>)
						</span>
					</b>
				</div>

				<div className="flex gap-2 justify-end">
					<Button type="button" variant="outline" onClick={removeLast} disabled={shotsForThisGK.length === 0} className="gap-2">
						<Trash2 className="h-4 w-4" />
						Deshacer
					</Button>
					<Button type="button" variant="outline" onClick={clearThisGK} disabled={shotsForThisGK.length === 0}>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Portería */}
			<div className="w-full max-w-full">
				<div className="w-full max-w-full h-[min(30vh,340px)]">
					<div
						ref={goalOuterRef}
						onPointerDown={onPointerDownOuter}
						role="button"
						aria-label="Portería interactiva"
						className={cn("relative mx-auto h-full", "w-auto max-w-full", "aspect-[4/3]", "select-none", "rounded-xl border bg-muted/10")}
						style={{ touchAction: "none" }}
					>
						{/* ✅ MARCO: palos */}
						<div className="pointer-events-none absolute left-[10%] right-[10%] top-[12%] h-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute left-[10%] top-[12%] bottom-[28%] w-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute right-[10%] top-[12%] bottom-[28%] w-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute left-[10%] right-[10%] bottom-[28%] h-[4px] rounded bg-foreground/70 shadow-sm" />

						{/* Texto guía */}
						<div className="pointer-events-none absolute left-3 top-3 text-[11px] text-muted-foreground">
							{hintText} (si tocas fuera de palos → OUT)
						</div>

						{/* ✅ Puntos:
                - OUT: ya están en outer (x/y directos)
                - goal/save: están guardados en inner, pero se dibujan en outer remapeando a escala outer */}
						{shotsForThisGK.map((s) => {
							const pos = s.result === "out" ? { x: s.x, y: s.y } : innerToOuter(s.x, s.y);
							return <ShotDot key={`${s.goalkeeper_player_id}-${s.shot_index}`} x={pos.x} y={pos.y} result={s.result} />;
						})}

						{/* ✅ ÁREA INTERIOR */}
						<div
							ref={goalInnerRef}
							className={cn("absolute left-[10%] right-[10%] top-[12%] bottom-[28%]", "overflow-hidden rounded-lg", "cursor-crosshair")}
						>
							<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 via-background/5 to-background/40" />

							<div
								className="pointer-events-none absolute inset-0 opacity-30"
								style={{
									backgroundImage:
										"linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
									backgroundSize: "8% 8%"
								}}
							/>

							<div className="pointer-events-none absolute inset-0 shadow-[inset_0_-18px_42px_rgba(0,0,0,0.22)]" />

							<div className="pointer-events-none absolute inset-0">
								<div className="absolute top-0 bottom-0 left-1/3 w-px bg-foreground/25" />
								<div className="absolute top-0 bottom-0 left-2/3 w-px bg-foreground/25" />
								<div className="absolute left-0 right-0 top-1/3 h-px bg-foreground/25" />
								<div className="absolute left-0 right-0 top-2/3 h-px bg-foreground/25" />
							</div>
						</div>
					</div>
				</div>

				<p className="mt-2 text-xs text-muted-foreground">
					Esto se guarda en memoria (array) hasta que pulses <b>Guardar Partido</b>.
				</p>
			</div>
		</div>
	);
}

/** ✅ Componente 1: SOLO GOLES */
export function GoalkeeperGoalsRecorder(props: Omit<BaseProps, "fixedResult">) {
	return <GoalkeeperShotRecorderBase {...props} fixedResult="goal" hintText="Toca para registrar un gol" />;
}

/** ✅ Componente 2: SOLO PARADAS */
export function GoalkeeperSavesRecorder(props: Omit<BaseProps, "fixedResult">) {
	return <GoalkeeperShotRecorderBase {...props} fixedResult="save" hintText="Toca para registrar una parada" />;
}

function ShotDot({ x, y, result }: { x: number; y: number; result: ShotResult }) {
	const cls = result === "goal" ? "bg-destructive" : result === "save" ? "bg-emerald-600" : "bg-blue-600";

	return (
		<div
			className={cn("absolute -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-background/60 shadow-sm", cls)}
			style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
			title={result}
		/>
	);
}
