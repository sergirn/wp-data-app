import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface ComparisonRowProps {
  label: string
  field: string
  extraField?: string
  inverse?: boolean
  data: any[]
}

export function ComparisonRow({
  label,
  field,
  extraField,
  inverse = false,
  data,
}: ComparisonRowProps) {
  const values = data.map((d) => d[field])
  const bestValue = inverse
    ? Math.min(...values)
    : Math.max(...values)

  return (
    <TableRow>
      {/* LABEL */}
      <TableCell className="font-medium">
        {label}
      </TableCell>

      {/* VALUES */}
      {data.map((item) => {
        const value = item[field]
        const isBest = value === bestValue

        return (
          <TableCell
            key={`${label}-${item.matchId ?? item.playerId}`}
            className={cn(
              "text-center font-semibold transition-colors",
              isBest &&
                (inverse
                  ? "bg-red-500/10 text-red-600"
                  : "bg-green-500/10 text-green-600"),
            )}
          >
            {extraField
              ? `${item[field]}/${item[extraField]}`
              : item[field]}
          </TableCell>
        )
      })}
    </TableRow>
  )
}
