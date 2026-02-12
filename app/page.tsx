"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useClub } from "@/lib/club-context";
import { useProfile } from "@/lib/profile-context";
import { LandingPage } from "@/components/landing-page";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { AlertCircle, Calendar, ChevronDown, ChevronRight, ChevronUp, PlusCircle, Target, Trophy, TrendingUp, Users } from "lucide-react";

type MatchRow = {
	id: string;
	club_id: string;
	opponent: string;
	match_date: string;
	home_score: number;
	away_score: number;
	penalty_home_score: number | null;
	penalty_away_score: number | null;
};

type PlayerRow = {
	id: string;
	club_id: string;
	name: string;
	number: number;
	photo_url?: string | null;
};

function formatEsDate(dateStr: string) {
	try {
		return new Date(dateStr).toLocaleDateString("es-ES", {
			day: "numeric",
			month: "short",
			year: "numeric"
		});
	} catch {
		return dateStr;
	}
}

function getOutcome(match: MatchRow) {
	const isTied = match.home_score === match.away_score;
	const hasPenalties = isTied && match.penalty_home_score !== null && match.penalty_away_score !== null;

	if (hasPenalties) {
		const win = (match.penalty_home_score ?? 0) > (match.penalty_away_score ?? 0);
		return { status: win ? ("W" as const) : ("L" as const), label: win ? "Victoria (Pen.)" : "Derrota (Pen.)" };
	}

	if (match.home_score > match.away_score) return { status: "W" as const, label: "Victoria" };
	if (match.home_score < match.away_score) return { status: "L" as const, label: "Derrota" };
	return { status: "D" as const, label: "Empate" };
}

function StatusDot({ status }: { status: "W" | "L" | "D" }) {
	const cls = status === "W" ? "bg-green-500" : status === "L" ? "bg-red-500" : "bg-muted-foreground/50";
	return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} aria-hidden="true" />;
}

function MetricPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
	return (
		<div className="flex items-center gap-2 rounded-full border bg-background/60 px-3 py-2">
			<div className="text-muted-foreground">{icon}</div>
			<div className="leading-none">
				<p className="text-[11px] text-muted-foreground">{label}</p>
				<p className="text-sm font-semibold tabular-nums">{value}</p>
			</div>
		</div>
	);
}

function LoadingMinimal() {
	return (
		<main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
			<div className="container mx-auto px-4 py-8 sm:py-10">
				<div className="space-y-8">
					<div className="rounded-3xl border bg-background/60 p-6 sm:p-8">
						<div className="h-5 w-40 rounded bg-muted animate-pulse" />
						<div className="mt-3 h-9 w-[min(520px,85vw)] rounded bg-muted animate-pulse" />
						<div className="mt-3 h-5 w-[min(360px,70vw)] rounded bg-muted animate-pulse" />
						<div className="mt-6 flex gap-2">
							<div className="h-10 w-36 rounded-xl bg-muted animate-pulse" />
							<div className="h-10 w-28 rounded-xl bg-muted animate-pulse" />
						</div>
						<div className="mt-6 flex flex-wrap gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="h-12 w-36 rounded-full bg-muted animate-pulse" />
							))}
						</div>
					</div>

					<div className="space-y-6">
						<div className="h-[200px] rounded-3xl bg-muted animate-pulse" />
						<div className="h-[420px] rounded-3xl bg-muted animate-pulse" />
					</div>
				</div>
			</div>
		</main>
	);
}

export default function HomePage() {
	const { currentClub } = useClub();
	const { profile, loading: profileLoading } = useProfile();

	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [players, setPlayers] = useState<PlayerRow[]>([]);
	const [loading, setLoading] = useState(true);

	const [connectionError, setConnectionError] = useState(false);
	const [tablesNotFound, setTablesNotFound] = useState(false);

	// ✅ Mobile accordion state for players
	const [showAllPlayersMobile, setShowAllPlayersMobile] = useState(false);

	const canEdit = profile?.role === "admin" || profile?.role === "coach";

	useEffect(() => {
		async function fetchData() {
			if (profileLoading) return;

			if (!currentClub || !profile) {
				setLoading(false);
				return;
			}

			setLoading(true);
			setConnectionError(false);
			setTablesNotFound(false);

			try {
				const supabase = createClient();
				if (!supabase) {
					setConnectionError(true);
					setLoading(false);
					return;
				}

				const { data: matchesData, error: matchesError } = await supabase
					.from("matches")
					.select("*")
					.eq("club_id", currentClub.id)
					.order("match_date", { ascending: false })
					.limit(6);

				if (matchesError) {
					if (matchesError.message?.includes("Could not find the table")) setTablesNotFound(true);
					else throw matchesError;
				} else {
					setMatches(((matchesData || []) as MatchRow[]) ?? []);
				}

				const { data: playersData, error: playersError } = await supabase
					.from("players")
					.select("*")
					.eq("club_id", currentClub.id)
					.order("number");

				if (playersError) {
					if (playersError.message?.includes("Could not find the table")) setTablesNotFound(true);
					else throw playersError;
				} else {
					setPlayers(((playersData || []) as PlayerRow[]) ?? []);
				}
			} catch (e) {
				console.error("[home] Error fetching:", e);
				setConnectionError(true);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [currentClub, profile, profileLoading]);

	const derived = useMemo(() => {
		const totalMatches = matches.length;
		const wins = matches.filter((m) => m.home_score > m.away_score).length;
		const winRate = totalMatches ? Math.round((wins / totalMatches) * 100) : 0;

		const previewMatches = matches.slice(0, 3);
		const recentForm = previewMatches.map((m) => getOutcome(m).status);

		// Desktop/tablet preview
		const previewPlayers = players.slice(0, 16);

		// Mobile: show first 6 by default (accordion reveals the rest)
		const mobileFirst = players.slice(0, 8);
		const mobileRest = players.slice(6);

		const primaryCta = canEdit
			? { href: "/nuevo-partido", label: "Nuevo partido", icon: <PlusCircle className="mr-2 h-4 w-4" /> }
			: { href: "/partidos", label: "Ver partidos", icon: <Calendar className="mr-2 h-4 w-4" /> };

		return {
			totalMatches,
			wins,
			winRate,
			previewMatches,
			recentForm,
			previewPlayers,
			mobileFirst,
			mobileRest,
			primaryCta
		};
	}, [matches, players, canEdit]);

	// If players change (e.g. switch club), collapse accordion on mobile
	useEffect(() => {
		setShowAllPlayersMobile(false);
	}, [currentClub?.id]);

	if (!profile && !profileLoading) return <LandingPage />;
	if (profileLoading || loading) return <LoadingMinimal />;

	return (
		<main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
			<div className="container mx-auto px-4 py-4 sm:py-10">
				<div className="space-y-8">
					{/* HERO */}
					<section className="relative overflow-hidden rounded-3xl border bg-background/60 p-6 sm:p-8">
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10" />

						{currentClub?.logo_url && (
							<div className="pointer-events-none absolute -right-16 -top-16 h-[360px] w-[360px] opacity-[0.07] dark:opacity-[0.08]">
								<img src={currentClub.logo_url} alt="" className="h-full w-full object-contain" />
							</div>
						)}

						<div className="relative">
							<div className="flex items-center justify-between gap-4">
								<div className="min-w-0">
									<Badge variant="secondary" className="rounded-full">
										<TrendingUp className="mr-1 h-3 w-3" />
										Inicio
									</Badge>
									<h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight truncate">
										{currentClub?.name || "Mi Club"}
									</h1>
								</div>
							</div>

							<div className="mt-6 flex flex-wrap gap-2">
								<Button asChild className="rounded-xl" disabled={tablesNotFound || connectionError}>
									<Link href={derived.primaryCta.href}>
										{derived.primaryCta.icon}
										{derived.primaryCta.label}
									</Link>
								</Button>

								<Button asChild variant="secondary" className="rounded-xl" disabled={tablesNotFound || connectionError}>
									<Link href="/jugadores">
										<Users className="mr-2 h-4 w-4" />
										Jugadores
									</Link>
								</Button>

								<Button asChild variant="ghost" className="rounded-xl" disabled={tablesNotFound || connectionError}>
									<Link href="/analytics">
										<Target className="mr-2 h-4 w-4" />
										Análisis
									</Link>
								</Button>
							</div>

							<div className="mt-6 flex flex-wrap gap-2">
								<MetricPill icon={<Trophy className="h-4 w-4" />} label="Partidos (preview)" value={derived.totalMatches} />
								<MetricPill icon={<Target className="h-4 w-4" />} label="Rendimiento" value={`${derived.winRate}%`} />
								<MetricPill icon={<Users className="h-4 w-4" />} label="Jugadores" value={players.length} />

								{derived.recentForm.length > 0 && (
									<div className="flex items-center gap-2 rounded-full border bg-background/60 px-3 py-2">
										<p className="text-[11px] text-muted-foreground">Forma</p>
										<div className="flex items-center gap-1">
											{derived.recentForm.map((s, i) => (
												<StatusDot key={i} status={s} />
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</section>

					{/* Alerts */}
					{tablesNotFound && (
						<Alert variant="destructive" className="rounded-2xl">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Base de datos no inicializada</AlertTitle>
							<AlertDescription className="space-y-3 mt-2">
								<p>Las tablas aún no se han creado. Para inicializar:</p>
								<ol className="list-decimal list-inside space-y-2 ml-2">
									<li>Abre el panel lateral (icono de menú)</li>
									<li>
										Ve a <strong>Scripts</strong>
									</li>
									<li>Ejecuta los SQL en orden</li>
									<li>Recarga la página</li>
								</ol>
							</AlertDescription>
						</Alert>
					)}

					{connectionError && !tablesNotFound && (
						<Alert variant="destructive" className="rounded-2xl">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error de conexión</AlertTitle>
							<AlertDescription>Revisa la configuración de Supabase en el panel lateral.</AlertDescription>
						</Alert>
					)}

					<section className="space-y-8">
						{/* Matches */}
						<div>
							<div className="flex items-center justify-between gap-3">
								<CardTitle className="text-lg sm:text-xl">Últimos partidos</CardTitle>

								<Button asChild size="sm" className="rounded-md">
									<Link href="/partidos">
										Ver todos <ChevronRight className="ml-1 h-4 w-4" />
									</Link>
								</Button>
							</div>
						</div>

						<div className="space-y-3">
							{derived.previewMatches.length > 0 ? (
								<MatchListCompact matches={derived.previewMatches} />
							) : (
								<EmptyMinimal
									icon={<Calendar className="h-5 w-5" />}
									title="Sin partidos"
									desc={
										canEdit
											? "Crea el primer partido para empezar a registrar estadísticas."
											: "Todavía no hay partidos registrados."
									}
									cta={canEdit ? { href: "/nuevo-partido", label: "Crear primer partido" } : undefined}
								/>
							)}
						</div>

						{/* Players */}
						<Card className="rounded-3xl border ">
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between gap-3">
									<div className="min-w-0">
										<CardTitle className="text-lg sm:text-xl">Plantilla</CardTitle>
										<CardDescription className="truncate">Vista rápida de jugadores</CardDescription>
									</div>

									<Button asChild size="sm" className="rounded-md">
										<Link href="/jugadores">
											Ver todos <ChevronRight className="ml-1 h-4 w-4" />
										</Link>
									</Button>
								</div>
							</CardHeader>

							<CardContent className="space-y-4">
								{players.length > 0 ? (
									<>
										{/* ✅ Mobile accordion (only on mobile) */}
										<div className="sm:hidden space-y-3">
											<PlayerPhotoGridResponsive players={derived.mobileFirst} />

											{derived.mobileRest.length > 0 && (
												<>
													{/* Collapsible area */}
													<div
														className={[
															"grid transition-[max-height,opacity] duration-300 ease-out",
															showAllPlayersMobile ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
															"overflow-hidden"
														].join(" ")}
													>
														<div className={showAllPlayersMobile ? "pt-3" : ""}>
															<PlayerPhotoGridResponsive players={derived.mobileRest} />
														</div>
													</div>

													<Button
														type="button"
														variant="secondary"
														className="w-full rounded-2xl"
														onClick={() => setShowAllPlayersMobile((v) => !v)}
													>
														{showAllPlayersMobile ? (
															<>
																<ChevronUp className="mr-2 h-4 w-4" />
																Mostrar menos
															</>
														) : (
															<>
																<ChevronDown className="mr-2 h-4 w-4" />
																Mostrar {derived.mobileRest.length} más
															</>
														)}
													</Button>
												</>
											)}
										</div>

										{/* ✅ Tablet/Desktop (no accordion, show a nice amount) */}
										<div className="hidden sm:block">
											<PlayerPhotoGridResponsive players={derived.previewPlayers} />
										</div>
									</>
								) : (
									<EmptyMinimal
										icon={<Users className="h-5 w-5" />}
										title="Sin jugadores"
										desc="Añade jugadores para tener la plantilla completa."
										cta={{ href: "/jugadores", label: "Ir a jugadores" }}
									/>
								)}
							</CardContent>
						</Card>
					</section>
				</div>
			</div>
		</main>
	);
}

/* ----------------------------- Subcomponents ----------------------------- */

/**
 * ✅ More compact match rows:
 * - Slightly less vertical padding
 * - Smaller score pill
 * - Same tap target & readability
 */
function MatchListCompact({ matches }: { matches: MatchRow[] }) {
	return (
		<div className="space-y-3">
			{matches.map((m) => {
				const o = getOutcome(m);

				return (
					<Link
						key={m.id}
						href={`/partidos/${m.id}`}
						aria-label={`Ver partido vs ${m.opponent}`}
						className="
              group flex items-center justify-between gap-3
              rounded-2xl border bg-background/60
              px-3 py-2
              hover:bg-muted/25 hover:border-primary/25
              transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            "
					>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<StatusDot status={o.status} />
								<p className="text-[13px] font-semibold truncate group-hover:text-primary transition-colors">{m.opponent}</p>
							</div>
							<p className="text-[11px] text-muted-foreground mt-0.5">{formatEsDate(m.match_date)}</p>
						</div>

						<div className="flex items-center gap-2 shrink-0">
							<div className="rounded-xl bg-muted px-2 py-0.5 text-[13px] font-semibold tabular-nums">
								{m.home_score}
								<span className="mx-1 text-muted-foreground">–</span>
								{m.away_score}
							</div>
							<ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
						</div>
					</Link>
				);
			})}
		</div>
	);
}

function PlayerPhotoGridResponsive({ players }: { players: PlayerRow[] }) {
	return (
		<div
			className="
        grid gap-3
        grid-cols-4
        sm:grid-cols-5
        lg:grid-cols-7
        xl:grid-cols-8
        2xl:grid-cols-10
      "
		>
			{players.map((player) => (
				<Link
					key={player.id}
					href={`/jugadores/${player.id}`}
					aria-label={`Ver jugador ${player.name}`}
					className="
            group rounded-2xl border bg-background/60 overflow-hidden
            hover:bg-muted/25 hover:border-primary/25 hover:shadow-sm hover:-translate-y-0.5
            transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          "
				>
					<div className="relative aspect-[4/5] bg-muted/40 overflow-hidden">
						{player.photo_url ? (
							<img
								src={player.photo_url}
								alt={player.name}
								className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-[1.03] transition-transform"
								loading="lazy"
							/>
						) : (
							<div className="absolute inset-0 grid place-items-center">
								<span className="text-2xl font-extrabold text-muted-foreground tabular-nums">#{player.number}</span>
							</div>
						)}

						<div className="absolute top-2 right-2 rounded-xl bg-black/35 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm tabular-nums">
							#{player.number}
						</div>

						<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/95 via-background/20 to-transparent dark:from-black/70" />

						<div className="absolute inset-x-0 bottom-0 p-3">
							<p className="text-sm font-semibold leading-tight line-clamp-2">{player.name}</p>
							<p className="mt-1 text-[11px] text-muted-foreground tabular-nums">#{player.number}</p>
						</div>
					</div>
				</Link>
			))}
		</div>
	);
}

function EmptyMinimal({ icon, title, desc, cta }: { icon: React.ReactNode; title: string; desc: string; cta?: { href: string; label: string } }) {
	return (
		<div className="rounded-2xl border bg-background/60 p-6 text-center">
			<div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">{icon}</div>
			<p className="font-semibold">{title}</p>
			<p className="mt-1 text-sm text-muted-foreground">{desc}</p>
			{cta ? (
				<div className="mt-4">
					<Button asChild size="sm" className="rounded-xl">
						<Link href={cta.href}>{cta.label}</Link>
					</Button>
				</div>
			) : null}
		</div>
	);
}
