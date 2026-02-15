"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

interface InferioridadStats {
  evitados: number;
  recibidos: number;
  paradas: number;
  fuera: number;
  bloqueo: number;
  total: number;
  eficiencia: number;
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

export function MatchInferiorityChart({ stats }: { stats: InferioridadStats }) {
  const computed = useMemo(() => {
    const evitados = stats?.evitados ?? 0;
    const recibidos = stats?.recibidos ?? 0;
    const total = stats?.total ?? evitados + recibidos;

    const paradas = stats?.paradas ?? 0;
    const fuera = stats?.fuera ?? 0;
    const bloqueo = stats?.bloqueo ?? 0;

    // ✅ recalculamos eficiencia (no fiarse del campo)
    const eficiencia = total > 0 ? pct(evitados, total) : 0;
    const pctEvitados = total > 0 ? pct(evitados, total) : 0;
    const pctRecibidos = total > 0 ? pct(recibidos, total) : 0;

    // distribución interna de evitados (por si paradas+fuera+bloqueo no cuadra)
    const evitadosBreak = paradas + fuera + bloqueo;
    const deltaEvitados = evitados - evitadosBreak;

    return {
      evitados,
      recibidos,
      total,
      eficiencia,
      pctEvitados,
      pctRecibidos,
      paradas,
      fuera,
      bloqueo,
      evitadosBreak,
      deltaEvitados,
    };
  }, [stats]);

  if (!stats) return null;

  return (
    <ExpandableChartCard
      title="Inferioridad"
      description={`${computed.evitados}/${computed.total} · ${computed.eficiencia}% · Par ${computed.paradas} · Fuera ${computed.fuera} · Bloq ${computed.bloqueo}`}
      icon={<Target className="h-5 w-5" />}
      className="from-transparent"
      rightHeader={
        <span className="text-xs text-muted-foreground tabular-nums">
          {computed.eficiencia}%
        </span>
      }
      renderChart={({ compact }) => (
        <div className="w-full">
          <div
            className={`grid gap-4 ${
              compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {/* Pie Chart */}
            <div className={`${compact ? "h-[210px]" : "h-[300px]"} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Evitados", value: computed.evitados },
                      { name: "Recibidos", value: computed.recibidos },
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
              {/* pills compactas */}
              <div className="flex flex-wrap gap-2 pt-1">
                <TinyPill>
                  Total{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.total}
                  </span>
                </TinyPill>
                <TinyPill>
                  Evitados{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.evitados}
                  </span>
                </TinyPill>
                <TinyPill>
                  Recibidos{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.recibidos}
                  </span>
                </TinyPill>
              </div>

              {/* mini bar (lectura rápida) */}
              <div className="rounded-2xl border bg-card/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Resultado (H-)
                </p>
                <MiniBar
                  leftLabel="Evitados"
                  leftValue={computed.evitados}
                  rightLabel="Recibidos"
                  rightValue={computed.recibidos}
                />
              </div>

              {/* desglose evitados */}
              <div className="rounded-2xl border bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Evitados (detalle)
                  </p>
                  <Badge
                    variant="outline"
                    className="bg-muted/30 text-[11px] tabular-nums"
                  >
                    {computed.evitadosBreak}/{computed.evitados}
                  </Badge>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Row label="Paradas" value={computed.paradas} />
                  <Row label="Fuera" value={computed.fuera} />
                  <div className="col-span-2">
                    <Row label="Bloqueos" value={computed.bloqueo} />
                  </div>

                  {computed.deltaEvitados !== 0 ? (
                    <div className="col-span-2">
                      <Row
                        label="Ajuste (delta)"
                        value={
                          <span className="tabular-nums">
                            {computed.deltaEvitados >= 0 ? "+" : ""}
                            {computed.deltaEvitados}
                          </span>
                        }
                        subtle
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      renderTable={() => (
        <div className="rounded-2xl border bg-card/40 overflow-hidden">
          {/* Header detalle */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Detalle de Inferioridad</p>
              <p className="text-xs text-muted-foreground">
                Eficiencia recalculada · {computed.evitados}/{computed.total} ·{" "}
                {computed.eficiencia}%
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                % Evitados {computed.pctEvitados}%
              </Badge>
              <Badge variant="outline" className="bg-muted/30 text-[11px] tabular-nums">
                % Recibidos {computed.pctRecibidos}%
              </Badge>
            </div>
          </div>

          {/* Body (rows compactas) */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Row label="Total intentos (H-)" value={computed.total} />
              <Row label="Eficiencia (evitados/total)" value={`${computed.eficiencia}%`} />

              <Row label="Evitados" value={computed.evitados} />
              <Row label="Recibidos" value={computed.recibidos} />

              <Row label="Paradas" value={computed.paradas} />
              <Row label="Fuera" value={computed.fuera} />

              <Row label="Bloqueos" value={computed.bloqueo} />
              <Row label="Evitados (par+fuera+bloq)" value={computed.evitadosBreak} subtle />

              <Row
                label="Diferencia (evitados - desglose)"
                value={
                  <span className="tabular-nums">
                    {computed.deltaEvitados >= 0 ? "+" : ""}
                    {computed.deltaEvitados}
                  </span>
                }
                subtle
              />
            </div>

            {/* micro insight */}
            <div className="rounded-2xl border bg-muted/10 p-3">
              <div className="flex items-center gap-2">
                {computed.eficiencia >= 60 ? (
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                )}
                <p className="text-xs text-muted-foreground">
                  {computed.eficiencia >= 60
                    ? "Buena gestión en inferioridad: alto % de evitados."
                    : "Inferioridad mejorable: revisa cobertura y finalización rival."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );
}
