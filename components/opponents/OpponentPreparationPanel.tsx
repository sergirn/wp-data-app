"use client";

import { AlertTriangle, BarChart3, Crosshair, Lightbulb, ShieldCheck, Sparkles, Target, UserRoundSearch } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Scouting = ReturnType<typeof import("@/lib/opponents/scouting").buildOpponentScouting>;

export function OpponentPreparationPanel({ opponentName, scouting }: { opponentName: string; scouting: Scouting }) {
	const t = useTranslations("Opponents.prepare");
	const statT = useTranslations("StatLabels");
	const quartersWithData = scouting.quarters.filter((quarter) => quarter.sampleSize > 0);
	const bestQuarter = [...quartersWithData].sort((a, b) => b.difference - a.difference)[0];
	const riskQuarter = [...quartersWithData].sort((a, b) => a.difference - b.difference)[0];
	const powerPlayEfficiency = scouting.attack.powerPlayAttempts > 0 ? Math.round((scouting.attack.powerPlayGoals / scouting.attack.powerPlayAttempts) * 100) : 0;
	const topPlayer = scouting.players[0] ?? null;
	const bestQuarterDifference = Number((bestQuarter?.difference ?? 0).toFixed(1));
	const riskQuarterDifference = Number((riskQuarter?.difference ?? 0).toFixed(1));
	const mainOwnRoute = scouting.attack.goalBreakdown[0] ?? null;
	const mainOpponentRoute = scouting.opponentAttack.goalBreakdown[0] ?? null;

	return <div className="space-y-5">
		{scouting.played > 0 ? <>
			<Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card">
				<CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />{t("title", { opponent: opponentName })}</CardTitle><CardDescription className="mt-1">{t("description", { count: scouting.played })}</CardDescription></div><Badge variant="outline">{t(`confidence.${scouting.confidence}`)}</Badge></div></CardHeader>
				<CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<PreparationMetric icon={Target} label={t("metrics.scoring")} value={scouting.averageOwnGoals.toFixed(1)} hint={t("metrics.perMatch")} />
					<PreparationMetric icon={ShieldCheck} label={t("metrics.conceded")} value={scouting.averageOpponentGoals.toFixed(1)} hint={t("metrics.perMatch")} />
					<PreparationMetric icon={Crosshair} label={t("metrics.shooting")} value={`${scouting.attack.efficiency}%`} hint={t("metrics.recordedShots", { count: scouting.attack.shots })} />
					<PreparationMetric icon={BarChart3} label={t("metrics.coverage")} value={`${scouting.dataQuality.statsCoverage}%`} hint={t("metrics.coverageHint", { count: scouting.dataQuality.detailedMatches })} />
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<PlanCard icon={AlertTriangle} tone="warning" title={t("risks.title")} items={[
					riskQuarter ? t("risks.quarter", { quarter: riskQuarter.quarter, difference: riskQuarterDifference }) : t("risks.noQuarterData"),
					mainOpponentRoute ? t("risks.mainRoute", { action: statT.has(mainOpponentRoute.key) ? statT(mainOpponentRoute.key) : mainOpponentRoute.key, count: mainOpponentRoute.value }) : t("risks.conceded", { value: scouting.averageOpponentGoals.toFixed(1) }),
					scouting.opponentAttack.powerPlayDefended > 0 ? t("risks.manDown", { value: scouting.opponentAttack.manDownSavePercentage }) : t("risks.noPowerPlayGoals")
				]} />
				<PlanCard icon={Lightbulb} tone="positive" title={t("opportunities.title")} items={[
					bestQuarter ? t("opportunities.quarter", { quarter: bestQuarter.quarter, difference: bestQuarterDifference }) : t("opportunities.noQuarterData"),
					mainOwnRoute ? t("opportunities.mainRoute", { action: statT.has(mainOwnRoute.key) ? statT(mainOwnRoute.key) : mainOwnRoute.key, count: mainOwnRoute.value }) : t("opportunities.powerPlay", { value: powerPlayEfficiency }),
					topPlayer ? t("opportunities.playerRate", { player: topPlayer.name, value: topPlayer.goalsPerMatch.toFixed(1) }) : t("opportunities.noPlayer")
				]} />
			</div>
		</> : <Card><CardContent className="flex items-center gap-4 py-6"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted"><UserRoundSearch className="size-5 text-muted-foreground" /></div><div><p className="font-medium">{t("empty")}</p><p className="mt-0.5 text-sm text-muted-foreground">{t("emptyHint")}</p></div></CardContent></Card>}

	</div>;
}

function PreparationMetric({ icon: Icon, label, value, hint }: { icon: typeof Target; label: string; value: string; hint: string }) {
	return <div className="rounded-xl border bg-background/60 p-3"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4 text-primary" />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{hint}</p></div>;
}

function PlanCard({ icon: Icon, tone, title, items }: { icon: typeof Target; tone: "warning" | "positive"; title: string; items: string[] }) {
	return <Card className={tone === "warning" ? "border-amber-500/20" : "border-emerald-500/20"}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className={tone === "warning" ? "size-5 text-amber-500" : "size-5 text-emerald-500"} />{title}</CardTitle></CardHeader><CardContent><ul className="space-y-3">{items.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-relaxed"><span className={tone === "warning" ? "mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" : "mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500"} />{item}</li>)}</ul></CardContent></Card>;
}
