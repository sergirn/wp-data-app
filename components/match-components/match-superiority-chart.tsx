"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

interface SuperioridadStats {
  anotadas: number;
  falladas: number;
  eficiencia: number;
  rebotesRecuperados?: number;
  rebotesPerdidos?: number;
  anotadas_palo?: number;
}

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
          {leftLabel} · <span className="font-semibold text-foreground tabular-nums">{leftValue}</span>
        </span>
        <span className="truncate">
          {rightLabel} · <span className="font-semibold text-foreground tabular-nums">{rightValue}</span>
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
        {/* el resto lo “rellena” el fondo, pero le ponemos capa para que se note */}
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

export function MatchSuperiorityChart({ stats }: { stats: SuperioridadStats }) {
  const computed = useMemo(() => {
    const anotadas = stats?.anotadas ?? 0;
    const golDelPalo = stats?.anotadas_palo ?? 0;
    const falladas = stats?.falladas ?? 0;

    // ✅ En H+: anotadas = goles + gol del palo
    const anotadasTotal = anotadas + golDelPalo;
    const intentos = anotadasTotal + falladas;

    const rebRec = stats?.rebotesRecuperados ?? 0;
    const rebPer = stats?.rebotesPerdidos ?? 0;
    const rebTotal = rebRec + rebPer;
    const rebBalance = rebRec - rebPer;

    const eficiencia = intentos > 0 ? pct(anotadasTotal, intentos) : 0;
    const pctAnotadas = intentos > 0 ? pct(anotadasTotal, intentos) : 0;
    const pctFalladas = intentos > 0 ? pct(falladas, intentos) : 0;

    return {
      anotadas,
      golDelPalo,
      anotadasTotal,
      falladas,
      intentos,
      eficiencia,
      pctAnotadas,
      pctFalladas,
      rebRec,
      rebPer,
      rebTotal,
      rebBalance,
    };
  }, [stats]);

  if (!stats) return null;

  return (
    <ExpandableChartCard
      title="Superioridad"
      description={`${computed.anotadasTotal}/${computed.intentos} · ${computed.eficiencia}% · Reb ${computed.rebRec}/${computed.rebPer}`}
      icon={<Target className="h-5 w-5" />}
      className="from-transparent"
      rightHeader={<span className="text-xs text-muted-foreground tabular-nums">{computed.eficiencia}%</span>}
      renderChart={({ compact }) => (
        <div className="w-full">
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {/* Pie Chart */}
            <div className={`${compact ? "h-[210px]" : "h-[300px]"} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Anotadas", value: computed.anotadasTotal }, // ✅ incluye gol del palo
                      { name: "Falladas", value: computed.falladas },
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

            {/* Summary */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 pt-1">
                <TinyPill>
                  Intentos <span className="ml-1 font-semibold text-foreground tabular-nums">{computed.intentos}</span>
                </TinyPill>
                <TinyPill>
                  Anotadas <span className="ml-1 font-semibold text-foreground tabular-nums">{computed.anotadasTotal}</span>
                </TinyPill>
                <TinyPill>
                  Falladas <span className="ml-1 font-semibold text-foreground tabular-nums">{computed.falladas}</span>
                </TinyPill>

                {computed.golDelPalo > 0 ? (
                  <TinyPill>
                    Gol del palo <span className="ml-1 font-semibold text-foreground tabular-nums">{computed.golDelPalo}</span>
                  </TinyPill>
                ) : null}
              </div>

              {/* ✅ Mini bar: lectura rapidísima */}
              <div className="rounded-2xl border bg-card/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Conversión</p>
                <MiniBar
                  leftLabel="Anotadas"
                  leftValue={computed.anotadasTotal}
                  rightLabel="Falladas"
                  rightValue={computed.falladas}
                />
              </div>

              {/* ✅ Rebotes (compacto) */}
              {(stats.rebotesRecuperados !== undefined || stats.rebotesPerdidos !== undefined) ? (
                <div className="rounded-2xl border bg-card/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">Rebotes</p>
                    <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                      Total {computed.rebTotal}
                    </Badge>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Row label="Recuperados" value={computed.rebRec} />
                    <Row label="Perdidos" value={computed.rebPer} />
                    <div className="col-span-2">
                      <Row
                        label="Balance"
                        value={
                          <span className="tabular-nums">
                            {computed.rebBalance >= 0 ? "+" : ""}
                            {computed.rebBalance}
                          </span>
                        }
                        subtle
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      renderTable={() => (
        <div className="rounded-2xl border bg-card/40 overflow-hidden">
          {/* Header detalle */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Detalle de Superioridad</p>
              <p className="text-xs text-muted-foreground">
                {computed.anotadasTotal}/{computed.intentos} · {computed.eficiencia}% · (incluye gol del palo)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                % Anotadas {computed.pctAnotadas}%
              </Badge>
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                % Falladas {computed.pctFalladas}%
              </Badge>
            </div>
          </div>

          {/* Body detalle (filas compactas, estilo "totals") */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Row label="Intentos" value={computed.intentos} />
              <Row label="Eficiencia" value={`${computed.eficiencia}%`} />

              <Row label="Goles anotados (sin palo)" value={computed.anotadas} subtle />
              <Row label="Gol del palo" value={computed.golDelPalo} subtle />

              <Row label="Anotadas (total)" value={computed.anotadasTotal} />
              <Row label="Falladas" value={computed.falladas} />
            </div>

            {(stats.rebotesRecuperados !== undefined || stats.rebotesPerdidos !== undefined) ? (
              <div className="rounded-2xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">Rebotes</p>
                  <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                    Total {computed.rebTotal}
                  </Badge>
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Row label="Recuperados" value={computed.rebRec} />
                  <Row label="Perdidos" value={computed.rebPer} />
                  <div className="sm:col-span-2">
                    <Row
                      label="Balance"
                      value={
                        <span className="tabular-nums">
                          {computed.rebBalance >= 0 ? "+" : ""}
                          {computed.rebBalance}
                        </span>
                      }
                      subtle
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* micro insight */}
            <div className="rounded-2xl border bg-muted/10 p-3">
              <div className="flex items-center gap-2">
                {computed.eficiencia >= 50 ? (
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                )}
                <p className="text-xs text-muted-foreground">
                  {computed.eficiencia >= 50
                    ? "Superioridad efectiva: buena conversión en H+."
                    : "Superioridad mejorable: revisa selección de tiro y rebote tras fallo."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );
}
