"use client";

import { useMemo, useState } from "react";
import {
	BicepsFlexed,
	Hand,
	HandMetal,
	ListOrdered,
	Trash2,
	UserPlus,
	UserRoundMinus,
	Volleyball,
	X,
	type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MatchAction, Player } from "@/lib/types";

type PlayerSummary = Pick<Player, "id" | "name" | "number" | "photo_url">;

type MatchChronologyProps = {
	actions: MatchAction[];
	players: PlayerSummary[];
	showAll?: boolean;
	defaultQuarter?: 1 | 2 | 3 | 4;
	activeQuarter?: 1 | 2 | 3 | 4 | null;
	onRemove?: (action: MatchAction) => void;
};

type ActionPresentation = {
	Icon: LucideIcon;
	iconClassName: string;
	labelClassName: string;
	showMiss?: boolean;
};

const GOAL_ACTION_PARTS = ["goles_", "gol_", "portero_gol", "recibir_gol", "gol_recibido"];

function getActionPresentation(actionKey: string): ActionPresentation {
	const key = actionKey.toLowerCase();
	const isGoal = GOAL_ACTION_PARTS.some((part) => key.includes(part)) && !key.includes("fallo") && !key.includes("fallado");
	const isGoalkeeperSave = key.startsWith("portero_") && (key.includes("parada") || key.includes("paradas") || key.includes("bloqueo"));
	const isMissedShot =
		key.startsWith("tiro_") ||
		key.startsWith("tiros_") ||
		key.includes("fallo") ||
		key.includes("fallado") ||
		key.includes("_fuera") ||
		key.includes("_palo") ||
		key.includes("bloqueado");
	const isExpulsion = key.includes("exp_") || key.includes("expulsion") || key.includes("penalti_provocado") || key === "faltas_penalti";
	const isSuperiority = key.includes("superioridad") || key.includes("hombre_mas") || key.endsWith("_sup");
	const isInferiority = key.includes("inferioridad") || key.includes("hombre_menos") || key.endsWith("_inf");

	if (isGoal) {
		return {
			Icon: Volleyball,
			iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
			labelClassName: "bg-emerald-500/8 text-emerald-800 dark:text-emerald-200"
		};
	}

	if (isGoalkeeperSave) {
		return {
			Icon: Hand,
			iconClassName: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
			labelClassName: "bg-sky-500/8 text-sky-800 dark:text-sky-200"
		};
	}

	if (isMissedShot) {
		return {
			Icon: Volleyball,
			iconClassName: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
			labelClassName: "bg-rose-500/8 text-rose-800 dark:text-rose-200",
			showMiss: true
		};
	}

	if (isExpulsion) {
		return {
			Icon: HandMetal,
			iconClassName: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
			labelClassName: "bg-amber-500/8 text-amber-900 dark:text-amber-200"
		};
	}

	if (isSuperiority) {
		return {
			Icon: UserPlus,
			iconClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
			labelClassName: "bg-violet-500/8 text-violet-800 dark:text-violet-200"
		};
	}

	if (isInferiority) {
		return {
			Icon: UserRoundMinus,
			iconClassName: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
			labelClassName: "bg-orange-500/8 text-orange-800 dark:text-orange-200"
		};
	}

	return {
		Icon: BicepsFlexed,
		iconClassName: "bg-primary/10 text-primary",
		labelClassName: "bg-primary/8 text-foreground"
	};
}

export function MatchChronology({
	actions,
	players,
	showAll = false,
	defaultQuarter = 1,
	activeQuarter = null,
	onRemove
}: MatchChronologyProps) {
	const t = useTranslations("MatchChronology");
	const statT = useTranslations("StatLabels");
	const [selected, setSelected] = useState(showAll ? "all" : String(defaultQuarter));
	const [playerFilter, setPlayerFilter] = useState("all");
	const [actionFilter, setActionFilter] = useState("all");
	const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
	const orderedActions = useMemo(() => [...actions].sort((a, b) => a.sequence - b.sequence), [actions]);
	const quarterActions = selected === "all"
		? orderedActions
		: orderedActions.filter((action) => action.quarter === Number(selected));
	const visibleActions = quarterActions.filter((action) =>
		(playerFilter === "all" || action.player_id === Number(playerFilter)) &&
		(actionFilter === "all" || action.action_key === actionFilter)
	);
	const actionKeys = useMemo(() => Array.from(new Set(actions.map((action) => action.action_key))).sort(), [actions]);
	const quarterSummary = useMemo(() => ([1, 2, 3, 4] as const).map((quarter) => ({
		quarter,
		count: actions.filter((action) => action.quarter === quarter).length,
		players: new Set(actions.filter((action) => action.quarter === quarter).map((action) => action.player_id)).size
	})), [actions]);

	const actionLabel = (key: string) => statT.has(key) ? statT(key) : key.replaceAll("_", " ");

	return (
		<Tabs value={selected} onValueChange={setSelected} className="w-full">
			{showAll ? (
				<div className="space-y-3">
					<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
						{quarterSummary.map((summary) => (
							<button
								type="button"
								key={summary.quarter}
								onClick={() => setSelected(String(summary.quarter))}
								className="rounded-xl border bg-muted/15 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
							>
								<p className="text-xs font-semibold text-muted-foreground">{t("quarter", { number: summary.quarter })}</p>
								<p className="mt-1 text-lg font-bold tabular-nums">{summary.count}</p>
								<p className="text-[11px] text-muted-foreground">{t("playersInvolved", { count: summary.players })}</p>
							</button>
						))}
					</div>
					<div className="grid gap-2 rounded-xl border bg-muted/10 p-3 sm:grid-cols-2">
						<label className="space-y-1">
							<span className="text-xs font-semibold text-muted-foreground">{t("filterPlayer")}</span>
							<select value={playerFilter} onChange={(event) => setPlayerFilter(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
								<option value="all">{t("allPlayers")}</option>
								{players.map((player) => <option key={player.id} value={player.id}>#{player.number} · {player.name}</option>)}
							</select>
						</label>
						<label className="space-y-1">
							<span className="text-xs font-semibold text-muted-foreground">{t("filterAction")}</span>
							<select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
								<option value="all">{t("allActions")}</option>
								{actionKeys.map((key) => <option key={key} value={key}>{actionLabel(key)}</option>)}
							</select>
						</label>
					</div>
				</div>
			) : null}
			<TabsList className={`grid h-auto w-full ${showAll ? "grid-cols-5" : "grid-cols-4"}`}>
				{showAll ? <TabsTrigger value="all" className="text-xs sm:text-sm">{t("all")}</TabsTrigger> : null}
				{([1, 2, 3, 4] as const).map((quarter) => {
					const count = actions.filter((action) => action.quarter === quarter).length;
					return (
						<TabsTrigger key={quarter} value={String(quarter)} className="gap-1 text-xs sm:text-sm">
							Q{quarter}
							<span className="text-[10px] text-muted-foreground">({count})</span>
						</TabsTrigger>
					);
				})}
			</TabsList>

			<TabsContent value={selected} className="mt-3">
				{visibleActions.length === 0 ? (
					<div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-4 text-center">
						<ListOrdered className="mb-2 size-5 text-muted-foreground" />
						<p className="text-sm font-medium">{t("emptyTitle")}</p>
						<p className="mt-1 text-xs text-muted-foreground">{t("emptyDescription")}</p>
					</div>
				) : (
					<div className="max-h-[32rem] overflow-y-auto overscroll-contain rounded-xl border bg-card">
						{visibleActions.map((action, index) => {
							const player = playersById.get(action.player_id);
							const presentation = getActionPresentation(action.action_key);
							const ActionIcon = presentation.Icon;
							return (
								<div
									key={action.client_id || action.id}
									className={`flex min-h-16 items-center gap-2 bg-card px-2.5 py-2.5 sm:gap-3 sm:px-3 ${index > 0 ? "border-t" : ""}`}
								>
									<div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
										<span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{String(action.sequence).padStart(2, "0")}</span>
										<Badge variant={activeQuarter === action.quarter ? "default" : "secondary"} className="h-5 px-1.5 text-[9px]">Q{action.quarter}</Badge>
									</div>
									<div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.9fr)] sm:items-center sm:gap-3">
										<div className="flex min-w-0 items-center gap-2.5">
											<Avatar className="size-9 shrink-0 border bg-muted shadow-sm sm:size-10">
												{player?.photo_url ? (
													<AvatarImage src={player.photo_url} alt={player.name} className="object-cover object-top" />
												) : null}
												<AvatarFallback className="text-[10px] font-bold text-muted-foreground">
													{player ? `#${player.number}` : "?"}
												</AvatarFallback>
											</Avatar>
											<p className="truncate text-sm font-semibold text-foreground">
												{player ? `#${player.number} · ${player.name}` : t("unknownPlayer")}
											</p>
										</div>
										<div className="flex min-w-0 items-center gap-2">
											<span className={`relative flex size-9 shrink-0 items-center justify-center rounded-lg ${presentation.iconClassName}`} aria-hidden="true">
												<ActionIcon className="size-4.5" />
												{presentation.showMiss ? (
													<span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-rose-500/25">
														<X className="size-2.5 stroke-[3] text-rose-600 dark:text-rose-400" />
													</span>
												) : null}
											</span>
											<p className={`min-w-0 flex-1 rounded-md px-2 py-1 text-xs font-semibold leading-tight sm:truncate sm:text-sm ${presentation.labelClassName}`}>
												{actionLabel(action.action_key)}
											</p>
										</div>
									</div>
									{onRemove ? (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
											onClick={() => onRemove(action)}
											aria-label={t("removeAction")}
										>
											<Trash2 className="size-4" />
										</Button>
									) : null}
								</div>
							);
						})}
					</div>
				)}
			</TabsContent>
		</Tabs>
	);
}
