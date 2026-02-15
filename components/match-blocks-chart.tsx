"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

type BlocksStats = {
  bloqueos: number;
  golesRecibidos: number;
  eficacia: number; // (no nos fiamos, recalculamos)
};

// Ajusta el tipo a tu MatchStats real si lo tienes tipado
type MatchStatRow = {
  id?: number;
  acciones_bloqueo?: number | null;
  players: {
    id: number;
    name: string;
    number?: number | null;
    photo_url?: string | null;
  };
};

const COLOR_OK = "#3a6bbbc4";
const COLOR_BAD = "#ac2020c7";

function pct(numer: number, denom: number) {
  if (!denom) return 0;
  return Math.round((numer / denom) * 1000) / 10;
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function TinyPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

function Row({
  label,
  value,
  subtle,
}: {
  label: string;
  value: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3",
        "rounded-xl px-3 py-2 border transition-colors",
        subtle ? "bg-muted/30 border-transparent" : "bg-card/40 border-border/60",
      ].join(" ")}
    >
      <span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function MiniBar({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
}) {
  const total = leftValue + rightValue;
  const leftPct = total > 0 ? leftValue / total : 0;
  const rightPct = total > 0 ? rightValue / total : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">
          {leftLabel} ·{" "}
          <span className="font-semibold text-foreground tabular-nums">{leftValue}</span>
        </span>
        <span className="truncate">
          {rightLabel} ·{" "}
          <span className="font-semibold text-foreground tabular-nums">{rightValue}</span>
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden border">
        <div
          className="h-full"
          style={{
            width: `${clamp01(leftPct) * 100}%`,
            background: COLOR_OK,
          }}
        />
        <div
          className="h-full -mt-2"
          style={{
            width: `${clamp01(rightPct) * 100}%`,
            marginLeft: `${clamp01(leftPct) * 100}%`,
            background: COLOR_BAD,
            opacity: 0.9,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{pct(leftValue, total)}%</span>
        <span>{pct(rightValue, total)}%</span>
      </div>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;

  const p = payload[0];
  const name = String(p?.name ?? "");
  const value = Number(p?.value ?? 0);

  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur px-3 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">{name}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function MatchBlocksChart({
  stats,
  matchStats,
  clubName = "Equipo",
}: {
  stats: BlocksStats;
  matchStats: MatchStatRow[];
  clubName?: string;
}) {
  const computed = useMemo(() => {
    const bloqueos = stats?.bloqueos ?? 0;
    const golesRecibidos = stats?.golesRecibidos ?? 0;
    const total = bloqueos + golesRecibidos;
    const eficacia = total > 0 ? pct(bloqueos, total) : 0;

    const playersWithBlocks = (matchStats ?? [])
      .filter((s) => (s.acciones_bloqueo ?? 0) > 0)
      .sort((a, b) => (b.acciones_bloqueo ?? 0) - (a.acciones_bloqueo ?? 0));

    const top3 = playersWithBlocks.slice(0, 3);

    return {
      bloqueos,
      golesRecibidos,
      total,
      eficacia,
      playersWithBlocks,
      playersCount: playersWithBlocks.length,
      top3,
    };
  }, [stats, matchStats]);

  if (!stats) return null;

  return (
    <ExpandableChartCard
      title="Bloqueos"
      description={`${computed.bloqueos}/${computed.total} · ${computed.eficacia}% · Jug ${computed.playersCount}`}
      icon={<Shield className="h-5 w-5" />}
      className="from-transparent"
      rightHeader={
        <span className="text-xs text-muted-foreground tabular-nums">
          {computed.eficacia}%
        </span>
      }
      renderChart={({ compact }) => (
        <div className="w-full">
          <div
            className={`grid gap-4 ${
              compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {/* Pie */}
            <div className={`${compact ? "h-[210px]" : "h-[300px]"} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Bloqueos", value: computed.bloqueos },
                      { name: "Goles", value: computed.golesRecibidos },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={compact ? 82 : 105}
                    dataKey="value"
                  >
                    <Cell fill={COLOR_OK} />
                    <Cell fill={COLOR_BAD} />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary (mismo estilo que los otros) */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 pt-1">
                <TinyPill>
                  Total{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.total}
                  </span>
                </TinyPill>
                <TinyPill>
                  Bloqueos{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.bloqueos}
                  </span>
                </TinyPill>
                <TinyPill>
                  Goles{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.golesRecibidos}
                  </span>
                </TinyPill>
                <TinyPill>
                  Jugadores{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.playersCount}
                  </span>
                </TinyPill>
              </div>

              {/* mini bar: bloqueos vs goles */}
              <div className="rounded-2xl border bg-card/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Resultado defensivo
                </p>
                <MiniBar
                  leftLabel="Bloqueos"
                  leftValue={computed.bloqueos}
                  rightLabel="Goles"
                  rightValue={computed.golesRecibidos}
                />
              </div>

              {/* top 3 preview (compacto, sin cards) */}
              {computed.top3.length > 0 ? (
                <div className="rounded-2xl border bg-card/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Top bloqueadores
                    </p>
                    <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                      top {Math.min(3, computed.playersCount)}
                    </Badge>
                  </div>

                  <div className="mt-2 space-y-2">
                    {computed.top3.map((s, idx) => {
                      const p = s.players;
                      const blocks = s.acciones_bloqueo ?? 0;
                      return (
                        <div
                          key={s.id ?? p.id}
                          className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {idx + 1}.{" "}
                              {p.number != null ? `#${p.number} · ` : ""}
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{clubName}</p>
                          </div>

                          <Badge
                            variant="outline"
                            className="bg-muted/30 text-[11px] tabular-nums"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {blocks}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No hay bloqueos registrados por jugador.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      renderTable={() => (
        <div className="rounded-2xl border bg-card/40 overflow-hidden">
          {/* Header detalle */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Detalle de Bloqueos</p>
              <p className="text-xs text-muted-foreground">
                Eficacia recalculada · {computed.bloqueos}/{computed.total} ·{" "}
                {computed.eficacia}%
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                Bloqueos {computed.bloqueos}
              </Badge>
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                Goles {computed.golesRecibidos}
              </Badge>
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                Jugadores {computed.playersCount}
              </Badge>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* resumen en rows (compacto, consistente) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Row label="Total (bloqueos + goles)" value={computed.total} />
              <Row label="Eficacia (bloqueos/total)" value={`${computed.eficacia}%`} />

              <Row label="Bloqueos" value={computed.bloqueos} />
              <Row label="Goles recibidos" value={computed.golesRecibidos} />

              <Row label="Jugadores con bloqueos" value={computed.playersCount} subtle />
            </div>

            {/* listado jugadores */}
            <div className="rounded-2xl border bg-background/50 overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/20">
                <p className="text-sm font-semibold">Ranking de bloqueos</p>
                <p className="text-xs text-muted-foreground">
                  Ordenado de mayor a menor
                </p>
              </div>

              <div className="p-3">
                {computed.playersWithBlocks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {computed.playersWithBlocks.map((stat, idx) => {
                      const player = stat.players;
                      const blocks = stat.acciones_bloqueo ?? 0;

                      return (
                        <div
                          key={stat.id ?? player.id}
                          className="flex items-center justify-between gap-3 rounded-xl border bg-card/40 px-3 py-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                              {player.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={player.photo_url}
                                  alt={player.name}
                                  className="w-full h-full object-cover object-top"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <span className="text-xs font-bold tabular-nums">
                                  {player.number ?? "—"}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {idx + 1}.{" "}
                                {player.number != null ? `#${player.number} · ` : ""}
                                {player.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{clubName}</p>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className="bg-muted/30 text-[11px] tabular-nums shrink-0"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {blocks}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No hay bloqueos registrados en este partido
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );
}
