"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerHeroHeader } from "@/app/jugadores/[id]/playerHeader";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: any;
  stat: any;
  derived: {
    totalShots: number;
    shootingEfficiency: string;
    superiorityGoals: number;
    superiorityAttempts: number;
    superiorityEfficiency: string;
    totalActions: number;
    totalFouls: number;
  };
};

function usePlayerFavorites(playerId?: number, open?: boolean) {
  const [initialKeys, setInitialKeys] = React.useState<string[]>([]);
  const [draftKeys, setDraftKeys] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const favSet = React.useMemo(() => new Set(draftKeys), [draftKeys]);

  const dirty = React.useMemo(() => {
    const a = new Set(initialKeys);
    const b = new Set(draftKeys);
    if (a.size !== b.size) return true;
    for (const k of a) if (!b.has(k)) return true;
    return false;
  }, [initialKeys, draftKeys]);

  const load = React.useCallback(async () => {
    if (!playerId) return;
    setError(null);
    try {
      const res = await fetch(`/api/favorites?playerId=${playerId}`, { cache: "no-store" });
      const json = await res.json();
      const keys = Array.isArray(json.keys) ? json.keys : [];
      setInitialKeys(keys);
      setDraftKeys(keys);
    } catch {
      setInitialKeys([]);
      setDraftKeys([]);
      setError("No se pudieron cargar las favoritas");
    }
  }, [playerId]);

  React.useEffect(() => {
    if (!open || !playerId) return;
    load();
  }, [playerId, open, load]);

  const toggleLocal = (statKey: string) => {
    setDraftKeys((prev) => (prev.includes(statKey) ? prev.filter((k) => k !== statKey) : [...prev, statKey]));
  };

  const discard = () => {
    setError(null);
    setDraftKeys(initialKeys);
  };

  const save = async () => {
    if (!playerId) return;
    setSaving(true);
    setError(null);

    const prev = new Set(initialKeys);
    const next = new Set(draftKeys);

    // keys a togglear para dejar la BBDD como "next"
    const toToggle: string[] = [];
    for (const k of prev) if (!next.has(k)) toToggle.push(k);
    for (const k of next) if (!prev.has(k)) toToggle.push(k);

    try {
      // Aplica toggles en serie (más seguro con RLS / rate limits)
      for (const statKey of toToggle) {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, statKey }),
        });
        if (!res.ok) throw new Error("save_failed");
      }

      // Actualiza baseline
      setInitialKeys(draftKeys);
    } catch {
      setError("No se pudieron guardar los cambios");
      // Re-sync desde servidor para no quedarnos inconsistentes
      await load();
    } finally {
      setSaving(false);
    }
  };

  return { favSet, toggleLocal, dirty, save, discard, saving, error, reload: load };
}

export function PlayerMatchStatsModal({ open, onOpenChange, player, stat, derived }: Props) {
  const playerId: number | undefined = player?.id ?? stat?.player_id;

  const { favSet, toggleLocal, dirty, save, discard, saving, error } = usePlayerFavorites(playerId, open);

  // ✅ confirm al cerrar si hay cambios sin guardar
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const pendingCloseRef = React.useRef<boolean | null>(null);

  const requestClose = React.useCallback(() => {
    // cierre real
    onOpenChange(false);
  }, [onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    // intenta cerrar
    if (dirty && !saving) {
      pendingCloseRef.current = false;
      setConfirmOpen(true);
      return;
    }
    requestClose();
  };

  const confirmCloseWithoutSaving = () => {
    setConfirmOpen(false);
    pendingCloseRef.current = null;
    discard(); // opcional: vuelve al baseline para no arrastrar estados
    requestClose();
  };

  const confirmSaveAndClose = async () => {
    await save();
    // si tras guardar ya no hay dirty y no hubo error => cierra
    // (si falló save, dirty probablemente seguirá o habrá error)
    setConfirmOpen(false);
    pendingCloseRef.current = null;
    requestClose();
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }) : "—";

  const match = stat?.matches;
  const opponent = match?.opponent ?? "—";
  const date = formatDate(match?.match_date);
  const score = `${match?.home_score ?? 0} - ${match?.away_score ?? 0}`;

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

  const KV = ({
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
          "flex items-center justify-between rounded-lg px-3 py-2 border transition-colors select-none",
          "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30",
          isFav ? "bg-yellow-500/20 border-yellow-500/20 hover:bg-yellow-500/25" : "bg-muted/50 border-transparent hover:bg-muted/70",
        ].join(" ")}
        aria-label={`${label}: ${isFav ? "favorita" : "no favorita"}`}
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

  const goalsItems = [
    { label: "Boya/Jugada", key: "goles_boya_jugada" },
    { label: "Gol (H+)", key: "goles_hombre_mas" },
    { label: "Gol del palo (H+)", key: "gol_del_palo_sup" },
    { label: "Lanzamiento", key: "goles_lanzamiento" },
    { label: "+6m", key: "goles_dir_mas_5m" },
    { label: "Contraataque", key: "goles_contraataque" },
    { label: "Penalti", key: "goles_penalti_anotado" },
  ] as const;

  const missesItems = [
    { label: "Fallo (H+)", key: "tiros_hombre_mas" },
    { label: "Penalti", key: "tiros_penalti_fallado" },
    { label: "Corner", key: "tiros_corner" },
    { label: "Fuera", key: "tiros_fuera" },
    { label: "Parados", key: "tiros_parados" },
    { label: "Bloqueados", key: "tiros_bloqueado" },
    { label: "Palo", key: "tiro_palo" },
  ] as const;

  const foulsItems = [
    { label: 'Exp 20" 1c1', key: "faltas_exp_20_1c1" },
    { label: 'Exp 20" Boya', key: "faltas_exp_20_boya" },
    { label: "Exp Simple", key: "faltas_exp_simple" },
    { label: "Penalti", key: "faltas_penalti" },
    { label: "Contrafaltas", key: "faltas_contrafaltas" },
  ] as const;

  const actionsItems = [
    { label: "Asistencias", key: "acciones_asistencias" },
    { label: "Bloqueos", key: "acciones_bloqueo" },
    { label: "Recuperaciones", key: "acciones_recuperacion" },
    { label: "Rebotes", key: "acciones_rebote" },
    { label: "Exp. Prov.", key: "acciones_exp_provocada" },
    { label: "Pen. Prov.", key: "acciones_penalti_provocado" },
    { label: "Gol recibido", key: "acciones_recibir_gol" },
    { label: "Pase al boya", key: "pase_boya" },
    { label: "Pase boya fallado", key: "pase_boya_fallado" },
  ] as const;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="
            !w-[calc(100vw-16px)]
            sm:!w-[94vw]
            md:!w-[90vw]
            lg:!w-[86vw]
            xl:!w-[78vw]
            2xl:!w-[70vw]
            !max-w-[1600px]
            p-0 overflow-hidden
          "
        >
          <VisuallyHidden>
            <DialogTitle>{player?.name ?? "Estadísticas del jugador"}</DialogTitle>
          </VisuallyHidden>

          {/* Header player */}
          <div className="p-2">
            <PlayerHeroHeader
              player={{
                name: player?.name ?? "Jugador",
                number: player?.number,
                photo_url: player?.photo_url,
                is_goalkeeper: player?.is_goalkeeper,
              }}
              roleLabel={player?.is_goalkeeper ? "Portero" : "Jugador"}
            />
          </div>

          {/* ✅ Barra Guardar (sticky dentro del modal) */}
          {dirty ? (
            <div className="sticky top-0 z-20 px-4 pb-2 bg-background/60 backdrop-blur">
              <div className="rounded-xl border bg-background/80 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Cambios sin guardar{" "}
                  {error ? <span className="text-destructive">· {error}</span> : null}
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
          ) : (
            // pequeño separador para que el scroll no quede pegado
            <div />
          )}

          {/* Body */}
          <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiBox label="Goles" value={stat?.goles_totales ?? 0} className="bg-blue-500/5 border-blue-500/10" />
              <KpiBox label="Tiros" value={stat?.tiros_totales ?? 0} className="bg-white/5 border-blue-500/20" />
              <KpiBox label="Eficiencia" value={`${derived.shootingEfficiency}%`} className="bg-blue-500/5 border-blue-500/10" />
              <KpiBox label="Asistencias" value={stat?.acciones_asistencias ?? 0} className="bg-white/5 border-blue-500/20" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Section title="Goles por tipo">
                {goalsItems.map((it) => (
                  <KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
                ))}
              </Section>

              <Section title="Tiros fallados">
                {missesItems.map((it) => (
                  <KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
                ))}
              </Section>

              <Section title="Faltas">
                {foulsItems.map((it) => (
                  <KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
                ))}
              </Section>

              <Section title="Acciones">
                {actionsItems.map((it) => (
                  <KV key={it.key} label={it.label} value={stat?.[it.key] ?? 0} statKey={it.key} />
                ))}
              </Section>
            </div>

            <Card className="bg-muted/20">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">Total acciones</span>
                    <span className="text-sm font-semibold tabular-nums">{derived.totalActions}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">Faltas totales</span>
                    <span className="text-sm font-semibold tabular-nums">{derived.totalFouls}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">Sup. goles</span>
                    <span className="text-sm font-semibold tabular-nums">{derived.superiorityGoals}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">Sup. eficiencia</span>
                    <span className="text-sm font-semibold tabular-nums">{derived.superiorityEfficiency}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ Confirm modal (si intentas cerrar con cambios sin guardar) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogTitle>¿Salir sin guardar?</DialogTitle>

          <div className="text-sm text-muted-foreground">
            Tienes cambios sin guardar en favoritas. ¿Qué quieres hacer?
          </div>

          <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Seguir editando
            </Button>

            <Button variant="destructive" onClick={confirmCloseWithoutSaving} disabled={saving}>
              Salir sin guardar
            </Button>

            <Button onClick={confirmSaveAndClose} disabled={saving}>
              {saving ? "Guardando..." : "Guardar y salir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
