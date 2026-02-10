"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AttackBlock } from "./cards-templates/AttackBlock";
import { DefenseBlock } from "./cards-templates/DefenseBlock";
import { GoalkeeperBlock } from "./cards-templates/GoalkeeperBlock";
import { PlayerStatCard } from "./PlayerStatCard";
import { CustomStatCardDialog } from "./CustomStatCardDialog";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MostExpelledFeaturedCard } from "./cards-templates/MostExpelledBlock";
import { MostAssistsFeaturedCard } from "./cards-templates/MostAssistsBlock";
import { MostRecoveriesFeaturedCard } from "./cards-templates/MostRecoveriesBlock";
import { BestPenaltyFeaturedCard } from "./cards-templates/BestPenaltyBlock";

interface TeamDashboardProps {
	teamStats?: any;
}

function chunk<T>(arr: T[], size: number) {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

const toNum = (v: any) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function TeamDashboard({ teamStats }: TeamDashboardProps) {
	const [customCards, setCustomCards] = useState<Array<{ statField: string; statLabel: string }>>([]);
	const [page, setPage] = useState(0);
	const [perPage, setPerPage] = useState(3);
	const railRef = useRef<HTMLDivElement | null>(null);

	const playerStats =
		(Array.isArray(teamStats) && teamStats) ||
		(Array.isArray(teamStats?.playerStats) && teamStats.playerStats) ||
		(Array.isArray(teamStats?.players) && teamStats.players) ||
		[];

	const fieldPlayers = playerStats.filter((p: any) => !p.is_goalkeeper);
	const goalkeepers = playerStats.filter((p: any) => p.is_goalkeeper);

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

		// compat Safari viejo
		if (mqLg.addEventListener) {
			mqLg.addEventListener("change", onChange);
			mqSm.addEventListener("change", onChange);
			return () => {
				mqLg.removeEventListener("change", onChange);
				mqSm.removeEventListener("change", onChange);
			};
		} else {
			mqLg.addListener(onChange);
			mqSm.addListener(onChange);
			return () => {
				mqLg.removeListener(onChange);
				mqSm.removeListener(onChange);
			};
		}
	}, []);

	const cards = useMemo(() => {
		const items: React.ReactNode[] = [];

		const bestEfficiency = [...(fieldPlayers ?? [])]
			.filter((p: any) => toNum(p.totalTiros) >= 10)
			.sort((a: any, b: any) => toNum(b.eficiencia) - toNum(a.eficiencia))
			.slice(0, 10);

		const topEfficiencyPlayer = bestEfficiency[0] ?? null;

		if (topEfficiencyPlayer) items.push(<AttackBlock key="attack" playerStats={fieldPlayers} />);
		if (topEfficiencyPlayer) items.push(<DefenseBlock key="defense" playerStats={fieldPlayers} />);
		if (topEfficiencyPlayer) items.push(<GoalkeeperBlock key="gk" playerStats={goalkeepers} />);

		// Destacados
		if (fieldPlayers.length > 0) items.push(<MostExpelledFeaturedCard key="exp" playerStats={fieldPlayers} />);
		if (fieldPlayers.length > 0) items.push(<MostAssistsFeaturedCard key="assist" playerStats={fieldPlayers} />);
		if (fieldPlayers.length > 0) items.push(<MostRecoveriesFeaturedCard key="rec" playerStats={fieldPlayers} />);
		if (fieldPlayers.length > 0) items.push(<BestPenaltyFeaturedCard key="pen" playerStats={fieldPlayers} />);

		return items;
	}, [fieldPlayers, goalkeepers, customCards]);

	// ✅ 2) Paginamos según breakpoint
	const pages = useMemo(() => chunk(cards, perPage), [cards, perPage]);
	const totalPages = pages.length;

	// si cambia el número de páginas, ajustamos la página actual
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

	// sincroniza page al hacer swipe/scroll manual
	const onScroll = () => {
		const el = railRef.current;
		if (!el) return;
		const w = el.clientWidth || 1;
		const next = Math.round(el.scrollLeft / w);
		if (next !== page) setPage(next);
	};

	return (
		<section className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h3 className="text-base sm:text-lg font-semibold leading-tight">Destacados</h3>
					<p className="text-xs sm:text-sm text-muted-foreground">
						{cards.length} cards · página {totalPages ? page + 1 : 0}/{totalPages || 0}
					</p>
				</div>

				{/* Controles */}
				<div className="flex items-center gap-2">
					<Button type="button" size="icon" onClick={onPrev} disabled={page <= 0} aria-label="Anterior">
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button type="button" size="icon" onClick={onNext} disabled={page >= totalPages - 1} aria-label="Siguiente">
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
        "
			>
				<div className="[&::-webkit-scrollbar]:hidden" />

				<div className="flex">
					{pages.map((group, idx) => (
						<div key={idx} className="w-full shrink-0 snap-start px-0">
							{/* ✅ Coincide con perPage: móvil 1, tablet 2, desktop 3 */}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

			{/* Dots */}
			{totalPages > 1 ? (
				<div className="flex items-center justify-center gap-2">
					{Array.from({ length: totalPages }).map((_, i) => (
						<button
							key={i}
							type="button"
							onClick={() => scrollToPage(i)}
							className={`
                h-2 w-2 rounded-full transition
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
