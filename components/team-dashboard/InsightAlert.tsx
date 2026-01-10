import { cn } from "@/lib/utils"

interface InsightAlertProps {
  text: string
  type?: "good" | "warning" | "bad"
}

export function InsightAlert({
  text,
  type = "warning",
}: InsightAlertProps) {
  return (
    <div
      className={cn(
        "rounded-md p-3 text-sm",
        type === "good" && "bg-green-500/10 text-green-700",
        type === "warning" && "bg-yellow-500/10 text-yellow-700",
        type === "bad" && "bg-red-500/10 text-red-700"
      )}
    >
      {text}
    </div>
  )
}
