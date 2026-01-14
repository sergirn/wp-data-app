"use client"

import { Card, CardContent } from "@/components/ui/card"
import { KpiItemGK } from "@/lib/GoalkeeperKpis"

export function KpiGridGoalkeeper({
  items,
  className,
}: {
  items: KpiItemGK[]
  className?: string
}) {
  return (
    <div className={`grid gap-4 grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 mb-6 ${className ?? ""}`}>
      {items.map((k) => (
        <Card key={k.key} className={k.cardClass ?? "bg-gradient-to-br from-background to-muted"}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold">{k.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{k.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
