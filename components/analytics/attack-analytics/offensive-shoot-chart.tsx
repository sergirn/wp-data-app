"use client";

import React, { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";

type PlayerLite = { id: number; name: string; number?: number; photo_url?: string };

interface GoalMixChartProps {
	matches: any[];
	stats: any[];
	players: PlayerLite[];
	hiddenStats?: string[];
}

const toNum = (v: any) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const fmtPct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;

function playerLabelShort(p: PlayerLite | null, value: number) {
	if (!p || value <= 0) return "—";
	const num = p.number != null ? `#${p.number}` : "#-";
	return `${num} (${value})`;
}

function playerLabelFull(p: PlayerLite | null, value: number) {
	if (!p || value <= 0) return "—";
	const num = p.number != null ? `#${p.number}` : "#-";
	return `${num} ${p.name} (${value})`;
}

export function GoalMixChart({ matches, stats, players, hiddenStats = [] }: GoalMixChartProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const playersById = useMemo(() => {
		const m = new Map<number, PlayerLite>();
		(players ?? []).forEach((p) => m.set(p.id, p));
		return m;
	}, [players]);

	const summary = useMemo(() => {
		const all = stats ?? [];

		const boya = hiddenSet.has("goles_boya_jugada") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_boya_jugada), 0);

		const lanzamiento = hiddenSet.has("goles_lanzamiento") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_lanzamiento), 0);

		const dir5m = hiddenSet.has("goles_dir_mas_5m") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_dir_mas_5m), 0);

		const contra = hiddenSet.has("goles_contraataque") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_contraataque), 0);

		const penalti = hiddenSet.has("goles_penalti_anotado") ? 0 : all.reduce((sum: number, s: any) => sum + toNum(s.goles_penalti_anotado), 0);

		const sup =
			hiddenSet.has("goles_hombre_mas") && hiddenSet.has("gol_del_palo_sup")
				? 0
				: all.reduce(
						(sum: number, s: any) =>
							sum +
							(hiddenSet.has("goles_hombre_mas") ? 0 : toNum(s.goles_hombre_mas)) +
							(hiddenSet.has("gol_del_palo_sup") ? 0 : toNum(s.gol_del_palo_sup)),
						0
					);

		const total = boya + lanzamiento + dir5m + contra + penalti + sup;
		const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

		const rawParts = [
			{ key: "boya", label: "Boya/Jugada", value: boya, pct: pct(boya), color: "hsla(140, 70%, 45%, 1.00)" },
			{ key: "lanzamiento", label: "Lanzamiento", value: lanzamiento, pct: pct(lanzamiento), color: "hsla(12, 85%, 60%, 1.00)" },
			{ key: "dir5m", label: "Dir +6m", value: dir5m, pct: pct(dir5m), color: "hsla(220, 80%, 62%, 1.00)" },
			{ key: "contra", label: "Contraataque", value: contra, pct: pct(contra), color: "hsla(205, 90%, 55%, 1.00)" },
			{ key: "penalti", label: "Penalti", value: penalti, pct: pct(penalti), color: "hsla(330, 78%, 58%, 1.00)" },
			{ key: "sup", label: "Superioridad", value: sup, pct: pct(sup), color: "hsla(59, 85%, 45%, 1.00)" }
		];

		const parts = rawParts.filter((p) => p.value > 0);
		const topType = [...rawParts].sort((a, b) => b.value - a.value)[0] ?? null;

		return {
			parts,
			rawParts,
			total,
			topType: topType && topType.value > 0 ? topType : null,
			totalMatches: (matches ?? []).length || 0
		};
	}, [matches, stats, hiddenSet]);

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
			boya: hiddenSet.has("goles_boya_jugada") ? { player: null, value: 0 } : sumByPlayer((s) => toNum(s.goles_boya_jugada)),
			lanzamiento: hiddenSet.has("goles_lanzamiento") ? { player: null, value: 0 } : sumByPlayer((s) => toNum(s.goles_lanzamiento)),
			dir5m: hiddenSet.has("goles_dir_mas_5m") ? { player: null, value: 0 } : sumByPlayer((s) => toNum(s.goles_dir_mas_5m)),
			contra: hiddenSet.has("goles_contraataque") ? { player: null, value: 0 } : sumByPlayer((s) => toNum(s.goles_contraataque)),
			penalti: hiddenSet.has("goles_penalti_anotado") ? { player: null, value: 0 } : sumByPlayer((s) => toNum(s.goles_penalti_anotado)),
			sup:
				hiddenSet.has("goles_hombre_mas") && hiddenSet.has("gol_del_palo_sup")
					? { player: null, value: 0 }
					: sumByPlayer(
							(s) =>
								(hiddenSet.has("goles_hombre_mas") ? 0 : toNum(s.goles_hombre_mas)) +
								(hiddenSet.has("gol_del_palo_sup") ? 0 : toNum(s.gol_del_palo_sup))
						)
		};
	}, [stats, playersById, hiddenSet]);

	const perMatch = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a, b) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.map((match, idx) => {
			const matchStats = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

			const boya = hiddenSet.has("goles_boya_jugada") ? 0 : matchStats.reduce((sum: number, s: any) => sum + toNum(s.goles_boya_jugada), 0);

			const lanzamiento = hiddenSet.has("goles_lanzamiento")
				? 0
				: matchStats.reduce((sum: number, s: any) => sum + toNum(s.goles_lanzamiento), 0);

			const dir5m = hiddenSet.has("goles_dir_mas_5m") ? 0 : matchStats.reduce((sum: number, s: any) => sum + toNum(s.goles_dir_mas_5m), 0);

			const contra = hiddenSet.has("goles_contraataque") ? 0 : matchStats.reduce((sum: number, s: any) => sum + toNum(s.goles_contraataque), 0);

			const penalti = hiddenSet.has("goles_penalti_anotado")
				? 0
				: matchStats.reduce((sum: number, s: any) => sum + toNum(s.goles_penalti_anotado), 0);

			const sup =
				hiddenSet.has("goles_hombre_mas") && hiddenSet.has("gol_del_palo_sup")
					? 0
					: matchStats.reduce(
							(sum: number, s: any) =>
								sum +
								(hiddenSet.has("goles_hombre_mas") ? 0 : toNum(s.goles_hombre_mas)) +
								(hiddenSet.has("gol_del_palo_sup") ? 0 : toNum(s.gol_del_palo_sup)),
							0
						);

			const total = boya + lanzamiento + dir5m + contra + penalti + sup;
			const pct = (x: number) => (total > 0 ? (x / total) * 100 : 0);

			const jornadaNumber = match.jornada ?? idx + 1;

			return {
				matchId: match.id,
				jornadaNumber,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				boya,
				lanzamiento,
				dir5m,
				contra,
				penalti,
				sup,
				total,
				boyaPct: Number(pct(boya).toFixed(1)),
				lanzamientoPct: Number(pct(lanzamiento).toFixed(1)),
				dir5mPct: Number(pct(dir5m).toFixed(1)),
				contraPct: Number(pct(contra).toFixed(1)),
				penaltiPct: Number(pct(penalti).toFixed(1)),
				supPct: Number(pct(sup).toFixed(1))
			};
		});
	}, [matches, stats, hiddenSet]);

	if (!summary.totalMatches || summary.total <= 0) return null;

	const topLineCompactParts = [
		topPlayers.boya.value > 0 ? `Boya ${playerLabelShort(topPlayers.boya.player, topPlayers.boya.value)}` : null,
		topPlayers.lanzamiento.value > 0 ? `Lanz ${playerLabelShort(topPlayers.lanzamiento.player, topPlayers.lanzamiento.value)}` : null,
		topPlayers.contra.value > 0 ? `Contra ${playerLabelShort(topPlayers.contra.player, topPlayers.contra.value)}` : null
	].filter(Boolean);

	const topLineCompact = topLineCompactParts.length ? topLineCompactParts.join(" · ") : "Sin datos";

	const topLineFullParts = [
		topPlayers.boya.value > 0 ? `Boya ${playerLabelFull(topPlayers.boya.player, topPlayers.boya.value)}` : null,
		topPlayers.lanzamiento.value > 0 ? `Lanzamiento ${playerLabelFull(topPlayers.lanzamiento.player, topPlayers.lanzamiento.value)}` : null,
		topPlayers.dir5m.value > 0 ? `Dir +6m ${playerLabelFull(topPlayers.dir5m.player, topPlayers.dir5m.value)}` : null,
		topPlayers.contra.value > 0 ? `Contraataque ${playerLabelFull(topPlayers.contra.player, topPlayers.contra.value)}` : null,
		topPlayers.penalti.value > 0 ? `Penalti ${playerLabelFull(topPlayers.penalti.player, topPlayers.penalti.value)}` : null,
		topPlayers.sup.value > 0 ? `Superioridad ${playerLabelFull(topPlayers.sup.player, topPlayers.sup.value)}` : null
	].filter(Boolean);

	const topLineFull = topLineFullParts.length ? `Top (temporada): ${topLineFullParts.join(" · ")}` : "Top (temporada): —";

	return (
		<ExpandableChartCard
			title="Tipo de goles ofensivos"
			description={` ${topLineCompact}`}
			icon={<Target className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5 h-full"
			rightHeader={<span className="text-xs text-muted-foreground">{summary.topType?.label ?? "—"}</span>}
			renderChart={({ compact }) => {
				const outer = compact ? 88 : 108;
				const inner = compact ? 54 : 68;

				return (
					<div className="w-full h-full min-h-0 flex flex-col">
						<div className="space-y-3 sm:space-y-4 h-full min-h-0 flex flex-col">
							<ChartContainer
								config={Object.fromEntries(
									summary.rawParts.filter((p) => p.value > 0).map((p) => [p.key, { label: p.label, color: p.color }])
								)}
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
													const pct = summary.total > 0 ? (v / summary.total) * 100 : 0;
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

							<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
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
											{summary.total ? Math.round((p.value / summary.total) * 100) : 0}%
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
										{!hiddenSet.has("goles_boya_jugada") && <TableHead className="text-right">Boya</TableHead>}
										{!hiddenSet.has("goles_lanzamiento") && <TableHead className="text-right">Lanz.</TableHead>}
										{!hiddenSet.has("goles_dir_mas_5m") && <TableHead className="text-right">Dir +6m</TableHead>}
										{!hiddenSet.has("goles_contraataque") && <TableHead className="text-right">Contra</TableHead>}
										{!hiddenSet.has("goles_penalti_anotado") && <TableHead className="text-right">Penalti</TableHead>}
										{(!hiddenSet.has("goles_hombre_mas") || !hiddenSet.has("gol_del_palo_sup")) && (
											<TableHead className="text-right">Sup.</TableHead>
										)}
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

											{!hiddenSet.has("goles_boya_jugada") && (
												<TableCell className="text-right tabular-nums">
													{m.boya} <span className="text-xs text-muted-foreground">({fmtPct(m.boyaPct)})</span>
												</TableCell>
											)}

											{!hiddenSet.has("goles_lanzamiento") && (
												<TableCell className="text-right tabular-nums">
													{m.lanzamiento}{" "}
													<span className="text-xs text-muted-foreground">({fmtPct(m.lanzamientoPct)})</span>
												</TableCell>
											)}

											{!hiddenSet.has("goles_dir_mas_5m") && (
												<TableCell className="text-right tabular-nums">
													{m.dir5m} <span className="text-xs text-muted-foreground">({fmtPct(m.dir5mPct)})</span>
												</TableCell>
											)}

											{!hiddenSet.has("goles_contraataque") && (
												<TableCell className="text-right tabular-nums">
													{m.contra} <span className="text-xs text-muted-foreground">({fmtPct(m.contraPct)})</span>
												</TableCell>
											)}

											{!hiddenSet.has("goles_penalti_anotado") && (
												<TableCell className="text-right tabular-nums">
													{m.penalti} <span className="text-xs text-muted-foreground">({fmtPct(m.penaltiPct)})</span>
												</TableCell>
											)}

											{(!hiddenSet.has("goles_hombre_mas") || !hiddenSet.has("gol_del_palo_sup")) && (
												<TableCell className="text-right tabular-nums">
													{m.sup} <span className="text-xs text-muted-foreground">({fmtPct(m.supPct)})</span>
												</TableCell>
											)}

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
									Goles ofensivos: <span className="font-semibold text-foreground tabular-nums">{summary.total}</span>
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
