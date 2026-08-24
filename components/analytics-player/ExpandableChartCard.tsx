"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { BarChart3, Table2 } from "lucide-react"
import { useTranslations } from "next-intl"

type ViewMode = "chart" | "table"

interface ExpandableChartCardProps {
  title: string
  description?: React.ReactNode
  icon?: React.ReactNode
  className?: string

  // Render
  renderChart: (opts: { compact: boolean }) => React.ReactNode
  renderTable: () => React.ReactNode

  // Opcional: badge/resumen en el header
  rightHeader?: React.ReactNode
}

export function ExpandableChartCard({
  title,
  description,
  icon,
  className,
  renderChart,
  renderTable,
  rightHeader,
}: ExpandableChartCardProps) {
  const t = useTranslations("ChartTemplates")
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ViewMode>("chart")
  const hasHeader = Boolean(title || description || icon || rightHeader)

  // Si cierras, vuelve a gráfico por defecto
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setView("chart")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Card className={`cursor-pointer hover:opacity-95 transition ${className ?? ""}`}>
          {hasHeader ? (
            <CardHeader className="space-y-1 p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    {icon}
                    <span className="truncate">{title}</span>
                  </CardTitle>
                  {description ? <CardDescription className="truncate">{description}</CardDescription> : null}
                </div>

                {rightHeader ? <div className="shrink-0">{rightHeader}</div> : null}
              </div>
            </CardHeader>
          ) : null}

          <CardContent className={`min-w-0 w-full overflow-hidden ${hasHeader ? "px-4 pb-4" : "p-0"}`}>
            {/* Compact: sin switch, solo gráfico */}
            {renderChart({ compact: true })}
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent
        className="
          !w-[98vw] !max-w-[70vw]
          !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2
          p-3 sm:p-4
          max-h-[95vh] overflow-y-auto
        "
      >
        <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2">
                {icon}
                <span className="truncate">{title}</span>
                </DialogTitle>
                {description ? <p className="text-sm text-muted-foreground truncate">{description}</p> : null}
            </div>

            <div className="flex items-center gap-5 rounded-lg border bg-card px-3 py-2 mr-8">
              <BarChart3 className={`h-4 w-4 ${view === "chart" ? "text-foreground" : "text-muted-foreground"}`} />
              <Switch
                checked={view === "table"}
                onCheckedChange={(v) => setView(v ? "table" : "chart")}
                aria-label={t("switchView")}
              />
              <Table2 className={`h-4 w-4 ${view === "table" ? "text-foreground" : "text-muted-foreground"}`} />
            </div>
            </div>
        </DialogHeader>

        <div className="min-w-0 w-full overflow-hidden">
            {view === "chart" ? renderChart({ compact: false }) : renderTable()}
        </div>
        </DialogContent>

    </Dialog>
  )
}
