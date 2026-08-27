"use client";

import { AlertTriangle, ArrowRight, ClipboardList, Crosshair, Lightbulb, ShieldCheck, Sparkles, Target, UserRoundSearch } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OpponentNote, OpponentPreparationArea } from "@/lib/types";

type Scouting = ReturnType<typeof import("@/lib/opponents/scouting").buildOpponentScouting>;
type PreparationSection = Exclude<OpponentPreparationArea, "general">;

const PREPARATION_SECTIONS: PreparationSection[] = ["lineup", "defense", "powerPlay", "goalkeeper"];

export function OpponentPreparationPanel({ opponentName, scouting, notes, onOpenNotes }: { opponentName: string; scouting: Scouting; notes: OpponentNote[]; onOpenNotes: () => void }) {
	const t = useTranslations("Opponents.prepare");
	const bestQuarter = [...scouting.quarters].sort((a, b) => b.difference - a.difference)[0];
	const riskQuarter = [...scouting.quarters].sort((a, b) => a.difference - b.difference)[0];
	const powerPlayEfficiency = scouting.attack.powerPlayAttempts > 0 ? Math.round((scouting.attack.powerPlayGoals / scouting.attack.powerPlayAttempts) * 100) : 0;
	const topPlayer = scouting.players[0] ?? null;
	const preparationNotes = notes.filter((note) => note.preparation_area && note.preparation_area !== "general");

	return <div className="space-y-5">
		{scouting.played > 0 ? <>
			<Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card">
				<CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />{t("title", { opponent: opponentName })}</CardTitle><CardDescription className="mt-1">{t("description", { count: scouting.played })}</CardDescription></div><Badge variant="outline">{t(`confidence.${scouting.confidence}`)}</Badge></div></CardHeader>
				<CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<PreparationMetric icon={Target} label={t("metrics.scoring")} value={scouting.averageOwnGoals.toFixed(1)} hint={t("metrics.perMatch")} />
					<PreparationMetric icon={ShieldCheck} label={t("metrics.conceded")} value={scouting.averageOpponentGoals.toFixed(1)} hint={t("metrics.perMatch")} />
					<PreparationMetric icon={Crosshair} label={t("metrics.shooting")} value={`${scouting.attack.efficiency}%`} hint={t("metrics.recordedShots", { count: scouting.attack.shots })} />
					<PreparationMetric icon={ClipboardList} label={t("metrics.notes")} value={String(preparationNotes.length)} hint={t("metrics.notesHint")} />
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
		</> : <Card><CardContent className="flex items-center gap-4 py-6"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted"><UserRoundSearch className="size-5 text-muted-foreground" /></div><div><p className="font-medium">{t("empty")}</p><p className="mt-0.5 text-sm text-muted-foreground">{t("emptyHint")}</p></div></CardContent></Card>}

		<Card className="overflow-hidden">
			<CardHeader className="border-b bg-muted/10">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="size-5 text-primary" />{t("notesBoard.title")}</CardTitle><CardDescription className="mt-1">{t("notesBoard.description")}</CardDescription></div>
					<Button type="button" size="sm" onClick={onOpenNotes}>{t("notesBoard.add")}<ArrowRight className="ml-2 size-4" /></Button>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
				{PREPARATION_SECTIONS.map((section) => {
					const sectionNotes = notes.filter((note) => note.preparation_area === section || (section === "lineup" && !note.preparation_area && note.category === "lineup"));
					return <div key={section} className="rounded-xl border bg-card p-4">
						<div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">{t(`checklist.${section}.title`)}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(`checklist.${section}.description`)}</p></div><Badge variant="secondary" className="shrink-0">{sectionNotes.length}</Badge></div>
						{sectionNotes.length > 0 ? <div className="space-y-2">{sectionNotes.map((note) => <div key={note.id} className="rounded-lg border bg-muted/10 p-3"><p className="text-sm font-medium">{note.title || t("notesBoard.untitled")}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">{note.body}</p></div>)}</div> : <button type="button" onClick={onOpenNotes} className="w-full rounded-lg border border-dashed px-3 py-5 text-center text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">{t("notesBoard.empty")}</button>}
					</div>;
				})}
			</CardContent>
		</Card>
	</div>;
}

function PreparationMetric({ icon: Icon, label, value, hint }: { icon: typeof Target; label: string; value: string; hint: string }) {
	return <div className="rounded-xl border bg-background/60 p-3"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4 text-primary" />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{hint}</p></div>;
}

function PlanCard({ icon: Icon, tone, title, items }: { icon: typeof Target; tone: "warning" | "positive"; title: string; items: string[] }) {
	return <Card className={tone === "warning" ? "border-amber-500/20" : "border-emerald-500/20"}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className={tone === "warning" ? "size-5 text-amber-500" : "size-5 text-emerald-500"} />{title}</CardTitle></CardHeader><CardContent><ul className="space-y-3">{items.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-relaxed"><span className={tone === "warning" ? "mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" : "mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500"} />{item}</li>)}</ul></CardContent></Card>;
}
