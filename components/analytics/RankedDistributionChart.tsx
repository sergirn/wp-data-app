"use client";

import { cn } from "@/lib/utils";

export type DistributionItem = {
	key: string;
	label: string;
	value: number;
	pct: number;
	color: string;
};

type RankedDistributionChartProps = {
	items: DistributionItem[];
	compact?: boolean;
	className?: string;
};

export function RankedDistributionChart({ items, compact = false, className }: RankedDistributionChartProps) {
	const ranked = [...items].filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
	const maxValue = Math.max(1, ...ranked.map((item) => item.value));

	return (
		<div className={cn("flex w-full flex-col justify-center", compact ? "min-h-[250px] gap-2 sm:min-h-[270px] xl:min-h-[290px]" : "min-h-[340px] gap-3 sm:min-h-[380px] xl:min-h-[420px]", className)}>
			{ranked.map((item, index) => (
				<div key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
					<div className="flex min-w-0 items-center gap-2">
						<span className="w-4 shrink-0 text-right text-[10px] font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
						<span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
						<span className="truncate text-xs font-medium sm:text-sm" title={item.label}>{item.label}</span>
					</div>
					<div className="flex items-baseline gap-1.5 text-right">
						<span className="text-sm font-bold tabular-nums">{item.value}</span>
						<span className="w-10 text-[10px] tabular-nums text-muted-foreground sm:text-xs">{Math.round(item.pct)}%</span>
					</div>
					<div className="col-span-2 ml-6 h-2 overflow-hidden rounded-full bg-muted sm:h-2.5">
						<div className="h-full min-w-1 rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, (item.value / maxValue) * 100)}%`, backgroundColor: item.color }} />
					</div>
				</div>
			))}
		</div>
	);
}
