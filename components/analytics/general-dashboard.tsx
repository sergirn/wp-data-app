"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target, Shield, Activity } from "lucide-react";
import { MatchResultsChart } from "../match-results-chart";
import { buildGeneralDashboardAnalytics } from "@/lib/helpers/generalDashboardHelper";

interface GeneralDashboardProps {
	matches: any[];
	stats: any[];
	players: any[];
}

export function GeneralDashboard({ matches, stats, players }: GeneralDashboardProps) {
	const analytics = useMemo(() => {
		return buildGeneralDashboardAnalytics(matches, stats, players);
	}, [matches, stats, players]);

	if (!analytics) {
		return <div className="text-center py-10 text-sm text-muted-foreground">No hay datos disponibles para mostrar estadísticas.</div>;
	}

	const gd = analytics.goalDifference;
	const gdBadge = gd > 0 ? "bg-green-500 text-white" : gd < 0 ? "bg-red-500 text-white" : "bg-muted text-foreground";

	const MetricCard = ({
		title,
		icon,
		value,
		unit,
		subline,
		accent = "blue"
	}: {
		title: string;
		icon: React.ReactNode;
		value: string | number;
		unit?: string;
		subline?: string;
		accent?: "blue" | "green" | "orange" | "purple";
	}) => {
		const accentMap = {
			blue: "from-blue-500/15 to-cyan-500/10",
			green: "from-green-500/15 to-emerald-500/10",
			orange: "from-orange-500/15 to-amber-500/10",
			purple: "from-purple-500/15 to-fuchsia-500/10"
		}[accent];

		const ringMap = {
			blue: "ring-blue-500/15",
			green: "ring-green-500/15",
			orange: "ring-orange-500/15",
			purple: "ring-purple-500/15"
		}[accent];

		return (
			<div className={`hidden sm:block relative overflow-hidden rounded-xl border ring-1 ${ringMap}`}>
				<div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentMap}`} />
				<div className="relative p-4">
					<div className="text-sm font-medium flex items-center gap-2 text-foreground/90">
						<span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background/70 ring-1 ring-border">{icon}</span>
						<span className="truncate">{title}</span>
					</div>

					<div className="mt-3 flex items-end gap-1.5">
						<div className="text-3xl font-bold tracking-tight">{value}</div>
						{unit ? <div className="pb-1 text-sm font-medium text-muted-foreground">{unit}</div> : null}
					</div>
					{subline ? <p className="mt-1 text-xs text-muted-foreground">{subline}</p> : null}
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm text-muted-foreground truncate">
						Indicadores clave y tendencias del equipo · {analytics.totalMatches} partidos
					</p>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_2fr] lg:items-start">
				<div className="order-2 lg:order-1">
					<MatchResultsChart matches={matches || []} />
				</div>

				<div className="order-1 lg:order-2 space-y-7">
					<div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-2">
						<MetricCard
							title="Eficiencia de tiro"
							icon={<Target className="h-4 w-4 text-blue-600 dark:text-blue-300" />}
							value={analytics.shootingEfficiency}
							unit="%"
							subline={`${analytics.totalGoalsFor} goles / ${analytics.totalShots} tiros`}
							accent="blue"
						/>

						<MetricCard
							title="Superioridad"
							icon={<TrendingUp className="h-4 w-4 text-green-600 dark:text-green-300" />}
							value={analytics.superiorityEfficiency}
							unit="%"
							subline={`${analytics.goalsSuperiority} goles / ${analytics.shotsSuperiority} intentos`}
							accent="green"
						/>

						<MetricCard
							title="Inferioridad"
							icon={<TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-300" />}
							value={analytics.inferiorityEfficiency}
							unit="%"
							subline={`${analytics.savesInferiority} evitadas / ${analytics.savesInferiority + analytics.goalsAgainstInferiority} intentos`}
							accent="orange"
						/>

						<MetricCard
							title="Eficiencia porteros"
							icon={<Shield className="h-4 w-4 text-purple-600 dark:text-purple-300" />}
							value={analytics.goalkeeperEfficiency}
							unit="%"
							subline={`${analytics.totalSaves} paradas totales`}
							accent="purple"
						/>
					</div>

					<div className="overflow-hidden">
						<div className="pb-3">
							<div className="flex items-center gap-2 font-semibold">
								<Activity className="h-5 w-5 text-muted-foreground" />
								Medias por Partido
							</div>
						</div>

						<div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.avgGoalsFor}</div>
								<p className="text-xs text-muted-foreground">Goles a favor</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.avgGoalsAgainst}</div>
								<p className="text-xs text-muted-foreground">Goles en contra</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-foreground">{analytics.avgShots}</div>
								<p className="text-xs text-muted-foreground">Tiros</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.avgAssists}</div>
								<p className="text-xs text-muted-foreground">Asistencias</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.avgBlocks}</div>
								<p className="text-xs text-muted-foreground">Bloqueos</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.avgFouls}</div>
								<p className="text-xs text-muted-foreground">Faltas</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.avgRecoveries}</div>
								<p className="text-xs text-muted-foreground">Recuperaciones</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.avgTurnovers}</div>
								<p className="text-xs text-muted-foreground">Pérdidas</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.avgSaves}</div>
								<p className="text-xs text-muted-foreground">Paradas</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-red-600 dark:text-red-400">{analytics.avgExclusions}</div>
								<p className="text-xs text-muted-foreground">Exclusiones</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.avgGoalsSuperiority}</div>
								<p className="text-xs text-muted-foreground">Goles Sup.+</p>
							</div>

							<div className="rounded-lg border bg-card p-3 text-center">
								<div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.avgShotsSuperiority}</div>
								<p className="text-xs text-muted-foreground">Intentos Sup.+</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
