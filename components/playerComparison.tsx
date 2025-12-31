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

        const goles = sum("goles_totales")
        const tiros = sum("tiros_totales")

        const paradas = sum("portero_paradas_totales")
        const golesRecibidos = sum("portero_goles_totales")

        return {
          playerId: player.id,
          name: player.name,
          number: player.number,

          goles,
          tiros,
          eficienciaTiro: tiros > 0 ? Math.round((goles / tiros) * 100) : 0,

          asistencias: sum("acciones_asistencias"),
          bloqueos: sum("acciones_bloqueo"),
          recuperaciones: sum("acciones_recuperacion"),
          perdidas: sum("acciones_perdida_poco"),

          paradas,
          porcentajeParadas:
            paradas + golesRecibidos > 0
              ? Math.round((paradas / (paradas + golesRecibidos)) * 100)
              : 0,
        }
      })
  }, [players, stats, selectedIds])

  return (
    <div className="space-y-6">
      {/* EMPTY */}
      {comparisonData.length === 0 && (
        <Card
          onClick={() => setOpen(true)}
          className="
            border-dashed cursor-pointer
            hover:border-primary hover:bg-muted/40
            transition-all group
          "
        >
          <CardContent className="py-20 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl group-hover:scale-105 transition">
              ＋
            </div>

            <h3 className="text-lg font-semibold">
              Añadir jugadores para comparar
            </h3>

            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Pulsa aquí para comparar rendimiento individual.
            </p>
          </CardContent>
        </Card>
      )}

      {/* TAGS */}
      {comparisonData.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {comparisonData.map((p) => (
            <div
              key={p.playerId}
              className="
                flex items-center gap-2 rounded-full
                bg-muted px-3 py-1 text-sm
                hover:bg-muted/70 transition
              "
            >
              <span className="font-medium">
                #{p.number} · {p.name}
              </span>

              <button
                onClick={() => removePlayer(p.playerId)}
                className="
                  ml-1 h-4 w-4 rounded-full
                  flex items-center justify-center
                  text-xs font-bold
                  hover:bg-destructive hover:text-white
                  transition
                "
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TABLE */}
      {comparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparación de Jugadores</CardTitle>
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
                <ComparisonRow label="Goles" field="goles" data={comparisonData} />
                <ComparisonRow label="Eficiencia tiro %" field="eficienciaTiro" data={comparisonData} />
                <ComparisonRow label="Asistencias" field="asistencias" data={comparisonData} />
                <ComparisonRow label="Bloqueos" field="bloqueos" data={comparisonData} />
                <ComparisonRow label="Recuperaciones" field="recuperaciones" data={comparisonData} />
                <ComparisonRow label="Pérdidas" field="perdidas" inverse data={comparisonData} />
                <ComparisonRow label="Paradas" field="paradas" data={comparisonData} />
                <ComparisonRow label="% Paradas" field="porcentajeParadas" data={comparisonData} />
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
                    "flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition",
                    checked
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/40",
                  )}
                >
                  <div>
                    <p className="font-medium">
                      #{p.number} · {p.name}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "h-6 w-6 rounded-full border flex items-center justify-center text-xs font-bold transition",
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
