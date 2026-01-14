"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

interface CustomStatCardDialogProps {
  onAddCard: (statField: string, statLabel: string) => void
}

const AVAILABLE_STATS = [
  // Goles
  { value: "goles_totales", label: "Total de Goles", category: "Goles" },
  { value: "goles_lanzamiento", label: "Goles de Lanzamiento", category: "Goles" },
  { value: "goles_corner", label: "Goles de Corner", category: "Goles" },
  { value: "goles_contraataque", label: "Goles de Contraataque", category: "Goles" },
  { value: "goles_boya_cada", label: "Goles Boya Cada", category: "Goles" },
  { value: "goles_boya_jugada", label: "Goles Boya Jugada", category: "Goles" },
  { value: "goles_hombre_mas", label: "Goles en Superioridad", category: "Goles" },
  { value: "goles_penalti_anotado", label: "Penaltis Anotados", category: "Goles" },

  // Tiros
  { value: "tiros_totales", label: "Total de Tiros", category: "Tiros" },
  { value: "tiros_fuera", label: "Tiros Fuera", category: "Tiros" },
  { value: "tiros_parados", label: "Tiros Parados", category: "Tiros" },
  { value: "tiros_bloqueado", label: "Tiros Bloqueados", category: "Tiros" },

  // Acciones
  { value: "acciones_asistencias", label: "Asistencias", category: "Acciones" },
  { value: "acciones_recuperacion", label: "Recuperaciones", category: "Acciones" },
  { value: "acciones_bloqueo", label: "Bloqueos", category: "Acciones" },
  { value: "acciones_rebote", label: "Rebotes", category: "Acciones" },
  { value: "rebote_recup_hombre_mas", label: "Rebotes Recuperados (Sup.)", category: "Acciones" },

  // Faltas
  { value: "faltas_penalti", label: "Penaltis Provocados", category: "Faltas" },
  { value: "faltas_exp_3_bruta", label: "Exclusiones Brutales", category: "Faltas" },
  { value: "faltas_exp_3_int", label: "Exclusiones Intencionales", category: "Faltas" },
  { value: "faltas_exp_20_1c1", label: "Expulsiones 20s (1c1)", category: "Faltas" },
  { value: "faltas_exp_20_boya", label: "Expulsiones 20s (Boya)", category: "Faltas" },

  // Portero
  { value: "portero_paradas_totales", label: "Paradas Totales", category: "Portero" },
  { value: "portero_paradas_penalti_parado", label: "Penaltis Parados", category: "Portero" },
  { value: "portero_paradas_hombre_menos", label: "Paradas en Inferioridad", category: "Portero" },
  { value: "portero_goles_totales", label: "Goles Recibidos", category: "Portero" },
]

export function CustomStatCardDialog({ onAddCard }: CustomStatCardDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedStat, setSelectedStat] = useState("")
  const [selectedLabel, setSelectedLabel] = useState("")

  const handleAdd = () => {
    if (selectedStat && selectedLabel) {
      onAddCard(selectedStat, selectedLabel)
      setOpen(false)
      setSelectedStat("")
      setSelectedLabel("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"
                className="
                col-span-1 sm:col-span-2 lg:col-span-4
                w-full min-h-[90px] h-30
                border-dashed
                bg-transparent
                p-0
                hover:border-primary hover:bg-muted/40
                transition
            "
            >
            <div className="w-full text-center">
                <div className="py-20 space-y-4">
                <div className="mx-auto w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl leading-none">
                    ＋
                </div>

                <h3 className="text-lg font-semibold">Añadir Card Personalizada</h3>

                </div>
            </div>
        </Button>

      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Card Personalizada</DialogTitle>
          <DialogDescription>Selecciona la estadística que quieres mostrar en una nueva card</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stat">Estadística</Label>
            <Select
              value={selectedStat}
              onValueChange={(value) => {
                setSelectedStat(value)
                const stat = AVAILABLE_STATS.find((s) => s.value === value)
                if (stat) setSelectedLabel(stat.label)
              }}
            >
              <SelectTrigger id="stat">
                <SelectValue placeholder="Selecciona una estadística" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(
                  AVAILABLE_STATS.reduce(
                    (acc, stat) => {
                      if (!acc[stat.category]) acc[stat.category] = []
                      acc[stat.category].push(stat)
                      return acc
                    },
                    {} as Record<string, typeof AVAILABLE_STATS>,
                  ),
                ).map(([category, stats]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{category}</div>
                    {stats.map((stat) => (
                      <SelectItem key={stat.value} value={stat.value}>
                        {stat.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLabel && (
            <div className="rounded-lg border bg-muted p-3">
              <p className="text-sm text-muted-foreground">Vista previa:</p>
              <p className="font-semibold">{selectedLabel}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={!selectedStat}>
            Añadir Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
