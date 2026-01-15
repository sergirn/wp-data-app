"use client";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { useClub } from "@/lib/club-context";

type PlayerLike = {
	name: string;
	number?: number | null;
	photo_url?: string | null;
	is_goalkeeper?: boolean | null;
};

export function PlayerHeroHeader({ player, roleLabel }: { player: PlayerLike; roleLabel?: string }) {
	const { currentClub } = useClub();
	const role = roleLabel ?? (player.is_goalkeeper ? "Portero" : "Jugador de Campo");

	return (
		<CardHeader className="p-0">
			<div className="relative overflow-hidden rounded-xl border-2">
				{/* Fondo logo difuminado */}
				{currentClub?.logo_url ? (
					<div className="pointer-events-none absolute -right-16 -top-16 h-[420px] w-[420px] opacity-[0.30] dark:opacity-[0.30]">
						<img src={currentClub.logo_url || "/placeholder.svg"} alt="" className="h-full w-full object-contain" />
					</div>
				) : null}

				{/* Overlay legibilidad */}
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />

				{/* Contenido */}
				<div className="relative flex items-stretch">
					{/* Foto pegada al borde */}
					<div className="shrink-0 w-[100px] sm:w-[140px] md:w-[210px] h-[102px] sm:h-[100px] md:h-[140px] overflow-hidden">
						{player.photo_url ? (
							<img
								src={player.photo_url || "/placeholder.svg"}
								alt={player.name}
								className="h-[150%] w-full object-cover object-top"
								loading="lazy"
							/>
						) : (
							<div className="h-full w-full bg-primary flex items-center justify-center">
								<span className="text-primary-foreground font-extrabold text-2xl md:text-3xl tabular-nums">
									{player.number ?? "—"}
								</span>
							</div>
						)}
					</div>

					{/* Texto centrado verticalmente + alineado izquierda */}
					<div className="flex-1 min-w-0 px-4 sm:px-5 flex flex-col justify-center">
						<div className="flex flex-wrap items-center gap-2">
							<CardTitle className="text-lg sm:text-xl md:text-2xl leading-tight truncate">{player.name}</CardTitle>

							<span className="inline-flex items-center rounded-md border bg-card/60 backdrop-blur px-2 py-1 text-[11px] text-muted-foreground">
								{role}
							</span>

							{player.number != null ? (
								<span className="inline-flex items-center rounded-md bg-muted/60 backdrop-blur px-2 py-1 text-[11px] font-semibold tabular-nums">
									#{player.number}
								</span>
							) : null}
						</div>

						<p className="mt-1 text-xs sm:text-sm text-muted-foreground truncate">{currentClub?.name ?? "—"}</p>
					</div>
				</div>
			</div>
		</CardHeader>
	);
}
