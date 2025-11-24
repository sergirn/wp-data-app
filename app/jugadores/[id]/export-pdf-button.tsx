"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useState } from "react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import type { Player, MatchStats, Match } from "@/lib/types"

interface MatchStatsWithMatch extends MatchStats {
  matches: Match
}

interface ExportPDFButtonProps {
  player: Player
  matchStats: MatchStatsWithMatch[]
}

export function ExportPDFButton({ player, matchStats }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToPDF = async () => {
    setIsExporting(true)

    try {
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin

      // Header
      pdf.setFillColor(37, 99, 235) // Primary color
      pdf.rect(0, 0, pageWidth, 40, "F")

      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24)
      pdf.setFont("helvetica", "bold")
      pdf.text("EXPEDIENTE DEL JUGADOR", pageWidth / 2, 20, { align: "center" })

      pdf.setFontSize(14)
      pdf.setFont("helvetica", "normal")
      const currentDate = new Date().toLocaleDateString("es-ES")
      pdf.text(currentDate, pageWidth / 2, 30, { align: "center" })

      yPosition = 50

      // Player Info
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(18)
      pdf.setFont("helvetica", "bold")
      pdf.text(player.name, margin, yPosition)
      yPosition += 10

      pdf.setFontSize(12)
      pdf.setFont("helvetica", "normal")
      pdf.text(`Dorsal: ${player.number}`, margin, yPosition)
      yPosition += 7
      pdf.text(`Posición: ${player.is_goalkeeper ? "Portero" : "Jugador de Campo"}`, margin, yPosition)
      yPosition += 7
      pdf.text(`Partidos jugados: ${matchStats.length}`, margin, yPosition)
      yPosition += 15

      // Calculate stats
      const stats = player.is_goalkeeper
        ? calculateGoalkeeperStatsForPDF(matchStats)
        : calculateFieldPlayerStatsForPDF(matchStats)

      // Stats Summary
      pdf.setFillColor(240, 240, 240)
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 10, "F")
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.text("RESUMEN DE ESTADÍSTICAS", margin + 5, yPosition + 7)
      yPosition += 15

      pdf.setFontSize(11)
      pdf.setFont("helvetica", "normal")

      if (player.is_goalkeeper) {
        // Goalkeeper stats
        pdf.text(`Paradas Totales: ${stats.totalSaves}`, margin + 5, yPosition)
        pdf.text(`Promedio: ${stats.avgSaves}`, pageWidth / 2, yPosition)
        yPosition += 7

        pdf.text(`Goles Recibidos: ${stats.totalGoalsReceived}`, margin + 5, yPosition)
        pdf.text(`Promedio: ${stats.avgGoalsReceived}`, pageWidth / 2, yPosition)
        yPosition += 7

        pdf.text(`Eficiencia: ${stats.savePercentage}%`, margin + 5, yPosition)
        yPosition += 12
      } else {
        // Field player stats
        pdf.text(`Goles: ${stats.totalGoals}`, margin + 5, yPosition)
        pdf.text(`Promedio: ${stats.avgGoals}`, pageWidth / 2, yPosition)
        yPosition += 7

        pdf.text(`Asistencias: ${stats.totalAssists}`, margin + 5, yPosition)
        pdf.text(`Promedio: ${stats.avgAssists}`, pageWidth / 2, yPosition)
        yPosition += 7

        pdf.text(`Tiros Totales: ${stats.totalShots}`, margin + 5, yPosition)
        pdf.text(`Eficiencia: ${stats.shootingEfficiency}%`, pageWidth / 2, yPosition)
        yPosition += 12
      }

      // Capture charts if visible
      const chartsElements = document.querySelectorAll("[data-export-chart]")

      for (let i = 0; i < chartsElements.length; i++) {
        const chartElement = chartsElements[i] as HTMLElement

        if (yPosition > pageHeight - 80) {
          pdf.addPage()
          yPosition = margin
        }

        try {
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
          })

          const imgData = canvas.toDataURL("image/png")
          const imgWidth = pageWidth - 2 * margin
          const imgHeight = (canvas.height * imgWidth) / canvas.width

          pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight)
          yPosition += imgHeight + 10
        } catch (error) {
          console.error("[v0] Error capturing chart:", error)
        }
      }

      // Match by match stats
      if (yPosition > pageHeight - 60) {
        pdf.addPage()
        yPosition = margin
      }

      pdf.setFillColor(240, 240, 240)
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 10, "F")
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.text("ESTADÍSTICAS POR PARTIDO", margin + 5, yPosition + 7)
      yPosition += 15

      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")

      for (const stat of matchStats.slice(0, 10)) {
        // Limit to 10 most recent matches
        if (yPosition > pageHeight - 30) {
          pdf.addPage()
          yPosition = margin
        }

        const matchDate = new Date(stat.matches.match_date).toLocaleDateString("es-ES")
        pdf.setFont("helvetica", "bold")
        pdf.text(`${matchDate} - vs ${stat.matches.rival}`, margin + 5, yPosition)
        yPosition += 5

        pdf.setFont("helvetica", "normal")
        if (player.is_goalkeeper) {
          pdf.text(
            `Paradas: ${calculateMatchSaves(stat)} | Goles: ${calculateMatchGoalsReceived(stat)} | Eficiencia: ${calculateMatchEfficiency(stat)}%`,
            margin + 10,
            yPosition,
          )
        } else {
          pdf.text(
            `Goles: ${calculateMatchGoals(stat)} | Asistencias: ${stat.acciones_asistencias || 0} | Tiros: ${calculateMatchShots(stat)}`,
            margin + 10,
            yPosition,
          )
        }
        yPosition += 7
      }

      // Footer
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(128, 128, 128)
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" })
      }

      // Save PDF
      pdf.save(`expediente_${player.name.replace(/\s+/g, "_")}_${currentDate}.pdf`)
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      alert("Error al generar el PDF. Por favor, intenta de nuevo.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button onClick={exportToPDF} disabled={isExporting} className="gap-2">
      <Download className="h-4 w-4" />
      {isExporting ? "Generando PDF..." : "Exportar a PDF"}
    </Button>
  )
}

// Helper functions for PDF calculations
function calculateGoalkeeperStatsForPDF(matchStats: MatchStatsWithMatch[]) {
  const totalSaves = matchStats.reduce((sum, stat) => sum + calculateMatchSaves(stat), 0)
  const totalGoalsReceived = matchStats.reduce((sum, stat) => sum + calculateMatchGoalsReceived(stat), 0)
  const totalShots = totalSaves + totalGoalsReceived
  const savePercentage = totalShots > 0 ? ((totalSaves / totalShots) * 100).toFixed(1) : "0.0"

  return {
    totalSaves,
    totalGoalsReceived,
    avgSaves: matchStats.length > 0 ? (totalSaves / matchStats.length).toFixed(1) : "0.0",
    avgGoalsReceived: matchStats.length > 0 ? (totalGoalsReceived / matchStats.length).toFixed(1) : "0.0",
    savePercentage,
  }
}

function calculateFieldPlayerStatsForPDF(matchStats: MatchStatsWithMatch[]) {
  const totalGoals = matchStats.reduce((sum, stat) => sum + calculateMatchGoals(stat), 0)
  const totalAssists = matchStats.reduce((sum, stat) => sum + (stat.acciones_asistencias || 0), 0)
  const totalShots = matchStats.reduce((sum, stat) => sum + calculateMatchShots(stat), 0)
  const shootingEfficiency = totalShots > 0 ? ((totalGoals / totalShots) * 100).toFixed(1) : "0.0"

  return {
    totalGoals,
    totalAssists,
    totalShots,
    avgGoals: matchStats.length > 0 ? (totalGoals / matchStats.length).toFixed(1) : "0.0",
    avgAssists: matchStats.length > 0 ? (totalAssists / matchStats.length).toFixed(1) : "0.0",
    shootingEfficiency,
  }
}

function calculateMatchSaves(stat: MatchStats) {
  return (
    (stat.portero_tiros_parada_recup || 0) +
    (stat.portero_paradas_fuera || 0) +
    (stat.portero_penalti_parado || 0) +
    (stat.portero_paradas_hombre_menos || 0)
  )
}

function calculateMatchGoalsReceived(stat: MatchStats) {
  return (
    (stat.portero_goles_boya_parada || 0) +
    (stat.portero_goles_hombre_menos || 0) +
    (stat.portero_goles_dir_mas_5m || 0) +
    (stat.portero_goles_contraataque || 0) +
    (stat.portero_goles_penalti || 0)
  )
}

function calculateMatchEfficiency(stat: MatchStats) {
  const saves = calculateMatchSaves(stat)
  const goalsReceived = calculateMatchGoalsReceived(stat)
  const total = saves + goalsReceived
  return total > 0 ? ((saves / total) * 100).toFixed(0) : "0"
}

function calculateMatchGoals(stat: MatchStats) {
  return (
    (stat.goles_boya_jugada || 0) +
    (stat.goles_hombre_mas || 0) +
    (stat.goles_lanzamiento || 0) +
    (stat.goles_dir_mas_5m || 0) +
    (stat.goles_contraataque || 0) +
    (stat.goles_penalti_anotado || 0)
  )
}

function calculateMatchShots(stat: MatchStats) {
  const goals = calculateMatchGoals(stat)
  const missed =
    (stat.tiros_hombre_mas || 0) +
    (stat.tiros_penalti_fallado || 0) +
    (stat.tiros_corner || 0) +
    (stat.tiros_fuera || 0) +
    (stat.tiros_parados || 0) +
    (stat.tiros_bloqueado || 0)
  return goals + missed
}
