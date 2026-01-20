"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ShotResult = "goal" | "save";

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
	fixedResult: ShotResult;
	hintText?: string;
};

function GoalkeeperShotRecorderBase({ goalkeeperPlayerId, shots, onChangeShots, fixedResult, hintText = "Toca dentro para registrar" }: BaseProps) {
	// ✅ nunca trabajes con undefined
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

	const goalInnerRef = React.useRef<HTMLDivElement | null>(null);

	const addShotAtClientPoint = React.useCallback(
		(clientX: number, clientY: number) => {
			const el = goalInnerRef.current;
			if (!el) return;

			const rect = el.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;

			const x = clamp01((clientX - rect.left) / rect.width);
			const y = clamp01((clientY - rect.top) / rect.height);

			const shot_index = nextIndexFor(safeShots);

			const next: GoalkeeperShotDraft[] = [
				...safeShots,
				{
					goalkeeper_player_id: goalkeeperPlayerId,
					shot_index,
					result: fixedResult,
					x,
					y
				}
			];

			safeOnChange(next);
		},
		[safeShots, safeOnChange, goalkeeperPlayerId, fixedResult, nextIndexFor]
	);

	const onPointerDown = (e: React.PointerEvent) => {
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
					Registrando: <b>{fixedResult === "goal" ? "Goles" : "Paradas"}</b>
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
				{/* ✅ menos alto: ajusta a tu gusto */}
				<div className="w-full max-w-full h-[min(30vh,340px)]">
					<div
						role="button"
						aria-label="Portería interactiva"
						className={cn("relative mx-auto h-full", "w-auto max-w-full", "aspect-[4/3]", "select-none", "rounded-xl border bg-muted/10")}
					>
						{/* ✅ MARCO: palos “correctos” (mismo grosor), base inferior más fina */}
						<div className="pointer-events-none absolute left-[10%] right-[10%] top-[12%] h-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute left-[10%] top-[12%] bottom-[28%] w-[10px] rounded bg-foreground/80 shadow-md" />
						<div className="pointer-events-none absolute right-[10%] top-[12%] bottom-[28%] w-[10px] rounded bg-foreground/80 shadow-md" />
						{/* Base inferior fina */}
						<div className="pointer-events-none absolute left-[10%] right-[10%] bottom-[28%] h-[4px] rounded bg-foreground/70 shadow-sm" />

						{/* ✅ ÁREA CLICABLE: EXACTAMENTE dentro del marco (y red/celdas dentro) */}
						<div
							ref={goalInnerRef}
							onPointerDown={onPointerDown}
							className={cn("absolute left-[10%] right-[10%] top-[12%] bottom-[28%]", "overflow-hidden rounded-lg", "cursor-crosshair")}
							style={{ touchAction: "none" }}
						>
							{/* Fondo suave SOLO dentro */}
							<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 via-background/5 to-background/40" />

							{/* Red (malla) SOLO dentro */}
							<div
								className="pointer-events-none absolute inset-0 opacity-30"
								style={{
									backgroundImage:
										"linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
									backgroundSize: "8% 8%"
								}}
							/>

							{/* Sombra interior SOLO dentro */}
							<div className="pointer-events-none absolute inset-0 shadow-[inset_0_-18px_42px_rgba(0,0,0,0.22)]" />

							{/* ✅ Cuadrícula 3x3 SOLO dentro */}
							<div className="pointer-events-none absolute inset-0">
								<div className="absolute top-0 bottom-0 left-1/3 w-px bg-foreground/25" />
								<div className="absolute top-0 bottom-0 left-2/3 w-px bg-foreground/25" />
								<div className="absolute left-0 right-0 top-1/3 h-px bg-foreground/25" />
								<div className="absolute left-0 right-0 top-2/3 h-px bg-foreground/25" />
							</div>

							{/* Texto guía */}
							<div className="pointer-events-none absolute left-3 top-3 text-[11px] text-muted-foreground">{hintText}</div>

							{/* Puntos */}
							{shotsForThisGK.map((s) => (
								<ShotDot key={`${s.goalkeeper_player_id}-${s.shot_index}`} x={s.x} y={s.y} result={s.result} />
							))}
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
	return <GoalkeeperShotRecorderBase {...props} fixedResult="goal" hintText="Toca dentro para registrar un gol" />;
}

/** ✅ Componente 2: SOLO PARADAS */
export function GoalkeeperSavesRecorder(props: Omit<BaseProps, "fixedResult">) {
	return <GoalkeeperShotRecorderBase {...props} fixedResult="save" hintText="Toca dentro para registrar una parada" />;
}

function ShotDot({ x, y, result }: { x: number; y: number; result: ShotResult }) {
	const cls = result === "goal" ? "bg-destructive" : "bg-emerald-600";
	return (
		<div
			className={cn("absolute -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-background/60 shadow-sm", cls)}
			style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
			title={result}
		/>
	);
}
