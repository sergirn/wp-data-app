"use client";

import { useEffect, useState } from "react";
import { Gauge, Loader2, Save, ShieldCheck, Target } from "lucide-react";
import { useTranslations } from "next-intl";

import { DEFAULT_ANALYSIS_THRESHOLDS, type AnalysisThresholds } from "@/lib/analysis/performance-insights";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { clubId: number; profileId: string; canEdit: boolean };

export function AnalysisSettingsPanel({ clubId, profileId, canEdit }: Props) {
	const t = useTranslations("AnalysisSettings");
	const [values, setValues] = useState<AnalysisThresholds>(DEFAULT_ANALYSIS_THRESHOLDS);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			const supabase = createClient();
			if (!supabase) return setLoading(false);
			const { data } = await supabase.from("club_analysis_settings").select("shooting_efficiency_target, power_play_target, turnover_warning, save_percentage_target, max_goals_against").eq("club_id", clubId).maybeSingle();
			if (!cancelled && data) setValues({
				shootingEfficiencyTarget: Number(data.shooting_efficiency_target),
				powerPlayTarget: Number(data.power_play_target),
				turnoverWarning: Number(data.turnover_warning),
				savePercentageTarget: Number(data.save_percentage_target),
				maxGoalsAgainst: Number(data.max_goals_against)
			});
			if (!cancelled) setLoading(false);
		}
		void load();
		return () => { cancelled = true; };
	}, [clubId]);

	const update = (key: keyof AnalysisThresholds, raw: string) => {
		const value = Number(raw);
		const max = key === "turnoverWarning" || key === "maxGoalsAgainst" ? 99 : 100;
		setValues((current) => ({ ...current, [key]: Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0 }));
	};

	const save = async () => {
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
			updated_by: profileId,
			updated_at: new Date().toISOString()
		}, { onConflict: "club_id" });
		setFeedback({ tone: error ? "error" : "success", text: error ? t("saveError") : t("saved") });
		setSaving(false);
	};

	return (
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
					{feedback && <Alert variant={feedback.tone === "error" ? "destructive" : "default"}><AlertTitle>{feedback.tone === "error" ? t("errorTitle") : t("successTitle")}</AlertTitle><AlertDescription>{feedback.text}</AlertDescription></Alert>}
					{canEdit && <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}{saving ? t("saving") : t("save")}</Button></div>}
				</>}
			</CardContent>
		</Card>
	);
}

function ThresholdField({ icon: Icon, label, hint, value, suffix, disabled, onChange }: { icon: typeof Target; label: string; hint: string; value: number; suffix?: string; disabled: boolean; onChange: (value: string) => void }) {
	return <div className="rounded-xl border bg-card/50 p-4"><Label className="flex items-center gap-2 text-sm"><Icon className="size-4 text-primary" />{label}</Label><div className="relative mt-3"><Input type="number" min={0} max={suffix ? 100 : 99} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="pr-9 tabular-nums" />{suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p></div>;
}
