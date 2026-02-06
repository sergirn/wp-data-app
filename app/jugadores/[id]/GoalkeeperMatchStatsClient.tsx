"use client";

import * as React from "react";
import Link from "next/link";
import type { Player, MatchStats, Match } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion";

import { usePlayerFavorites } from "@/hooks/usePlayerFavorites";

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
    d ? new Date(d).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "";

  const KpiBox = ({ label, value, className }: { label: string; value: React.ReactNode; className: string }) => (
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

  // ✅ playerId para favoritos
  const playerId: number | undefined = (player as any)?.id ?? (matchStats?.[0] as any)?.player_id ?? undefined;
  const { favSet, toggle } = usePlayerFavorites(playerId);

  // ✅ KV “favoritable” (fila completa clicable) + hover que NO pisa el amarillo
  const KV = ({ label, value, statKey }: { label: string; value: React.ReactNode; statKey: string }) => {
    const isFav = favSet.has(statKey);
    const onToggle = () => toggle(statKey);

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
          isFav ? "bg-yellow-500/20 border-yellow-500/20 hover:bg-yellow-500/25" : "bg-muted/50 border-transparent hover:bg-muted/70",
        ].join(" ")}
        aria-label={`${label}: ${isFav ? "favorita" : "no favorita"}`}
        title="Pulsa para marcar/desmarcar como favorita"
      >
        <span className="text-sm text-muted-foreground">{label}</span>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{value}</span>

          {/* Indicador opcional */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={["h-7 w-7 grid place-items-center rounded-md text-xs", isFav ? "opacity-100" : "opacity-50 hover:opacity-90"].join(" ")}
            aria-label={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
            title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}
          >
            <span className={isFav ? "opacity-100" : "opacity-30"}>★</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="space-y-4">
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
            <Card key={stat.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base md:text-lg truncate">{match?.opponent ?? "—"}</CardTitle>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{formatDate(match?.match_date)}</p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <span className="text-xl md:text-2xl font-bold tabular-nums">
                      {match?.home_score ?? 0} - {match?.away_score ?? 0}
                    </span>
                    <Button asChild variant="outline" size="sm" className="bg-transparent">
                      <Link href={`/partidos/${match?.id}`}>Ver Partido</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-4 md:grid-cols-4 gap-3">
                  <KpiBox label="Paradas" value={paradas} className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400" />
                  <KpiBox label="Goles Recibidos" value={rivalGoals ?? 0} className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400" />
                  <KpiBox label="Eficiencia" value={`${eficiencia}%`} className="bg-blue-500/5 border-blue-500/10 text-white-600 dark:text-white-400" />
                  <KpiBox label="Tiros Totales" value={totalShots} className="bg-white-500/5 border-blue-500/50 text-white-600 dark:text-white-400" />
                </div>

                {/* ✅ MOBILE */}
                <div className="sm:hidden">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value={`detail-${stat.id}`} className="border rounded-xl overflow-hidden">
                      <AccordionTrigger
                        className="
                          w-full !flex !justify-between
                          px-3 py-2
                          bg-muted/20 hover:bg-muted/30
                          text-sm font-semibold
                          [&>svg]:shrink-0
                          [&>svg]:transition-transform
                          data-[state=open]:[&>svg]:rotate-180
                        "
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>Ver detalle</span>
                          <span className="shrink-0 rounded-lg border bg-background/60 px-2.5 py-1 text-xs font-semibold opacity-80">
                            Abrir
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-3 pb-3 pt-2">
                        <div className="grid gap-3">
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
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* ✅ TABLET/DESKTOP */}
                <div className="hidden sm:grid sm:grid-cols-2 gap-4">
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
