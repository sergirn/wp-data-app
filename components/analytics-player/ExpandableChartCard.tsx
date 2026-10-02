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
        <Card className={`flex h-full min-w-0 cursor-pointer flex-col overflow-hidden transition hover:border-primary/25 hover:shadow-md ${className ?? ""}`}>
          {hasHeader ? (
            <CardHeader className="min-h-[82px] space-y-1 p-3 pb-2.5 sm:min-h-[88px] sm:p-4 sm:pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    {icon}
                    <span className="truncate">{title}</span>
                  </CardTitle>
                  {description ? <CardDescription className="line-clamp-2 text-xs leading-4 sm:text-sm">{description}</CardDescription> : null}
                </div>

                {rightHeader ? <div className="max-w-24 shrink-0 truncate">{rightHeader}</div> : null}
              </div>
            </CardHeader>
          ) : null}

          <CardContent className={`min-w-0 w-full flex-1 overflow-hidden [&_.recharts-default-legend]:!flex [&_.recharts-default-legend]:!flex-wrap [&_.recharts-default-legend]:!justify-center [&_.recharts-default-legend]:gap-x-2 [&_.recharts-default-legend]:gap-y-0.5 [&_.recharts-legend-item]:!mr-0 ${hasHeader ? "px-3 pb-3 sm:px-4 sm:pb-4" : "p-0"}`}>
            {/* Compact: sin switch, solo gráfico */}
            {renderChart({ compact: true })}
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent
        className="!left-1/2 !top-1/2 !h-[calc(100dvh-1rem)] !w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] !-translate-x-1/2 !-translate-y-1/2 overflow-y-auto p-3 sm:!h-auto sm:!max-h-[92dvh] sm:!w-[min(94vw,72rem)] sm:!max-w-[72rem] sm:p-5"
      >
        <DialogHeader className="space-y-2">
            <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2">
                {icon}
                <span className="break-words">{title}</span>
                </DialogTitle>
                {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>

            <div className="flex w-fit items-center gap-4 rounded-lg border bg-card px-3 py-2 sm:mr-8">
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

        <div className="min-w-0 w-full overflow-hidden [&_.recharts-default-legend]:!flex [&_.recharts-default-legend]:!flex-wrap [&_.recharts-default-legend]:!justify-center [&_.recharts-default-legend]:gap-x-3 [&_.recharts-default-legend]:gap-y-1 [&_.recharts-legend-item]:!mr-0">
            {view === "chart" ? renderChart({ compact: false }) : renderTable()}
        </div>
        </DialogContent>

    </Dialog>
  )
}
