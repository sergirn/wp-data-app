"use client";

import { memo, useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ExpandableChartCard } from "./ExpandableChartCard";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

// 👇 copia/usa tu tipo real
type MatchStats = any;

type Props = {
	playerName: string;
	matchStats: MatchStats[];
	height?: number; // altura compact (card)
};

type RadarDatum = { metric: string; raw: number; norm: number };

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

// caps para que los conteos se vean bien en radar (ajusta si quieres)
const CAPS: Record<string, number> = {
	Asistencias: 20,
	Bloqueos: 25,
	Expulsiones: 15,
	Recuperaciones: 30
};

function toNorm(metric: string, raw: number) {
	if (metric.includes("Efic.")) return clamp(raw, 0, 100);
	const cap = CAPS[metric] ?? 20;
	return clamp((raw / cap) * 100, 0, 100);
}

// ✅ tu reduce
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

const CustomTooltip = ({ active, payload }: any) => {
	if (!active || !payload?.length) return null;
	const item = payload[0]?.payload as RadarDatum;
	const isPct = item.metric.includes("Efic.");

	return (
		<div className="rounded-lg border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
			<p className="text-xs font-semibold">{item.metric}</p>
			<p className="mt-1 text-sm font-bold tabular-nums">{isPct ? `${item.raw.toFixed(1)}%` : item.raw}</p>
		</div>
	);
};

function RadarViz({ playerName, data, height }: { playerName: string; data: RadarDatum[]; height: number }) {
	const AngleTick = useMemo(() => {
		const byMetric = new Map(data.map((d) => [d.metric, d]));

		return function Tick(props: any) {
			const { payload, x, y, textAnchor } = props;
			const metric: string = payload?.value;
			const item = byMetric.get(metric);
			if (!item) return null;

			const isPct = metric.includes("Efic.");
			const valueText = isPct ? `${item.raw.toFixed(1)}%` : String(item.raw);

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

export const PlayerRadarChart = memo(function PlayerRadarChart({ playerName, matchStats, height = 250 }: Props) {
	const data: RadarDatum[] = useMemo(() => {
		const stats = calculateFieldPlayerStats(Array.isArray(matchStats) ? matchStats : []);

		const effShot = stats.tiros_totales > 0 ? (stats.goles_totales / stats.tiros_totales) * 100 : 0;

		const hmIntentos = stats.goles_hombre_mas + stats.tiros_hombre_mas;
		const effSup = hmIntentos > 0 ? (stats.goles_hombre_mas / hmIntentos) * 100 : 0;

		const expulsiones = stats.faltas_exp_20_1c1 + stats.faltas_exp_20_boya + (stats.faltas_exp_3_bruta || 0) + (stats.faltas_exp_3_int || 0);

		const items = [
			{ metric: "Efic. tiro", raw: Number(effShot.toFixed(1)) },
			{ metric: "Asistencias", raw: stats.acciones_asistencias },
			{ metric: "Bloqueos", raw: stats.acciones_bloqueo },
			{ metric: "Expulsiones", raw: expulsiones },
			{ metric: "Efic. sup.", raw: Number(effSup.toFixed(1)) },
			{ metric: "Recup.", raw: stats.acciones_recuperacion }
		];

		return items.map((it) => ({ ...it, norm: toNorm(it.metric, it.raw) }));
	}, [matchStats]);

	// resumen tipo "footer" (como en tu ejemplo)
	const summary = useMemo(() => {
		const eff = Number(data.find((d) => d.metric === "Efic. tiro")?.raw ?? 0).toFixed(1);
		const sup = Number(data.find((d) => d.metric === "Efic. sup.")?.raw ?? 0).toFixed(1);
		return { eff, sup };
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
										const isPct = d.metric.includes("Efic.");
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
							<span>
								<span className="font-medium text-foreground">{Array.isArray(matchStats) ? matchStats.length : 0}</span> partidos
							</span>
							<span className="rounded-md border bg-card px-2 py-1">
								Efic. tiro: <span className="font-semibold">{summary.eff}%</span> · Efic. sup.:{" "}
								<span className="font-semibold">{summary.sup}%</span>
							</span>
						</div>
					</div>
				</div>
			)}
		/>
	);
});
