"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { DisciplineChart } from "./DisciplineChart";
import { PositiveActionsChart } from "./PositiveActionsChart";
import { NegativeActionsChart } from "./NegativeActionsChart";
import { ManAdvantageChart } from "./ManAdvantageChart";
import { PenaltiesChart } from "./PenaltiesChart";
import { GoalsAndShotsChart } from "./ShootingEfficiencyPlayerChart";

interface Props {
  matches: any[];
  stats: any[];
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function StatsCharts6x6({ matches, stats }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);
  const railRef = useRef<HTMLDivElement | null>(null);

  // ✅ Responsive perPage: móvil 1, tablet 2, desktop 3
  useEffect(() => {
    const mqLg = window.matchMedia("(min-width: 1024px)"); // lg
    const mqSm = window.matchMedia("(min-width: 640px)"); // sm

    const compute = () => {
      if (mqLg.matches) return 3;
      if (mqSm.matches) return 2;
      return 1;
    };

    const apply = () => setPerPage(compute());
    apply();

    const onChange = () => apply();

    if (mqLg.addEventListener) {
      mqLg.addEventListener("change", onChange);
      mqSm.addEventListener("change", onChange);
      return () => {
        mqLg.removeEventListener("change", onChange);
        mqSm.removeEventListener("change", onChange);
      };
    } else {
      // Safari viejo
      mqLg.addListener(onChange);
      mqSm.addListener(onChange);
      return () => {
        mqLg.removeListener(onChange);
        mqSm.removeListener(onChange);
      };
    }
  }, []);

  const cards = useMemo(() => {
    return [
      <GoalsAndShotsChart key="shots" matches={matches} stats={stats} />,
      <DisciplineChart key="disc" matches={matches} stats={stats} />,
      <PositiveActionsChart key="pos" matches={matches} stats={stats} />,
      <NegativeActionsChart key="neg" matches={matches} stats={stats} />,
      <ManAdvantageChart key="man" matches={matches} stats={stats} />,
      <PenaltiesChart key="pen" matches={matches} stats={stats} />,
    ] as React.ReactNode[];
  }, [matches, stats]);

  const pages = useMemo(() => chunk(cards, perPage), [cards, perPage]);
  const totalPages = pages.length;

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  const scrollToPage = (next: number) => {
    const clamped = Math.max(0, Math.min(next, totalPages - 1));
    setPage(clamped);

    const el = railRef.current;
    if (!el) return;

    const w = el.clientWidth;
    el.scrollTo({ left: clamped * w, behavior: "smooth" });
  };

  const onPrev = () => scrollToPage(page - 1);
  const onNext = () => scrollToPage(page + 1);

  const onScroll = () => {
    const el = railRef.current;
    if (!el) return;

    const w = el.clientWidth || 1;
    const next = Math.round(el.scrollLeft / w);
    if (next !== page) setPage(next);
  };

  return (
    <section className="space-y-4">
      {/* Header + Controles */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold leading-tight">Gráficas</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {cards.length} charts · página {totalPages ? page + 1 : 0}/{totalPages || 0}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="icon" onClick={onPrev} disabled={page <= 0} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={onNext}
            disabled={page >= totalPages - 1}
            aria-label="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Rail */}
      <div
        ref={railRef}
        onScroll={onScroll}
        className="
          w-full overflow-x-auto scroll-smooth
          snap-x snap-mandatory
          [scrollbar-width:none] [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        <div className="flex">
          {pages.map((group, idx) => (
            <div key={idx} className="w-full shrink-0 snap-start">
              {/* ✅ Coincide con perPage: móvil 1, tablet 2, desktop 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.map((node, i) => (
                  <div key={i} className="min-w-0">
                    {node}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots (más pequeños en móvil) */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              className={`
                rounded-full transition
                h-1.5 w-1.5 sm:h-2 sm:w-2
                ${i === page ? "bg-foreground" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}
              `}
              aria-label={`Ir a página ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
