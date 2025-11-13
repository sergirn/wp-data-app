"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Minus, Plus } from "lucide-react"

interface StatInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  min?: number
}

export function StatInput({ value, onChange, label, min = 0 }: StatInputProps) {
  const handleIncrement = () => onChange(value + 1)
  const handleDecrement = () => {
    if (value > min) onChange(value - 1)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 shrink-0 bg-transparent"
        onClick={handleDecrement}
        disabled={value <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const newValue = Number.parseInt(e.target.value) || 0
          if (newValue >= min) onChange(newValue)
        }}
        className="h-7 w-12 text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        min={min}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 shrink-0 bg-transparent"
        onClick={handleIncrement}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}
