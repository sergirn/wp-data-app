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
import { ExpandableChartCard } from "./ExpandableChartCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow
} from "@/components/ui/table";

type MatchStats = any;

type Props = {
  playerName: string;
  matchStats: MatchStats[];
  height?: number;
};

type RadarDatum = { id: string; metric: string; raw: number; norm: number; isPct: boolean };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toNorm(raw: number, isPct: boolean, cap = 20) {
  if (isPct) return clamp(raw, 0, 100);
  return clamp((raw / cap) * 100, 0, 100);
}

function calculateFieldPlayerStats(matchStats: any[]) {
  return matchStats.reduce(
    (acc, stat) => ({
      goles_totales: acc.goles_totales + (stat.goles_totales || 0),
      goles_hombre_mas: acc.goles_hombre_mas + (stat.goles_hombre_mas || 0),

      tiros_totales: acc.tiros_totales + (stat.tiros_totales || 0),
      tiros_hombre_mas: acc.tiros_hombre_mas + (stat.tiros_hombre_mas || 0),

      faltas_exp_20_1c1: acc.faltas_exp_20_1c1 + (stat.faltas_exp_20_1c1 || 0),
      faltas_exp_20_boya: acc.faltas_exp_20_boya + (stat.faltas_exp_20_boya || 0),
      faltas_exp_3_bruta: acc.faltas_exp_3_bruta + (stat.faltas_exp_3_bruta || 0),
      faltas_exp_3_int: acc.faltas_exp_3_int + (stat.faltas_exp_3_int || 0),

      acciones_bloqueo: acc.acciones_bloqueo + (stat.acciones_bloqueo || 0),
      acciones_asistencias: acc.acciones_asistencias + (stat.acciones_asistencias || 0),
      acciones_recuperacion: acc.acciones_recuperacion + (stat.acciones_recuperacion || 0)
    }),
    {
      goles_totales: 0,
      goles_hombre_mas: 0,
      tiros_totales: 0,
      tiros_hombre_mas: 0,
      faltas_exp_20_1c1: 0,
      faltas_exp_20_boya: 0,
      faltas_exp_3_bruta: 0,
      faltas_exp_3_int: 0,
      acciones_bloqueo: 0,
      acciones_asistencias: 0,
      acciones_recuperacion: 0
    }
  );
}

/** ✅ Hook reactivo (arregla mobile/tablet de verdad) */
function useMediaQuery(query: string) {
  const getMatch = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();
    // Safari old: addListener/removeListener
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
  const isPct = item.isPct;

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold">{item.metric}</p>
      <p className="mt-1 text-sm font-bold tabular-nums">
        {isPct ? `${item.raw.toFixed(1)}%` : item.raw}
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

        const valueText = item.isPct ? `${item.raw.toFixed(0)}%` : String(item.raw);
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
        const valueText = isPct ? `${item.raw.toFixed(0)}%` : String(item.raw);

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

    // ✅ TABLET/DESKTOP: valor + métrica
    return function Tick(props: any) {
      const { payload, x, y, textAnchor } = props;
      const metric: string = payload?.value;
      const item = byMetric.get(metric);
      if (!item) return <g />;

      const isPct = item.isPct;
      const valueText = isPct ? `${item.raw.toFixed(1)}%` : String(item.raw);

      const cx = props?.cx ?? props?.viewBox?.cx ?? 0;
      const cy = props?.cy ?? props?.viewBox?.cy ?? 0;

      let vx = x - cx;
      let vy = y - cy;
      const len = Math.sqrt(vx * vx + vy * vy) || 1;

      // ✅ empuja menos en tablet para que no se “coma” el radar
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
    // ✅ menos margen = radar más grande (quita “aire” arriba/abajo)
    if (isMobile) return { top: 8, right: 10, bottom: 8, left: 10 };
    if (isTablet) return { top: 18, right: 26, bottom: 18, left: 26 };
    return { top: 34, right: 52, bottom: 34, left: 52 };
  }, [compact, isMobile, isTablet]);

  const outerRadius = useMemo(() => {
    if (compact) return "78%";
    // ✅ radar más “tocho”
    if (isMobile) return "92%";
    if (isTablet) return "96%";
    return "100%";
  }, [compact, isMobile, isTablet]);

  return (
    <div className="w-full flex justify-center">
      {/* ✅ IMPORTANTE: no limites a 520px en móvil/tablet */}
      <div className="w-full max-w-[999px] sm:max-w-[900px] lg:max-w-[520px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={outerRadius} margin={chartMargin}>
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

export const PlayerRadarChart = memo(function PlayerRadarChart({
  playerName,
  matchStats,
  height = 250
}: Props) {
  const t = useTranslations("RadarCharts");
  const common = useTranslations("AnalyticsCommon");
  const data: RadarDatum[] = useMemo(() => {
    const stats = calculateFieldPlayerStats(Array.isArray(matchStats) ? matchStats : []);

    const effShot = stats.tiros_totales > 0 ? (stats.goles_totales / stats.tiros_totales) * 100 : 0;

    const hmIntentos = stats.goles_hombre_mas + stats.tiros_hombre_mas;
    const effSup = hmIntentos > 0 ? (stats.goles_hombre_mas / hmIntentos) * 100 : 0;

    const expulsiones =
      stats.faltas_exp_20_1c1 +
      stats.faltas_exp_20_boya +
      (stats.faltas_exp_3_bruta || 0) +
      (stats.faltas_exp_3_int || 0);

    const items = [
      { id: "shooting", metric: t("shootingEfficiency"), raw: Number(effShot.toFixed(1)), isPct: true, cap: 100 },
      { id: "assists", metric: t("assists"), raw: stats.acciones_asistencias, isPct: false, cap: 20 },
      { id: "blocks", metric: t("blocks"), raw: stats.acciones_bloqueo, isPct: false, cap: 25 },
      { id: "exclusions", metric: t("exclusions"), raw: expulsiones, isPct: false, cap: 15 },
      { id: "powerPlay", metric: t("powerPlayEfficiency"), raw: Number(effSup.toFixed(1)), isPct: true, cap: 100 },
      { id: "recoveries", metric: t("recoveriesShort"), raw: stats.acciones_recuperacion, isPct: false, cap: 30 }
    ];

    return items.map((it) => ({ ...it, norm: toNorm(it.raw, it.isPct, it.cap) }));
  }, [matchStats, t]);

  const summary = useMemo(() => {
    const eff = Number(data.find((d) => d.id === "shooting")?.raw ?? 0).toFixed(1);
    const sup = Number(data.find((d) => d.id === "powerPlay")?.raw ?? 0).toFixed(1);
    return { eff, sup };
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
                        <TableCell className="font-medium">{d.metric}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {isPct ? `${Number(d.raw).toFixed(1)}%` : d.raw}
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
                {t("playerSummary", { shooting: summary.eff, powerPlay: summary.sup })}
              </span>
            </div>
          </div>
        </div>
      )}
    />
  );
});
