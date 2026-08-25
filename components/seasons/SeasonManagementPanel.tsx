"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CalendarRange, Check, Loader2, RefreshCw, UserPlus, UsersRound, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { ClubSeason, Player } from "@/lib/types";

type RosterDraft = {
	id: number;
	name: string;
	number: string;
	isGoalkeeper: boolean;
	included: boolean;
	wasActive: boolean;
	isNew: boolean;
};

export function SeasonManagementPanel({ clubId, players, canManage, onChanged }: { clubId: number | null; players: Player[]; canManage: boolean; onChanged: () => Promise<void> | void }) {
	const t = useTranslations("SeasonManagement");
	const [seasons, setSeasons] = useState<ClubSeason[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [setupRequired, setSetupRequired] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [preparing, setPreparing] = useState(false);
	const [startYear, setStartYear] = useState(2026);
	const [drafts, setDrafts] = useState<RosterDraft[]>([]);
	const [formerPlayerId, setFormerPlayerId] = useState("");
	const [nextTemporaryId, setNextTemporaryId] = useState(-1);

	const loadSeasons = useCallback(async () => {
		if (!clubId) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setSetupRequired(false);
		const supabase = createClient();
		const { data, error: loadError } = await supabase.from("club_seasons").select("*").eq("club_id", clubId).order("start_year", { ascending: false });
		if (loadError) {
			setSetupRequired(loadError.code === "42P01" || loadError.code === "42703");
			setError(loadError.code === "42P01" || loadError.code === "42703" ? null : t("loadError"));
		} else {
			setSeasons((data ?? []) as ClubSeason[]);
		}
		setLoading(false);
	}, [clubId, t]);

	useEffect(() => {
		const timeout = window.setTimeout(() => void loadSeasons(), 0);
		return () => window.clearTimeout(timeout);
	}, [loadSeasons]);

	const activeSeason = seasons.find((season) => season.status === "active") ?? null;
	const visibleDrafts = drafts.filter((draft) => draft.wasActive || draft.included || draft.isNew);
	const includedDrafts = drafts.filter((draft) => draft.included);
	const formerPlayers = players.filter((player) => player.is_active === false && !drafts.some((draft) => draft.id === player.id && draft.included));

	const rosterCounts = useMemo(() => ({
		players: includedDrafts.filter((draft) => !draft.isGoalkeeper).length,
		goalkeepers: includedDrafts.filter((draft) => draft.isGoalkeeper).length,
		departures: drafts.filter((draft) => draft.wasActive && !draft.included).length,
		newSignings: drafts.filter((draft) => draft.isNew && draft.included).length
	}), [drafts, includedDrafts]);

	const beginRollover = () => {
		const inferredStart = activeSeason ? activeSeason.end_year : new Date().getFullYear();
		setStartYear(inferredStart);
		setDrafts(players.map((player) => ({
			id: player.id,
			name: player.name,
			number: String(Math.max(0, player.number)),
			isGoalkeeper: player.is_goalkeeper,
			included: player.is_active !== false,
			wasActive: player.is_active !== false,
			isNew: false
		})));
		setFormerPlayerId("");
		setNextTemporaryId(-1);
		setError(null);
		setPreparing(true);
	};

	const updateDraft = (id: number, patch: Partial<RosterDraft>) => setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...patch } : draft));

	const addSigning = () => {
		const id = nextTemporaryId;
		setNextTemporaryId((current) => current - 1);
		setDrafts((current) => [...current, { id, name: "", number: "", isGoalkeeper: false, included: true, wasActive: false, isNew: true }]);
	};

	const addFormerPlayer = () => {
		const id = Number(formerPlayerId);
		if (!id) return;
		const player = players.find((item) => item.id === id);
		if (!player) return;
		setDrafts((current) => current.some((draft) => draft.id === id)
			? current.map((draft) => draft.id === id ? { ...draft, included: true } : draft)
			: [...current, { id, name: player.name, number: String(Math.max(0, player.number)), isGoalkeeper: player.is_goalkeeper, included: true, wasActive: false, isNew: false }]);
		setFormerPlayerId("");
	};

	const validate = () => {
		if (includedDrafts.length === 0) return t("errors.emptyRoster");
		const numbers = new Set<number>();
		for (const draft of includedDrafts) {
			if (!draft.name.trim()) return t("errors.nameRequired");
			const number = Number.parseInt(draft.number, 10);
			if (!Number.isInteger(number) || number < 0) return t("errors.invalidNumber");
			if (numbers.has(number)) return t("errors.duplicateNumber", { number });
			numbers.add(number);
		}
		return null;
	};

	const createSeason = async () => {
		if (!clubId) return;
		const validation = validate();
		if (validation) {
			setError(validation);
			return;
		}
		setSaving(true);
		setError(null);
		const supabase = createClient();
		const { error: saveError } = await supabase.rpc("rollover_club_season", {
			p_club_id: clubId,
			p_start_year: startYear,
			p_roster: includedDrafts.map((draft) => ({
				id: draft.isNew ? null : draft.id,
				name: draft.name.trim(),
				number: Number.parseInt(draft.number, 10),
				is_goalkeeper: draft.isGoalkeeper
			}))
		});
		if (saveError) setError(saveError.message.includes("DUPLICATE_NUMBER") ? t("errors.duplicateNumberGeneric") : t("saveError"));
		else {
			setPreparing(false);
			await loadSeasons();
			await onChanged();
		}
		setSaving(false);
	};

	const activateSeason = async (seasonId: number) => {
		if (!clubId) return;
		setSaving(true);
		setError(null);
		const supabase = createClient();
		const { error: activateError } = await supabase.rpc("set_active_club_season", { p_club_id: clubId, p_season_id: seasonId });
		if (activateError) setError(t("activateError"));
		else {
			await loadSeasons();
			await onChanged();
		}
		setSaving(false);
	};

	if (loading) return <Card><CardContent className="flex min-h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>;
	if (setupRequired) return <Card><CardHeader><CardTitle>{t("setupTitle")}</CardTitle><CardDescription>{t("setupDescription")}</CardDescription></CardHeader></Card>;

	return (
		<div className="space-y-5">
			<div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
				<Card className="overflow-hidden border-primary/20">
					<div className="h-1 bg-primary" />
					<CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarRange className="h-5 w-5" /></div><CardTitle>{t("currentTitle")}</CardTitle><CardDescription>{t("currentDescription")}</CardDescription></CardHeader>
					<CardContent>
						{activeSeason ? <div className="rounded-xl border bg-muted/20 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-2xl font-bold">{activeSeason.name}</p><p className="mt-1 text-sm text-muted-foreground">{t("activeHint")}</p></div><Badge className="gap-1"><Check className="h-3.5 w-3.5" />{t("active")}</Badge></div></div> : <p className="text-sm text-muted-foreground">{t("noActive")}</p>}
						{canManage && <Button className="mt-4 w-full gap-2" onClick={beginRollover} disabled={saving}><RefreshCw className="h-4 w-4" />{t("prepareNext")}</Button>}
					</CardContent>
				</Card>

				<Card><CardHeader><CardTitle>{t("historyTitle")}</CardTitle><CardDescription>{t("historyDescription")}</CardDescription></CardHeader><CardContent className="space-y-2">{seasons.map((season) => <div key={season.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-muted"><Archive className="h-4 w-4 text-muted-foreground" /></div><div><p className="font-medium">{season.name}</p><p className="text-xs text-muted-foreground">{t(`statuses.${season.status}`)}</p></div></div>{season.status === "active" ? <Badge variant="secondary">{t("active")}</Badge> : canManage && <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="outline" disabled={saving}>{t("setActive")}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("activateTitle", { season: season.name })}</AlertDialogTitle><AlertDialogDescription>{t("activateDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void activateSeason(season.id)}>{t("activateConfirm")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</div>)}</CardContent></Card>
			</div>

			{preparing && (
				<Card className="overflow-hidden">
					<CardHeader className="border-b"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>{t("wizardTitle")}</CardTitle><CardDescription className="mt-1">{t("wizardDescription")}</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setPreparing(false)}><X className="h-4 w-4" /></Button></div></CardHeader>
					<CardContent className="space-y-5 p-4 sm:p-6">
						<div className="grid gap-4 sm:grid-cols-[220px_1fr]"><div><Label htmlFor="season-start">{t("season")}</Label><div className="mt-1 flex items-center gap-2"><Input id="season-start" type="number" min={2000} max={2200} value={startYear} onChange={(event) => setStartYear(Number(event.target.value))} /><span className="shrink-0 font-semibold">– {startYear + 1}</span></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Summary label={t("summary.players")} value={rosterCounts.players} /><Summary label={t("summary.goalkeepers")} value={rosterCounts.goalkeepers} /><Summary label={t("summary.departures")} value={rosterCounts.departures} /><Summary label={t("summary.signings")} value={rosterCounts.newSignings} /></div></div>

						<div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" className="gap-2" onClick={addSigning}><UserPlus className="h-4 w-4" />{t("addSigning")}</Button>{formerPlayers.length > 0 && <div className="flex min-w-0 flex-1 gap-2"><Select value={formerPlayerId} onValueChange={setFormerPlayerId}><SelectTrigger className="min-w-0"><SelectValue placeholder={t("recoverPlaceholder")} /></SelectTrigger><SelectContent>{formerPlayers.map((player) => <SelectItem key={player.id} value={String(player.id)}>#{Math.max(0, player.number)} · {player.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="secondary" onClick={addFormerPlayer} disabled={!formerPlayerId}>{t("recover")}</Button></div>}</div>

						<div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{visibleDrafts.map((draft) => <div key={draft.id} className={`rounded-xl border p-3 transition-colors ${draft.included ? "bg-card" : "bg-muted/25 opacity-65"}`}><div className="mb-3 flex items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><Checkbox checked={draft.included} onCheckedChange={(checked) => updateDraft(draft.id, { included: checked === true })} />{draft.included ? t("continues") : t("leaves")}</label>{draft.isNew && <Badge variant="secondary">{t("signing")}</Badge>}</div><div className="grid grid-cols-[78px_1fr] gap-2"><Input aria-label={t("number")} type="number" min={0} value={draft.number} onChange={(event) => updateDraft(draft.id, { number: event.target.value })} disabled={!draft.included} /><Input aria-label={t("playerName")} value={draft.name} onChange={(event) => updateDraft(draft.id, { name: event.target.value })} disabled={!draft.included || !draft.isNew} /></div><label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={draft.isGoalkeeper} onCheckedChange={(checked) => updateDraft(draft.id, { isGoalkeeper: checked === true })} disabled={!draft.included} />{t("goalkeeper")}</label></div>)}</div>

						{error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setPreparing(false)} disabled={saving}>{t("cancel")}</Button><Button onClick={() => void createSeason()} disabled={saving || includedDrafts.length === 0}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UsersRound className="mr-2 h-4 w-4" />}{t("createAndActivate", { season: `${startYear}-${startYear + 1}` })}</Button></div>
					</CardContent>
				</Card>
			)}

			{error && !preparing && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
		</div>
	);
}

function Summary({ label, value }: { label: string; value: number }) {
	return <div className="rounded-xl border bg-muted/20 p-2.5 text-center"><p className="text-lg font-bold tabular-nums">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>;
}
