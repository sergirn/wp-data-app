"use client";

import type { ReactNode } from "react";
import { BarChart3, LayoutDashboard, ListOrdered, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type WorkspaceView = "summary" | "analysis" | "timeline" | "players";

type Props = {
	summary: ReactNode;
	analysis: ReactNode;
	timeline: ReactNode;
	players: ReactNode;
};

const views: WorkspaceView[] = ["summary", "analysis", "timeline", "players"];

export function MatchDetailWorkspace({ summary, analysis, timeline, players }: Props) {
	const t = useTranslations("MatchWorkspace");
	const searchParams = useSearchParams();
	const requestedView = searchParams.get("view");
	const activeView = views.includes(requestedView as WorkspaceView) ? (requestedView as WorkspaceView) : "summary";

	const changeView = (view: string) => {
		const url = new URL(window.location.href);
		if (view === "summary") url.searchParams.delete("view");
		else url.searchParams.set("view", view);
		window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
	};

	return (
		<Tabs value={activeView} onValueChange={changeView} className="gap-0">
			<div className="sticky top-14 z-20 -mx-4 mb-5 border-y bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:rounded-2xl sm:border sm:p-1.5">
				<div>
					<TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-4">
						<WorkspaceTrigger value="summary" icon={LayoutDashboard} label={t("summary")} />
						<WorkspaceTrigger value="analysis" icon={BarChart3} label={t("analysis")} />
						<WorkspaceTrigger value="timeline" icon={ListOrdered} label={t("timeline")} />
						<WorkspaceTrigger value="players" icon={Users} label={t("players")} />
					</TabsList>
				</div>
			</div>

			<TabsContent value="summary" className="mt-0 space-y-5">{summary}</TabsContent>
			<TabsContent value="analysis" className="mt-0">{analysis}</TabsContent>
			<TabsContent value="timeline" className="mt-0">{timeline}</TabsContent>
			<TabsContent value="players" className="mt-0">{players}</TabsContent>
		</Tabs>
	);
}

function WorkspaceTrigger({
	value,
	icon: Icon,
	label
}: {
	value: WorkspaceView;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}) {
	return (
		<TabsTrigger
			value={value}
			className="h-10 gap-2 rounded-xl px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm sm:h-11 sm:px-3 sm:text-sm"
		>
			<Icon className="size-4" />
			{label}
		</TabsTrigger>
	);
}
