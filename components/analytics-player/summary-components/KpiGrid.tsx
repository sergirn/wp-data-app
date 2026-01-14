"use client"

import { Card, CardContent } from "@/components/ui/card"
import { KpiItem } from "@/lib/PlayerKpis"


export function KpiGrid({
  items,
  className,
}: {
  items: KpiItem[]
  className?: string
}) {
  return (
    <div className={`grid gap-4 grid-cols-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 mb-6 ${className ?? ""}`}>
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
