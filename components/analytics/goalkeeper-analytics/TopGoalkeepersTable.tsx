"use client";

import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import type { Match, MatchStats, Player } from "@/lib/types";

interface GoalkeeperRankingTableProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	title?: string;
	className?: string;
	minActions?: number;
	hiddenStats?: string[];
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const SAVE_DEFS = [
	{ key: "paradasRecup", statKey: "portero_tiros_parada_recup", label: "P. Recup" },
	{ key: "paradasFuera", statKey: "portero_paradas_fuera", label: "P. Fuera" },
	{ key: "paradasPenalti", statKey: "portero_paradas_penalti_parado", label: "P. Pen." },
	{ key: "paradasInf", statKey: "portero_paradas_hombre_menos", label: "P. Inf." }
] as const;

const GOAL_DEFS = [
	{ key: "gcBoya", statKey: "portero_goles_boya_parada", label: "GC Boya" },
	{ key: "gcHm", statKey: "portero_goles_hombre_menos", label: "GC Inf." },
	{ key: "gcDir", statKey: "portero_goles_dir_mas_5m", label: "GC +6m" },
	{ key: "gcContra", statKey: "portero_goles_contraataque", label: "GC Contra" },
	{ key: "gcPen", statKey: "portero_goles_penalti", label: "GC Pen." },
	{ key: "gcLanz", statKey: "portero_goles_lanzamiento", label: "GC Lanz." },
	{ key: "gcPalo", statKey: "portero_gol_palo", label: "GC Palo" }
] as const;

function getPlayerLabel(player: Player | null) {
	if (!player) return "Portero";
	return player.number != null ? `#${player.number} ${player.name}` : player.name;
}

function PlayerRowMini({ player }: { player: Player | null }) {
	return (
		<div className="flex items-center gap-3 min-w-0">
			<div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0 border">
				{player?.photo_url ? (
					<img src={player.photo_url} alt={player.name} className="h-full w-full object-cover object-top" />
				) : (
					<div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">
						{player?.number ?? "—"}
					</div>
				)}
			</div>

			<div className="min-w-0">
				<p className="text-sm font-medium truncate">{player?.name ?? "Portero"}</p>
				<p className="text-xs text-muted-foreground">{player?.number != null ? `#${player.number}` : "Sin dorsal"}</p>
			</div>
		</div>
	);
}

export function GoalkeeperRankingTable({
	matches,
	stats,
	players,
	title = "Ranking de porteros",
	className,
	minActions = 5,
	hiddenStats = []
}: GoalkeeperRankingTableProps) {
	const hiddenSet = useMemo(() => new Set(hiddenStats), [hiddenStats]);

	const visibleSaveDefs = useMemo(() => SAVE_DEFS.filter((def) => !hiddenSet.has(def.statKey)), [hiddenSet]);
	const visibleGoalDefs = useMemo(() => GOAL_DEFS.filter((def) => !hiddenSet.has(def.statKey)), [hiddenSet]);

	const playersById = useMemo(() => {
		const map = new Map<number, Player>();
		(players ?? []).forEach((p) => {
			if (p?.is_goalkeeper) {
				map.set(Number(p.id), p);
			}
		});
		return map;
	}, [players]);

	const ranking = useMemo(() => {
		const map = new Map<
			number,
			{
				player: Player | null;
				paradas: number;
				golesConcedidos: number;
				paradasRecup: number;
				paradasFuera: number;
				paradasPenalti: number;
				paradasInf: number;
				gcBoya: number;
				gcHm: number;
				gcDir: number;
				gcContra: number;
				gcPen: number;
				gcLanz: number;
				gcPalo: number;
			}
		>();

		(stats ?? []).forEach((s: any) => {
			const pid = Number(s.player_id);
			if (!pid || !playersById.has(pid)) return;

			const paradasRecup = hiddenSet.has("portero_tiros_parada_recup") ? 0 : toNum(s.portero_tiros_parada_recup);
			const paradasFuera = hiddenSet.has("portero_paradas_fuera") ? 0 : toNum(s.portero_paradas_fuera);
			const paradasPenalti = hiddenSet.has("portero_paradas_penalti_parado") ? 0 : toNum(s.portero_paradas_penalti_parado);
			const paradasInf = hiddenSet.has("portero_paradas_hombre_menos") ? 0 : toNum(s.portero_paradas_hombre_menos);

			const gcBoya = hiddenSet.has("portero_goles_boya_parada") ? 0 : toNum(s.portero_goles_boya_parada);
			const gcHm = hiddenSet.has("portero_goles_hombre_menos") ? 0 : toNum(s.portero_goles_hombre_menos);
			const gcDir = hiddenSet.has("portero_goles_dir_mas_5m") ? 0 : toNum(s.portero_goles_dir_mas_5m);
			const gcContra = hiddenSet.has("portero_goles_contraataque") ? 0 : toNum(s.portero_goles_contraataque);
			const gcPen = hiddenSet.has("portero_goles_penalti") ? 0 : toNum(s.portero_goles_penalti);
			const gcLanz = hiddenSet.has("portero_goles_lanzamiento") ? 0 : toNum(s.portero_goles_lanzamiento);
			const gcPalo = hiddenSet.has("portero_gol_palo") ? 0 : toNum(s.portero_gol_palo);

			const paradas = paradasRecup + paradasFuera + paradasPenalti + paradasInf;
			const golesConcedidos = gcBoya + gcHm + gcDir + gcContra + gcPen + gcLanz + gcPalo;

			if (paradas <= 0 && golesConcedidos <= 0) return;

			const prev = map.get(pid) ?? {
				player: playersById.get(pid) ?? null,
				paradas: 0,
				golesConcedidos: 0,
				paradasRecup: 0,
				paradasFuera: 0,
				paradasPenalti: 0,
				paradasInf: 0,
				gcBoya: 0,
				gcHm: 0,
				gcDir: 0,
				gcContra: 0,
				gcPen: 0,
				gcLanz: 0,
				gcPalo: 0
			};

			prev.paradas += paradas;
			prev.golesConcedidos += golesConcedidos;

			prev.paradasRecup += paradasRecup;
			prev.paradasFuera += paradasFuera;
			prev.paradasPenalti += paradasPenalti;
			prev.paradasInf += paradasInf;

			prev.gcBoya += gcBoya;
			prev.gcHm += gcHm;
			prev.gcDir += gcDir;
			prev.gcContra += gcContra;
			prev.gcPen += gcPen;
			prev.gcLanz += gcLanz;
			prev.gcPalo += gcPalo;

			map.set(pid, prev);
		});

		return Array.from(map.values())
			.map((r) => {
				const acciones = r.paradas + r.golesConcedidos;
				const pctParadas = acciones > 0 ? Number(((r.paradas / acciones) * 100).toFixed(1)) : 0;
				const balance = r.paradas - r.golesConcedidos;

				return {
					...r,
					acciones,
					pctParadas,
					balance
				};
			})
			.filter((r) => r.acciones >= minActions)
			.sort((a, b) => {
				if (b.pctParadas !== a.pctParadas) return b.pctParadas - a.pctParadas;
				if (b.paradas !== a.paradas) return b.paradas - a.paradas;
				return b.balance - a.balance;
			});
	}, [stats, playersById, minActions, hiddenSet]);

	const leader = ranking[0] ?? null;
	const totalParadas = ranking.reduce((sum, r) => sum + r.paradas, 0);
	const totalGC = ranking.reduce((sum, r) => sum + r.golesConcedidos, 0);

	if (!ranking.length || (!visibleSaveDefs.length && !visibleGoalDefs.length)) return null;

	return (
		<div className={`rounded-xl border overflow-hidden bg-card w-full ${className ?? ""}`}>
			<div className="px-4 py-3 border-b bg-card/60">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h3 className="text-sm sm:text-base font-semibold">{title}</h3>
						<p className="text-xs text-muted-foreground">
							{leader ? `${getPlayerLabel(leader.player)} lidera con ${leader.pctParadas}% de paradas` : "Sin datos"}
						</p>
					</div>
				</div>
			</div>

			<div className="w-full overflow-x-auto">
				<div className="max-h-[520px] overflow-y-auto">
					<Table className="min-w-[1160px]">
						<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-[64px]">#</TableHead>
								<TableHead>Portero</TableHead>
								<TableHead className="text-right">% Paradas</TableHead>
								<TableHead className="text-right">Paradas</TableHead>
								<TableHead className="text-right">GC</TableHead>
								<TableHead className="text-right">Balance</TableHead>

								{visibleSaveDefs.map((def) => (
									<TableHead key={def.key} className="text-right">
										{def.label}
									</TableHead>
								))}

								<TableHead className="text-right">Acciones</TableHead>
							</TableRow>
						</UITableHeader>

						<TableBody>
							{ranking.map((r, idx) => (
								<TableRow
									key={r.player?.id ?? idx}
									className={`${idx % 2 === 0 ? "bg-muted/20" : "bg-transparent"} hover:bg-muted/40`}
								>
									<TableCell className="font-semibold">{idx + 1}</TableCell>
									<TableCell>
										<PlayerRowMini player={r.player} />
									</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{r.pctParadas}%</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{r.paradas}</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{r.golesConcedidos}</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">
										{r.balance > 0 ? `+${r.balance}` : r.balance}
									</TableCell>

									{visibleSaveDefs.map((def) => (
										<TableCell key={def.key} className="text-right tabular-nums">
											{toNum((r as Record<string, unknown>)[def.key])}
										</TableCell>
									))}

									<TableCell className="text-right tabular-nums">{r.acciones}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>

			<div className="border-t bg-muted/20 px-3 py-2">
				<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
					<span>
						<span className="font-medium text-foreground">{ranking.length}</span> porteros con al menos{" "}
						<span className="font-medium text-foreground">{minActions}</span> acciones
					</span>

					<div className="flex flex-wrap gap-2">
						<span className="rounded-md border bg-card px-2 py-1">
							Paradas: <span className="font-semibold text-foreground">{totalParadas}</span>
						</span>
						<span className="rounded-md border bg-card px-2 py-1">
							GC: <span className="font-semibold text-foreground">{totalGC}</span>
						</span>
						{leader ? (
							<span className="rounded-md border bg-card px-2 py-1">
								Líder: <span className="font-semibold text-foreground">{getPlayerLabel(leader.player)}</span>
							</span>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
