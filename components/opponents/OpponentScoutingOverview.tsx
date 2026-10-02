"use client";

import Image from "next/image";
import { Activity, BarChart3, CheckCircle2, Database, ShieldCheck, Swords, Target, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Scouting = ReturnType<typeof import("@/lib/opponents/scouting").buildOpponentScouting>;

export function OpponentExecutiveSummary({ scouting }: { scouting: Scouting }) {
	const t = useTranslations("Opponents.overview");
	const winRate = scouting.played > 0 ? Math.round((scouting.wins / scouting.played) * 100) : 0;
	const totalResults = Math.max(1, scouting.played);
	const metrics = [
		{ icon: Swords, label: t("matches"), value: scouting.played, hint: t("selectedScope") },
		{ icon: BarChart3, label: t("record"), value: `${scouting.wins}-${scouting.draws}-${scouting.losses}`, hint: t("recordOrder") },
		{ icon: Target, label: t("winRate"), value: `${winRate}%`, hint: t("wins", { count: scouting.wins }) },
		{ icon: Activity, label: t("averageScore"), value: `${scouting.averageOwnGoals.toFixed(1)}–${scouting.averageOpponentGoals.toFixed(1)}`, hint: t("perMatch") },
		{ icon: ShieldCheck, label: t("averageDifference"), value: `${scouting.averageGoalDifference > 0 ? "+" : ""}${scouting.averageGoalDifference.toFixed(1)}`, hint: t("perMatch") },
		{ icon: Database, label: t("coverage"), value: `${scouting.dataQuality.statsCoverage}%`, hint: t("detailed", { detailed: scouting.dataQuality.detailedMatches, total: scouting.played }) }
	];

	return <div className="space-y-4">
		<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{metrics.map(({ icon: Icon, label, value, hint }) => <div key={label} className="rounded-xl border bg-card p-3.5 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4 text-primary" />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p></div>)}</div>
		<Card className="overflow-hidden">
			<CardContent className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_1.15fr] lg:items-center">
				<div>
					<div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("recordDistribution")}</p><span className="text-xs font-semibold tabular-nums">{scouting.wins}{t("resultLetters.win")} · {scouting.draws}{t("resultLetters.draw")} · {scouting.losses}{t("resultLetters.loss")}</span></div>
					<div className="flex h-2.5 overflow-hidden rounded-full bg-muted"><div className="bg-emerald-500" style={{ width: `${(scouting.wins / totalResults) * 100}%` }} /><div className="bg-amber-500" style={{ width: `${(scouting.draws / totalResults) * 100}%` }} /><div className="bg-rose-500" style={{ width: `${(scouting.losses / totalResults) * 100}%` }} /></div>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("recentForm")}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("recentFormHint")}</p></div><div className="flex gap-1.5">{scouting.recentForm.length > 0 ? scouting.recentForm.map((outcome, index) => <span key={`${outcome}-${index}`} title={t(`results.${outcome}`)} className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold", outcome === "win" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : outcome === "loss" ? "bg-rose-500/12 text-rose-700 dark:text-rose-300" : "bg-amber-500/12 text-amber-700 dark:text-amber-300")}>{t(`resultLetters.${outcome}`)}</span>) : <span className="text-sm text-muted-foreground">—</span>}</div></div>
			</CardContent>
		</Card>
	</div>;
}

export function OpponentDataQuality({ scouting }: { scouting: Scouting }) {
	const t = useTranslations("Opponents.dataQuality");
	const rows = [
		{ label: t("statistics"), value: scouting.dataQuality.statsCoverage, hint: t("statisticsHint", { count: scouting.dataQuality.detailedMatches }) },
		{ label: t("verified"), value: scouting.dataQuality.verifiedCoverage, hint: t("verifiedHint", { count: scouting.dataQuality.verifiedMatches }) },
		{ label: t("chronology"), value: scouting.dataQuality.actionCoverage, hint: t("chronologyHint", { count: scouting.dataQuality.actionMatches }) }
	];
	return <Card className="h-full"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="size-5 text-primary" />{t("title")}</CardTitle><CardDescription>{t("description")}</CardDescription></CardHeader><CardContent className="space-y-4">{rows.map((row) => <div key={row.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium">{row.label}</span><span className="font-bold tabular-nums">{row.value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", row.value >= 75 ? "bg-emerald-500" : row.value >= 40 ? "bg-amber-500" : "bg-primary")} style={{ width: `${row.value}%` }} /></div><p className="mt-1 text-[11px] text-muted-foreground">{row.hint}</p></div>)}<div className="flex items-start gap-2 rounded-xl border bg-muted/15 p-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-xs leading-relaxed text-muted-foreground">{t(`confidence.${scouting.confidence}`)}</p></div></CardContent></Card>;
}

export function OpponentPlayersTable({ scouting }: { scouting: Scouting }) {
	const t = useTranslations("Opponents.players");
	if (scouting.players.length === 0) return <Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="size-5 text-primary" />{t("title")}</CardTitle><CardDescription>{t("description")}</CardDescription></CardHeader><CardContent><p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p></CardContent></Card>;

	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardTitle className="flex items-center gap-2"><UsersRound className="size-5 text-primary" />{t("title")}</CardTitle>
				<CardDescription>{t("descriptionExtended")}</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<div className="divide-y lg:hidden">
					{scouting.players.map((player, index) => (
						<div key={player.id} className="p-4">
							<div className="flex min-w-0 items-center gap-3">
								<PlayerIdentity player={player} rank={index + 1} />
								<div className="ml-auto rounded-lg bg-primary/8 px-2.5 py-1 text-right">
									<p className="text-base font-bold tabular-nums text-primary">{player.goals}</p>
									<p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{t("columns.goals")}</p>
								</div>
							</div>
							<div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
								<MobileMetric label={t("columns.matches")} value={player.matches} />
								<MobileMetric label={t("columns.efficiency")} value={`${player.shootingEfficiency}%`} />
								<MobileMetric label={t("columns.assists")} value={player.assists} />
								<MobileMetric label={t("columns.recoveries")} value={player.recoveries} />
								<MobileMetric label={t("columns.defense")} value={player.blocks} />
								<MobileMetric label={t("columns.discipline")} value={player.exclusionsDrawn} />
							</div>
						</div>
					))}
				</div>

				<div className="hidden lg:block">
					<div className="grid grid-cols-[minmax(13rem,1.35fr)_4rem_repeat(6,minmax(5rem,.7fr))] items-center gap-2 border-y bg-muted/25 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground xl:gap-3">
						<span>{t("columns.player")}</span><span className="text-center">{t("columns.matches")}</span><span className="text-center">{t("columns.goals")}</span><span className="text-center">{t("columns.efficiency")}</span><span className="text-center">{t("columns.assists")}</span><span className="text-center">{t("columns.recoveries")}</span><span className="text-center">{t("columns.defense")}</span><span className="text-center">{t("columns.discipline")}</span>
					</div>
					{scouting.players.map((player, index) => (
						<div key={player.id} className="grid grid-cols-[minmax(13rem,1.35fr)_4rem_repeat(6,minmax(5rem,.7fr))] items-center gap-2 border-b px-5 py-3.5 last:border-0 xl:gap-3">
							<PlayerIdentity player={player} rank={index + 1} />
							<Cell value={player.matches} /><Cell value={player.goals} hint={`${player.shots} ${t("shotsShort")}`} /><Cell value={`${player.shootingEfficiency}%`} /><Cell value={player.assists} hint={`${player.assistsPerMatch.toFixed(1)}/${t("matchShort")}`} /><Cell value={player.recoveries} hint={`${player.recoveriesPerMatch.toFixed(1)}/${t("matchShort")}`} /><Cell value={player.blocks} hint={`${player.turnovers} ${t("turnoversShort")}`} /><Cell value={player.exclusionsDrawn} />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function PlayerIdentity({ player, rank }: { player: Scouting["players"][number]; rank: number }) {
	const t = useTranslations("Opponents.players");
	return <div className="flex min-w-0 flex-1 items-center gap-3"><div className="relative shrink-0"><span className="relative grid size-11 place-items-center overflow-hidden rounded-full border bg-muted text-xs font-bold text-muted-foreground shadow-sm">{player.photoUrl ? <Image src={player.photoUrl} alt="" fill sizes="44px" className="object-cover object-top" /> : `#${player.number}`}</span><span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-card bg-primary text-[9px] font-bold text-primary-foreground">{rank}</span></div><div className="min-w-0"><p className="truncate text-sm font-semibold">#{player.number} · {player.name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{t("goalsPerMatchValue", { value: player.goalsPerMatch.toFixed(1) })}</p></div></div>;
}

function MobileMetric({ label, value }: { label: string; value: string | number }) {
	return <div className="min-w-0 rounded-lg border bg-muted/10 px-2 py-2 text-center"><p className="text-sm font-bold tabular-nums">{value}</p><p className="truncate text-[9px] font-medium text-muted-foreground">{label}</p></div>;
}

function Cell({ value, hint }: { value: string | number; hint?: string }) {
	return <div className="text-center"><p className="text-sm font-bold tabular-nums">{value}</p>{hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}</div>;
}
