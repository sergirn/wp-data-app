"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MatchEvent, MatchQuarter } from "@/lib/match-events";
import { eventLabel } from "@/lib/match-events";

type Props = { events: MatchEvent[]; players: Array<{ id: number; name: string; number: number }>; title: string; emptyLabel: string; allLabel: string; quarterLabel: string; undoneLabel: string; teamLabels: { own: string; opponent: string } };

export function MatchTimeline({ events, players, title, emptyLabel, allLabel, quarterLabel, undoneLabel, teamLabels }: Props) {
  const [quarter, setQuarter] = useState("all");
  const [category, setCategory] = useState("all");
  const playerNames = useMemo(() => new Map(players.map((player) => [player.id, `#${player.number} ${player.name}`])), [players]);
  const filtered = events.filter((event) => (quarter === "all" || String(event.quarter) === quarter) && (category === "all" || event.category === category));
  const categories = [...new Set(events.map((event) => event.category))];

  return <Card className="mt-6">
    <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle>{title}</CardTitle>
      <div className="flex flex-wrap gap-2">
        <Select value={quarter} onValueChange={setQuarter}><SelectTrigger className="w-32"><SelectValue placeholder={quarterLabel} /></SelectTrigger><SelectContent><SelectItem value="all">{allLabel}</SelectItem>{([1, 2, 3, 4] as MatchQuarter[]).map((q) => <SelectItem key={q} value={String(q)}>{quarterLabel} {q}</SelectItem>)}</SelectContent></Select>
        <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-32"><SelectValue placeholder={allLabel} /></SelectTrigger><SelectContent><SelectItem value="all">{allLabel}</SelectItem>{categories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
      </div>
    </CardHeader>
    <CardContent>{filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p> : <ol className="flex flex-col gap-3">{filtered.map((event) => <li key={`${event.sequence}-${event.id ?? "draft"}`} className="flex items-start gap-3 rounded-lg border p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">{event.sequence}</span>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{eventLabel(event)}</span><Badge variant="outline">{quarterLabel} {event.quarter}</Badge><Badge variant={event.team === "own" ? "default" : "secondary"}>{teamLabels[event.team]}</Badge>{event.is_undone && <Badge variant="destructive">{undoneLabel}</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{event.player_id ? playerNames.get(event.player_id) : event.goalkeeper_player_id ? playerNames.get(event.goalkeeper_player_id) : null} · {event.delta > 0 ? "+" : ""}{event.delta} · {new Date(event.occurred_at).toLocaleTimeString()}</p></div>
    </li>)}</ol>}</CardContent>
  </Card>;
}
