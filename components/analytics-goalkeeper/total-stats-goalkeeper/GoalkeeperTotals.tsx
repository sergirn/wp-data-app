"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";

type StatItem = { label: string; key: string };
type StatGroup = { title: string; stats: StatItem[] };

export const GOALKEEPER_GROUPS_ALL: StatGroup[] = [
  {
    title: "Goles encajados",
    stats: [
      { label: "Boya/Parada", key: "portero_goles_boya_parada" },
      { label: "Hombre -", key: "portero_goles_hombre_menos" },
      { label: "+6m", key: "portero_goles_dir_mas_5m" },
      { label: "Contraataque", key: "portero_goles_contraataque" },
      { label: "Penalti", key: "portero_goles_penalti" },
      { label: "Lanzamiento", key: "portero_goles_lanzamiento" },
      { label: "Boya", key: "portero_goles_boya" },
      { label: "Gol del palo", key: "portero_gol_palo" },
    ],
  },
  {
    title: "Paradas",
    stats: [
      { label: "Totales", key: "portero_paradas_totales" },
      { label: "Parada + Recup", key: "portero_tiros_parada_recup" },
      { label: "Fuera (parada)", key: "portero_paradas_fuera" },
      { label: "Penalti parado", key: "portero_paradas_penalti_parado" },
      { label: "Hombre - (parada)", key: "portero_paradas_hombre_menos" },

      // tiros rival (cuentan como recibidos, no paradas)
      { label: "Lanz. recibido fuera", key: "lanz_recibido_fuera" },
      { label: "Lanz. al palo", key: "portero_lanz_palo" },

      // inferioridad (recibidos H- no paradas ni goles)
      { label: "H- Fuera", key: "portero_inferioridad_fuera" },
      { label: "H- Bloqueo", key: "portero_inferioridad_bloqueo" },
    ],
  },
  {
    title: "Acciones",
    stats: [
      { label: "Asistencias", key: "acciones_asistencias" },
      { label: "Recuperación", key: "acciones_recuperacion" },
      { label: "Pérdida posesión", key: "portero_acciones_perdida_pos" },
      { label: "Exp. provocada", key: "acciones_exp_provocada" },
    ],
  },
  {
    title: "Ataque (portero)",
    stats: [
      { label: "Gol", key: "portero_gol" },
      { label: "Gol superioridad", key: "portero_gol_superioridad" },
      { label: "Fallo superioridad", key: "portero_fallo_superioridad" },
    ],
  },
];

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function GoalkeeperTotalsCard({
  stats,
  matchCount,
  title = "Totales",
  playerId,
}: {
  stats: any;
  matchCount?: number;
  title?: string;
  playerId: number;
}) {
  const StatPill = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );

  const KpiBox = ({
    label,
    value,
    subtle,
  }: {
    label: string;
    value: React.ReactNode;
    subtle?: boolean;
  }) => (
    <div
      className={[
        "rounded-2xl border p-4",
        "bg-gradient-to-br",
        subtle ? "from-background to-muted/60" : "from-blue-500/5 to-blue-500/10",
      ].join(" ")}
    >
      <p className="text-[22px] sm:text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
    </div>
  );

  const Section = ({
    title,
    children,
    hint,
  }: {
    title: string;
    children: React.ReactNode;
    hint?: string;
  }) => (
    <div className="rounded-2xl border bg-card/40">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-tight">{title}</h4>
          {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
        </div>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );

  // ✅ Favoritos (igual que tu ejemplo)
  const { favSet, toggleLocal, dirty, save, discard, saving, error } = usePlayerFavorites(playerId);

  const FavRow = ({
    label,
    value,
    statKey,
  }: {
    label: string;
    value: React.ReactNode;
    statKey: string;
  }) => {
    const isFav = favSet.has(statKey);
    const onToggle = () => toggleLocal(statKey);

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={[
          "flex items-center justify-between gap-3",
          "rounded-xl px-3 py-2 transition-colors select-none",
          "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
          isFav
            ? "bg-yellow-500/20 border border-yellow-500/20 hover:bg-yellow-500/25"
            : "bg-muted/40 border border-transparent hover:bg-muted/55",
        ].join(" ")}
        aria-label={`${label}: ${isFav ? "favorita" : "no favorita"}`}
        title="Pulsa para marcar/desmarcar como favorita"
      >
        <span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{value}</span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={[
              "h-7 w-7 grid place-items-center rounded-md text-xs",
              isFav ? "opacity-100" : "opacity-50 hover:opacity-90",
            ].join(" ")}
            aria-label={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
            title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
          >
            <span className={isFav ? "opacity-100" : "opacity-30"}>★</span>
          </button>
        </div>
      </div>
    );
  };

  // ✅ KPIs top (portero)
  const paradas = n(stats?.portero_paradas_totales);
  const golesRecibidos = n(stats?.goles_recibidos_reales); // viene de tu calculateGoalkeeperStats
  const totalShots = paradas + golesRecibidos;
  const savePercentage = totalShots > 0 ? ((paradas / totalShots) * 100).toFixed(1) : "0.0";

  const asist = n(stats?.acciones_asistencias);

  return (
    <div className="space-y-4">
      {/* ✅ barra sticky de guardado */}
      {dirty ? (
        <div className="sticky top-2 z-20">
          <div className="rounded-xl border bg-background/60 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Cambios sin guardar{error ? <span className="text-destructive"> · {error}</span> : null}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={discard} disabled={saving}>
                Descartar
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden">


        <div className="space-y-5">
          {/* KPIs top */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiBox label="Paradas" value={paradas} />
            <KpiBox label="Goles recibidos" value={golesRecibidos} subtle />
            <KpiBox label="Save %" value={`${savePercentage}%`} />
            <KpiBox label="Tiros (P+G)" value={totalShots} subtle />
          </div>

          {/* Secciones + filas favoritas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {GOALKEEPER_GROUPS_ALL.map((group) => (
              <Section key={group.title} title={group.title} hint="Totales">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {group.stats.map((it) => (
                    <FavRow
                      key={it.key}
                      statKey={it.key}
                      label={it.label}
                      value={(stats?.[it.key] ?? 0) as number}
                    />
                  ))}
                </div>
              </Section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
