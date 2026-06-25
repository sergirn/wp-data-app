"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useClub } from "@/lib/club-context";
import { useProfile } from "@/lib/profile-context";
import { LandingPage } from "@/components/landing-page";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { AlertCircle, ArrowUpRight, Calendar, ChevronDown, ChevronUp, PlusCircle, Target, TrendingUp, Trophy, Users } from "lucide-react";

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

type Outcome = { status: "W" | "L" | "D"; label: string };

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

function getOutcome(match: MatchRow): Outcome {
	const isTied = match.home_score === match.away_score;
	const hasPenalties = isTied && match.penalty_home_score !== null && match.penalty_away_score !== null;

	if (hasPenalties) {
		const win = (match.penalty_home_score ?? 0) > (match.penalty_away_score ?? 0);
		return { status: win ? "W" : "L", label: win ? "Victoria (Pen.)" : "Derrota (Pen.)" };
	}

	if (match.home_score > match.away_score) return { status: "W", label: "Victoria" };
	if (match.home_score < match.away_score) return { status: "L", label: "Derrota" };
	return { status: "D", label: "Empate" };
}

const FORM_STYLES: Record<Outcome["status"], { letter: string; cls: string }> = {
	W: { letter: "G", cls: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400" },
	L: { letter: "P", cls: "bg-red-500/10 text-red-600 ring-red-500/25 dark:text-red-400" },
	D: { letter: "E", cls: "bg-muted text-muted-foreground ring-border" }
};

function FormBadge({ status }: { status: Outcome["status"] }) {
	const s = FORM_STYLES[status];
	return (
		<span
			className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ring-1 ${s.cls}`}
			aria-label={status === "W" ? "Victoria" : status === "L" ? "Derrota" : "Empate"}
		>
			{s.letter}
		</span>
	);
}

function KpiCard({
	icon,
	label,
	value,
	suffix,
	footer,
	delay = 0
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	suffix?: string;
	footer?: React.ReactNode;
	delay?: number;
}) {
	return (
		<div
			className="animate-fade-up group rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md"
			style={{ animationDelay: `${delay}ms` }}
		>
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
				<span className="text-muted-foreground/50 transition-colors group-hover:text-primary">{icon}</span>
			</div>
			<div className="mt-4 flex items-baseline gap-1">
				<span className="text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
				{suffix ? <span className="text-base font-medium text-muted-foreground">{suffix}</span> : null}
			</div>
			{footer ? <div className="mt-4">{footer}</div> : null}
		</div>
	);
}

function WinRateRing({ value }: { value: number }) {
	const radius = 26;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

	return (
		<div className="relative grid h-[120px] w-[120px] place-items-center">
			<svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
				<circle cx="32" cy="32" r={radius} fill="none" stroke="var(--muted)" strokeWidth="6" />
				<circle
					cx="32"
					cy="32"
					r={radius}
					fill="none"
					stroke="var(--primary)"
					strokeWidth="6"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
				/>
			</svg>
			<div className="absolute inset-0 grid place-items-center">
				<span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
				<span className="-mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">% victorias</span>
			</div>
		</div>
	);
}

function LoadingMinimal() {
	return (
		<main className="min-h-screen">
			<div className="container mx-auto px-4 py-8 sm:py-10">
				<div className="space-y-8">
					<div className="flex items-center gap-4">
						<div className="h-14 w-14 rounded-2xl bg-muted animate-pulse" />
						<div className="space-y-2">
							<div className="h-3 w-24 rounded bg-muted animate-pulse" />
							<div className="h-7 w-56 rounded bg-muted animate-pulse" />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
						))}
					</div>

					<div className="grid gap-6 lg:grid-cols-3">
						<div className="h-[360px] rounded-2xl bg-muted animate-pulse lg:col-span-2" />
						<div className="h-[360px] rounded-2xl bg-muted animate-pulse" />
					</div>

					<div className="h-[260px] rounded-2xl bg-muted animate-pulse" />
				</div>
			</div>
		</main>
	);
}

export default function HomePage() {
	const { currentClub } = useClub();
	const { profile, loading: profileLoading } = useProfile();

	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [allMatches, setAllMatches] = useState<MatchRow[]>([]);
	const [players, setPlayers] = useState<PlayerRow[]>([]);
	const [loading, setLoading] = useState(true);

	const [connectionError, setConnectionError] = useState(false);
	const [tablesNotFound, setTablesNotFound] = useState(false);

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

				const [
					{ data: matchesPreviewData, error: matchesPreviewError },
					{ data: allMatchesData, error: allMatchesError },
					{ data: playersData, error: playersError }
				] = await Promise.all([
					supabase.from("matches").select("*").eq("club_id", currentClub.id).order("match_date", { ascending: false }).limit(6),
					supabase.from("matches").select("*").eq("club_id", currentClub.id).order("match_date", { ascending: false }),
					supabase.from("players").select("*").eq("club_id", currentClub.id).order("number")
				]);

				if (matchesPreviewError) {
					if (matchesPreviewError.message?.includes("Could not find the table")) setTablesNotFound(true);
					else throw matchesPreviewError;
				} else {
					setMatches(((matchesPreviewData || []) as MatchRow[]) ?? []);
				}

				if (allMatchesError) {
					if (allMatchesError.message?.includes("Could not find the table")) setTablesNotFound(true);
					else throw allMatchesError;
				} else {
					setAllMatches(((allMatchesData || []) as MatchRow[]) ?? []);
				}

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
		const totalMatches = allMatches.length;

		const wins = allMatches.filter((m) => getOutcome(m).status === "W").length;
		const draws = allMatches.filter((m) => getOutcome(m).status === "D").length;
		const losses = totalMatches - wins - draws;

		const winRate = totalMatches ? Math.round((wins / totalMatches) * 100) : 0;

		const previewMatches = matches.slice(0, 4);
		const recentForm = matches.slice(0, 5).map((m) => getOutcome(m).status);

		const previewPlayers = players.slice(0, 22);

		const mobileFirst = players.slice(0, 8);
		const mobileRest = players.slice(8);

		const primaryCta = canEdit
			? { href: "/nuevo-partido", label: "Nuevo partido", icon: <PlusCircle className="mr-2 h-4 w-4" /> }
			: { href: "/partidos", label: "Ver partidos", icon: <Calendar className="mr-2 h-4 w-4" /> };

		return {
			totalMatches,
			wins,
			draws,
			losses,
			winRate,
			previewMatches,
			recentForm,
			previewPlayers,
			mobileFirst,
			mobileRest,
			primaryCta
		};
	}, [allMatches, matches, players, canEdit]);

	useEffect(() => {
		setShowAllPlayersMobile(false);
	}, [currentClub?.id]);

	if (!profile && !profileLoading) return <LandingPage />;
	if (profileLoading || loading) return <LoadingMinimal />;

	return (
		<main className="min-h-screen">
			<div className="container mx-auto px-4 py-6 sm:py-10">
				<div className="space-y-8">
					{/* Header */}
					<header className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-4">
							<div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-card shadow-sm">
								{currentClub?.logo_url ? (
									<img src={currentClub.logo_url || "/placeholder.svg"} alt="" className="h-full w-full object-contain p-1.5" />
								) : (
									<Trophy className="h-6 w-6 text-muted-foreground" />
								)}
							</div>
							<div className="min-w-0">
								<p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Panel del club</p>
								<h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl text-balance">
									{currentClub?.name || "Mi Club"}
								</h1>
							</div>
						</div>

						<Button asChild size="lg" className="rounded-xl shadow-sm">
							<Link href={derived.primaryCta.href}>
								{derived.primaryCta.icon}
								{derived.primaryCta.label}
							</Link>
						</Button>
					</header>

					{tablesNotFound && (
						<Alert variant="destructive" className="rounded-2xl">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Base de datos no inicializada</AlertTitle>
							<AlertDescription className="mt-2 space-y-3">
								<p>Las tablas aún no se han creado. Para inicializar:</p>
								<ol className="ml-2 list-inside list-decimal space-y-2">
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

					{/* KPIs */}
					<section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumen del club">
						<KpiCard
							icon={<Trophy className="h-4 w-4" />}
							label="Partidos"
							value={derived.totalMatches}
							delay={0}
						/>
						<KpiCard
							icon={<TrendingUp className="h-4 w-4" />}
							label="Victorias"
							value={derived.wins}
							delay={60}
							footer={
								<div className="flex items-center gap-3 text-[11px] text-muted-foreground">
									<span className="tabular-nums">{derived.draws} E</span>
									<span className="h-3 w-px bg-border" />
									<span className="tabular-nums">{derived.losses} P</span>
								</div>
							}
						/>
						<KpiCard
							icon={<Target className="h-4 w-4" />}
							label="Rendimiento"
							value={derived.winRate}
							suffix="%"
							delay={120}
							footer={
								<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary transition-all duration-700"
										style={{ width: `${derived.winRate}%` }}
									/>
								</div>
							}
						/>
						<KpiCard icon={<Users className="h-4 w-4" />} label="Jugadores" value={players.length} delay={180} />
					</section>

					{/* Matches + Form */}
					<section className="grid gap-6 lg:grid-cols-3">
						<div className="animate-fade-up lg:col-span-2" style={{ animationDelay: "220ms" }}>
							<div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
								<div className="mb-4 flex items-center justify-between gap-3">
									<div>
										<h2 className="text-base font-semibold tracking-tight">Últimos partidos</h2>
										<p className="text-sm text-muted-foreground">Resultados recientes</p>
									</div>
									<Button asChild variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:text-foreground">
										<Link href="/partidos">
											Ver todos <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
										</Link>
									</Button>
								</div>

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
						</div>

						<div className="animate-fade-up" style={{ animationDelay: "280ms" }}>
							<div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
								<h2 className="text-base font-semibold tracking-tight">Forma</h2>
								<p className="text-sm text-muted-foreground">Rendimiento global</p>

								<div className="mt-4 flex items-center justify-center">
									<WinRateRing value={derived.winRate} />
								</div>

								<div className="mt-6">
									<p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
										Últimos resultados
									</p>
									{derived.recentForm.length > 0 ? (
										<div className="flex items-center gap-1.5">
											{derived.recentForm.map((s, i) => (
												<FormBadge key={i} status={s} />
											))}
										</div>
									) : (
										<p className="text-sm text-muted-foreground">Sin datos todavía</p>
									)}
								</div>
							</div>
						</div>
					</section>

					{/* Squad */}
					<section className="animate-fade-up" style={{ animationDelay: "340ms" }}>
						<div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
							<div className="mb-5 flex items-center justify-between gap-3">
								<div className="min-w-0">
									<h2 className="text-base font-semibold tracking-tight">Plantilla</h2>
									<p className="truncate text-sm text-muted-foreground">Vista rápida de jugadores</p>
								</div>

								<Button asChild variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:text-foreground">
									<Link href="/jugadores">
										Ver todos <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
									</Link>
								</Button>
							</div>

							{players.length > 0 ? (
								<>
									<div className="space-y-3 sm:hidden">
										<PlayerPhotoGridResponsive players={derived.mobileFirst} />

										{derived.mobileRest.length > 0 && (
											<>
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
													className="w-full rounded-xl"
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
						</div>
					</section>
				</div>

				{/* Footer sponsors */}
				<div className="mt-10 flex flex-col items-center gap-2 text-center">
					<p className="text-xs text-muted-foreground">
						POWERED BY <span className="font-medium">TFT</span> &amp; <span className="font-medium">BWMF</span>
					</p>

					<div className="flex items-center gap-4 opacity-70">
						<Image
							src="/images/logo-sponsor/TFT_LOGO.webp"
							alt="TFT"
							width={30}
							height={18}
							className="h-[60px] w-auto dark:invert dark:brightness-0 dark:contrast-200"
						/>

						<Image src="/images/logo-sponsor/bwmf.svg" alt="BWMF" width={86} height={38} className="h-[40px] w-auto" />
					</div>
				</div>
			</div>
		</main>
	);
}

function MatchListCompact({ matches }: { matches: MatchRow[] }) {
	return (
		<div className="flex flex-col divide-y divide-border/70">
			{matches.map((m) => {
				const o = getOutcome(m);

				return (
					<Link
						key={m.id}
						href={`/partidos/${m.id}`}
						aria-label={`Ver partido vs ${m.opponent}`}
						className="group flex items-center justify-between gap-3 py-3 transition-colors first:pt-0 last:pb-0 focus-visible:outline-none"
					>
						<div className="flex min-w-0 items-center gap-3">
							<FormBadge status={o.status} />
							<div className="min-w-0">
								<p className="truncate text-sm font-medium transition-colors group-hover:text-primary">{m.opponent}</p>
								<p className="mt-0.5 text-xs text-muted-foreground">{formatEsDate(m.match_date)}</p>
							</div>
						</div>

						<div className="flex shrink-0 items-center gap-3">
							<div className="rounded-lg border bg-background px-2.5 py-1 text-sm font-semibold tabular-nums">
								{m.home_score}
								<span className="mx-1 text-muted-foreground">–</span>
								{m.away_score}
							</div>
							<ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
						</div>
					</Link>
				);
			})}
		</div>
	);
}

function PlayerPhotoGridResponsive({ players }: { players: PlayerRow[] }) {
	return (
		<div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9">
			{players.map((player) => (
				<Link
					key={player.id}
					href={`/jugadores/${player.id}`}
					aria-label={`Ver jugador ${player.name}`}
					className="group overflow-hidden rounded-xl border bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
				>
					<div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
						{player.photo_url ? (
							<img
								src={player.photo_url || "/placeholder.svg"}
								alt={player.name}
								className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
								loading="lazy"
							/>
						) : (
							<div className="absolute inset-0 grid place-items-center">
								<span className="text-2xl font-bold tabular-nums text-muted-foreground">#{player.number}</span>
							</div>
						)}

						<div className="absolute right-2 top-2 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90 backdrop-blur-sm">
							#{player.number}
						</div>

						<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/95 via-background/60 to-transparent dark:from-black/80" />

						<div className="absolute inset-x-0 bottom-0 p-2.5">
							<p className="line-clamp-2 text-xs font-semibold leading-tight">{player.name}</p>
						</div>
					</div>
				</Link>
			))}
		</div>
	);
}

function EmptyMinimal({
	icon,
	title,
	desc,
	cta
}: {
	icon: React.ReactNode;
	title: string;
	desc: string;
	cta?: { href: string; label: string };
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center">
			<div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground">{icon}</div>
			<p className="font-medium">{title}</p>
			<p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">{desc}</p>
			{cta ? (
				<div className="mt-4">
					<Button asChild size="sm" className="rounded-lg">
						<Link href={cta.href}>{cta.label}</Link>
					</Button>
				</div>
			) : null}
		</div>
	);
}
