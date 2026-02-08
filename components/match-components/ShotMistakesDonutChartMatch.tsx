"use client";

import React, { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

type PlayerLiteInput = {
  id: number;
  name?: string | null;
  full_name?: string | null;
  number?: number | null;
  photo_url?: string | null;
};

type PlayerLite = { id: number; name: string; number?: number | null; photo_url?: string | null };

type MatchLite = { id: number; opponent?: string | null; match_date?: string | null; jornada?: number | null };

interface ShotMistakesDonutChartMatchProps {
  match: MatchLite | null;
  stats: any[];
  players: PlayerLiteInput[];
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtPct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;

export function ShotMistakesDonutChartMatch({ match, stats, players }: ShotMistakesDonutChartMatchProps) {
  const normalizedPlayers: PlayerLite[] = useMemo(() => {
    return (players ?? []).map((p) => {
      const candidate = (p.name ?? p.full_name ?? "").trim();
      return {
        id: p.id,
        name: candidate.length ? candidate : `Jugador ${p.id}`,
        number: p.number ?? null,
        photo_url: p.photo_url ?? null,
      };
    });
  }, [players]);

  const playersById = useMemo(() => {
    const m = new Map<number, PlayerLite>();
    normalizedPlayers.forEach((p) => m.set(p.id, p));
    return m;
  }, [normalizedPlayers]);

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
      out,
      blocked,
      saved,
      outPct: Number(pct(out).toFixed(1)),
      blockedPct: Number(pct(blocked).toFixed(1)),
      savedPct: Number(pct(saved).toFixed(1)),
    };
  }, [stats]);

  const perPlayer = useMemo(() => {
    const m = new Map<number, { out: number; blocked: number; saved: number }>();

    (stats ?? []).forEach((s: any) => {
      const pid = Number(s.player_id);
      if (!pid) return;
      const cur = m.get(pid) ?? { out: 0, blocked: 0, saved: 0 };
      cur.out += toNum(s.tiros_fuera);
      cur.blocked += toNum(s.tiros_bloqueado);
      cur.saved += toNum(s.tiros_parados);
      m.set(pid, cur);
    });

    return [...m.entries()]
      .map(([playerId, v]) => {
        const total = v.out + v.blocked + v.saved;
        return {
          playerId,
          player: playersById.get(playerId) ?? null,
          ...v,
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [stats, playersById]);

  if (!summary.totalMistakes) return null;

  const matchTitle = match?.opponent ? `vs ${match.opponent}` : "Partido";
  const matchDate = match?.match_date ? new Date(match.match_date).toLocaleDateString("es-ES") : "";
  const mostFrequentText = summary.topType ? `${summary.topType.label}` : "Sin datos";

  return (
    <ExpandableChartCard
      title="Distribución de fallos de tiro"
      description={`${matchTitle} · ${mostFrequentText} · Total ${summary.totalMistakes}`}
      icon={<Target className="h-5 w-5" />}
      renderChart={({ compact }) => {

        const chartH = compact ? 200 : 280;

        const outer = compact ? 82 : 105;
        const inner = compact ? 57 : 92;

        const pieMargin = compact
          ? { top: 16, right: 12, left: 12, bottom: 26 }
          : { top: 18, right: 12, left: 12, bottom: 34 };

        return (
          <div className="w-full">

            <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
              {/* Donut */}
              <ChartContainer
                config={{
                  out: { label: "Fuera", color: summary.parts[0].color },
                  blocked: { label: "Bloqueado", color: summary.parts[1].color },
                  saved: { label: "Parado", color: summary.parts[2].color },
                }}
              >
                <div className={`w-full`} style={{ height: chartH }}>
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

              {/* Resumen (como en Superioridad) */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className="bg-muted/30">
                    Total: <span className="ml-1 font-semibold text-foreground tabular-nums">{summary.totalMistakes}</span>
                  </Badge>

                  <Badge variant="outline" className="bg-muted/30">
                    Fuera:{" "}
                    <span className="ml-1 font-semibold text-foreground tabular-nums">
                      {summary.out} ({fmtPct(summary.outPct)})
                    </span>
                  </Badge>

                  <Badge variant="outline" className="bg-muted/30">
                    Bloqueado:{" "}
                    <span className="ml-1 font-semibold text-foreground tabular-nums">
                      {summary.blocked} ({fmtPct(summary.blockedPct)})
                    </span>
                  </Badge>

                  <Badge variant="outline" className="bg-muted/30">
                    Parado:{" "}
                    <span className="ml-1 font-semibold text-foreground tabular-nums">
                      {summary.saved} ({fmtPct(summary.savedPct)})
                    </span>
                  </Badge>

                  {summary.topType ? (
                    <Badge variant="outline" className="bg-muted/30">
                      Más frecuente: <span className="ml-1 font-semibold text-foreground">{summary.topType.label}</span>
                    </Badge>
                  ) : null}
                </div>

                {/* Leyenda compacta (opcional) */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground pt-2">
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
              </div>
            </div>
          </div>
        );
      }}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">{matchTitle}</p>
            <p className="text-xs text-muted-foreground">
              {match?.jornada ? `J${match.jornada}` : ""} {matchDate ? `· ${matchDate}` : ""}
            </p>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="min-w-[720px]">
              <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Jugador</TableHead>
                  <TableHead className="text-right">Fuera</TableHead>
                  <TableHead className="text-right">Bloq</TableHead>
                  <TableHead className="text-right">Parado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </UITableHeader>

              <TableBody>
                {perPlayer.map((r, idx) => (
                  <TableRow
                    key={r.playerId}
                    className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                  >
                    <TableCell className="font-medium">
                      {r.player ? `${r.player.number != null ? `#${r.player.number} ` : ""}${r.player.name}` : `#${r.playerId}`}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">{r.out}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.blocked}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.saved}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{r.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Total fallos (partido):{" "}
            <span className="font-semibold text-foreground tabular-nums">{summary.totalMistakes}</span>
          </div>
        </div>
      )}
    />
  );
}
