"use client";

import { memo, useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ExpandableChartCard } from "../analytics-player/ExpandableChartCard";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

type MatchStatsWithMatch = any;

type Props = {
	playerName: string;
	matchStats: MatchStatsWithMatch[];
	height?: number; // altura compact (card)
};

type RadarDatum = { metric: string; raw: number; norm: number };

const COLORS: Record<string, string> = {
	"% Paradas": "#2563eb",
	"Goles (media)": "#ef4444",
	"% Penaltis": "#f59e0b",
	"% Inf.": "#8b5cf6",
	"Asist. (media)": "#14b8a6"
};

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

// normalización: porcentajes ya 0..100, medias de goles/asistencias con cap
const CAPS: Record<string, number> = {
	"Goles (media)": 12,
	"Asist. (media)": 3
};

function toNorm(metric: string, raw: number) {
	if (metric.startsWith("%")) return clamp(raw, 0, 100);
	const cap = CAPS[metric] ?? 10;
	return clamp((raw / cap) * 100, 0, 100);
}

// ✅ replica exacta del GK_SavesAndGoalsChart para obtener goles por “fila”
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

const CustomTooltip = ({ active, payload }: any) => {
	if (!active || !payload?.length) return null;
	const item = payload[0]?.payload as RadarDatum;
	const color = COLORS[item.metric] ?? "#ff6900";
	const isPct = item.metric.startsWith("%");

	return (
		<div className="rounded-lg border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
			<div className="flex items-center gap-2">
				<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
				<p className="text-xs font-semibold">{item.metric}</p>
			</div>
			<p className="mt-1 text-sm font-bold tabular-nums">{isPct ? `${item.raw.toFixed(1)}%` : item.raw.toFixed(2)}</p>
		</div>
	);
};

function RadarViz({ playerName, data, height }: { playerName: string; data: RadarDatum[]; height: number }) {
	// ✅ ticks con empuje radial + texto adaptativo (light=negro, dark=blanco)
	const AngleTick = useMemo(() => {
		const byMetric = new Map(data.map((d) => [d.metric, d]));

		return function Tick(props: any) {
			const { payload, x, y, textAnchor } = props;
			const metric: string = payload?.value;
			const item = byMetric.get(metric);
			if (!item) return null;

			const isPct = metric.startsWith("%");
			const valueText = isPct ? `${item.raw.toFixed(1)}%` : item.raw.toFixed(2);

			const cx = props?.cx ?? props?.viewBox?.cx ?? 0;
			const cy = props?.cy ?? props?.viewBox?.cy ?? 0;

			let vx = x - cx;
			let vy = y - cy;
			const len = Math.sqrt(vx * vx + vy * vy) || 1;

			const PUSH = 18;
			vx = (vx / len) * PUSH;
			vy = (vy / len) * PUSH;

			const extraY = cy && y < cy ? -6 : cy && y > cy ? 2 : 0;

			const tx = x + vx;
			const ty = y + vy + extraY;

			return (
				<text x={tx} y={ty} textAnchor={textAnchor} fill="currentColor" className="text-black dark:text-white" fontWeight={800}>
					<tspan x={tx} dy={0} fontSize={13}>
						{valueText}
					</tspan>
					<tspan x={tx} dy={14} fontSize={11} fontWeight={600} opacity={0.9}>
						{metric}
					</tspan>
				</text>
			);
		};
	}, [data]);

	return (
		<div className="w-full flex justify-center">
			<div className="w-full max-w-[520px]" style={{ height }}>
				<ResponsiveContainer width="100%" height="100%">
					<RadarChart data={data} cx="50%" cy="50%" outerRadius="100%" margin={{ top: 56, right: 78, bottom: 56, left: 78 }}>
						<PolarGrid strokeOpacity={0.35} />
						<PolarAngleAxis dataKey="metric" tick={AngleTick} tickLine={false} />
						<PolarRadiusAxis domain={[0, 100]} tick={false} tickLine={false} axisLine={false} />
						<Tooltip content={<CustomTooltip />} />
						<Radar
							name={playerName}
							dataKey="norm"
							stroke="#ff6900"
							fill="#ff6900"
							fillOpacity={0.25}
							strokeWidth={2}
							dot={{ r: 3 }}
							isAnimationActive={false}
						/>
					</RadarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

export const GoalkeeperRadarChart = memo(function GoalkeeperRadarChart({ playerName, matchStats, height = 250 }: Props) {
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

		const totalAsist = ms.reduce((sum, s) => sum + (s.portero_acciones_asistencias || s.acciones_asistencias || 0), 0);
		const asistAvg = totalAsist / m;

		const items = [
			{ metric: "% Paradas", raw: Number(savePct.toFixed(1)) },
			{ metric: "Goles (md)", raw: Number(goalsAvg.toFixed(2)) },
			{ metric: "% Penaltis", raw: Number(penPct.toFixed(1)) },
			{ metric: "% Inf.", raw: Number(infPct.toFixed(1)) },
			{ metric: "Asist.(md)", raw: Number(asistAvg.toFixed(2)) }
		];

		return items.map((it) => ({ ...it, norm: toNorm(it.metric, it.raw) }));
	}, [matchStats]);

	// footer/resumen estilo “como tu ejemplo”
	const summary = useMemo(() => {
		const saves = Number(data.find((d) => d.metric === "% Paradas")?.raw ?? 0).toFixed(1);
		const goals = Number(data.find((d) => d.metric === "Goles (media)")?.raw ?? 0).toFixed(2);
		return { saves, goals };
	}, [data]);

	return (
		<ExpandableChartCard
			title=""
			description=""
			icon={null as any}
			className="p-0 bg-transparent border-0 shadow-none"
			renderChart={({ compact }) => <RadarViz playerName={playerName} data={data} height={compact ? height : 520} />}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[520px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
									<TableRow className="hover:bg-transparent">
										<TableHead>Métrica</TableHead>
										<TableHead className="text-right">Valor</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{data.map((d, idx) => {
										const isPct = d.metric.startsWith("%");
										return (
											<TableRow
												key={d.metric}
												className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
											>
												<TableCell className="font-medium">
													<div className="flex items-center gap-2">
														<span
															className="h-2.5 w-2.5 rounded-full"
															style={{ backgroundColor: COLORS[d.metric] ?? "#ff6900" }}
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
							<span>
								<span className="font-medium text-foreground">{Array.isArray(matchStats) ? matchStats.length : 0}</span> partidos
							</span>
							<span className="rounded-md border bg-card px-2 py-1">
								% Paradas: <span className="font-semibold">{summary.saves}%</span> · Goles (media):{" "}
								<span className="font-semibold">{summary.goals}</span>
							</span>
						</div>
					</div>
				</div>
			)}
		/>
	);
});
