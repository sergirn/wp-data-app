"use client";

import React, { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

type PlayerLite = { id: number; name: string; number?: number; photo_url?: string };

interface ShotMistakesDonutChartProps {
	matches: any[];
	stats: any[];
	players: PlayerLite[];
}

const toNum = (v: any) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const fmtPct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;

function playerLabelShort(p: PlayerLite | null, value: number) {
	if (!p) return "—";
	const num = p.number != null ? `#${p.number}` : "#-";
	return `${num} (${value})`;
}

function playerLabelFull(p: PlayerLite | null, value: number) {
	if (!p) return "—";
	const num = p.number != null ? `#${p.number}` : "#-";
	return `${num} ${p.name} (${value})`;
}

export function ShotMistakesDonutChart({ matches, stats, players }: ShotMistakesDonutChartProps) {
	const playersById = useMemo(() => {
		const m = new Map<number, PlayerLite>();
		(players ?? []).forEach((p) => m.set(p.id, p));
		return m;
	}, [players]);

	const summary = useMemo(() => {
		const all = stats ?? [];

		const pen = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_penalti_fallado), 0);
		const corner = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_corner), 0);
		const out = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_fuera), 0);
		const palo = all.reduce((sum: number, s: any) => sum + toNum(s.tiro_palo), 0);
		const saved = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_parados), 0);
		const blocked = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_bloqueado), 0);
		const supFail = all.reduce((sum: number, s: any) => sum + toNum(s.tiros_hombre_mas), 0);

		const totalMistakes = pen + corner + out + palo + saved + blocked + supFail;
		const pct = (x: number) => (totalMistakes > 0 ? (x / totalMistakes) * 100 : 0);

		const parts = [
			{ key: "pen", label: "Penalti fallado", value: pen, pct: pct(pen), color: "hsla(330, 78%, 58%, 1.00)" },
			{ key: "corner", label: "Corner", value: corner, pct: pct(corner), color: "hsla(35, 90%, 55%, 1.00)" },
			{ key: "out", label: "Fuera", value: out, pct: pct(out), color: "hsla(0, 85%, 60%, 1.00)" },
			{ key: "palo", label: "Palo", value: palo, pct: pct(palo), color: "hsla(140, 70%, 45%, 1.00)" },
			{ key: "saved", label: "Parado", value: saved, pct: pct(saved), color: "hsla(205, 90%, 55%, 1.00)" },
			{ key: "blocked", label: "Bloqueado", value: blocked, pct: pct(blocked), color: "hsla(270, 75%, 60%, 1.00)" },
			{ key: "sup", label: "Fallo Sup.+", value: supFail, pct: pct(supFail), color: "hsla(59, 85%, 45%, 1.00)" }
		];

		const topType = [...parts].sort((a, b) => b.value - a.value)[0] ?? null;

		return {
			parts,
			totalMistakes,
			topType,
			totalMatches: (matches ?? []).length || 0
		};
	}, [matches, stats]);

	const topPlayers = useMemo(() => {
		const sumByPlayer = (getValue: (s: any) => number) => {
			const m = new Map<number, number>();

			(stats ?? []).forEach((s: any) => {
				const pid = Number(s.player_id);
				if (!pid) return;
				m.set(pid, (m.get(pid) ?? 0) + getValue(s));
			});

			let bestId: number | null = null;
			let bestVal = 0;

			for (const [pid, v] of m.entries()) {
				if (v > bestVal) {
					bestVal = v;
					bestId = pid;
				}
			}

			return { player: bestId ? (playersById.get(bestId) ?? null) : null, value: bestVal };
		};

		return {
			pen: sumByPlayer((s) => toNum(s.tiros_penalti_fallado)),
			corner: sumByPlayer((s) => toNum(s.tiros_corner)),
			out: sumByPlayer((s) => toNum(s.tiros_fuera)),
			palo: sumByPlayer((s) => toNum(s.tiro_palo)),
			saved: sumByPlayer((s) => toNum(s.tiros_parados)),
			blocked: sumByPlayer((s) => toNum(s.tiros_bloqueado)),
			sup: sumByPlayer((s) => toNum(s.tiros_hombre_mas))
		};
	}, [stats, playersById]);

	const perMatch = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a, b) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.slice(-15).map((match, idx) => {
			const matchStats = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

			const pen = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_penalti_fallado), 0);
			const corner = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_corner), 0);
			const out = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_fuera), 0);
			const palo = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiro_palo), 0);
			const saved = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_parados), 0);
			const blocked = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_bloqueado), 0);
			const sup = matchStats.reduce((sum: number, s: any) => sum + toNum(s.tiros_hombre_mas), 0);

			const total = pen + corner + out + palo + saved + blocked + sup;
			const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

			const jornadaNumber = match.jornada ?? idx + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),

				pen,
				corner,
				out,
				palo,
				saved,
				blocked,
				sup,
				total,

				penPct: Number(pct(pen).toFixed(1)),
				cornerPct: Number(pct(corner).toFixed(1)),
				outPct: Number(pct(out).toFixed(1)),
				paloPct: Number(pct(palo).toFixed(1)),
				savedPct: Number(pct(saved).toFixed(1)),
				blockedPct: Number(pct(blocked).toFixed(1)),
				supPct: Number(pct(sup).toFixed(1))
			};
		});
	}, [matches, stats]);

	if (!summary.totalMatches) return null;

	const topLineCompact =
		summary.totalMistakes > 0
			? `Fuera ${playerLabelShort(topPlayers.out.player, topPlayers.out.value)} · Parado ${playerLabelShort(
					topPlayers.saved.player,
					topPlayers.saved.value
				)} · Bloq ${playerLabelShort(topPlayers.blocked.player, topPlayers.blocked.value)}`
			: "Sin datos";

	const topLineFull =
		summary.totalMistakes > 0
			? `Top (temporada): Penalti ${playerLabelFull(topPlayers.pen.player, topPlayers.pen.value)} · Corner ${playerLabelFull(
					topPlayers.corner.player,
					topPlayers.corner.value
				)} · Fuera ${playerLabelFull(topPlayers.out.player, topPlayers.out.value)} · Palo ${playerLabelFull(
					topPlayers.palo.player,
					topPlayers.palo.value
				)} · Parado ${playerLabelFull(topPlayers.saved.player, topPlayers.saved.value)} · Bloqueado ${playerLabelFull(
					topPlayers.blocked.player,
					topPlayers.blocked.value
				)} · Sup.+ ${playerLabelFull(topPlayers.sup.player, topPlayers.sup.value)}`
			: "Top (temporada): —";

	const mostFrequentText = summary.totalMistakes > 0 && summary.topType ? `${summary.topType.label}` : "Sin datos de fallos";

	return (
		<ExpandableChartCard
			title="Distribución de fallos de tiro"
			description={`${mostFrequentText} · ${topLineCompact}`}
			icon={<Target className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{summary.totalMistakes ? `${summary.topType?.label ?? "—"}` : "—"}</span>}
			renderChart={({ compact }) => {
				const outer = compact ? 88 : 108;
				const inner = compact ? 54 : 68;

				return (
					<div className="w-full h-full min-h-0 flex flex-col">
						<div className="space-y-3 sm:space-y-4 h-full min-h-0 flex flex-col">
							<ChartContainer
								config={{
									pen: { label: "Penalti fallado", color: summary.parts[0].color },
									corner: { label: "Corner", color: summary.parts[1].color },
									out: { label: "Fuera", color: summary.parts[2].color },
									palo: { label: "Palo", color: summary.parts[3].color },
									saved: { label: "Parado", color: summary.parts[4].color },
									blocked: { label: "Bloqueado", color: summary.parts[5].color },
									sup: { label: "Fallo Sup.+", color: summary.parts[6].color }
								}}
								className="w-full h-full min-h-0"
							>
								<div className="w-full h-full min-h-[240px] sm:min-h-[260px] lg:min-h-[300px] flex-1">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
											<Pie
												data={summary.parts}
												dataKey="value"
												nameKey="label"
												innerRadius={inner}
												outerRadius={outer}
												paddingAngle={2}
												stroke="none"
												isAnimationActive={false}
												cx="50%"
												cy="50%"
											>
												{summary.parts.map((p) => (
													<Cell key={p.key} fill={p.color} />
												))}
											</Pie>

											<RechartsTooltip
												formatter={(value: any, _name: any, props: any) => {
													const v = toNum(value);
													const pct = summary.totalMistakes > 0 ? (v / summary.totalMistakes) * 100 : 0;
													return [`${v} (${pct.toFixed(1)}%)`, props?.payload?.label ?? ""];
												}}
												labelFormatter={() => ""}
											/>
										</PieChart>
									</ResponsiveContainer>
								</div>
							</ChartContainer>

							<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
								{summary.parts.map((p) => (
									<div key={p.key} className="inline-flex items-center gap-2">
										<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
										<span className="whitespace-nowrap">
											<span className="font-medium text-foreground">{p.label}</span>{" "}
											<span className="tabular-nums">{fmtPct(p.pct)}</span>
										</span>
									</div>
								))}
							</div>

							<div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-3">
								{summary.parts.map((p) => (
									<div
										key={p.key}
										className="rounded-md border px-2 py-2 text-center"
										style={{ backgroundColor: `${p.color}10` }}
										title={p.label}
									>
										<p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{p.label}</p>
										<p className="text-sm sm:text-base font-bold tabular-nums leading-tight">{p.value}</p>
										<p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
											{summary.totalMistakes ? Math.round((p.value / summary.totalMistakes) * 100) : 0}%
										</p>
									</div>
								))}
							</div>

							{!compact ? (
								<div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
									<span className="font-medium text-foreground">{topLineFull}</span>
								</div>
							) : null}
						</div>
					</div>
				);
			}}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[1180px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[90px]">Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Pen.</TableHead>
										<TableHead className="text-right">Corner</TableHead>
										<TableHead className="text-right">Fuera</TableHead>
										<TableHead className="text-right">Palo</TableHead>
										<TableHead className="text-right">Parado</TableHead>
										<TableHead className="text-right">Bloq</TableHead>
										<TableHead className="text-right">Sup.+</TableHead>
										<TableHead className="text-right">Total</TableHead>
										<TableHead className="text-right hidden lg:table-cell">Fecha</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{perMatch.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>

											<TableCell className="max-w-[280px]">
												<div className="min-w-0">
													<p className="font-medium truncate">{m.rival}</p>
													<p className="text-xs text-muted-foreground sm:hidden">{m.fullDate}</p>
												</div>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												{m.pen} <span className="text-xs text-muted-foreground">({fmtPct(m.penPct)})</span>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												{m.corner} <span className="text-xs text-muted-foreground">({fmtPct(m.cornerPct)})</span>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												{m.out} <span className="text-xs text-muted-foreground">({fmtPct(m.outPct)})</span>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												{m.palo} <span className="text-xs text-muted-foreground">({fmtPct(m.paloPct)})</span>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												{m.saved} <span className="text-xs text-muted-foreground">({fmtPct(m.savedPct)})</span>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												{m.blocked} <span className="text-xs text-muted-foreground">({fmtPct(m.blockedPct)})</span>
											</TableCell>

											<TableCell className="text-right tabular-nums">
												{m.sup} <span className="text-xs text-muted-foreground">({fmtPct(m.supPct)})</span>
											</TableCell>

											<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
											<TableCell className="text-right text-muted-foreground hidden lg:table-cell">{m.fullDate}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>

					<div className="border-t bg-muted/20 px-3 py-2">
						<div className="flex flex-col gap-2 text-xs text-muted-foreground">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span>
									<span className="font-medium text-foreground">{perMatch.length}</span> partidos (últimos)
								</span>

								<span className="rounded-md border bg-card px-2 py-1">
									Fallos (temp): <span className="font-semibold text-foreground tabular-nums">{summary.totalMistakes}</span>
								</span>
							</div>

							<div className="rounded-md border bg-card px-2 py-1">
								<span className="font-semibold text-foreground">{topLineFull}</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
