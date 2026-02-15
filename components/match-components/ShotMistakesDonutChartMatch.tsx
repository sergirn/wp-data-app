"use client";

import React, { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Target, TrendingDown, Shield, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table";

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

function pct(numer: number, denom: number) {
  if (!denom) return 0;
  return Math.round((numer / denom) * 1000) / 10;
}

function TinyPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

function MiniBar({
  aLabel,
  aValue,
  aColor,
  bLabel,
  bValue,
  bColor,
  cLabel,
  cValue,
  cColor,
}: {
  aLabel: string;
  aValue: number;
  aColor: string;
  bLabel: string;
  bValue: number;
  bColor: string;
  cLabel: string;
  cValue: number;
  cColor: string;
}) {
  const total = aValue + bValue + cValue;

  const aPct = total > 0 ? aValue / total : 0;
  const bPct = total > 0 ? bValue / total : 0;
  const cPct = total > 0 ? cValue / total : 0;

  return (
    <div className="space-y-2">
      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden border">
        <div className="h-full" style={{ width: `${aPct * 100}%`, background: aColor }} />
        <div className="h-full -mt-2" style={{ width: `${bPct * 100}%`, marginLeft: `${aPct * 100}%`, background: bColor }} />
        <div
          className="h-full -mt-2"
          style={{ width: `${cPct * 100}%`, marginLeft: `${(aPct + bPct) * 100}%`, background: cColor }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: aColor }} />
          <span className="truncate">
            {aLabel}: <span className="font-semibold text-foreground tabular-nums">{aValue}</span> ({pct(aValue, total)}%)
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: bColor }} />
          <span className="truncate">
            {bLabel}: <span className="font-semibold text-foreground tabular-nums">{bValue}</span> ({pct(bValue, total)}%)
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cColor }} />
          <span className="truncate">
            {cLabel}: <span className="font-semibold text-foreground tabular-nums">{cValue}</span> ({pct(cValue, total)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

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

    const pctLocal = (x: number) => (totalMistakes > 0 ? (x / totalMistakes) * 100 : 0);

    const parts = [
      { key: "out", label: "Fuera", value: out, pct: pctLocal(out), color: "hsla(0, 85%, 60%, 1.00)" },
      { key: "blocked", label: "Bloqueado", value: blocked, pct: pctLocal(blocked), color: "hsla(270, 75%, 60%, 1.00)" },
      { key: "saved", label: "Parado", value: saved, pct: pctLocal(saved), color: "hsla(205, 90%, 55%, 1.00)" },
    ];

    const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

    return {
      parts,
      totalMistakes,
      topType,
      out,
      blocked,
      saved,
      outPct: Number(pctLocal(out).toFixed(1)),
      blockedPct: Number(pctLocal(blocked).toFixed(1)),
      savedPct: Number(pctLocal(saved).toFixed(1)),
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
      className="from-transparent"
      rightHeader={<span className="text-xs text-muted-foreground tabular-nums">{summary.totalMistakes}</span>}
      renderChart={({ compact }) => {
        const chartH = compact ? 200 : 280;
        const outer = compact ? 82 : 105;
        const inner = compact ? 57 : 92;

        const pieMargin = compact
          ? { top: 16, right: 12, left: 12, bottom: 26 }
          : { top: 18, right: 12, left: 12, bottom: 34 };

        const outColor = summary.parts.find((p) => p.key === "out")!.color;
        const blockedColor = summary.parts.find((p) => p.key === "blocked")!.color;
        const savedColor = summary.parts.find((p) => p.key === "saved")!.color;

        return (
          <div className="w-full">
            <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
              {/* Donut */}
              <ChartContainer
                config={{
                  out: { label: "Fuera", color: outColor },
                  blocked: { label: "Bloqueado", color: blockedColor },
                  saved: { label: "Parado", color: savedColor },
                }}
              >
                <div className="w-full" style={{ height: chartH }}>
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
                          const pctValue = summary.totalMistakes > 0 ? (v / summary.totalMistakes) * 100 : 0;
                          return [`${v} (${pctValue.toFixed(1)}%)`, props?.payload?.label ?? ""];
                        }}
                        labelFormatter={() => ""}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>

              {/* Preview “clean” (igual que los otros): pills + mini bar */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 pt-1">
                  <TinyPill>
                    Total <span className="ml-1 font-semibold text-foreground tabular-nums">{summary.totalMistakes}</span>
                  </TinyPill>

                  <TinyPill>
                    Fuera{" "}
                    <span className="ml-1 font-semibold text-foreground tabular-nums">
                      {summary.out} ({fmtPct(summary.outPct)})
                    </span>
                  </TinyPill>

                  <TinyPill>
                    Bloq{" "}
                    <span className="ml-1 font-semibold text-foreground tabular-nums">
                      {summary.blocked} ({fmtPct(summary.blockedPct)})
                    </span>
                  </TinyPill>

                  <TinyPill>
                    Parado{" "}
                    <span className="ml-1 font-semibold text-foreground tabular-nums">
                      {summary.saved} ({fmtPct(summary.savedPct)})
                    </span>
                  </TinyPill>

                  {summary.topType ? (
                    <TinyPill>
                      Más frecuente{" "}
                      <span className="ml-1 font-semibold text-foreground">{summary.topType.label}</span>
                    </TinyPill>
                  ) : null}
                </div>

                <div className="rounded-2xl border bg-card/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Distribución</p>
                  <MiniBar
                    aLabel="Fuera"
                    aValue={summary.out}
                    aColor={outColor}
                    bLabel="Bloq"
                    bValue={summary.blocked}
                    bColor={blockedColor}
                    cLabel="Parado"
                    cValue={summary.saved}
                    cColor={savedColor}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }}
      renderTable={() => (
        <div className="rounded-2xl border bg-card/40 overflow-hidden w-full">
          {/* header consistente */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{matchTitle}</p>
              <p className="text-xs text-muted-foreground">
                {match?.jornada ? `J${match.jornada}` : ""} {matchDate ? `· ${matchDate}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                Total {summary.totalMistakes}
              </Badge>
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                Fuera {summary.out}
              </Badge>
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                Bloq {summary.blocked}
              </Badge>
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                Parado {summary.saved}
              </Badge>
            </div>
          </div>

          {/* “cards” pequeñas como superioridad/inferioridad */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">Fuera</span>
                </div>
                <span className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">{summary.out}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <XCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Bloqueados</span>
                </div>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-300 tabular-nums">{summary.blocked}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Parados</span>
                </div>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">{summary.saved}</span>
              </div>
            </div>

            {/* Tabla jugadores */}
            <div className="rounded-2xl border bg-background/40 overflow-hidden">
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
                          {r.player
                            ? `${r.player.number != null ? `#${r.player.number} ` : ""}${r.player.name}`
                            : `#${r.playerId}`}
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
          </div>
        </div>
      )}
    />
  );
}
