"use client";

import React, { useEffect, useRef, useState } from "react";

type ChartSwipeCarouselProps = {
  items: React.ReactNode[];
  className?: string;
  dotsClassName?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function ChartSwipeCarousel({ items, className, dotsClassName }: ChartSwipeCarouselProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);

  // Drag con ratón
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startLeftRef = useRef(0);

  const totalPages = items?.length ?? 0;

  const scrollToPage = (next: number, behavior: ScrollBehavior = "smooth") => {
    const el = railRef.current;
    if (!el) return;
    const clamped = clamp(next, 0, Math.max(totalPages - 1, 0));
    setPage(clamped);
    el.scrollTo({ left: clamped * el.clientWidth, behavior });
  };

  const syncPageFromScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const next = clamp(Math.round(el.scrollLeft / w), 0, Math.max(totalPages - 1, 0));
    if (next !== page) setPage(next);
  };

  // Ajuste en resize: re-snap a la página actual
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      scrollToPage(page, "auto");
    });

    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);

  // Mouse drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    const el = railRef.current;
    if (!el) return;
    isDownRef.current = true;
    startXRef.current = e.pageX;
    startLeftRef.current = el.scrollLeft;

    // evita seleccionar texto mientras arrastras
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const el = railRef.current;
    if (!el || !isDownRef.current) return;
    const dx = e.pageX - startXRef.current;
    el.scrollLeft = startLeftRef.current - dx;
  };

  const endDrag = () => {
    const el = railRef.current;
    if (!el) return;
    if (!isDownRef.current) return;

    isDownRef.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    // Snap “duro” a la página más cercana
    const w = el.clientWidth || 1;
    const next = clamp(Math.round(el.scrollLeft / w), 0, Math.max(totalPages - 1, 0));
    scrollToPage(next, "smooth");
  };

  if (!totalPages) return null;

  return (
    <div className={`h-full min-h-0 flex flex-col ${className ?? ""}`}>
      {/* Rail */}
      <div
        ref={railRef}
        onScroll={syncPageFromScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className={`
          flex-1 min-h-0
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

      {/* Dots */}
      {totalPages > 1 ? (
        <div className={`flex items-center justify-center gap-2 mt-3 ${dotsClassName ?? ""}`}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              className={`h-2 w-2 rounded-full transition ${
                i === page ? "bg-foreground" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Ir a página ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
