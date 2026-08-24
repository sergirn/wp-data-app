"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const SafePolarAngleAxis = PolarAngleAxis as unknown as (props: any) => React.JSX.Element;
import { ExpandableChartCard } from "../analytics-player/ExpandableChartCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow
} from "@/components/ui/table";

type MatchStatsWithMatch = any;

type Props = {
  playerName: string;
  matchStats: MatchStatsWithMatch[];
  height?: number;
};

type RadarDatum = { id: string; metric: string; raw: number; norm: number; isPct: boolean; color: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toNorm(raw: number, isPct: boolean, cap = 10) {
  if (isPct) return clamp(raw, 0, 100);
  return clamp((raw / cap) * 100, 0, 100);
}

// ✅ replica exacta para goles por fila
function getGoalsFromRow(stat: any) {
  let goals = Number(stat?.goles_recibidos_reales || 0);
  if (!goals) {
    const g = {
      gol: Number(stat?.portero_gol || 0),
      sup: Number(stat?.portero_gol_superioridad || 0),
      boya: Number(stat?.portero_goles_boya_parada || 0),
      hm: Number(stat?.portero_goles_hombre_menos || 0),
      mas6: Number(stat?.portero_goles_dir_mas_5m || 0),
      contra: Number(stat?.portero_goles_contraataque || 0),
      pen: Number(stat?.portero_goles_penalti || 0)
    };
    goals = Object.values(g).reduce((a, b) => a + (b || 0), 0);
  }
  return goals;
}

/** ✅ Hook reactivo */
function useMediaQuery(query: string) {
  const getMatch = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as RadarDatum;
  const color = item.color;
  const isPct = item.isPct;

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs font-semibold">{item.metric}</p>
      </div>
      <p className="mt-1 text-sm font-bold tabular-nums">
        {isPct ? `${item.raw.toFixed(1)}%` : item.raw.toFixed(2)}
      </p>
    </div>
  );
};

function RadarViz({
  playerName,
  data,
  height,
  compact
}: {
  playerName: string;
  data: RadarDatum[];
  height: number;
  compact: boolean;
}) {
  const isMobile = useMediaQuery("(max-width: 639px)"); // <sm
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");

  const AngleTick = useMemo(() => {
    const byMetric = new Map(data.map((d) => [d.metric, d]));

    if (compact) {
      return function TickCompact(props: any) {
        const { payload, x, y, textAnchor } = props;
        const item = byMetric.get(payload?.value);
        if (!item) return <g />;

        const valueText = item.isPct ? `${item.raw.toFixed(0)}%` : item.raw.toFixed(1);
        const cy = props?.cy ?? props?.viewBox?.cy ?? 0;
        const isBottom = cy && y > cy;

        return (
          <text x={x} y={y + (isBottom ? 5 : -2)} textAnchor={textAnchor} fill="currentColor" className="text-foreground">
            <tspan x={x} dy={0} fontSize={10} fontWeight={800}>{valueText}</tspan>
            <tspan x={x} dy={isBottom ? -10 : 10} fontSize={8.5} fontWeight={600} opacity={0.72}>{item.metric}</tspan>
          </text>
        );
      };
    }

    // ✅ MOBILE: solo valor (sin títulos)
    if (isMobile) {
      return function TickMobile(props: any) {
        const { payload, x, y, textAnchor } = props;
        const metric: string = payload?.value;
        const item = byMetric.get(metric);
        if (!item) return <g />;

        const isPct = item.isPct;
        const valueText = isPct ? `${item.raw.toFixed(0)}%` : item.raw.toFixed(1);

        return (
          <text
            x={x}
            y={y}
            textAnchor={textAnchor}
            fill="currentColor"
            className="text-black dark:text-white"
            fontWeight={800}
            fontSize={12}
          >
            {valueText}
          </text>
        );
      };
    }

    // ✅ TABLET/DESKTOP: valor + métrica con empuje moderado
    return function Tick(props: any) {
      const { payload, x, y, textAnchor } = props;
      const metric: string = payload?.value;
      const item = byMetric.get(metric);
      if (!item) return <g />;

      const isPct = item.isPct;
      const valueText = isPct ? `${item.raw.toFixed(1)}%` : item.raw.toFixed(2);

      const cx = props?.cx ?? props?.viewBox?.cx ?? 0;
      const cy = props?.cy ?? props?.viewBox?.cy ?? 0;

      let vx = x - cx;
      let vy = y - cy;
      const len = Math.sqrt(vx * vx + vy * vy) || 1;

      const PUSH = isTablet ? 12 : 16;
      vx = (vx / len) * PUSH;
      vy = (vy / len) * PUSH;

      const extraY = cy && y < cy ? -4 : cy && y > cy ? 1 : 0;

      const tx = x + vx;
      const ty = y + vy + extraY;

      return (
        <text
          x={tx}
          y={ty}
          textAnchor={textAnchor}
          fill="currentColor"
          className="text-black dark:text-white"
          fontWeight={800}
        >
          <tspan x={tx} dy={0} fontSize={isTablet ? 12 : 13}>
            {valueText}
          </tspan>
          <tspan x={tx} dy={13} fontSize={isTablet ? 10 : 11} fontWeight={600} opacity={0.9}>
            {metric}
          </tspan>
        </text>
      );
    };
  }, [compact, data, isMobile, isTablet]);

  const chartMargin = useMemo(() => {
    if (compact) return { top: 18, right: 28, bottom: 18, left: 28 };
    // ✅ menos margen = radar más grande (quita aire)
    if (isMobile) return { top: 8, right: 10, bottom: 8, left: 10 };
    if (isTablet) return { top: 18, right: 26, bottom: 18, left: 26 };
    return { top: 34, right: 52, bottom: 34, left: 52 };
  }, [compact, isMobile, isTablet]);

  const outerRadius = useMemo(() => {
    if (compact) return "78%";
    if (isMobile) return "92%";
    if (isTablet) return "96%";
    return "100%";
  }, [compact, isMobile, isTablet]);

  return (
    <div className="w-full flex justify-center">
      {/* ✅ no limites a 520px en móvil/tablet */}
      <div className="w-full max-w-[999px] sm:max-w-[900px] lg:max-w-[520px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            margin={chartMargin}
          >
            <PolarGrid strokeOpacity={0.35} />
            <SafePolarAngleAxis dataKey="metric" tick={AngleTick} tickLine={false} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name={playerName}
              dataKey="norm"
              stroke="#ff6900"
              fill="#ff6900"
              fillOpacity={0.25}
              strokeWidth={2}
              dot={{ r: isMobile ? 2 : 3 }}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const GoalkeeperRadarChart = memo(function GoalkeeperRadarChart({
  playerName,
  matchStats,
  height = 250
}: Props) {
  const t = useTranslations("RadarCharts");
  const common = useTranslations("AnalyticsCommon");
  const data: RadarDatum[] = useMemo(() => {
    const ms = Array.isArray(matchStats) ? matchStats : [];
    const m = Math.max(ms.length, 1);

    const totalSaves = ms.reduce((sum, s) => sum + (s.portero_paradas_totales || 0), 0);
    const totalGoals = ms.reduce((sum, s) => sum + getGoalsFromRow(s), 0);

    const totalShots = totalSaves + totalGoals;
    const savePct = totalShots > 0 ? (totalSaves / totalShots) * 100 : 0;

    const goalsAvg = totalGoals / m;

    const penSaved = ms.reduce((sum, s) => sum + (s.portero_paradas_penalti_parado || 0), 0);
    const penGoals = ms.reduce((sum, s) => sum + (s.portero_goles_penalti || 0), 0);
    const penDen = penSaved + penGoals;
    const penPct = penDen > 0 ? (penSaved / penDen) * 100 : 0;

    const infSaves = ms.reduce((sum, s) => sum + (s.portero_paradas_hombre_menos || 0), 0);
    const infGoals = ms.reduce((sum, s) => sum + (s.portero_goles_hombre_menos || 0), 0);
    const infDen = infSaves + infGoals;
    const infPct = infDen > 0 ? (infSaves / infDen) * 100 : 0;

    const totalAsist = ms.reduce(
      (sum, s) => sum + (s.portero_acciones_asistencias || s.acciones_asistencias || 0),
      0
    );
    const asistAvg = totalAsist / m;

    const items = [
      { id: "saves", metric: t("savePercentage"), raw: Number(savePct.toFixed(1)), isPct: true, cap: 100, color: "#2563eb" },
      { id: "goals", metric: t("averageGoals"), raw: Number(goalsAvg.toFixed(2)), isPct: false, cap: 12, color: "#ef4444" },
      { id: "penalties", metric: t("penaltyPercentage"), raw: Number(penPct.toFixed(1)), isPct: true, cap: 100, color: "#f59e0b" },
      { id: "inferiority", metric: t("inferiorityPercentage"), raw: Number(infPct.toFixed(1)), isPct: true, cap: 100, color: "#8b5cf6" },
      { id: "assists", metric: t("averageAssists"), raw: Number(asistAvg.toFixed(2)), isPct: false, cap: 3, color: "#14b8a6" }
    ];

    return items.map((it) => ({ ...it, norm: toNorm(it.raw, it.isPct, it.cap) }));
  }, [matchStats, t]);

  const summary = useMemo(() => {
    const saves = Number(data.find((d) => d.id === "saves")?.raw ?? 0).toFixed(1);
    const goals = Number(data.find((d) => d.id === "goals")?.raw ?? 0).toFixed(2);
    return { saves, goals };
  }, [data]);

  return (
    <ExpandableChartCard
      title=""
      description=""
      icon={null as any}
      className="p-0 bg-transparent border-0 shadow-none"
      renderChart={({ compact }) => (
        <RadarViz playerName={playerName} data={data} height={compact ? height : 520} compact={compact} />
      )}
      renderTable={() => (
        <div className="rounded-xl border overflow-hidden bg-card w-full">
          <div className="w-full overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <Table className="min-w-[520px]">
                <UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("metric")}</TableHead>
                    <TableHead className="text-right">{t("value")}</TableHead>
                  </TableRow>
                </UITableHeader>

                <TableBody>
                  {data.map((d, idx) => {
                    const isPct = d.isPct;
                    return (
                      <TableRow
                        key={d.metric}
                        className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                            <span>{d.metric}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {isPct ? `${Number(d.raw).toFixed(1)}%` : Number(d.raw).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="border-t bg-muted/20 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{common("matches", { count: Array.isArray(matchStats) ? matchStats.length : 0 })}</span>
              <span className="rounded-md border bg-card px-2 py-1">
                {t("summary", { saves: summary.saves, goals: summary.goals })}
              </span>
            </div>
          </div>
        </div>
      )}
    />
  );
});
