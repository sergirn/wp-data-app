"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Eye } from "lucide-react"
import type { MatchWithQuarterScores } from "@/lib/types"

/* =============================
   Tipos
============================= */
type QuarterKey = "q1" | "q2" | "q3" | "q4"

/* =============================
   Mapa explícito de cuartos
============================= */
const QUARTERS = [
  { key: "q1", label: "Q1", for: "q1_score", against: "q1_score_rival" },
  { key: "q2", label: "Q2", for: "q2_score", against: "q2_score_rival" },
  { key: "q3", label: "Q3", for: "q3_score", against: "q3_score_rival" },
  { key: "q4", label: "Q4", for: "q4_score", against: "q4_score_rival" },
] as const

interface Props {
  matches: MatchWithQuarterScores[]
}

export function QuarterGoalsChart({ matches }: Props) {
  const games = matches.length || 1
  const [openQuarter, setOpenQuarter] = useState<QuarterKey | null>(null)

  /* =============================
     Datos agregados por cuarto
  ============================= */
  const data = QUARTERS.map((q) => {
    const goalsFor =
      matches.reduce((sum, m) => sum + (Number(m[q.for]) || 0), 0) / games

    const goalsAgainst =
      matches.reduce((sum, m) => sum + (Number(m[q.against]) || 0), 0) / games

    return {
      key: q.key,
      quarter: q.label,
      goalsFor: Number(goalsFor.toFixed(2)),
      goalsAgainst: Number(goalsAgainst.toFixed(2)),
      differential: Number((goalsFor - goalsAgainst).toFixed(2)),
    }
  })

  const bestQuarter = [...data].sort(
    (a, b) => b.differential - a.differential
  )[0]

  const worstQuarter = [...data].sort(
    (a, b) => a.differential - b.differential
  )[0]

  /* =============================
     Detalle por partido y cuarto
  ============================= */
  const quarterMatches = openQuarter
    ? (() => {
        const q = QUARTERS.find((x) => x.key === openQuarter)!
        return matches.map((m) => {
          const gf = Number(m[q.for]) || 0
          const ga = Number(m[q.against]) || 0
          return {
            id: m.id,
            opponent: m.opponent,
            goalsFor: gf,
            goalsAgainst: ga,
            differential: gf - ga,
          }
        })
      })()
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento por Cuartos</CardTitle>
        <CardDescription>
          Diferencial medio de goles por cuarto (media de todos los partidos)
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* ===== KPIs ===== */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Mejor cuarto</p>
            <p className="text-lg font-bold text-green-600">
              {bestQuarter.quarter} ({bestQuarter.differential})
            </p>
          </div>

          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Peor cuarto</p>
            <p className="text-lg font-bold text-red-600">
              {worstQuarter.quarter} ({worstQuarter.differential})
            </p>
          </div>
        </div>

        {/* ===== GRÁFICO ===== */}
        <ChartContainer
          config={{
            differential: {
              label: "Diferencial medio",
              color: "hsl(217, 91%, 60%)",
            },
          }}
        >
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={30} />
                <ReferenceLine
                y={0}
                stroke="#8a8a8aff"        // azul (tailwind blue-600)
                strokeWidth={3}
                strokeDasharray="0"     // línea continua (más clara)
                ifOverflow="extendDomain"
                />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="differential" maxBarSize={48} radius={[6, 6, 6, 6]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.differential > 0
                        ? "hsl(142, 71%, 45%)"
                        : d.differential < 0
                        ? "hsl(0, 84%, 60%)"
                        : "hsl(217, 91%, 60%)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* ===== TABLA DESPLEGABLE ===== */}
        <Accordion type="single" collapsible className="mt-6">
        <AccordionItem
            value="table"
            className="rounded-xl border bg-muted/20"
        >
            <AccordionTrigger
            className="
                px-4 py-3
                text-sm font-medium
                rounded-xl
                hover:no-underline
                bg-muted/30
                hover:bg-muted/40
                transition-colors
            "
            >
            Ver datos base por cuarto
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
            <div className="rounded-lg border bg-background overflow-x-auto mt-3">
                <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-muted/50">
                    <tr>
                    <th className="px-3 py-2 text-center">Parcial</th>
                    <th className="px-3 py-2 text-center">GF</th>
                    <th className="px-3 py-2 text-center">GC</th>
                    <th className="px-3 py-2 text-center">DIF</th>
                    <th className="px-3 py-2 text-center w-10"></th>
                    </tr>
                </thead>

                <tbody>
                    {data.map((q) => (
                    <tr
                        key={q.key}
                        onClick={() => setOpenQuarter(q.key)}
                        className="border-t cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                        <td className="px-3 py-2 text-center font-bold">
                        {q.quarter}
                        </td>
                        <td className="px-3 py-2 text-center">
                        {q.goalsFor}
                        </td>
                        <td className="px-3 py-2 text-center">
                        {q.goalsAgainst}
                        </td>
                        <td
                        className={`px-3 py-2 text-center font-bold ${
                            q.differential > 0
                            ? "text-green-600"
                            : q.differential < 0
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                        >
                        {q.differential > 0 && "+"}
                        {q.differential}
                        </td>
                        <td className="px-3 py-2 text-center text-muted-foreground">
                        <Eye className="h-4 w-4 inline-block" />
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </AccordionContent>
        </AccordionItem>
        </Accordion>


        {/* ===== POPUP ===== */}
        <Dialog open={!!openQuarter} onOpenChange={() => setOpenQuarter(null)}>
          <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Detalle de partidos –{" "}
                {openQuarter &&
                  QUARTERS.find((q) => q.key === openQuarter)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 rounded-lg border overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Rival</th>
                    <th className="px-3 py-2 text-center">GF</th>
                    <th className="px-3 py-2 text-center">GC</th>
                    <th className="px-3 py-2 text-center">DIF</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterMatches.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-3 py-2">{m.opponent}</td>
                      <td className="px-3 py-2 text-center">
                        {m.goalsFor}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {m.goalsAgainst}
                      </td>
                      <td
                        className={`px-3 py-2 text-center font-semibold ${
                          m.differential > 0
                            ? "text-green-600"
                            : m.differential < 0
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {m.differential > 0 && "+"}
                        {m.differential}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
