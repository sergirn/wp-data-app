"use client";

import { useMemo } from "react";
import { ExpandableChartCard } from "@/components/analytics-player/ExpandableChartCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import type { Match, MatchStats, Player } from "@/lib/types";
import { ShieldCheck } from "lucide-react";

interface DefenseActionsByMatchChartProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

export function DefenseActionsByMatchChart({ matches, stats }: DefenseActionsByMatchChartProps) {
	const matchData = useMemo(() => {
		const sorted = [...(matches ?? [])].sort((a: any, b: any) => {
			const aj = a?.jornada ?? 9999;
			const bj = b?.jornada ?? 9999;
			if (aj !== bj) return aj - bj;
			return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
		});

		return sorted.slice(-15).map((match: any, index: number) => {
			const ms = (stats ?? []).filter((s: any) => String(s.match_id) === String(match.id));

			const bloqueos = ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_bloqueo), 0);
			const recuperaciones = ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_recuperacion), 0);
			const recibeGol = ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_recibir_gol), 0);
			const rebotes = ms.reduce((sum: number, s: any) => sum + toNum(s.acciones_rebote), 0);

			const jornadaNumber = match.jornada ?? index + 1;

			return {
				matchId: match.id,
				jornada: `J${jornadaNumber}`,
				rival: match.opponent,
				fullDate: new Date(match.match_date).toLocaleDateString("es-ES"),
				bloqueos,
				recuperaciones,
				recibeGol,
				rebotes,
				total: bloqueos + recuperaciones + recibeGol + rebotes
			};
		});
	}, [matches, stats]);

	const totalBloqueos = useMemo(() => matchData.reduce((sum, m) => sum + m.bloqueos, 0), [matchData]);
	const totalRecuperaciones = useMemo(() => matchData.reduce((sum, m) => sum + m.recuperaciones, 0), [matchData]);
	const totalRebotes = useMemo(() => matchData.reduce((sum, m) => sum + m.rebotes, 0), [matchData]);
	const totalRecibeGol = useMemo(() => matchData.reduce((sum, m) => sum + m.recibeGol, 0), [matchData]);

	if (!matchData.length) return null;

	return (
		<ExpandableChartCard
			title="Acciones defensivas por jornada"
			description={`Últimos ${matchData.length} · Bloq ${totalBloqueos} · Recup ${totalRecuperaciones} · Rebotes ${totalRebotes}`}
			icon={<ShieldCheck className="w-5 h-5" />}
			className="bg-gradient-to-br from-gray-500/5 to-black/5"
			rightHeader={<span className="text-xs text-muted-foreground">{matchData.length} pj</span>}
			renderChart={({ compact }) => (
				<ChartContainer
					config={{
						bloqueos: { label: "Bloqueos", color: "hsla(221, 83%, 53%, 1.00)" },
						recuperaciones: { label: "Recuperaciones", color: "hsla(145, 63%, 42%, 1.00)" },
						rebotes: { label: "Rebotes", color: "hsla(42, 96%, 55%, 1.00)" },
						recibeGol: { label: "Recibe gol", color: "hsla(0, 84%, 60%, 1.00)" }
					}}
					className="w-full h-full"
				>
					<ResponsiveContainer width="100%" height="120%">
						<ComposedChart data={matchData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />

							<XAxis
								dataKey="jornada"
								fontSize={12}
								tickMargin={8}
								axisLine={false}
								tickLine={false}
								interval="preserveStartEnd"
								minTickGap={18}
							/>

							<YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />

							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(label, payload) => {
											const p = payload?.[0]?.payload;
											return p ? `${label} · vs ${p.rival} · ${p.fullDate}` : String(label);
										}}
									/>
								}
							/>

							<Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: 12 }} />

							<Bar dataKey="bloqueos" stackId="a" fill="var(--color-bloqueos)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="recuperaciones" stackId="a" fill="var(--color-recuperaciones)" />
							<Bar dataKey="rebotes" stackId="a" fill="var(--color-rebotes)" />
							<Bar dataKey="recibeGol" stackId="a" fill="var(--color-recibeGol)" />
						</ComposedChart>
					</ResponsiveContainer>
					<br />
				</ChartContainer>
			)}
			renderTable={() => (
				<div className="rounded-xl border overflow-hidden bg-card w-full">
					<div className="w-full overflow-x-auto">
						<div className="max-h-[520px] overflow-y-auto">
							<Table className="min-w-[900px]">
								<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
									<TableRow className="hover:bg-transparent">
										<TableHead>Jornada</TableHead>
										<TableHead>Rival</TableHead>
										<TableHead className="text-right">Bloq.</TableHead>
										<TableHead className="text-right">Recup.</TableHead>
										<TableHead className="text-right">Rebotes</TableHead>
										<TableHead className="text-right">Recibe gol</TableHead>
										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</UITableHeader>

								<TableBody>
									{matchData.map((m, idx) => (
										<TableRow key={m.matchId} className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}>
											<TableCell className="font-semibold">{m.jornada}</TableCell>
											<TableCell>{m.rival}</TableCell>
											<TableCell className="text-right tabular-nums">{m.bloqueos}</TableCell>
											<TableCell className="text-right tabular-nums">{m.recuperaciones}</TableCell>
											<TableCell className="text-right tabular-nums">{m.rebotes}</TableCell>
											<TableCell className="text-right tabular-nums">{m.recibeGol}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{m.total}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>

					<div className="border-t bg-muted/20 px-3 py-2">
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
							<span>
								<span className="font-medium text-foreground">{matchData.length}</span> partidos
							</span>

							<div className="flex flex-wrap gap-2">
								<span className="rounded-md border bg-card px-2 py-1">
									Bloq.: <span className="font-semibold text-foreground">{totalBloqueos}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Recup.: <span className="font-semibold text-foreground">{totalRecuperaciones}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Rebotes: <span className="font-semibold text-foreground">{totalRebotes}</span>
								</span>
								<span className="rounded-md border bg-card px-2 py-1">
									Recibe gol: <span className="font-semibold text-foreground">{totalRecibeGol}</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		/>
	);
}
