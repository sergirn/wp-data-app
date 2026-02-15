"use client";

import React, { useMemo } from "react";

import { MatchSuperiorityChart } from "@/components/match-components/match-superiority-chart";
import { MatchInferiorityChart } from "@/components/match-components/match-inferiority-chart";
import { MatchBlocksChart } from "@/components/match-blocks-chart";
import { MatchPossessionChart } from "@/components/match-components/perd_rec_pos-chart_team";
import { MatchGoalkeepersPieChart } from "@/components/match-components/GoalkeeperMatch-chart";
import { ShotMistakesDonutChartMatch } from "@/components/match-components/ShotMistakesDonutChartMatch";
import { GoalkeeperShotsGoalChartSimple } from "../analytics-goalkeeper/evolution-component/GoalkeepersShotsEvolutions";

type PlayerLite = {
  id: number;
  name?: string | null;
  full_name?: string | null;
  number?: number | null;
  photo_url?: string | null;
};

type Props = {
  matchId: number;
  clubName: string;
  opponentName: string;
  matchDateLabel: string;

  match: any;
  matchStats: any[];

  superioridadStats: any;
  inferioridadStats: any;
  blocksStats: any;

  allGoalkeeperShots: any[];
  goalkeeperId: number | null;

  players: PlayerLite[];
};

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function sum(stats: any[], key: string) {
  return stats.reduce((acc, s) => acc + n(s?.[key]), 0);
}

function pct(numer: number, denom: number) {
  if (!denom) return 0;
  return Math.round((numer / denom) * 1000) / 10;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

function TinyKpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card/40 px-3 py-2">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function MatchChartsGrid({
  matchId,
  clubName,
  opponentName,
  matchDateLabel,
  match,
  matchStats,
  superioridadStats,
  inferioridadStats,
  blocksStats,
  allGoalkeeperShots,
  goalkeeperId,
  players,
}: Props) {
  const canShowGoalkeeperShots = useMemo(
    () => Boolean(goalkeeperId) && (allGoalkeeperShots?.length ?? 0) > 0,
    [goalkeeperId, allGoalkeeperShots]
  );

  // ✅ Micro-KPIs (robustos aunque falten campos)
  const resumen = useMemo(() => {
    const goles = sum(matchStats, "goles_totales");
    const tiros = sum(matchStats, "tiros_totales");

    // fallos típicos (si no existen, se quedan a 0)
    const fallos =
      sum(matchStats, "tiros_hombre_mas") +
      sum(matchStats, "tiros_penalti_fallado") +
      sum(matchStats, "tiros_corner") +
      sum(matchStats, "tiros_fuera") +
      sum(matchStats, "tiros_parados") +
      sum(matchStats, "tiros_bloqueado") +
      sum(matchStats, "tiro_palo");

    const intentos = goles + fallos;
    const efectividad = pct(goles, intentos);

    const asistencias = sum(matchStats, "acciones_asistencias");
    const recuperaciones = sum(matchStats, "acciones_recuperacion");
    const bloqueos = sum(matchStats, "acciones_bloqueo");
    const perdidas = sum(matchStats, "acciones_perdida_poco");

    // portero (si está en matchStats)
    const paradas = sum(matchStats, "portero_paradas_totales");
    const gc =
      sum(matchStats, "portero_goles_boya_parada") +
      sum(matchStats, "portero_goles_hombre_menos") +
      sum(matchStats, "portero_goles_dir_mas_5m") +
      sum(matchStats, "portero_goles_contraataque") +
      sum(matchStats, "portero_goles_penalti") +
      sum(matchStats, "portero_goles_lanzamiento") +
      sum(matchStats, "portero_goles_penalti_encajado") +
      sum(matchStats, "portero_gol_palo");

    const tirosRecibidos =
      paradas +
      gc +
      sum(matchStats, "lanz_recibido_fuera") +
      sum(matchStats, "portero_lanz_palo") +
      sum(matchStats, "portero_inferioridad_fuera") +
      sum(matchStats, "portero_inferioridad_bloqueo");

    const eficPortero = pct(paradas, tirosRecibidos);

    return {
      goles,
      tiros,
      intentos,
      efectividad,
      asistencias,
      recuperaciones,
      bloqueos,
      perdidas,
      paradas,
      gc,
      tirosRecibidos,
      eficPortero,
    };
  }, [matchStats]);

  return (
    <div className="space-y-4">
      {/* ✅ Header resumen (muy útil en móvil) */}
      <div className="rounded-2xl border bg-card/40 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {clubName} vs {opponentName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{matchDateLabel}</p>

            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>
                {resumen.goles} goles · {resumen.intentos} intentos
              </Pill>
              <Pill>{resumen.efectividad}% efect.</Pill>
              <Pill>
                {resumen.asistencias} asist · {resumen.bloqueos} bloq
              </Pill>
              <Pill>
                {resumen.recuperaciones} recup · {resumen.perdidas} pérdidas
              </Pill>
            </div>
          </div>

          {/* Mini KPIs compactos */}
          <div className="grid grid-cols-3 gap-2 sm:w-[340px]">
            <TinyKpi label="Tiros" value={resumen.tiros} />
            <TinyKpi label="Efect." value={`${resumen.efectividad}%`} />
            <TinyKpi label="Portero" value={`${resumen.eficPortero}%`} />
          </div>
        </div>
      </div>

      {/* ✅ Grid principal */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Equipo */}
        <div className="sm:col-span-2 lg:col-span-3">
          <SectionTitle title="Equipo" />
        </div>

        <MatchSuperiorityChart stats={superioridadStats} />
        <MatchInferiorityChart stats={inferioridadStats} />
        <MatchBlocksChart stats={blocksStats} matchStats={matchStats} clubName={clubName} />

        {/* Tiros / posesión / porteros */}
        <div className="sm:col-span-2 lg:col-span-3">
          <SectionTitle title="Tiros y posesión" />
        </div>

        <MatchPossessionChart stats={matchStats} rival={opponentName} matchDateLabel={matchDateLabel} size="sm" />
        <ShotMistakesDonutChartMatch match={match} stats={matchStats} players={players} />
        <MatchGoalkeepersPieChart stats={matchStats} match={match} />

        {/* Portero */}
        <div className="sm:col-span-2 lg:col-span-3">
          <SectionTitle
            title="Portero"
            right={
              <Pill>
                {resumen.paradas} paradas · {resumen.gc} GC · {resumen.eficPortero}% efic.
              </Pill>
            }
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          {canShowGoalkeeperShots ? (
            <div className="rounded-2xl border bg-card/40 p-2 sm:p-3">
               <GoalkeeperShotsGoalChartSimple
					shots={allGoalkeeperShots}
					goalkeeperPlayerId={null}
					matchId={matchId}
					players={players}
				/>
            </div>
          ) : (
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground/80">Sin mapa de tiros del portero</p>
              <p className="mt-1">
                No hay datos suficientes para mostrar el mapa/evolución. Aun así, el resumen del portero se calcula con
                las stats del partido (si están).
              </p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                <TinyKpi label="Paradas" value={resumen.paradas} />
                <TinyKpi label="GC" value={resumen.gc} />
                <TinyKpi label="Tiros recib." value={resumen.tirosRecibidos} />
                <TinyKpi label="Efic." value={`${resumen.eficPortero}%`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
