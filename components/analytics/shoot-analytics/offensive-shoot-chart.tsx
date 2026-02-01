"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

type PlayerLite = { id: number; name: string; number?: number; photo_url?: string };

interface GoalMixChartProps {
  matches: any[];
  stats: any[];
  players: PlayerLite[];
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtPct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;

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

export function GoalMixChart({ matches, stats, players }: GoalMixChartProps) {
  const playersById = useMemo(() => {
    const m = new Map<number, PlayerLite>();
    (players ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [players]);

  const summary = useMemo(() => {
    const all = stats ?? [];

    const boya = all.reduce((sum: number, s: any) => sum + toNum(s.goles_boya_jugada), 0);
    const sup = all.reduce((sum: number, s: any) => sum + toNum(s.goles_hombre_mas), 0);
    const contra = all.reduce((sum: number, s: any) => sum + toNum(s.goles_contraataque), 0);

    const total = boya + sup + contra;
    const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

    const parts = [
      { key: "boya", label: "Boya", value: boya, pct: pct(boya), color: "hsla(140, 70%, 45%, 1.00)" },
      { key: "sup", label: "Sup.", value: sup, pct: pct(sup), color: "hsla(59, 85%, 45%, 1.00)" },
      { key: "contra", label: "Contraataque", value: contra, pct: pct(contra), color: "hsla(205, 90%, 55%, 1.00)" },
    ];

    const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

    return {
      parts,
      total,
      topType,
      totalMatches: (matches ?? []).length || 0,
    };
  }, [matches, stats]);

  const topPlayers = useMemo(() => {
    const sumByPlayer = (field: "goles_boya_jugada" | "goles_hombre_mas" | "goles_contraataque") => {
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
      boya: sumByPlayer("goles_boya_jugada"),
      sup: sumByPlayer("goles_hombre_mas"),
      contra: sumByPlayer("goles_contraataque"),
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

      const boya = matchStats.reduce((sum: number, s: any) => sum + toNum(s.goles_boya_jugada), 0);
      const sup = matchStats.reduce((sum: number, s: any) => sum + toNum(s.goles_hombre_mas), 0);
      const contra = matchStats.reduce((sum: number, s: any) => sum + toNum(s.goles_contraataque), 0);

      const total = boya + sup + contra;
      const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

      const jornadaNumber = match.jornada ?? idx + 1;

      return {
        matchId: match.id,
        jornadaNumber,
        jornada: `J${jornadaNumber}`,
        rival: match.opponent,
        fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
        boya,
        sup,
        contra,
        total,
        boyaPct: Number(pct(boya).toFixed(1)),
        supPct: Number(pct(sup).toFixed(1)),
        contraPct: Number(pct(contra).toFixed(1)),
      };
    });
  }, [matches, stats]);

  if (!summary.totalMatches) return null;

  const topLineCompact =
    summary.total > 0
      ? `Boya ${playerLabelShort(topPlayers.boya.player, topPlayers.boya.value)} · Sup ${playerLabelShort(
          topPlayers.sup.player,
          topPlayers.sup.value
        )} · Contra ${playerLabelShort(topPlayers.contra.player, topPlayers.contra.value)}`
      : "Sin datos";

  const topLineFull =
    summary.total > 0
      ? `Top (temporada): Boya ${playerLabelFull(topPlayers.boya.player, topPlayers.boya.value)} · Superioridad ${playerLabelFull(
          topPlayers.sup.player,
          topPlayers.sup.value
        )} · Contraataque ${playerLabelFull(topPlayers.contra.player, topPlayers.contra.value)}`
      : "Top (temporada): —";

  const mostFrequentText = summary.total > 0 && summary.topType ? `${summary.topType.label}` : "Sin datos";

  const { ref: wrapRef, width: wrapWidth } = useElementWidth<HTMLDivElement>();

  return (
    <ExpandableChartCard
      title="Eficiencia ofensiva"
      description={`${mostFrequentText} · ${topLineCompact}`}
      icon={<Target className="w-5 h-5" />}
      className="bg-gradient-to-br from-emerald-500/5 to-white-500/5"
      rightHeader={<span className="text-xs text-muted-foreground">{summary.total ? summary.topType?.label ?? "—" : "—"}</span>}
      renderChart={({ compact }) => {
        const w = wrapWidth || 360;
        const isTablet = w >= 520 && w <= 900;

        // mismo “estilo” que tu donut ya ajustado (grande, sin cortes)
        const baseOuter = clamp(Math.round(w * (compact ? 0.25 : 0.30)), compact ? 72 : 86, compact ? 110 : 132);
        const outer = isTablet ? Math.round(baseOuter * 0.95) : baseOuter;
        const inner = clamp(Math.round(outer * 0.62), 50, 88);

        const baseHeight = compact ? clamp(Math.round(w * 0.62), 220, 300) : clamp(Math.round(w * 0.70), 280, 360);
        const chartHeight = isTablet ? Math.max(baseHeight, compact ? 260 : 320) : baseHeight;

        const pieMargin = isTablet ? { top: 22, right: 12, left: 12, bottom: 22 } : { top: 14, right: 10, left: 10, bottom: 14 };

        return (
          <div ref={wrapRef} className="w-full">
            <div className="space-y-3 sm:space-y-4">
              <ChartContainer
                config={{
                  boya: { label: "Boya", color: summary.parts[0].color },
                  sup: { label: "Superioridad", color: summary.parts[1].color },
                  contra: { label: "Contraataque", color: summary.parts[2].color },
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
                          const pct = summary.total > 0 ? (v / summary.total) * 100 : 0;
                          return [`${v} (${pct.toFixed(1)}%)`, props?.payload?.label ?? ""];
                        }}
                        labelFormatter={() => ""}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>

              {/* Leyenda fuera del donut (sin solapar) */}
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

              {/* mini-cards (3) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {summary.parts.map((p) => (
                  <div key={p.key} className="rounded-lg border p-3 text-center" style={{ backgroundColor: `${p.color}10` }}>
                    <p className="text-xs text-muted-foreground">{p.label}</p>
                    <p className="text-lg sm:text-xl font-bold tabular-nums">{p.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.total ? Math.round((p.value / summary.total) * 100) : 0}%
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
                    <TableHead className="text-right">Boya</TableHead>
                    <TableHead className="text-right">Sup</TableHead>
                    <TableHead className="text-right">Contra</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {perMatch.map((m, idx) => (
                    <TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
                      <TableCell className="font-semibold">{m.jornada}</TableCell>

                      <TableCell className="max-w-[360px]">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.rival}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {m.boya} <span className="text-xs text-muted-foreground">({fmtPct(m.boyaPct)})</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.sup} <span className="text-xs text-muted-foreground">({fmtPct(m.supPct)})</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.contra} <span className="text-xs text-muted-foreground">({fmtPct(m.contraPct)})</span>
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
                  Goles (mix): <span className="font-semibold text-foreground tabular-nums">{summary.total}</span>
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
