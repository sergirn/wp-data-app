"use client";

import { useState } from "react";
import { Link2, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type AliasRow = { id: number; alias: string };

export function OpponentAliasManager({ opponentId, aliases, canEdit, onChanged }: { opponentId: number; aliases: AliasRow[]; canEdit: boolean; onChanged: () => Promise<void> }) {
	const t = useTranslations("Opponents.aliases");
	const [alias, setAlias] = useState("");
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const handleAdd = async () => {
		const value = alias.trim();
		if (!value) return;
		setSaving(true);
		setMessage(null);
		const supabase = createClient();
		const { data, error } = await supabase.rpc("assign_opponent_alias", { p_opponent_id: opponentId, p_alias: value });
		if (error) setMessage(t("error"));
		else {
			const linked = Number((data as { linked_matches?: number } | null)?.linked_matches ?? 0);
			setMessage(linked > 0 ? t("linked", { count: linked }) : t("saved"));
			setAlias("");
			await onChanged();
		}
		setSaving(false);
	};

	return (
		<div className="rounded-2xl border bg-muted/15 p-4">
			<div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">{t("title")}</h3></div>
			<p className="mt-1 text-xs leading-5 text-muted-foreground">{t("description")}</p>
			{aliases.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{aliases.map((item) => <Badge key={item.id} variant="secondary">{item.alias}</Badge>)}</div>}
			{canEdit && (
				<div className="mt-3 flex gap-2">
					<Input value={alias} onChange={(event) => setAlias(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleAdd(); } }} placeholder={t("placeholder")} className="h-9" />
					<Button type="button" size="sm" className="h-9 shrink-0" onClick={() => void handleAdd()} disabled={saving || !alias.trim()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}<span className="hidden sm:inline">{t("add")}</span></Button>
				</div>
			)}
			{message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
		</div>
	);
}
