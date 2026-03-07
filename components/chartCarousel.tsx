"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ChartSwipeCarouselProps = {
	items: React.ReactNode[];
	className?: string;
	dotsClassName?: string;
	arrows?: boolean;
};

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

export function ChartSwipeCarousel({ items, className, dotsClassName, arrows = true }: ChartSwipeCarouselProps) {
	const railRef = useRef<HTMLDivElement | null>(null);
	const [page, setPage] = useState(0);

	// Drag con ratón
	const isDownRef = useRef(false);
	const startXRef = useRef(0);
	const startLeftRef = useRef(0);
	const draggedRef = useRef(false);

	const totalPages = items?.length ?? 0;
	const DRAG_THRESHOLD = 8;

	const getCurrentPage = () => {
		const el = railRef.current;
		if (!el) return 0;
		const w = el.clientWidth || 1;
		return clamp(Math.round(el.scrollLeft / w), 0, Math.max(totalPages - 1, 0));
	};

	const scrollToPage = (next: number, behavior: ScrollBehavior = "smooth") => {
		const el = railRef.current;
		if (!el) return;

		const clamped = clamp(next, 0, Math.max(totalPages - 1, 0));
		setPage(clamped);
		el.scrollTo({ left: clamped * el.clientWidth, behavior });
	};

	const prevPage = () => {
		scrollToPage(getCurrentPage() - 1);
	};

	const nextPage = () => {
		scrollToPage(getCurrentPage() + 1);
	};

	const syncPageFromScroll = () => {
		const el = railRef.current;
		if (!el) return;

		const w = el.clientWidth || 1;
		const next = clamp(Math.round(el.scrollLeft / w), 0, Math.max(totalPages - 1, 0));

		setPage((prev) => (prev !== next ? next : prev));
	};

	// Ajuste en resize: re-snap a la página actual
	useEffect(() => {
		const el = railRef.current;
		if (!el) return;

		const ro = new ResizeObserver(() => {
			scrollToPage(getCurrentPage(), "auto");
		});

		ro.observe(el);
		return () => ro.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [totalPages]);

	// Mouse drag handlers
	const onMouseDown = (e: React.MouseEvent) => {
		const el = railRef.current;
		if (!el) return;

		isDownRef.current = true;
		draggedRef.current = false;
		startXRef.current = e.pageX;
		startLeftRef.current = el.scrollLeft;

		document.body.style.userSelect = "none";
		document.body.style.cursor = "grabbing";
	};

	const onMouseMove = (e: React.MouseEvent) => {
		const el = railRef.current;
		if (!el || !isDownRef.current) return;

		const dx = e.pageX - startXRef.current;

		if (Math.abs(dx) > DRAG_THRESHOLD) {
			draggedRef.current = true;
		}

		if (draggedRef.current) {
			el.scrollLeft = startLeftRef.current - dx;
		}
	};

	const endDrag = () => {
		const el = railRef.current;
		if (!el || !isDownRef.current) return;

		isDownRef.current = false;
		document.body.style.userSelect = "";
		document.body.style.cursor = "";

		// Si solo fue un click, no forzar snap
		if (!draggedRef.current) return;

		const w = el.clientWidth || 1;
		const next = clamp(Math.round(el.scrollLeft / w), 0, Math.max(totalPages - 1, 0));
		scrollToPage(next, "smooth");

		// reseteo en el siguiente tick para no interferir con eventos click
		requestAnimationFrame(() => {
			draggedRef.current = false;
		});
	};

	if (!totalPages) return null;

	const isFirst = page === 0;
	const isLast = page === totalPages - 1;

	return (
		<div className={`h-full min-h-0 flex flex-col ${className ?? ""}`}>
			<div className="relative flex-1 min-h-0">
				{/* Flecha izquierda */}
				{arrows && totalPages > 1 ? (
					<button
						type="button"
						onClick={prevPage}
						disabled={isFirst}
						aria-label="Ir al gráfico anterior"
						className={[
							"absolute left-2 top-1/2 -translate-y-1/2 z-20",
							"hidden sm:inline-flex items-center justify-center",
							"h-9 w-9 rounded-full border bg-background/85 backdrop-blur-sm",
							"shadow-sm transition",
							isFirst ? "pointer-events-none opacity-35" : "hover:bg-background active:scale-[0.98]",
							"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
						].join(" ")}
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
				) : null}

				{/* Flecha derecha */}
				{arrows && totalPages > 1 ? (
					<button
						type="button"
						onClick={nextPage}
						disabled={isLast}
						aria-label="Ir al siguiente gráfico"
						className={[
							"absolute right-2 top-1/2 -translate-y-1/2 z-20",
							"hidden sm:inline-flex items-center justify-center",
							"h-9 w-9 rounded-full border bg-background/85 backdrop-blur-sm",
							"shadow-sm transition",
							isLast ? "pointer-events-none opacity-35" : "hover:bg-background active:scale-[0.98]",
							"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
						].join(" ")}
					>
						<ChevronRight className="h-4 w-4" />
					</button>
				) : null}

				{/* Rail */}
				<div
					ref={railRef}
					onScroll={syncPageFromScroll}
					onMouseDown={onMouseDown}
					onMouseMove={onMouseMove}
					onMouseUp={endDrag}
					onMouseLeave={endDrag}
					onDragStart={(e) => e.preventDefault()}
					onClick={(e) => {
						if (draggedRef.current) {
							e.preventDefault();
							e.stopPropagation();
						}
					}}
					className={`
						flex-1 min-h-0 h-full
						w-full overflow-x-auto
						snap-x snap-mandatory
						scroll-smooth
						touch-pan-x
						cursor-grab active:cursor-grabbing
						[scrollbar-width:none] [-ms-overflow-style:none]
						[&::-webkit-scrollbar]:hidden
					`}
				>
					<div className="flex h-full">
						{items.map((node, idx) => (
							<div key={idx} className="w-full shrink-0 snap-start h-full min-h-0">
								<div className="h-full min-h-0">{node}</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Dots */}
			{totalPages > 1 ? (
				<div className={`flex items-center justify-center mt-3 ${dotsClassName ?? ""}`}>
					<div className="flex items-center justify-center gap-2 rounded-full px-2 py-1">
						{Array.from({ length: totalPages }).map((_, i) => {
							const active = i === page;

							return (
								<button
									key={i}
									type="button"
									onClick={() => scrollToPage(i)}
									aria-label={`Ir a página ${i + 1}`}
									className={[
										"inline-flex items-center justify-center shrink-0",
										"p-0 m-0 border-0 bg-transparent",
										"leading-none align-middle",
										"h-5 w-5",
										"before:content-[''] before:block before:rounded-full",
										"before:h-2 before:w-2",
										"before:transition-colors",
										active ? "before:bg-foreground" : "before:bg-muted-foreground/30 hover:before:bg-muted-foreground/50",
										"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
									].join(" ")}
								/>
							);
						})}
					</div>
				</div>
			) : null}
		</div>
	);
}
