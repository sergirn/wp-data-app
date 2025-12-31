"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Player, MatchStats } from "@/lib/types"
import { ComparisonRow } from "./comparisionRow"

interface PlayerComparisonProps {
  players: Player[]
  stats: MatchStats[]
}

export function PlayerComparison({ players, stats }: PlayerComparisonProps) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const togglePlayer = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const removePlayer = (id: number) => {
    setSelectedIds((prev) => prev.filter((p) => p !== id))
  }

  /* --------------------------------
     AGREGACIÓN DE STATS POR JUGADOR
  ---------------------------------*/
  const comparisonData = useMemo(() => {
    return players
      .filter((p) => selectedIds.includes(p.id))
      .map((player) => {
        const s = stats.filter((st) => st.player_id === player.id)

        const sum = (key: keyof MatchStats) =>
          s.reduce((acc, x) => acc + (x[key] || 0), 0)

        const isGoalkeeper = player.is_goalkeeper === true

        /* ===== JUGADOR DE CAMPO ===== */
        const goles = sum("goles_totales")
        const tiros = sum("tiros_totales")

        const golesHombreMas = sum("goles_hombre_mas")
        const fallosHombreMas =
          sum("tiros_hombre_mas") + sum("tiros_penalti_fallado")

        const eficienciaTiro =
          tiros > 0 ? Math.round((goles / tiros) * 100) : 0

        const eficienciaHombreMas =
          golesHombreMas + fallosHombreMas > 0
            ? Math.round(
                (golesHombreMas /
                  (golesHombreMas + fallosHombreMas)) *
                  100,
              )
            : 0

        const asistencias = sum("acciones_asistencias")
        const bloqueos = sum("acciones_bloqueo")
        const recuperaciones = sum("acciones_recuperacion")
        const perdidas = sum("acciones_perdida_poco")
        const balancePosesion = recuperaciones - perdidas

        /* ===== PORTERO ===== */
        const paradas = sum("portero_paradas_totales")
        const paradasHombreMenos = sum("portero_paradas_hombre_menos")
        const paradasRecuperacion = sum("portero_paradas_parada_recup")

        const golesRecibidos = sum("portero_goles_totales")
        const golesHombreMenos = sum("portero_goles_hombre_menos")

        const porcentajeParadas =
          paradas + golesRecibidos > 0
            ? Math.round((paradas / (paradas + golesRecibidos)) * 100)
            : 0

        const eficienciaInferioridad =
          paradasHombreMenos + golesHombreMenos > 0
            ? Math.round(
                (paradasHombreMenos /
                  (paradasHombreMenos + golesHombreMenos)) *
                  100,
              )
            : 0

        return {
          playerId: player.id,
          name: player.name,
          number: player.number,
          isGoalkeeper,

          /* Campo */
          goles,
          tiros,
          eficienciaTiro,
          golesHombreMas,
          fallosHombreMas,
          eficienciaHombreMas,
          asistencias,
          bloqueos,
          recuperaciones,
          perdidas,
          balancePosesion,

          /* Portero */
          paradas,
          golesRecibidos,
          porcentajeParadas,
          paradasHombreMenos,
          eficienciaInferioridad,
          paradasRecuperacion,
        }
      })
  }, [players, stats, selectedIds])

  const hasPlayers = comparisonData.length > 0
  const allGoalkeepers = hasPlayers && comparisonData.every((p) => p.isGoalkeeper)
  const allFieldPlayers = hasPlayers && comparisonData.every((p) => !p.isGoalkeeper)
  const mixed = hasPlayers && !allGoalkeepers && !allFieldPlayers

  return (
    <div className="space-y-6">
      {/* EMPTY */}
      {!hasPlayers && (
        <Card
          onClick={() => setOpen(true)}
          className="border-dashed cursor-pointer hover:border-primary hover:bg-muted/40 transition"
        >
          <CardContent className="py-20 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl">
              ＋
            </div>
            <h3 className="text-lg font-semibold">
              Añadir jugadores para comparar
            </h3>
            <p className="text-muted-foreground text-sm">
              Comparación avanzada de rendimiento individual
            </p>
          </CardContent>
        </Card>
      )}

      {/* TAGS */}
      {hasPlayers && (
        <div className="flex flex-wrap gap-2">
          {comparisonData.map((p) => (
            <div
              key={p.playerId}
              className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"
            >
              #{p.number} · {p.name}
              <button
                onClick={() => removePlayer(p.playerId)}
                className="ml-1 h-4 w-4 rounded-full text-xs hover:bg-destructive hover:text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MIXED WARNING */}
      {mixed && (
        <Card className="border-destructive">
          <CardContent className="py-6 text-center text-sm text-destructive">
            No se pueden comparar porteros con jugadores de campo.
          </CardContent>
        </Card>
      )}

      {/* TABLE */}
      {(allFieldPlayers || allGoalkeepers) && (
        <Card>
          <CardHeader>
            <CardTitle>
              Comparación de {allGoalkeepers ? "Porteros" : "Jugadores"}
            </CardTitle>
            <CardDescription>
              Verde indica el mejor valor en cada estadística
            </CardDescription>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estadística</TableHead>
                  {comparisonData.map((p) => (
                    <TableHead key={p.playerId} className="text-center">
                      <div className="font-semibold">#{p.number}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.name}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {allFieldPlayers && (
                  <>
                    <ComparisonRow key="goles" label="Goles" field="goles" data={comparisonData} />
                    <ComparisonRow key="efTiro" label="Eficiencia tiro %" field="eficienciaTiro" data={comparisonData} />
                    <ComparisonRow key="hmas" label="Goles en H+" field="golesHombreMas" data={comparisonData} />
                    <ComparisonRow key="efHmas" label="Eficiencia H+ %" field="eficienciaHombreMas" data={comparisonData} />
                    <ComparisonRow key="asist" label="Asistencias" field="asistencias" data={comparisonData} />
                    <ComparisonRow key="bloq" label="Bloqueos" field="bloqueos" data={comparisonData} />
                    <ComparisonRow key="rec" label="Recuperaciones" field="recuperaciones" data={comparisonData} />
                    <ComparisonRow key="bal" label="Balance posesión" field="balancePosesion" data={comparisonData} />
                    <ComparisonRow key="perd" label="Pérdidas" field="perdidas" inverse data={comparisonData} />
                  </>
                )}

                {allGoalkeepers && (
                  <>
                    <ComparisonRow key="par" label="Paradas" field="paradas" data={comparisonData} />
                    <ComparisonRow key="porc" label="% Paradas" field="porcentajeParadas" data={comparisonData} />
                    <ComparisonRow key="rec" label="Goles recibidos" field="golesRecibidos" inverse data={comparisonData} />
                    <ComparisonRow key="hm" label="Paradas en inferioridad" field="paradasHombreMenos" data={comparisonData} />
                    <ComparisonRow key="efhm" label="Eficiencia inferioridad %" field="eficienciaInferioridad" data={comparisonData} />
                    <ComparisonRow key="prec" label="Paradas + recuperación" field="paradasRecuperacion" data={comparisonData} />
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Seleccionar jugadores</DialogTitle>
            <DialogDescription>
              Pulsa sobre los jugadores que quieras comparar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {players.map((p) => {
              const checked = selectedIds.includes(p.id)

              return (
                <div
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition",
                    checked
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/40",
                  )}
                >
                  <p className="font-medium">
                    #{p.number} · {p.name}
                    {p.is_goalkeeper && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Portero)
                      </span>
                    )}
                  </p>

                  <div
                    className={cn(
                      "h-6 w-6 rounded-full border flex items-center justify-center text-xs font-bold",
                      checked
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {checked && "✓"}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setOpen(false)}>
              Confirmar ({selectedIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
