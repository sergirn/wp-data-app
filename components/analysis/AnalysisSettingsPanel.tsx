"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Gauge, Loader2, Plus, Save, ShieldCheck, Target, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { DEFAULT_ANALYSIS_THRESHOLDS, type AnalysisThresholds } from "@/lib/analysis/performance-insights";
import {
	createDefaultClubObjectives,
	MAX_CLUB_OBJECTIVES,
	normalizeClubObjectives,
	OBJECTIVE_METRICS,
	type ClubObjective,
	type ObjectiveComparator,
	type ObjectiveMetric,
	type ObjectiveUnit
} from "@/lib/analysis/club-objectives";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = { clubId: number; profileId: string; canEdit: boolean };

export function AnalysisSettingsPanel({ clubId, profileId, canEdit }: Props) {
	const t = useTranslations("AnalysisSettings");
	const [values, setValues] = useState<AnalysisThresholds>(DEFAULT_ANALYSIS_THRESHOLDS);
	const [objectives, setObjectives] = useState<ClubObjective[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

	const defaultObjectives = (thresholds: AnalysisThresholds) =>
		createDefaultClubObjectives(thresholds, (metric) => t(`objectives.metrics.${metric}`));

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			const supabase = createClient();
			if (!supabase) return setLoading(false);
			const { data } = await supabase
				.from("club_analysis_settings")
				.select("shooting_efficiency_target, power_play_target, turnover_warning, save_percentage_target, max_goals_against, objectives")
				.eq("club_id", clubId)
				.maybeSingle();

			if (!cancelled) {
				const thresholds = data ? {
					shootingEfficiencyTarget: Number(data.shooting_efficiency_target),
					powerPlayTarget: Number(data.power_play_target),
					turnoverWarning: Number(data.turnover_warning),
					savePercentageTarget: Number(data.save_percentage_target),
					maxGoalsAgainst: Number(data.max_goals_against)
				} : DEFAULT_ANALYSIS_THRESHOLDS;
				const hasSavedObjectives = Array.isArray(data?.objectives);
				const savedObjectives = normalizeClubObjectives(data?.objectives);
				setValues(thresholds);
				setObjectives(hasSavedObjectives ? savedObjectives : defaultObjectives(thresholds));
				setLoading(false);
			}
		}
		void load();
		return () => { cancelled = true; };
		// Persisted titles are club content and intentionally do not change with the interface locale.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clubId]);

	const update = (key: keyof AnalysisThresholds, raw: string) => {
		const value = Number(raw);
		const max = key === "turnoverWarning" || key === "maxGoalsAgainst" ? 99 : 100;
		setValues((current) => ({ ...current, [key]: Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0 }));
	};

	const updateObjective = <K extends keyof ClubObjective>(id: string, key: K, value: ClubObjective[K]) => {
		setObjectives((current) => current.map((objective) => objective.id === id ? { ...objective, [key]: value } : objective));
	};

	const addObjective = () => {
		if (objectives.length >= MAX_CLUB_OBJECTIVES) return;
		const metric: ObjectiveMetric = OBJECTIVE_METRICS.find((candidate) => !objectives.some((objective) => objective.metric === candidate)) ?? "goalsPerMatch";
		setObjectives((current) => [...current, {
			id: crypto.randomUUID(),
			title: t(`objectives.metrics.${metric}`),
			metric,
			unit: metric.toLowerCase().includes("percentage") || metric.includes("Efficiency") ? "percentage" : "number",
			comparator: metric === "turnoversPerMatch" || metric === "goalsAgainstPerMatch" ? "lte" : "gte",
			target: 50
		}]);
	};

	const moveObjective = (index: number, direction: -1 | 1) => {
		const destination = index + direction;
		if (destination < 0 || destination >= objectives.length) return;
		setObjectives((current) => {
			const next = [...current];
			[next[index], next[destination]] = [next[destination], next[index]];
			return next;
		});
	};

	const save = async () => {
		if (objectives.some((objective) => !objective.title.trim())) {
			setFeedback({ tone: "error", text: t("objectives.titleRequired") });
			return;
		}
		setSaving(true);
		setFeedback(null);
		const supabase = createClient();
		if (!supabase) return setSaving(false);
		const { error } = await supabase.from("club_analysis_settings").upsert({
			club_id: clubId,
			shooting_efficiency_target: values.shootingEfficiencyTarget,
			power_play_target: values.powerPlayTarget,
			turnover_warning: Math.round(values.turnoverWarning),
			save_percentage_target: values.savePercentageTarget,
			max_goals_against: Math.round(values.maxGoalsAgainst),
			objectives: objectives.map((objective) => ({ ...objective, title: objective.title.trim() })),
			updated_by: profileId,
			updated_at: new Date().toISOString()
		}, { onConflict: "club_id" });
		setFeedback({ tone: error ? "error" : "success", text: error ? t("saveError") : t("saved") });
		setSaving(false);
	};

	return (
		<div className="space-y-5">
			<Card className="overflow-hidden rounded-2xl border-border/70">
				<CardHeader className="border-b bg-muted/10"><CardTitle className="flex items-center gap-2"><Gauge className="size-5 text-primary" />{t("title")}</CardTitle><CardDescription>{t("description")}</CardDescription></CardHeader>
				<CardContent className="space-y-6 p-5 sm:p-6">
					{loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t("loading")}</div> : <>
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							<ThresholdField icon={Target} label={t("fields.shooting")} hint={t("hints.shooting")} value={values.shootingEfficiencyTarget} suffix="%" disabled={!canEdit} onChange={(value) => update("shootingEfficiencyTarget", value)} />
							<ThresholdField icon={Target} label={t("fields.powerPlay")} hint={t("hints.powerPlay")} value={values.powerPlayTarget} suffix="%" disabled={!canEdit} onChange={(value) => update("powerPlayTarget", value)} />
							<ThresholdField icon={Gauge} label={t("fields.turnovers")} hint={t("hints.turnovers")} value={values.turnoverWarning} disabled={!canEdit} onChange={(value) => update("turnoverWarning", value)} />
							<ThresholdField icon={ShieldCheck} label={t("fields.saves")} hint={t("hints.saves")} value={values.savePercentageTarget} suffix="%" disabled={!canEdit} onChange={(value) => update("savePercentageTarget", value)} />
							<ThresholdField icon={ShieldCheck} label={t("fields.goalsAgainst")} hint={t("hints.goalsAgainst")} value={values.maxGoalsAgainst} disabled={!canEdit} onChange={(value) => update("maxGoalsAgainst", value)} />
						</div>
						<p className="rounded-xl border bg-muted/15 p-4 text-sm text-muted-foreground">{t("explanation")}</p>
					</>}
				</CardContent>
			</Card>

			{!loading && <Card className="overflow-hidden rounded-2xl border-border/70">
				<CardHeader className="border-b bg-muted/10">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div><CardTitle className="flex items-center gap-2"><Target className="size-5 text-primary" />{t("objectives.title")}</CardTitle><CardDescription className="mt-1">{t("objectives.description")}</CardDescription></div>
						<span className="rounded-full border bg-background px-3 py-1 text-xs font-medium tabular-nums">{t("objectives.count", { count: objectives.length, max: MAX_CLUB_OBJECTIVES })}</span>
					</div>
				</CardHeader>
				<CardContent className="space-y-4 p-5 sm:p-6">
					<div className="grid gap-3 xl:grid-cols-2">
						{objectives.map((objective, index) => <ObjectiveEditor key={objective.id} objective={objective} index={index} total={objectives.length} disabled={!canEdit} t={t} onUpdate={updateObjective} onMove={moveObjective} onDelete={(id) => setObjectives((current) => current.filter((item) => item.id !== id))} />)}
					</div>
					{objectives.length === 0 && <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">{t("objectives.empty")}</div>}
					{canEdit && <Button type="button" variant="outline" onClick={addObjective} disabled={objectives.length >= MAX_CLUB_OBJECTIVES}><Plus className="mr-2 size-4" />{t("objectives.add")}</Button>}
					{feedback && <Alert variant={feedback.tone === "error" ? "destructive" : "default"}><AlertTitle>{feedback.tone === "error" ? t("errorTitle") : t("successTitle")}</AlertTitle><AlertDescription>{feedback.text}</AlertDescription></Alert>}
					{canEdit && <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}{saving ? t("saving") : t("save")}</Button></div>}
				</CardContent>
			</Card>}
		</div>
	);
}

function ThresholdField({ icon: Icon, label, hint, value, suffix, disabled, onChange }: { icon: typeof Target; label: string; hint: string; value: number; suffix?: string; disabled: boolean; onChange: (value: string) => void }) {
	return <div className="rounded-xl border bg-card/50 p-4"><Label className="flex items-center gap-2 text-sm"><Icon className="size-4 text-primary" />{label}</Label><div className="relative mt-3"><Input type="number" min={0} max={suffix ? 100 : 99} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="pr-9 tabular-nums" />{suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p></div>;
}

type ObjectiveEditorProps = {
	objective: ClubObjective;
	index: number;
	total: number;
	disabled: boolean;
	t: ReturnType<typeof useTranslations<"AnalysisSettings">>;
	onUpdate: <K extends keyof ClubObjective>(id: string, key: K, value: ClubObjective[K]) => void;
	onMove: (index: number, direction: -1 | 1) => void;
	onDelete: (id: string) => void;
};

function ObjectiveEditor({ objective, index, total, disabled, t, onUpdate, onMove, onDelete }: ObjectiveEditorProps) {
	const max = objective.unit === "percentage" ? 100 : 9999;
	return <div className="rounded-xl border bg-card/50 p-4">
		<div className="mb-4 flex items-center justify-between gap-2">
			<p className="text-sm font-semibold">{t("objectives.item", { number: index + 1 })}</p>
			{!disabled && <div className="flex gap-1">
				<Button type="button" size="icon" variant="ghost" className="size-8" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={t("objectives.moveUp")}><ArrowUp className="size-4" /></Button>
				<Button type="button" size="icon" variant="ghost" className="size-8" disabled={index === total - 1} onClick={() => onMove(index, 1)} aria-label={t("objectives.moveDown")}><ArrowDown className="size-4" /></Button>
				<Button type="button" size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" onClick={() => onDelete(objective.id)} aria-label={t("objectives.delete")}><Trash2 className="size-4" /></Button>
			</div>}
		</div>
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="sm:col-span-2"><Label>{t("objectives.fields.title")}</Label><Input className="mt-1.5" maxLength={80} value={objective.title} disabled={disabled} onChange={(event) => onUpdate(objective.id, "title", event.target.value)} /></div>
			<div className="sm:col-span-2"><Label>{t("objectives.fields.metric")}</Label><Select value={objective.metric} disabled={disabled} onValueChange={(value) => onUpdate(objective.id, "metric", value as ObjectiveMetric)}><SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger><SelectContent>{OBJECTIVE_METRICS.map((metric) => <SelectItem key={metric} value={metric}>{t(`objectives.metrics.${metric}`)}</SelectItem>)}</SelectContent></Select></div>
			<div><Label>{t("objectives.fields.unit")}</Label><Select value={objective.unit} disabled={disabled} onValueChange={(value) => onUpdate(objective.id, "unit", value as ObjectiveUnit)}><SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">{t("objectives.units.percentage")}</SelectItem><SelectItem value="number">{t("objectives.units.number")}</SelectItem></SelectContent></Select></div>
			<div><Label>{t("objectives.fields.comparator")}</Label><Select value={objective.comparator} disabled={disabled} onValueChange={(value) => onUpdate(objective.id, "comparator", value as ObjectiveComparator)}><SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gte">{t("objectives.comparators.gte")}</SelectItem><SelectItem value="lte">{t("objectives.comparators.lte")}</SelectItem></SelectContent></Select></div>
			<div className="sm:col-span-2"><Label>{t("objectives.fields.target")}</Label><div className="relative mt-1.5"><Input type="number" min={0} max={max} step={0.1} value={objective.target} disabled={disabled} onChange={(event) => onUpdate(objective.id, "target", Math.max(0, Math.min(max, Number(event.target.value))))} className="pr-9 tabular-nums" />{objective.unit === "percentage" && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>}</div></div>
		</div>
	</div>;
}
