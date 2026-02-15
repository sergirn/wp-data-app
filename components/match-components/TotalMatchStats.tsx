"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchStats } from "@/lib/types";

type Props = {
  title?: string;
  stats: MatchStats[];
};

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function sum(stats: MatchStats[], key: keyof MatchStats) {
  return stats.reduce((acc, s) => acc + n(s[key]), 0);
}

function pct(numer: number, denom: number) {
  if (!denom) return 0;
  return Math.round((numer / denom) * 1000) / 10;
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function MiniKpiBox({
  label,
  value,
  subtle,
}: {
  label: string;
  value: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border",
        "p-3 sm:p-3.5",
        "bg-gradient-to-br",
        subtle ? "from-background to-muted/60" : "from-blue-500/5 to-blue-500/10",
      ].join(" ")}
    >
      <p className="text-lg sm:text-xl font-bold tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5">
        {label}
      </p>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card/40">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-tight">{title}</h4>
          {hint ? (
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          ) : null}
        </div>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  subtle,
}: {
  label: string;
  value: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3",
        "rounded-xl px-3 py-2",
        "border transition-colors",
        subtle ? "bg-muted/20 border-transparent" : "bg-muted/40 border-transparent",
      ].join(" ")}
    >
      <span className="text-sm text-muted-foreground min-w-0 truncate">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function TeamTotalsOverviewCard({
  title = "Totales del Partido",
  stats,
}: Props) {
  // --- GOLES (recalculado) ---
  const g_boya_jugada = sum(stats, "goles_boya_jugada");
  const g_hombre_mas = sum(stats, "goles_hombre_mas");
  const g_lanzamiento = sum(stats, "goles_lanzamiento");
  const g_dir_5m = sum(stats, "goles_dir_mas_5m");
  const g_contraataque = sum(stats, "goles_contraataque");
  const g_penalti = sum(stats, "goles_penalti_anotado");
  const g_gol_del_palo_sup = sum(stats, "gol_del_palo_sup");

  const goles =
    g_boya_jugada +
    g_hombre_mas +
    g_lanzamiento +
    g_dir_5m +
    g_contraataque +
    g_penalti +
    g_gol_del_palo_sup;

  // --- FALLOS ---
  const f_hombre_mas = sum(stats, "tiros_hombre_mas");
  const f_penalti = sum(stats, "tiros_penalti_fallado");
  const f_corner = sum(stats, "tiros_corner");
  const f_fuera = sum(stats, "tiros_fuera");
  const f_parados = sum(stats, "tiros_parados");
  const f_bloqueados = sum(stats, "tiros_bloqueado");
  const f_tiro_palo = sum(stats, "tiro_palo");

  const fallos =
    f_hombre_mas +
    f_penalti +
    f_corner +
    f_fuera +
    f_parados +
    f_bloqueados +
    f_tiro_palo;

  const intentos = goles + fallos;
  const efectividad = pct(goles, intentos);

  // --- FOULS ---
  const faltas_20_1c1 = sum(stats, "faltas_exp_20_1c1");
  const faltas_20_boya = sum(stats, "faltas_exp_20_boya");
  const faltas_simple = sum(stats, "faltas_exp_simple");

  const exp_trans_def = sum(stats, "exp_trans_def");
  const faltas_penalti = sum(stats, "faltas_penalti");
  const faltas_contrafaltas = sum(stats, "faltas_contrafaltas");
  const faltas_3_int = sum(stats, "faltas_exp_3_int");
  const faltas_3_bruta = sum(stats, "faltas_exp_3_bruta");

  const faltas =
    faltas_20_1c1 +
    faltas_20_boya +
    faltas_simple +
    faltas_penalti +
    faltas_contrafaltas +
    faltas_3_int +
    faltas_3_bruta +
    exp_trans_def;

  // --- ACCIONES JUGADORES ---
  const asistencias = sum(stats, "acciones_asistencias");
  const bloqueos = sum(stats, "acciones_bloqueo");
  const recuperaciones = sum(stats, "acciones_recuperacion");
  const rebotes = sum(stats, "acciones_rebote");
  const exp_provocada = sum(stats, "acciones_exp_provocada");
  const penalti_provocado = sum(stats, "acciones_penalti_provocado");
  const pase_boya = sum(stats, "pase_boya");
  const pase_boya_fallado = sum(stats, "pase_boya_fallado");
  const perdidas = sum(stats, "acciones_perdida_poco");
  const rebote_recup_hm = sum(stats, "rebote_recup_hombre_mas");
  const rebote_perd_hm = sum(stats, "rebote_perd_hombre_mas");

  // --- PORTERO (paradas) ---
  const paradas = sum(stats, "portero_paradas_totales");

  // NOTE: tu código original tenía "portero_paradas_parada_recup".
  // Lo mantenemos para no romper, aunque si no existe en el type, en runtime será 0.
  const paradas_recup =
    sum(stats, "portero_tiros_parada_recup") +
    sum(stats as any, "portero_paradas_parada_recup");

  const paradas_fuera = sum(stats, "portero_paradas_fuera");
  const paradas_penalti = sum(stats, "portero_paradas_penalti_parado");
  const paradas_hombre_menos = sum(stats, "portero_paradas_hombre_menos");

  // ✅ tiros del rival que NO cuentan como paradas
  const lanz_recibido_fuera = sum(stats, "lanz_recibido_fuera");
  const portero_lanz_palo = sum(stats, "portero_lanz_palo");
  const portero_inferioridad_fuera = sum(stats, "portero_inferioridad_fuera");
  const portero_inferioridad_bloqueo = sum(stats, "portero_inferioridad_bloqueo");

  // ✅ goles recibidos (incluye gol de palo)
  const gc_boya_parada = sum(stats, "portero_goles_boya_parada");
  const gc_hombre_menos = sum(stats, "portero_goles_hombre_menos");
  const gc_dir_5m = sum(stats, "portero_goles_dir_mas_5m");
  const gc_contraataque = sum(stats, "portero_goles_contraataque");
  const gc_penalti = sum(stats, "portero_goles_penalti");
  const gc_lanzamiento = sum(stats, "portero_goles_lanzamiento");
  const gc_penalti_encajado = sum(stats, "portero_goles_penalti_encajado");
  const gc_portero_gol_palo = sum(stats, "portero_gol_palo");

  const goles_recibidos =
    gc_portero_gol_palo +
    gc_boya_parada +
    gc_hombre_menos +
    gc_dir_5m +
    gc_contraataque +
    gc_penalti +
    gc_lanzamiento +
    gc_penalti_encajado;

  // ✅ tiros totales recibidos (cuenta TODO lo del portero)
  const tiros_recibidos_totales =
    paradas +
    goles_recibidos +
    lanz_recibido_fuera +
    portero_lanz_palo +
    portero_inferioridad_fuera +
    portero_inferioridad_bloqueo;

  const eficPortero =
    tiros_recibidos_totales > 0 ? pct(paradas, tiros_recibidos_totales) : 0;

  // ✅ acciones portero (ojo: tu original mezclaba keys de match_stats; lo mantengo)
  const portero_asist = sum(stats as any, "portero_acciones_asistencias");
  const portero_recup = sum(stats as any, "portero_acciones_recuperacion");
  const portero_perdidas = sum(stats, "portero_acciones_perdida_pos");
  const portero_exp_provocada =
    sum(stats as any, "portero_acciones_exp_provocada") +
    sum(stats as any, "portero_exp_provocada");
  const portero_penalti_provocado = sum(stats as any, "portero_penalti_provocado");

  const tirosAPorteria = f_parados + goles;
  const pctAPorteria = pct(tirosAPorteria, intentos);
  const balanceRebotesHM = rebote_recup_hm - rebote_perd_hm;

  return (
    <Card className="mb-6 bg-transparent shadow-none border-none">
      <div className="mb-3 border-t border-muted/80" />

      <CardContent className="space-y-5 px-0 sm:px-0">
        {/* ✅ KPIs top (compactos) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <MiniKpiBox label="Goles" value={goles} />
          <MiniKpiBox label="Efectividad" value={`${efectividad}%`} subtle />
          <MiniKpiBox label="Faltas" value={faltas} />
          <MiniKpiBox
            label="Recuperaciones"
            value={recuperaciones + portero_recup}
            subtle
          />
        </div>

		<div className="flex items-center gap-3">
			<p className="text-sm font-semibold text-muted-foreground">Jugadores de campo</p>
			<div className="h-px flex-1 bg-border/60" />
		</div>

        {/* ✅ Secciones: mismo patrón que FieldPlayerTotalsCard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Section title="Goles" hint="Desglose de anotación">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
              <Row label="Boya/Jugada" value={g_boya_jugada} />
              <Row label="Hombre +" value={g_hombre_mas + g_gol_del_palo_sup} />
              <Row label="Lanzamiento" value={g_lanzamiento} />
              <Row label="+6m" value={g_dir_5m} />
              <Row label="Contraataque" value={g_contraataque} />
              <Row label="Penalti" value={g_penalti} />
            </div>
          </Section>

          <Section title="Fallos" hint="Tipos de tiro no convertidos">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
              <Row label="Hombre +" value={f_hombre_mas} />
              <Row label="Penalti" value={f_penalti} />
              <Row label="Corner" value={f_corner} />
              <Row label="Fuera" value={f_fuera} />
              <Row label="Parados" value={f_parados} />
              <Row label="Bloqueados" value={f_bloqueados} />
              <Row label="Palo" value={f_tiro_palo} />
              <Row label="A portería (%)" value={`${pctAPorteria}%`} subtle />
            </div>
          </Section>

          <Section
            title="Faltas"
            hint={`20": ${faltas_20_1c1 + faltas_20_boya} · simple: ${faltas_simple} · trans. def.: ${exp_trans_def}`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
              <Row label='Exp 20" 1c1' value={faltas_20_1c1} />
              <Row label='Exp 20" Boya' value={faltas_20_boya} />
              <Row label="Exp simple" value={faltas_simple} />
              <Row label="Exp trans. def." value={exp_trans_def} />
              <Row label="Penalti" value={faltas_penalti} />
              <Row label="Contrafaltas" value={faltas_contrafaltas} />
              <Row label='Exp 3" Int' value={faltas_3_int} />
              <Row label='Exp 3" Bruta' value={faltas_3_bruta} />
            </div>
          </Section>

          <Section title="Acciones (jugadores)" hint="Aportación ofensiva/defensiva">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
              <Row label="Asistencias" value={asistencias} />
              <Row label="Bloqueos" value={bloqueos} />
              <Row label="Recuperaciones" value={recuperaciones} />
              <Row label="Rebotes" value={rebotes} />
              <Row label="Exp. provocadas" value={exp_provocada} />
              <Row label="Penaltis provoc." value={penalti_provocado} />
              <Row label="Pérdidas" value={perdidas} />
              <Row label="Pase a boya (ok/f)" value={`${pase_boya}/${pase_boya_fallado}`} />
              <Row
                label="Rebotes H+ (rec/perd)"
                value={`${rebote_recup_hm}/${rebote_perd_hm}`}
              />
              <Row
                label="Balance Rebotes H+"
                value={`${balanceRebotesHM >= 0 ? "+" : ""}${balanceRebotesHM}`}
                subtle
              />
            </div>
          </Section>
		</div>

		<div className="flex items-center gap-3">
			<p className="text-sm font-semibold text-muted-foreground">Porteros</p>
			<div className="h-px flex-1 bg-border/60" />
		</div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{/* GOLES */}
			<Section
				title="Portero · Goles"
			>
				<div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
				<Row label="Goles recibidos" value={goles_recibidos} />

				<Row label="GC Boya/Parada" value={gc_boya_parada} subtle />
				<Row label="GC Hombre -" value={gc_hombre_menos} subtle />
				<Row label="GC +6m" value={gc_dir_5m} subtle />
				<Row label="GC Contraataque" value={gc_contraataque} subtle />
				<Row label="GC Penalti" value={gc_penalti} subtle />
				<Row label="GC Lanzamiento" value={gc_lanzamiento} subtle />
				<Row label="GC Penalti encaj." value={gc_penalti_encajado} subtle />
				<Row label="GC Gol al palo" value={gc_portero_gol_palo} subtle />
				</div>
			</Section>

			{/* PARADAS */}
			<Section
				title="Portero · Paradas"
				hint={`Eficiencia ${eficPortero}% · Tiros recibidos ${tiros_recibidos_totales}`}
			>
				<div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
				<Row label="Tiros recibidos" value={tiros_recibidos_totales} />
				<Row label="Paradas" value={paradas} />

				<Row label="Paradas + Recup" value={paradas_recup} subtle />
				<Row label="Paradas penalti" value={paradas_penalti} />
				<Row label="Paradas H-" value={paradas_hombre_menos} />
				<Row label="Paradas fuera" value={paradas_fuera} subtle />
				</div>
			</Section>

			{/* INFERIORIDAD */}
			<Section
				title="Portero · Inferioridad"
				hint={`H- (fuera+bloq) ${portero_inferioridad_fuera + portero_inferioridad_bloqueo}`}
			>
				<div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
				<Row label="H- Fuera" value={portero_inferioridad_fuera} />
				<Row label="H- Bloqueo" value={portero_inferioridad_bloqueo} />

				<Row
					label="H- (fuera+bloq)"
					value={portero_inferioridad_fuera + portero_inferioridad_bloqueo}
					subtle
				/>

				<Row label="Fuera (recibidos)" value={lanz_recibido_fuera} />
				<Row label="Palo (recibidos)" value={portero_lanz_palo} />
				</div>
			</Section>

			{/* ACCIONES */}
			<Section title="Portero · Acciones" hint="Acciones de juego del portero">
				<div className="grid grid-cols-2 sm:grid-cols-2 gap-1">
				<Row label="Asist (portero)" value={portero_asist} subtle />
				<Row label="Recup (portero)" value={portero_recup} subtle />
				<Row label="Pérdidas (portero)" value={portero_perdidas} subtle />
				<Row label="Exp prov (portero)" value={portero_exp_provocada} subtle />
				<Row label="Penalti prov (portero)" value={portero_penalti_provocado} subtle />
				</div>
			</Section>
			</div>
        
      </CardContent>
    </Card>
  );
}
