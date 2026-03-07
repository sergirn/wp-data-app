"use client";

import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import type { Match, MatchStats, Player } from "@/lib/types";

interface TopDefendersTableProps {
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

export function TopDefendersTable({ matches, stats, players, title = "Jugadores que más defienden", className }: TopDefendersTableProps) {
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
				bloqueos: number;
				recuperaciones: number;
				rebotes: number;
				recibeGol: number;
				accionesDefensivas: number;
				balance: number;
			}
		>();

		(stats ?? []).forEach((s: any) => {
			const pid = Number(s.player_id);
			if (!pid) return;

			const bloqueos = toNum(s.acciones_bloqueo);
			const recuperaciones = toNum(s.acciones_recuperacion);
			const rebotes = toNum(s.acciones_rebote);
			const recibeGol = toNum(s.acciones_recibir_gol);

			const accionesDefensivas = bloqueos + recuperaciones + rebotes;
			const balance = accionesDefensivas - recibeGol;

			if (accionesDefensivas <= 0 && recibeGol <= 0) return;

			const prev = map.get(pid) ?? {
				player: playersById.get(pid) ?? null,
				bloqueos: 0,
				recuperaciones: 0,
				rebotes: 0,
				recibeGol: 0,
				accionesDefensivas: 0,
				balance: 0
			};

			prev.bloqueos += bloqueos;
			prev.recuperaciones += recuperaciones;
			prev.rebotes += rebotes;
			prev.recibeGol += recibeGol;
			prev.accionesDefensivas += accionesDefensivas;
			prev.balance += balance;

			map.set(pid, prev);
		});

		return Array.from(map.values()).sort((a, b) => {
			if (b.accionesDefensivas !== a.accionesDefensivas) return b.accionesDefensivas - a.accionesDefensivas;
			if (b.balance !== a.balance) return b.balance - a.balance;
			return b.bloqueos - a.bloqueos;
		});
	}, [stats, playersById]);

	const leader = ranking[0] ?? null;
	const totalActions = ranking.reduce((sum, r) => sum + r.accionesDefensivas, 0);

	if (!ranking.length) return null;

	return (
		<div className={`rounded-xl border overflow-hidden bg-card w-full ${className ?? ""}`}>
			<div className="px-4 py-3 border-b bg-card/60">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h3 className="text-sm sm:text-base font-semibold">{title}</h3>
						<p className="text-xs text-muted-foreground">
							{leader ? `${getPlayerLabel(leader.player)} lidera con ${leader.accionesDefensivas} acciones defensivas` : "Sin datos"}
						</p>
					</div>
				</div>
			</div>

			<div className="w-full overflow-x-auto">
				<div className="max-h-[520px] overflow-y-auto">
					<Table className="min-w-[980px]">
						<UITableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-[64px]">#</TableHead>
								<TableHead>Jugador</TableHead>
								<TableHead className="text-right">Acciones Def.</TableHead>
								<TableHead className="text-right">Balance</TableHead>
								<TableHead className="text-right">Bloqueos</TableHead>
								<TableHead className="text-right">Recup.</TableHead>
								<TableHead className="text-right">Rebotes</TableHead>
								<TableHead className="text-right">Recibe gol</TableHead>
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
									<TableCell className="text-right tabular-nums font-semibold">{r.accionesDefensivas}</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">
										{r.balance > 0 ? `+${r.balance}` : r.balance}
									</TableCell>
									<TableCell className="text-right tabular-nums">{r.bloqueos}</TableCell>
									<TableCell className="text-right tabular-nums">{r.recuperaciones}</TableCell>
									<TableCell className="text-right tabular-nums">{r.rebotes}</TableCell>
									<TableCell className="text-right tabular-nums">{r.recibeGol}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>

			<div className="border-t bg-muted/20 px-3 py-2">
				<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
					<span>
						<span className="font-medium text-foreground">{ranking.length}</span> jugadores con actividad defensiva
					</span>

					<div className="flex flex-wrap gap-2">
						<span className="rounded-md border bg-card px-2 py-1">
							Total acciones: <span className="font-semibold text-foreground">{totalActions}</span>
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
