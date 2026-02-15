"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, TrendingDown, Target } from "lucide-react";

type Props = {
  match: any;
  stats: any[]; // match.match_stats
};

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

function MiniBar2({
  leftLabel,
  leftValue,
  leftColor,
  rightLabel,
  rightValue,
  rightColor,
}: {
  leftLabel: string;
  leftValue: number;
  leftColor: string;
  rightLabel: string;
  rightValue: number;
  rightColor: string;
}) {
  const total = leftValue + rightValue;
  const lPct = total > 0 ? leftValue / total : 0;
  const rPct = total > 0 ? rightValue / total : 0;

  return (
    <div className="space-y-2">
      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden border">
        <div className="h-full" style={{ width: `${lPct * 100}%`, background: leftColor }} />
        <div
          className="h-full -mt-2"
          style={{ width: `${rPct * 100}%`, marginLeft: `${lPct * 100}%`, background: rightColor }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: leftColor }} />
          <span className="truncate">
            {leftLabel}:{" "}
            <span className="font-semibold text-foreground tabular-nums">{leftValue}</span> ({pct(leftValue, total)}%)
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: rightColor }} />
          <span className="truncate">
            {rightLabel}:{" "}
            <span className="font-semibold text-foreground tabular-nums">{rightValue}</span> ({pct(rightValue, total)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export function MatchGoalkeepersPieChart({ match, stats }: Props) {
  const computed = useMemo(() => {
    const rows = (stats ?? []).filter(
      (s) => s?.players?.is_goalkeeper && s?.portero_paradas_totales != null
    );

    const saves = rows.reduce((sum, s) => sum + (s?.portero_paradas_totales || 0), 0);

    // ⚠️ misma lógica que tu chart de rendimiento: goles recibidos = marcador rival
    const golesRecibidos = match?.away_score || 0;

    const tirosRecibidos = saves + golesRecibidos;
    const percentage = tirosRecibidos > 0 ? pct(saves, tirosRecibidos) : 0;

    const savesInf = rows.reduce((sum, s) => sum + (s?.portero_paradas_hombre_menos || 0), 0);
    const pensSaved = rows.reduce((sum, s) => sum + (s?.portero_paradas_penalti_parado || 0), 0);

    const pctParadas = tirosRecibidos > 0 ? pct(saves, tirosRecibidos) : 0;
    const pctGoles = tirosRecibidos > 0 ? pct(golesRecibidos, tirosRecibidos) : 0;

    return {
      saves,
      golesRecibidos,
      tirosRecibidos,
      percentage,
      savesInf,
      pensSaved,
      pctParadas,
      pctGoles,
      hasExtras: savesInf > 0 || pensSaved > 0,
    };
  }, [match, stats]);

  if (!match) return null;

  // colores consistentes (y suaves)
  const savesColor = "hsla(142, 71%, 45%, 0.95)"; // verde
  const goalsColor = "hsla(45, 90%, 45%, 0.90)"; // amarillo/ámbar

  return (
    <ExpandableChartCard
      title="Porteros"
      description={`${computed.saves}/${computed.tirosRecibidos} · ${computed.percentage}% · GC ${computed.golesRecibidos}`}
      icon={<Shield className="h-5 w-5" />}
      className="from-transparent"
      rightHeader={<span className="text-xs text-muted-foreground tabular-nums">{computed.percentage}%</span>}
      renderChart={({ compact }) => (
        <div className="w-full">
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {/* Pie Chart */}
            <div className={`${compact ? "h-[220px]" : "h-[320px]"} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Paradas", value: computed.saves },
                      { name: "Goles recibidos", value: computed.golesRecibidos },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={compact ? 85 : 110}
                    dataKey="value"
                  >
                    <Cell fill={savesColor} />
                    <Cell fill={goalsColor} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Preview “clean”: pills + mini-bar */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 pt-1">
                <TinyPill>
                  Tiros{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.tirosRecibidos}
                  </span>
                </TinyPill>

                <TinyPill>
                  % Paradas{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.pctParadas}%
                  </span>
                </TinyPill>

                <TinyPill>
                  % Goles{" "}
                  <span className="ml-1 font-semibold text-foreground tabular-nums">
                    {computed.pctGoles}%
                  </span>
                </TinyPill>

                {computed.hasExtras ? (
                  <>
                    <TinyPill>
                      Par. inf{" "}
                      <span className="ml-1 font-semibold text-foreground tabular-nums">
                        {computed.savesInf}
                      </span>
                    </TinyPill>
                    <TinyPill>
                      Pen. par{" "}
                      <span className="ml-1 font-semibold text-foreground tabular-nums">
                        {computed.pensSaved}
                      </span>
                    </TinyPill>
                  </>
                ) : null}
              </div>

              <div className="rounded-2xl border bg-card/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Paradas vs goles</p>
                <MiniBar2
                  leftLabel="Paradas"
                  leftValue={computed.saves}
                  leftColor={savesColor}
                  rightLabel="Goles"
                  rightValue={computed.golesRecibidos}
                  rightColor={goalsColor}
                />
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
              <p className="text-sm font-semibold">Detalle de Porteros</p>
              <p className="text-xs text-muted-foreground">
                Efectividad recalculada · {computed.saves}/{computed.tirosRecibidos} · {computed.percentage}%
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-muted/30">
                Par. Inf.:{" "}
                <span className="ml-1 font-semibold text-foreground tabular-nums">{computed.savesInf}</span>
              </Badge>
              <Badge variant="outline" className="bg-muted/30">
                Pen. Par.:{" "}
                <span className="ml-1 font-semibold text-foreground tabular-nums">{computed.pensSaved}</span>
              </Badge>
            </div>
          </div>

          {/* Cards detalle (pequeñas, consistentes) */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-emerald-500/20">
                    <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Paradas</span>
                </div>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {computed.saves}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <Target className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  </div>
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Goles recibidos</span>
                </div>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  {computed.golesRecibidos}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Efectividad</span>
                </div>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                  {computed.percentage}%
                </span>
              </div>
            </div>

            {/* Extras */}
            {computed.hasExtras ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-emerald-500/20">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Paradas inf.</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {computed.savesInf}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-orange-500/20">
                      <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-100">Penaltis par.</span>
                  </div>
                  <span className="text-lg font-bold text-orange-700 dark:text-orange-300 tabular-nums">
                    {computed.pensSaved}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                <span className="text-sm font-semibold text-muted-foreground">Total tiros</span>
                <span className="text-lg font-bold tabular-nums">{computed.tirosRecibidos}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );
}
