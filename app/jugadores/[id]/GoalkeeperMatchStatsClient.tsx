"use client";

import * as React from "react";
import Link from "next/link";
import type { Player, MatchStats, Match } from "@/lib/types";

import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MatchStatsWithMatch extends MatchStats {
  matches: Match;
}

export function GoalkeeperMatchStatsClient({
  matchStats,
  player,
}: {
  matchStats: MatchStatsWithMatch[];
  player: Player;
}) {
  if (!matchStats?.length) {
    return (
      <Card className="mb-6">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No hay estadísticas de partidos registradas</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

  const KpiBox = ({
    label,
    value,
    className,
  }: {
    label: string;
    value: React.ReactNode;
    className: string;
  }) => (
    <div className={`rounded-xl p-4 text-center border ${className}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );

  // ✅ playerId para cargar favoritos desde BBDD
  const playerId: number | undefined =
    (player as any)?.id ?? (matchStats?.[0] as any)?.player_id ?? undefined;

  // ✅ draft + guardar (igual que FieldPlayerMatchStatsClient)
  const { favSet, toggleLocal, dirty, save, discard, saving, error } = usePlayerFavorites(playerId);

  // ✅ KV “favoritable”
  const KV = ({ label, value, statKey }: { label: string; value: React.ReactNode; statKey: string }) => {
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
          "flex items-center justify-between rounded-lg px-3 py-2 border transition-colors select-none",
          "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
          isFav
            ? "bg-yellow-500/20 border-yellow-500/20 hover:bg-yellow-500/25"
            : "bg-muted/50 border-transparent hover:bg-muted/70",
        ].join(" ")}
        aria-label={`${label}: ${isFav ? "favorita" : "no favorita"}`}
        title="Pulsa para marcar/desmarcar como favorita"
      >
        <span className="text-sm text-muted-foreground">{label}</span>

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

  // ✅ Abre por defecto el primero (si viene ordenado DESC por fecha, es el más reciente)
  const defaultOpen = `match-${matchStats[0]?.id}`;

  return (
    <div className="space-y-4 mb-6">
      {/* ✅ Barra Guardar/Descartar (solo si hay cambios) */}
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

      {/* ✅ TODOS EN ACORDEÓN (como móvil), excepto el último partido abierto */}
      <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={defaultOpen}>
        {matchStats.map((stat) => {
          const match = stat.matches;

          const rivalGoals = match ? (match.is_home ? match.away_score : match.home_score) : 0;

          const paradas = stat.portero_paradas_totales ?? 0;
          const totalShots = paradas + (rivalGoals ?? 0);
          const eficiencia = totalShots > 0 ? ((paradas / totalShots) * 100).toFixed(1) : "0.0";

          const savesItems = [
            { label: "Parada + Recup", key: "portero_tiros_parada_recup" },
            { label: "Fuera", key: "portero_paradas_fuera" },
            { label: "Penalti parado", key: "portero_paradas_penalti_parado" },
            { label: "Hombre -", key: "portero_paradas_hombre_menos" },
            { label: "Lanz. recibido fuera", key: "lanz_recibido_fuera" },
          ] as const;

          const goalsItems = [
            { label: "Boya/Parada", key: "portero_goles_boya_parada" },
            { label: "Hombre -", key: "portero_goles_hombre_menos" },
            { label: "+6m", key: "portero_goles_dir_mas_5m" },
            { label: "Contraataque", key: "portero_goles_contraataque" },
            { label: "Penalti", key: "portero_goles_penalti" },
          ] as const;

          return (
            <AccordionItem key={stat.id} value={`match-${stat.id}`} className="border-0">
              <Card className="overflow-hidden">
                <AccordionTrigger
                  className="
                    w-full p-0 hover:no-underline
                    [&>svg]:mr-4
                    [&>svg]:shrink-0
                    [&>svg]:transition-transform
                    data-[state=open]:[&>svg]:rotate-180
                  "
                >
                  <CardHeader className="pb-3 w-full">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
                      <div className="min-w-0 text-left">
                        <CardTitle className="text-base md:text-lg truncate">{match?.opponent ?? "—"}</CardTitle>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {formatDate(match?.match_date)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3">
                        <span className="text-xl md:text-2xl font-bold tabular-nums">
                          {match?.home_score ?? 0} - {match?.away_score ?? 0}
                        </span>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/partidos/${match?.id}`}>Ver Partido</Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>

                <AccordionContent className="p-0">
                  <CardContent className="space-y-4">
                    {/* KPIs */}
                    <div className="grid grid-cols-4 md:grid-cols-4 gap-3">
                      <KpiBox
                        label="Paradas"
                        value={paradas}
                        className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
                      />
                      <KpiBox
                        label="Goles Recibidos"
                        value={rivalGoals ?? 0}
                        className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
                      />
                      <KpiBox
                        label="Eficiencia"
                        value={`${eficiencia}%`}
                        className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400"
                      />
                      <KpiBox
                        label="Tiros Totales"
                        value={totalShots}
                        className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400"
                      />
                    </div>

                    {/* Detalle (igual que el otro: siempre dentro del acordeón) */}
                    <div className="grid gap-3 grid-cols-2">
                      <Section title="Paradas por tipo">
                        {savesItems.map((it) => (
                          <KV key={it.key} label={it.label} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
                        ))}
                      </Section>

                      <Section title="Goles encajados por tipo">
                        {goalsItems.map((it) => (
                          <KV key={it.key} label={it.label} value={(stat as any)?.[it.key] ?? 0} statKey={it.key} />
                        ))}
                      </Section>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
