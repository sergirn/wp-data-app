"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet } from "lucide-react"
import { exportToCSV } from "@/lib/export-utils"
import { useTranslations } from "next-intl"

interface ExportButtonsProps {
  data: any[]
  filename: string
  label?: string
}

export function ExportButtons({ data, filename, label }: ExportButtonsProps) {
  const t = useTranslations("Export")
  const handleExportCSV = () => {
    exportToCSV(data, filename)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          {label ?? t("export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {t("exportCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
