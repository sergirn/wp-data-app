import { describe, expect, it } from "vitest";
import { appendMatchEvent, applyEventsToStats, buildEventFromStatChange, calculateProgressiveScores, closeQuarter, getActiveQuarter, normalizeMatchEvents, reopenQuarter, undoMatchEvent } from "./match-events";

const base = { quarter: 1 as const, team: "own" as const, category: "goal" as const, stat_key: "goles_boya_jugada", delta: 1, player_id: 10, goalkeeper_player_id: null, metadata: {} };

describe("match events", () => {
  it("sequences events and calculates progressive own/opponent scores", () => {
    const first = appendMatchEvent([], base);
    const events = appendMatchEvent(first, { ...base, team: "opponent", player_id: null });
    expect(events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(calculateProgressiveScores(events)[1]).toEqual({ home: 1, away: 1 });
  });

  it("does not allow a negative value and applies active events to stats", () => {
    const events = appendMatchEvent([], { ...base, delta: -1, value_after: -1 });
    expect(events).toHaveLength(0);
    const applied = applyEventsToStats(appendMatchEvent([], base));
    expect(applied[10].goles_boya_jugada).toBe(1);
  });

  it("closes, advances, and reopens quarters", () => {
    const state = { activeQuarter: 1 as const, closedQuarters: { 1: false, 2: false, 3: false, 4: false } };
    const closed = closeQuarter(state);
    expect(closed.activeQuarter).toBe(2);
    expect(getActiveQuarter({ 1: true, 2: true, 3: false })).toBe(3);
    expect(reopenQuarter(closed, 1).activeQuarter).toBe(1);
  });

  it("marks an event undone without deleting it", () => {
    const events = appendMatchEvent([], base);
    const undone = undoMatchEvent(events, 1);
    expect(undone).toHaveLength(1);
    expect(undone[0].is_undone).toBe(true);
  });

  it("normalizes legacy and malformed draft event data", () => {
    const events = normalizeMatchEvents([{ sequence: "2", quarter: 9, stat_key: "acciones_bloqueo", delta: "2" }]);
    expect(events[0]).toMatchObject({ sequence: 2, quarter: 1, delta: 2, team: "own" });
  });

  it("builds a meaningful stat change event", () => {
    expect(buildEventFromStatChange({ quarter: 2, playerId: 10, statKey: "faltas_penalti", previous: 0, next: 1 })).toMatchObject({ category: "foul", delta: 1 });
    expect(buildEventFromStatChange({ quarter: 2, playerId: 10, statKey: "goles_boya_jugada", previous: 1, next: 1 })).toBeNull();
  });
});
