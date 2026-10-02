"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardList, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { OpponentNote, OpponentNoteCategory, OpponentPreparationArea } from "@/lib/types";

const PREPARATION_AREAS: OpponentPreparationArea[] = ["general", "lineup", "defense", "powerPlay", "goalkeeper"];
type NotesFilter = "all" | OpponentPreparationArea;

function getNoteArea(note: OpponentNote): OpponentPreparationArea {
	if (note.preparation_area) return note.preparation_area;
	return note.category === "lineup" ? "lineup" : "general";
}

function getNoteCategory(area: OpponentPreparationArea): OpponentNoteCategory {
	if (area === "lineup") return "lineup";
	if (area === "general") return "general";
	return "tactical";
}

export function OpponentNotes({ opponentId, clubId, profileId, notes, canEdit, onNotesChange }: { opponentId: number; clubId: number; profileId: string; notes: OpponentNote[]; canEdit: boolean; onNotesChange: (notes: OpponentNote[]) => void }) {
	const t = useTranslations("Opponents.notes");
	const common = useTranslations("Common");
	const locale = useLocale();
	const [preparationArea, setPreparationArea] = useState<OpponentPreparationArea>("general");
	const [filter, setFilter] = useState<NotesFilter>("all");
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [editingId, setEditingId] = useState<number | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const visibleNotes = useMemo(() => filter === "all" ? notes : notes.filter((note) => getNoteArea(note) === filter), [filter, notes]);

	const resetForm = () => {
		setPreparationArea("general");
		setTitle("");
		setBody("");
		setEditingId(null);
		setError(null);
	};

	const editNote = (note: OpponentNote) => {
		setPreparationArea(getNoteArea(note));
		setTitle(note.title ?? "");
		setBody(note.body);
		setEditingId(note.id);
		setError(null);
	};

	const saveNote = async () => {
		if (!body.trim()) return;
		setSaving(true);
		setError(null);
		const supabase = createClient();
		const values = { category: getNoteCategory(preparationArea), preparation_area: preparationArea, title: title.trim() || null, body: body.trim(), updated_at: new Date().toISOString() };
		const query = editingId === null
			? supabase.from("opponent_notes").insert({ ...values, opponent_id: opponentId, club_id: clubId, created_by: profileId })
			: supabase.from("opponent_notes").update(values).eq("id", editingId).eq("opponent_id", opponentId);
		const { data, error: saveError } = await query.select("*").single();
		if (saveError || !data) setError(t("saveError"));
		else {
			const savedNote = data as OpponentNote;
			const nextNotes = editingId === null ? [savedNote, ...notes] : notes.map((note) => note.id === savedNote.id ? savedNote : note);
			onNotesChange(nextNotes.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
			resetForm();
		}
		setSaving(false);
	};

	const deleteNote = async (id: number) => {
		setError(null);
		const supabase = createClient();
		const { error: deleteError } = await supabase.from("opponent_notes").delete().eq("id", id).eq("opponent_id", opponentId);
		if (deleteError) setError(t("deleteError"));
		else {
			onNotesChange(notes.filter((note) => note.id !== id));
			if (editingId === id) resetForm();
		}
	};

	return (
		<Card className="gap-0 overflow-hidden py-0 sm:gap-0 sm:py-0">
			<CardHeader className="border-b bg-muted/10 py-4 sm:py-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="size-5 text-primary" />{t("sectionTitle")}</CardTitle><CardDescription className="mt-1">{t("sectionDescription")}</CardDescription></div>
					<Select value={filter} onValueChange={(value) => setFilter(value as NotesFilter)}><SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("allCategories")}</SelectItem>{PREPARATION_AREAS.map((item) => <SelectItem key={item} value={item}>{t(`categories.${item}`)}</SelectItem>)}</SelectContent></Select>
				</div>
			</CardHeader>
			<CardContent className="space-y-5 p-4 sm:p-5">
				{canEdit && (
					<div className="rounded-xl border border-primary/20 bg-primary/[0.025] p-4">
						<div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2">{editingId === null ? <Plus className="h-4 w-4 text-primary" /> : <Pencil className="h-4 w-4 text-primary" />}<h3 className="font-semibold">{editingId === null ? t("new") : t("editing")}</h3></div>{editingId !== null && <Button type="button" size="sm" variant="ghost" onClick={resetForm}><X className="mr-1.5 h-4 w-4" />{common("cancel")}</Button>}</div>
						<div className="grid gap-3 sm:grid-cols-[180px_1fr]">
							<Select value={preparationArea} onValueChange={(value) => setPreparationArea(value as OpponentPreparationArea)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PREPARATION_AREAS.map((item) => <SelectItem key={item} value={item}>{t(`categories.${item}`)}</SelectItem>)}</SelectContent></Select>
							<Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("titlePlaceholder")} maxLength={120} />
						</div>
						<Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={t("bodyPlaceholder")} rows={4} maxLength={5000} className="mt-3" />
						<div className="mt-3 flex items-center justify-between gap-3">{error ? <p className="text-xs text-destructive">{error}</p> : <span />}<Button type="button" onClick={() => void saveNote()} disabled={saving || !body.trim()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId === null ? <Plus className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}{editingId === null ? t("save") : t("update")}</Button></div>
					</div>
				)}

				{visibleNotes.length === 0 ? (
					<div className="flex flex-col items-center py-10 text-center"><ClipboardList className="mb-3 h-9 w-9 text-muted-foreground/50" /><p className="font-medium">{filter === "all" ? t("empty") : t("emptyCategory")}</p><p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p></div>
				) : (
					<div className="grid gap-3 lg:grid-cols-2">{visibleNotes.map((note) => (
						<div key={note.id} className="rounded-xl border bg-card p-4">
							<div className="flex items-start justify-between gap-3"><div><Badge variant="outline">{t(`categories.${getNoteArea(note)}`)}</Badge><h3 className="mt-2 font-semibold">{note.title || t("untitled")}</h3></div>{canEdit && <div className="flex shrink-0"><Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => editNote(note)} aria-label={t("edit")}><Pencil className="h-4 w-4" /></Button><DeleteNoteButton onDelete={() => deleteNote(note.id)} /></div>}</div>
							<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{note.body}</p>
							<p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{new Date(note.updated_at).toLocaleString(locale)}</p>
						</div>
					))}</div>
				)}
			</CardContent>
		</Card>
	);

	function DeleteNoteButton({ onDelete }: { onDelete: () => Promise<void> }) {
		return <AlertDialog><AlertDialogTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{common("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void onDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
	}
}
