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
import { useTranslations } from "next-intl"

interface CustomStatCardDialogProps {
  onAddCard: (statField: string, statLabel: string) => void
}

type CategoryKey = "goals" | "shots" | "actions" | "fouls" | "goalkeeper"
type StatItem = { value: string; category: CategoryKey }

const AVAILABLE_STATS: StatItem[] = [
  // Goles
  { value: "goles_totales", category: "goals" }, { value: "goles_lanzamiento", category: "goals" },
  { value: "goles_corner", category: "goals" }, { value: "goles_contraataque", category: "goals" },
  { value: "goles_boya_cada", category: "goals" }, { value: "goles_boya_jugada", category: "goals" },
  { value: "goles_hombre_mas", category: "goals" }, { value: "goles_penalti_anotado", category: "goals" },

  // Tiros
  { value: "tiros_totales", category: "shots" }, { value: "tiros_fuera", category: "shots" },
  { value: "tiros_parados", category: "shots" }, { value: "tiros_bloqueado", category: "shots" },

  // Acciones
  { value: "acciones_asistencias", category: "actions" }, { value: "acciones_recuperacion", category: "actions" },
  { value: "acciones_bloqueo", category: "actions" }, { value: "acciones_rebote", category: "actions" },
  { value: "rebote_recup_hombre_mas", category: "actions" },

  // Faltas
  { value: "faltas_penalti", category: "fouls" }, { value: "faltas_exp_3_bruta", category: "fouls" },
  { value: "faltas_exp_3_int", category: "fouls" }, { value: "faltas_exp_20_1c1", category: "fouls" },
  { value: "faltas_exp_20_boya", category: "fouls" },

  // Portero
  { value: "portero_paradas_totales", category: "goalkeeper" }, { value: "portero_paradas_penalti_parado", category: "goalkeeper" },
  { value: "portero_paradas_hombre_menos", category: "goalkeeper" }, { value: "portero_goles_totales", category: "goalkeeper" },
  { value: "portero_goles_extremo", category: "goalkeeper" },
]

const CATEGORY_META: Record<CategoryKey, { badgeClass: string }> = {
  goals: {
    badgeClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  shots: {
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  actions: {
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  fouls: {
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  goalkeeper: {
    badgeClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  },
}

export function CustomStatCardDialog({ onAddCard }: CustomStatCardDialogProps) {
  const t = useTranslations("CustomStatCard")
  const [open, setOpen] = useState(false)

  const categories = useMemo(() => {
    const set = new Set(AVAILABLE_STATS.map((s) => s.category))
    return Array.from(set)
  }, [])

  const [category, setCategory] = useState<CategoryKey>(categories[0] ?? "goals")
  const [query, setQuery] = useState("")
  const [selectedStat, setSelectedStat] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return AVAILABLE_STATS
      .filter((s) => s.category === category)
      .filter((s) => (q ? `${t(`stats.${s.value}` as any)} ${s.value}`.toLowerCase().includes(q) : true))
  }, [category, query, t])

  const selected = useMemo(
    () => AVAILABLE_STATS.find((s) => s.value === selectedStat),
    [selectedStat],
  )

  const reset = () => {
    setSelectedStat("")
    setQuery("")
  }

  const handleAdd = () => {
    if (selectedStat && selected) {
      onAddCard(selectedStat, t(`stats.${selected.value}` as any))
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
          <h3 className="text-base sm:text-lg font-semibold">{t("addCustomCard")}</h3>
          <p className="text-xs text-muted-foreground">{t("chooseCategoryAndStat")}</p>
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
          {t("createCustomCard")}
        </DialogTitle>
        <DialogDescription>
          {t("dialogDescription")}
        </DialogDescription>
      </DialogHeader>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-[1fr_360px]">
      {/* LEFT: SELECCIÓN */}
      <div className="p-6 pt-5">
        <div className="space-y-5">
          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category">{t("category")}</Label>

            <div className="flex items-center gap-3">
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v as CategoryKey)
                  setSelectedStat("")
                  setQuery("")
                }}
              >
                <SelectTrigger id="category" className="h-11">
                  <SelectValue placeholder={t("chooseCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => {
                    const meta = CATEGORY_META[c]
                    return (
                      <SelectItem key={c} value={c}>
                        {t(`categories.${c}`)}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <div className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <Badge variant="outline" className={CATEGORY_META[category]?.badgeClass ?? ""}>
                  {t(`categories.${category}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">{t("options", { count: filtered.length })}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {t(`hints.${category}`)}
            </p>
          </div>
          {/* Selector stats (más limpio, con scroll controlado) */}
          <div className="space-y-2">
            <Label htmlFor="stat">{t("stat")}</Label>

            <Select
              value={selectedStat}
              onValueChange={(value) => {
                setSelectedStat(value)
              }}
              disabled={!category}
            >
              <SelectTrigger id="stat" className="h-11">
                <SelectValue placeholder={t("chooseStat")} />
              </SelectTrigger>

              <SelectContent className="max-h-[340px]">
                {filtered.length ? (
                  filtered.map((stat) => (
                    <SelectItem key={stat.value} value={stat.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{t(`stats.${stat.value}` as any)}</span>
                        <span className="text-[11px] text-muted-foreground">{stat.value}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {t("noResults", { query })}
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
            <p className="text-sm font-semibold">{t("preview")}</p>

            {selected ? (
              <Badge variant="outline" className={CATEGORY_META[selected.category]?.badgeClass ?? ""}>
                {t(`categories.${selected.category}`)}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {t("noSelection")}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {t("previewHint")}
          </p>

          {/* Card preview grande */}
          <div className="mt-4 flex-1">
            <div className="rounded-2xl border bg-card shadow-sm p-5 h-full flex flex-col justify-between">
              {selected ? (
                <>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">{t("title")}</div>
                    <div className="text-lg font-semibold leading-snug">{t(`stats.${selected.value}` as any)}</div>

                    <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">{t("field")}</div>
                      <div className="font-mono text-xs break-all">{selected.value}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-xs text-muted-foreground">{t("exampleValue")}</div>
                    <div className="text-4xl font-extrabold tabular-nums mt-1">12</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("realValueHint")}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Plus className="w-5 h-5" />
                  </div>
                  <p className="mt-3 font-semibold">{t("emptyTitle")}</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                    {t("emptyDescription")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Acciones abajo (alineadas y limpias) */}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleAdd} disabled={!selectedStat} className="min-w-[140px]">
              {t("addCard")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>

  )
}
