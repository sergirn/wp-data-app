"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Volleyball } from "lucide-react";

interface SuperioridadStats {
	anotadas: number;
	falladas: number;
	eficiencia: number;
	rebotesRecuperados?: number;
	rebotesPerdidos?: number;
	anotadas_palo?: number;
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

		// Eficiencia recalculada con gol del palo
		const eficiencia = intentos > 0 ? Math.round((anotadasTotal / intentos) * 1000) / 10 : 0;

		const pctAnotadas = intentos > 0 ? Math.round((anotadasTotal / intentos) * 1000) / 10 : 0;
		const pctFalladas = intentos > 0 ? Math.round((falladas / intentos) * 1000) / 10 : 0;

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
			rebBalance
		};
	}, [stats]);

	if (!stats) return null;

	return (
		<ExpandableChartCard
			title="Superioridad"
			description={`${computed.anotadasTotal}/${computed.intentos} · ${computed.eficiencia}% · Reb ${computed.rebRec}/${computed.rebPer}`}
			icon={<Target className="h-5 w-5" />}
			className="from-transparent"
			rightHeader={<span className="text-xs text-muted-foreground">{computed.eficiencia}%</span>}
			renderChart={({ compact }) => (
				<div className="w-full">
					<div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
						{/* Pie Chart */}
						<div className={`${compact ? "h-[220px]" : "h-[320px]"} w-full`}>
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={[
											{ name: "Anotadas", value: computed.anotadasTotal }, // ✅ incluye gol del palo
											{ name: "Falladas", value: computed.falladas }
										]}
										cx="50%"
										cy="50%"
										labelLine={false}
										outerRadius={compact ? 85 : 110}
										dataKey="value"
									>
										<Cell fill="#3a6bbbc4" />
										<Cell fill="#ac2020c7" />
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						</div>

						{/* Summary */}
						<div className="space-y-2">
							<div className="flex flex-wrap gap-2 pt-1">
								<Badge variant="outline" className="bg-muted/30">
									Intentos: <span className="ml-1 font-semibold text-foreground">{computed.intentos}</span>
								</Badge>
								<Badge variant="outline" className="bg-muted/30">
									% Anotadas: <span className="ml-1 font-semibold text-foreground">{computed.pctAnotadas}%</span>
								</Badge>
								<Badge variant="outline" className="bg-muted/30">
									% Falladas: <span className="ml-1 font-semibold text-foreground">{computed.pctFalladas}%</span>
								</Badge>

								{/* ✅ extra opcional: mostrar palo si hay */}
								{computed.golDelPalo > 0 && (
									<Badge variant="outline" className="bg-muted/30">
										Gol del palo: <span className="ml-1 font-semibold text-foreground">{computed.golDelPalo}</span>
									</Badge>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
			renderTable={() => (
				<div className="rounded-xl border bg-card overflow-hidden">
					{/* Header detalle */}
					<div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
						<div className="min-w-0">
							<p className="text-sm font-semibold">Detalle de Superioridad</p>
							<p className="text-xs text-muted-foreground">
								Eficiencia recalculada · {computed.anotadasTotal}/{computed.intentos} · {computed.eficiencia}%
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<Badge variant="outline" className="bg-muted/30">
								Rebotes: <span className="ml-1 font-semibold text-foreground">{computed.rebTotal}</span>
							</Badge>
							<Badge variant="outline" className="bg-muted/30">
								Balance:{" "}
								<span className="ml-1 font-semibold text-foreground">
									{computed.rebBalance >= 0 ? "+" : ""}
									{computed.rebBalance}
								</span>
							</Badge>
						</div>
					</div>

					{/* Cards detalle */}
					<div className="p-4 space-y-4">
						{/* Fila 1 */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800">
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-full bg-blue-500/20">
										<Volleyball className="h-4 w-4 text-blue-600 dark:text-blue-400" />
									</div>
									<span className="text-sm font-medium text-blue-900 dark:text-blue-100">Goles anotados</span>
								</div>
								<span className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">{computed.anotadasTotal}</span>
							</div>

							<div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-200 dark:border-red-800">
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-full bg-red-500/20">
										<TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
									</div>
									<span className="text-sm font-medium text-red-900 dark:text-red-100">Fallos</span>
								</div>
								<span className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">{computed.falladas}</span>
							</div>

							<div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-full bg-emerald-500/20">
										<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
									</div>
									<span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Eficiencia</span>
								</div>
								<span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{computed.eficiencia}%</span>
							</div>
						</div>

						{/* Rebotes (si existen campos) */}
						{(stats.rebotesRecuperados !== undefined || stats.rebotesPerdidos !== undefined) && (
							<>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800">
										<div className="flex items-center gap-2">
											<div className="p-2 rounded-full bg-emerald-500/20">
												<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
											</div>
											<span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Rebotes recuperados</span>
										</div>
										<span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
											{computed.rebRec}
										</span>
									</div>

									<div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-800">
										<div className="flex items-center gap-2">
											<div className="p-2 rounded-full bg-orange-500/20">
												<TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
											</div>
											<span className="text-sm font-medium text-orange-900 dark:text-orange-100">Rebotes perdidos</span>
										</div>
										<span className="text-lg font-bold text-orange-700 dark:text-orange-300 tabular-nums">{computed.rebPer}</span>
									</div>
								</div>

								<div className="pt-2 border-t">
									<div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
										<span className="text-sm font-semibold text-muted-foreground">Total rebotes</span>
										<span className="text-lg font-bold tabular-nums">{computed.rebTotal}</span>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		/>
	);
}
