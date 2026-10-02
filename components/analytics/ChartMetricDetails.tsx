"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type ChartMetricDetailsProps = {
	children: ReactNode;
	count?: number;
	defaultOpen?: boolean;
	className?: string;
};

export function ChartMetricDetails({ children, count, defaultOpen = false, className }: ChartMetricDetailsProps) {
	const t = useTranslations("ChartTemplates");
	const [open, setOpen] = useState(defaultOpen);

	const stopCardOpen = (event: MouseEvent<HTMLElement>) => event.stopPropagation();

	return (
		<div className={cn("overflow-hidden rounded-xl border bg-muted/10", className)} onClick={stopCardOpen}>
			<button
				type="button"
				className="flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
				onClick={(event) => {
					event.stopPropagation();
					setOpen((current) => !current);
				}}
				aria-expanded={open}
			>
				<span className="flex min-w-0 items-center gap-2 text-xs font-semibold">
					<LayoutGrid className="size-3.5 shrink-0 text-primary" />
					<span className="truncate">{open ? t("hideMetrics") : t("showMetrics")}</span>
					{typeof count === "number" ? <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] tabular-nums text-primary">{count}</span> : null}
				</span>
				<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
			</button>

			{open ? <div className="border-t p-2 sm:p-3">{children}</div> : null}
		</div>
	);
}
