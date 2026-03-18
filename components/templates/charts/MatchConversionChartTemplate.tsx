"use client";

import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

type ConversionChartData = {
	scored: number;
	scoredExtra?: number;
	missed: number;
	attempts: number;
	efficiency: number;
	reboundsRecovered?: number;
	reboundsLost?: number;
};

type Props = {
	title: string;
	description?: string;
	icon: React.ReactNode;
	data: ConversionChartData;
	scoredLabel: string;
	scoredExtraLabel?: string;
	missedLabel: string;
	recoveredLabel?: string;
	lostLabel?: string;
	insightGood?: string;
	insightBad?: string;
	rightHeader?: React.ReactNode;
	okColor?: string;
	badColor?: string;
	renderExtraChartSummary?: React.ReactNode;
	renderExtraTableSummary?: React.ReactNode;
};

const DEFAULT_OK = "#3a6bbbc4";
const DEFAULT_BAD = "#ac2020c7";

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
		<span className="inline-flex items-center rounded-full border border-border/60 bg-background/70 backdrop-blur px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
			{children}
		</span>
	);
}

function StatBox({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"rounded-2xl border px-3 py-3 transition-colors",
				subtle ? "bg-muted/25 border-transparent" : "bg-card/60 border-border/60 shadow-sm"
			].join(" ")}
		>
			<p className="text-[11px] font-medium text-muted-foreground">{label}</p>
			<p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
		</div>
	);
}

function Row({ label, value, subtle }: { label: string; value: React.ReactNode; subtle?: boolean }) {
	return (
		<div
			className={[
				"flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border transition-colors",
				subtle ? "bg-muted/25 border-transparent" : "bg-card/40 border-border/60"
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
	leftColor,
	rightColor
}: {
	leftLabel: string;
	leftValue: number;
	rightLabel: string;
	rightValue: number;
	leftColor: string;
	rightColor: string;
}) {
	const total = leftValue + rightValue;
	const leftPct = total > 0 ? leftValue / total : 0;
	const rightPct = total > 0 ? rightValue / total : 0;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-[11px] text-muted-foreground">
				<span className="truncate">
					{leftLabel} · <span className="font-semibold text-foreground tabular-nums">{leftValue}</span>
				</span>
				<span className="truncate">
					{rightLabel} · <span className="font-semibold text-foreground tabular-nums">{rightValue}</span>
				</span>
			</div>

			<div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden border border-border/60">
				<div
					className="h-full rounded-full"
					style={{
						width: `${clamp01(leftPct) * 100}%`,
						background: `linear-gradient(90deg, ${leftColor}, ${leftColor})`
					}}
				/>
				<div
					className="h-full -mt-2.5 rounded-full"
					style={{
						width: `${clamp01(rightPct) * 100}%`,
						marginLeft: `${clamp01(leftPct) * 100}%`,
						background: `linear-gradient(90deg, ${rightColor}, ${rightColor})`,
						opacity: 0.92
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

function DonutCenter({ title, value, subtitle }: { title: string; value: React.ReactNode; subtitle?: React.ReactNode }) {
	return (
		<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
			<div className="rounded-full border border-border/60 bg-background/85 backdrop-blur px-5 py-6 shadow-sm text-center min-w-[110px]">
				<p className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
				<p className="mt-1 text-2xl font-bold tabular-nums leading-none">{value}</p>
				{subtitle ? <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p> : null}
			</div>
		</div>
	);
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
	if (!active || !payload?.length) return null;

	const p = payload[0];
	const name = String(p?.name ?? "");
	const value = Number(p?.value ?? 0);

	return (
		<div className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
			<p className="text-xs text-muted-foreground">{name}</p>
			<p className="text-sm font-semibold tabular-nums">{value}</p>
		</div>
	);
}

export function MatchConversionChartTemplate({
	title,
	description,
	icon,
	data,
	scoredLabel,
	scoredExtraLabel,
	missedLabel,
	recoveredLabel = "Recuperados",
	lostLabel = "Perdidos",
	insightGood = "Buen rendimiento en la conversión.",
	insightBad = "Conversión mejorable.",
	rightHeader,
	okColor = DEFAULT_OK,
	badColor = DEFAULT_BAD,
	renderExtraChartSummary,
	renderExtraTableSummary
}: Props) {
	const scoredExtra = data.scoredExtra ?? 0;
	const scoredTotal = data.scored + scoredExtra;

	const reboundsRecovered = data.reboundsRecovered ?? 0;
	const reboundsLost = data.reboundsLost ?? 0;
	const reboundsTotal = reboundsRecovered + reboundsLost;
	const reboundsBalance = reboundsRecovered - reboundsLost;
	const hasRebounds = reboundsRecovered > 0 || reboundsLost > 0;

	const scoredPct = pct(scoredTotal, data.attempts);
	const missedPct = pct(data.missed, data.attempts);

	return (
		<ExpandableChartCard
			title={title}
			description={description ?? `${scoredTotal}/${data.attempts} · ${data.efficiency}%`}
			icon={icon}
			className="from-transparent"
			rightHeader={rightHeader ?? <span className="text-xs text-muted-foreground tabular-nums">{data.efficiency}%</span>}
			renderChart={({ compact }) => (
				<div className="w-full">
					<div className={`grid gap-5 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[1.05fr_1fr]"}`}>
						<div className="relative">
							<div className={`${compact ? "h-[240px]" : "h-[320px]"} w-full rounded-3xl border border-border/60 bg-card/30 p-2`}>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={[
												{ name: scoredLabel, value: scoredTotal },
												{ name: missedLabel, value: data.missed }
											]}
											cx="50%"
											cy="50%"
											innerRadius={compact ? 52 : 74}
											outerRadius={compact ? 86 : 116}
											paddingAngle={2}
											stroke="transparent"
											dataKey="value"
										>
											<Cell fill={okColor} />
											<Cell fill={badColor} />
										</Pie>
										<Tooltip content={<CustomTooltip />} />
									</PieChart>
								</ResponsiveContainer>

								<DonutCenter title="Eficiencia" value={`${data.efficiency}%`} subtitle={`${scoredTotal}/${data.attempts}`} />
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex flex-wrap gap-2">
								<TinyPill>
									Intentos <span className="ml-1 font-semibold text-foreground tabular-nums">{data.attempts}</span>
								</TinyPill>
								<TinyPill>
									{scoredLabel} <span className="ml-1 font-semibold text-foreground tabular-nums">{scoredTotal}</span>
								</TinyPill>
								<TinyPill>
									{missedLabel} <span className="ml-1 font-semibold text-foreground tabular-nums">{data.missed}</span>
								</TinyPill>
								{scoredExtra > 0 && scoredExtraLabel ? (
									<TinyPill>
										{scoredExtraLabel} <span className="ml-1 font-semibold text-foreground tabular-nums">{scoredExtra}</span>
									</TinyPill>
								) : null}
							</div>

							<div className="grid grid-cols-4 gap-3">
								<StatBox label={scoredLabel} value={scoredTotal} />
								<StatBox label={missedLabel} value={data.missed} />
								<StatBox label="% éxito" value={`${scoredPct}%`} subtle />
								<StatBox label="% fallo" value={`${missedPct}%`} subtle />
							</div>

							<div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm">
								<div className="flex items-center justify-between gap-3 mb-3">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversión</p>
									<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
										{data.efficiency}%
									</Badge>
								</div>

								<MiniBar
									leftLabel={scoredLabel}
									leftValue={scoredTotal}
									rightLabel={missedLabel}
									rightValue={data.missed}
									leftColor={okColor}
									rightColor={badColor}
								/>
							</div>

							{hasRebounds ? (
								<div className="rounded-3xl border border-border/60 bg-card/40 p-4 shadow-sm">
									<div className="flex items-center justify-between gap-2 mb-3">
										<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rebotes</p>
										<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
											Total {reboundsTotal}
										</Badge>
									</div>

									<div className="grid grid-cols-2 gap-2">
										<Row label={recoveredLabel} value={reboundsRecovered} />
										<Row label={lostLabel} value={reboundsLost} />
										<div className="col-span-2">
											<Row
												label="Balance"
												value={
													<span className="tabular-nums">
														{reboundsBalance >= 0 ? "+" : ""}
														{reboundsBalance}
													</span>
												}
												subtle
											/>
										</div>
									</div>
								</div>
							) : null}

							{renderExtraChartSummary}

							<div className="rounded-3xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-4 shadow-sm">
								<div className="flex items-start gap-3">
									<div className="mt-0.5">
										{data.efficiency >= 50 ? (
											<div className="rounded-full border border-border/60 bg-background/80 p-2">
												<TrendingUp className="h-4 w-4 text-muted-foreground" />
											</div>
										) : (
											<div className="rounded-full border border-border/60 bg-background/80 p-2">
												<TrendingDown className="h-4 w-4 text-muted-foreground" />
											</div>
										)}
									</div>

									<div className="min-w-0">
										<p className="text-sm font-semibold">Lectura rápida</p>
										<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
											{data.efficiency >= 50 ? insightGood : insightBad}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			renderTable={() => (
				<div className="rounded-3xl border border-border/60 bg-card/40 overflow-hidden">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-4">
						<div className="min-w-0">
							<p className="text-sm font-semibold">Detalle de {title}</p>
							<p className="text-xs text-muted-foreground">
								{scoredTotal}/{data.attempts} · {data.efficiency}%
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
								{scoredLabel} {scoredPct}%
							</Badge>
							<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
								{missedLabel} {missedPct}%
							</Badge>
						</div>
					</div>

					<div className="p-4 space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
							<StatBox label="Intentos" value={data.attempts} />
							<StatBox label="Eficiencia" value={`${data.efficiency}%`} />
							<StatBox label={scoredLabel} value={scoredTotal} />
							<StatBox label={missedLabel} value={data.missed} />
							<StatBox label={`${scoredLabel} (base)`} value={data.scored} subtle />
							{scoredExtraLabel ? <StatBox label={scoredExtraLabel} value={scoredExtra} subtle /> : null}
						</div>

						{hasRebounds ? (
							<div className="rounded-3xl border border-border/60 bg-muted/15 p-4">
								<div className="flex items-center justify-between gap-2 mb-3">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rebotes</p>
									<Badge variant="outline" className="bg-background/70 text-[11px] tabular-nums">
										Total {reboundsTotal}
									</Badge>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<Row label={recoveredLabel} value={reboundsRecovered} />
									<Row label={lostLabel} value={reboundsLost} />
									<div className="sm:col-span-2">
										<Row
											label="Balance"
											value={
												<span className="tabular-nums">
													{reboundsBalance >= 0 ? "+" : ""}
													{reboundsBalance}
												</span>
											}
											subtle
										/>
									</div>
								</div>
							</div>
						) : null}

						{renderExtraTableSummary}

						<div className="rounded-3xl border border-border/60 bg-gradient-to-br from-background to-muted/25 p-4">
							<div className="flex items-start gap-3">
								<div className="mt-0.5">
									{data.efficiency >= 50 ? (
										<div className="rounded-full border border-border/60 bg-background/80 p-2">
											<TrendingUp className="h-4 w-4 text-muted-foreground" />
										</div>
									) : (
										<div className="rounded-full border border-border/60 bg-background/80 p-2">
											<TrendingDown className="h-4 w-4 text-muted-foreground" />
										</div>
									)}
								</div>

								<div>
									<p className="text-sm font-semibold">Conclusión</p>
									<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
										{data.efficiency >= 50 ? insightGood : insightBad}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
