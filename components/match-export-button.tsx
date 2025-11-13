"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, Printer } from "lucide-react"
import { exportToCSV, prepareMatchStatsForExport, generateMatchReportHTML, printMatchReport } from "@/lib/export-utils"
import type { Match, Player, MatchStats } from "@/lib/types"

interface MatchExportButtonProps {
  match: Match
  players: Player[]
  stats: MatchStats[]
}

export function MatchExportButton({ match, players, stats }: MatchExportButtonProps) {
  const handleExportCSV = () => {
    const data = prepareMatchStatsForExport(match, players, stats)
    exportToCSV(data, `partido_${match.opponent}_${match.match_date}`)
  }

  const handlePrintPDF = () => {
    const html = generateMatchReportHTML(match, players, stats)
    printMatchReport(html)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar a Excel (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrintPDF}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / Guardar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
