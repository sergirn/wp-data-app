"use client";

import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Crosshair, Hand, Sparkles, Target } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { GOALKEEPER_STATS } from "@/lib/stats/goalkeeperStatsConfig";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { matches?: { match_date?: string | null } | null };
const value = (row: Row, key: string) => Math.max(0, Number((row as Record<string, unknown>)[key]) || 0);
const sum = (rows: Row[], keys: string[]) => rows.reduce((total, row) => total + keys.reduce((subtotal, key) => subtotal + value(row, key), 0), 0);
const percent = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;
const saveKeys = GOALKEEPER_STATS.filter((item) => item.countsAsSave).map((item) => item.key);
const concededKeys = GOALKEEPER_STATS.filter((item) => item.countsAsGoalConceded).map((item) => item.key);

export function PlayerTrendPanel({ matchStats, isGoalkeeper }: { matchStats: Row[]; isGoalkeeper: boolean }) {
	const t = useTranslations("PlayerTrends");
	const data = useMemo(() => {
		const ordered = [...matchStats].sort((a, b) => Date.parse(b.matches?.match_date ?? "") - Date.parse(a.matches?.match_date ?? ""));
		const recent = ordered.slice(0, 5);
		const previous = ordered.slice(5, 10);
		const calculate = (rows: Row[]) => {
			if (isGoalkeeper) {
				const saves = sum(rows, saveKeys);
				const conceded = sum(rows, concededKeys);
				return [
					{ key: "savePercentage", icon: Hand, value: percent(saves, saves + conceded), suffix: "%", inverse: false },
					{ key: "savesPerMatch", icon: Activity, value: rows.length ? saves / rows.length : 0, suffix: "", inverse: false },
					{ key: "concededPerMatch", icon: Target, value: rows.length ? conceded / rows.length : 0, suffix: "", inverse: true },
					{ key: "recoveriesPerMatch", icon: Sparkles, value: rows.length ? sum(rows, ["portero_acciones_recuperacion"]) / rows.length : 0, suffix: "", inverse: false }
				];
			}
			const goals = sum(rows, ["goles_totales"]);
			const shots = sum(rows, ["tiros_totales"]);
			return [
				{ key: "goalsPerMatch", icon: Target, value: rows.length ? goals / rows.length : 0, suffix: "", inverse: false },
				{ key: "shooting", icon: Crosshair, value: percent(goals, shots), suffix: "%", inverse: false },
				{ key: "assistsPerMatch", icon: Sparkles, value: rows.length ? sum(rows, ["acciones_asistencias"]) / rows.length : 0, suffix: "", inverse: false },
				{ key: "possessionPerMatch", icon: Activity, value: rows.length ? (sum(rows, ["acciones_recuperacion"]) - sum(rows, ["acciones_perdida_poco"])) / rows.length : 0, suffix: "", inverse: false }
			];
		};
		return { recentCount: recent.length, previousCount: previous.length, current: calculate(recent), previous: calculate(previous) };
	}, [isGoalkeeper, matchStats]);

	if (data.recentCount < 2) return null;
	return <Card className="overflow-hidden rounded-2xl border-border/70"><CardHeader><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Activity className="size-5 text-primary" />{t("title")}</CardTitle><CardDescription>{data.previousCount >= 2 ? t("description", { current: data.recentCount, previous: data.previousCount }) : t("shortDescription", { count: data.recentCount })}</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">{data.current.map((metric, index) => {
		const previous = data.previous[index]?.value ?? 0;
		const delta = metric.value - previous;
		const neutral = data.previousCount < 2 || Math.abs(delta) < 0.05;
		const positive = metric.inverse ? delta < 0 : delta > 0;
		const Icon = metric.icon;
		return <div key={metric.key} className="rounded-xl border bg-muted/[0.12] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{t(`metrics.${metric.key}`)}</p><Icon className="size-4 text-primary" /></div><p className="mt-2 text-xl font-bold tabular-nums">{metric.value.toFixed(metric.suffix ? 0 : 1)}{metric.suffix}</p>{data.previousCount >= 2 && <p className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium", neutral ? "text-muted-foreground" : positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{neutral ? <ArrowRight className="size-3" /> : delta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{t("delta", { value: Math.abs(delta).toFixed(metric.suffix ? 0 : 1) })}</p>}</div>;
	})}</CardContent></Card>;
}
