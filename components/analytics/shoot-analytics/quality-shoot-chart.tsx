"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

type PlayerLite = { id: number; name: string; number?: number; photo_url?: string };

interface ShotMistakesDonutChartProps {
  matches: any[];
  stats: any[];
  players: PlayerLite[];
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtPct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;

function playerLabelShort(p: PlayerLite | null, value: number) {
  if (!p) return "—";
  const num = p.number != null ? `#${p.number}` : "#-";
  return `${num} (${value})`;
}

function playerLabelFull(p: PlayerLite | null, value: number) {
  if (!p) return "—";
  const num = p.number != null ? `#${p.number}` : "#-";
  return `${num} ${p.name} (${value})`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width ?? 0;
      setWidth(w);
    });

    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);

    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

export function ShotMistakesDonutChart({ matches, stats, players }: ShotMistakesDonutChartProps) {
  const playersById = useMemo(() => {
    const m = new Map<number, PlayerLite>();
    (players ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [players]);

  const summary = useMemo(() => {
    const all = stats ?? [];

    const out = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_fuera), 0);
    const blocked = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_bloqueado), 0);
    const saved = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_parados), 0);

    const totalMistakes = out + blocked + saved;
    const pct = (x: number) => (totalMistakes > 0 ? (x / totalMistakes) * 100 : 0);

    const parts = [
      { key: "out", label: "Fuera", value: out, pct: pct(out), color: "hsla(0, 85%, 60%, 1.00)" },
      { key: "blocked", label: "Bloqueado", value: blocked, pct: pct(blocked), color: "hsla(270, 75%, 60%, 1.00)" },
      { key: "saved", label: "Parado", value: saved, pct: pct(saved), color: "hsla(205, 90%, 55%, 1.00)" },
    ];

    const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

    return {
      parts,
      totalMistakes,
      topType,
      totalMatches: (matches ?? []).length || 0,
    };
  }, [matches, stats]);

  const topPlayers = useMemo(() => {
    const sumByPlayer = (field: "tiros_fuera" | "tiros_bloqueado" | "tiros_parados") => {
      const m = new Map<number, number>();
      (stats ?? []).forEach((s: any) => {
        const pid = Number(s.player_id);
        if (!pid) return;
        m.set(pid, (m.get(pid) ?? 0) + toNum(s[field]));
      });

      let bestId: number | null = null;
      let bestVal = 0;

      for (const [pid, v] of m.entries()) {
        if (v > bestVal) {
          bestVal = v;
          bestId = pid;
        }
      }

      return { player: bestId ? playersById.get(bestId) ?? null : null, value: bestVal };
    };

    return {
      out: sumByPlayer("tiros_fuera"),
      blocked: sumByPlayer("tiros_bloqueado"),
      saved: sumByPlayer("tiros_parados"),
    };
  }, [stats, playersById]);

  const perMatch = useMemo(() => {
    const sorted = [...(matches ?? [])].sort((a, b) => {
      const aj = a?.jornada ?? 9999;
      const bj = b?.jornada ?? 9999;
      if (aj !== bj) return aj - bj;
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
    });

    return sorted.slice(-15).map((match, idx) => {
      const matchStats = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

      const out = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_fuera), 0);
      const blocked = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_bloqueado), 0);
      const saved = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_parados), 0);

      const total = out + blocked + saved;
      const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

      const jornadaNumber = match.jornada ?? idx + 1;

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        rival: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

        out,
        blocked,
        saved,
        total,
        outPct: Number(pct(out).toFixed(1)),
        blockedPct: Number(pct(blocked).toFixed(1)),
        savedPct: Number(pct(saved).toFixed(1)),
      };
    });
  }, [matches, stats]);

  if (!summary.totalMatches) return null;

  const topLineCompact =
    summary.totalMistakes > 0
      ? `Fuera ${playerLabelShort(topPlayers.out.player, topPlayers.out.value)} · Bloq ${playerLabelShort(
          topPlayers.blocked.player,
          topPlayers.blocked.value,
        )} · Parado ${playerLabelShort(topPlayers.saved.player, topPlayers.saved.value)}`
      : "Sin datos";

  const topLineFull =
    summary.totalMistakes > 0
      ? `Top (temporada): Fuera ${playerLabelFull(topPlayers.out.player, topPlayers.out.value)} · Bloqueado ${playerLabelFull(
          topPlayers.blocked.player,
          topPlayers.blocked.value,
        )} · Parado ${playerLabelFull(topPlayers.saved.player, topPlayers.saved.value)}`
      : "Top (temporada): —";

  const mostFrequentText =
    summary.totalMistakes > 0 && summary.topType ? `${summary.topType.label}` : "Sin datos de fallos";

  const { ref: wrapRef, width: wrapWidth } = useElementWidth<HTMLDivElement>();

  return (
    <ExpandableChartCard
      title="Distribución de fallos de tiro"
      description={`${mostFrequentText} · ${topLineCompact}`}
      icon={<Target className="w-5 h-5" />}
      className="bg-gradient-to-br from-rose-500/5 to-white-500/5"
      rightHeader={
        <span className="text-xs text-muted-foreground">
          {summary.totalMistakes ? `${summary.topType?.label ?? "—"}` : "—"}
        </span>
      }
      renderChart={({ compact }) => {
        const w = wrapWidth || 360;
        const isTablet = w >= 520 && w <= 900;

        // ✅ Donut más grande
        const baseOuter = clamp(
          Math.round(w * (compact ? 0.25 : 0.30)), // antes 0.22/0.26
          compact ? 72 : 86,                      // mínimos más grandes
          compact ? 110 : 132                     // máximos más grandes
        );

        // ✅ En tablet lo reducimos un pelín para evitar cortes
        const outer = isTablet ? Math.round(baseOuter * 0.95) : baseOuter;

        const inner = clamp(Math.round(outer * 0.62), 50, 88);

        // ✅ Contenedor del chart más alto (lo que tú pides)
        const baseHeight = compact
          ? clamp(Math.round(w * 0.62), 220, 300)  // antes 180..230
          : clamp(Math.round(w * 0.70), 280, 360); // antes 220..280

        // ✅ En tablet, mínimo todavía mayor para que no se corte
        const chartHeight = isTablet ? Math.max(baseHeight, compact ? 260 : 320) : baseHeight;

        // ✅ Más margen vertical para que el donut “respire”
        const pieMargin = isTablet
          ? { top: 22, right: 12, left: 12, bottom: 22 }
          : { top: 14, right: 10, left: 10, bottom: 14 };

        return (
          <div ref={wrapRef} className="w-full">
            <div className="space-y-3 sm:space-y-4">
              <ChartContainer
                config={{
                  out: { label: "Fuera", color: summary.parts[0].color },
                  blocked: { label: "Bloqueado", color: summary.parts[1].color },
                  saved: { label: "Parado", color: summary.parts[2].color },
                }}
                className="w-full"
              >
                <div className="w-full" style={{ height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={pieMargin}>
                      <Pie
                        data={summary.parts}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={inner}
                        outerRadius={outer}
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                        cx="50%"
                        cy="50%"
                      >
                        {summary.parts.map((p) => (
                          <Cell key={p.key} fill={p.color} />
                        ))}
                      </Pie>

                      <RechartsTooltip
                        formatter={(value: any, _name: any, props: any) => {
                          const v = toNum(value);
                          const pct = summary.totalMistakes > 0 ? (v / summary.totalMistakes) * 100 : 0;
                          return [`${v} (${pct.toFixed(1)}%)`, props?.payload?.label ?? ""];
                        }}
                        labelFormatter={() => ""}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground mt-20">
                {summary.parts.map((p) => (
                  <div key={p.key} className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="whitespace-nowrap">
                      <span className="font-medium text-foreground">{p.label}</span>{" "}
                      <span className="tabular-nums">{fmtPct(p.pct)}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
                {summary.parts.map((p) => (
                  <div
                    key={p.key}
                    className="rounded-lg border p-3 text-center"
                    style={{ backgroundColor: `${p.color}10` }}
                    title={p.label}
                  >
                    <p className="text-xs text-muted-foreground">{p.label}</p>
                    <p className="text-lg sm:text-xl font-bold tabular-nums">{p.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.totalMistakes ? Math.round((p.value / summary.totalMistakes) * 100) : 0}%
                    </p>
                  </div>
                ))}
              </div>

              {!compact ? (
                <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{topLineFull}</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      }}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[980px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Jornada</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-right">Fuera</TableHead>
                    <TableHead className="text-right">Bloq</TableHead>
                    <TableHead className="text-right">Parado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {perMatch.map((m, idx) => (
                    <TableRow
                      key={m.matchId}
                      className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                    >
                      <TableCell className="font-semibold">{m.jornada}</TableCell>

                      <TableCell className="max-w-[360px]">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.rival}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {m.out} <span className="text-xs text-muted-foreground">({fmtPct(m.outPct)})</span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {m.blocked} <span className="text-xs text-muted-foreground">({fmtPct(m.blockedPct)})</span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {m.saved} <span className="text-xs text-muted-foreground">({fmtPct(m.savedPct)})</span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">{m.total}</TableCell>

                      <TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="border-t bg-muted/20 px-3 py-2">
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium text-foreground">{perMatch.length}</span> partidos (últimos)
                </span>

                <span className="rounded-md border bg-card px-2 py-1">
                  Fallos (temp): <span className="font-semibold text-foreground tabular-nums">{summary.totalMistakes}</span>
                </span>
              </div>

              <div className="rounded-md border bg-card px-2 py-1">
                <span className="font-semibold text-foreground">{topLineFull}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );
}
