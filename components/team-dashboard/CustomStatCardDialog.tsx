"use client"

import { useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Sparkles } from "lucide-react"

interface CustomStatCardDialogProps {
  onAddCard: (statField: string, statLabel: string) => void
}

type StatItem = { value: string; label: string; category: string }

const AVAILABLE_STATS: StatItem[] = [
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
  { value: "faltas_exp_20_1c1", label: 'Expulsiones 20s (1c1)', category: "Faltas" },
  { value: "faltas_exp_20_boya", label: 'Expulsiones 20s (Boya)', category: "Faltas" },

  // Portero
  { value: "portero_paradas_totales", label: "Paradas Totales", category: "Portero" },
  { value: "portero_paradas_penalti_parado", label: "Penaltis Parados", category: "Portero" },
  { value: "portero_paradas_hombre_menos", label: "Paradas en Inferioridad", category: "Portero" },
  { value: "portero_goles_totales", label: "Goles Recibidos", category: "Portero" },
]

const CATEGORY_META: Record<
  string,
  { label: string; hint: string; badgeClass: string }
> = {
  Goles: {
    label: "Goles",
    hint: "Anotación y tipos de gol",
    badgeClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  Tiros: {
    label: "Tiros",
    hint: "Volumen y resultados del tiro",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  Acciones: {
    label: "Acciones",
    hint: "Aportes generales",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  Faltas: {
    label: "Faltas",
    hint: "Sanciones, exclusiones y penaltis",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  Portero: {
    label: "Portero",
    hint: "Paradas y goles recibidos",
    badgeClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  },
}

export function CustomStatCardDialog({ onAddCard }: CustomStatCardDialogProps) {
  const [open, setOpen] = useState(false)

  const categories = useMemo(() => {
    const set = new Set(AVAILABLE_STATS.map((s) => s.category))
    return Array.from(set)
  }, [])

  const [category, setCategory] = useState(categories[0] ?? "Goles")
  const [query, setQuery] = useState("")
  const [selectedStat, setSelectedStat] = useState("")
  const [selectedLabel, setSelectedLabel] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return AVAILABLE_STATS
      .filter((s) => s.category === category)
      .filter((s) => (q ? `${s.label} ${s.value}`.toLowerCase().includes(q) : true))
  }, [category, query])

  const selected = useMemo(
    () => AVAILABLE_STATS.find((s) => s.value === selectedStat),
    [selectedStat],
  )

  const reset = () => {
    setSelectedStat("")
    setSelectedLabel("")
    setQuery("")
  }

  const handleAdd = () => {
    if (selectedStat && selectedLabel) {
      onAddCard(selectedStat, selectedLabel)
      setOpen(false)
      reset()
    }
  }

  return (
    <Dialog
  open={open}
  onOpenChange={(v) => {
    setOpen(v)
    if (!v) reset()
  }}
>
  <DialogTrigger asChild>
    <Button
      variant="outline"
      className="
        col-span-1 sm:col-span-2 lg:col-span-4
        w-full min-h-[150px]
        border-dashed bg-transparent p-0
        hover:border-primary hover:bg-muted/40 transition
      "
    >
      <div className="w-full text-center">
        <div className="py-14 sm:py-16 space-y-3">
          <div className="mx-auto w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Plus className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold">Añadir Card Personalizada</h3>
          <p className="text-xs text-muted-foreground">Elige categoría y estadística</p>
        </div>
      </div>
    </Button>
  </DialogTrigger>

  {/* MÁS ANCHO Y CON LAYOUT A 2 COLUMNAS */}
<DialogContent
  className="
    !max-w-none sm:!max-w-none
    !w-[calc(100vw-1rem)] sm:!w-[calc(100vw-2rem)] lg:!w-[min(800px,calc(100vw-4rem))]
    max-h-[100vh] overflow-y-auto
  "
>
    <div className="p-6 pb-4 border-b">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Crear Card Personalizada
        </DialogTitle>
        <DialogDescription>
          Selecciona una categoría y después una estadística. A la derecha verás la previsualización.
        </DialogDescription>
      </DialogHeader>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-[1fr_360px]">
      {/* LEFT: SELECCIÓN */}
      <div className="p-6 pt-5">
        <div className="space-y-5">
          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>

            <div className="flex items-center gap-3">
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v)
                  setSelectedStat("")
                  setSelectedLabel("")
                  setQuery("")
                }}
              >
                <SelectTrigger id="category" className="h-11">
                  <SelectValue placeholder="Elige una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => {
                    const meta = CATEGORY_META[c]
                    return (
                      <SelectItem key={c} value={c}>
                        {meta?.label ?? c}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <div className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <Badge variant="outline" className={CATEGORY_META[category]?.badgeClass ?? ""}>
                  {CATEGORY_META[category]?.label ?? category}
                </Badge>
                <span className="text-xs text-muted-foreground">{filtered.length} opciones</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {CATEGORY_META[category]?.hint ?? "—"}
            </p>
          </div>
          {/* Selector stats (más limpio, con scroll controlado) */}
          <div className="space-y-2">
            <Label htmlFor="stat">Estadística</Label>

            <Select
              value={selectedStat}
              onValueChange={(value) => {
                setSelectedStat(value)
                const stat = AVAILABLE_STATS.find((s) => s.value === value)
                if (stat) setSelectedLabel(stat.label)
              }}
              disabled={!category}
            >
              <SelectTrigger id="stat" className="h-11">
                <SelectValue placeholder="Selecciona una estadística" />
              </SelectTrigger>

              <SelectContent className="max-h-[340px]">
                {filtered.length ? (
                  filtered.map((stat) => (
                    <SelectItem key={stat.value} value={stat.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{stat.label}</span>
                        <span className="text-[11px] text-muted-foreground">{stat.value}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No hay resultados para “{query}”
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* RIGHT: PREVIEW */}
      <div className="border-t md:border-t-0 md:border-l bg-muted/20">
        <div className="p-6 pt-5 h-full flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Previsualización</p>

            {selected ? (
              <Badge variant="outline" className={CATEGORY_META[selected.category]?.badgeClass ?? ""}>
                {selected.category}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Sin selección
              </Badge>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Así quedará la card en el dashboard.
          </p>

          {/* Card preview grande */}
          <div className="mt-4 flex-1">
            <div className="rounded-2xl border bg-card shadow-sm p-5 h-full flex flex-col justify-between">
              {selected ? (
                <>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Título</div>
                    <div className="text-lg font-semibold leading-snug">{selected.label}</div>

                    <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Campo</div>
                      <div className="font-mono text-xs break-all">{selected.value}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-xs text-muted-foreground">Ejemplo de valor</div>
                    <div className="text-4xl font-extrabold tabular-nums mt-1">12</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      (El valor real depende del jugador/club)
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Plus className="w-5 h-5" />
                  </div>
                  <p className="mt-3 font-semibold">Elige una estadística</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                    Selecciona categoría y estadística para ver la previsualización aquí.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Acciones abajo (alineadas y limpias) */}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={!selectedStat} className="min-w-[140px]">
              Añadir Card
            </Button>
          </div>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>

  )
}
