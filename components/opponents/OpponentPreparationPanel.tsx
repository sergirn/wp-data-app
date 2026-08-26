"use client";

import { AlertTriangle, ClipboardCheck, Crosshair, Lightbulb, ShieldCheck, Sparkles, Target, UserRoundSearch } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Scouting = ReturnType<typeof import("@/lib/opponents/scouting").buildOpponentScouting>;

export function OpponentPreparationPanel({ opponentName, scouting, noteCount }: { opponentName: string; scouting: Scouting; noteCount: number }) {
	const t = useTranslations("Opponents.prepare");
	const bestQuarter = [...scouting.quarters].sort((a, b) => b.difference - a.difference)[0];
	const riskQuarter = [...scouting.quarters].sort((a, b) => a.difference - b.difference)[0];
	const powerPlayEfficiency = scouting.attack.powerPlayAttempts > 0 ? Math.round((scouting.attack.powerPlayGoals / scouting.attack.powerPlayAttempts) * 100) : 0;
	const topPlayer = scouting.players[0] ?? null;

	if (scouting.played === 0) return <Card><CardContent className="py-12 text-center"><UserRoundSearch className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="font-medium">{t("empty")}</p><p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{t("emptyHint")}</p></CardContent></Card>;

	return <div className="space-y-5">
		<Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card">
			<CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />{t("title", { opponent: opponentName })}</CardTitle><CardDescription className="mt-1">{t("description", { count: scouting.played })}</CardDescription></div><Badge variant="outline">{t(`confidence.${scouting.confidence}`)}</Badge></div></CardHeader>
			<CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<PreparationMetric icon={Target} label={t("metrics.scoring")} value={scouting.averageOwnGoals.toFixed(1)} hint={t("metrics.perMatch")} />
				<PreparationMetric icon={ShieldCheck} label={t("metrics.conceded")} value={scouting.averageOpponentGoals.toFixed(1)} hint={t("metrics.perMatch")} />
				<PreparationMetric icon={Crosshair} label={t("metrics.shooting")} value={`${scouting.attack.efficiency}%`} hint={t("metrics.recordedShots", { count: scouting.attack.shots })} />
				<PreparationMetric icon={ClipboardCheck} label={t("metrics.notes")} value={String(noteCount)} hint={t("metrics.notesHint")} />
			</CardContent>
		</Card>

		<div className="grid gap-4 lg:grid-cols-2">
			<PlanCard icon={AlertTriangle} tone="warning" title={t("risks.title")} items={[
				t("risks.quarter", { quarter: riskQuarter?.quarter ?? 0, difference: riskQuarter?.difference ?? 0 }),
				t("risks.conceded", { value: scouting.averageOpponentGoals.toFixed(1) }),
				scouting.opponentAttack.powerPlayGoals > 0 ? t("risks.powerPlayGoals", { count: scouting.opponentAttack.powerPlayGoals }) : t("risks.noPowerPlayGoals")
			]} />
			<PlanCard icon={Lightbulb} tone="positive" title={t("opportunities.title")} items={[
				t("opportunities.quarter", { quarter: bestQuarter?.quarter ?? 0, difference: bestQuarter?.difference ?? 0 }),
				t("opportunities.powerPlay", { value: powerPlayEfficiency }),
				topPlayer ? t("opportunities.player", { player: topPlayer.name, goals: topPlayer.goals }) : t("opportunities.noPlayer")
			]} />
		</div>

		<Card><CardHeader><CardTitle className="text-base">{t("checklist.title")}</CardTitle><CardDescription>{t("checklist.description")}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["lineup", "defense", "powerPlay", "goalkeeper"].map((item) => <div key={item} className="rounded-xl border bg-muted/15 p-4"><p className="text-sm font-semibold">{t(`checklist.${item}.title`)}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(`checklist.${item}.description`)}</p></div>)}</CardContent></Card>
	</div>;
}

function PreparationMetric({ icon: Icon, label, value, hint }: { icon: typeof Target; label: string; value: string; hint: string }) {
	return <div className="rounded-xl border bg-background/60 p-3"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4 text-primary" />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{hint}</p></div>;
}

function PlanCard({ icon: Icon, tone, title, items }: { icon: typeof Target; tone: "warning" | "positive"; title: string; items: string[] }) {
	return <Card className={tone === "warning" ? "border-amber-500/20" : "border-emerald-500/20"}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className={tone === "warning" ? "size-5 text-amber-500" : "size-5 text-emerald-500"} />{title}</CardTitle></CardHeader><CardContent><ul className="space-y-3">{items.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-relaxed"><span className={tone === "warning" ? "mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" : "mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500"} />{item}</li>)}</ul></CardContent></Card>;
}

