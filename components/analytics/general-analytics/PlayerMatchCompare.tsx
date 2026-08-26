"use client";

import { useMemo, useState } from "react";
import type { Match, MatchStats, Player } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlayerPickerModal } from "@/components/modals/PlayerPickerModal";
import { MatchPickerModal } from "@/components/modals/MatchPickerModal";
import { Switch } from "@/components/ui/switch";

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { Swords, PlusCircle, Shield, RefreshCcw, AlertTriangle, Hand, BarChart3, Table2, Trash2 } from "lucide-react";
import { ComparisonRow } from "../../comparisionRow";
import { useLocale, useTranslations } from "next-intl";

const safe = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const calcGolesRecibidosPortero = (st?: any) => {
	return (
		safe(st?.portero_goles_boya_parada) +
		safe(st?.portero_goles_dir_mas_5m) +
		safe(st?.portero_goles_contraataque) +
		safe(st?.portero_goles_penalti) +
		safe(st?.portero_goles_lanzamiento) +
		safe(st?.portero_goles_extremo) +
		safe(st?.portero_gol_palo) +
		safe(st?.portero_goles_hombre_menos)
	);
};

type CompareCell = {
	matchId: number;
	jornadaLabel: string;
	opponent: string;
	fullDate: string;

	goles: number;
	tiros: number;
	eficienciaTiro: number;
	asistencias: number;

	golesHombreMas: number;
	fallosHombreMas: number;
	eficienciaHombreMas: number;

	bloqueos: number;
	recuperaciones: number;
	perdidas: number;
	balancePosesion: number;

	exclusiones: number;
	penaltis: number;

	paradas: number;
	golesRecibidos: number;
	porcentajeParadas: number;

	paradasHombreMenos: number;
	golesHombreMenos: number;
	eficienciaInferioridad: number;

	paradasRecuperacion: number;
};

type Props = {
	players: Player[];
	matches: Match[];
	stats: MatchStats[];
	defaultPlayerId?: number;
	maxSelections?: number;
};

type ViewMode = "table" | "chart";

export function PlayerMatchCompare({ players, matches, stats, defaultPlayerId, maxSelections = 4 }: Props) {
	const t = useTranslations("PlayerMatchCompare");
	const locale = useLocale();
	const [playerId, setPlayerId] = useState<number | null>(defaultPlayerId ?? null);
	const [selectedMatchIds, setSelectedMatchIds] = useState<number[]>([]);
	const [playerModalOpen, setPlayerModalOpen] = useState(false);
	const [matchModalOpen, setMatchModalOpen] = useState(false);

	const [view, setView] = useState<ViewMode>("table");

	const player = useMemo(() => players.find((p) => Number(p.id) === Number(playerId)) ?? null, [players, playerId]);

	const isGoalkeeper = player?.is_goalkeeper === true;

	const sortedMatches = useMemo(() => {
		return [...(matches ?? [])]
			.filter((m: any) => m != null)
			.sort((a: any, b: any) => {
				const aj = a?.jornada ?? 9999;
				const bj = b?.jornada ?? 9999;
				if (aj !== bj) return aj - bj;
				return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
			});
	}, [matches]);

	const statsByMatchId = useMemo(() => {
		if (!playerId) return new Map<number, MatchStats>();
		const map = new Map<number, MatchStats>();
		(stats ?? []).filter((s: any) => Number(s.player_id) === Number(playerId)).forEach((s: any) => map.set(Number(s.match_id), s));
		return map;
	}, [stats, playerId]);

	const comparisonData: CompareCell[] = useMemo(() => {
		if (!playerId) return [];

		const selected = selectedMatchIds
			.map((mid) => {
				const match = sortedMatches.find((m: any) => Number(m.id) === Number(mid));
				if (!match) return null;

				const st: any = statsByMatchId.get(Number(mid)) ?? null;

				const goles = safe(st?.goles_totales);
				const tiros = safe(st?.tiros_totales);
				const eficienciaTiro = tiros > 0 ? Math.round((goles / tiros) * 100) : 0;
				const asistencias = safe(st?.acciones_asistencias);

				const golesHombreMas = safe(st?.goles_hombre_mas);
				const fallosHombreMas = safe(st?.tiros_hombre_mas) + safe(st?.tiros_penalti_fallado);
				const eficienciaHombreMas =
					golesHombreMas + fallosHombreMas > 0 ? Math.round((golesHombreMas / (golesHombreMas + fallosHombreMas)) * 100) : 0;

				const bloqueos = safe(st?.acciones_bloqueo);
				const recuperaciones = safe(st?.acciones_recuperacion) + safe(st?.acciones_rebote);
				const perdidas = safe(st?.acciones_perdida_poco) + safe(st?.pase_boya_fallado);
				const balancePosesion = recuperaciones - perdidas;

				const exclusiones = safe(st?.faltas_exp_20_1c1) + safe(st?.faltas_exp_20_boya) + safe(st?.faltas_exp_simple);

				const penaltis = safe(st?.faltas_penalti);

				const paradas = safe(st?.portero_paradas_totales);
				const golesRecibidos = calcGolesRecibidosPortero(st);
				const porcentajeParadas = paradas + golesRecibidos > 0 ? Math.round((paradas / (paradas + golesRecibidos)) * 100) : 0;

				const paradasHombreMenos = safe(st?.portero_paradas_hombre_menos);
				const golesHombreMenos = safe(st?.portero_goles_hombre_menos);
				const eficienciaInferioridad =
					paradasHombreMenos + golesHombreMenos > 0 ? Math.round((paradasHombreMenos / (paradasHombreMenos + golesHombreMenos)) * 100) : 0;

				const paradasRecuperacion = safe(st?.portero_paradas_parada_recup);

				const jornadaNum = match.jornada ?? "—";
				const jornadaLabel = `J${jornadaNum}`;
				const fullDate = new Date(match.match_date).toLocaleDateString(locale);

				return {
					matchId: Number(match.id),
					jornadaLabel,
					opponent: match.opponent,
					fullDate,

					goles,
					tiros,
					eficienciaTiro,
					asistencias,

					golesHombreMas,
					fallosHombreMas,
					eficienciaHombreMas,

					bloqueos,
					recuperaciones,
					perdidas,
					balancePosesion,

					exclusiones,
					penaltis,

					paradas,
					golesRecibidos,
					porcentajeParadas,

					paradasHombreMenos,
					golesHombreMenos,
					eficienciaInferioridad,

					paradasRecuperacion
				} as CompareCell;
			})
			.filter(Boolean) as CompareCell[];

		return selected;
	}, [playerId, selectedMatchIds, sortedMatches, statsByMatchId, locale]);

	const removeMatch = (id: number) => setSelectedMatchIds((prev) => prev.filter((x) => x !== id));
	const clearMatches = () => setSelectedMatchIds([]);

	const hasData = comparisonData.length > 0;

	const chartData = useMemo(() => {
		return comparisonData.map((m) => ({
			jornada: m.jornadaLabel,
			rival: m.opponent,
			fullDate: m.fullDate,

			// comunes
			goles: m.goles,
			asistencias: m.asistencias,
			recuperaciones: m.recuperaciones,
			perdidas: m.perdidas,
			balancePosesion: m.balancePosesion,
			exclusiones: m.exclusiones,
			penaltis: m.penaltis,
			bloqueos: m.bloqueos,

			// eficiencias (líneas)
			eficienciaTiro: m.eficienciaTiro,
			eficienciaHombreMas: m.eficienciaHombreMas,

			// portero
			paradas: m.paradas,
			golesRecibidos: m.golesRecibidos,
			porcentajeParadas: m.porcentajeParadas,
			paradasHombreMenos: m.paradasHombreMenos,
			golesHombreMenos: m.golesHombreMenos,
			eficienciaInferioridad: m.eficienciaInferioridad,
			paradasRecuperacion: m.paradasRecuperacion
		}));
	}, [comparisonData]);

	const chartConfig = useMemo(() => {
		if (isGoalkeeper) {
			return {
				paradas: { label: t("saves"), color: "hsl(142, 71%, 45%)" },
				golesRecibidos: { label: t("goalsConceded"), color: "hsl(0, 84%, 60%)" },
				porcentajeParadas: { label: t("savePercentage"), color: "hsl(217, 91%, 60%)" },

				paradasHombreMenos: { label: t("savesDisadvantageShort"), color: "hsl(142, 71%, 35%)" },
				golesHombreMenos: { label: t("goalsDisadvantageShort"), color: "hsl(0, 84%, 45%)" },
				eficienciaInferioridad: { label: t("disadvantagePercentage"), color: "hsl(262, 85%, 65%)" },

				paradasRecuperacion: { label: t("saveRecoveryShort"), color: "hsl(38, 92%, 55%)" },
				recuperaciones: { label: t("recoveries"), color: "hsl(160, 84%, 39%)" },
				perdidas: { label: t("losses"), color: "hsl(28, 90%, 55%)" },

				exclusiones: { label: t("exclusions"), color: "hsl(0, 80%, 55%)" },
				penaltis: { label: t("penalties"), color: "hsl(262, 85%, 65%)" }
			} as const;
		}

		return {
			goles: { label: t("goals"), color: "hsl(142, 71%, 45%)" },
			asistencias: { label: t("assists"), color: "hsl(217, 91%, 60%)" },
			recuperaciones: { label: t("recoveries"), color: "hsl(160, 84%, 39%)" },
			perdidas: { label: t("losses"), color: "hsl(28, 90%, 55%)" },
			exclusiones: { label: t("exclusions"), color: "hsl(0, 80%, 55%)" },
			penaltis: { label: t("penalties"), color: "hsl(262, 85%, 65%)" },

			eficienciaTiro: { label: t("shootingPercentage"), color: "hsl(38, 92%, 55%)" },
			eficienciaHombreMas: { label: t("powerPlayPercentage"), color: "hsl(262, 85%, 65%)" }
		} as const;
	}, [isGoalkeeper, t]);

	return (
		<>
			<div className="space-y-6">
				{/* HEADER */}
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full">
						<Button type="button" variant="outline" onClick={() => setPlayerModalOpen(true)} className="justify-start sm:w-[260px]">
						{player ? `#${player.number} · ${player.name}` : t("selectPlayer")}
						</Button>

						<Button type="button" variant="outline" onClick={() => setMatchModalOpen(true)} disabled={!playerId}>
						{t("selectRounds", { selected: selectedMatchIds.length, max: maxSelections })}
						</Button>

						<Button type="button" variant="outline" onClick={clearMatches} disabled={!selectedMatchIds.length} className="gap-2">
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>

					{/* ✅ A la derecha del todo */}
					<div className="flex items-center gap-2 sm:ml-auto sm:flex-nowrap">
						<div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
							<Table2 className="h-4 w-4 text-muted-foreground" />
							<Switch checked={view === "chart"} onCheckedChange={(v) => setView(v ? "chart" : "table")} aria-label={t("switchView")} />
							<BarChart3 className="h-4 w-4 text-muted-foreground" />
						</div>
					</div>
				</div>

				{/* EMPTY / CTA */}
				{!hasData && (
					<Card
						onClick={() => {
							if (!playerId) setPlayerModalOpen(true);
							else setMatchModalOpen(true);
						}}
						className={cn(
							"border-dashed cursor-pointer hover:border-primary hover:bg-muted/40 transition-all group",
							!playerId && "opacity-95"
						)}
					>
						<CardContent className="py-20 text-center space-y-4">
							<div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl group-hover:scale-105 transition">
								＋
							</div>
						<h3 className="text-lg font-semibold">{!playerId ? t("selectPlayer") : t("addRounds")}</h3>
							<p className="text-muted-foreground max-w-md mx-auto text-sm">
							{!playerId ? t("choosePlayerFirst") : t("chooseRounds")}
							</p>
						</CardContent>
					</Card>
				)}

				{/* TAGS */}
				{hasData && (
					<div className="flex flex-wrap gap-2 items-center">
						<Badge variant="secondary">
						{isGoalkeeper ? t("goalkeeper") : t("player")}: {player ? `#${player.number}` : "—"}
						</Badge>

						{comparisonData.map((m) => (
							<div key={m.matchId} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
								{m.jornadaLabel} · {m.opponent}
								<button
									onClick={() => removeMatch(m.matchId)}
									className="ml-1 h-4 w-4 rounded-full text-xs hover:bg-destructive hover:text-white"
								>
									×
								</button>
							</div>
						))}
					</div>
				)}

				{/* TABLE / CHART */}
				{hasData && (
					<Card>
						<CardContent className="overflow-x-auto">
							{view === "table" ? (
								<Table>
									<TableHeader>
										<TableRow>
								<TableHead>{t("statistic")}</TableHead>
											{comparisonData.map((m) => (
												<TableHead key={m.matchId} className="text-center">
													<div className="font-semibold">{m.jornadaLabel}</div>
													<div className="text-xs text-muted-foreground truncate max-w-[160px] mx-auto">{m.opponent}</div>
												</TableHead>
											))}
										</TableRow>
									</TableHeader>

									<TableBody>
										{isGoalkeeper ? (
											<>
								<Section title={t("goal")} icon={<Hand className="h-4 w-4" />}>
									<ComparisonRow label={t("saves")} field="paradas" data={comparisonData} />
									<ComparisonRow label={t("goalsConceded")} field="golesRecibidos" inverse data={comparisonData} />
									<ComparisonRow label={t("savePercentage")} field="porcentajeParadas" isPercentage data={comparisonData} />
												</Section>

								<Section title={t("disadvantage")} icon={<Shield className="h-4 w-4" />}>
									<ComparisonRow label={t("savesDisadvantage")} field="paradasHombreMenos" data={comparisonData} />
													<ComparisonRow
										label={t("goalsDisadvantage")}
														field="golesHombreMenos"
														inverse
														data={comparisonData}
													/>
													<ComparisonRow
										label={t("disadvantageEfficiency")}
														field="eficienciaInferioridad"
														isPercentage
														data={comparisonData}
													/>
												</Section>

								<Section title={t("actions")} icon={<RefreshCcw className="h-4 w-4" />}>
									<ComparisonRow label={t("saveRecovery")} field="paradasRecuperacion" data={comparisonData} />
									<ComparisonRow label={t("recoveriesRebounds")} field="recuperaciones" data={comparisonData} />
													<ComparisonRow
										label={t("lossesBuoyPass")}
														field="perdidas"
														inverse
														data={comparisonData}
													/>
									<ComparisonRow label={t("possessionBalance")} field="balancePosesion" data={comparisonData} />
												</Section>

								<Section title={t("discipline")} icon={<AlertTriangle className="h-4 w-4" />}>
													<ComparisonRow
										label={t("exclusionsSimple")}
														field="exclusiones"
														inverse
														data={comparisonData}
													/>
									<ComparisonRow label={t("penalties")} field="penaltis" inverse data={comparisonData} />
												</Section>
											</>
										) : (
											<>
								<Section title={t("attack")} icon={<Swords className="h-4 w-4" />}>
									<ComparisonRow label={t("goals")} field="goles" data={comparisonData} />
									<ComparisonRow label={t("shots")} field="tiros" data={comparisonData} />
													<ComparisonRow
										label={t("shootingEfficiency")}
														field="eficienciaTiro"
														isPercentage
														data={comparisonData}
													/>
									<ComparisonRow label={t("assists")} field="asistencias" data={comparisonData} />
												</Section>

								<Section title={t("powerPlay")} icon={<PlusCircle className="h-4 w-4" />}>
													<ComparisonRow
										label={t("powerPlayGoalsMisses")}
														field="golesHombreMas"
														extraField="fallosHombreMas"
														data={comparisonData}
													/>
													<ComparisonRow
										label={t("powerPlayEfficiency")}
														field="eficienciaHombreMas"
														isPercentage
														data={comparisonData}
													/>
												</Section>

								<Section title={t("defense")} icon={<Shield className="h-4 w-4" />}>
									<ComparisonRow label={t("blocks")} field="bloqueos" data={comparisonData} />
												</Section>

								<Section title={t("possessionActions")} icon={<RefreshCcw className="h-4 w-4" />}>
									<ComparisonRow label={t("recoveriesRebounds")} field="recuperaciones" data={comparisonData} />
													<ComparisonRow
										label={t("lossesBuoyPass")}
														field="perdidas"
														inverse
														data={comparisonData}
													/>
									<ComparisonRow label={t("possessionBalance")} field="balancePosesion" data={comparisonData} />
												</Section>

								<Section title={t("discipline")} icon={<AlertTriangle className="h-4 w-4" />}>
													<ComparisonRow
										label={t("exclusionsSimple")}
														field="exclusiones"
														inverse
														data={comparisonData}
													/>
									<ComparisonRow label={t("penalties")} field="penaltis" inverse data={comparisonData} />
												</Section>
											</>
										)}
									</TableBody>
								</Table>
							) : (
								<ChartContainer config={chartConfig as any} className="w-full h-[420px]">
									<ResponsiveContainer width="100%" height="100%">
										<ComposedChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
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

											{/* ✅ Eje izquierdo: valores */}
											<YAxis fontSize={12} width={34} tickMargin={6} axisLine={false} tickLine={false} />

											{/* ✅ Eje derecho: porcentajes */}
											<YAxis
												yAxisId="right"
												orientation="right"
												fontSize={12}
												width={40}
												tickMargin={6}
												axisLine={false}
												tickLine={false}
											/>

											<ChartTooltip
												content={
													<ChartTooltipContent
														labelFormatter={(label, payload) => {
															const p = payload?.[0]?.payload as any;
															if (!p) return String(label);
											return t("tooltip", { round: String(label), opponent: p.rival, date: p.fullDate });
														}}
													/>
												}
											/>

											<Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 12 }} />

											{/* ====== BARRAS ====== */}
											{isGoalkeeper ? (
												<>
									<Bar dataKey="paradas" name={t("saves")} fill="var(--color-paradas)" radius={[4, 4, 0, 0]} />
													<Bar
														dataKey="golesRecibidos"
										name={t("goalsConceded")}
														fill="var(--color-golesRecibidos)"
														radius={[4, 4, 0, 0]}
													/>

													<Bar
														dataKey="paradasHombreMenos"
										name={t("savesDisadvantageShort")}
														fill="var(--color-paradasHombreMenos)"
														radius={[4, 4, 0, 0]}
													/>
													<Bar
														dataKey="golesHombreMenos"
										name={t("goalsDisadvantageShort")}
														fill="var(--color-golesHombreMenos)"
														radius={[4, 4, 0, 0]}
													/>

													<Bar
														dataKey="paradasRecuperacion"
										name={t("saveRecoveryShort")}
														fill="var(--color-paradasRecuperacion)"
														radius={[4, 4, 0, 0]}
													/>
													<Bar
														dataKey="recuperaciones"
										name={t("recoveries")}
														fill="var(--color-recuperaciones)"
														radius={[4, 4, 0, 0]}
													/>
									<Bar dataKey="perdidas" name={t("losses")} fill="var(--color-perdidas)" radius={[4, 4, 0, 0]} />

													<Bar
														dataKey="exclusiones"
										name={t("exclusions")}
														fill="var(--color-exclusiones)"
														radius={[4, 4, 0, 0]}
													/>
									<Bar dataKey="penaltis" name={t("penalties")} fill="var(--color-penaltis)" radius={[4, 4, 0, 0]} />

													{/* ====== LÍNEAS (% en eje derecho) ====== */}
													<Line
														yAxisId="right"
														type="monotone"
														dataKey="porcentajeParadas"
										name={t("savePercentage")}
														stroke="var(--color-porcentajeParadas)"
														strokeWidth={4}
														dot={false}
														activeDot={{ r: 4 }}
													/>
													<Line
														yAxisId="right"
														type="monotone"
														dataKey="eficienciaInferioridad"
										name={t("disadvantagePercentage")}
														stroke="var(--color-eficienciaInferioridad)"
														strokeWidth={4}
														dot={false}
														activeDot={{ r: 4 }}
													/>
												</>
											) : (
												<>
									<Bar dataKey="goles" name={t("goals")} fill="var(--color-goles)" radius={[4, 4, 0, 0]} />
													<Bar
														dataKey="asistencias"
										name={t("assists")}
														fill="var(--color-asistencias)"
														radius={[4, 4, 0, 0]}
													/>
													<Bar
														dataKey="recuperaciones"
										name={t("recoveries")}
														fill="var(--color-recuperaciones)"
														radius={[4, 4, 0, 0]}
													/>
									<Bar dataKey="perdidas" name={t("losses")} fill="var(--color-perdidas)" radius={[4, 4, 0, 0]} />
													<Bar
														dataKey="exclusiones"
										name={t("exclusions")}
														fill="var(--color-exclusiones)"
														radius={[4, 4, 0, 0]}
													/>
									<Bar dataKey="penaltis" name={t("penalties")} fill="var(--color-penaltis)" radius={[4, 4, 0, 0]} />

													<Line
														yAxisId="right"
														type="monotone"
														dataKey="eficienciaTiro"
										name={t("shootingPercentage")}
														stroke="var(--color-eficienciaTiro)"
														strokeWidth={4}
														dot={false}
														activeDot={{ r: 4 }}
													/>
													<Line
														yAxisId="right"
														type="monotone"
														dataKey="eficienciaHombreMas"
										name={t("powerPlayPercentage")}
														stroke="var(--color-eficienciaHombreMas)"
														strokeWidth={4}
														dot={false}
														activeDot={{ r: 4 }}
													/>
												</>
											)}
										</ComposedChart>
									</ResponsiveContainer>
								</ChartContainer>
							)}
						</CardContent>
					</Card>
				)}
			</div>

			{/* MODAL jugador */}
			<PlayerPickerModal
				open={playerModalOpen}
				title={isGoalkeeper ? t("selectGoalkeeper") : t("selectPlayer")}
				players={players}
				initialSelectedId={playerId}
				onClose={() => setPlayerModalOpen(false)}
				onConfirm={(id) => {
					setPlayerId(id);
					setSelectedMatchIds([]);
				}}
			/>

			{/* MODAL jornadas */}
			<MatchPickerModal
				open={matchModalOpen}
				title={t("selectRoundsTitle")}
				description={t("selectRoundsDescription")}
				matches={sortedMatches}
				maxSelections={maxSelections}
				initialSelectedIds={selectedMatchIds}
				onClose={() => setMatchModalOpen(false)}
				onConfirm={(ids) => setSelectedMatchIds(ids)}
			/>
		</>
	);
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
	return (
		<>
			<TableRow>
				<TableHead colSpan={100} className="bg-muted/100">
					<div className="flex items-center gap-2 font-semibold">
						{icon}
						{title}
					</div>
				</TableHead>
			</TableRow>
			{children}
		</>
	);
}
