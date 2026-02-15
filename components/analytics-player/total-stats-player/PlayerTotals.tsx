"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";

export function FieldPlayerTotalsCard({
  stats,
  matchCount,
  title = "Totales",
  playerId,
}: {
  stats: any;
  matchCount?: number;
  title?: string;
  playerId: number; // 👈 necesario para favoritos
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

  const goles = stats?.goles_totales ?? 0;
  const tiros = stats?.tiros_totales ?? 0;
  const eficiencia = tiros > 0 ? ((goles / tiros) * 100).toFixed(1) : "0.0";
  const asist = stats?.acciones_asistencias ?? 0;

  const goalsItems = [
    { label: "Boya/Jugada", key: "goles_boya_jugada" as const },
    { label: "Hombre +", key: "goles_hombre_mas" as const },
    { label: "Lanzamiento", key: "goles_lanzamiento" as const },
    { label: "+6m", key: "goles_dir_mas_5m" as const },
    { label: "Contraataque", key: "goles_contraataque" as const },
    { label: "Penalti", key: "goles_penalti_anotado" as const },
    { label: "Gol del palo (H+)", key: "gol_del_palo_sup" as const },
  ];

  const missesItems = [
    { label: "Hombre +", key: "tiros_hombre_mas" as const },
    { label: "Penalti", key: "tiros_penalti_fallado" as const },
    { label: "Corner", key: "tiros_corner" as const },
    { label: "Fuera", key: "tiros_fuera" as const },
    { label: "Parados", key: "tiros_parados" as const },
    { label: "Bloqueados", key: "tiros_bloqueado" as const },
    { label: "Tiro al palo", key: "tiro_palo" as const },
  ];

  const foulsItems = [
    { label: 'Exp 20" 1c1', key: "faltas_exp_20_1c1" as const },
    { label: 'Exp 20" Boya', key: "faltas_exp_20_boya" as const },
    { label: "Exp Simple", key: "faltas_exp_simple" as const },
    { label: "Penalti", key: "faltas_penalti" as const },
    { label: "Contrafaltas", key: "faltas_contrafaltas" as const },
    { label: "Exp trans. def.", key: "exp_trans_def" as const },
    { label: 'Exp 3" Bruta', key: "faltas_exp_3_bruta" as const },
    { label: 'Exp 3" Int', key: "faltas_exp_3_int" as const },
  ];

  const actionsItems = [
    { label: "Bloqueos", key: "acciones_bloqueo" as const },
    { label: "Recuperaciones", key: "acciones_recuperacion" as const },
    { label: "Rebotes", key: "acciones_rebote" as const },
    { label: "Exp. Prov.", key: "acciones_exp_provocada" as const },
    { label: "Pen. Prov.", key: "acciones_penalti_provocado" as const },
    { label: "Gol recibido", key: "acciones_recibir_gol" as const },
    { label: "Pérdidas", key: "acciones_perdida_poco" as const },
    { label: "Rebote recup (H+)", key: "rebote_recup_hombre_mas" as const },
    { label: "Rebote perd (H+)", key: "rebote_perd_hombre_mas" as const },
  ];

  return (
    <div className="space-y-4">
      {/* ✅ barra sticky de guardado (igual que tu ejemplo) */}
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
            <KpiBox label="Goles" value={goles} />
            <KpiBox label="Tiros" value={tiros} subtle />
            <KpiBox label="Eficiencia" value={`${eficiencia}%`} />
            <KpiBox label="Asistencias" value={asist} subtle />
          </div>

          {/* Secciones + filas favoritas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Goles por tipo" hint="Desglose de anotación">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {goalsItems.map((it) => (
                  <FavRow
                    key={it.key}
                    statKey={it.key}
                    label={it.label}
                    value={(stats?.[it.key] ?? 0) as number}
                  />
                ))}
              </div>
            </Section>

            <Section title="Tiros fallados" hint="Tipos de tiro no convertidos">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {missesItems.map((it) => (
                  <FavRow
                    key={it.key}
                    statKey={it.key}
                    label={it.label}
                    value={(stats?.[it.key] ?? 0) as number}
                  />
                ))}
              </div>
            </Section>

            <Section title="Faltas" hint="Exclusiones y sanciones">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {foulsItems.map((it) => (
                  <FavRow
                    key={it.key}
                    statKey={it.key}
                    label={it.label}
                    value={(stats?.[it.key] ?? 0) as number}
                  />
                ))}
              </div>
            </Section>

            <Section title="Acciones" hint="Acciones de juego">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {actionsItems.map((it) => (
                  <FavRow
                    key={it.key}
                    statKey={it.key}
                    label={it.label}
                    value={(stats?.[it.key] ?? 0) as number}
                  />
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
