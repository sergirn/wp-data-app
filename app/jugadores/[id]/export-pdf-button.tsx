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
      const margin = 20
      let yPosition = margin

      pdf.setFillColor(15, 23, 42) // Dark blue background
      pdf.rect(0, 0, pageWidth, 60, "F")

      // Accent bar
      pdf.setFillColor(59, 130, 246) // Blue accent
      pdf.rect(0, 55, pageWidth, 5, "F")

      // Title
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(28)
      pdf.setFont("helvetica", "bold")
      pdf.text("EXPEDIENTE DEPORTIVO", pageWidth / 2, 25, { align: "center" })

      // Subtitle
      pdf.setFontSize(12)
      pdf.setFont("helvetica", "normal")
      pdf.text("Análisis de Rendimiento Individual", pageWidth / 2, 35, { align: "center" })

      // Date
      pdf.setFontSize(10)
      const currentDate = new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      pdf.text(`Generado el ${currentDate}`, pageWidth / 2, 45, { align: "center" })

      yPosition = 75

      pdf.setFillColor(249, 250, 251) // Light gray background
      pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 45, 3, 3, "F")

      // Player photo placeholder
      pdf.setFillColor(59, 130, 246)
      pdf.circle(margin + 22, yPosition + 22, 15, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(20)
      pdf.setFont("helvetica", "bold")
      pdf.text(player.number.toString(), margin + 22, yPosition + 27, { align: "center" })

      // Player info
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(22)
      pdf.setFont("helvetica", "bold")
      pdf.text(player.name, margin + 45, yPosition + 15)

      pdf.setFontSize(11)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(71, 85, 105)
      pdf.text(`Dorsal: #${player.number}`, margin + 45, yPosition + 25)
      pdf.text(`Posición: ${player.is_goalkeeper ? "Portero" : "Jugador de Campo"}`, margin + 45, yPosition + 32)
      pdf.text(`Temporada: 2024/2025`, margin + 45, yPosition + 39)

      yPosition += 60

      const stats = player.is_goalkeeper
        ? calculateGoalkeeperStatsForPDF(matchStats)
        : calculateFieldPlayerStatsForPDF(matchStats)

      // Stats summary with boxes
      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(15, 23, 42)
      pdf.text("RESUMEN DE RENDIMIENTO", margin, yPosition)
      yPosition += 12

      const boxWidth = (pageWidth - 2 * margin - 10) / 3
      const boxHeight = 25

      if (player.is_goalkeeper) {
        // Goalkeeper stat boxes
        drawStatBox(
          pdf,
          margin,
          yPosition,
          boxWidth,
          boxHeight,
          "Partidos Jugados",
          matchStats.length.toString(),
          "#3b82f6",
        )
        drawStatBox(
          pdf,
          margin + boxWidth + 5,
          yPosition,
          boxWidth,
          boxHeight,
          "Paradas Totales",
          stats.totalSaves.toString(),
          "#10b981",
        )
        drawStatBox(
          pdf,
          margin + 2 * (boxWidth + 5),
          yPosition,
          boxWidth,
          boxHeight,
          "Eficiencia",
          `${stats.savePercentage}%`,
          "#f59e0b",
        )
        yPosition += boxHeight + 5

        drawStatBox(
          pdf,
          margin,
          yPosition,
          boxWidth,
          boxHeight,
          "Goles Recibidos",
          stats.totalGoalsReceived.toString(),
          "#ef4444",
        )
        drawStatBox(
          pdf,
          margin + boxWidth + 5,
          yPosition,
          boxWidth,
          boxHeight,
          "Promedio Paradas",
          stats.avgSaves,
          "#8b5cf6",
        )
        drawStatBox(
          pdf,
          margin + 2 * (boxWidth + 5),
          yPosition,
          boxWidth,
          boxHeight,
          "Promedio Goles",
          stats.avgGoalsReceived,
          "#ec4899",
        )
      } else {
        // Field player stat boxes
        drawStatBox(
          pdf,
          margin,
          yPosition,
          boxWidth,
          boxHeight,
          "Partidos Jugados",
          matchStats.length.toString(),
          "#3b82f6",
        )
        drawStatBox(
          pdf,
          margin + boxWidth + 5,
          yPosition,
          boxWidth,
          boxHeight,
          "Goles",
          stats.totalGoals.toString(),
          "#10b981",
        )
        drawStatBox(
          pdf,
          margin + 2 * (boxWidth + 5),
          yPosition,
          boxWidth,
          boxHeight,
          "Asistencias",
          stats.totalAssists.toString(),
          "#f59e0b",
        )
        yPosition += boxHeight + 5

        drawStatBox(pdf, margin, yPosition, boxWidth, boxHeight, "Promedio Goles", stats.avgGoals, "#8b5cf6")
        drawStatBox(
          pdf,
          margin + boxWidth + 5,
          yPosition,
          boxWidth,
          boxHeight,
          "Eficiencia Tiro",
          `${stats.shootingEfficiency}%`,
          "#ec4899",
        )
        drawStatBox(
          pdf,
          margin + 2 * (boxWidth + 5),
          yPosition,
          boxWidth,
          boxHeight,
          "Tiros Totales",
          stats.totalShots.toString(),
          "#06b6d4",
        )
      }

      yPosition += boxHeight + 15

      const chartsElements = document.querySelectorAll("[data-export-chart]")

      if (chartsElements.length > 0) {
        pdf.addPage()
        yPosition = margin

        pdf.setFontSize(16)
        pdf.setFont("helvetica", "bold")
        pdf.setTextColor(15, 23, 42)
        pdf.text("ANÁLISIS GRÁFICO", margin, yPosition)
        yPosition += 10

        for (let i = 0; i < chartsElements.length; i++) {
          const chartElement = chartsElements[i] as HTMLElement

          if (yPosition > pageHeight - 100 && i > 0) {
            pdf.addPage()
            yPosition = margin
          }

          try {
            // Wait for chart to be fully rendered
            await new Promise((resolve) => setTimeout(resolve, 500))

            const canvas = await html2canvas(chartElement, {
              scale: 2,
              backgroundColor: "#ffffff",
              logging: false,
              useCORS: true,
              allowTaint: true,
            })

            const imgData = canvas.toDataURL("image/png", 1.0)
            const imgWidth = pageWidth - 2 * margin
            const imgHeight = Math.min((canvas.height * imgWidth) / canvas.width, 100)

            // Add border around chart
            pdf.setDrawColor(229, 231, 235)
            pdf.setLineWidth(0.5)
            pdf.rect(margin, yPosition, imgWidth, imgHeight)

            pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight)
            yPosition += imgHeight + 15
          } catch (error) {
            console.error("[v0] Error capturing chart:", error)
          }
        }
      }

      pdf.addPage()
      yPosition = margin

      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(15, 23, 42)
      pdf.text("ESTADÍSTICAS POR PARTIDO", margin, yPosition)
      yPosition += 12

      // Table header
      pdf.setFillColor(59, 130, 246)
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(9)
      pdf.setFont("helvetica", "bold")

      if (player.is_goalkeeper) {
        pdf.text("FECHA", margin + 2, yPosition + 6)
        pdf.text("RIVAL", margin + 30, yPosition + 6)
        pdf.text("PARADAS", margin + 80, yPosition + 6)
        pdf.text("GOLES", margin + 110, yPosition + 6)
        pdf.text("EFIC.", margin + 140, yPosition + 6)
      } else {
        pdf.text("FECHA", margin + 2, yPosition + 6)
        pdf.text("RIVAL", margin + 30, yPosition + 6)
        pdf.text("GOLES", margin + 80, yPosition + 6)
        pdf.text("ASIST.", margin + 110, yPosition + 6)
        pdf.text("TIROS", margin + 140, yPosition + 6)
      }
      yPosition += 8

      // Table rows
      pdf.setFont("helvetica", "normal")
      let rowIndex = 0

      for (const stat of matchStats.slice(0, 15)) {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = margin
        }

        // Alternate row colors
        if (rowIndex % 2 === 0) {
          pdf.setFillColor(249, 250, 251)
          pdf.rect(margin, yPosition, pageWidth - 2 * margin, 7, "F")
        }

        pdf.setTextColor(15, 23, 42)
        const matchDate = new Date(stat.matches.match_date).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        })
        pdf.text(matchDate, margin + 2, yPosition + 5)
        const rivalText = stat.matches.rival ? stat.matches.rival.substring(0, 20) : "Sin rival"
        pdf.text(rivalText, margin + 30, yPosition + 5)

        if (player.is_goalkeeper) {
          pdf.text(calculateMatchSaves(stat).toString(), margin + 85, yPosition + 5)
          pdf.text(calculateMatchGoalsReceived(stat).toString(), margin + 115, yPosition + 5)
          pdf.text(`${calculateMatchEfficiency(stat)}%`, margin + 143, yPosition + 5)
        } else {
          pdf.text(calculateMatchGoals(stat).toString(), margin + 85, yPosition + 5)
          pdf.text((stat.acciones_asistencias || 0).toString(), margin + 115, yPosition + 5)
          pdf.text(calculateMatchShots(stat).toString(), margin + 145, yPosition + 5)
        }

        yPosition += 7
        rowIndex++
      }

      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)

        // Footer bar
        pdf.setFillColor(241, 245, 249)
        pdf.rect(0, pageHeight - 15, pageWidth, 15, "F")

        pdf.setFontSize(8)
        pdf.setTextColor(100, 116, 139)
        pdf.setFont("helvetica", "normal")
        pdf.text(`Expediente de ${player.name}`, margin, pageHeight - 7)
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" })
      }

      // Save PDF with professional naming
      const fileName = `Expediente_${player.name.replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      alert("Error al generar el PDF. Por favor, intenta de nuevo.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button onClick={exportToPDF} disabled={isExporting} variant="outline" size="sm" className="gap-2 bg-transparent">
      <Download className="h-4 w-4" />
      {isExporting ? "Generando..." : "Exportar PDF"}
    </Button>
  )
}

function drawStatBox(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  color: string,
) {
  // Convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  const rgb = hexToRgb(color)

  // Light background with much lighter RGB values
  const lightR = Math.min(255, rgb.r + (255 - rgb.r) * 0.9)
  const lightG = Math.min(255, rgb.g + (255 - rgb.g) * 0.9)
  const lightB = Math.min(255, rgb.b + (255 - rgb.b) * 0.9)

  pdf.setFillColor(lightR, lightG, lightB)
  pdf.roundedRect(x, y, width, height, 2, 2, "F")

  // Border
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(x, y, width, height, 2, 2, "S")

  // Label
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(100, 116, 139)
  pdf.text(label, x + width / 2, y + 10, { align: "center" })

  // Value
  pdf.setFontSize(16)
  pdf.setFont("helvetica", "bold")
  pdf.setTextColor(rgb.r, rgb.g, rgb.b)
  pdf.text(value, x + width / 2, y + 20, { align: "center" })
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
