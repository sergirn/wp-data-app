"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { Match } from "@/lib/types";

interface MatchResultsChartProps {
	matches: Match[];
}

const RESULT_COLORS = {
	wins: "#22c55e",
	draws: "#f59e0b",
	losses: "#ef4444"
} as const;

function pct(value: number, total: number) {
	if (!total) return 0;
	return Math.round((value / total) * 100);
}

function TinyPill({ children }: { children: React.ReactNode }) {
	return <span className="inline-flex items-center rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">{children}</span>;
}

function ResultBox({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
	return (
		<div className="rounded-xl border px-3 py-2.5 text-center" style={{ backgroundColor: `${color}10` }}>
			<p className="text-[11px] text-muted-foreground truncate">{label}</p>
			<p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
			<p className="text-[11px] text-muted-foreground">{pct(value, total)}%</p>
		</div>
	);
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
	if (!active || !payload?.length) return null;

	const item = payload[0]?.payload;
	if (!item) return null;

	return (
		<div className="rounded-xl border bg-background/95 px-3 py-2 shadow-md backdrop-blur">
			<p className="text-xs text-muted-foreground">{item.label}</p>
			<p className="text-sm font-semibold tabular-nums">{item.value}</p>
		</div>
	);
}

export function MatchResultsChart({ matches }: MatchResultsChartProps) {
	const wins = matches.filter((m) => m.home_score > m.away_score).length;
	const draws = matches.filter((m) => m.home_score === m.away_score).length;
	const losses = matches.filter((m) => m.home_score < m.away_score).length;

	const total = matches.length || 0;

	const stats = [
		{ key: "wins", label: "Victorias", value: wins, color: RESULT_COLORS.wins },
		{ key: "draws", label: "Empates", value: draws, color: RESULT_COLORS.draws },
		{ key: "losses", label: "Derrotas", value: losses, color: RESULT_COLORS.losses }
	];

	const topResult = [...stats].sort((a, b) => b.value - a.value)[0];

	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<CardTitle>Resultados</CardTitle>
						<CardDescription>Balance global de partidos</CardDescription>
					</div>

					<Badge variant="outline" className="bg-muted/30 text-[11px]">
						Principal: {topResult?.label ?? "—"}
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="flex flex-wrap gap-2">
					<TinyPill>
						Partidos <span className="ml-1 font-semibold text-foreground tabular-nums">{total}</span>
					</TinyPill>
					<TinyPill>
						Victorias <span className="ml-1 font-semibold text-foreground tabular-nums">{wins}</span>
					</TinyPill>
					<TinyPill>
						Empates <span className="ml-1 font-semibold text-foreground tabular-nums">{draws}</span>
					</TinyPill>
					<TinyPill>
						Derrotas <span className="ml-1 font-semibold text-foreground tabular-nums">{losses}</span>
					</TinyPill>
				</div>

				<div className="grid gap-4 lg:grid-cols-1 items-center">
					<div className="mx-auto w-full max-w-[220px]">
						<ResponsiveContainer width="100%" height={190}>
							<PieChart>
								<Pie
									data={stats}
									dataKey="value"
									nameKey="label"
									innerRadius={52}
									outerRadius={74}
									paddingAngle={3}
									stroke="none"
									isAnimationActive={false}
								>
									{stats.map((s) => (
										<Cell key={s.key} fill={s.color} />
									))}
								</Pie>

								<RechartsTooltip content={<CustomTooltip />} />

								<text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
									<tspan className="text-xl font-bold fill-foreground">{total}</tspan>
									<tspan x="50%" dy="1.8em" className="text-[11px] fill-muted-foreground">
										Partidos
									</tspan>
								</text>
							</PieChart>
						</ResponsiveContainer>
					</div>

					<div className="space-y-3">
						{/* <div className="grid grid-cols-3 gap-2">
							{stats.map((stat) => (
								<ResultBox key={stat.key} label={stat.label} value={stat.value} total={total} color={stat.color} />
							))}
						</div> */}

						<div className="rounded-xl border bg-card/40 p-3">
							<div className="space-y-2">
								{stats.map((stat) => {
									const percentage = pct(stat.value, total);

									return (
										<div key={stat.key} className="space-y-1.5">
											<div className="flex items-center justify-between text-[11px] text-muted-foreground">
												<div className="flex items-center gap-2 min-w-0">
													<span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
													<span className="truncate">{stat.label}</span>
												</div>
												<span className="tabular-nums">
													{stat.value} · {percentage}%
												</span>
											</div>

											<div className="h-2 rounded-full bg-muted/40 overflow-hidden">
												<div
													className="h-2 rounded-full transition-all"
													style={{
														width: `${percentage}%`,
														backgroundColor: stat.color
													}}
												/>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
