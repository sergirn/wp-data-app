"use client";

import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import type { Match, MatchStats, Player } from "@/lib/types";

interface TopScorersTableProps {
	matches: Match[];
	stats: MatchStats[];
	players: Player[];
	title?: string;
	className?: string;
}

const toNum = (v: unknown) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

function getPlayerLabel(player: Player | null) {
	if (!player) return "Jugador";
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
				<p className="text-sm font-medium truncate">{player?.name ?? "Jugador"}</p>
				<p className="text-xs text-muted-foreground">{player?.number != null ? `#${player.number}` : "Sin dorsal"}</p>
			</div>
		</div>
	);
}

export function TopScorersTable({ matches, stats, players, title = "Máximos goleadores", className }: TopScorersTableProps) {
	const playersById = useMemo(() => {
		const map = new Map<number, Player>();
		(players ?? []).forEach((p) => map.set(Number(p.id), p));
		return map;
	}, [players]);

	const ranking = useMemo(() => {
		const map = new Map<
			number,
			{
				player: Player | null;
				goles: number;
				tiros: number;
				eficiencia: number;
				boya: number;
				lanzamiento: number;
				dir5m: number;
				contra: number;
				penalti: number;
				sup: number;
			}
		>();

		(stats ?? []).forEach((s: any) => {
			const pid = Number(s.player_id);
			if (!pid) return;

			const boya = toNum(s.goles_boya_jugada);
			const lanzamiento = toNum(s.goles_lanzamiento);
			const dir5m = toNum(s.goles_dir_mas_5m);
			const contra = toNum(s.goles_contraataque);
			const penalti = toNum(s.goles_penalti_anotado);
			const sup = toNum(s.goles_hombre_mas) + toNum(s.gol_del_palo_sup);
			const tiros = toNum(s.tiros_totales);

			const total = boya + lanzamiento + dir5m + contra + penalti + sup;
			if (total <= 0 && tiros <= 0) return;

			const prev = map.get(pid) ?? {
				player: playersById.get(pid) ?? null,
				goles: 0,
				tiros: 0,
				eficiencia: 0,
				boya: 0,
				lanzamiento: 0,
				dir5m: 0,
				contra: 0,
				penalti: 0,
				sup: 0
			};

			prev.goles += total;
			prev.tiros += tiros;
			prev.boya += boya;
			prev.lanzamiento += lanzamiento;
			prev.dir5m += dir5m;
			prev.contra += contra;
			prev.penalti += penalti;
			prev.sup += sup;

			map.set(pid, prev);
		});

		return Array.from(map.values())
			.map((r) => ({
				...r,
				eficiencia: r.tiros > 0 ? Number(((r.goles / r.tiros) * 100).toFixed(1)) : 0
			}))
			.sort((a, b) => {
				if (b.goles !== a.goles) return b.goles - a.goles;
				if (b.eficiencia !== a.eficiencia) return b.eficiencia - a.eficiencia;
				return b.tiros - a.tiros;
			});
	}, [stats, playersById]);

	const leader = ranking[0] ?? null;
	const totalGoals = ranking.reduce((sum, r) => sum + r.goles, 0);

	if (!ranking.length) return null;

	return (
		<div className={`rounded-xl border overflow-hidden bg-card w-full ${className ?? ""}`}>
			<div className="px-4 py-3 border-b bg-card/60">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h3 className="text-sm sm:text-base font-semibold">{title}</h3>
						<p className="text-xs text-muted-foreground">
							{leader ? `${getPlayerLabel(leader.player)} lidera con ${leader.goles} goles` : "Sin datos"}
						</p>
					</div>
				</div>
			</div>

			<div className="w-full overflow-x-auto">
				<div className="max-h-[520px] overflow-y-auto">
					<Table className="min-w-[1080px]">
						<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-[64px]">#</TableHead>
								<TableHead>Jugador</TableHead>
								<TableHead className="text-right">Goles</TableHead>
								<TableHead className="text-right">Tiros</TableHead>
								<TableHead className="text-right">Eficiencia</TableHead>
								<TableHead className="text-right">Boya</TableHead>
								<TableHead className="text-right">Lanz.</TableHead>
								<TableHead className="text-right">Dir +6m</TableHead>
								<TableHead className="text-right">Contra</TableHead>
								<TableHead className="text-right">Pen.</TableHead>
								<TableHead className="text-right">Sup.</TableHead>
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
									<TableCell className="text-right tabular-nums font-semibold">{r.goles}</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{r.tiros}</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{r.eficiencia}%</TableCell>
									<TableCell className="text-right tabular-nums">{r.boya}</TableCell>
									<TableCell className="text-right tabular-nums">{r.lanzamiento}</TableCell>
									<TableCell className="text-right tabular-nums">{r.dir5m}</TableCell>
									<TableCell className="text-right tabular-nums">{r.contra}</TableCell>
									<TableCell className="text-right tabular-nums">{r.penalti}</TableCell>
									<TableCell className="text-right tabular-nums">{r.sup}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>

			<div className="border-t bg-muted/20 px-3 py-2">
				<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
					<span>
						<span className="font-medium text-foreground">{ranking.length}</span> jugadores con producción ofensiva
					</span>

					<div className="flex flex-wrap gap-2">
						<span className="rounded-md border bg-card px-2 py-1">
							Total goles: <span className="font-semibold text-foreground">{totalGoals}</span>
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
