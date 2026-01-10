import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  delta?: number
}

export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>

      {delta !== undefined && (
        <p
          className={cn(
            "text-xs",
            delta > 0 && "text-green-600",
            delta < 0 && "text-red-600"
          )}
        >
          {delta > 0 && "+"}
          {delta}%
        </p>
      )}
    </div>
  )
}
