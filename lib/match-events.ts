export type MatchQuarter = 1 | 2 | 3 | 4;
export type MatchEventTeam = "own" | "opponent";
export type MatchEventCategory = "goal" | "shot" | "foul" | "action" | "goalkeeper" | "penalty" | "system";

export interface MatchEvent {
  id?: number;
  match_id?: number;
  club_id?: number;
  sequence: number;
  quarter: MatchQuarter;
  team: MatchEventTeam;
  category: MatchEventCategory;
  stat_key: string;
  delta: number;
  value_after: number;
  player_id?: number | null;
  goalkeeper_player_id?: number | null;
  label?: string | null;
  metadata?: Record<string, unknown>;
  occurred_at: string;
  is_undone?: boolean;
}

export interface MatchEventState {
  events: MatchEvent[];
  activeQuarter: MatchQuarter;
  closedQuarters: Record<MatchQuarter, boolean>;
  quarterScores: Record<MatchQuarter, { home: number; away: number }>;
  stats: Record<number, Record<string, number>>;
}

export const quarters: MatchQuarter[] = [1, 2, 3, 4];

export function emptyQuarterRecord<T>(value: T): Record<MatchQuarter, T> {
  return { 1: value, 2: value, 3: value, 4: value };
}

export function normalizeMatchEvents(input: unknown): MatchEvent[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((event): event is Record<string, unknown> => Boolean(event) && typeof event === "object")
    .map((event, index) => ({
      id: typeof event.id === "number" ? event.id : undefined,
      match_id: typeof event.match_id === "number" ? event.match_id : undefined,
      club_id: typeof event.club_id === "number" ? event.club_id : undefined,
      sequence: Math.max(1, Number(event.sequence) || index + 1),
      quarter: quarters.includes(Number(event.quarter) as MatchQuarter) ? Number(event.quarter) as MatchQuarter : 1,
      team: (event.team === "opponent" ? "opponent" : "own") as MatchEventTeam,
      category: isCategory(event.category) ? event.category : "action",
      stat_key: typeof event.stat_key === "string" ? event.stat_key : "unknown",
      delta: Number.isFinite(Number(event.delta)) ? Number(event.delta) : 0,
      value_after: Number.isFinite(Number(event.value_after)) ? Math.max(0, Number(event.value_after)) : 0,
      player_id: typeof event.player_id === "number" ? event.player_id : null,
      goalkeeper_player_id: typeof event.goalkeeper_player_id === "number" ? event.goalkeeper_player_id : null,
      label: typeof event.label === "string" ? event.label : null,
      metadata: event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {},
      occurred_at: typeof event.occurred_at === "string" ? event.occurred_at : new Date().toISOString(),
      is_undone: event.is_undone === true
    }))
    .sort((a, b) => a.sequence - b.sequence);
}

function isCategory(value: unknown): value is MatchEventCategory {
  return ["goal", "shot", "foul", "action", "goalkeeper", "penalty", "system"].includes(String(value));
}

export function nextEventSequence(events: MatchEvent[]): number {
  return events.reduce((max, event) => Math.max(max, event.sequence), 0) + 1;
}

export function getActiveQuarter(closedQuarters: Partial<Record<MatchQuarter, boolean>>, current: MatchQuarter = 1): MatchQuarter {
  return quarters.find((quarter) => !closedQuarters[quarter] && quarter >= current) ?? 4;
}

export function closeQuarter(state: Pick<MatchEventState, "closedQuarters" | "activeQuarter">): Pick<MatchEventState, "closedQuarters" | "activeQuarter"> {
  const closedQuarters = { ...state.closedQuarters, [state.activeQuarter]: true };
  return { closedQuarters, activeQuarter: getActiveQuarter(closedQuarters, state.activeQuarter + 1 as MatchQuarter) };
}

export function reopenQuarter(state: Pick<MatchEventState, "closedQuarters" | "activeQuarter">, quarter: MatchQuarter) {
  return { closedQuarters: { ...state.closedQuarters, [quarter]: false }, activeQuarter: quarter };
}

export function appendMatchEvent(events: MatchEvent[], event: Omit<MatchEvent, "sequence" | "occurred_at" | "value_after"> & { value_after?: number; occurred_at?: string }): MatchEvent[] {
  const previous = [...events].sort((a, b) => a.sequence - b.sequence).at(-1);
  const priorValue = previous?.stat_key === event.stat_key && previous.player_id === event.player_id && previous.team === event.team ? previous.value_after : 0;
  const valueAfter = Math.max(0, event.value_after ?? priorValue + event.delta);
  if (event.delta < 0 && priorValue + event.delta < 0) return events;
  return [...events, { ...event, sequence: nextEventSequence(events), value_after: valueAfter, occurred_at: event.occurred_at ?? new Date().toISOString(), is_undone: false }];
}

export function undoMatchEvent(events: MatchEvent[], sequence: number): MatchEvent[] {
  return events.map((event) => event.sequence === sequence ? { ...event, is_undone: true } : event);
}

export function calculateProgressiveScores(events: MatchEvent[]): Record<MatchQuarter, { home: number; away: number }> {
  const result = { 1: { home: 0, away: 0 }, 2: { home: 0, away: 0 }, 3: { home: 0, away: 0 }, 4: { home: 0, away: 0 } };
  for (const event of normalizeMatchEvents(events)) {
    if (event.is_undone || event.category !== "goal") continue;
    result[event.quarter] = { ...result[event.quarter], [event.team === "own" ? "home" : "away"]: result[event.quarter][event.team === "own" ? "home" : "away"] + Math.max(0, event.delta) };
  }
  return result;
}

export function applyEventsToStats(events: MatchEvent[]): Record<number, Record<string, number>> {
  const stats: Record<number, Record<string, number>> = {};
  for (const event of normalizeMatchEvents(events)) {
    if (event.is_undone || !event.player_id) continue;
    stats[event.player_id] ??= {};
    stats[event.player_id][event.stat_key] = Math.max(0, (stats[event.player_id][event.stat_key] ?? 0) + event.delta);
  }
  return stats;
}

export function buildEventFromStatChange(input: { quarter: MatchQuarter; team?: MatchEventTeam; playerId?: number | null; goalkeeperPlayerId?: number | null; statKey: string; previous: number; next: number; category?: MatchEventCategory; label?: string }): Omit<MatchEvent, "sequence" | "occurred_at" | "value_after"> | null {
  const delta = input.next - input.previous;
  if (!delta) return null;
  return { quarter: input.quarter, team: input.team ?? "own", category: input.category ?? inferCategory(input.statKey), stat_key: input.statKey, delta, player_id: input.playerId ?? null, goalkeeper_player_id: input.goalkeeperPlayerId ?? null, label: input.label ?? input.statKey, metadata: {} };
}

export function inferCategory(statKey: string): MatchEventCategory {
  if (statKey.includes("gol") || statKey.startsWith("goles")) return "goal";
  if (statKey.includes("tiro") || statKey.startsWith("tiros")) return "shot";
  if (statKey.includes("falta") || statKey.startsWith("faltas")) return "foul";
  if (statKey.startsWith("portero")) return "goalkeeper";
  if (statKey.includes("penalti")) return "penalty";
  return "action";
}

export function eventLabel(event: MatchEvent): string {
  return event.label || event.stat_key.replaceAll("_", " ");
}

export function isMatchEventTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || /(?:match_events|relation).*\b(?:not found|does not exist|schema cache)/i.test(error?.message ?? "");
}

export function getQuarterTotals(scores: Record<MatchQuarter, { home: number; away: number }>) {
  return quarters.reduce((totals, quarter) => ({ home: totals.home + scores[quarter].home, away: totals.away + scores[quarter].away }), { home: 0, away: 0 });
}

export function buildUndoEvent(event: MatchEvent): Omit<MatchEvent, "sequence" | "occurred_at" | "value_after"> {
  return { ...event, delta: -event.delta, label: `Undo: ${eventLabel(event)}`, metadata: { ...(event.metadata ?? {}), undo_of: event.sequence } };
}
