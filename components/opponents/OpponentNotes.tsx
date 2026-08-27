"use client";

import { useState } from "react";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { OpponentNote, OpponentPreparationArea } from "@/lib/types";

const PREPARATION_AREAS: OpponentPreparationArea[] = ["general", "lineup", "defense", "powerPlay", "goalkeeper"];

export function OpponentNotes({ opponentId, clubId, profileId, notes, canEdit, onChanged }: { opponentId: number; clubId: number; profileId: string; notes: OpponentNote[]; canEdit: boolean; onChanged: () => Promise<void> }) {
	const t = useTranslations("Opponents.notes");
	const common = useTranslations("Common");
	const locale = useLocale();
	const [preparationArea, setPreparationArea] = useState<OpponentPreparationArea>("general");
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const addNote = async () => {
		if (!body.trim()) return;
		setSaving(true);
		setError(null);
		const supabase = createClient();
		const { error: saveError } = await supabase.from("opponent_notes").insert({ opponent_id: opponentId, club_id: clubId, category: preparationArea === "lineup" ? "lineup" : preparationArea === "general" ? "general" : "tactical", preparation_area: preparationArea, title: title.trim() || null, body: body.trim(), created_by: profileId });
		if (saveError) setError(t("saveError"));
		else {
			setTitle("");
			setBody("");
			await onChanged();
		}
		setSaving(false);
	};

	const deleteNote = async (id: number) => {
		const supabase = createClient();
		const { error: deleteError } = await supabase.from("opponent_notes").delete().eq("id", id).eq("opponent_id", opponentId);
		if (deleteError) setError(t("deleteError"));
		else await onChanged();
	};

	return (
		<div className="space-y-4">
			{canEdit && (
				<Card className="border-primary/20 bg-primary/[0.025]"><CardContent className="space-y-3 p-4 sm:p-5">
					<div className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><h3 className="font-semibold">{t("new")}</h3></div>
					<div className="grid gap-3 sm:grid-cols-[180px_1fr]">
						<Select value={preparationArea} onValueChange={(value) => setPreparationArea(value as OpponentPreparationArea)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PREPARATION_AREAS.map((item) => <SelectItem key={item} value={item}>{t(`categories.${item}`)}</SelectItem>)}</SelectContent></Select>
						<Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("titlePlaceholder")} maxLength={120} />
					</div>
					<Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={t("bodyPlaceholder")} rows={4} maxLength={5000} />
					<div className="flex items-center justify-between gap-3">{error ? <p className="text-xs text-destructive">{error}</p> : <span />}<Button type="button" onClick={() => void addNote()} disabled={saving || !body.trim()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("save")}</Button></div>
				</CardContent></Card>
			)}

			{notes.length === 0 ? (
				<Card><CardContent className="flex flex-col items-center py-12 text-center"><ClipboardList className="mb-3 h-9 w-9 text-muted-foreground/50" /><p className="font-medium">{t("empty")}</p><p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p></CardContent></Card>
			) : (
				<div className="grid gap-3 lg:grid-cols-2">{notes.map((note) => (
					<Card key={note.id} className="h-full"><CardContent className="p-4 sm:p-5">
						<div className="flex items-start justify-between gap-3"><div><Badge variant="outline">{t(`categories.${note.preparation_area ?? (note.category === "lineup" ? "lineup" : "general")}`)}</Badge>{note.title && <h3 className="mt-2 font-semibold">{note.title}</h3>}</div>{canEdit && <DeleteNoteButton onDelete={() => deleteNote(note.id)} />}</div>
						<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{note.body}</p>
						<p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{new Date(note.updated_at).toLocaleString(locale)}</p>
					</CardContent></Card>
				))}</div>
			)}
		</div>
	);

	function DeleteNoteButton({ onDelete }: { onDelete: () => Promise<void> }) {
		return <AlertDialog><AlertDialogTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{common("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void onDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
	}
}
