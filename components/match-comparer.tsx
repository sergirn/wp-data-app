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
import type { Match, MatchStats } from "@/lib/types"
import { calculateMatchTotals } from "@/lib/match-comparison"
import { ComparisonRow } from "./comparisionRow"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface MatchComparisonProps {
  matches: Match[]
  stats: MatchStats[]
}

export function MatchComparison({ matches, stats }: MatchComparisonProps) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const toggleMatch = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    )
  }

  const removeMatch = (id: number) => {
    setSelectedIds((prev) => prev.filter((m) => m !== id))
  }

  const comparisonData = useMemo(() => {
    return matches
      .filter((m) => selectedIds.includes(m.id))
      .map((m) => calculateMatchTotals(m, stats))
  }, [matches, stats, selectedIds])

  return (
    <div className="space-y-6">
      {/* EMPTY / CTA */}
      {comparisonData.length === 0 && (
        <Card
          onClick={() => setOpen(true)}
          className="
            border-dashed cursor-pointer
            hover:border-primary hover:bg-muted/40
            transition-all
            group
          "
        >
          <CardContent className="py-20 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl group-hover:scale-105 transition">
              ＋
            </div>

            <h3 className="text-lg font-semibold">
              Añadir partidos para comparar
            </h3>

            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Pulsa aquí para seleccionar partidos y comparar ataque,
              defensa y portería.
            </p>
          </CardContent>
        </Card>
      )}

      {/* TAGS */}
      {comparisonData.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {comparisonData.map((m) => (
            <div
              key={m.matchId}
              className="
                flex items-center gap-2 rounded-full
                bg-muted px-3 py-1 text-sm
                hover:bg-muted/70 transition
              "
            >
              <span className="font-medium">
                {m.jornada} · {m.opponent}
              </span>

              <button
                onClick={() => removeMatch(m.matchId)}
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
            <CardTitle>Comparación Detallada</CardTitle>
            <CardDescription>
              Verde indica el mejor valor en cada estadística
            </CardDescription>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estadística</TableHead>
                  {comparisonData.map((m) => (
                    <TableHead key={m.matchId} className="text-center">
                      <div className="font-semibold">{m.jornada}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.opponent}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                <ComparisonRow label="Goles" field="goles" data={comparisonData} />
                <ComparisonRow label="Eficiencia tiro %" field="eficienciaTiro" data={comparisonData} />
                <ComparisonRow
                  label="Hombre de más"
                  field="golesHombreMas"
                  extraField="fallosHombreMas"
                  data={comparisonData}
                />
                <ComparisonRow label="Bloqueos" field="bloqueos" data={comparisonData} />
                <ComparisonRow label="Recuperaciones" field="recuperaciones" data={comparisonData} />
                <ComparisonRow label="Pérdidas" field="perdidas" inverse data={comparisonData} />
                <ComparisonRow label="Paradas portero" field="paradasPortero" data={comparisonData} />
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
            <DialogTitle>Seleccionar partidos</DialogTitle>
            <DialogDescription>
              Pulsa sobre los partidos que quieras comparar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {matches.map((m) => {
              const checked = selectedIds.includes(m.id)

              return (
                <div
                  key={m.id}
                  onClick={() => toggleMatch(m.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition",
                    checked
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/40",
                  )}
                >
                  <div>
                    <p className="font-medium">
                      J{m.jornada ?? "-"} · {m.opponent}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.home_score}-{m.away_score}
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
